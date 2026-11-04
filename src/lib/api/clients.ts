import { apiRequest } from '$lib/api/http.js';
import type { Client } from '$lib/types/client.js';
import { normalizePhone } from '$lib/utils/phone.js';
import { ApiError } from '$lib/utils/api-errors.js';

export type CustomerSummary = Client & {
	kyc_status: string;
	transaction_count: number;
	open_risk_flags: number;
	latest_flag_reason?: string;
};

export type CustomerPage = { items: CustomerSummary[]; total: number; limit: number; offset: number };

export function listCustomers() {
	return apiRequest<CustomerPage>('/customers?limit=100');
}

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
		return await apiRequest<Client>(`/customers/search?phone=${encodeURIComponent(normalizedPhone)}`);
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			throw new ApiError('Aucun client trouve avec ce numero.', 404);
		}

		throw error;
	}
}
