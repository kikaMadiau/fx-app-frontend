<script lang="ts">
	import {
		createTransactionWithExistingClient,
		createTransactionWithNewClient
	} from '$lib/api/transactions.js';
	import {
		createIdleLookupState,
		lookupClientByPhone,
		type ClientLookupState
	} from '$lib/services/client-lookup.js';
	import { getClientFullName, type Client } from '$lib/types/client.js';
	import {
		createEmptyTransactionForm,
		type CreatedTransaction,
		type TransactionFormData
	} from '$lib/types/transaction.js';
	import { ApiError, getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import { fromApiIdType, toApiIdType } from '$lib/utils/identity.js';
	import { get } from 'svelte/store';
	import { preferences } from '$lib/stores/preferences.js';
	import { formatPhoneDisplay } from '$lib/utils/phone.js';
	import IdDocumentCapture from '$lib/components/customers/IdDocumentCapture.svelte';
	import {
		getIdDocumentImage,
		getIdDocumentStatus,
		translateIdDocumentError,
		uploadIdDocument,
		type IdDocumentSide
	} from '$lib/api/id-document.js';
	import { onDestroy, onMount } from 'svelte';
	import {
		getKycRisk,
		isExpired as isExpiredDate,
		previewBlocks,
		updateIdentity,
		type KycRisk
	} from '$lib/api/kyc.js';
	import { getExchangeRates, type ExchangeRate } from '$lib/api/dashboard.js';
	import { factorSeverity, factorText } from '$lib/utils/labels.js';
	import {
		hasErrors,
		identityExpiryRequired,
		mergeErrors,
		requireFoundClient,
		validateExistingClientPhone,
		validateIdentityDocumentFields,
		validateNewClientFields,
		validateEmail,
		validateTransactionFields,
		type FormErrors
	} from '$lib/utils/validation.js';

	type Scenario = 'new' | 'existing';
	type Step = 'scenario' | 'client' | 'transaction' | 'confirm';

	let {
		onClose,
		onSuccess
	}: {
		onClose: () => void;
		onSuccess: (transaction: CreatedTransaction) => void;
	} = $props();

	let scenario = $state<Scenario | null>(null);
	let currentStep = $state<Step>('scenario');
	// Formulaire vide, avec la devise par défaut choisie dans Paramètres.
	function newForm(): TransactionFormData {
		return { ...createEmptyTransactionForm(), currency: get(preferences).currency };
	}

	let form = $state<TransactionFormData>(newForm());
	let lookupState = $state<ClientLookupState>(createIdleLookupState());
	let foundClient = $state<Client | null>(null);
	let fieldErrors = $state<FormErrors>({});
	let formError = $state('');
	let isSubmitting = $state(false);
	let successMessage = $state('');

	// Photos de la pièce prises pendant la saisie : envoyées après la création de la transaction
	// (un nouveau client n'existe en base qu'à ce moment-là).
	let idPhotos = $state<Record<IdDocumentSide, Blob | null>>({ front: null, back: null });
	let idPreviews = $state<Record<IdDocumentSide, string | null>>({ front: null, back: null });
	let photoWarning = $state('');

	function setPreview(side: IdDocumentSide, blob: Blob | null) {
		if (idPreviews[side]) URL.revokeObjectURL(idPreviews[side]!);
		idPreviews[side] = blob ? URL.createObjectURL(blob) : null;
	}

	function resetIdPhotos() {
		setPreview('front', null);
		setPreview('back', null);
		idPhotos = { front: null, back: null };
		photoWarning = '';
	}

	function captureIdPhoto(side: IdDocumentSide, photo: Blob) {
		idPhotos[side] = photo;
		setPreview(side, photo);
	}

	// Client existant : affiche les photos déjà enregistrées (elles peuvent être reprises).
	async function loadExistingIdPhotos(customerId: number) {
		try {
			const status = await getIdDocumentStatus(customerId);
			for (const side of ['front', 'back'] as const) {
				if (status[side] && !idPhotos[side]) {
					const blob = await getIdDocumentImage(customerId, side);
					if (blob && !idPhotos[side]) setPreview(side, blob);
				}
			}
		} catch {
			// Les photos existantes sont un plus : la saisie continue sans elles.
		}
	}

	async function uploadPendingIdPhotos(customerId: number | undefined) {
		const pending = (['front', 'back'] as const).filter((side) => idPhotos[side]);
		if (!pending.length) return;
		if (!customerId) {
			photoWarning =
				"Transaction créée, mais les photos de la pièce n'ont pas pu être rattachées au client.";
			return;
		}
		for (const side of pending) {
			try {
				await uploadIdDocument(customerId, side, idPhotos[side]!);
			} catch (error) {
				photoWarning = `Transaction créée, mais la photo n'a pas été enregistrée : ${translateIdDocumentError(error)} Vous pourrez la reprendre depuis Clients & KYC.`;
			}
		}
	}

	onDestroy(resetIdPhotos);

	// --- KYC : facteurs de risque du client et blocages prévus ------------------------
	let kycRisk = $state<KycRisk | null>(null);
	let rates = $state<ExchangeRate[]>([]);
	// Seuils par défaut tant que le profil de risque n'est pas chargé (nouveau client).
	const DEFAULT_THRESHOLD_USD = 1000;
	const DEFAULT_DAILY_LIMIT_USD = 5000;

	onMount(async () => {
		try {
			rates = await getExchangeRates();
		} catch {
			// Sans les taux, l'équivalent en dollars d'une opération en EUR ou GBP reste approximatif.
		}
	});

	async function loadKycRisk(customerId: number) {
		kycRisk = null;
		try {
			kycRisk = await getKycRisk(customerId);
			if (kycRisk.id_expiry_date && !form.identityDocumentExpiry) {
				form.identityDocumentExpiry = kycRisk.id_expiry_date;
			}
		} catch {
			// Le profil de risque est une aide : la saisie continue sans lui (l'API contrôle de toute façon).
		}
	}

	/** Équivalent en dollars, comme l'API : une devise autre que l'USD passe par sa contre-valeur en CDF. */
	function amountInUsd(): number {
		const amount = Number(form.amount) || 0;
		if (form.currency === 'USD') return amount;
		const usdCdf = rates.find((r) => r.pair.startsWith('USD'))?.buy_rate || 0;
		const rate =
			Number(form.rate) || rates.find((r) => r.pair.startsWith(form.currency))?.buy_rate || 0;
		return usdCdf > 0 && rate > 0 ? (amount * rate) / usdCdf : amount;
	}

	const blockPreview = $derived(
		previewBlocks({
			idType: toApiIdType(form.identityDocumentType) ?? '',
			idExpiryDate: form.identityDocumentExpiry,
			riskLevel: scenario === 'existing' ? kycRisk?.risk_level : undefined,
			amountUsd: amountInUsd(),
			idRequiredAboveUsd: kycRisk?.id_required_above_usd ?? DEFAULT_THRESHOLD_USD,
			validationAboveUsd: kycRisk?.validation_above_usd ?? DEFAULT_THRESHOLD_USD,
			dailyLimitUsd: kycRisk?.daily_limit_usd ?? DEFAULT_DAILY_LIMIT_USD,
			dayTotalUsd: scenario === 'existing' ? (kycRisk?.day_total_usd ?? 0) : 0
		})
	);
	const kycWarnings = $derived(
		scenario === 'existing' && kycRisk ? kycRisk.factors.filter((f) => f.severity !== 'LOW') : []
	);

	/** Client existant : enregistre la pièce saisie si elle diffère de celle du dossier. */
	async function saveExistingIdentity(client: Client) {
		const idType = toApiIdType(form.identityDocumentType) ?? '';
		const idNumber = form.identityDocumentNumber.trim();
		const expiry = form.identityDocumentExpiry.trim();
		const unchanged =
			idType === (client.id_type || '') &&
			idNumber === (client.id_number || '') &&
			expiry === (kycRisk?.id_expiry_date ?? '');
		if (unchanged || !idType || !idNumber) return;
		await updateIdentity(client.id, {
			id_type: idType,
			id_number: idNumber,
			id_expiry_date: expiry
		});
	}

	const inputClass = (field: string) =>
		`app-input ${fieldErrors[field] ? 'border-red-300 bg-red-50' : ''}`;

	function resetModal() {
		scenario = null;
		currentStep = 'scenario';
		form = newForm();
		lookupState = createIdleLookupState();
		foundClient = null;
		fieldErrors = {};
		formError = '';
		isSubmitting = false;
		successMessage = '';
		kycRisk = null;
		resetIdPhotos();
	}

	function handleClose() {
		resetModal();
		onClose();
	}

	function selectScenario(nextScenario: Scenario) {
		scenario = nextScenario;
		fieldErrors = {};
		formError = '';
		lookupState = createIdleLookupState();
		foundClient = null;
		currentStep = 'client';
	}

	function switchToNewClientWithPhone() {
		scenario = 'new';
		fieldErrors = {};
		formError = '';
		foundClient = null;
		lookupState = createIdleLookupState();
		currentStep = 'client';
	}

	function goBack() {
		formError = '';
		fieldErrors = {};

		if (currentStep === 'client') {
			currentStep = 'scenario';
			return;
		}

		if (currentStep === 'transaction') {
			currentStep = 'client';
			return;
		}

		if (currentStep === 'confirm') {
			currentStep = 'transaction';
		}
	}

	function validateClientStep(): boolean {
		if (scenario === 'new') {
			fieldErrors = validateNewClientFields(form);
			return !hasErrors(fieldErrors);
		}

		fieldErrors = mergeErrors(
			validateExistingClientPhone(form.phone),
			requireFoundClient(foundClient)
		);
		return !hasErrors(fieldErrors);
	}

	function validateTransactionStep(): boolean {
		fieldErrors = mergeErrors(
			validateTransactionFields(form),
			scenario === 'existing' ? validateIdentityDocumentFields(form) : {}
		);
		return !hasErrors(fieldErrors);
	}

	function continueToNextStep() {
		formError = '';

		if (currentStep === 'client' && validateClientStep()) {
			currentStep = 'transaction';
			return;
		}

		if (currentStep === 'transaction' && validateTransactionStep()) {
			currentStep = 'confirm';
		}
	}

	async function searchExistingClient() {
		formError = '';
		fieldErrors = validateExistingClientPhone(form.phone);

		if (hasErrors(fieldErrors)) {
			return;
		}

		lookupState = { status: 'loading' };
		foundClient = null;

		const result = await lookupClientByPhone(form.phone);
		lookupState = result;

		if (result.status === 'success') {
			foundClient = result.client;
			resetIdPhotos();
			loadExistingIdPhotos(result.client.id);
			form.identityDocumentExpiry = '';
			loadKycRisk(result.client.id);
			form.identityDocumentType = result.client.id_type
				? fromApiIdType(result.client.id_type)
				: form.identityDocumentType;
			form.identityDocumentNumber = result.client.id_number || form.identityDocumentNumber;
		}
	}

	async function submitTransaction() {
		formError = '';
		fieldErrors = {};

		const clientErrors =
			scenario === 'new'
				? validateNewClientFields(form)
				: mergeErrors(requireFoundClient(foundClient), validateIdentityDocumentFields(form));
		const transactionErrors = validateTransactionFields(form);
		fieldErrors = mergeErrors(clientErrors, transactionErrors);

		if (hasErrors(fieldErrors)) {
			return;
		}

		isSubmitting = true;

		try {
			if (scenario === 'existing' && foundClient) {
				await saveExistingIdentity(foundClient);
			}
			const created =
				scenario === 'new'
					? await createTransactionWithNewClient(form)
					: await createTransactionWithExistingClient(
							foundClient!.id,
							form,
							getClientFullName(foundClient!),
							foundClient!.phone
						);

			await uploadPendingIdPhotos(created.customerId ?? foundClient?.id);
			successMessage = 'Transaction creee avec succes.';
			onSuccess(created);

			// En cas de souci avec les photos, la fenêtre reste ouverte pour que le message soit lu.
			if (!photoWarning) {
				setTimeout(() => {
					handleClose();
				}, 900);
			}
		} catch (error) {
			if (error instanceof ApiError) {
				formError = error.message;
				fieldErrors = { ...fieldErrors, ...error.fieldErrors };
			} else {
				formError = getUserFacingErrorMessage(error);
			}
		} finally {
			isSubmitting = false;
		}
	}

	function getClientDisplayName(): string {
		if (foundClient) {
			return getClientFullName(foundClient);
		}

		return `${form.firstName} ${form.lastName}`.trim() || '-';
	}

	function getClientDisplayPhone(): string {
		if (foundClient) {
			return formatPhoneDisplay(foundClient.phone);
		}

		return formatPhoneDisplay(form.phone) || '-';
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:px-4 sm:py-8"
>
	<div
		class="app-modal flex max-h-[92vh] max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:max-h-full sm:rounded-lg"
		role="dialog"
		aria-modal="true"
		aria-labelledby="transaction-modal-title"
	>
		<div class="border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 id="transaction-modal-title" class="text-lg font-semibold text-slate-950">
						Creer une transaction
					</h2>
					<p class="mt-1 text-sm text-slate-500">
						{#if currentStep === 'scenario'}
							Choisissez le type de client.
						{:else if currentStep === 'client'}
							{scenario === 'new'
								? 'Renseignez les informations du nouveau client.'
								: 'Recherchez le client par numero de telephone.'}
						{:else if currentStep === 'transaction'}
							Completez les details de l'operation.
						{:else}
							Verifiez les informations avant enregistrement.
						{/if}
					</p>
				</div>

				<button
					class="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
					aria-label="Fermer"
					onclick={handleClose}
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			{#if currentStep !== 'scenario'}
				<div class="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase">
					<span class={`app-badge ${scenario === 'new' ? 'app-badge-info' : 'app-badge-success'}`}>
						{scenario === 'new' ? 'Nouveau client' : 'Client existant'}
					</span>
					<span
						>Etape {currentStep === 'client' ? 1 : currentStep === 'transaction' ? 2 : 3} / 3</span
					>
				</div>
			{/if}
		</div>

		<form
			class="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5"
			onsubmit={(event) => event.preventDefault()}
		>
			{#if formError}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{formError}
				</div>
			{/if}

			{#if successMessage}
				<div
					class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
				>
					{successMessage}
				</div>
			{/if}
			{#if photoWarning}
				<div
					class="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800"
					role="alert"
				>
					{photoWarning}
				</div>
			{/if}

			{#if currentStep === 'scenario'}
				<div class="grid gap-3">
					<button
						type="button"
						class="app-card p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
						onclick={() => selectScenario('new')}
					>
						<div class="flex items-center gap-3">
							<span
								class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14" />
								</svg>
							</span>
							<div>
								<p class="font-semibold text-slate-950">Nouveau client</p>
								<p class="mt-1 text-sm text-slate-500">
									Creer le client et enregistrer la transaction.
								</p>
							</div>
						</div>
					</button>

					<button
						type="button"
						class="app-card p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
						onclick={() => selectScenario('existing')}
					>
						<div class="flex items-center gap-3">
							<span
								class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
									/>
								</svg>
							</span>
							<div>
								<p class="font-semibold text-slate-950">Client existant</p>
								<p class="mt-1 text-sm text-slate-500">Rechercher le client par telephone.</p>
							</div>
						</div>
					</button>
				</div>
			{:else if currentStep === 'client' && scenario === 'new'}
				<div class="space-y-4">
					<p class="text-xs text-slate-500">
						Les champs marqués d'un <span class="text-red-600" aria-hidden="true">*</span> sont obligatoires.
					</p>
					<div>
						<label for="firstName" class="mb-2 block text-sm font-semibold text-slate-700"
							>Prenom <span class="text-red-600" aria-hidden="true">*</span></label
						>
						<input
							id="firstName"
							class={inputClass('firstName')}
							placeholder="Ex: Jean"
							autocomplete="given-name"
							bind:value={form.firstName}
						/>
						{#if fieldErrors.firstName}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>
						{/if}
					</div>

					<div>
						<label for="lastName" class="mb-2 block text-sm font-semibold text-slate-700"
							>Nom <span class="text-red-600" aria-hidden="true">*</span></label
						>
						<input
							id="lastName"
							class={inputClass('lastName')}
							placeholder="Ex: Dupont"
							autocomplete="family-name"
							bind:value={form.lastName}
						/>
						{#if fieldErrors.lastName}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>
						{/if}
					</div>

					<div>
						<label for="newClientPhone" class="mb-2 block text-sm font-semibold text-slate-700">
							Numero de telephone <span class="text-red-600" aria-hidden="true">*</span>
						</label>
						<input
							id="newClientPhone"
							class={inputClass('phone')}
							placeholder="+243 900 000 000"
							inputmode="tel"
							autocomplete="tel"
							bind:value={form.phone}
						/>
						{#if fieldErrors.phone}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
						{/if}
					</div>

					<div>
						<label
							for="identityDocumentType"
							class="mb-2 block text-sm font-semibold text-slate-700"
						>
							Type de piece presentee <span class="text-red-600" aria-hidden="true">*</span>
						</label>
						<select
							id="identityDocumentType"
							class={inputClass('identityDocumentType')}
							bind:value={form.identityDocumentType}
						>
							<option value="">Selectionner une piece</option>
							<option value="Carte d'identite">Carte d'identite</option>
							<option value="Passeport">Passeport</option>
							<option value="Permis de conduire">Permis de conduire</option>
							<option value="Carte d'electeur">Carte d'electeur</option>
						</select>
						{#if fieldErrors.identityDocumentType}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.identityDocumentType}</p>
						{/if}
					</div>

					<div>
						<label
							for="identityDocumentNumber"
							class="mb-2 block text-sm font-semibold text-slate-700"
						>
							Numero de la piece <span class="text-red-600" aria-hidden="true">*</span>
						</label>
						<input
							id="identityDocumentNumber"
							class={inputClass('identityDocumentNumber')}
							placeholder="Ex: OP1234567"
							bind:value={form.identityDocumentNumber}
						/>
						{#if fieldErrors.identityDocumentNumber}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.identityDocumentNumber}</p>
						{/if}
					</div>

					<div>
						<label
							for="identityDocumentExpiry"
							class="mb-2 block text-sm font-semibold text-slate-700"
						>
							Date d'expiration de la piece
							{#if identityExpiryRequired(form.identityDocumentType)}<span
									class="text-red-600"
									aria-hidden="true">*</span
								>{/if}
						</label>
						<input
							id="identityDocumentExpiry"
							type="date"
							class={inputClass('identityDocumentExpiry')}
							bind:value={form.identityDocumentExpiry}
						/>
						{#if fieldErrors.identityDocumentExpiry && !form.identityDocumentExpiry}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.identityDocumentExpiry}</p>
						{:else if isExpiredDate(form.identityDocumentExpiry)}
							<p class="mt-1 text-sm text-red-600" data-testid="expiry-warning">
								Piece expiree : l'operation sera refusee sans derogation de la conformite.
							</p>
						{:else if form.identityDocumentType === "Carte d'electeur"}
							<p class="mt-1 text-xs text-slate-500">Facultative pour la carte d'electeur.</p>
						{/if}
					</div>

					<div>
						<label for="clientAddress" class="mb-2 block text-sm font-semibold text-slate-700"
							>Adresse</label
						>
						<input
							id="clientAddress"
							class={inputClass('address')}
							placeholder="Ex: Av. du Commerce 12, Gombe"
							autocomplete="street-address"
							bind:value={form.address}
						/>
					</div>

					<div>
						<label for="clientEmail" class="mb-2 block text-sm font-semibold text-slate-700"
							>E-mail</label
						>
						<input
							id="clientEmail"
							type="email"
							class={inputClass('email')}
							placeholder="Ex: client@exemple.cd"
							autocomplete="email"
							bind:value={form.email}
						/>
						{#if fieldErrors.email && validateEmail(form.email)}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
						{:else}
							<p class="mt-1 text-xs text-slate-500">
								Facultatif : le client y recevra aussi la confirmation de l'operation.
							</p>
						{/if}
					</div>

					<div>
						<label for="kycStatus" class="mb-2 block text-sm font-semibold text-slate-700"
							>Statut KYC</label
						>
						<select id="kycStatus" class={inputClass('kycStatus')} bind:value={form.kycStatus}>
							<option value="Verifie">Verifie</option>
							<option value="A completer">A completer</option>
							<option value="En revue">En revue</option>
						</select>
					</div>
				</div>
			{:else if currentStep === 'client' && scenario === 'existing'}
				<div class="space-y-4">
					<div>
						<label
							for="existingClientPhone"
							class="mb-2 block text-sm font-semibold text-slate-700"
						>
							Numero de telephone du client <span class="text-red-600" aria-hidden="true">*</span>
						</label>
						<div class="flex flex-col gap-3 sm:flex-row">
							<input
								id="existingClientPhone"
								class={inputClass('phone')}
								placeholder="+243 900 000 000"
								inputmode="tel"
								autocomplete="tel"
								bind:value={form.phone}
								oninput={() => {
									foundClient = null;
									if (lookupState.status !== 'idle') {
										lookupState = createIdleLookupState();
									}
								}}
							/>
							<button
								type="button"
								class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
								disabled={lookupState.status === 'loading'}
								onclick={searchExistingClient}
							>
								{#if lookupState.status === 'loading'}
									Recherche...
								{:else}
									Rechercher
								{/if}
							</button>
						</div>
						{#if fieldErrors.phone}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
						{/if}
					</div>

					{#if lookupState.status === 'loading'}
						<div class="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
							Recherche du client en cours...
						</div>
					{:else if lookupState.status === 'success' && foundClient}
						<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
							<div class="flex items-center gap-2 text-sm font-semibold text-emerald-700">
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
								Client trouve
							</div>
							<p class="mt-2 text-base font-semibold text-slate-950">
								{getClientFullName(foundClient)}
							</p>
							<p class="text-sm text-slate-600">{formatPhoneDisplay(foundClient.phone)}</p>
						</div>
					{:else if lookupState.status === 'not_found'}
						<div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
							<p class="text-sm text-amber-800">Aucun client trouve avec ce numero.</p>
							<button
								type="button"
								class="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
								onclick={switchToNewClientWithPhone}
							>
								Creer un nouveau client
							</button>
						</div>
					{:else if lookupState.status === 'error'}
						<div class="rounded-lg border border-red-200 bg-red-50 p-4">
							<p class="text-sm text-red-700">{lookupState.message}</p>
							<button
								type="button"
								class="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
								onclick={searchExistingClient}
							>
								Reessayer
							</button>
						</div>
					{/if}

					{#if fieldErrors.client}
						<p class="text-sm text-red-600">{fieldErrors.client}</p>
					{/if}
				</div>
			{:else if currentStep === 'transaction'}
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="sm:col-span-2">
						<div class="rounded-lg border border-slate-100 bg-slate-50 p-4">
							<p class="text-xs font-semibold text-slate-500 uppercase">Client</p>
							<p class="mt-1 font-semibold text-slate-950">{getClientDisplayName()}</p>
							<p class="text-sm text-slate-600">{getClientDisplayPhone()}</p>
						</div>
					</div>

					<div>
						<label
							for="transactionIdentityType"
							class="mb-2 block text-sm font-semibold text-slate-700"
						>
							Type de piece presentee <span class="text-red-600" aria-hidden="true">*</span>
						</label>
						<select
							id="transactionIdentityType"
							class={inputClass('identityDocumentType')}
							bind:value={form.identityDocumentType}
						>
							<option value="">Selectionner une piece</option>
							<option value="Carte d'identite">Carte d'identite</option>
							<option value="Passeport">Passeport</option>
							<option value="Permis de conduire">Permis de conduire</option>
							<option value="Carte d'electeur">Carte d'electeur</option>
						</select>
						{#if fieldErrors.identityDocumentType}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.identityDocumentType}</p>
						{/if}
					</div>

					<div>
						<label
							for="transactionIdentityNumber"
							class="mb-2 block text-sm font-semibold text-slate-700"
						>
							Numero de la piece <span class="text-red-600" aria-hidden="true">*</span>
						</label>
						<input
							id="transactionIdentityNumber"
							class={inputClass('identityDocumentNumber')}
							placeholder="Ex: OP1234567"
							bind:value={form.identityDocumentNumber}
						/>
						{#if fieldErrors.identityDocumentNumber}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.identityDocumentNumber}</p>
						{/if}
					</div>

					<div class="sm:col-span-2">
						<label
							for="transactionIdentityExpiry"
							class="mb-2 block text-sm font-semibold text-slate-700"
						>
							Date d'expiration de la piece
							{#if identityExpiryRequired(form.identityDocumentType)}<span
									class="text-red-600"
									aria-hidden="true">*</span
								>{/if}
						</label>
						<input
							id="transactionIdentityExpiry"
							type="date"
							class={inputClass('identityDocumentExpiry')}
							bind:value={form.identityDocumentExpiry}
						/>
						{#if fieldErrors.identityDocumentExpiry && !form.identityDocumentExpiry}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.identityDocumentExpiry}</p>
						{:else if isExpiredDate(form.identityDocumentExpiry)}
							<p class="mt-1 text-sm text-red-600" data-testid="expiry-warning">
								Piece expiree : l'operation sera refusee sans derogation de la conformite.
							</p>
						{:else if form.identityDocumentType === "Carte d'electeur"}
							<p class="mt-1 text-xs text-slate-500">Facultative pour la carte d'electeur.</p>
						{/if}
					</div>

					<div class="sm:col-span-2">
						<p class="mb-2 text-sm font-semibold text-slate-700">
							Photo de la pièce d'identité <span class="font-normal text-slate-500"
								>(recommandé)</span
							>
						</p>
						<IdDocumentCapture previews={idPreviews} onCapture={captureIdPhoto} />
					</div>

					<div>
						<label for="type" class="mb-2 block text-sm font-semibold text-slate-700">Type</label>
						<select id="type" class={inputClass('type')} bind:value={form.type}>
							<option value="Achat">Achat</option>
							<option value="Vente">Vente</option>
						</select>
					</div>

					<div>
						<label for="currency" class="mb-2 block text-sm font-semibold text-slate-700"
							>Devise</label
						>
						<select id="currency" class={inputClass('currency')} bind:value={form.currency}>
							<option value="USD">USD</option>
							<option value="EUR">EUR</option>
							<option value="GBP">GBP</option>
						</select>
					</div>

					<div>
						<label for="amount" class="mb-2 block text-sm font-semibold text-slate-700"
							>Montant <span class="text-red-600" aria-hidden="true">*</span></label
						>
						<input
							id="amount"
							type="number"
							min="0"
							step="0.01"
							class={inputClass('amount')}
							placeholder="0.00"
							inputmode="decimal"
							bind:value={form.amount}
						/>
						{#if fieldErrors.amount}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.amount}</p>
						{/if}
					</div>

					<div>
						<label for="rate" class="mb-2 block text-sm font-semibold text-slate-700">Taux</label>
						<input
							id="rate"
							type="number"
							min="0"
							step="0.01"
							class={inputClass('rate')}
							placeholder="Ex: 2780"
							inputmode="decimal"
							bind:value={form.rate}
						/>
						{#if fieldErrors.rate}
							<p class="mt-1 text-sm text-red-600">{fieldErrors.rate}</p>
						{/if}
					</div>

					<div>
						<label for="paymentMethod" class="mb-2 block text-sm font-semibold text-slate-700">
							Moyen de paiement
						</label>
						<select
							id="paymentMethod"
							class={inputClass('paymentMethod')}
							bind:value={form.paymentMethod}
						>
							<option value="Cash">Cash</option>
							<option value="Banque">Banque</option>
							<option value="Mobile money">Mobile money</option>
						</select>
					</div>

					<div>
						<label for="reference" class="mb-2 block text-sm font-semibold text-slate-700"
							>Reference</label
						>
						<input
							id="reference"
							class={inputClass('reference')}
							placeholder="Reference interne"
							bind:value={form.reference}
						/>
					</div>

					<div class="sm:col-span-2">
						<label for="note" class="mb-2 block text-sm font-semibold text-slate-700">Note</label>
						<textarea
							id="note"
							class={`${inputClass('note')} min-h-24`}
							placeholder="Ajouter une remarque..."
							bind:value={form.note}></textarea>
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<div class="rounded-lg bg-slate-50 p-5">
						<h3 class="font-semibold text-slate-950">Resume de la transaction</h3>
						<div class="mt-4 grid gap-3 text-sm">
							<div class="flex items-start justify-between gap-4">
								<span class="text-slate-500">Client</span>
								<span class="text-right font-semibold text-slate-950">{getClientDisplayName()}</span
								>
							</div>
							<div class="flex items-start justify-between gap-4">
								<span class="text-slate-500">Telephone</span>
								<span class="text-right font-semibold text-slate-950"
									>{getClientDisplayPhone()}</span
								>
							</div>
							<div class="flex items-start justify-between gap-4">
								<span class="text-slate-500">Piece presentee</span>
								<span class="text-right font-semibold text-slate-950">
									{form.identityDocumentType || '-'} - {form.identityDocumentNumber || '-'}
								</span>
							</div>
							<div class="flex items-start justify-between gap-4">
								<span class="text-slate-500">Photo de la piece</span>
								<span class="text-right font-semibold text-slate-950" data-testid="photo-summary">
									{#if idPreviews.front || idPreviews.back}
										{[idPreviews.front ? 'Recto' : '', idPreviews.back ? 'Verso' : '']
											.filter(Boolean)
											.join(' + ')}
									{:else}
										Non prise
									{/if}
								</span>
							</div>
							<div class="flex items-start justify-between gap-4">
								<span class="text-slate-500">Operation</span>
								<span class="text-right font-semibold text-slate-950"
									>{form.type} {form.currency}</span
								>
							</div>
							<div class="flex items-start justify-between gap-4">
								<span class="text-slate-500">Montant</span>
								<span class="text-right font-semibold text-slate-950">{form.amount || '-'}</span>
							</div>
							<div class="flex items-start justify-between gap-4">
								<span class="text-slate-500">Taux</span>
								<span class="text-right font-semibold text-slate-950">{form.rate || '-'}</span>
							</div>
							<div class="flex items-start justify-between gap-4">
								<span class="text-slate-500">Paiement</span>
								<span class="text-right font-semibold text-slate-950">{form.paymentMethod}</span>
							</div>
						</div>
					</div>

					{#if blockPreview.length}
						<div
							class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
							data-testid="kyc-blocks"
						>
							{#if kycRisk?.override}
								<p class="font-semibold">Dérogation de la conformité active</p>
								<p class="mt-1">
									Accordée par {kycRisk.override.granted_by_name || 'la conformité'} : « {kycRisk
										.override.reason} ». Elle couvre cette opération (une seule fois).
								</p>
							{:else}
								<p class="font-semibold">Cette opération sera refusée</p>
								<ul class="mt-1 list-disc space-y-0.5 pl-5">
									{#each blockPreview as block (block.code)}
										<li>{block.message}</li>
									{/each}
								</ul>
								<p class="mt-2">
									Régularisez la pièce du client ou demandez une dérogation à la conformité (Clients
									& KYC → Dossier KYC).
								</p>
							{/if}
						</div>
					{/if}

					{#if kycWarnings.length}
						<div
							class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
							data-testid="kyc-warnings"
						>
							<p class="font-semibold">Points de vigilance KYC</p>
							<ul class="mt-2 space-y-1.5">
								{#each kycWarnings as factor (factor.code)}
									{@const severity = factorSeverity(factor.severity)}
									<li class="flex items-start gap-2">
										<span class="app-badge {severity.badge} shrink-0">{severity.label}</span>
										<span>{factorText(factor.code, factor.reason)}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{/if}
		</form>

		<div class="flex items-center justify-between border-t border-slate-100 px-5 py-4 sm:px-6">
			<button
				type="button"
				class="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
				onclick={goBack}
				disabled={currentStep === 'scenario' || isSubmitting}
			>
				Retour
			</button>

			<div class="flex items-center gap-3">
				<button
					type="button"
					class="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
					onclick={handleClose}
					disabled={isSubmitting}
				>
					Annuler
				</button>

				{#if currentStep === 'confirm'}
					<button
						type="button"
						class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
						disabled={isSubmitting || Boolean(successMessage)}
						onclick={submitTransaction}
					>
						{#if isSubmitting}
							Enregistrement...
						{:else}
							Enregistrer la transaction
						{/if}
					</button>
				{:else if currentStep !== 'scenario'}
					<button
						type="button"
						class="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
						onclick={continueToNextStep}
					>
						Continuer
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
