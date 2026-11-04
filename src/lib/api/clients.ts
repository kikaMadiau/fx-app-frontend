import { apiRequest } from '$lib/api/http.js';
import type { Client } from '$lib/types/client.js';
import { normalizePhone } from '$lib/utils/phone.js';
import { ApiError } from '$lib/utils/api-errors.js';

export type KYCStatus =
	| 'UNVERIFIED'
	| 'PARTIALLY_VERIFIED'
	| 'VERIFIED'
	| 'ENHANCED_VERIFICATION';

export function updateCustomerKYCStatus(customerId: number, kyc_status: KYCStatus) {
	return apiRequest<{ kyc_status: KYCStatus }>(`/customers/${customerId}/kyc/status`, {
		method: 'PATCH',
		body: { kyc_status }
	});
}

export async function searchClientByPhone(phone: string): Promise<Client> {
	const normalizedPhone = normalizePhone(phone);

	try {
		return await apiRequest<Client>(
			`/customers/search?phone=${encodeURIComponent(normalizedPhone)}`
		);
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			throw new ApiError('Aucun client trouve avec ce numero.', 404);
		}

		throw error;
	}
}

// Élément de GET /customers (entity.CustomerSummary).
export type CustomerSummary = {
	id: number;
	full_name: string;
	id_number: string;
	id_type: string;
	phone: string;
	address: string;
	email?: string; // pour les notifications (confirmation par e-mail)
	created_at: string;
	risk_level?: string;
	risk_score: number;
	kyc_status: string;
	transaction_count: number;
	open_risk_flags: number;
	latest_flag_reason?: string;
	latest_transaction_id?: number; // dernière opération du client, tous cambistes confondus
	id_front_photo: boolean; // photos de la pièce d'identité déjà prises
	id_back_photo: boolean;
	kyc_review_due: boolean; // dossier vérifié dont la revue périodique est dépassée
	id_expired: boolean; // pièce d'identité expirée
};

export async function listCustomers(filter: {
	q?: string;
	kycStatus?: string;
	riskLevel?: string;
	limit?: number;
	offset?: number;
}): Promise<{ items: CustomerSummary[]; total: number; limit: number; offset: number }> {
	const search = new URLSearchParams();
	if (filter.q?.trim()) search.set('q', filter.q.trim());
	if (filter.kycStatus) search.set('kyc_status', filter.kycStatus);
	if (filter.riskLevel) search.set('risk_level', filter.riskLevel);
	search.set('limit', String(filter.limit ?? 20));
	if (filter.offset) search.set('offset', String(filter.offset));
	const page = await apiRequest<{
		items: CustomerSummary[] | null;
		total: number;
		limit: number;
		offset: number;
	}>(`/customers?${search}`);
	return { ...page, items: page.items ?? [] };
}
