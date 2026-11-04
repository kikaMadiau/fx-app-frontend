<script lang="ts">
	import { onMount } from 'svelte';
	import type { CustomerSummary } from '$lib/api/clients.js';
	import {
		emptyKycProfile,
		expiryRequired,
		getKycProfile,
		getKycRisk,
		grantKycOverride,
		isExpired,
		saveKycProfile,
		setKycStatus,
		updateIdentity,
		type KycProfile,
		type KycRisk
	} from '$lib/api/kyc.js';
	import { ID_TYPE_OPTIONS } from '$lib/utils/identity.js';
	import { formatDate } from '$lib/utils/dates.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import {
		ACTIVITY_PROFILES,
		COUNTRIES,
		LEGAL_NATURES,
		SECTORS,
		factorSeverity,
		factorText,
		kycStatus,
		riskLevel
	} from '$lib/utils/labels.js';
	import { validateEmail } from '$lib/utils/validation.js';

	let {
		customer,
		canVerify,
		onClose
	}: {
		customer: CustomerSummary;
		/** Conformité : peut valider le dossier et accorder une dérogation. */
		canVerify: boolean;
		onClose: (changed: boolean) => void;
	} = $props();

	let loading = $state(true);
	let loadError = $state('');
	let profile = $state<KycProfile>(emptyKycProfile());
	let identity = $state({ id_type: '', id_number: '', id_expiry_date: '', address: '', email: '' });
	let risk = $state<KycRisk | null>(null);
	let errors = $state<Record<string, string>>({});
	let saving = $state(false);
	let formError = $state('');
	let notice = $state('');
	let changed = false;

	let newStatus = $state('VERIFIED');
	let overrideReason = $state('');
	let complianceBusy = $state(false);
	let complianceError = $state('');

	onMount(async () => {
		identity = {
			id_type: customer.id_type || '',
			id_number: customer.id_type ? customer.id_number : '',
			id_expiry_date: '',
			address: customer.address || '',
			email: customer.email || ''
		};
		try {
			const [existing, currentRisk] = await Promise.all([
				getKycProfile(customer.id),
				getKycRisk(customer.id)
			]);
			if (existing) profile = { ...emptyKycProfile(), ...existing };
			identity.id_expiry_date = existing?.id_expiry_date ?? '';
			risk = currentRisk;
		} catch (error) {
			loadError = getUserFacingErrorMessage(error);
		} finally {
			loading = false;
		}
	});

	const isEntity = $derived(profile.legal_nature === 'LEGAL_ENTITY');
	const needsProfession = $derived(!isEntity && profile.activity_profile !== 'PERSONAL');

	function validate(): boolean {
		const e: Record<string, string> = {};
		const required = 'Champ obligatoire.';
		if (!identity.id_type) e.id_type = required;
		if (!identity.id_number.trim()) e.id_number = required;
		if (expiryRequired(identity.id_type) && !identity.id_expiry_date)
			e.id_expiry_date = "Obligatoire sauf pour la carte d'électeur.";
		if (needsProfession && !profile.profession?.trim()) e.profession = required;
		if (isEntity && !profile.company_name?.trim()) e.company_name = required;
		if (isEntity && !profile.registration_number?.trim()) e.registration_number = required;
		if (!profile.source_of_funds.trim()) e.source_of_funds = required;
		if (!profile.purpose_of_operations.trim()) e.purpose_of_operations = required;
		if (!profile.nationality) e.nationality = required;
		if (!profile.residence_country) e.residence_country = required;
		if (!profile.activity_sector) e.activity_sector = required;
		if (profile.is_pep && !profile.pep_function?.trim()) e.pep_function = required;
		if (profile.acts_for_third_party && !profile.third_party_name?.trim())
			e.third_party_name = required;
		if (profile.acts_for_third_party && !profile.third_party_id_number?.trim())
			e.third_party_id_number = required;
		const emailError = validateEmail(identity.email);
		if (emailError) e.email = emailError;
		if (Number(profile.expected_volume) < 0) e.expected_volume = 'Montant positif attendu.';
		if (Number(profile.expected_frequency) < 0) e.expected_frequency = 'Nombre positif attendu.';
		errors = e;
		return Object.keys(e).length === 0;
	}

	// Après un premier essai d'enregistrement, les erreurs se mettent à jour pendant la saisie.
	let attempted = $state(false);
	$effect(() => {
		if (attempted && validate()) formError = '';
	});

	async function refreshRisk() {
		risk = await getKycRisk(customer.id);
	}

	async function save() {
		formError = '';
		notice = '';
		attempted = true;
		if (!validate()) {
			formError = 'Complétez les champs obligatoires signalés en rouge.';
			return;
		}
		saving = true;
		try {
			await updateIdentity(customer.id, {
				id_type: identity.id_type,
				id_number: identity.id_number.trim(),
				id_expiry_date: identity.id_expiry_date,
				address: identity.address.trim(),
				email: identity.email.trim().toLowerCase()
			});
			const saved = await saveKycProfile(customer.id, {
				...profile,
				id_expiry_date: identity.id_expiry_date,
				expected_volume: Number(profile.expected_volume) || 0,
				expected_frequency: Number(profile.expected_frequency) || 0
			});
			profile = { ...emptyKycProfile(), ...saved };
			changed = true;
			await refreshRisk();
			notice = 'Dossier enregistré.';
		} catch (error) {
			formError = getUserFacingErrorMessage(error);
		} finally {
			saving = false;
		}
	}

	async function changeStatus() {
		complianceError = '';
		complianceBusy = true;
		try {
			await setKycStatus(customer.id, newStatus);
			profile.kyc_status = newStatus;
			changed = true;
			await refreshRisk();
			notice = `Statut du dossier : ${kycStatus(newStatus).label.toLowerCase()}.`;
		} catch (error) {
			complianceError = getUserFacingErrorMessage(error);
		} finally {
			complianceBusy = false;
		}
	}

	async function grantOverride() {
		complianceError = '';
		if (overrideReason.trim().length < 5) {
			complianceError = 'Indiquez le motif de la dérogation (5 caractères minimum).';
			return;
		}
		complianceBusy = true;
		try {
			await grantKycOverride(customer.id, overrideReason.trim());
			overrideReason = '';
			changed = true;
			await refreshRisk();
			notice = 'Dérogation accordée : valable 24 h pour une seule opération.';
		} catch (error) {
			complianceError = getUserFacingErrorMessage(error);
		} finally {
			complianceBusy = false;
		}
	}

	const inputClass = (field: string) =>
		`app-input ${errors[field] ? 'border-red-300 bg-red-50' : ''}`;
