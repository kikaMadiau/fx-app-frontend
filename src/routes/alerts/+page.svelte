<script lang="ts">
	import { onMount } from 'svelte';
	import { listRiskFlags, type RiskFlag } from '$lib/api/risk-flags.js';
	import { ApiError } from '$lib/utils/api-errors.js';
	let alerts = $state<RiskFlag[]>([]);
	let loadError = $state('');
	onMount(async () => {
		try { alerts = (await listRiskFlags()).items.filter(flag => ['OPEN', 'IN_REVIEW'].includes(flag.status)); }
		catch (error) { loadError = error instanceof ApiError ? error.message : 'Impossible de charger les alertes.'; }
	});

	function levelClass(level: string) {
		if (level === 'CRITICAL' || level === 'HIGH') {
			return 'app-badge-danger';
		}

		return 'app-badge-warning';
	}

	let openedAlerts = $state<string[]>([]);

	function isOpen(id: number) {
		return openedAlerts.includes(String(id));
	}

	function toggleAlert(id: number) {
		const key = String(id);
		openedAlerts = isOpen(id)
			? openedAlerts.filter((openedAlert) => openedAlert !== key)
			: [...openedAlerts, key];
	}
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Surveillance</span>
			<h1 class="app-title">Alertes</h1>
			<p class="app-subtitle">Alertes avec le client et la transaction concernee.</p>
		</div>
	</div>

	<div class="space-y-5">
		{#if loadError}<p class="text-sm text-red-700">{loadError}</p>{/if}
		{#if !loadError && alerts.length === 0}<p class="text-sm text-slate-500">Aucune alerte ouverte.</p>{/if}
		{#each alerts as alert}
			<article class="app-card p-5">
				<div
					class={`flex flex-col gap-4 md:flex-row md:items-start md:justify-between ${
						isOpen(alert.id) ? 'border-b border-slate-100 pb-5' : ''
					}`}
				>
					<div>
						<div class="flex flex-wrap items-center gap-3">
							<h2 class="font-semibold text-slate-950">{alert.flag}</h2>
							<span class={`app-badge ${levelClass(alert.level)}`}>{alert.level}</span>
						</div>
						<p class="mt-2 text-sm text-slate-500">{alert.reason || 'Aucun détail supplémentaire.'}</p>
					</div>

					<button
						class="app-button app-button-secondary w-fit px-3 py-2"
						aria-expanded={isOpen(alert.id)}
						aria-controls={`${alert.id}-details`}
						onclick={() => toggleAlert(alert.id)}
					>
						{isOpen(alert.id) ? 'Masquer' : 'Voir details'}
					</button>
				</div>

				{#if isOpen(alert.id)}
					<div id={`${alert.id}-details`} class="mt-5 grid gap-5 lg:grid-cols-2">
						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-xs font-semibold text-slate-400 uppercase">Client concerne</p>
							<h3 class="mt-3 font-semibold text-slate-950">{alert.customer?.full_name ?? `Client #${alert.customer_id}`}</h3>
							<div class="mt-3 grid gap-2 text-sm">
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Telephone</span>
									<span class="font-semibold text-slate-950">{alert.customer?.phone ?? '—'}</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">KYC</span>
									<span class="font-semibold text-slate-950">{alert.customer?.kyc_status ?? '—'}</span>
								</div>
							</div>
						</div>

						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-xs font-semibold text-slate-400 uppercase">Transaction concernee</p>
							<h3 class="mt-3 font-semibold text-slate-950">{alert.transaction?.id ? `TX-${alert.transaction.id}` : 'Aucune transaction liée'}</h3>
							<div class="mt-3 grid gap-2 text-sm">
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Operation</span>
									<span class="font-semibold text-slate-950">{alert.transaction?.type ?? '—'}</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Montant</span>
									<span class="font-semibold text-slate-950">{alert.transaction ? `${alert.transaction.amount} ${alert.transaction.currency}` : '—'}</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Taux</span>
									<span class="font-semibold text-slate-950">{alert.transaction?.rate ?? '—'} CDF</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Date</span>
									<span class="font-semibold text-slate-950">{alert.transaction?.created_at ? new Date(alert.transaction.created_at).toLocaleDateString('fr-FR') : new Date(alert.created_at).toLocaleDateString('fr-FR')}</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</article>
		{/each}
	</div>
</section>
