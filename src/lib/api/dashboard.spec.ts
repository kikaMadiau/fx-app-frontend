import { describe, expect, it } from 'vitest';
import {
	alertLabel,
	alertReason,
	dayOverDay,
	formatCompactCdf,
	formatMoney,
	plural,
	riskLevel,
	transactionStatus,
	transactionTypeLabel
} from '$lib/utils/labels.js';

describe('dashboard helpers', () => {
	it('formats amounts the French way', () => {
		expect(formatMoney(26101.5, 'USD')).toBe('26 101,5 USD');
		expect(formatCompactCdf(74203768.25)).toBe('74,2 M CDF');
		expect(formatCompactCdf(1_250_000_000)).toBe('1,3 Md CDF');
		expect(formatCompactCdf(55400)).toBe('55 400 CDF');
	});

	it('compares with yesterday', () => {
		expect(dayOverDay(8, 19)).toBe('−11 par rapport à hier');
		expect(dayOverDay(5, 2)).toBe('+3 par rapport à hier');
		expect(dayOverDay(4, 4)).toBe("Autant qu'hier");
	});

	it('pluralises counts', () => {
		expect(plural(1, 'achat')).toBe('1 achat');
		expect(plural(0, 'vente')).toBe('0 vente');
		expect(plural(20, 'nouveau', 'nouveaux')).toBe('20 nouveaux');
	});

	it('translates API codes', () => {
		expect(transactionTypeLabel('BUY')).toBe('Achat');
		expect(transactionTypeLabel('SELL')).toBe('Vente');
		expect(transactionStatus('PENDING')).toEqual({
			label: 'En attente',
			badge: 'app-badge-warning'
		});
		expect(transactionStatus('COMPLETED').label).toBe('Terminée');
		expect(riskLevel('').label).toBe('Non évalué');
		expect(riskLevel('CRITICAL').label).toBe('Critique');
		expect(alertLabel('INSUFFICIENT_KYC_STATUS')).toBe('KYC insuffisant');
		expect(alertLabel('SOME_NEW_RULE')).toBe('Some new rule');
		expect(alertReason('Customer has no KYC profile')).toBe(
			"Le client n'a pas encore de dossier KYC"
		);
		expect(alertReason('Transaction amount 12500.75 exceeds threshold 10000.00')).toBe(
			'Montant de 12 500,75 supérieur au seuil de 10 000'
		);
		expect(alertReason('Transaction count 6 exceeds threshold 5 over 24h0m0s')).toBe(
			'6 opérations, au-delà du seuil de 5 sur 24 h'
		);
		expect(alertReason('Cumulative amount 30000.00 exceeds threshold 25000.00 over 720h0m0s')).toBe(
			'Montant cumulé de 30 000 supérieur au seuil de 25 000 sur 30 jours'
		);
	});
});