</script>

{#snippet req()}<span class="text-red-600" aria-hidden="true">*</span>{/snippet}
{#snippet fieldError(field: string)}
	{#if errors[field]}<p class="mt-1 text-sm text-red-600">{errors[field]}</p>{/if}
{/snippet}

<div class="app-modal-backdrop">
	<div
		class="app-modal max-h-[92vh] max-w-3xl overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="kyc-dossier-title"
	>
		<div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
			<div>
				<h2 id="kyc-dossier-title" class="text-lg font-semibold text-slate-950">
					Dossier KYC — {customer.full_name}
				</h2>
				<p class="mt-1 text-sm text-slate-500">
					Client n° {customer.id} · {customer.phone || 'sans téléphone'}. Les champs marqués d'un
					{@render req()} sont obligatoires.
				</p>
			</div>
			<button
				class="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
				aria-label="Fermer"
				onclick={() => onClose(changed)}
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		{#if loading}
			<p class="px-6 py-8 text-sm text-slate-500">Chargement du dossier…</p>
		{:else if loadError}
			<p class="px-6 py-8 text-sm text-red-600" role="alert">
				Impossible de charger le dossier : {loadError}
			</p>
		{:else}
			<div class="space-y-6 px-6 py-5">
				{#if risk}
					{@const level = riskLevel(risk.risk_level)}
					{@const status = kycStatus(risk.kyc_status)}
					<section
						class="rounded-lg border border-slate-100 bg-slate-50 p-4"
						data-testid="kyc-risk"
					>
						<div class="flex flex-wrap items-center gap-2 text-sm">
							<span class="font-semibold text-slate-950">Profil de risque</span>
							<span class="app-badge {level.badge}">Risque {level.label.toLowerCase()}</span>
							<span class="app-badge {status.badge}">{status.label}</span>
							{#if risk.id_expired}
								<span class="app-badge app-badge-danger">Pièce expirée</span>
							{/if}
							{#if risk.review_overdue}
								<span class="app-badge app-badge-danger">Revue en retard</span>
							{/if}
						</div>
						<p class="mt-2 text-xs text-slate-500">
							{#if risk.last_verification_date}
								Vérifié le {formatDate(risk.last_verification_date)} · prochaine revue avant le
								{formatDate(risk.review_due_date)} (tous les {['HIGH', 'CRITICAL'].includes(
									risk.risk_level
								)
									? 12
									: risk.risk_level === 'MEDIUM'
										? 24
										: 36} mois à ce niveau de risque).
							{:else}
								Dossier jamais vérifié par la conformité.
							{/if}
						</p>
						{#if risk.factors.length}
							<ul class="mt-3 space-y-1.5 text-sm" data-testid="kyc-factors">
								{#each risk.factors as factor (factor.code)}
									{@const severity = factorSeverity(factor.severity)}
									<li class="flex items-start gap-2">
										<span class="app-badge {severity.badge} shrink-0">{severity.label}</span>
										<span class="text-slate-700">{factorText(factor.code, factor.reason)}</span>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="mt-3 text-sm text-emerald-700">Aucun facteur de risque sur le dossier.</p>
						{/if}
						{#if risk.override}
							<p
								class="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800"
							>
								Dérogation active, accordée par {risk.override.granted_by_name || 'la conformité'}
								: « {risk.override.reason} ». Valable jusqu'au {formatDate(
									risk.override.expires_at,
									{
										withTime: true
									}
								)} pour une seule opération.
							</p>
						{/if}
					</section>
				{/if}

				<section>
					<h3 class="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
						Pièce d'identité
					</h3>
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<label for="kyc-id-type" class="mb-2 block text-sm font-semibold text-slate-700"
								>Type de pièce {@render req()}</label
							>
							<select id="kyc-id-type" class={inputClass('id_type')} bind:value={identity.id_type}>
								<option value="">Sélectionner</option>
								{#each ID_TYPE_OPTIONS as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							{@render fieldError('id_type')}
						</div>
						<div>
							<label for="kyc-id-number" class="mb-2 block text-sm font-semibold text-slate-700"
								>Numéro de la pièce {@render req()}</label
							>
							<input
								id="kyc-id-number"
								class={inputClass('id_number')}
								bind:value={identity.id_number}
							/>
							{@render fieldError('id_number')}
						</div>
						<div>
							<label for="kyc-id-expiry" class="mb-2 block text-sm font-semibold text-slate-700">
								Date d'expiration {#if expiryRequired(identity.id_type)}{@render req()}{/if}
							</label>
							<input
								id="kyc-id-expiry"
								type="date"
								class={inputClass('id_expiry_date')}
								bind:value={identity.id_expiry_date}
							/>
							{#if errors.id_expiry_date}
								{@render fieldError('id_expiry_date')}
							{:else if isExpired(identity.id_expiry_date)}
								<p class="mt-1 text-sm text-red-600">Pièce expirée : demandez une pièce valide.</p>
							{/if}
						</div>
						<div>
							<label for="kyc-address" class="mb-2 block text-sm font-semibold text-slate-700"
								>Adresse</label
							>
							<input
								id="kyc-address"
								class="app-input"
								placeholder="Avenue, numéro, commune"
								bind:value={identity.address}
							/>
						</div>
						<div>
							<label for="kyc-email" class="mb-2 block text-sm font-semibold text-slate-700"
								>E-mail</label
							>
							<input
								id="kyc-email"
								type="email"
								class="app-input"
								placeholder="client@exemple.cd"
								bind:value={identity.email}
							/>
							{#if errors.email}
								{@render fieldError('email')}
							{:else}
								<p class="mt-1 text-xs text-slate-500">
									Facultatif : confirmations d'opération envoyées aussi par e-mail.
								</p>
							{/if}
						</div>
					</div>
				</section>

				<section>
					<h3 class="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
						Profil du client
					</h3>
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<label for="kyc-nature" class="mb-2 block text-sm font-semibold text-slate-700"
								>Nature {@render req()}</label
							>
							<select id="kyc-nature" class="app-input" bind:value={profile.legal_nature}>
								{#each LEGAL_NATURES as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="kyc-activity" class="mb-2 block text-sm font-semibold text-slate-700"
								>Profil d'activité {@render req()}</label
							>
							<select id="kyc-activity" class="app-input" bind:value={profile.activity_profile}>
								{#each ACTIVITY_PROFILES as option (option.value)}
									<option value={option.value} disabled={isEntity && option.value === 'PERSONAL'}
										>{option.label}</option
									>
								{/each}
							</select>
						</div>
						{#if isEntity}
							<div>
								<label for="kyc-company" class="mb-2 block text-sm font-semibold text-slate-700"
									>Raison sociale {@render req()}</label
								>
								<input
									id="kyc-company"
									class={inputClass('company_name')}
									bind:value={profile.company_name}
								/>
								{@render fieldError('company_name')}
							</div>
							<div>
								<label for="kyc-rccm" class="mb-2 block text-sm font-semibold text-slate-700"
									>RCCM / Id. Nat. {@render req()}</label
								>
								<input
									id="kyc-rccm"
									class={inputClass('registration_number')}
									bind:value={profile.registration_number}
								/>
								{@render fieldError('registration_number')}
							</div>
						{:else}
							<div>
								<label for="kyc-profession" class="mb-2 block text-sm font-semibold text-slate-700">
									Profession {#if needsProfession}{@render req()}{/if}
								</label>
								<input
									id="kyc-profession"
									class={inputClass('profession')}
									bind:value={profile.profession}
								/>
								{@render fieldError('profession')}
							</div>
							<div>
								<label for="kyc-employer" class="mb-2 block text-sm font-semibold text-slate-700"
									>Employeur</label
								>
								<input id="kyc-employer" class="app-input" bind:value={profile.employer} />
							</div>
						{/if}
						<div>
							<label for="kyc-sector" class="mb-2 block text-sm font-semibold text-slate-700"
								>Secteur d'activité {@render req()}</label
							>
							<select
								id="kyc-sector"
								class={inputClass('activity_sector')}
								bind:value={profile.activity_sector}
							>
								<option value="">Sélectionner</option>
								{#each SECTORS as option (option.value)}
									<option value={option.value}
										>{option.label}{option.sensitive ? ' (secteur sensible)' : ''}</option
									>
								{/each}
							</select>
							{@render fieldError('activity_sector')}
						</div>
						<div>
							<label for="kyc-nationality" class="mb-2 block text-sm font-semibold text-slate-700"
								>Nationalité {@render req()}</label
							>
							<select
								id="kyc-nationality"
								class={inputClass('nationality')}
								bind:value={profile.nationality}
							>
								<option value="">Sélectionner</option>
								{#each COUNTRIES as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							{@render fieldError('nationality')}
						</div>
						<div>
							<label for="kyc-residence" class="mb-2 block text-sm font-semibold text-slate-700"
								>Pays de résidence {@render req()}</label
							>
							<select
								id="kyc-residence"
								class={inputClass('residence_country')}
								bind:value={profile.residence_country}
							>
								<option value="">Sélectionner</option>
								{#each COUNTRIES as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
							{@render fieldError('residence_country')}
						</div>
					</div>
				</section>

				<section>
					<h3 class="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
						Fonds et opérations
					</h3>
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<label for="kyc-funds" class="mb-2 block text-sm font-semibold text-slate-700"
								>Origine des fonds {@render req()}</label
							>
							<input
								id="kyc-funds"
								class={inputClass('source_of_funds')}
								placeholder="Ex : salaire, commerce, transfert familial"
								bind:value={profile.source_of_funds}
							/>
							{@render fieldError('source_of_funds')}
						</div>
						<div>
							<label for="kyc-purpose" class="mb-2 block text-sm font-semibold text-slate-700"
								>Objet des opérations {@render req()}</label
							>
							<input
								id="kyc-purpose"
								class={inputClass('purpose_of_operations')}
								placeholder="Ex : frais scolaires, achats fournisseurs"
								bind:value={profile.purpose_of_operations}
							/>
							{@render fieldError('purpose_of_operations')}
						</div>
						<div>
							<label for="kyc-volume" class="mb-2 block text-sm font-semibold text-slate-700"
								>Volume mensuel attendu</label
							>
							<input
								id="kyc-volume"
								type="number"
								min="0"
								class={inputClass('expected_volume')}
								bind:value={profile.expected_volume}
							/>
							{@render fieldError('expected_volume')}
						</div>
						<div>
							<label for="kyc-frequency" class="mb-2 block text-sm font-semibold text-slate-700"
								>Opérations par mois attendues</label
							>
							<input
								id="kyc-frequency"
								type="number"
								min="0"
								class={inputClass('expected_frequency')}
								bind:value={profile.expected_frequency}
							/>
							{@render fieldError('expected_frequency')}
						</div>
					</div>
				</section>

				<section>
					<h3 class="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
						Vigilance
					</h3>
					<div class="grid gap-4 sm:grid-cols-2">
						<fieldset>
							<legend class="mb-2 block text-sm font-semibold text-slate-700">
								Personne politiquement exposée (PPE) {@render req()}
							</legend>
							<div class="flex gap-4 text-sm">
								<label class="flex items-center gap-2"
									><input type="radio" name="kyc-pep" value={false} bind:group={profile.is_pep} /> Non</label
								>
								<label class="flex items-center gap-2"
									><input type="radio" name="kyc-pep" value={true} bind:group={profile.is_pep} /> Oui</label
								>
							</div>
							<p class="mt-1 text-xs text-slate-500">
								Élu, haut fonctionnaire, magistrat, officier supérieur, dirigeant d'entreprise
								publique, ou un proche.
							</p>
						</fieldset>
						{#if profile.is_pep}
							<div>
								<label
									for="kyc-pep-function"
									class="mb-2 block text-sm font-semibold text-slate-700"
									>Fonction exercée {@render req()}</label
								>
								<input
									id="kyc-pep-function"
									class={inputClass('pep_function')}
									placeholder="Ex : député provincial"
									bind:value={profile.pep_function}
								/>
								{@render fieldError('pep_function')}
							</div>
						{/if}
						<fieldset class="sm:col-span-2">
							<legend class="mb-2 block text-sm font-semibold text-slate-700">
								Opère pour le compte d'un tiers {@render req()}
							</legend>
							<div class="flex gap-4 text-sm">
								<label class="flex items-center gap-2"
									><input
										type="radio"
										name="kyc-third"
										value={false}
										bind:group={profile.acts_for_third_party}
									/> Non</label
								>
								<label class="flex items-center gap-2"
									><input
										type="radio"
										name="kyc-third"
										value={true}
										bind:group={profile.acts_for_third_party}
									/> Oui (mandataire)</label
								>
							</div>
						</fieldset>
						{#if profile.acts_for_third_party}
							<div>
								<label for="kyc-third-name" class="mb-2 block text-sm font-semibold text-slate-700"
									>Nom du tiers {@render req()}</label
								>
								<input
									id="kyc-third-name"
									class={inputClass('third_party_name')}
									bind:value={profile.third_party_name}
								/>
								{@render fieldError('third_party_name')}
							</div>
							<div>
								<label for="kyc-third-id" class="mb-2 block text-sm font-semibold text-slate-700"
									>Pièce ou RCCM du tiers {@render req()}</label
								>
								<input
									id="kyc-third-id"
									class={inputClass('third_party_id_number')}
									bind:value={profile.third_party_id_number}
								/>
								{@render fieldError('third_party_id_number')}
							</div>
						{/if}
					</div>
				</section>

				{#if canVerify}
					<section
						class="rounded-lg border border-blue-100 bg-blue-50/50 p-4"
						data-testid="kyc-compliance"
					>
						<h3 class="text-sm font-semibold tracking-wide text-slate-500 uppercase">Conformité</h3>
						<div class="mt-3 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
							<div>
								<label for="kyc-status" class="mb-2 block text-sm font-semibold text-slate-700"
									>Statut du dossier</label
								>
								<select id="kyc-status" class="app-input" bind:value={newStatus}>
									<option value="UNVERIFIED">Non vérifié</option>
									<option value="PARTIALLY_VERIFIED">Partiel</option>
									<option value="VERIFIED">Vérifié</option>
									<option value="ENHANCED_VERIFICATION">Vérification renforcée</option>
								</select>
							</div>
							<button
								class="app-button app-button-secondary px-4 py-2"
								disabled={complianceBusy || !risk?.has_profile}
								title={!risk?.has_profile ? "Enregistrez d'abord le dossier" : ''}
								onclick={changeStatus}
							>
								Mettre à jour le statut
							</button>
						</div>
						<div class="mt-4">
							<label for="kyc-override" class="mb-2 block text-sm font-semibold text-slate-700">
								Dérogation (lève les blocages pour une opération, valable 24 h)
							</label>
							<textarea
								id="kyc-override"
								class="app-input min-h-20"
								placeholder="Motif : justificatifs vus, client connu…"
								bind:value={overrideReason}></textarea>
							<button
								class="app-button app-button-secondary mt-2 px-4 py-2"
								disabled={complianceBusy}
								onclick={grantOverride}
							>
								Accorder une dérogation
							</button>
						</div>
						{#if complianceError}
							<p class="mt-2 text-sm text-red-600" role="alert">{complianceError}</p>
						{/if}
					</section>
				{/if}

				{#if formError}
					<p class="text-sm text-red-600" role="alert">{formError}</p>
				{/if}
				{#if notice}
					<p class="text-sm text-emerald-700" role="status">{notice}</p>
				{/if}
			</div>

			<div class="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
				<button class="app-button app-button-secondary px-4 py-2" onclick={() => onClose(changed)}>
					Fermer
				</button>
				<button
					class="app-button rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					disabled={saving}
					onclick={save}
				>
					{saving ? 'Enregistrement…' : 'Enregistrer le dossier'}
				</button>
			</div>
		{/if}
	</div>
</div>
