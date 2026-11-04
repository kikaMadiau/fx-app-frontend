<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import {
		downloadFile,
		getActivityReport,
		getComplianceReport,
		localToday,
		PERIOD_PRESETS,
		presetRange,
		toCsv,
		type ActivityReport,
		type ComplianceReport,
		type PeriodPreset
	} from '$lib/api/reports.js';
	import { preferences } from '$lib/stores/preferences.js';
	import { session } from '$lib/stores/session.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import { bureauFromEnv, loadBureau, personName, type Bureau } from '$lib/utils/bureau.js';
	import { formatDate } from '$lib/utils/dates.js';
	import { fromApiIdType } from '$lib/utils/identity.js';
	import {
		alertLabel,
		alertReason,
		alertStatus,
		formatMoney,
		formatNumber,
		kycStatus,
		riskLevel,
		transactionStatus,
		transactionTypeLabel
	} from '$lib/utils/labels.js';

	type ReportKind = 'journal' | 'summary' | 'compliance';

	const REPORTS: { kind: ReportKind; title: string; description: string; icon: string }[] = [
		{
			kind: 'journal',
			title: 'Journal des opérations',
			description: 'Toutes les opérations de la période, une ligne par transaction.',
			icon: 'M4 6h16M4 12h16M4 18h10'
		},
		{
			kind: 'summary',
			title: 'Synthèse de la période',
			description: 'Achats, ventes et position nette par devise, par jour et par cambiste.',
			icon: 'M4 19V9m6 10V5m6 14v-7m4 7H2'
		},
		{
			kind: 'compliance',
			title: 'Conformité & KYC',
			description: 'Dossiers clients, alertes et opérations importantes de la période.',
			icon: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z'
		}
	];

	let kind = $state<ReportKind>('journal');
	let preset = $state<PeriodPreset>('today');
	let from = $state('');
	let to = $state('');
	let activity = $state<ActivityReport | null>(null);
	let compliance = $state<ComplianceReport | null>(null);
	let loading = $state(false);
	let error = $state('');
	let generatedAt = $state<Date | null>(null);
	let bureau = $state<Bureau>(bureauFromEnv());
	let bccLogoOk = $state(true);
	let bureauLogoOk = $state(true);

	const isTrader = $derived($session?.trader.role === 'TRADER');
	const current = $derived(REPORTS.find((r) => r.kind === kind)!);

	function today() {
		return localToday(get(preferences).timezone);
	}

	function applyPreset(value: PeriodPreset) {
		preset = value;
		if (value !== 'custom') ({ from, to } = presetRange(value, today()));
		load();
	}

	async function load() {
		if (!from || !to) return;
		if (to < from) {
			error = 'La date de fin doit être postérieure à la date de début.';
			return;
		}
		loading = true;
		error = '';
		try {
			if (kind === 'compliance') compliance = await getComplianceReport(from, to);
			else activity = await getActivityReport(from, to);
			generatedAt = new Date();
		} catch (e) {
			error = /one year/.test(String((e as Error)?.message))
				? 'La période ne peut pas dépasser un an.'
				: getUserFacingErrorMessage(e);
		} finally {
			loading = false;
		}
	}

	function selectReport(value: ReportKind) {
		kind = value;
		load();
	}

	onMount(() => {
		({ from, to } = presetRange('today', today()));
		loadBureau().then((b) => (bureau = b));
		load();
	});

	const periodLabel = $derived(
		from === to
			? `Journée du ${formatDate(`${from}T12:00:00Z`)}`
			: `Du ${formatDate(`${from}T12:00:00Z`)} au ${formatDate(`${to}T12:00:00Z`)}`
	);

	const totalsByCurrency = $derived(activity?.by_currency ?? []);
	const kycOrder = [
		'VERIFIED',
		'ENHANCED_VERIFICATION',
		'PARTIALLY_VERIFIED',
		'UNVERIFIED',
		'NONE'
	];
	const alertStatusOrder = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'FALSE_POSITIVE'];
	const levelOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE'];

	const dt = (value: string) => formatDate(value, { withTime: true });
	const day = (isoDate: string) => formatDate(`${isoDate}T12:00:00Z`);
	const piece = (type: string, number: string) =>
		[type ? fromApiIdType(type) : '', number].filter(Boolean).join(' n° ') || '—';

	// --- Exports ------------------------------------------------------------------

	function exportExcel() {
		const name = `rapport-${kind}-${from}${from === to ? '' : `_${to}`}.csv`;
		const intro = { header: [current.title, bureau.name, periodLabel], rows: [] };
		if (kind === 'journal' && activity) {
			downloadFile(
				name,
				toCsv([
					intro,
					{
						header: [
							'N°',
							'Date',
							'Client',
							'Pièce',
							'Opération',
							'Devise',
							'Montant',
							'Taux',
							'Contre-valeur CDF',
							'Statut',
							'Caissier'
						],
						rows: activity.transactions.map((t) => [
							t.id,
							dt(t.created_at),
							t.customer_name,
							piece(t.id_type, t.id_number),
							transactionTypeLabel(t.type),
							t.currency,
							t.amount,
							t.rate,
							t.counter_value,
							transactionStatus(t.status).label,
							t.trader_name
						])
					}
				])
			);
		} else if (kind === 'summary' && activity) {
			downloadFile(
				name,
				toCsv([
					intro,
					{
						title: 'Par devise',
						header: [
							'Devise',
							'Achats (nb)',
							'Montant acheté',
							'Taux moyen achat',
							'CDF versés',
							'Ventes (nb)',
							'Montant vendu',
							'Taux moyen vente',
							'CDF reçus',
							'Position nette'
						],
						rows: activity.by_currency.map((c) => [
							c.currency,
							c.buy_count,
							c.buy_amount,
							c.buy_avg_rate,
							c.buy_cdf,
							c.sell_count,
							c.sell_amount,
							c.sell_avg_rate,
							c.sell_cdf,
							c.net_amount
						])
					},
					{
						title: 'Par jour',
						header: ['Date', 'Opérations', 'Achats (CDF)', 'Ventes (CDF)'],
						rows: activity.by_day.map((d) => [day(d.date), d.count, d.buy_cdf, d.sell_cdf])
					},
					{
						title: 'Par cambiste',
						header: ['Cambiste', 'Opérations', 'Contre-valeur CDF'],
						rows: activity.by_trader.map((t) => [t.name, t.count, t.counter_value])
					}
				])
			);
		} else if (kind === 'compliance' && compliance) {
			const c = compliance;
			downloadFile(
				name,
				toCsv([
					intro,
					{
						title: 'Indicateurs',
						header: ['Indicateur', 'Valeur'],
						rows: [
							['Clients enregistrés', c.customers_total],
							['Nouveaux clients sur la période', c.new_customers],
							["Clients sans photo de pièce d'identité", c.missing_id_photo],
							['Alertes créées', c.alerts_created],
							['Alertes clôturées', c.alerts_closed]
						]
					},
					{
						title: 'Statut KYC des clients',
						header: ['Statut', 'Clients'],
						rows: kycOrder
							.filter((k) => c.kyc[k])
							.map((k) => [kycStatus(k === 'NONE' ? '' : k).label, c.kyc[k]])
					},
					{
						title: `Opérations importantes (≥ ${formatNumber(c.large_threshold_usd)} USD ou équivalent)`,
						header: [
							'N°',
							'Date',
							'Client',
							'Pièce',
							'Opération',
							'Devise',
							'Montant',
							'Contre-valeur CDF',
							'Caissier'
						],
						rows: c.large_transactions.map((t) => [
							t.id,
							dt(t.created_at),
							t.customer_name,
							piece(t.id_type, t.id_number),
							transactionTypeLabel(t.type),
							t.currency,
							t.amount,
							t.counter_value,
							t.trader_name
						])
					},
					{
						title: 'Alertes de la période',
						header: ['N°', 'Date', 'Client', 'Motif', 'Détail', 'Niveau', 'Statut'],
						rows: c.alerts.map((a) => [
							a.id,
							dt(a.created_at),
							a.customer_name,
							alertLabel(a.flag),
							alertReason(a.reason),
							riskLevel(a.level).label,
							alertStatus(a.status).label
						])
					}
				])
			);
		}
	}

	function printReport() {
		window.print();
	}

	// Pendant l'impression (bouton ou Ctrl+P), le document passe directement dans <body> :
	// tout le reste de l'application est retiré, sans pages blanches. Il revient ensuite à sa place.
	function printable(node: HTMLElement) {
		const placeholder = document.createComment('rapport');
		const before = () => {
			node.replaceWith(placeholder);
			document.body.appendChild(node);
			document.body.classList.add('printing-report');
		};
		const after = () => {
			if (placeholder.parentNode) placeholder.replaceWith(node);
			document.body.classList.remove('printing-report');
		};
		window.addEventListener('beforeprint', before);
		window.addEventListener('afterprint', after);
		return {
			destroy() {
				window.removeEventListener('beforeprint', before);
				window.removeEventListener('afterprint', after);
				after();
			}
		};
	}

	// Le journal (tableau large) s'imprime en paysage, les autres rapports en portrait.
	$effect(() => {
		const style = document.createElement('style');
		style.textContent = `@media print { @page { size: A4 ${kind === 'journal' ? 'landscape' : 'portrait'}; margin: 12mm; } }`;
		document.head.appendChild(style);
		return () => style.remove();
	});

	const hasData = $derived(kind === 'compliance' ? compliance !== null : activity !== null);
