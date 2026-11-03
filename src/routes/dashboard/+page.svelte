<script lang="ts">
	import { onMount } from 'svelte';
	import { getDashboardSummary, type DashboardSummary } from '$lib/api/dashboard.js';
	import { listTransactions, type TransactionListItem } from '$lib/api/transactions.js';
	import { listConfiguredAnalyses } from '$lib/api/analyses.js';
	import { ApiError } from '$lib/utils/api-errors.js';
	let summary = $state<DashboardSummary | null>(null);
	let recentTransactions = $state<TransactionListItem[]>([]);
	let exchangeRates = $state<Record<string, { buy_rate: number; sell_rate: number }>>({});
	let error = $state('');
	onMount(async () => {
		try {
			const results = await Promise.allSettled([getDashboardSummary(), listTransactions(3), listConfiguredAnalyses()]);
			if (results[0].status === 'fulfilled') summary = results[0].value;
			if (results[1].status === 'fulfilled') recentTransactions = results[1].value;
			if (results[2].status === 'fulfilled') exchangeRates = Object.fromEntries(results[2].value.map(r => [r.pair.split('/')[0], r]));
			if (results.every(r => r.status === 'rejected')) throw results[0].status === 'rejected' ? results[0].reason : new Error();
		}
		catch (e) { error = e instanceof ApiError ? e.message : 'Impossible de charger le tableau de bord.'; }
	});
	const number = (value: number) => new Intl.NumberFormat('fr-FR').format(value);
	const transactionStatus = (value: string) => ({ COMPLETED: 'Terminée', PENDING: 'En cours', CANCELLED: 'Annulée' } as Record<string, string>)[value] ?? value;
	const volume = (data: DashboardSummary | null) => data?.volume_today.map(v => `${number(v.amount)} ${v.currency}`).join(' · ') || '0';
	const cards = $derived(summary ? [
		{ label: "Transactions aujourd'hui", value: number(summary.transactions_today), detail: `${number(summary.transactions_yesterday)} hier` },
		{ label: 'Volume total', value: volume(summary), detail: 'Opérations du jour' },
		{ label: 'Clients actifs', value: number(summary.active_customers), detail: `${number(summary.new_customers_this_month)} nouveaux ce mois` },
		{ label: 'Alertes ouvertes', value: number(summary.open_alerts), detail: `${number(summary.urgent_alerts)} urgentes` }
	] : []);
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Pilotage</span>
			<h1 class="app-title">Vue d'ensemble</h1>
			<p class="app-subtitle">Resume des donnees principales de la plateforme.</p>
		</div>
	</div>

	<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
		{#if error}<p class="text-sm text-red-700 md:col-span-2 xl:col-span-4">{error}</p>{/if}
		{#if !summary && !error}<p class="text-sm text-slate-500 md:col-span-2 xl:col-span-4">Chargement…</p>{/if}
		{#each cards as card (card.label)}
			<div class="app-stat-card">
				<p class="app-stat-label">{card.label}</p>
				<p class="app-stat-value">{card.value}</p>
				<p class="app-stat-detail">{card.detail}</p>
			</div>
		{/each}
	</div>

	<div class="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
		<div class="app-card">
			<div class="app-card-header">
				<h2 class="app-card-title">Transactions recentes</h2>
				<p class="app-card-subtitle">Les dernieres operations saisies.</p>
			</div>

			<div class="overflow-x-auto">
				<table class="app-table">
					<thead>
						<tr>
							<th>Client</th>
							<th>Operation</th>
							<th>Montant</th>
							<th>Statut</th>
						</tr>
					</thead>
					<tbody>
						{#each recentTransactions as transaction (transaction.id)}
							<tr>
								<td class="font-semibold text-slate-950">{transaction.customer_name}</td>
								<td>{transaction.type === 'BUY' ? 'Achat' : 'Vente'} {transaction.currency}</td>
								<td class="font-semibold text-slate-950">{number(transaction.amount)} {transaction.currency}</td>
								<td>{transactionStatus(transaction.status)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="app-card p-5">
			<h2 class="app-card-title">Taux du jour</h2>
			<div class="mt-5 space-y-4 text-sm">
				<div class="rounded-xl bg-slate-50/50 p-3">
					<p class="mb-2 text-xs font-medium text-slate-500">USD / CDF</p>
					<div class="flex justify-between gap-4">
						<div class="flex-1">
							<p class="text-xs text-slate-500">Achat</p>
							<p class="mt-1 font-semibold text-slate-950">{exchangeRates.USD ? number(exchangeRates.USD.buy_rate) : '—'}</p>
						</div>
						<div class="flex-1">
							<p class="text-xs text-slate-500">Vente</p>
							<p class="mt-1 font-semibold text-slate-950">{exchangeRates.USD ? number(exchangeRates.USD.sell_rate) : '—'}</p>
						</div>
					</div>
				</div>
				<div class="rounded-xl bg-slate-50/50 p-3">
					<p class="mb-2 text-xs font-medium text-slate-500">EUR / CDF</p>
					<div class="flex justify-between gap-4">
						<div class="flex-1">
							<p class="text-xs text-slate-500">Achat</p>
							<p class="mt-1 font-semibold text-slate-950">{exchangeRates.EUR ? number(exchangeRates.EUR.buy_rate) : '—'}</p>
						</div>
						<div class="flex-1">
							<p class="text-xs text-slate-500">Vente</p>
							<p class="mt-1 font-semibold text-slate-950">{exchangeRates.EUR ? number(exchangeRates.EUR.sell_rate) : '—'}</p>
						</div>
					</div>
				</div>
				<div class="rounded-xl bg-slate-50/50 p-3">
					<p class="mb-2 text-xs font-medium text-slate-500">GBP / CDF</p>
					<div class="flex justify-between gap-4">
						<div class="flex-1">
							<p class="text-xs text-slate-500">Achat</p>
							<p class="mt-1 font-semibold text-slate-950">{exchangeRates.GBP ? number(exchangeRates.GBP.buy_rate) : '—'}</p>
						</div>
						<div class="flex-1">
							<p class="text-xs text-slate-500">Vente</p>
							<p class="mt-1 font-semibold text-slate-950">{exchangeRates.GBP ? number(exchangeRates.GBP.sell_rate) : '—'}</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
