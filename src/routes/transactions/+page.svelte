<script lang="ts">
	import TransactionCreateModal from '$lib/components/transactions/TransactionCreateModal.svelte';
	import type { CreatedTransaction } from '$lib/types/transaction.js';

	type Transaction = CreatedTransaction;

	let isModalOpen = $state(false);
	let selectedTransaction = $state<Transaction | null>(null);

	let transactions = $state<Transaction[]>([
		{
			id: 'TX-001',
			client: 'Jean Kabamba',
			type: 'Achat USD',
			amount: '$2,450',
			rate: '2,780',
			status: 'Validee',
			date: '24 aout 2026, 09:42',
			amountGivenToClient: '6 811 000 CDF',
			currencyCounterValue: '6 811 000 CDF',
			clientPhone: '+243 810 000 001',
			identityDocumentType: "Carte d'identite",
			identityDocumentNumber: 'ID-243-001245'
		},
		{
			id: 'TX-002',
			client: 'Marie Mbala',
			type: 'Vente EUR',
			amount: 'EUR 8,200',
			rate: '3,020',
			status: 'A verifier',
			date: '24 aout 2026, 11:15',
			amountGivenToClient: 'EUR 8,200',
			currencyCounterValue: '24 764 000 CDF',
			clientPhone: '+243 820 000 002',
			identityDocumentType: 'Passeport',
			identityDocumentNumber: 'PA-1029384'
		},
		{
			id: 'TX-003',
			client: 'Patrick Ngoy',
			type: 'Achat USD',
			amount: '$1,180',
			rate: '2,775',
			status: 'En cours',
			date: '24 aout 2026, 13:04',
			amountGivenToClient: '3 274 500 CDF',
			currencyCounterValue: '3 274 500 CDF',
			clientPhone: '+243 990 000 003',
			identityDocumentType: "Carte d'electeur",
			identityDocumentNumber: 'CE-778899'
		},
		{
			id: 'TX-004',
			client: 'Aline Banza',
			type: 'Vente GBP',
			amount: 'GBP 3,600',
			rate: '3,510',
			status: 'Rejetee',
			date: '24 aout 2026, 15:20',
			amountGivenToClient: 'GBP 3,600',
			currencyCounterValue: '12 636 000 CDF',
			clientPhone: '+243 850 000 004',
			identityDocumentType: 'Permis de conduire',
			identityDocumentNumber: 'PC-445566'
		}
	]);

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
		transactions = [transaction, ...transactions];
		selectedTransaction = transaction;
	}

	function getStatusClass(status: string): string {
		if (status === 'Validee') {
			return 'app-badge-success';
		}

		if (status === 'A verifier') {
			return 'app-badge-warning';
		}

		if (status === 'Rejetee') {
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
			<span class="app-kicker">Operations</span>
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

	<div class="app-table-wrap">
		<table class="app-table min-w-[760px]">
			<thead>
				<tr>
					<th>Reference</th>
					<th>Client</th>
					<th>Type</th>
					<th>Montant</th>
					<th>Taux</th>
					<th>Statut</th>
				</tr>
			</thead>
			<tbody>
				{#each transactions as transaction}
					<tr
						class="cursor-pointer transition focus:bg-blue-50/60 focus:outline-none"
						tabindex="0"
						role="button"
						aria-label={`Voir les details de la transaction ${transaction.id}`}
						onclick={() => openTransactionDetails(transaction)}
						onkeydown={(event) => handleTransactionKeydown(event, transaction)}
					>
						<td class="font-semibold text-slate-950">{transaction.id}</td>
						<td>{transaction.client}</td>
						<td>{transaction.type}</td>
						<td class="font-semibold text-slate-950">{transaction.amount}</td>
						<td>{transaction.rate} CDF</td>
						<td>
							<span class={`app-badge ${getStatusClass(transaction.status)}`}
								>{transaction.status}</span
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

{#if selectedTransaction}
	<div
		class="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 sm:items-center sm:px-4 sm:py-8"
		role="presentation"
		onclick={closeTransactionDetails}
	>
		<div
			class="printable-bordereau app-modal w-full max-w-xl rounded-t-2xl sm:rounded-lg"
			role="dialog"
			aria-modal="true"
			aria-labelledby="transaction-details-title"
			tabindex="-1"
			onclick={(event) => event.stopPropagation()}
			onkeydown={(event) => event.stopPropagation()}
		>
			<div
				class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6"
			>
				<div>
					<h2 id="transaction-details-title" class="text-lg font-semibold text-slate-950">
						Bordereau de transaction
					</h2>
					<p class="mt-1 text-sm text-slate-500">{selectedTransaction.id}</p>
				</div>

				<div class="no-print flex items-center gap-2">
					<button
						class="app-button app-button-secondary px-3 py-2"
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

			<div class="space-y-6 px-5 py-5 sm:px-6">
				<div class="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3">
					<div>
						<p class="text-xs font-semibold text-slate-500 uppercase">Statut</p>
						<p class="mt-1 text-sm font-semibold text-slate-950">{selectedTransaction.status}</p>
					</div>
					<span class={`app-badge ${getStatusClass(selectedTransaction.status)}`}>
						{selectedTransaction.status}
					</span>
				</div>

				<div>
					<h3 class="text-sm font-semibold text-slate-950">Transaction</h3>
					<div class="mt-4 grid gap-4 sm:grid-cols-2">
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Reference</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">{selectedTransaction.id}</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Date de la transaction</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">
								{detailValue(selectedTransaction.date)}
							</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Type</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">{selectedTransaction.type}</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Montant</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">{selectedTransaction.amount}</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Taux applique</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">
								{selectedTransaction.rate} CDF
							</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Montant remis au client</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">
								{detailValue(selectedTransaction.amountGivenToClient)}
							</p>
						</div>
						<div class="sm:col-span-2">
							<p class="text-xs font-semibold text-slate-500 uppercase">
								Contre-valeur de la devise
							</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">
								{detailValue(selectedTransaction.currencyCounterValue)}
							</p>
						</div>
					</div>
				</div>

				<div class="border-t border-slate-100 pt-5">
					<h3 class="text-sm font-semibold text-slate-950">Client</h3>
					<div class="mt-4 grid gap-4 sm:grid-cols-2">
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Nom complet</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">{selectedTransaction.client}</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Numero de telephone</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">
								{detailValue(selectedTransaction.clientPhone)}
							</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Type de piece presentee</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">
								{detailValue(selectedTransaction.identityDocumentType)}
							</p>
						</div>
						<div>
							<p class="text-xs font-semibold text-slate-500 uppercase">Numero de la piece</p>
							<p class="mt-1 text-sm font-semibold text-slate-950">
								{detailValue(selectedTransaction.identityDocumentNumber)}
							</p>
						</div>
					</div>
				</div>

				<div class="print-signatures hidden border-t border-slate-100 pt-8">
					<div class="grid grid-cols-2 gap-10 text-sm text-slate-700">
						<div>
							<div class="mb-2 border-t border-slate-400 pt-2">Signature du client</div>
						</div>
						<div>
							<div class="mb-2 border-t border-slate-400 pt-2">Signature du caissier</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

{#if isModalOpen}
	<TransactionCreateModal onClose={closeModal} onSuccess={handleTransactionCreated} />
{/if}

<style>
	@media print {
		:global(body *) {
			visibility: hidden;
		}

		.printable-bordereau,
		.printable-bordereau * {
			visibility: visible;
		}

		.printable-bordereau {
			position: fixed;
			inset: 0;
			width: 100%;
			max-width: none;
			height: fit-content;
			border-radius: 0;
			box-shadow: none;
		}

		.no-print {
			display: none;
		}

		.print-signatures {
			display: block;
		}
	}
</style>
