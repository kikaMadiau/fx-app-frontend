import { apiRequest } from '$lib/api/http.js';

// Rapports calculés par l'API sur une période (GET /reports/activity et /reports/compliance).
// Un cambiste ne reçoit que ses propres opérations et alertes.

export type ReportRow = {
	id: number;
	created_at: string;
	type: string;
	currency: string;
	amount: number;
	rate: number;
	counter_value: number;
	status: string;
	risk_level: string;
	customer_id: number;
	customer_name: string;
	id_type: string;
	id_number: string;
	trader_name: string;
};

export type CurrencyLine = {
	currency: string;
	buy_count: number;
	buy_amount: number;
	buy_cdf: number;
	buy_avg_rate: number;
	sell_count: number;
	sell_amount: number;
	sell_cdf: number;
	sell_avg_rate: number;
	net_amount: number;
};

export type ActivityReport = {
	period: { from: string; to: string; timezone: string };
	count: number;
	cancelled_count: number;
	pending_count: number;
	customers: number;
	counter_value: number;
	by_currency: CurrencyLine[];
	by_day: { date: string; count: number; buy_cdf: number; sell_cdf: number }[];
	by_trader: { trader_id: number; name: string; count: number; counter_value: number }[];
	transactions: ReportRow[];
	truncated: boolean;
};

export type ComplianceReport = {
	period: { from: string; to: string; timezone: string };
	customers_total: number;
	new_customers: number;
	kyc: Record<string, number>;
	missing_id_photo: number;
	alerts_created: number;
	alerts_closed: number;
	alerts_by_status: Record<string, number>;
	alerts_by_level: Record<string, number>;
	large_threshold_usd: number;
	large_threshold_cdf: number;
	large_transactions: ReportRow[];
	alerts: {
		id: number;
		flag: string;
		reason: string;
		level: string;
		status: string;
		customer_name: string;
		created_at: string;
		resolved_at: string | null;
	}[];
};

const query = (from: string, to: string) =>
	`?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

export function getActivityReport(from: string, to: string): Promise<ActivityReport> {
	return apiRequest<ActivityReport>(`/reports/activity${query(from, to)}`);
}

export function getComplianceReport(from: string, to: string): Promise<ComplianceReport> {
	return apiRequest<ComplianceReport>(`/reports/compliance${query(from, to)}`);
}

// --- Périodes ------------------------------------------------------------------

export type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'last_month' | 'custom';

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
	{ value: 'today', label: "Aujourd'hui" },
	{ value: 'yesterday', label: 'Hier' },
	{ value: 'week', label: '7 derniers jours' },
	{ value: 'month', label: 'Ce mois' },
	{ value: 'last_month', label: 'Mois précédent' },
	{ value: 'custom', label: 'Personnalisée' }
];

/** Date du jour (AAAA-MM-JJ) dans le fuseau choisi. */
export function localToday(timeZone: string, now = new Date()): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now);
}

function shift(isoDate: string, days: number): string {
	const d = new Date(`${isoDate}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + days);
	return d.toISOString().slice(0, 10);
}

export function presetRange(preset: PeriodPreset, today: string): { from: string; to: string } {
	switch (preset) {
		case 'yesterday':
			return { from: shift(today, -1), to: shift(today, -1) };
		case 'week':
			return { from: shift(today, -6), to: today };
		case 'month':
			return { from: `${today.slice(0, 8)}01`, to: today };
		case 'last_month': {
			const firstOfMonth = `${today.slice(0, 8)}01`;
			const lastOfPrevious = shift(firstOfMonth, -1);
			return { from: `${lastOfPrevious.slice(0, 8)}01`, to: lastOfPrevious };
		}
		default:
			return { from: today, to: today };
	}
}

// --- Export Excel (CSV) -----------------------------------------------------------

/** Cellule CSV au format Excel français : « ; » comme séparateur, virgule décimale. */
function cell(value: unknown): string {
	if (value === null || value === undefined) return '';
	let text =
		typeof value === 'number'
			? Number.isFinite(value)
				? String(Math.round(value * 100) / 100).replace('.', ',')
				: ''
			: String(value);
	// Une cellule commençant par = + - @ serait interprétée comme une formule par Excel.
	if (typeof value === 'string' && /^[=+\-@]/.test(text)) text = `'${text}`;
	return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(sections: { title?: string; header: string[]; rows: unknown[][] }[]): string {
	const lines: string[] = [];
	for (const section of sections) {
		if (lines.length) lines.push('');
		if (section.title) lines.push(cell(section.title));
		lines.push(section.header.map(cell).join(';'));
		for (const row of section.rows) lines.push(row.map(cell).join(';'));
	}
	return '﻿' + lines.join('\r\n') + '\r\n'; // BOM : Excel lit les accents correctement
}

export function downloadFile(filename: string, content: string, type = 'text/csv;charset=utf-8') {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
