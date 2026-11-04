<script lang="ts">
	import TransactionCreateModal from '$lib/components/transactions/TransactionCreateModal.svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { listTransactions } from '$lib/api/transactions.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import { riskLevel } from '$lib/utils/labels.js';
	import type { CreatedTransaction } from '$lib/types/transaction.js';
	import TransactionReceipt from '$lib/components/transactions/TransactionReceipt.svelte';
	import TransactionNotifications from '$lib/components/transactions/TransactionNotifications.svelte';
	import { getProfile } from '$lib/api/profile.js';
	import { session } from '$lib/stores/session.js';
	import { getTraderDisplayName } from '$lib/types/trader.js';
	import { env } from '$env/dynamic/public';

	type Transaction = CreatedTransaction;

	let isModalOpen = $state(false);
	let selectedTransaction = $state<Transaction | null>(null);

	let transactions = $state<Transaction[]>([]);
	let total = $state(0);
	let loading = $state(true);
	let loadError = $state('');

	const PAGE_SIZE = 20;
	let search = $state('');
	let statusFilter = $state('');
	let typeFilter = $state('');
	let customerId = $state<number | undefined>(undefined);
	let customerName = $state('');
	let offset = $state(0);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	async function loadTransactions() {
		loading = true;
		loadError = '';
		try {
			const result = await listTransactions({
				q: search,
				status: statusFilter,
				type: typeFilter,
				customerId,
				limit: PAGE_SIZE,
				offset
			});
			transactions = result.items;
			total = result.total;
			if (customerId && !customerName && result.items[0]) customerName = result.items[0].client;
		} catch (error) {
			loadError = getUserFacingErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		offset = 0;
		loadTransactions();
	}

	function onSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(applyFilters, 350);
	}

	function clearCustomerFilter() {
		customerId = undefined;
		customerName = '';
		const url = new URL(page.url);
		url.searchParams.delete('client');
		history.replaceState(history.state, '', url);
		applyFilters();
	}

	function goToPage(newOffset: number) {
		offset = Math.max(0, newOffset);
		loadTransactions();
	}

	// En-tête du bordereau : nom du bureau (profil du cambiste) et coordonnées du .env.
	let bureauName = $state('');
	const bureau = $derived({
		name: bureauName || 'Bureau de change',
		address: env.PUBLIC_RECEIPT_ADDRESS?.trim() ?? '',
		phone: env.PUBLIC_RECEIPT_PHONE?.trim() ?? '',
		agrement: env.PUBLIC_RECEIPT_BCC_AGREMENT?.trim() ?? ''
	});

	// Dans cette API, « name » est le nom du bureau du compte : le caissier est désigné
	// par son prénom et son nom.
	function cashierFor(transaction: Transaction): string {
		const me = $session?.trader;
		const traderId = transaction.receipt?.traderId;
		if (me && (!traderId || traderId === me.id)) {
			return `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim() || getTraderDisplayName(me);
		}
		return traderId ? `Agent n° ${traderId}` : '—';
	}

	// Le bordereau est placé directement dans <body> : à l'impression, tout le reste de
	// l'application est retiré (display: none) et seule la feuille du bordereau sort.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return { destroy: () => node.remove() };
	}

	onMount(() => {
		getProfile()
			.then((profile) => (bureauName = profile.exchange_office?.trim() ?? ''))
			.catch(() => {});
		const client = Number(page.url.searchParams.get('client'));
		if (Number.isInteger(client) && client > 0) customerId = client;
		search = page.url.searchParams.get('q') ?? '';
		loadTransactions();
	});

	function openModal() {
		isModalOpen = true;
	}

	function closeModal() {
		isModalOpen = false;
	}

	function openTransactionDetails(transaction: Transaction) {
		selectedTransaction = transaction;
	}

	function closeTransactionDetails() {
		selectedTransaction = null;
	}

	function handleTransactionKeydown(event: KeyboardEvent, transaction: Transaction) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openTransactionDetails(transaction);
		}
	}

	function handleDetailsKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeTransactionDetails();
		}
	}

	function handleTransactionCreated(transaction: CreatedTransaction) {
		selectedTransaction = transaction;
		// Recharge la liste depuis l'API : la nouvelle opération apparaît avec ses vraies données.
		search = '';
		statusFilter = '';
		typeFilter = '';
		applyFilters();
	}

	function getStatusClass(status: string): string {
		if (status === 'Terminée') {
			return 'app-badge-success';
		}

		if (status === 'En attente') {
			return 'app-badge-warning';
		}

		if (status === 'Annulée') {
			return 'app-badge-danger';
		}

		return 'app-badge-info';
	}

	function detailValue(value: string | undefined): string {
		return value?.trim() || '-';
	}

	function printSelectedTransaction() {
		window.print();
	}
</script>

<svelte:window onkeydown={handleDetailsKeydown} />

<section class="app-shell">
	<div class="app-header-row app-header">
		<div>
			<h1 class="app-title">Transactions</h1>
			<p class="app-subtitle">Liste des operations de change enregistrees.</p>
		</div>

		<button class="app-button app-button-primary w-full sm:w-fit" onclick={openModal}>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
			</svg>
			Nouvelle transaction
		</button>
	</div>

	<div class="mb-5 grid gap-3 md:grid-cols-[1fr_180px_160px]">
		<input
			class="app-input"
			type="search"
			placeholder="Rechercher un client (nom, téléphone) ou un n° de transaction"
			aria-label="Rechercher"
			bind:value={search}
			oninput={onSearchInput}
		/>
		<select class="app-input" aria-label="Statut" bind:value={statusFilter} onchange={applyFilters}>
			<option value="">Tous les statuts</option>
			<option value="PENDING">En attente</option>
			<option value="COMPLETED">Terminée</option>
			<option value="CANCELLED">Annulée</option>
		</select>
		<select class="app-input" aria-label="Type" bind:value={typeFilter} onchange={applyFilters}>
			<option value="">Achats et ventes</option>
			<option value="BUY">Achats</option>
			<option value="SELL">Ventes</option>
		</select>
	</div>

	{#if customerId}
		<div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
			<span class="app-badge app-badge-info" data-testid="customer-filter">
				Client : {customerName || `n° ${customerId}`}
			</span>
			<button class="font-semibold text-blue-600 hover:underline" onclick={clearCustomerFilter}>
				Voir tous les clients
			</button>
		</div>
	{/if}

	{#if loadError}
		<div
			class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
			role="alert"
		>
			<span>Impossible de charger les transactions : {loadError}</span>
			<button class="font-semibold underline" onclick={loadTransactions}>Réessayer</button>
		</div>
	{/if}

	<div class="app-table-wrap">
		<table class="app-table min-w-[860px]">
			<thead>
				<tr>
					<th>Reference</th>
					<th>Client</th>
					<th>Type</th>
					<th>Montant</th>
					<th>Taux</th>
					<th>Risque</th>
					<th>Statut</th>
					<th>Date</th>
				</tr>
			</thead>
			<tbody>
				{#each transactions as transaction (transaction.id)}
					{@const risk = riskLevel(transaction.riskLevel)}
					<tr
						class="cursor-pointer transition focus:bg-blue-50/60 focus:outline-none"
						tabindex="0"
						role="button"
						aria-label={`Voir les details de la transaction ${transaction.id}`}
						onclick={() => openTransactionDetails(transaction)}
						onkeydown={(event) => handleTransactionKeydown(event, transaction)}
						data-testid="transaction-row"
					>
						<td class="font-semibold whitespace-nowrap text-slate-950">N° {transaction.id}</td>
						<td class="whitespace-nowrap">{transaction.client}</td>
						<td class="whitespace-nowrap">{transaction.type}</td>
						<td class="font-semibold whitespace-nowrap text-slate-950">{transaction.amount}</td>
						<td class="whitespace-nowrap">{transaction.rate} CDF</td>
						<td><span class="app-badge {risk.badge} whitespace-nowrap">{risk.label}</span></td>
						<td>
							<span class={`app-badge ${getStatusClass(transaction.status)} whitespace-nowrap`}
								>{transaction.status}</span
							>
						</td>
						<td class="whitespace-nowrap">{transaction.date}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="py-10 text-center text-slate-500">
							{loading
								? 'Chargement…'
								: search || statusFilter || typeFilter || customerId
									? 'Aucune transaction ne correspond à ces critères.'
									: 'Aucune transaction enregistrée pour le moment.'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if total > 0}
		<div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
			<span data-testid="pagination-info">
				{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} sur {total} transaction{total > 1
					? 's'
					: ''}
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

{#if selectedTransaction}
	<div
		use:portal
		class="receipt-portal fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 sm:items-center sm:px-4 sm:py-8"
		role="presentation"
		onclick={closeTransactionDetails}
	>
		<div
			class="printable-bordereau app-modal max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl sm:max-h-[90dvh] sm:rounded-lg"
			role="dialog"
			aria-modal="true"
			aria-labelledby="transaction-details-title"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<div
				class="no-print flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3 sm:px-6"
			>
				<h2 id="transaction-details-title" class="text-base font-semibold text-slate-950">
					Bordereau n° {selectedTransaction.id}
				</h2>
				<div class="flex items-center gap-2">
					<button
						class="app-button app-button-primary px-3 py-2"
						aria-label="Imprimer le bordereau"
						onclick={printSelectedTransaction}
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"
							/>
						</svg>
						Imprimer
					</button>
					<button
						class="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
						aria-label="Fermer"
						onclick={closeTransactionDetails}
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<div class="receipt-paper">
				<TransactionReceipt
					transaction={selectedTransaction}
					{bureau}
					cashierName={cashierFor(selectedTransaction)}
				/>
			</div>
			<div class="no-print border-t border-slate-100 p-6">
				{#key selectedTransaction.id}
					<TransactionNotifications transactionId={selectedTransaction.id} />
				{/key}
			</div>
		</div>
	</div>
{/if}

{#if isModalOpen}
	<TransactionCreateModal onClose={closeModal} onSuccess={handleTransactionCreated} />
{/if}

<style>
	/* Le bordereau reste sur fond blanc, comme le papier, même en mode sombre. */
	.receipt-paper {
		background: #fff;
		padding: 24px;
	}

	@media print {
		@page {
			size: A5 portrait;
			margin: 10mm;
		}

		:global(body > *:not(.receipt-portal)) {
			display: none !important;
		}

		:global(html),
		:global(body) {
			height: auto !important;
			background: #fff !important;
		}

		.receipt-portal {
			position: static;
			display: block;
			padding: 0;
			background: none;
		}

		.printable-bordereau {
			max-width: none;
			max-height: none;
			overflow: visible;
			border-radius: 0;
			box-shadow: none;
			background: #fff;
		}

		.receipt-paper {
			padding: 0;
		}

		.no-print {
			display: none !important;
		}
	}
</style>
