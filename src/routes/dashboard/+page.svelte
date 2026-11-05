<script lang="ts">
	import { onMount } from 'svelte';
	import { session } from '$lib/stores/session.js';
	import { getProfile } from '$lib/api/profile.js';
	import { personName } from '$lib/utils/bureau.js';
	import { timeOfDay } from '$lib/utils/greeting.js';
	import { isPlatformAdmin } from '$lib/types/trader.js';
	import { preferences } from '$lib/stores/preferences.js';
	import { formatDate } from '$lib/utils/dates.js';
	import { fromApiIdType } from '$lib/utils/identity.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import RateConverter from '$lib/components/rates/RateConverter.svelte';
	import PlatformAdminDashboard from '$lib/components/dashboard/PlatformAdminDashboard.svelte';
	import {
		alertLabel,
		alertReason,
		alertStatusLabel,
		dayOverDay,
		formatCompactCdf,
		formatMoney,
		formatNumber,
		getDashboardSummary,
		getExchangeRates,
		getRecentTransactions,
		getTransaction,
		plural,
		riskLevel,
		transactionStatus,
		transactionTypeLabel,
		type DashboardAlert,
		type DashboardSummary,
		type ExchangeRate,
		type TransactionListItem
	} from '$lib/api/dashboard.js';

	const CURRENCIES = ['USD', 'EUR', 'GBP'];

	// Accueil : « Bonjour, prénom nom », le rôle en dessous, et le bureau de change à droite.
	const ROLE_LABELS: Record<string, string> = {
		TRADER: 'Cambiste',
		COMPLIANCE_OFFICER: 'Conformité',
		SUPERVISOR: 'Superviseur',
		ADMIN: 'Administrateur'
	};
	const hello = timeOfDay(new Date().getHours());
	const fullName = $derived(personName($session?.trader));
	const roleLabel = $derived(
		$session ? (ROLE_LABELS[$session.trader.role] ?? $session.trader.role) : ''
	);
	let office = $state<{ name: string; licence: string } | null>(null);

	async function loadOffice() {
		if (isPlatformAdmin($session?.trader)) {
			office = { name: 'Tous les bureaux', licence: 'Administration de la plateforme' };
			return;
		}
		try {
			const p = await getProfile();
			// Bureau provisoire de la migration : pas de vrai agrément, on garde le nom du profil.
			const provisional = p.store?.bcc_license_number === 'MIGRATION-PENDING';
			const storeName = provisional ? '' : p.store?.name;
			office = {
				name: storeName || p.exchange_office?.trim() || p.store?.name || 'Bureau de change',
				licence:
					p.store?.bcc_license_number && !provisional
						? `Agrément BCC ${p.store.bcc_license_number}`
						: ''
			};
		} catch {
			office = null;
		}
	}

	let summary = $state<DashboardSummary | null>(null);
	let officialRates = $state<ExchangeRate[]>([]);
	let recentTransactions = $state<TransactionListItem[]>([]);
	let loading = $state(true);
	let error = $state('');
	let updatedAt = $state<Date | null>(null);

	let selected = $state<TransactionListItem | null>(null);
	let selectedAlert = $state<DashboardAlert | null>(null);
	let detailError = $state('');

	async function load() {
		loading = true;
		error = '';
		try {
			const [s, t, r] = await Promise.all([
				getDashboardSummary(),
				getRecentTransactions(5),
				getExchangeRates().catch(() => [] as ExchangeRate[])
			]);
			summary = s;
			recentTransactions = t;
			officialRates = r;
			updatedAt = new Date();
		} catch (e) {
			error = getUserFacingErrorMessage(e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		load();
		loadOffice();
	});

	type Card = {
		key: string;
		label: string;
		value: string;
		detail: string;
		href: string;
	};

	const cards = $derived.by((): Card[] => {
		const s = summary;
		const volume = s?.volume_today ?? [];
		const counterValue = volume.reduce(
			(sum, v) => sum + (v.target_currency === 'CDF' ? v.converted_amount : 0),
			0
		);
		const list: Card[] = [
			{
				key: 'transactions',
				label: "Transactions aujourd'hui",
				value: s ? formatNumber(s.transactions_today) : '…',
				detail: s ? dayOverDay(s.transactions_today, s.transactions_yesterday) : '',
				href: '/transactions'
			},
			{
				key: 'volume',
				label: 'Volume du jour',
				value: s ? formatCompactCdf(counterValue) : '…',
				detail: s
					? volume.length
						? volume.map((v) => formatMoney(v.amount, v.currency)).join(' · ')
						: "Aucune opération aujourd'hui"
					: '',
				href: '/transactions'
			},
			{
				key: 'customers',
				label: 'Clients actifs',
				value: s ? formatNumber(s.active_customers) : '…',
				detail: s ? `${plural(s.new_customers_this_month, 'nouveau', 'nouveaux')} ce mois` : '',
				href: '/customers'
			},
			{
				key: 'alerts',
				label: 'Alertes ouvertes',
				value: s ? formatNumber(s.open_alerts) : '…',
				detail: s
					? s.urgent_alerts
						? `${plural(s.urgent_alerts, 'urgente')} (risque élevé)`
						: 'Aucune alerte urgente'
					: '',
				href: '/alerts'
			}
		];
		// « Alertes sur le tableau de bord » (Paramètres) : masque la carte des alertes si désactivé.
		return $preferences.dashboard_alerts ? list : list.filter((card) => card.key !== 'alerts');
	});

	// Taux officiels du bureau (configurés dans le .env de l'API, GET /analysais), complétés
	// par les derniers taux réellement appliqués aux opérations.
	const rates = $derived(
		CURRENCIES.map((currency) => {
			const find = (type: string) =>
				summary?.latest_rates.find((r) => r.currency === currency && r.type === type);
			const official = officialRates.find((r) => r.pair === `${currency}/CDF`);
			return { currency, official, buy: find('BUY'), sell: find('SELL') };
		})
	);

	const headline = $derived(rates.find((r) => r.official) ?? null);

	function trendArrow(change: number): string {
		// ︎ : affichage en texte (sinon Windows dessine ↘ en emoji).
		return (change > 0 ? '↗' : change < 0 ? '↘' : '→') + '︎';
	}

	function trendClass(change: number): string {
		return change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : 'text-slate-400';
	}

	let converterOpen = $state(false);

	function variation(change: number): string {
		const sign = change > 0 ? '+' : change < 0 ? '−' : '';
		return `${sign}${formatNumber(Math.abs(change))} %`;
	}

	const activity = $derived.by(() => {
		const days = summary?.daily_activity ?? [];
		const max = Math.max(1, ...days.map((d) => d.count));
		const total = days.reduce((sum, d) => sum + d.count, 0);
		return {
			total,
			days: days.map((d) => ({
				...d,
				height: d.count ? Math.max(6, Math.round((d.count / max) * 100)) : 0,
				label: dayLabel(d.date)
			}))
		};
	});

	function dayLabel(isoDate: string): string {
		const date = new Date(`${isoDate}T12:00:00Z`);
		const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' }).format(
			date
		);
		return `${weekday.replace('.', '')} ${date.getUTCDate()}`;
	}

	function shortDate(value: string): string {
		return formatDate(value, { withTime: true });
	}

	function openTransaction(transaction: TransactionListItem) {
		selectedAlert = null;
		detailError = '';
		selected = transaction;
	}

	async function openAlert(alert: DashboardAlert) {
		detailError = '';
		selectedAlert = alert;
		selected = null;
		if (!alert.transaction_id) return;
		try {
			const transaction = await getTransaction(alert.transaction_id);
			selected = {
				...transaction,
				customer_name: transaction.customer_name || alert.customer_name
			};
		} catch (e) {
			detailError = getUserFacingErrorMessage(e);
		}
	}

	function closeDetails() {
		selected = null;
		selectedAlert = null;
		detailError = '';
	}

	const detailOpen = $derived(selected !== null || selectedAlert !== null);
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && detailOpen && closeDetails()} />

