import { apiRequest } from '$lib/api/http.js';

// Réponse de GET /dashboard/summary (voir dashboardRepository.go côté Go).
// Un trader ne voit que ses propres opérations ; superviseurs, conformité et admin voient tout le bureau.
export type DashboardSummary = {
	transactions_today: number;
	transactions_yesterday: number;
	volume_today: {
		currency: string;
		amount: number;
		converted_amount: number;
		target_currency: string;
	}[];
	active_customers: number; // clients ayant opéré sur les 30 derniers jours
	new_customers_this_month: number;
	open_alerts: number;
	urgent_alerts: number;
	buy_today: number;
	sell_today: number;
	pending_today: number;
	daily_activity: { date: string; count: number; converted_amount: number }[];
	latest_rates: { currency: string; type: 'BUY' | 'SELL'; rate: number; applied_at: string }[];
	recent_alerts: DashboardAlert[];
};

export type DashboardAlert = {
	id: number;
	flag: string;
	reason: string;
	level: string;
	status: string;
	transaction_id: number;
	customer_name: string;
	created_at: string;
};

// Élément de GET /transactions (entity.TransactionListItem).
export type TransactionListItem = {
	id: number;
	amount: number;
	currency: string;
	target_currency?: string;
	type: string;
	rate: number;
	converted_amount?: number;
	risk_level?: string;
	risk_score?: number;
	status: string;
	created_at: string;
	trader_id: number;
	customer_id: number;
	customer_name?: string;
	customer_phone?: string;
	customer_id_type?: string;
	customer_id_number?: string;
};

export function getDashboardSummary(): Promise<DashboardSummary> {
	return apiRequest<DashboardSummary>('/dashboard/summary');
}

export async function getRecentTransactions(limit = 6): Promise<TransactionListItem[]> {
	const response = await apiRequest<{ items: TransactionListItem[] | null }>(
		`/transactions?limit=${limit}`
	);
	return response.items ?? [];
}

export function getTransaction(id: number): Promise<TransactionListItem> {
	return apiRequest<TransactionListItem>(`/transactions/${id}`);
}

export * from '$lib/utils/labels.js';

// Taux officiels du bureau, configurés dans le .env de l'API (GET /analysais).
export type ExchangeRate = {
	pair: string;
	buy_rate: number;
	sell_rate: number;
	change_rate: number;
};

export async function getExchangeRates(): Promise<ExchangeRate[]> {
	return (await apiRequest<ExchangeRate[] | null>('/analysais')) ?? [];
}
