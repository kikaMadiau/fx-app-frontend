<script lang="ts">
	type Customer = {
		id: string;
		name: string;
		phone: string;
		kyc: string;
		transactions: number;
		flagged: boolean;
		flagReason: string;
	};

	let customers = $state<Customer[]>([
		{
			id: 'CL-001',
			name: 'Jean K.',
			phone: '+243 810 000 001',
			kyc: 'Verifie',
			transactions: 18,
			flagged: false,
			flagReason: ''
		},
		{
			id: 'CL-002',
			name: 'Marie M.',
			phone: '+243 820 000 002',
			kyc: 'A completer',
			transactions: 7,
			flagged: true,
			flagReason: 'KYC incomplet'
		},
		{
			id: 'CL-003',
			name: 'Patrick N.',
			phone: '+243 990 000 003',
			kyc: 'Verifie',
			transactions: 12,
			flagged: false,
			flagReason: ''
		},
		{
			id: 'CL-004',
			name: 'Aline B.',
			phone: '+243 850 000 004',
			kyc: 'En revue',
			transactions: 4,
			flagged: true,
			flagReason: 'Transaction a verifier'
		}
	]);

	let isFlagModalOpen = $state(false);
	let selectedCustomerId = $state('');
	let flagReason = $state('KYC incomplet');

	const flagReasons = [
		'KYC incomplet',
		'Transaction a verifier',
		'Activite inhabituelle',
		'Document suspect',
		'Client sous observation'
	];

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

	function saveFlag() {
		const customer = getSelectedCustomer();

		if (customer) {
			customer.flagged = true;
			customer.flagReason = flagReason;
		}

		closeFlagModal();
	}

	function removeFlag(customer: Customer) {
		customer.flagged = false;
		customer.flagReason = '';
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
								<span class="font-semibold text-slate-950">{customer.kyc}</span>
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
					onclick={saveFlag}
				>
					Confirmer
				</button>
			</div>
		</div>
	</div>
{/if}
