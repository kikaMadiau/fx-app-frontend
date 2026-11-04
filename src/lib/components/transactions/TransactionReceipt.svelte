<script lang="ts">
	import type { CreatedTransaction } from '$lib/types/transaction.js';
	import { formatDate } from '$lib/utils/dates.js';
	import { formatNumber } from '$lib/utils/labels.js';

	// Bordereau remis au client : même rendu à l'écran et à l'impression (A5).
	// Volontairement limité à ce qui concerne le client : pas de niveau de risque ni de données internes.
	let {
		transaction,
		bureau,
		cashierName
	}: {
		transaction: CreatedTransaction;
		bureau: { name: string; address: string; phone: string; agrement: string; logo?: string };
		cashierName: string;
	} = $props();

	const r = $derived(transaction.receipt);
	const isSale = $derived(r?.type === 'SELL');
	const reference = $derived(transaction.id.padStart(6, '0'));
	let bureauLogoOk = $state(true);
	let bccLogoOk = $state(true);

	const money = (value: number, currency: string) =>
		`${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
			.format(value)
			.replace(/ | /g, ' ')} ${currency}`;
</script>

<article class="receipt" data-testid="receipt">
	<header class="receipt-header">
		<div class="flex items-center gap-3">
			{#if bureau.logo && bureauLogoOk}
				<img
					src={bureau.logo}
					alt=""
					class="receipt-logo"
					onerror={() => (bureauLogoOk = false)}
				/>
			{/if}
			<div>
				<p class="receipt-bureau">{bureau.name}</p>
				{#if bureau.address}<p class="receipt-muted">{bureau.address}</p>{/if}
				{#if bureau.phone}<p class="receipt-muted">Tél. {bureau.phone}</p>{/if}
			</div>
		</div>
		{#if bccLogoOk}
			<img
				src="/branding/logo-bcc.png"
				alt="Banque Centrale du Congo"
				class="receipt-logo"
				onerror={() => (bccLogoOk = false)}
			/>
		{/if}
	</header>
	<p class="receipt-agrement">
		Bureau de change agréé par la Banque Centrale du Congo{bureau.agrement
			? ` — Agrément n° ${bureau.agrement}`
			: ''}
	</p>

	<div class="receipt-title">
		<h3>{isSale ? 'Bordereau de vente de devises' : "Bordereau d'achat de devises"}</h3>
		<div class="text-right">
			<p class="font-semibold">N° {reference}</p>
			<p class="receipt-muted">
				{r ? formatDate(r.createdAt, { withTime: true }) : transaction.date}
			</p>
		</div>
	</div>

	{#if r?.status === 'CANCELLED'}
		<p class="receipt-cancelled">Opération annulée</p>
	{:else if r?.status === 'PENDING'}
		<p class="receipt-pending">Opération en attente de validation</p>
	{/if}

	<section class="receipt-section">
		<h4>Client</h4>
		<dl class="receipt-grid">
			<dt>Nom</dt>
			<dd>{transaction.client}</dd>
			<dt>Téléphone</dt>
			<dd>{transaction.clientPhone || '—'}</dd>
			<dt>Pièce d'identité</dt>
			<dd>
				{transaction.identityDocumentType || '—'}{transaction.identityDocumentNumber
					? ` n° ${transaction.identityDocumentNumber}`
					: ''}
			</dd>
		</dl>
	</section>

	{#if r}
		<section class="receipt-section">
			<h4>Opération</h4>
			<table class="receipt-table">
				<thead>
					<tr>
						<th>Devise</th>
						<th>Montant</th>
						<th>Taux (CDF)</th>
						<th>Contre-valeur</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>{r.currency}</td>
						<td>{money(r.amount, r.currency)}</td>
						<td>{formatNumber(r.rate)}</td>
						<td>{money(r.counterValue, 'CDF')}</td>
					</tr>
				</tbody>
			</table>
			<div class="receipt-totals">
				<div>
					<span>Reçu du client</span>
					<strong data-testid="receipt-received">
						{isSale ? money(r.counterValue, 'CDF') : money(r.amount, r.currency)}
					</strong>
				</div>
				<div class="receipt-total-main">
					<span>Remis au client</span>
					<strong data-testid="receipt-given">
						{isSale ? money(r.amount, r.currency) : money(r.counterValue, 'CDF')}
					</strong>
				</div>
			</div>
		</section>
	{/if}

	<p class="receipt-muted mt-3">Caissier : {cashierName}</p>

	<div class="receipt-signatures">
		<div>Signature du client</div>
		<div>Signature et cachet du bureau</div>
	</div>

	<footer class="receipt-footer">
		Vérifiez vos billets avant de quitter le guichet. Document à conserver.
	</footer>
</article>

<style>
	.receipt {
		color: #0f172a;
		font-size: 13px;
		line-height: 1.45;
	}
	.receipt-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.receipt-logo {
		height: 52px;
		width: auto;
		object-fit: contain;
	}
	.receipt-bureau {
		font-size: 16px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}
	.receipt-muted {
		color: #64748b;
		font-size: 12px;
	}
	.receipt-agrement {
		margin-top: 10px;
		padding-bottom: 10px;
		border-bottom: 2px solid #0f172a;
		font-size: 11px;
		color: #334155;
	}
	.receipt-title {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-top: 14px;
	}
	.receipt-title h3 {
		font-size: 15px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.receipt-pending,
	.receipt-cancelled {
		margin-top: 10px;
		border-radius: 6px;
		padding: 6px 10px;
		font-size: 12px;
		font-weight: 600;
	}
	.receipt-pending {
		background: #fffbeb;
		color: #92400e;
	}
	.receipt-cancelled {
		background: #fef2f2;
		color: #b91c1c;
		text-transform: uppercase;
	}
	.receipt-section {
		margin-top: 16px;
	}
	.receipt-section h4 {
		margin-bottom: 6px;
		font-size: 11px;
		font-weight: 700;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.receipt-grid {
		display: grid;
		grid-template-columns: 130px 1fr;
		gap: 4px 12px;
	}
	.receipt-grid dt {
		color: #64748b;
	}
	.receipt-grid dd {
		font-weight: 600;
	}
	.receipt-table {
		width: 100%;
		border-collapse: collapse;
	}
	.receipt-table th,
	.receipt-table td {
		border: 1px solid #cbd5e1;
		padding: 6px 8px;
		text-align: right;
		white-space: nowrap;
	}
	.receipt-table th:first-child,
	.receipt-table td:first-child {
		text-align: left;
	}
	.receipt-table th {
		background: #f1f5f9;
		font-size: 11px;
		font-weight: 600;
		color: #475569;
	}
	.receipt-totals {
		margin-top: 10px;
		margin-left: auto;
		max-width: 320px;
	}
	.receipt-totals div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 4px 0;
	}
	.receipt-total-main {
		border-top: 1px solid #0f172a;
		font-size: 15px;
	}
	.receipt-signatures {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 32px;
		margin-top: 40px;
		font-size: 12px;
		color: #475569;
	}
	.receipt-signatures div {
		border-top: 1px solid #94a3b8;
		padding-top: 6px;
	}
	.receipt-footer {
		margin-top: 20px;
		border-top: 1px dashed #cbd5e1;
		padding-top: 8px;
		text-align: center;
		font-size: 11px;
		color: #64748b;
	}
	@media (max-width: 480px) {
		.receipt-table th,
		.receipt-table td {
			padding: 5px 4px;
			font-size: 11px;
		}
		.receipt-grid {
			grid-template-columns: 110px 1fr;
		}
	}
</style>