<section class="app-shell">
	{#if $session}
		<div class="welcome-card" data-testid="welcome">
			<div class="min-w-0">
				<p class="welcome-hello">
					{hello}, <span class="welcome-name">{fullName}</span>
				</p>
				<div class="welcome-meta">
					<span class="welcome-role" data-testid="welcome-role">{roleLabel}</span>
					{#if updatedAt}
						<span data-testid="updated-at">
							Mis à jour à {formatDate(updatedAt, { withTime: true }).split(' à ')[1]}
						</span>
					{/if}
					<button
						class="refresh-link"
						onclick={load}
						disabled={loading}
						title="Recharger les chiffres"
					>
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
			{#if office}
				<div class="office-card" data-testid="welcome-office">
					<span class="office-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M3 21h18M4 21V10l8-6 8 6v11M9 21v-6h6v6M8 12h.01M16 12h.01"
							/>
						</svg>
					</span>
					<span class="min-w-0">
						<span class="office-label">Bureau de change</span>
						<span class="office-name">{office.name}</span>
						{#if office.licence}<span class="office-licence">{office.licence}</span>{/if}
					</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Le titre reste pour les lecteurs d'écran ; l'accueil fait office d'en-tête visible. -->
	<h1 class="sr-only">Vue d'ensemble</h1>

	{#if error}
		<div
			class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
			role="alert"
		>
			<span>Impossible de charger les données : {error}</span>
			<button class="font-semibold underline" onclick={load}>Réessayer</button>
		</div>
	{/if}

	<div
		class="grid grid-cols-2 gap-3 sm:gap-4 {cards.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}"
	>
		{#each cards as card (card.key)}
			<a href={card.href} class="stat-tile dashboard-link" data-testid="card-{card.key}">
				<p class="stat-label">{card.label}</p>
				<p class="stat-value">{card.value}</p>
				<p class="stat-detail">{card.detail}</p>
			</a>
		{/each}
	</div>

	{#if isPlatformAdmin($session?.trader)}
		<div class="mt-4"><PlatformAdminDashboard /></div>
	{/if}

	<div class="app-card dash-panel mt-4" data-testid="recent-transactions">
		<div class="flex items-center justify-between gap-3">
			<h2 class="dash-title">Transactions récentes</h2>
			<a href="/transactions" class="text-xs font-semibold text-blue-600 hover:underline"
				>Voir tout →</a
			>
		</div>
		<div class="mt-2 overflow-x-auto">
			<table class="recent-table">
				<thead>
					<tr>
						<th>Client</th>
						<th>Opération</th>
						<th>Montant</th>
						<th class="max-sm:hidden">Taux</th>
						<th>Statut</th>
						<th class="max-md:hidden">Date</th>
					</tr>
				</thead>
				<tbody>
					{#each recentTransactions as transaction (transaction.id)}
						{@const status = transactionStatus(transaction.status)}
						<tr
							class="dashboard-row cursor-pointer"
							tabindex="0"
							onclick={() => openTransaction(transaction)}
							onkeydown={(e) =>
								(e.key === 'Enter' || e.key === ' ') &&
								(e.preventDefault(), openTransaction(transaction))}
							data-testid="recent-row"
						>
							<td class="max-w-40 truncate font-semibold text-slate-950"
								>{transaction.customer_name || '-'}</td
							>
							<td>{transactionTypeLabel(transaction.type)} {transaction.currency}</td>
							<td class="font-semibold text-slate-950"
								>{formatMoney(transaction.amount, transaction.currency)}</td
							>
							<td class="max-sm:hidden">{formatNumber(transaction.rate)}</td>
							<td><span class="alert-badge app-badge {status.badge}">{status.label}</span></td>
							<td class="max-md:hidden">{shortDate(transaction.created_at)}</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="py-4 text-center text-slate-500">
								{loading ? 'Chargement…' : 'Aucune transaction enregistrée pour le moment.'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div
		class="mt-4 grid gap-4 md:grid-cols-2 {$preferences.dashboard_alerts
			? 'xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]'
			: ''}"
	>
		<div class="app-card dash-panel flex flex-col md:col-span-2 xl:col-span-1">
			<h2 class="dash-title">Activité des 7 derniers jours</h2>
			<p class="dash-sub">
				{summary ? `${plural(activity.total, 'opération')} sur la semaine` : 'Chargement…'}
				{#if summary?.pending_today}· {plural(summary.pending_today, 'opération')} en attente aujourd'hui{/if}
			</p>
			<div class="mt-auto flex h-36 shrink-0 items-end gap-2 pt-3" data-testid="activity-chart">
				{#each activity.days as day (day.date)}
					<div class="flex h-full flex-1 flex-col items-center justify-end gap-1">
						<span class="text-[11px] font-semibold text-slate-700">{day.count || ''}</span>
						<div
							class="dashboard-bar w-full max-w-8 rounded-t-md"
							style="height: {day.height}%"
							title="{day.label} : {plural(day.count, 'opération')} · {formatCompactCdf(
								day.converted_amount
							)}"
						></div>
						<span class="text-[10px] whitespace-nowrap text-slate-500 capitalize">{day.label}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="app-card dash-panel fx-card flex flex-col" data-testid="fx-card">
			<h2 class="fx-title">Cours de change</h2>
			{#if headline?.official}
				<p class="fx-headline" data-testid="fx-headline">
					1 {headline.currency} = {formatNumber(headline.official.buy_rate)}
					<span class="fx-headline-sep">/</span>
					{formatNumber(headline.official.sell_rate)} CDF
				</p>
				<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
					<span class="fx-chip">achat / vente</span>
					<span class="fx-chip {trendClass(headline.official.change_rate)}">
						{trendArrow(headline.official.change_rate)}
						{variation(headline.official.change_rate)}
					</span>
				</div>
			{/if}
			<div class="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-500">
				<span class="inline-flex items-center gap-1">
					<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
						><circle cx="12" cy="12" r="9" stroke-width="2" /><path
							d="M12 7v5l3 2"
							stroke-width="2"
							stroke-linecap="round"
						/></svg
					>
					{formatDate(new Date())}
				</span>
				<span class="italic">cours du bureau</span>
			</div>

			<table class="rate-table mt-2">
				<thead>
					<tr><th></th><th class="text-right">Achat</th><th class="text-right">Vente</th><th></th></tr>
				</thead>
				<tbody>
					{#each rates as rate (rate.currency)}
						<tr
							data-testid="rate-{rate.currency}"
							title={rate.buy || rate.sell
								? `Dernier taux appliqué : achat ${rate.buy ? formatNumber(rate.buy.rate) : '—'} · vente ${rate.sell ? formatNumber(rate.sell.rate) : '—'}`
								: 'Aucune opération dans cette devise'}
						>
							<td>
								<span class="inline-flex items-center gap-2 font-semibold text-slate-700">
									<img class="fx-flag" src="/images/flags/{rate.currency.toLowerCase()}.svg" alt="" />
									{rate.currency}
								</span>
							</td>
							<td class="text-right tabular-nums text-slate-950" data-testid="rate-{rate.currency}-buy">
								{rate.official ? formatNumber(rate.official.buy_rate) : '—'}
							</td>
							<td class="text-right tabular-nums text-slate-950" data-testid="rate-{rate.currency}-sell">
								{rate.official ? formatNumber(rate.official.sell_rate) : '—'}
							</td>
							<td
								class="w-6 text-right text-sm {rate.official
									? trendClass(rate.official.change_rate)
									: 'text-slate-300'}"
								title={rate.official ? `Variation ${variation(rate.official.change_rate)}` : ''}
							>
								{rate.official ? trendArrow(rate.official.change_rate) : ''}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>

			{#if converterOpen}
				<div class="mt-2.5"><RateConverter rates={officialRates} /></div>
			{/if}

			<div class="mt-auto pt-3">
				<button
					type="button"
					class="fx-convert-btn"
					onclick={() => (converterOpen = !converterOpen)}
					aria-expanded={converterOpen}
					data-testid="converter-toggle"
				>
					{converterOpen ? 'Fermer le convertisseur' : 'Convertisseur de taux'}
				</button>
				<div class="mt-3 flex justify-end border-t border-slate-100 pt-2">
					<a href="/analytics" class="fx-more">Tous les cours →</a>
				</div>
			</div>
		</div>

		{#if $preferences.dashboard_alerts}
			<div class="app-card dash-panel">
				<div class="flex items-start justify-between gap-3">
					<div>
						<h2 class="dash-title">Alertes à traiter</h2>
						<p class="dash-sub">Les plus graves d'abord.</p>
					</div>
					<a href="/alerts" class="text-xs font-semibold text-blue-600 hover:underline"
						>Voir tout →</a
					>
				</div>
				<ul class="mt-2 space-y-1.5">
					{#each (summary?.recent_alerts ?? []).slice(0, 4) as alert (alert.id)}
						{@const risk = riskLevel(alert.level)}
						<li>
							<button
								class="dashboard-link w-full rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-left"
								onclick={() => openAlert(alert)}
								data-testid="alert-item"
							>
								<div class="flex items-center justify-between gap-2">
									<p class="truncate text-[13px] font-semibold text-slate-950">
										{alertLabel(alert.flag)}
									</p>
									<span class="alert-badge app-badge {risk.badge} shrink-0">{risk.label}</span>
								</div>
								<p class="mt-0.5 truncate text-[11px] text-slate-500">
					{alert.customer_name || 'Client inconnu'}
					{#if alert.transaction_id} · transaction n° {alert.transaction_id}{/if}
					· {shortDate(alert.created_at)}
								</p>
							</button>
						</li>
					{:else}
						<li class="py-4 text-center text-sm text-slate-500">
							{loading ? 'Chargement…' : 'Aucune alerte ouverte.'}
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	</div>
</section>

{#if detailOpen}
	<div
		class="app-modal-backdrop"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && closeDetails()}
	>
		<div
			class="app-modal max-h-[90vh] w-full max-w-2xl overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="detail-title"
		>
			<div
				class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6"
			>
				<div>
					<h2 id="detail-title" class="text-lg font-semibold text-slate-950">
						{selected
							? `Transaction n° ${selected.id}`
							: selectedAlert
								? `Alerte n° ${selectedAlert.id}`
								: 'Chargement…'}
					</h2>
					{#if selected}
						<p class="mt-1 text-sm text-slate-500">{shortDate(selected.created_at)}</p>
					{/if}
				</div>
				<button
					class="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
					aria-label="Fermer"
					onclick={closeDetails}
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="space-y-6 px-5 py-5 sm:px-6">
				{#if selectedAlert}
					<div
						class="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800"
					>
						<p class="font-semibold">
							Alerte : {alertLabel(selectedAlert.flag)} ({alertStatusLabel(selectedAlert.status)})
						</p>
						{#if selectedAlert.reason}<p class="mt-1">{alertReason(selectedAlert.reason)}</p>{/if}
					</div>
				{/if}
				{#if detailError}
					<p class="text-sm text-red-600">{detailError}</p>
				{/if}

				{#if selected}
					{@const status = transactionStatus(selected.status)}
					{@const risk = riskLevel(selected.risk_level)}
					<div class="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
						<span class="text-xs font-semibold text-slate-500 uppercase">Statut</span>
						<span class="app-badge {status.badge}">{status.label}</span>
						<span class="ml-auto text-xs font-semibold text-slate-500 uppercase">Risque</span>
						<span class="app-badge {risk.badge}">{risk.label}</span>
					</div>

					<div>
						<h3 class="text-sm font-semibold text-slate-950">Transaction</h3>
						<dl class="mt-4 grid gap-4 sm:grid-cols-2">
							<div>
								<dt class="text-xs font-semibold text-slate-500 uppercase">Type</dt>
								<dd class="mt-1 text-sm font-semibold text-slate-950">
									{transactionTypeLabel(selected.type)}
									{selected.currency}
								</dd>
							</div>
							<div>
								<dt class="text-xs font-semibold text-slate-500 uppercase">Montant</dt>
								<dd class="mt-1 text-sm font-semibold text-slate-950">
									{formatMoney(selected.amount, selected.currency)}
								</dd>
							</div>
							<div>
								<dt class="text-xs font-semibold text-slate-500 uppercase">Taux applique</dt>
								<dd class="mt-1 text-sm font-semibold text-slate-950">
									{formatNumber(selected.rate)} CDF
								</dd>
							</div>
							<div>
								<dt class="text-xs font-semibold text-slate-500 uppercase">Contre-valeur</dt>
								<dd class="mt-1 text-sm font-semibold text-slate-950">
									{selected.converted_amount
										? formatMoney(selected.converted_amount, selected.target_currency || 'CDF')
										: '-'}
								</dd>
							</div>
						</dl>
					</div>

					<div class="border-t border-slate-100 pt-5">
						<h3 class="text-sm font-semibold text-slate-950">Client</h3>
						<dl class="mt-4 grid gap-4 sm:grid-cols-2">
							<div>
								<dt class="text-xs font-semibold text-slate-500 uppercase">Nom complet</dt>
								<dd class="mt-1 text-sm font-semibold text-slate-950">
									{selected.customer_name || '-'}
								</dd>
							</div>
							<div>
								<dt class="text-xs font-semibold text-slate-500 uppercase">Numero de telephone</dt>
								<dd class="mt-1 text-sm font-semibold text-slate-950">
									{selected.customer_phone || '-'}
								</dd>
							</div>
							<div>
								<dt class="text-xs font-semibold text-slate-500 uppercase">
									Type de piece presentee
								</dt>
								<dd class="mt-1 text-sm font-semibold text-slate-950">
									{selected.customer_id_type ? fromApiIdType(selected.customer_id_type) : '-'}
								</dd>
							</div>
							<div>
								<dt class="text-xs font-semibold text-slate-500 uppercase">Numero de la piece</dt>
								<dd class="mt-1 text-sm font-semibold text-slate-950">
									{selected.customer_id_number || '-'}
								</dd>
							</div>
						</dl>
					</div>
				{/if}
			</div>

			<div class="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
				<button class="app-button app-button-secondary" onclick={closeDetails}>Fermer</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.welcome-card {
		margin-bottom: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		border-radius: 16px;
		border: 1px solid var(--fx-border);
		background: linear-gradient(120deg, rgb(0 92 169 / 0.07), transparent 60%), var(--fx-surface);
		padding: 14px 18px;
		box-shadow: var(--fx-shadow-soft);
	}
	.welcome-hello {
		margin: 0;
		font-size: clamp(1.1rem, 2vw, 1.35rem);
		font-weight: 600;
		color: var(--fx-muted);
	}
	.welcome-name {
		font-weight: 800;
		color: var(--fx-text);
	}
	.welcome-meta {
		margin-top: 8px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 12px;
		font-size: 12px;
		color: var(--fx-muted);
	}
	.refresh-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		border-radius: 999px;
		padding: 3px 8px;
		font-weight: 700;
		color: #005ca9;
		transition: background 0.15s;
	}
	.refresh-link:hover:not(:disabled) {
		background: rgb(0 92 169 / 0.08);
	}
	.refresh-link:disabled {
		opacity: 0.6;
	}
	:global(:root[data-theme='dark']) .refresh-link {
		color: #a9d3f5;
	}
	.welcome-role {
		display: inline-flex;
		border-radius: 999px;
		background: #eaf6ff;
		padding: 2px 10px;
		font-size: 12px;
		font-weight: 700;
		color: #005ca9;
	}
	.office-card {
		display: flex;
		align-items: center;
		gap: 14px;
		border-radius: 14px;
		background: linear-gradient(135deg, #0f2849, #005ca9);
		padding: 8px 14px 8px 8px;
		color: #fff;
		box-shadow: 0 8px 20px rgb(0 92 169 / 0.22);
		max-width: 100%;
	}
	.office-icon {
		display: flex;
		height: 34px;
		width: 34px;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
		background: rgb(255 255 255 / 0.14);
		color: #ffa401;
	}
	.office-icon svg {
		height: 19px;
		width: 19px;
	}
	.office-label {
		display: block;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgb(255 255 255 / 0.7);
	}
	.office-name {
		display: block;
		font-size: 14.5px;
		font-weight: 800;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}
	.office-licence {
		display: block;
		font-size: 12px;
		color: rgb(255 255 255 / 0.75);
	}
	:global(:root[data-theme='dark']) .welcome-role {
		background: rgb(61 143 214 / 0.15);
		color: #a9d3f5;
	}

	@media (min-width: 768px) {
		.welcome-card {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}
	.dashboard-link {
		color: inherit;
		text-decoration: none;
		cursor: pointer;
		transition:
			transform 0.2s ease,
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}
	.dashboard-link:hover {
		border-color: rgb(37 99 235 / 0.35);
	}
	.dashboard-link:focus-visible,
	.dashboard-row:focus-visible {
		outline: 2px solid var(--fx-blue);
		outline-offset: 2px;
	}
	.dashboard-row:hover td {
		background: rgb(37 99 235 / 0.04);
	}
	.recent-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		color: var(--fx-muted);
	}
	.recent-table th {
		padding: 2px 10px 6px 0;
		text-align: left;
		font-size: 10.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}
	.recent-table td {
		border-top: 1px solid var(--fx-border);
		padding: 7px 10px 7px 0;
		white-space: nowrap;
	}

	/* Chiffres clés compacts : 2 par ligne sur téléphone, 4 sur ordinateur. */
	.stat-tile {
		display: block;
		min-width: 0;
		border: 1px solid var(--fx-border);
		border-radius: 14px;
		background: var(--fx-surface);
		padding: 12px 14px;
		box-shadow: var(--fx-shadow-soft);
	}
	.stat-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		font-weight: 600;
		color: var(--fx-muted);
	}
	.stat-value {
		margin-top: 4px;
		font-size: clamp(1.15rem, 2.2vw, 1.5rem);
		font-weight: 800;
		line-height: 1.15;
		color: var(--fx-text);
		white-space: nowrap;
	}
	.stat-detail {
		margin-top: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 11.5px;
		font-weight: 650;
		color: var(--fx-blue);
	}

	/* Panneaux du bas, resserrés. */
	.dash-panel {
		border-radius: 16px;
		padding: 14px 16px;
	}
	.dash-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--fx-text);
	}
	.dash-sub {
		margin-top: 2px;
		font-size: 11.5px;
		color: var(--fx-muted);
	}
	.rate-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}
	.rate-table th {
		padding: 2px 0 4px;
		text-align: left;
		font-size: 10.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--fx-muted);
	}
	.rate-table td {
		border-top: 1px solid var(--fx-border);
		padding: 7px 0;
	}
	/* Cours de change : mêmes codes que les autres panneaux (texte sombre, bleu de l'app). */
	.fx-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--fx-text);
	}
	.fx-headline {
		margin-top: 4px;
		font-size: 15px;
		font-weight: 750;
		color: var(--fx-text);
		font-variant-numeric: tabular-nums;
	}
	.fx-headline-sep {
		font-weight: 500;
		color: var(--fx-muted);
	}
	.fx-chip {
		border-radius: 999px;
		background: var(--fx-surface-muted);
		border: 1px solid var(--fx-border-soft);
		padding: 1px 8px;
		font-size: 11px;
		font-weight: 600;
		color: var(--fx-muted);
	}
	.fx-flag {
		height: 14px;
		width: 21px;
		flex-shrink: 0;
		border-radius: 2px;
		object-fit: cover;
		box-shadow: 0 0 0 1px rgb(15 23 42 / 0.1);
	}
	.fx-convert-btn {
		display: block;
		width: 100%;
		border-radius: var(--fx-radius);
		border: 1px solid var(--fx-blue);
		background: var(--fx-blue);
		padding: 7px 12px;
		font-size: 13px;
		font-weight: 650;
		color: #fff;
		transition: background 0.15s;
	}
	.fx-convert-btn:hover {
		background: var(--fx-blue-dark);
		border-color: var(--fx-blue-dark);
	}
	.fx-convert-btn[aria-expanded='true'] {
		background: transparent;
		color: var(--fx-blue);
	}
	.fx-more {
		font-size: 12px;
		font-weight: 600;
		color: var(--fx-blue);
	}
	.fx-more:hover {
		text-decoration: underline;
	}
	.alert-badge {
		padding: 1px 8px;
		font-size: 10.5px;
	}
	:global(:root[data-theme='dark']) .rate-table td {
		color: var(--fx-text);
	}
	.dashboard-bar {
		background: linear-gradient(180deg, var(--fx-blue), rgb(37 99 235 / 0.55));
		transition: height 0.4s ease;
	}
</style>
