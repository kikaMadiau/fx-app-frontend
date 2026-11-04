// Dossier KYC d'un client : profil (PUT /customers/{id}/kyc), pièce d'identité
// (PATCH /customers/{id}/identity), facteurs de risque et dérogations de la conformité.
import { apiRequest } from '$lib/api/http.js';
import { ApiError } from '$lib/utils/api-errors.js';

export type KycProfile = {
	legal_nature: string;
	activity_profile: string;
	kyc_status?: string;
	profession?: string;
	employer?: string;
	company_name?: string;
	registration_number?: string;
	source_of_funds: string;
	purpose_of_operations: string;
	expected_volume: number;
	expected_frequency: number;
	id_expiry_date?: string;
	nationality?: string;
	residence_country?: string;
	is_pep: boolean;
	pep_function?: string;
	activity_sector?: string;
	acts_for_third_party: boolean;
	third_party_name?: string;
	third_party_id_number?: string;
	last_verification_date?: string;
};

export type KycFactor = { code: string; reason: string; score: number; severity: string };

export type KycOverride = {
	id: number;
	reason: string;
	granted_by_name: string;
	granted_at: string;
	expires_at: string;
};

export type KycRisk = {
	customer_id: number;
	risk_level: string;
	risk_score: number;
	profile_score: number;
	profile_level: string;
	factors: KycFactor[];
	has_profile: boolean;
	kyc_status: string;
	id_type: string;
	id_expiry_date: string;
	id_expired: boolean;
	last_verification_date: string | null;
	review_due_date: string;
	review_overdue: boolean;
	id_required_above_usd: number;
	validation_above_usd: number;
	/** Limite journalière du client (0 = aucune) et opérations déjà faites aujourd'hui, en USD. */
	daily_limit_usd: number;
	day_total_usd: number;
	override: KycOverride | null;
};

export function emptyKycProfile(): KycProfile {
	return {
		legal_nature: 'INDIVIDUAL',
		activity_profile: 'PERSONAL',
		source_of_funds: '',
		purpose_of_operations: '',
		expected_volume: 0,
		expected_frequency: 0,
		nationality: 'CD',
		residence_country: 'CD',
		is_pep: false,
		acts_for_third_party: false
	};
}

/** Dossier KYC du client, ou null s'il n'en a pas encore. */
export async function getKycProfile(customerId: number): Promise<KycProfile | null> {
	try {
		return await apiRequest<KycProfile>(`/customers/${customerId}/kyc`);
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) return null;
		throw error;
	}
}

/** Enregistre le dossier (le crée au premier enregistrement). Le statut n'est pas modifié ici. */
export function saveKycProfile(customerId: number, profile: KycProfile): Promise<KycProfile> {
	const body: Record<string, unknown> = { ...profile };
	delete body.kyc_status;
	delete body.last_verification_date;
	return apiRequest<KycProfile>(`/customers/${customerId}/kyc`, { method: 'PUT', body });
}

export function getKycRisk(customerId: number): Promise<KycRisk> {
	return apiRequest<KycRisk>(`/customers/${customerId}/kyc-risk`);
}

export type IdentityUpdate = {
	id_type: string;
	id_number: string;
	id_expiry_date?: string;
	address?: string;
	email?: string;
};

export function updateIdentity(customerId: number, identity: IdentityUpdate) {
	return apiRequest(`/customers/${customerId}/identity`, { method: 'PATCH', body: identity });
}

/** Conformité : change le statut du dossier (VERIFIED, ENHANCED_VERIFICATION…). */
export function setKycStatus(customerId: number, status: string) {
	return apiRequest(`/customers/${customerId}/kyc/status`, {
		method: 'PATCH',
		body: { kyc_status: status }
	});
}

/** Conformité : lève une fois, pendant 24 h, les blocages KYC du client. */
export function grantKycOverride(customerId: number, reason: string): Promise<KycOverride> {
	return apiRequest<KycOverride>(`/customers/${customerId}/kyc-override`, {
		method: 'POST',
		body: { reason }
	});
}

/** La carte d'électeur n'a pas de date d'expiration : pour les autres pièces, elle est obligatoire. */
export function expiryRequired(idType: string): boolean {
	return Boolean(idType) && idType !== 'VOTER_CARD';
}

/** Date du jour (AAAA-MM-JJ) dans le fuseau du navigateur. */
export function todayIso(): string {
	const now = new Date();
	return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function isExpired(expiry?: string): boolean {
	return Boolean(expiry) && expiry! < todayIso();
}

export type KycBlockPreview = { code: string; message: string };

/**
 * Prévoit les blocages que l'API appliquera à une opération de `amountUsd` dollars (mêmes règles
 * que kycrisk.Blocks) : pièce absente au-delà du seuil, pièce expirée, risque élevé au-delà du seuil,
 * limite journalière dépassée.
 */
export function previewBlocks(input: {
	idType: string;
	idExpiryDate?: string;
	riskLevel?: string;
	amountUsd: number;
	idRequiredAboveUsd: number;
	validationAboveUsd: number;
	dailyLimitUsd?: number;
	dayTotalUsd?: number;
}): KycBlockPreview[] {
	const blocks: KycBlockPreview[] = [];
	const usd = (v: number) => new Intl.NumberFormat('fr-FR').format(v).replace(/ | /g, ' ');
	if (!input.idType && input.amountUsd > input.idRequiredAboveUsd) {
		blocks.push({
			code: 'KYC_ID_REQUIRED',
			message: `Pièce d'identité obligatoire au-delà de ${usd(input.idRequiredAboveUsd)} USD.`
		});
	}
	if (isExpired(input.idExpiryDate)) {
		blocks.push({ code: 'KYC_ID_EXPIRED', message: "La pièce d'identité est expirée." });
	}
	if (
		['HIGH', 'CRITICAL'].includes(input.riskLevel ?? '') &&
		input.amountUsd > input.validationAboveUsd
	) {
		blocks.push({
			code: 'KYC_VALIDATION_REQUIRED',
			message: `Client à risque élevé : au-delà de ${usd(input.validationAboveUsd)} USD, la conformité doit valider l'opération.`
		});
	}
	const limit = input.dailyLimitUsd ?? 0;
	const dayTotal = input.dayTotalUsd ?? 0;
	if (limit > 0 && dayTotal + input.amountUsd > limit + 0.005) {
		blocks.push({
			code: 'DAILY_LIMIT_EXCEEDED',
			message: `Limite journalière de ${usd(limit)} USD : le client a déjà changé ${usd(Math.round(dayTotal))} USD aujourd'hui, il lui reste ${usd(Math.max(0, Math.floor(limit - dayTotal)))} USD.`
		});
	}
	return blocks;
}
