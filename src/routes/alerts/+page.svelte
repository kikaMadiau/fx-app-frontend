<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		getAlertHistory,
		listAlerts,
		transitionAlert,
		type AlertHistoryEntry,
		type RiskAlert
	} from '$lib/api/alerts.js';
	import { session } from '$lib/stores/session.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import { formatDate } from '$lib/utils/dates.js';
	import {
		ALERT_STATUSES,
		alertLabel,
		alertReason,
		alertStatus,
		formatMoney,
		formatNumber,
		kycStatus,
		riskLevel,
		transactionTypeLabel
	} from '$lib/utils/labels.js';

	const PAGE_SIZE = 20;
	const TABS = [...ALERT_STATUSES, { value: '', label: 'Toutes', badge: '' }];

	let alerts = $state<RiskAlert[]>([]);
	let total = $state(0);
	let counts = $state<Record<string, number>>({});
	let loading = $state(true);
	let loadError = $state('');
	let notice = $state('');

	let statusFilter = $state('OPEN');
	let levelFilter = $state('');
	let search = $state('');
	let customerId = $state<number | undefined>(undefined);
	let offset = $state(0);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	// Seul le responsable conformité peut changer le statut d'une alerte (risk_flag:investigate).
	const canInvestigate = $derived($session?.trader.role === 'COMPLIANCE_OFFICER');

	let openedAlerts = $state<number[]>([]);
	let histories = $state<Record<number, AlertHistoryEntry[]>>({});
	let notes = $state<Record<number, string>>({});
	let actionErrors = $state<Record<number, string>>({});
	let busy = $state<number | null>(null);

	function baseFilter() {
		return { level: levelFilter, q: search, customerId };
	}

	async function loadAlerts() {
		loading = true;
		loadError = '';
		try {
			const [result, ...tabTotals] = await Promise.all([
				listAlerts({ ...baseFilter(), status: statusFilter, limit: PAGE_SIZE, offset }),
				...TABS.map((tab) => listAlerts({ ...baseFilter(), status: tab.value, limit: 1 }))
			]);
			alerts = result.items;
			total = result.total;
			counts = Object.fromEntries(TABS.map((tab, i) => [tab.value, tabTotals[i].total]));
		} catch (error) {
			loadError = getUserFacingErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		offset = 0;
		openedAlerts = [];
		loadAlerts();
	}

	function selectTab(value: string) {
		statusFilter = value;
		applyFilters();
	}

	function onSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(applyFilters, 350);
	}

	function clearCustomerFilter() {
		customerId = undefined;
		const url = new URL(page.url);
		url.searchParams.delete('client');
		history.replaceState(history.state, '', url);
		applyFilters();
	}

	function goToPage(newOffset: number) {
		offset = Math.max(0, newOffset);
		openedAlerts = [];
		loadAlerts();
	}

	onMount(() => {
		const client = Number(page.url.searchParams.get('client'));
		if (Number.isInteger(client) && client > 0) {
			customerId = client;
			statusFilter = ''; // depuis la fiche client : toutes ses alertes
		}
		loadAlerts();
	});

	function isOpen(id: number) {
		return openedAlerts.includes(id);
	}

	async function toggleAlert(id: number) {
		if (isOpen(id)) {
			openedAlerts = openedAlerts.filter((openedAlert) => openedAlert !== id);
			return;
		}
		openedAlerts = [...openedAlerts, id];
		try {
			histories[id] = await getAlertHistory(id);
		} catch {
			histories[id] = [];
		}
	}

	// Transitions autorisées par l'API (isValidStatusTransition côté Go).
	function actionsFor(
		status: string
	): { to: string; label: string; needsNote: boolean; style: string }[] {
		if (status === 'OPEN') {
			return [
				{
					to: 'IN_REVIEW',
					label: 'Prendre en charge',
					needsNote: false,
					style: 'app-button-primary'
				},
				{
					to: 'FALSE_POSITIVE',
					label: 'Faux positif',
					needsNote: true,
					style: 'app-button-secondary'
				}
			];
		}
		if (status === 'IN_REVIEW') {
			return [
				{ to: 'RESOLVED', label: 'Résoudre', needsNote: true, style: 'app-button-primary' },
				{
					to: 'FALSE_POSITIVE',
					label: 'Faux positif',
					needsNote: true,
					style: 'app-button-secondary'
				},
				{
					to: 'OPEN',
					label: 'Remettre en attente',
					needsNote: false,
					style: 'app-button-secondary'
				}
			];
		}
		return [];
	}

	async function changeStatus(alert: RiskAlert, to: string, needsNote: boolean) {
		const note = notes[alert.id] ?? '';
		if (needsNote && !note.trim()) {
			actionErrors[alert.id] =
				'Une note de clôture est obligatoire pour résoudre ou classer en faux positif.';
			return;
		}
		busy = alert.id;
		actionErrors[alert.id] = '';
		try {
			await transitionAlert(alert.id, to, {
				resolutionNote: needsNote ? note : '',
				assignedTo: to === 'IN_REVIEW' ? $session?.trader.id : undefined
			});
			notice = `Alerte n° ${alert.id} : ${alertStatus(to).label.toLowerCase()}.`;
			notes[alert.id] = '';
			await loadAlerts();
			if (alerts.some((a) => a.id === alert.id))
				histories[alert.id] = await getAlertHistory(alert.id);
		} catch (error) {
			actionErrors[alert.id] = getUserFacingErrorMessage(error);
		} finally {
			busy = null;
		}
	}
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<h1 class="app-title">Alertes</h1>
			<p class="app-subtitle">Alertes avec le client et la transaction concernee.</p>
		</div>
	</div>

	<div class="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Statut des alertes">
		{#each TABS as tab (tab.value)}
			<button
				role="tab"
				aria-selected={statusFilter === tab.value}
				class="rounded-full border px-4 py-2 text-sm font-semibold transition {statusFilter ===
				tab.value
					? 'border-blue-600 bg-blue-600 text-white'
					: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}"
				onclick={() => selectTab(tab.value)}
				data-testid="tab-{tab.value || 'ALL'}"
			>
				{tab.label}
				{#if counts[tab.value] !== undefined}<span class="ml-1 opacity-75"
						>({counts[tab.value]})</span
					>{/if}
			</button>
		{/each}
	</div>

	<div class="mb-5 grid gap-3 md:grid-cols-[1fr_200px]">
		<input
			class="app-input"
			type="search"
			placeholder="Rechercher par client ou téléphone"
			aria-label="Rechercher une alerte"
			bind:value={search}
			oninput={onSearchInput}
		/>
		<select class="app-input" aria-label="Niveau" bind:value={levelFilter} onchange={applyFilters}>
			<option value="">Tous les niveaux</option>
			<option value="CRITICAL">Critique</option>
			<option value="HIGH">Élevé</option>
			<option value="MEDIUM">Moyen</option>
			<option value="LOW">Faible</option>
		</select>
	</div>

	{#if customerId}
		<div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
			<span class="app-badge app-badge-info" data-testid="customer-filter">
				Client : {alerts[0]?.customer_name || `n° ${customerId}`}
			</span>
			<button class="font-semibold text-blue-600 hover:underline" onclick={clearCustomerFilter}>
				Voir tous les clients
			</button>
		</div>
	{/if}

	{#if !canInvestigate}
		<p class="mb-4 text-xs text-slate-500">
			Seul le responsable conformité peut traiter les alertes (prise en charge, résolution, faux
			positif).
		</p>
	{/if}

	{#if notice}
		<div
			class="mb-4 flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
			role="status"
		>
			<span>{notice}</span>
			<button class="font-semibold" aria-label="Fermer le message" onclick={() => (notice = '')}
				>×</button
			>
		</div>
	{/if}
	{#if loadError}
		<div
			class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
			role="alert"
		>
			<span>Impossible de charger les alertes : {loadError}</span>
			<button class="font-semibold underline" onclick={loadAlerts}>Réessayer</button>
		</div>
	{/if}

	<div class="space-y-5">
		{#each alerts as alert (alert.id)}
			{@const level = riskLevel(alert.level)}
			{@const status = alertStatus(alert.status)}
			<article class="app-card p-5" data-testid="alert-card">
				<div
					class={`flex flex-col gap-4 md:flex-row md:items-start md:justify-between ${
						isOpen(alert.id) ? 'border-b border-slate-100 pb-5' : ''
					}`}
				>
					<div>
						<div class="flex flex-wrap items-center gap-3">
							<h2 class="font-semibold text-slate-950">{alertLabel(alert.flag)}</h2>
							<span class="app-badge {level.badge}">{level.label}</span>
							<span class="app-badge {status.badge}">{status.label}</span>
						</div>
						<p class="mt-2 text-sm text-slate-500">{alertReason(alert.reason)}</p>
						<p class="mt-1 text-xs text-slate-400">
							Alerte n° {alert.id} · {alert.customer_name || 'Client inconnu'} · {formatDate(
								alert.created_at,
								{
									withTime: true
								}
							)}
						</p>
					</div>

					<button
						class="app-button app-button-secondary w-fit shrink-0 px-3 py-2"
						aria-expanded={isOpen(alert.id)}
						aria-controls={`alert-${alert.id}-details`}
						onclick={() => toggleAlert(alert.id)}
					>
						{isOpen(alert.id) ? 'Masquer' : 'Voir details'}
					</button>
				</div>

				{#if isOpen(alert.id)}
					{@const kyc = kycStatus(alert.customer?.kyc_status)}
					<div id={`alert-${alert.id}-details`} class="mt-5 grid gap-5 lg:grid-cols-2">
						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-xs font-semibold text-slate-400 uppercase">Client concerne</p>
							<h3 class="mt-3 font-semibold text-slate-950">
								{alert.customer?.full_name || alert.customer_name}
							</h3>
							<div class="mt-3 grid gap-2 text-sm">
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Telephone</span>
									<span class="font-semibold text-slate-950"
										>{alert.customer?.phone || alert.customer_phone || '-'}</span
									>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">KYC</span>
									<span class="app-badge {kyc.badge}">{kyc.label}</span>
								</div>
								<a
									href="/customers"
									class="mt-1 text-xs font-semibold text-blue-600 hover:underline"
									>Voir les clients →</a
								>
							</div>
						</div>

						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-xs font-semibold text-slate-400 uppercase">Transaction concernee</p>
							{#if alert.transaction}
								<h3 class="mt-3 font-semibold text-slate-950">N° {alert.transaction.id}</h3>
								<div class="mt-3 grid gap-2 text-sm">
									<div class="flex justify-between gap-4">
										<span class="text-slate-500">Operation</span>
										<span class="font-semibold text-slate-950">
											{transactionTypeLabel(alert.transaction.type)}
											{alert.transaction.currency}
										</span>
									</div>
									<div class="flex justify-between gap-4">
										<span class="text-slate-500">Montant</span>
										<span class="font-semibold text-slate-950">
											{formatMoney(alert.transaction.amount, alert.transaction.currency)}
										</span>
									</div>
									<div class="flex justify-between gap-4">
										<span class="text-slate-500">Taux</span>
										<span class="font-semibold text-slate-950"
											>{formatNumber(alert.transaction.rate)} CDF</span
										>
									</div>
									<div class="flex justify-between gap-4">
										<span class="text-slate-500">Contre-valeur</span>
										<span class="font-semibold text-slate-950">
											{formatMoney(alert.transaction.converted_amount, 'CDF')}
										</span>
									</div>
									<div class="flex justify-between gap-4">
										<span class="text-slate-500">Date</span>
										<span class="font-semibold text-slate-950">
											{formatDate(alert.transaction.created_at, { withTime: true })}
										</span>
									</div>
									<a
										href="/transactions?q={alert.transaction.id}"
										class="mt-1 text-xs font-semibold text-blue-600 hover:underline"
									>
										Ouvrir la transaction →
									</a>
								</div>
							{:else}
								<p class="mt-3 text-sm text-slate-500">Aucune transaction liée.</p>
							{/if}
						</div>

						<div class="rounded-lg bg-slate-50 p-4 lg:col-span-2">
							<p class="text-xs font-semibold text-slate-400 uppercase">Suivi</p>
							{#if alert.resolution_note}
								<p class="mt-3 text-sm text-slate-700">
									<span class="font-semibold">Note de clôture :</span>
									{alert.resolution_note}
								</p>
							{/if}
							<ol class="mt-3 space-y-1 text-sm text-slate-600" data-testid="alert-history">
								<li>{formatDate(alert.created_at, { withTime: true })} — alerte créée</li>
								{#each histories[alert.id] ?? [] as entry (entry.id)}
									<li>
										{formatDate(entry.created_at, { withTime: true })} — {alertStatus(
											entry.from_status
										).label} → {alertStatus(entry.to_status).label}{entry.note
											? ` : « ${entry.note} »`
											: ''}
									</li>
								{/each}
							</ol>

							{#if canInvestigate && actionsFor(alert.status).length}
								{@const actions = actionsFor(alert.status)}
								<div class="mt-4 border-t border-slate-200 pt-4">
									{#if actions.some((a) => a.needsNote)}
										<label
											for="note-{alert.id}"
											class="mb-2 block text-sm font-semibold text-slate-700"
										>
											Note de clôture (obligatoire pour résoudre ou classer en faux positif)
										</label>
										<textarea
											id="note-{alert.id}"
											class="app-input min-h-20"
											placeholder="Ex. : pièce d'identité reçue et vérifiée"
											bind:value={notes[alert.id]}></textarea>
									{/if}
									<div class="mt-3 flex flex-wrap gap-2">
										{#each actions as action (action.to)}
											<button
												class="app-button {action.style} px-3 py-2"
												disabled={busy === alert.id}
												onclick={() => changeStatus(alert, action.to, action.needsNote)}
											>
												{action.label}
											</button>
										{/each}
									</div>
									{#if actionErrors[alert.id]}
										<p class="mt-2 text-sm text-red-600" role="alert">{actionErrors[alert.id]}</p>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</article>
		{:else}
			<div class="app-card p-10 text-center text-sm text-slate-500">
				{loading ? 'Chargement…' : 'Aucune alerte dans cette catégorie.'}
			</div>
		{/each}
	</div>

	{#if total > PAGE_SIZE}
		<div class="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
			<span data-testid="pagination-info">
				{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} sur {total} alertes
			</span>
			<div class="flex gap-2">
				<button
					class="app-button app-button-secondary px-3 py-2"
					disabled={offset === 0 || loading}
					onclick={() => goToPage(offset - PAGE_SIZE)}
				>
					← Précédent
				</button>
				<button
					class="app-button app-button-secondary px-3 py-2"
					disabled={offset + PAGE_SIZE >= total || loading}
					onclick={() => goToPage(offset + PAGE_SIZE)}
				>
					Suivant →
				</button>
			</div>
		</div>
	{/if}
</section>
