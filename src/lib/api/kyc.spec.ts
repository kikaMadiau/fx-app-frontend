import { describe, expect, it } from 'vitest';
import { expiryRequired, isExpired, previewBlocks, todayIso } from './kyc.js';
import { createEmptyTransactionForm } from '$lib/types/transaction.js';
import { validateIdentityExpiry, validateNewClientFields } from '$lib/utils/validation.js';
import { alertLabel, alertReason, factorText } from '$lib/utils/labels.js';

const thresholds = { idRequiredAboveUsd: 1000, validationAboveUsd: 1000 };
const codes = (blocks: { code: string }[]) => blocks.map((b) => b.code);

describe('previewBlocks', () => {
	it('tolerates a customer without ID up to 1000 USD', () => {
		expect(previewBlocks({ idType: '', amountUsd: 1000, ...thresholds })).toEqual([]);
		expect(codes(previewBlocks({ idType: '', amountUsd: 1200, ...thresholds }))).toEqual([
			'KYC_ID_REQUIRED'
		]);
	});

	it('blocks an expired ID whatever the amount', () => {
		expect(
			codes(
				previewBlocks({
					idType: 'PASSPORT',
					idExpiryDate: '2020-01-01',
					amountUsd: 5,
					...thresholds
				})
			)
		).toEqual(['KYC_ID_EXPIRED']);
		expect(
			previewBlocks({ idType: 'PASSPORT', idExpiryDate: todayIso(), amountUsd: 5, ...thresholds })
		).toEqual([]);
	});

	it('asks compliance to validate a high-risk customer above 1000 USD', () => {
		const base = { idType: 'VOTER_CARD', amountUsd: 1500, ...thresholds };
		expect(codes(previewBlocks({ ...base, riskLevel: 'CRITICAL' }))).toEqual([
			'KYC_VALIDATION_REQUIRED'
		]);
		expect(previewBlocks({ ...base, riskLevel: 'MEDIUM' })).toEqual([]);
	});
});

describe('daily limit', () => {
	it('blocks an operation that would exceed the daily limit', () => {
		const base = { idType: 'VOTER_CARD', ...thresholds, dailyLimitUsd: 5000 };
		expect(previewBlocks({ ...base, amountUsd: 1000, dayTotalUsd: 4000 })).toEqual([]);
		const blocks = previewBlocks({ ...base, amountUsd: 900, dayTotalUsd: 4700 });
		expect(codes(blocks)).toEqual(['DAILY_LIMIT_EXCEEDED']);
		expect(blocks[0].message).toContain('il lui reste 300 USD');
		expect(previewBlocks({ ...base, dailyLimitUsd: 0, amountUsd: 900, dayTotalUsd: 9e6 })).toEqual([]);
	});
});

describe('identity expiry', () => {
	it('is optional only for the voter card', () => {
		expect(expiryRequired('VOTER_CARD')).toBe(false);
		expect(expiryRequired('PASSPORT')).toBe(true);
		expect(expiryRequired('')).toBe(false);
		expect(isExpired('')).toBe(false);
	});

	it('is required in the new client form unless the ID is a voter card', () => {
		const form = createEmptyTransactionForm();
		form.identityDocumentType = 'Passeport';
		expect(validateNewClientFields(form).identityDocumentExpiry).toBeTruthy();
		form.identityDocumentType = "Carte d'electeur";
		expect(validateIdentityExpiry(form)).toEqual({});
	});
});

describe('KYC rule labels', () => {
	it('translates the new rules', () => {
		expect(alertLabel('EXPIRED_ID_DOCUMENT')).toBe("Pièce d'identité expirée");
		expect(alertReason('Identity document expired on 2025-03-12')).toBe(
			'Pièce expirée depuis le 12/03/2025'
		);
		expect(alertReason('Identity document photo missing (front and back)')).toBe(
			'Photo de la pièce manquante (recto et verso)'
		);
		expect(alertReason('Customer is foreign national (BE) and not resident in the DRC (FR)')).toBe(
			'Client de nationalité étrangère (Belgique) et non-résident (France)'
		);
		expect(alertReason('Customer works in a sensitive sector: MINING')).toBe(
			'Secteur sensible : mines et minerais'
		);
		expect(alertReason('3 transactions just below threshold 10000.00 over 24h0m0s')).toBe(
			'3 opérations juste sous le seuil de 10 000 sur 24 h'
		);
		expect(alertReason('Opposite SELL after BUY on USD within 48h0m0s (transaction 2)')).toBe(
			'Vente de USD peu après un achat (moins de 2 jours, transaction n° 2)'
		);
		expect(alertReason('Customer has no identity document on file')).toBe(
			"Aucune pièce d'identité enregistrée"
		);
	});

	it('does not repeat the label in the factor text', () => {
		expect(factorText('MISSING_ID_PHOTO', 'Identity document photo missing (back)')).toBe(
			'Photo de la pièce manquante (verso)'
		);
		expect(factorText('INSUFFICIENT_KYC_STATUS', 'Customer has no KYC profile')).toBe(
			"KYC insuffisant — Le client n'a pas encore de dossier KYC"
		);
	});
});
