<script lang="ts">
	import { onMount } from 'svelte';
	import { listCustomers, type CustomerSummary } from '$lib/api/clients.js';
	import { createManualAlert } from '$lib/api/alerts.js';
	import { session } from '$lib/stores/session.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import { fromApiIdType } from '$lib/utils/identity.js';
	import { formatDate } from '$lib/utils/dates.js';
	import { alertReason, kycStatus, riskLevel } from '$lib/utils/labels.js';
	import IdDocumentCapture from '$lib/components/customers/IdDocumentCapture.svelte';
	import KycDossierModal from '$lib/components/customers/KycDossierModal.svelte';
	import {
		getIdDocumentImage,
		getIdDocumentStatus,
		translateIdDocumentError,
		uploadIdDocument,
		type IdDocumentSide,
		type IdDocumentStatus
	} from '$lib/api/id-document.js';

	type Customer = CustomerSummary;

	const PAGE_SIZE = 20;
	let customers = $state<Customer[]>([]);
	let total = $state(0);
	let loading = $state(true);
	let loadError = $state('');
	let notice = $state('');

	let search = $state('');
	let kycFilter = $state('');
	let riskFilter = $state('');
	let offset = $state(0);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	// Dossier KYC ; seule la conformité valide un dossier et accorde une dérogation (kyc:verify).
	let kycCustomer = $state<Customer | null>(null);
	const canEditKyc = $derived(hasPermission('kyc:update', ['COMPLIANCE_OFFICER']));
	function hasPermission(permission: string, fallbackRoles: string[]): boolean {
		const trader = $session?.trader;
		if (!trader) return false;
		if (trader.permissions) return trader.permissions.includes(permission);

		const roles = [trader.role, ...(trader.roles ?? [])]
			.flatMap((role) => role.split(','))
			.map((role) => role.trim().toUpperCase());
		return fallbackRoles.some((role) => roles.includes(role));
	}
	const canVerifyKyc = $derived(hasPermission('kyc:validate', ['COMPLIANCE_OFFICER']));

	async function closeKycModal(changed: boolean) {
		kycCustomer = null;
		if (changed) await loadCustomers();
	}

	const canFlag = $derived(
		hasPermission('riskflag:create', ['COMPLIANCE_OFFICER'])
	);

	let isFlagModalOpen = $state(false);
	let selectedCustomer = $state<Customer | null>(null);
	let flagReason = $state('KYC incomplet');
	let flagLevel = $state('MEDIUM');
	let flagError = $state('');
	let saving = $state(false);

	const flagReasons = [
		'KYC incomplet',
		'Transaction a verifier',
		'Activite inhabituelle',
		'Document suspect',
		'Client sous observation'
	];

	const flagLevels = [
		{ value: 'LOW', label: 'Faible' },
		{ value: 'MEDIUM', label: 'Moyen' },
		{ value: 'HIGH', label: 'Élevé' },
		{ value: 'CRITICAL', label: 'Critique' }
	];

	async function loadCustomers() {
		loading = true;
		loadError = '';
		try {
			const page = await listCustomers({
				q: search,
				kycStatus: kycFilter,
				riskLevel: riskFilter,
				limit: PAGE_SIZE,
				offset
			});
			customers = page.items;
			total = page.total;
		} catch (error) {
			loadError = getUserFacingErrorMessage(error);
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		offset = 0;
		loadCustomers();
	}

	function onSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(applyFilters, 350);
	}

	function goToPage(newOffset: number) {
		offset = Math.max(0, newOffset);
		loadCustomers();
	}

	onMount(loadCustomers);

	// --- Photos de la pièce d'identité (régularisation du dossier) ---------------------
	let photoCustomer = $state<Customer | null>(null);
	let photoStatus = $state<IdDocumentStatus | null>(null);
	let photoPreviews = $state<Record<IdDocumentSide, string | null>>({ front: null, back: null });
	let photoBusy = $state<IdDocumentSide | null>(null);
	let photoError = $state('');
	let photoChanged = false;

	function setPhotoPreview(side: IdDocumentSide, blob: Blob | null) {
		if (photoPreviews[side]) URL.revokeObjectURL(photoPreviews[side]!);
		photoPreviews[side] = blob ? URL.createObjectURL(blob) : null;
	}

	async function openPhotoModal(customer: Customer) {
		photoCustomer = customer;
		photoError = '';
		photoChanged = false;
		photoStatus = null;
		try {
			photoStatus = await getIdDocumentStatus(customer.id);
			for (const side of ['front', 'back'] as const) {
				if (photoStatus[side]) setPhotoPreview(side, await getIdDocumentImage(customer.id, side));
			}
		} catch (error) {
			photoError = getUserFacingErrorMessage(error);
		}
	}

	async function closePhotoModal() {
		setPhotoPreview('front', null);
		setPhotoPreview('back', null);
		photoCustomer = null;
		if (photoChanged) await loadCustomers();
	}

	async function savePhoto(side: IdDocumentSide, photo: Blob) {
		if (!photoCustomer) return;
		photoBusy = side;
		photoError = '';
		try {
			photoStatus = await uploadIdDocument(photoCustomer.id, side, photo);
			setPhotoPreview(side, photo);
			photoChanged = true;
		} catch (error) {
			photoError = translateIdDocumentError(error);
		} finally {
			photoBusy = null;
		}
	}

	function photoBadge(customer: Customer): { label: string; badge: string } {
		if (customer.id_front_photo && customer.id_back_photo)
			return { label: 'Complète', badge: 'app-badge-success' };
		if (customer.id_front_photo || customer.id_back_photo)
			return {
				label: customer.id_front_photo ? 'Verso manquant' : 'Recto manquant',
				badge: 'app-badge-warning'
			};
		return { label: 'Manquante', badge: 'app-badge-danger' };
	}

	function openFlagModal(customer: Customer) {
		selectedCustomer = customer;
		flagReason = flagReasons[0];
		flagLevel = 'MEDIUM';
		flagError = '';
		isFlagModalOpen = true;
	}

	function closeFlagModal() {
		isFlagModalOpen = false;
		selectedCustomer = null;
	}

	// Une alerte est toujours rattachée à une transaction (contrainte de l'API) :
	// le signalement porte sur la dernière opération du client.
	async function saveFlag() {
		const customer = selectedCustomer;
		if (!customer) return;
		saving = true;
		flagError = '';
		try {
			// Numéro fourni par la liste des clients : un cambiste peut signaler un client servi
			// par un collègue, dont il ne voit pas les transactions.
			const transactionId = customer.latest_transaction_id;
			if (!transactionId) {
				flagError = "Ce client n'a encore aucune transaction : impossible de le signaler.";
				return;
			}
			await createManualAlert({
				customerId: customer.id,
				transactionId,
				reason: flagReason,
				level: flagLevel
			});
			notice = `${customer.full_name} est signalé : une alerte a été créée sur la transaction n° ${transactionId}.`;
			closeFlagModal();
			await loadCustomers();
		} catch (error) {
			flagError = getUserFacingErrorMessage(error);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key !== 'Escape') return;
		if (isFlagModalOpen) closeFlagModal();
		else if (photoCustomer) closePhotoModal();
		else if (kycCustomer) closeKycModal(true);
	}}
