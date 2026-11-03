<script lang="ts">
	import { onMount } from 'svelte';
	import { listCustomers } from '$lib/api/clients.js';
	import { createRiskFlag, deleteRiskFlag, listRiskFlags } from '$lib/api/risk-flags.js';
	import { ApiError } from '$lib/utils/api-errors.js';
	type Customer = {
		id: string;
		customerId: number;
		name: string;
		phone: string;
		kyc: string;
		transactions: number;
		flagged: boolean;
		flagReason: string;
	};

	let customers = $state<Customer[]>([]);
	let loading = $state(true);
	let loadError = $state('');
	onMount(async () => {
		try {
			const page = await listCustomers();
			customers = page.items.map(c => ({ id: `CL-${c.id}`, customerId: c.id, name: c.full_name, phone: c.phone,
				kyc: c.kyc_status, transactions: c.transaction_count, flagged: c.open_risk_flags > 0,
				flagReason: c.latest_flag_reason ?? '' }));
		} catch (error) { loadError = error instanceof ApiError ? error.message : 'Impossible de charger les clients.'; }
		finally { loading = false; }
	});

	let isFlagModalOpen = $state(false);
	let selectedCustomerId = $state('');
	let flagReason = $state('KYC incomplet');
	let actionError = $state('');
	let savingFlag = $state(false);

	const flagReasons = [
		'KYC incomplet',
		'Transaction a verifier',
		'Activite inhabituelle',
		'Document suspect',
		'Client sous observation'
	];
	function kycLabel(status: string) {
		return ({ VERIFIED: 'Vérifié', UNVERIFIED: 'Non vérifié', PARTIALLY_VERIFIED: 'Partiel', ENHANCED_VERIFICATION: 'Vérification renforcée' } as Record<string, string>)[status] ?? status;
	}

	function getSelectedCustomer() {
		return customers.find((customer) => customer.id === selectedCustomerId);
	}

	function openFlagModal(customer: Customer) {
		selectedCustomerId = customer.id;
		flagReason = customer.flagReason || flagReasons[0];
		isFlagModalOpen = true;
	}

	function closeFlagModal() {
		isFlagModalOpen = false;
		selectedCustomerId = '';
	}

	async function saveFlag() {
		const customer = getSelectedCustomer();

		if (customer) {
			savingFlag = true;
			actionError = '';
			try {
				await createRiskFlag(customer.customerId, flagReason);
				customer.flagged = true;
				customer.flagReason = flagReason;
				closeFlagModal();
			} catch (error) { actionError = error instanceof ApiError ? error.message : 'Impossible de créer l’alerte.'; }
			finally { savingFlag = false; }
		}
	}

	async function removeFlag(customer: Customer) {
		actionError = '';
		try {
			const flags = (await listRiskFlags()).items.filter(flag => flag.customer_id === customer.customerId && ['OPEN', 'IN_REVIEW'].includes(flag.status));
			for (const flag of flags) await deleteRiskFlag(flag.id);
			customer.flagged = false;
			customer.flagReason = '';
		} catch (error) { actionError = error instanceof ApiError ? error.message : 'Impossible de retirer la surveillance.'; }
	}
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Conformite</span>
			<h1 class="app-title">Clients & KYC</h1>
			<p class="app-subtitle">Dossiers clients, verification et surveillance.</p>
		</div>
	</div>

	<div class="app-table-wrap">
		{#if actionError}<p class="px-4 py-3 text-sm text-red-700">{actionError}</p>{/if}
		<div class="overflow-x-auto">
			<table class="app-table min-w-[760px]">
				<thead>
					<tr>
						<th>ID client</th>
						<th>Client</th>
						<th>Telephone</th>
						<th>KYC</th>
						<th>Transactions</th>
						<th>Surveillance</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if loading}<tr><td colspan="7">Chargement des clients…</td></tr>{/if}
					{#if loadError}<tr><td colspan="7" class="text-red-700">{loadError}</td></tr>{/if}
					{#if !loading && !loadError && customers.length === 0}<tr><td colspan="7">Aucun client.</td></tr>{/if}
					{#each customers as customer}
						<tr class={customer.flagged ? 'bg-red-50/40' : ''}>
							<td class="font-semibold text-slate-950">{customer.id}</td>
							<td>
								<div class="font-semibold text-slate-950">{customer.name}</div>
								{#if customer.flagged}
									<div class="mt-1 text-xs font-medium text-red-700">{customer.flagReason}</div>
								{/if}
							</td>
							<td>{customer.phone}</td>
							<td>
								<span class="font-semibold text-slate-950">{kycLabel(customer.kyc)}</span>
							</td>
							<td class="font-semibold text-slate-950">{customer.transactions}</td>
							<td>
								{#if customer.flagged}
									<span class="app-badge app-badge-danger">Flaggue</span>
								{:else}
									<span class="app-badge app-badge-success">Normal</span>
								{/if}
							</td>
							<td class="text-right">
								{#if customer.flagged}
									<button
										class="app-button app-button-secondary px-3 py-2"
										onclick={() => removeFlag(customer)}
									>
										Retirer
									</button>
								{:else}
									<button
										class="app-button app-button-danger px-3 py-2"
										onclick={() => openFlagModal(customer)}
									>
										Flaguer
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>

{#if isFlagModalOpen}
	<div class="app-modal-backdrop">
		<div
			class="app-modal max-w-md"
			role="dialog"
			aria-modal="true"
			aria-labelledby="flag-client-title"
		>
			<div class="border-b border-slate-100 px-6 py-5">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 id="flag-client-title" class="text-lg font-semibold text-slate-950">
							Flaguer le client
						</h2>
						<p class="mt-1 text-sm text-slate-500">
							{getSelectedCustomer()?.name} sera marque comme client a surveiller.
						</p>
					</div>

					<button
						class="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
						aria-label="Fermer"
						onclick={closeFlagModal}
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

			<div class="px-6 py-5">
				{#if actionError}<p class="mb-4 text-sm text-red-700">{actionError}</p>{/if}
				<label for="flagReason" class="mb-2 block text-sm font-semibold text-slate-700">
					Motif
				</label>
				<select id="flagReason" class="app-input" bind:value={flagReason}>
					{#each flagReasons as reason}
						<option>{reason}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
				<button class="app-button app-button-secondary px-4 py-2" onclick={closeFlagModal}>
					Annuler
				</button>
				<button
					class="app-button app-button-danger bg-red-600 px-4 py-2 text-white"
					disabled={savingFlag}
					onclick={saveFlag}
				>
					{savingFlag ? 'Enregistrement…' : 'Confirmer'}
				</button>
			</div>
		</div>
	</div>
{/if}
