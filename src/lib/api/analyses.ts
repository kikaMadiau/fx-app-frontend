import { apiRequest } from '$lib/api/http.js';

export type ExchangeAnalysis = { pair: string; buy_rate: number; sell_rate: number; change_rate: number };

const EXCHANGE_RATE_OVERRIDES_KEY = 'fx-app.exchange-rate-overrides';

export function getSavedAnalysis(pair: string): Partial<ExchangeAnalysis> | undefined {
	if (typeof localStorage === 'undefined') return undefined;
	try {
		const overrides = JSON.parse(localStorage.getItem(EXCHANGE_RATE_OVERRIDES_KEY) ?? '{}') as Record<
			string,
			Partial<ExchangeAnalysis>
		>;
		return overrides[pair];
	} catch {
		return undefined;
	}
}

export function listAnalyses() {
	return apiRequest<ExchangeAnalysis[]>('/analysais');
}

export async function listConfiguredAnalyses(): Promise<ExchangeAnalysis[]> {
	const analyses = await listAnalyses();
	if (typeof localStorage === 'undefined') return analyses;

	return analyses.map((analysis) => ({ ...analysis, ...getSavedAnalysis(analysis.pair) }));
}

export function saveConfiguredAnalyses(analyses: ExchangeAnalysis[]): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(
		EXCHANGE_RATE_OVERRIDES_KEY,
		JSON.stringify(Object.fromEntries(analyses.map((analysis) => [analysis.pair, analysis])))
	);
}
