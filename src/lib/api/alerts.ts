import { apiRequest } from '$lib/api/http.js';

// Élément de GET /risk-flags (storage.RiskFlagWithDetails). Un trader ne reçoit que
// les alertes de ses propres opérations.
export type RiskAlert = {
	id: number;
	flag: string;
	reason: string;
	score: number;
	level: string;
	transaction_id: number | null;
	trader_id: number;
	customer_id: number;
	status: string;
	assigned_to?: number;
	resolution_note?: string;
	resolved_at?: string;
	resolved_by?: number;
	created_at: string;
	updated_at: string;
	customer_name: string;
	customer_phone?: string;
	customer: { id: number; full_name: string; phone: string; kyc_status: string } | null;
	transaction: {
		id: number;
		type: string;
		currency: string;
		amount: number;
		rate: number;
		converted_amount: number;
		created_at: string;
	} | null;
};

export type AlertHistoryEntry = {
	id: number;
	from_status: string;
	to_status: string;
	changed_by: number;
	note: string;
	created_at: string;
};

export type AlertFilter = {
	status?: string;
	level?: string;
	q?: string;
	customerId?: number;
	limit?: number;
	offset?: number;
};

export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

function queryString(params: Record<string, string | number | undefined>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== '') search.set(key, String(value));
	}
	const text = search.toString();
	return text ? `?${text}` : '';
}

export { queryString };

export async function listAlerts(filter: AlertFilter = {}): Promise<Page<RiskAlert>> {
	const page = await apiRequest<Page<RiskAlert>>(
		`/risk-flags${queryString({
			status: filter.status,
			level: filter.level,
			q: filter.q?.trim(),
			customer_id: filter.customerId,
			limit: filter.limit ?? 20,
			offset: filter.offset
		})}`
	);
	return { ...page, items: page.items ?? [] };
}

export async function getAlertHistory(id: number): Promise<AlertHistoryEntry[]> {
	return (await apiRequest<AlertHistoryEntry[] | null>(`/risk-flags/${id}/history`)) ?? [];
}

/**
 * Change le statut d'une alerte (réservé au responsable conformité). Le passage « En revue »
 * exige un responsable (assigned_to) : la personne qui prend l'alerte en charge.
 */
export function transitionAlert(
	id: number,
	status: string,
	options: { resolutionNote?: string; assignedTo?: number } = {}
): Promise<unknown> {
	const body: Record<string, unknown> = { status };
	if (options.resolutionNote?.trim()) body.resolution_note = options.resolutionNote.trim();
	if (options.assignedTo) body.assigned_to = options.assignedTo;
	return apiRequest(`/risk-flags/${id}/status`, { method: 'PATCH', body });
}

/** Signalement manuel d'un client, rattaché à l'une de ses transactions. */
export function createManualAlert(input: {
	customerId: number;
	transactionId: number;
	reason: string;
	level: string;
}): Promise<unknown> {
	return apiRequest('/risk-flags', {
		method: 'POST',
		body: {
			flag: 'MANUAL_FLAG',
			reason: input.reason,
			level: input.level,
			customer_id: input.customerId,
			transaction_id: input.transactionId
		}
	});
}