/>

<section class="app-shell">
	<div class="app-header">
		<div>
			<h1 class="app-title">Clients & KYC</h1>
			<p class="app-subtitle">Dossiers clients, verification et surveillance.</p>
		</div>
	</div>

	<div class="mb-5 grid gap-3 md:grid-cols-[1fr_200px_180px]">
		<input
			class="app-input"
			type="search"
			placeholder="Rechercher par nom, téléphone ou n° de pièce"
			aria-label="Rechercher un client"
			bind:value={search}
			oninput={onSearchInput}
		/>
		<select
			class="app-input"
			aria-label="Statut KYC"
			bind:value={kycFilter}
			onchange={applyFilters}
		>
			<option value="">Tous les statuts KYC</option>
			<option value="UNVERIFIED">Non vérifié</option>
			<option value="PARTIALLY_VERIFIED">Partiel</option>
			<option value="VERIFIED">Vérifié</option>
			<option value="ENHANCED_VERIFICATION">Vérification renforcée</option>
		</select>
		<select
			class="app-input"
			aria-label="Niveau de risque"
			bind:value={riskFilter}
			onchange={applyFilters}
		>
			<option value="">Tous les risques</option>
			{#each flagLevels as level (level.value)}
				<option value={level.value}>Risque {level.label.toLowerCase()}</option>
			{/each}
		</select>
	</div>

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
			<span>Impossible de charger les clients : {loadError}</span>
			<button class="font-semibold underline" onclick={loadCustomers}>Réessayer</button>
		</div>
	{/if}

	<div class="app-table-wrap">
		<div class="overflow-x-auto">
			<table class="app-table min-w-[1080px]">
				<thead>
					<tr>
						<th>ID client</th>
						<th>Client</th>
						<th>Telephone</th>
						<th>Piece</th>
						<th>Photo piece</th>
						<th>KYC</th>
						<th>Risque</th>
						<th>Transactions</th>
						<th>Surveillance</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each customers as customer (customer.id)}
						{@const kyc = kycStatus(customer.kyc_status)}
						{@const photo = photoBadge(customer)}
						{@const risk = riskLevel(customer.risk_level)}
						{@const flagged = customer.open_risk_flags > 0}
						<tr class={flagged ? 'bg-red-50/40' : ''} data-testid="customer-row">
							<td class="font-semibold whitespace-nowrap text-slate-950">N° {customer.id}</td>
							<td>
								<div class="font-semibold whitespace-nowrap text-slate-950">
									{customer.full_name}
								</div>
								<div class="mt-1 text-xs whitespace-nowrap text-slate-400">
									Client depuis le {formatDate(customer.created_at)}
								</div>
								{#if flagged && customer.latest_flag_reason}
									<div class="mt-1 max-w-56 text-xs font-medium text-red-700">
										{alertReason(customer.latest_flag_reason)}
									</div>
								{/if}
							</td>
							<td class="whitespace-nowrap">{customer.phone || '-'}</td>
							<td>
								<div class="whitespace-nowrap">
									{customer.id_type ? fromApiIdType(customer.id_type) : '-'}
								</div>
								<div class="text-xs text-slate-400">{customer.id_number || ''}</div>
							</td>
							<td>
								<button
									class="app-badge {photo.badge} whitespace-nowrap hover:underline"
									title="Voir ou prendre la photo de la pièce"
									onclick={() => openPhotoModal(customer)}
									data-testid="photo-badge"
								>
									{photo.label}
								</button>
							</td>
							<td>
								<div class="flex flex-col items-start gap-1">
									<span class="app-badge {kyc.badge} whitespace-nowrap">{kyc.label}</span>
									{#if customer.id_expired}
										<span class="app-badge app-badge-danger whitespace-nowrap">Pièce expirée</span>
									{/if}
									{#if customer.kyc_review_due}
										<span class="app-badge app-badge-warning whitespace-nowrap">À revoir</span>
									{/if}
								</div>
							</td>
							<td><span class="app-badge {risk.badge} whitespace-nowrap">{risk.label}</span></td>
							<td class="font-semibold text-slate-950">
								{#if customer.transaction_count > 0}
									<a
										href="/transactions?client={customer.id}"
										class="text-blue-600 hover:underline"
										title="Voir les transactions de ce client"
									>
										{customer.transaction_count}
									</a>
								{:else}
									0
								{/if}
							</td>
							<td>
								{#if flagged}
									<a
										href="/alerts?client={customer.id}"
										class="app-badge app-badge-danger whitespace-nowrap hover:underline"
									>
										{customer.open_risk_flags} alerte{customer.open_risk_flags > 1 ? 's' : ''}
									</a>
								{:else}
									<span class="app-badge app-badge-success">Normal</span>
								{/if}
							</td>
							<td class="text-right whitespace-nowrap">
								<button
									class="app-button app-button-secondary px-3 py-2"
									onclick={() => (kycCustomer = customer)}
									data-testid="kyc-dossier-button"
								>
									Dossier KYC
								</button>
								{#if flagged}
									<a
										class="app-button app-button-secondary px-3 py-2"
										href="/alerts?client={customer.id}"
									>
										Voir les alertes
									</a>
								{/if}
								{#if canFlag}
									<button
										class="app-button app-button-danger px-3 py-2"
										disabled={!customer.latest_transaction_id}
										title={!customer.latest_transaction_id
											? 'Aucune transaction à signaler pour ce client'
											: ''}
										onclick={() => openFlagModal(customer)}
									>
										Flaguer
									</button>
								{/if}
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="10" class="py-10 text-center text-slate-500">
								{loading
									? 'Chargement…'
									: search || kycFilter || riskFilter
										? 'Aucun client ne correspond à ces critères.'
										: 'Aucun client enregistré pour le moment.'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	{#if total > 0}
		<div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
			<span data-testid="pagination-info">
				{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} sur {total} client{total > 1 ? 's' : ''}
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

{#if isFlagModalOpen && selectedCustomer}
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
							{selectedCustomer.full_name} sera marque comme client a surveiller. Une alerte sera créée
							sur sa dernière transaction.
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

			<div class="space-y-4 px-6 py-5">
				<div>
					<label for="flagReason" class="mb-2 block text-sm font-semibold text-slate-700"
						>Motif</label
					>
					<select id="flagReason" class="app-input" bind:value={flagReason}>
						{#each flagReasons as reason (reason)}
							<option>{reason}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="flagLevel" class="mb-2 block text-sm font-semibold text-slate-700"
						>Niveau de risque</label
					>
					<select id="flagLevel" class="app-input" bind:value={flagLevel}>
						{#each flagLevels as level (level.value)}
							<option value={level.value}>{level.label}</option>
						{/each}
					</select>
				</div>
				{#if flagError}
					<p class="text-sm text-red-600" role="alert">{flagError}</p>
				{/if}
			</div>

			<div class="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
				<button class="app-button app-button-secondary px-4 py-2" onclick={closeFlagModal}
					>Annuler</button
				>
				<button
					class="app-button app-button-danger bg-red-600 px-4 py-2 text-white"
					disabled={saving}
					onclick={saveFlag}
				>
					{saving ? 'Enregistrement…' : 'Confirmer'}
				</button>
			</div>
		</div>
	</div>
{/if}

{#if photoCustomer}
	<div class="app-modal-backdrop">
		<div
			class="app-modal max-h-[92vh] max-w-2xl overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="photo-client-title"
		>
			<div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
				<div>
					<h2 id="photo-client-title" class="text-lg font-semibold text-slate-950">
						Pièce d'identité — {photoCustomer.full_name}
					</h2>
					<p class="mt-1 text-sm text-slate-500">
						{photoCustomer.id_type ? fromApiIdType(photoCustomer.id_type) : 'Type non renseigné'}
						{photoCustomer.id_number ? `· n° ${photoCustomer.id_number}` : ''}.
						{canEditKyc
							? "Chaque photo est enregistrée dès qu'elle est prise."
							: 'Consultation seule : seul le rôle conformité peut enregistrer une photo.'}
					</p>
				</div>
				<button
					class="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
					aria-label="Fermer"
					onclick={closePhotoModal}
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="px-6 py-5">
				{#if photoStatus === null && !photoError}
					<p class="text-sm text-slate-500">Chargement…</p>
				{:else}
					<IdDocumentCapture
						previews={photoPreviews}
						busySide={photoBusy}
						readOnly={!canEditKyc}
						onCapture={savePhoto}
					/>
					{#if photoStatus}
						<p class="mt-3 text-xs text-slate-500" data-testid="photo-dates">
							{#each ['front', 'back'] as const as side (side)}
								{#if photoStatus[side]}
									<span class="mr-3">
										{side === 'front' ? 'Recto' : 'Verso'} enregistré le {formatDate(
											photoStatus[side]!.uploaded_at,
											{ withTime: true }
										)}
									</span>
								{/if}
							{/each}
						</p>
					{/if}
				{/if}
				{#if photoError}
					<p class="mt-3 text-sm text-red-600" role="alert">{photoError}</p>
				{/if}
			</div>
			<div class="flex justify-end border-t border-slate-100 px-6 py-4">
				<button class="app-button app-button-secondary px-4 py-2" onclick={closePhotoModal}>
					Fermer
				</button>
			</div>
		</div>
	</div>
{/if}

{#if kycCustomer}
	<KycDossierModal
		customer={kycCustomer}
		canEdit={canEditKyc}
		canVerify={canVerifyKyc}
		onClose={closeKycModal}
	/>
{/if}
