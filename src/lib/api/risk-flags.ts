import { apiRequest } from '$lib/api/http.js';

export type RiskFlag = {
	id: number;
	flag: string;
	reason: string;
	score: number;
	level: string;
	transaction_id: number | null;
	trader_id: number;
	customer_id: number;
	status: string;
	created_at: string;
	customer?: { full_name: string; phone: string; kyc_status: string };
	transaction?: { id: number; type: string; currency: string; amount: number; rate: number; created_at: string };
};

export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

export async function listRiskFlags(): Promise<Page<RiskFlag>> {
	const page = await apiRequest<Page<RiskFlag>>('/risk-flags?limit=100');
	return { ...page, items: page.items ?? [] };
}

export function transitionRiskFlag(
	id: number,
	status: string,
	options: { resolution_note?: string; assigned_to?: number } = {}
) {
	return apiRequest<RiskFlag>(`/risk-flags/${id}/status`, {
		method: 'PATCH',
		body: {
			status,
			...(options.resolution_note ? { resolution_note: options.resolution_note } : {}),
			...(options.assigned_to ? { assigned_to: options.assigned_to } : {})
		}
	});
}

export function createRiskFlag(customerId: number, reason: string) {
	return apiRequest<RiskFlag>('/risk-flags', {
		method: 'POST',
		body: { flag: reason, reason, score: 0, level: 'MEDIUM', customer_id: customerId }
	});
}

export function deleteRiskFlag(id: number) {
	return apiRequest<void>(`/risk-flags/${id}`, { method: 'DELETE' });
}