</script>

<section class="app-shell reports-screen">
	<div class="app-header">
		<div>
			<h1 class="app-title">Rapports</h1>
			<p class="app-subtitle">Rapports calculés sur les données réelles, à imprimer ou exporter.</p>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-3" role="tablist" aria-label="Type de rapport">
		{#each REPORTS as report (report.kind)}
			<button
				role="tab"
				aria-selected={kind === report.kind}
				class="report-choice app-card p-5 text-left {kind === report.kind ? 'is-active' : ''}"
				onclick={() => selectReport(report.kind)}
				data-testid="report-{report.kind}"
			>
				<div class="flex items-center gap-3">
					<span class="report-icon">
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d={report.icon}
							/>
						</svg>
					</span>
					<h2 class="font-semibold text-slate-950">{report.title}</h2>
				</div>
				<p class="mt-2 text-sm text-slate-500">{report.description}</p>
			</button>
		{/each}
	</div>

	<div class="app-card mt-5 p-4">
		<div class="flex flex-wrap items-end gap-3">
			<div class="flex flex-wrap gap-2" aria-label="Période">
				{#each PERIOD_PRESETS as p (p.value)}
					<button
						class="rounded-full border px-3 py-1.5 text-sm font-semibold transition {preset ===
						p.value
							? 'border-blue-600 bg-blue-600 text-white'
							: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}"
						onclick={() => (p.value === 'custom' ? (preset = 'custom') : applyPreset(p.value))}
						data-testid="preset-{p.value}"
					>
						{p.label}
					</button>
				{/each}
			</div>
			<div class="flex flex-wrap items-end gap-2">
				<label class="text-xs font-semibold text-slate-500">
					Du
					<input
						type="date"
						class="app-input mt-1 py-2"
						bind:value={from}
						max={to}
						onchange={() => ((preset = 'custom'), load())}
						data-testid="date-from"
					/>
				</label>
				<label class="text-xs font-semibold text-slate-500">
					Au
					<input
						type="date"
						class="app-input mt-1 py-2"
						bind:value={to}
						min={from}
						onchange={() => ((preset = 'custom'), load())}
						data-testid="date-to"
					/>
				</label>
			</div>
			<div class="ml-auto flex gap-2">
				<button
					class="app-button app-button-secondary px-4 py-2"
					disabled={!hasData || loading}
					onclick={exportExcel}
					data-testid="export-excel"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4"
						/>
					</svg>
					Excel
				</button>
				<button
					class="app-button app-button-primary px-4 py-2"
					disabled={!hasData || loading}
					onclick={printReport}
					data-testid="print-report"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"
						/>
					</svg>
					Imprimer / PDF
				</button>
			</div>
		</div>
		{#if error}
			<p class="mt-3 text-sm text-red-600" role="alert">{error}</p>
		{/if}
	</div>

	<div class="report-print-area" use:printable>
		<article class="report-paper" class:is-loading={loading} data-testid="report-document">
			<header class="doc-header">
				<div class="flex items-center gap-3">
					{#if bureau.logo && bureauLogoOk}
						<img
							src={bureau.logo}
							alt=""
							class="doc-logo"
							onerror={() => (bureauLogoOk = false)}
						/>
					{/if}
					<div>
						<p class="doc-bureau">{bureau.name}</p>
						{#if bureau.address}<p class="doc-muted">{bureau.address}</p>{/if}
						{#if bureau.phone}<p class="doc-muted">Tél. {bureau.phone}</p>{/if}
					</div>
				</div>
				{#if bccLogoOk}
					<img
						src="/branding/logo-bcc.png"
						alt="Banque Centrale du Congo"
						class="doc-logo"
						onerror={() => (bccLogoOk = false)}
						data-testid="bcc-logo"
					/>
				{/if}
			</header>
			<p class="doc-agrement">
				Bureau de change agréé par la Banque Centrale du Congo{bureau.agrement
					? ` — Agrément n° ${bureau.agrement}`
					: ''}
			</p>

			<div class="doc-title">
				<div>
					<h2 data-testid="report-title">{current.title}</h2>
					<p class="doc-period" data-testid="report-period">{periodLabel}</p>
				</div>
				<p class="doc-muted text-right">
					Édité le {generatedAt ? formatDate(generatedAt, { withTime: true }) : '…'}<br />
					par {personName($session?.trader)}{isTrader
						? ' — opérations de ce cambiste uniquement'
						: ''}
				</p>
			</div>

			{#if loading && !hasData}
				<p class="doc-empty">Calcul du rapport…</p>
			{:else if kind !== 'compliance' && activity}
				{@const a = activity}
				<div class="doc-kpis">
					<div>
						<span>Opérations</span><strong data-testid="kpi-count">{formatNumber(a.count)}</strong>
					</div>
					<div><span>Clients servis</span><strong>{formatNumber(a.customers)}</strong></div>
					<div>
						<span>Contre-valeur totale</span><strong
							>{formatMoney(Math.round(a.counter_value), 'CDF')}</strong
						>
					</div>
					<div><span>En attente</span><strong>{formatNumber(a.pending_count)}</strong></div>
					<div><span>Annulées</span><strong>{formatNumber(a.cancelled_count)}</strong></div>
				</div>

				{#if a.count === 0 && a.cancelled_count === 0}
					<p class="doc-empty">Aucune opération sur cette période.</p>
				{:else if kind === 'journal'}
					<h3>Détail des opérations</h3>
					<div class="doc-table-wrap">
						<table class="doc-table" data-testid="journal-table">
							<thead>
								<tr>
									<th>N°</th>
									<th>Date</th>
									<th>Client</th>
									<th>Pièce</th>
									<th>Opération</th>
									<th class="num">Montant</th>
									<th class="num">Taux</th>
									<th class="num">Contre-valeur</th>
									<th>Statut</th>
									<th>Caissier</th>
								</tr>
							</thead>
							<tbody>
								{#each a.transactions as t (t.id)}
									<tr class:is-cancelled={t.status === 'CANCELLED'}>
										<td>{t.id}</td>
										<td class="nowrap">{dt(t.created_at)}</td>
										<td>{t.customer_name}</td>
										<td>{piece(t.id_type, t.id_number)}</td>
										<td class="nowrap">{transactionTypeLabel(t.type)} {t.currency}</td>
										<td class="num">{formatMoney(t.amount, t.currency)}</td>
										<td class="num">{formatNumber(t.rate)}</td>
										<td class="num">{formatMoney(Math.round(t.counter_value), 'CDF')}</td>
										<td class="nowrap">{transactionStatus(t.status).label}</td>
										<td>{t.trader_name}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					{#if a.truncated}
						<p class="doc-muted mt-2">
							Seules les 5 000 premières opérations sont listées : réduisez la période.
						</p>
					{/if}
					<h3>Totaux par devise</h3>
					<div class="doc-table-wrap">
						<table class="doc-table">
							<thead>
								<tr
									><th>Devise</th><th class="num">Acheté</th><th class="num">CDF versés</th><th
										class="num">Vendu</th
									><th class="num">CDF reçus</th><th class="num">Position nette</th></tr
								>
							</thead>
							<tbody>
								{#each totalsByCurrency as c (c.currency)}
									<tr>
										<td>{c.currency}</td>
										<td class="num">{formatMoney(c.buy_amount, c.currency)}</td>
										<td class="num">{formatMoney(Math.round(c.buy_cdf), 'CDF')}</td>
										<td class="num">{formatMoney(c.sell_amount, c.currency)}</td>
										<td class="num">{formatMoney(Math.round(c.sell_cdf), 'CDF')}</td>
										<td class="num"
											><strong
												>{c.net_amount > 0 ? '+' : ''}{formatMoney(
													c.net_amount,
													c.currency
												)}</strong
											></td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<h3>Par devise</h3>
					<div class="doc-table-wrap">
						<table class="doc-table" data-testid="summary-currency">
							<thead>
								<tr>
									<th rowspan="2">Devise</th>
									<th colspan="3" class="center">Achats au client</th>
									<th colspan="3" class="center">Ventes au client</th>
									<th rowspan="2" class="num">Position nette</th>
								</tr>
								<tr>
									<th class="num">Nb</th><th class="num">Montant</th><th class="num">Taux moyen</th>
									<th class="num">Nb</th><th class="num">Montant</th><th class="num">Taux moyen</th>
								</tr>
							</thead>
							<tbody>
								{#each a.by_currency as c (c.currency)}
									<tr>
										<td>{c.currency}</td>
										<td class="num">{c.buy_count}</td>
										<td class="num">{formatMoney(c.buy_amount, c.currency)}</td>
										<td class="num"
											>{c.buy_count
												? formatNumber(Math.round(c.buy_avg_rate * 100) / 100)
												: '—'}</td
										>
										<td class="num">{c.sell_count}</td>
										<td class="num">{formatMoney(c.sell_amount, c.currency)}</td>
										<td class="num"
											>{c.sell_count
												? formatNumber(Math.round(c.sell_avg_rate * 100) / 100)
												: '—'}</td
										>
										<td class="num"
											><strong
												>{c.net_amount > 0 ? '+' : ''}{formatMoney(
													c.net_amount,
													c.currency
												)}</strong
											></td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<p class="doc-muted mt-1">
						Position nette : devise achetée moins devise vendue sur la période. Taux moyens pondérés
						par les montants.
					</p>

					<div class="doc-two">
						<div>
							<h3>Par jour</h3>
							<table class="doc-table" data-testid="summary-days">
								<thead
									><tr
										><th>Date</th><th class="num">Opérations</th><th class="num">Achats (CDF)</th
										><th class="num">Ventes (CDF)</th></tr
									></thead
								>
								<tbody>
									{#each a.by_day as d (d.date)}
										<tr>
											<td>{day(d.date)}</td>
											<td class="num">{d.count}</td>
											<td class="num">{formatMoney(Math.round(d.buy_cdf), 'CDF')}</td>
											<td class="num">{formatMoney(Math.round(d.sell_cdf), 'CDF')}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<div>
							<h3>Par cambiste</h3>
							<table class="doc-table" data-testid="summary-traders">
								<thead
									><tr
										><th>Cambiste</th><th class="num">Opérations</th><th class="num"
											>Contre-valeur</th
										></tr
									></thead
								>
								<tbody>
									{#each a.by_trader as t (t.trader_id)}
										<tr>
											<td>{t.name}</td>
											<td class="num">{t.count}</td>
											<td class="num">{formatMoney(Math.round(t.counter_value), 'CDF')}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}
			{:else if kind === 'compliance' && compliance}
				{@const c = compliance}
				<div class="doc-kpis">
					<div>
						<span>Clients enregistrés</span><strong>{formatNumber(c.customers_total)}</strong>
					</div>
					<div><span>Nouveaux clients</span><strong>{formatNumber(c.new_customers)}</strong></div>
					<div>
						<span>Sans photo de pièce</span><strong data-testid="kpi-missing-photo"
							>{formatNumber(c.missing_id_photo)}</strong
						>
					</div>
					<div>
						<span>Alertes créées</span><strong data-testid="kpi-alerts"
							>{formatNumber(c.alerts_created)}</strong
						>
					</div>
					<div><span>Alertes clôturées</span><strong>{formatNumber(c.alerts_closed)}</strong></div>
				</div>

				<div class="doc-two">
					<div>
						<h3>Statut KYC des clients</h3>
						<table class="doc-table" data-testid="compliance-kyc">
							<thead
								><tr><th>Statut</th><th class="num">Clients</th><th class="num">Part</th></tr
								></thead
							>
							<tbody>
								{#each kycOrder.filter((k) => c.kyc[k]) as k (k)}
									<tr>
										<td>{kycStatus(k === 'NONE' ? '' : k).label}</td>
										<td class="num">{c.kyc[k]}</td>
										<td class="num"
											>{Math.round((c.kyc[k] / Math.max(1, c.customers_total)) * 100)} %</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
					<div>
						<h3>Alertes de la période</h3>
						<table class="doc-table">
							<thead
								><tr
									><th>Statut</th><th class="num">Nb</th><th>Niveau</th><th class="num">Nb</th></tr
								></thead
							>
							<tbody>
								{#each Array.from( { length: Math.max(alertStatusOrder.length, levelOrder.filter((l) => c.alerts_by_level[l]).length) } ) as _, i (i)}
									{@const s = alertStatusOrder[i]}
									{@const l = levelOrder.filter((x) => c.alerts_by_level[x])[i]}
									<tr>
										<td>{s ? alertStatus(s).label : ''}</td>
										<td class="num">{s ? (c.alerts_by_status[s] ?? 0) : ''}</td>
										<td>{l ? riskLevel(l === 'NONE' ? '' : l).label : ''}</td>
										<td class="num">{l ? c.alerts_by_level[l] : ''}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<h3>
					Opérations importantes (≥ {formatNumber(c.large_threshold_usd)} USD ou équivalent, soit {formatMoney(
						c.large_threshold_cdf,
						'CDF'
					)})
				</h3>
				{#if c.large_transactions.length}
					<div class="doc-table-wrap">
						<table class="doc-table" data-testid="compliance-large">
							<thead
								><tr
									><th>N°</th><th>Date</th><th>Client</th><th>Pièce</th><th>Opération</th><th
										class="num">Montant</th
									><th class="num">Contre-valeur</th><th>Caissier</th></tr
								></thead
							>
							<tbody>
								{#each c.large_transactions as t (t.id)}
									<tr>
										<td>{t.id}</td>
										<td class="nowrap">{dt(t.created_at)}</td>
										<td>{t.customer_name}</td>
										<td>{piece(t.id_type, t.id_number)}</td>
										<td class="nowrap">{transactionTypeLabel(t.type)} {t.currency}</td>
										<td class="num">{formatMoney(t.amount, t.currency)}</td>
										<td class="num">{formatMoney(Math.round(t.counter_value), 'CDF')}</td>
										<td>{t.trader_name}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="doc-muted">Aucune opération au-dessus du seuil sur cette période.</p>
				{/if}

				<h3>Liste des alertes</h3>
				{#if c.alerts.length}
					<div class="doc-table-wrap">
						<table class="doc-table" data-testid="compliance-alerts">
							<thead
								><tr
									><th>N°</th><th>Date</th><th>Client</th><th>Motif</th><th>Niveau</th><th
										>Statut</th
									></tr
								></thead
							>
							<tbody>
								{#each c.alerts as al (al.id)}
									<tr>
										<td>{al.id}</td>
										<td class="nowrap">{dt(al.created_at)}</td>
										<td>{al.customer_name}</td>
										<td
											>{alertLabel(al.flag)}<br /><span class="doc-muted"
												>{alertReason(al.reason)}</span
											></td
										>
										<td class="nowrap">{riskLevel(al.level).label}</td>
										<td class="nowrap">{alertStatus(al.status).label}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<p class="doc-muted">Aucune alerte sur cette période.</p>
				{/if}
			{/if}

			<div class="doc-signatures">
				<div>Établi par : {personName($session?.trader)}</div>
				<div>Visa du responsable</div>
			</div>
			<footer class="doc-footer">
				{bureau.name} — {current.title} — {periodLabel}. Heures exprimées en heure de {(
					$preferences.timezone ?? 'Africa/Kinshasa'
				).split('/')[1]}.
			</footer>
		</article>
	</div>
</section>

<style>
	.report-choice {
		cursor: pointer;
		border: 1px solid rgba(15, 23, 42, 0.08);
		transition:
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}
	.report-choice:hover {
		border-color: rgb(37 99 235 / 0.35);
	}
	.report-choice.is-active {
		border-color: var(--fx-blue);
		box-shadow: 0 0 0 3px rgb(37 99 235 / 0.15);
	}
	.report-icon {
		display: inline-flex;
		height: 36px;
		width: 36px;
		align-items: center;
		justify-content: center;
		border-radius: 10px;
		background: rgb(37 99 235 / 0.1);
		color: var(--fx-blue);
	}

	/* Feuille de rapport : toujours blanche, comme le papier (y compris en mode sombre). */
	.report-paper {
		margin-top: 20px;
		border-radius: 16px;
		background: #fff;
		color: #0f172a;
		padding: 32px;
		box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06);
		font-size: 12.5px;
		line-height: 1.45;
		transition: opacity 0.2s ease;
	}
	.report-paper.is-loading {
		opacity: 0.55;
	}
	.doc-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.doc-logo {
		height: 56px;
		width: auto;
		object-fit: contain;
	}
	.doc-bureau {
		font-size: 17px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.doc-muted {
		color: #64748b;
		font-size: 11.5px;
	}
	.doc-agrement {
		margin-top: 10px;
		padding-bottom: 10px;
		border-bottom: 2px solid #0f172a;
		font-size: 11px;
		color: #334155;
	}
	.doc-title {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-top: 16px;
	}
	.doc-title h2 {
		font-size: 18px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.doc-period {
		margin-top: 2px;
		font-weight: 600;
		color: #334155;
	}
	.doc-kpis {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 8px;
		margin-top: 18px;
	}
	.doc-kpis div {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		padding: 8px 10px;
	}
	.doc-kpis span {
		display: block;
		color: #64748b;
		font-size: 11px;
	}
	.doc-kpis strong {
		font-size: 15px;
	}
	.report-paper h3 {
		margin: 20px 0 6px;
		font-size: 11px;
		font-weight: 700;
		color: #475569;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.doc-table-wrap {
		overflow-x: auto;
	}
	.doc-table {
		width: 100%;
		border-collapse: collapse;
	}
	.doc-table th,
	.doc-table td {
		border: 1px solid #e2e8f0;
		padding: 5px 7px;
		text-align: left;
		vertical-align: top;
	}
	.doc-table th {
		background: #f1f5f9;
		font-size: 11px;
		font-weight: 600;
		color: #475569;
	}
	.doc-table .num {
		text-align: right;
		white-space: nowrap;
	}
	.doc-table .center {
		text-align: center;
	}
	.doc-table .nowrap {
		white-space: nowrap;
	}
	.doc-table tbody tr:nth-child(even) td {
		background: #fafbfc;
	}
	.doc-table tr.is-cancelled td {
		color: #94a3b8;
		text-decoration: line-through;
	}
	.doc-two {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}
	.doc-empty {
		margin: 28px 0;
		text-align: center;
		color: #64748b;
	}
	.doc-signatures {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 40px;
		margin-top: 40px;
		font-size: 11.5px;
		color: #475569;
	}
	.doc-signatures div {
		border-top: 1px solid #94a3b8;
		padding-top: 6px;
	}
	.doc-footer {
		margin-top: 18px;
		border-top: 1px dashed #cbd5e1;
		padding-top: 8px;
		text-align: center;
		font-size: 10.5px;
		color: #64748b;
	}

	@media (max-width: 760px) {
		.report-paper {
			padding: 18px;
		}
		.doc-kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.doc-two {
			grid-template-columns: 1fr;
		}
		.doc-logo {
			height: 40px;
		}
	}

	@media print {
		:global(body.printing-report > *:not(.report-print-area)) {
			display: none !important;
		}
		:global(html:has(body.printing-report)),
		:global(body.printing-report) {
			background: #fff !important;
		}
		.report-print-area {
			margin: 0;
			padding: 0;
			max-width: none;
		}
		.report-paper {
			margin: 0;
			padding: 0;
			border-radius: 0;
			box-shadow: none;
			opacity: 1;
		}
		.doc-table-wrap {
			overflow: visible;
		}
		.doc-table tr {
			break-inside: avoid;
		}
		.doc-table thead {
			display: table-header-group;
		}
	}
</style>
