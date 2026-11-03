import { apiRequest } from '$lib/api/http.js';

export type DashboardSummary = {
	transactions_today: number;
	transactions_yesterday: number;
	volume_today: { currency: string; amount: number; converted_amount: number; target_currency: string }[];
	active_customers: number;
	new_customers_this_month: number;
	open_alerts: number;
	urgent_alerts: number;
};

export function getDashboardSummary() {
	return apiRequest<DashboardSummary>('/dashboard/summary');
}
