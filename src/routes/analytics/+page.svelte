<script lang="ts">
	import { onMount } from 'svelte';
	import {
		formatNumber,
		getDashboardSummary,
		getExchangeRates,
		type DashboardSummary,
		type ExchangeRate
	} from '$lib/api/dashboard.js';
	import { formatDate } from '$lib/utils/dates.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import RateConverter from '$lib/components/rates/RateConverter.svelte';

	// Taux officiels du bureau (GET /analysais), complétés par les derniers taux
	// réellement appliqués aux opérations (GET /dashboard/summary).
	let officialRates = $state<ExchangeRate[]>([]);
	let summary = $state<DashboardSummary | null>(null);
	let loading = $state(true);
	let loadError = $state('');
	let updatedAt = $state<Date | null>(null);

	async function load() {
		loading = true;
		loadError = '';
		try {
			const [r, s] = await Promise.all([
				getExchangeRates(),
				getDashboardSummary().catch(() => null)
			]);
			officialRates = r;
			summary = s;
			updatedAt = new Date();
		} catch (error) {
			loadError = getUserFacingErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	onMount(load);

	const rows = $derived(
		officialRates.map((rate) => {
			const currency = rate.pair.split('/')[0];
			const applied = (type: string) =>
				summary?.latest_rates.find((r) => r.currency === currency && r.type === type);
			const spread = rate.sell_rate - rate.buy_rate;
			return {
				...rate,
				currency,
				spread,
				margin: rate.buy_rate ? (spread / rate.buy_rate) * 100 : 0,
				appliedBuy: applied('BUY'),
				appliedSell: applied('SELL')
			};
		})
	);

	function variation(change: number): string {
		const sign = change > 0 ? '+' : change < 0 ? '−' : '';
		return `${sign}${formatNumber(Math.abs(change))} %`;
	}

	function trend(change: number) {
		if (change > 0) return { label: 'En hausse', arrow: '↗︎', cls: 'trend-up' };
		if (change < 0) return { label: 'En baisse', arrow: '↘︎', cls: 'trend-down' };
		return { label: 'Stable', arrow: '→︎', cls: 'trend-flat' };
	}
</script>

<section class="app-shell">
	<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="page-title">Analyses</h1>
			<p class="page-sub">Taux du bureau, écarts et derniers taux appliqués.</p>
		</div>
		<div class="flex items-center gap-3 text-xs text-slate-500">
			{#if updatedAt}<span>Mis à jour à {formatDate(updatedAt, { withTime: true }).split(' à ')[1]}</span>{/if}
			<button class="refresh-link" onclick={load} disabled={loading}>
				<svg
					class="h-3.5 w-3.5 {loading ? 'animate-spin' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h5M20 20v-5h-5M5.6 15A7 7 0 0 0 18.4 15M18.4 9A7 7 0 0 0 5.6 9"
					/>
				</svg>
				Actualiser
			</button>
		</div>
	</div>

	{#if loadError}
		<p class="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
			Impossible de charger les taux : {loadError}
		</p>
	{/if}

	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each rows as rate (rate.pair)}
			{@const t = trend(rate.change_rate)}
			<div class="rate-tile" data-testid="analysis-{rate.currency}">
				<div class="flex items-center justify-between gap-2">
					<span class="inline-flex items-center gap-2 text-[15px] font-bold text-slate-950">
						<img class="flag" src="/images/flags/{rate.currency.toLowerCase()}.svg" alt="" />
						{rate.currency} / CDF
					</span>
					<span class="chip {t.cls}" title={t.label}>{t.arrow} {variation(rate.change_rate)}</span>
				</div>
				<div class="mt-3 grid grid-cols-2 gap-3">
					<div>
						<p class="tile-label">Achat</p>
						<p class="tile-value">{formatNumber(rate.buy_rate)}</p>
					</div>
					<div>
						<p class="tile-label">Vente</p>
						<p class="tile-value">{formatNumber(rate.sell_rate)}</p>
					</div>
				</div>
				<p class="tile-foot">
					{#if rate.appliedBuy || rate.appliedSell}
						Dernier taux appliqué : achat {rate.appliedBuy ? formatNumber(rate.appliedBuy.rate) : '—'}
						· vente {rate.appliedSell ? formatNumber(rate.appliedSell.rate) : '—'}
					{:else}
						Aucune opération dans cette devise
					{/if}
				</p>
			</div>
		{:else}
			{#if loading}<p class="text-sm text-slate-500">Chargement…</p>{/if}
		{/each}
	</div>

	<div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
		<div class="app-card panel min-w-0">
			<h2 class="panel-title">Écarts et tendances</h2>
			<p class="panel-sub">Écart = vente − achat, en CDF ; marge en % du taux d'achat.</p>
			<div class="mt-2 overflow-x-auto">
				<table class="trend-table">
					<thead>
						<tr>
							<th>Devise</th>
							<th class="text-right">Achat</th>
							<th class="text-right">Vente</th>
							<th class="text-right">Écart</th>
							<th class="text-right max-sm:hidden">Marge</th>
							<th class="text-right">Tendance</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as rate (rate.pair)}
							{@const t = trend(rate.change_rate)}
							<tr data-testid="trend-{rate.currency}">
								<td>
									<span class="inline-flex items-center gap-2 font-semibold text-slate-700">
										<img class="flag" src="/images/flags/{rate.currency.toLowerCase()}.svg" alt="" />
										{rate.currency}
									</span>
								</td>
								<td class="text-right">{formatNumber(rate.buy_rate)}</td>
								<td class="text-right">{formatNumber(rate.sell_rate)}</td>
								<td class="text-right">{formatNumber(rate.spread)}</td>
								<td class="text-right max-sm:hidden">{formatNumber(Math.round(rate.margin * 100) / 100)} %</td>
								<td class="text-right">
									<span class="{t.cls} font-semibold">{t.arrow} {t.label}<span class="max-sm:hidden"> ({variation(rate.change_rate)})</span></span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="app-card panel min-w-0">
			<h2 class="panel-title">Convertisseur de taux</h2>
			<p class="panel-sub">Aux taux du bureau du jour.</p>
			<div class="mt-2.5">
				{#if officialRates.length}
					<RateConverter rates={officialRates} />
				{:else}
					<p class="text-sm text-slate-500">{loading ? 'Chargement…' : 'Aucun taux configuré.'}</p>
				{/if}
			</div>
		</div>
	</div>
</section>

<style>
	.page-title {
		font-size: clamp(1.3rem, 2.4vw, 1.6rem);
		font-weight: 800;
		color: var(--fx-text);
	}
	.page-sub {
		margin-top: 2px;
		font-size: 13px;
		color: var(--fx-muted);
	}
	.refresh-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		border-radius: 999px;
		padding: 3px 8px;
		font-weight: 700;
		color: var(--fx-blue);
	}
	.refresh-link:hover:not(:disabled) {
		background: rgb(0 92 169 / 0.08);
	}
	.refresh-link:disabled {
		opacity: 0.6;
	}
	.rate-tile {
		border: 1px solid var(--fx-border);
		border-radius: 14px;
		background: var(--fx-surface);
		padding: 12px 14px;
		box-shadow: var(--fx-shadow-soft);
	}
	.flag {
		height: 14px;
		width: 21px;
		flex-shrink: 0;
		border-radius: 2px;
		object-fit: cover;
		box-shadow: 0 0 0 1px rgb(15 23 42 / 0.1);
	}
	.chip {
		border-radius: 999px;
		padding: 1px 8px;
		font-size: 11px;
		font-weight: 700;
		white-space: nowrap;
	}
	.chip.trend-up {
		background: rgb(4 120 87 / 0.1);
	}
	.chip.trend-down {
		background: rgb(185 28 28 / 0.1);
	}
	.chip.trend-flat {
		background: var(--fx-surface-muted);
	}
	.trend-up {
		color: var(--fx-green);
	}
	.trend-down {
		color: var(--fx-red);
	}
	.trend-flat {
		color: var(--fx-muted);
	}
	.tile-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--fx-muted);
	}
	.tile-value {
		margin-top: 2px;
		font-size: clamp(1.15rem, 2vw, 1.4rem);
		font-weight: 800;
		color: var(--fx-text);
		font-variant-numeric: tabular-nums;
	}
	.tile-foot {
		margin-top: 8px;
		border-top: 1px solid var(--fx-border-soft);
		padding-top: 6px;
		font-size: 11px;
		color: var(--fx-muted);
	}
	.panel {
		border-radius: 16px;
		padding: 14px 16px;
	}
	.panel-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--fx-text);
	}
	.panel-sub {
		margin-top: 2px;
		font-size: 11.5px;
		color: var(--fx-muted);
	}
	.trend-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		color: var(--fx-text);
		font-variant-numeric: tabular-nums;
	}
	.trend-table th {
		padding: 2px 0 6px 12px;
		text-align: left;
		font-size: 10.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--fx-muted);
		white-space: nowrap;
	}
	.trend-table th:first-child,
	.trend-table td:first-child {
		padding-left: 0;
	}
	.trend-table th.text-right {
		text-align: right;
	}
	.trend-table td {
		border-top: 1px solid var(--fx-border);
		padding: 8px 0 8px 12px;
		white-space: nowrap;
	}
</style>
