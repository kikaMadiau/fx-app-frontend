<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		confirmTwoFactorSetup,
		deleteProfilePhoto,
		disableTwoFactor,
		getProfile,
		prepareProfilePhoto,
		startTwoFactorSetup,
		translateProfileError,
		updateNotifications,
		updateProfile,
		uploadProfilePhoto
	} from '$lib/api/profile.js';
	import { session, updateSessionTrader } from '$lib/stores/session.js';
	import { loadProfilePhoto, profilePhotoUrl, setProfilePhoto } from '$lib/stores/profile-photo.js';
	import { ID_TYPE_OPTIONS } from '$lib/utils/identity.js';
	import { KINSHASA_COMMUNES } from '$lib/utils/address.js';
	import { locationSharing, startSharing, stopSharing } from '$lib/stores/location-sharing.js';
	import { formatDate as formatPreferredDate } from '$lib/utils/dates.js';
	import { setPreferences } from '$lib/stores/preferences.js';
	import { formatPhoneDisplay } from '$lib/utils/phone.js';
	import type {
		NotificationPreferences,
		ProfileResponse,
		TwoFactorSetup
	} from '$lib/types/profile.js';

	const ROLE_LABELS: Record<string, string> = {
		TRADER: 'Cambiste',
		COMPLIANCE_OFFICER: 'Responsable conformité',
		SUPERVISOR: 'Superviseur',
		ADMIN: 'Administrateur'
	};

	const NOTIFICATION_ITEMS: {
		key: keyof NotificationPreferences;
		label: string;
		description: string;
	}[] = [
		{
			key: 'email',
			label: 'Notifications par email',
			description: 'Recevoir les alertes et mises à jour'
		},
		{
			key: 'sms',
			label: 'Notifications SMS',
			description: 'Recevoir les alertes urgentes par SMS'
		},
		{
			key: 'weekly_report',
			label: 'Rapports hebdomadaires',
			description: 'Recevoir un résumé chaque lundi'
		}
	];

	// Âge minimum 18 ans : date de naissance au plus tard aujourd'hui moins 18 ans.
	const maxBirthDate = (() => {
		const d = new Date();
		d.setFullYear(d.getFullYear() - 18);
		return d.toISOString().slice(0, 10);
	})();

	let data = $state<ProfileResponse | null>(null);
	let loadError = $state('');
	let form = $state(emptyForm());
	let saving = $state(false);
	let saveMessage = $state<{ kind: 'ok' | 'error'; text: string } | null>(null);

	let photoBusy = $state(false);
	let photoError = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);

	let notifications = $state<NotificationPreferences>({
		email: true,
		sms: false,
		weekly_report: true
	});
	let notifSaving = $state<string | null>(null);
	let notifError = $state('');

	// Double authentification : null = fermé, sinon étape en cours.
	let twoFactorStep = $state<null | 'scan' | 'codes' | 'disable'>(null);
	let setup = $state<TwoFactorSetup | null>(null);
	let twoFactorCode = $state('');
	let recoveryCodes = $state<string[]>([]);
	let twoFactorBusy = $state(false);
	let twoFactorError = $state('');
	let copied = $state(false);

	function emptyForm() {
		return {
			first_name: '',
			last_name: '',
			phone: '',
			exchange_office: '',
			birth_date: '',
			id_type: '',
			id_number: '',
			gender: '',
			address: { commune: '', quartier: '', avenue: '', number: '', reference: '' }
		};
	}

	function fillForm(response: ProfileResponse) {
		form = {
			first_name: response.trader.first_name ?? '',
			last_name: response.trader.last_name ?? '',
			phone: response.trader.phone ? formatPhoneDisplay(response.trader.phone) : '',
			exchange_office: response.exchange_office ?? '',
			birth_date: response.profile.birth_date ?? '',
			id_type: response.profile.id_type ?? '',
			id_number: response.profile.id_number ?? '',
			gender: response.profile.gender ?? '',
			address: {
				commune: response.profile.address?.commune ?? '',
				quartier: response.profile.address?.quartier ?? '',
				avenue: response.profile.address?.avenue ?? '',
				number: response.profile.address?.number ?? '',
				reference: response.profile.address?.reference ?? ''
			}
		};
		sharingOn = response.profile.location?.sharing ?? false;
		sharingAt = response.profile.location?.at ?? null;
		notifications = { ...response.profile.notifications };
	}

	function apply(response: ProfileResponse) {
		data = response;
		fillForm(response);
		updateSessionTrader(response.trader);
		if (response.profile.preferences) setPreferences(response.profile.preferences);
	}

	let deviceLabel = $state('');

	onMount(async () => {
		deviceLabel = describeDevice(navigator.userAgent);
		if (!$session) {
			await goto(resolve('/login'));
			return;
		}
		try {
			apply(await getProfile());
			await loadProfilePhoto();
		} catch (error) {
			loadError = translateProfileError(error);
		}
	});

	const fullName = $derived(
		data
			? `${data.trader.first_name ?? ''} ${data.trader.last_name ?? ''}`.trim() || data.trader.email
			: ''
	);
	const initials = $derived(
		(fullName || 'FX')
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('')
	);
	const idTypeLabel = $derived(
		ID_TYPE_OPTIONS.find((option) => option.value === data?.profile.id_type)?.label ?? ''
	);

	// Dates affichées selon le fuseau et le format choisis dans Paramètres.
	function formatDate(value: string | null | undefined, withTime = false): string {
		return formatPreferredDate(value, { withTime });
	}

	function describeDevice(userAgent: string): string {
		const browser = /Edg\//.test(userAgent)
			? 'Edge'
			: /OPR\//.test(userAgent)
				? 'Opera'
				: /Chrome\//.test(userAgent)
					? 'Chrome'
					: /Firefox\//.test(userAgent)
						? 'Firefox'
						: /Safari\//.test(userAgent)
							? 'Safari'
							: 'Navigateur';
		const system = /Android/.test(userAgent)
			? 'Android'
			: /iPhone|iPad/.test(userAgent)
				? 'iPhone / iPad'
				: /Windows/.test(userAgent)
					? 'Windows'
					: /Mac OS X/.test(userAgent)
						? 'macOS'
						: /Linux/.test(userAgent)
							? 'Linux'
							: 'appareil inconnu';
		return `${browser} sur ${system}`;
	}

	// Partage de la position avec l'administration (facultatif).
	let sharingOn = $state(false);
	let sharingAt = $state<string | null>(null);
	let sharingBusy = $state(false);
	let sharingError = $state('');

	async function toggleSharing() {
		sharingBusy = true;
		sharingError = '';
		try {
			if (sharingOn) {
				await stopSharing();
				sharingOn = false;
				sharingAt = null;
			} else {
				await startSharing();
				sharingOn = true;
				sharingAt = new Date().toISOString();
			}
		} catch (error) {
			sharingError = error instanceof Error ? error.message : String(error);
		} finally {
			sharingBusy = false;
		}
	}

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		saveMessage = null;
		saving = true;
		try {
			apply(await updateProfile({ ...form }));
			saveMessage = { kind: 'ok', text: 'Vos informations ont été enregistrées.' };
		} catch (error) {
			saveMessage = { kind: 'error', text: translateProfileError(error) };
		} finally {
			saving = false;
		}
	}

	function cancelEdit() {
		if (data) fillForm(data);
		saveMessage = null;
	}

	async function onPhotoSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		photoError = '';
		photoBusy = true;
		try {
			const prepared = await prepareProfilePhoto(file);
			apply(await uploadProfilePhoto(prepared));
			setProfilePhoto(prepared);
		} catch (error) {
			photoError = translateProfileError(error);
		} finally {
			photoBusy = false;
		}
	}

	async function removePhoto() {
		photoError = '';
		photoBusy = true;
		try {
			await deleteProfilePhoto();
			setProfilePhoto(null);
			if (data) data.profile.has_photo = false;
		} catch (error) {
			photoError = translateProfileError(error);
		} finally {
			photoBusy = false;
		}
	}

	async function toggleNotification(key: keyof NotificationPreferences) {
		const previous = { ...notifications };
		notifications[key] = !notifications[key];
		notifError = '';
		notifSaving = key;
		try {
			notifications = await updateNotifications({ ...notifications });
		} catch (error) {
			notifications = previous;
			notifError = translateProfileError(error);
		} finally {
			notifSaving = null;
		}
	}

	function closeTwoFactor() {
		twoFactorStep = null;
		setup = null;
		twoFactorCode = '';
		twoFactorError = '';
		recoveryCodes = [];
		copied = false;
	}

	async function onTwoFactorToggle() {
		twoFactorError = '';
		twoFactorCode = '';
		if (data?.profile.two_factor_enabled) {
			twoFactorStep = 'disable';
			return;
		}
		twoFactorBusy = true;
		try {
			setup = await startTwoFactorSetup();
			twoFactorStep = 'scan';
		} catch (error) {
			twoFactorError = translateProfileError(error);
		} finally {
			twoFactorBusy = false;
		}
	}

	async function confirmTwoFactor(event: SubmitEvent) {
		event.preventDefault();
		twoFactorError = '';
		twoFactorBusy = true;
		try {
			const result = await confirmTwoFactorSetup(twoFactorCode.trim());
			recoveryCodes = result.recovery_codes;
			twoFactorStep = 'codes';
			apply(await getProfile());
		} catch (error) {
			twoFactorError = translateProfileError(error);
		} finally {
			twoFactorBusy = false;
		}
	}

	async function confirmDisable(event: SubmitEvent) {
		event.preventDefault();
		twoFactorError = '';
		twoFactorBusy = true;
		try {
			await disableTwoFactor(twoFactorCode.trim());
			apply(await getProfile());
			closeTwoFactor();
		} catch (error) {
			twoFactorError = translateProfileError(error);
		} finally {
			twoFactorBusy = false;
		}
	}

	async function copyRecoveryCodes() {
		try {
			await navigator.clipboard.writeText(recoveryCodes.join('\n'));
			copied = true;
		} catch {
			copied = false;
		}
	}

	function downloadRecoveryCodes() {
		const text = [
			'MOTUYA Fx. – Codes de secours (double authentification)',
			`Compte : ${data?.trader.email ?? ''}`,
			'Chaque code ne peut servir qu’une seule fois. Gardez ce fichier en lieu sûr.',
			'',
			...recoveryCodes
		].join('\r\n');
		const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = 'fx-codes-de-secours.txt';
		link.click();
		URL.revokeObjectURL(url);
	}

	const groupedSecret = $derived(setup?.secret.match(/.{1,4}/g)?.join(' ') ?? '');
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<h1 class="app-title">Mon profil</h1>
			<p class="app-subtitle">Gérez vos informations personnelles et préférences.</p>
		</div>
	</div>

	{#if loadError}
		<div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
			{loadError}
		</div>
	{:else if !data}
		<p class="text-sm text-slate-500">Chargement du profil…</p>
	{:else}
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Carte d'identité du cambiste -->
			<div class="lg:col-span-1">
				<div class="app-card p-6 text-center">
					<div class="relative mx-auto mb-4 h-28 w-28">
						{#if $profilePhotoUrl}
							<img
								src={$profilePhotoUrl}
								alt="Photo de {fullName}"
								class="h-28 w-28 rounded-2xl object-cover shadow-lg shadow-blue-500/20"
							/>
						{:else}
							<div
								class="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-3xl font-bold text-white shadow-lg shadow-blue-500/20"
								aria-hidden="true"
							>
								{initials}
							</div>
						{/if}
						{#if photoBusy}
							<div
								class="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-xs font-semibold text-slate-700"
							>
								Envoi…
							</div>
						{/if}
					</div>

					<input
						bind:this={fileInput}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						class="hidden"
						onchange={onPhotoSelected}
					/>
					<div class="flex flex-wrap justify-center gap-2">
						<button
							type="button"
							class="app-button app-button-secondary px-4 py-2 text-sm"
							disabled={photoBusy}
							onclick={() => fileInput?.click()}
						>
							{data.profile.has_photo ? 'Changer la photo' : 'Ajouter une photo'}
						</button>
						{#if data.profile.has_photo}
							<button
								type="button"
								class="rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
								disabled={photoBusy}
								onclick={removePhoto}
							>
								Supprimer
							</button>
						{/if}
					</div>
					<p class="mt-2 text-xs text-slate-400">
						JPEG, PNG ou WebP. Recadrée en carré automatiquement.
					</p>
					{#if photoError}
						<p class="mt-2 text-sm text-red-600">{photoError}</p>
					{/if}

					<h2 class="mt-5 text-xl font-bold text-slate-950">{fullName}</h2>
					<p class="mt-1 text-sm text-slate-500">
						{ROLE_LABELS[data.trader.role] ?? data.trader.role}
					</p>
					{#if data.trader.created_at}
						<p class="mt-2 text-xs text-slate-400">
							Membre depuis le {formatDate(data.trader.created_at)}
						</p>
					{/if}

					<div class="mt-6 space-y-3 border-t border-slate-100 pt-6 text-left">
						<div class="flex items-center gap-3 text-sm text-slate-600">
							<svg
								class="h-4 w-4 flex-shrink-0"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								/>
							</svg>
							<span class="truncate">{data.trader.email}</span>
						</div>
						{#if data.trader.phone}
							<div class="flex items-center gap-3 text-sm text-slate-600">
								<svg
									class="h-4 w-4 flex-shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
									/>
								</svg>
								<span>{formatPhoneDisplay(data.trader.phone)}</span>
							</div>
						{/if}
						{#if data.exchange_office}
							<div class="flex items-center gap-3 text-sm text-slate-600">
								<svg
									class="h-4 w-4 flex-shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"
									/>
								</svg>
								<span>{data.exchange_office}</span>
							</div>
						{/if}
						{#if idTypeLabel}
							<div class="flex items-center gap-3 text-sm text-slate-600">
								<svg
									class="h-4 w-4 flex-shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<rect x="3" y="5" width="18" height="14" rx="2" stroke-width="2" />
									<path
										stroke-linecap="round"
										stroke-width="2"
										d="M7 15c.5-1.5 1.7-2 3-2s2.5.5 3 2M10 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM15 10h3M15 13h3"
									/>
								</svg>
								<span>{idTypeLabel} · {data.profile.id_number}</span>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<div class="space-y-6 lg:col-span-2">
				<!-- Informations personnelles -->
				<form class="app-card p-6" onsubmit={saveProfile}>
					<div class="mb-6 border-b border-slate-100 pb-4">
						<h3 class="text-lg font-semibold text-slate-950">Informations personnelles</h3>
						<p class="mt-1 text-sm text-slate-500">Mettez à jour vos coordonnées.</p>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-2">
							<label for="first_name" class="text-sm font-medium text-slate-700">Prénom</label>
							<input
								id="first_name"
								class="app-input"
								autocomplete="given-name"
								required
								maxlength="100"
								bind:value={form.first_name}
							/>
						</div>
						<div class="space-y-2">
							<label for="last_name" class="text-sm font-medium text-slate-700">Nom</label>
							<input
								id="last_name"
								class="app-input"
								autocomplete="family-name"
								required
								maxlength="100"
								bind:value={form.last_name}
							/>
						</div>
						<div class="space-y-2">
							<label for="email" class="text-sm font-medium text-slate-700">Email</label>
							<input
								id="email"
								type="email"
								class="app-input bg-slate-50 text-slate-500"
								value={data.trader.email}
								readonly
							/>
							<p class="text-xs text-slate-400">
								Identifiant de connexion, modifiable par un administrateur.
							</p>
						</div>
						<div class="space-y-2">
							<label for="phone" class="text-sm font-medium text-slate-700">Téléphone</label>
							<input
								id="phone"
								type="tel"
								class="app-input"
								autocomplete="tel"
								placeholder="+243 812 345 678"
								bind:value={form.phone}
							/>
						</div>
						<div class="space-y-2">
							<label for="birth_date" class="text-sm font-medium text-slate-700"
								>Date de naissance</label
							>
							<input
								id="birth_date"
								type="date"
								class="app-input"
								max={maxBirthDate}
								min="1906-01-01"
								bind:value={form.birth_date}
							/>
						</div>
						<div class="space-y-2">
							<label for="exchange_office" class="text-sm font-medium text-slate-700"
								>Bureau de change</label
							>
							<input
								id="exchange_office"
								class="app-input"
								maxlength="120"
								placeholder="Nom du bureau de change"
								bind:value={form.exchange_office}
							/>
						</div>
						<div class="space-y-2">
							<label for="id_type" class="text-sm font-medium text-slate-700"
								>Pièce d'identité</label
							>
							<select id="id_type" class="app-input" bind:value={form.id_type}>
								<option value="">Aucune</option>
								{#each ID_TYPE_OPTIONS as option (option.value)}
									<option value={option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
						<div class="space-y-2">
							<label for="id_number" class="text-sm font-medium text-slate-700"
								>Numéro de la pièce</label
							>
							<input
								id="id_number"
								class="app-input"
								maxlength="60"
								placeholder="Ex. 0123-4567-8901"
								disabled={!form.id_type}
								required={!!form.id_type}
								bind:value={form.id_number}
							/>
						</div>
						<fieldset class="space-y-2">
							<legend class="text-sm font-medium text-slate-700">Sexe</legend>
							<div class="flex gap-3" data-testid="gender">
								{#each [{ v: 'M', l: 'Homme' }, { v: 'F', l: 'Femme' }] as g (g.v)}
									<label
										class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors {form.gender ===
										g.v
											? 'border-blue-600 bg-blue-50 text-blue-700'
											: 'border-slate-200 text-slate-600 hover:bg-slate-50'}"
									>
										<input
											type="radio"
											name="gender"
											value={g.v}
											class="sr-only"
											bind:group={form.gender}
										/>
										{g.l}
									</label>
								{/each}
							</div>
						</fieldset>
					</div>

					<div class="mt-8 mb-4 border-b border-slate-100 pb-3">
						<h4 class="text-base font-semibold text-slate-950">Adresse</h4>
						<p class="mt-1 text-sm text-slate-500">
							Où vous habitez (visible par l’administration).
						</p>
					</div>
					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-2">
							<label for="addr_commune" class="text-sm font-medium text-slate-700">Commune</label>
							<input
								id="addr_commune"
								class="app-input"
								list="communes"
								maxlength="80"
								placeholder="Choisir ou écrire"
								bind:value={form.address.commune}
							/>
							<datalist id="communes">
								{#each KINSHASA_COMMUNES as commune (commune)}
									<option value={commune}></option>
								{/each}
							</datalist>
						</div>
						<div class="space-y-2">
							<label for="addr_quartier" class="text-sm font-medium text-slate-700">Quartier</label>
							<input
								id="addr_quartier"
								class="app-input"
								maxlength="80"
								bind:value={form.address.quartier}
							/>
						</div>
						<div class="space-y-2">
							<label for="addr_avenue" class="text-sm font-medium text-slate-700"
								>Avenue / rue</label
							>
							<input
								id="addr_avenue"
								class="app-input"
								maxlength="120"
								bind:value={form.address.avenue}
							/>
						</div>
						<div class="space-y-2">
							<label for="addr_number" class="text-sm font-medium text-slate-700">Numéro</label>
							<input
								id="addr_number"
								class="app-input"
								maxlength="20"
								bind:value={form.address.number}
							/>
						</div>
						<div class="space-y-2 sm:col-span-2">
							<label for="addr_reference" class="text-sm font-medium text-slate-700"
								>Point de repère <span class="font-normal text-slate-400">(facultatif)</span></label
							>
							<input
								id="addr_reference"
								class="app-input"
								maxlength="160"
								placeholder="Ex. en face de l’école, près du marché…"
								bind:value={form.address.reference}
							/>
						</div>
					</div>

					{#if saveMessage}
						<p
							class="mt-5 rounded-xl px-4 py-3 text-sm {saveMessage.kind === 'ok'
								? 'bg-green-50 text-green-700'
								: 'bg-red-50 text-red-700'}"
							role="status"
						>
							{saveMessage.text}
						</p>
					{/if}

					<div class="mt-6 flex flex-wrap items-center justify-end gap-3">
						<button
							type="button"
							class="app-button app-button-secondary"
							onclick={cancelEdit}
							disabled={saving}>Annuler</button
						>
						<button type="submit" class="app-button app-button-primary" disabled={saving}>
							{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
						</button>
					</div>
				</form>

				<!-- Partage de la position -->
				<div class="app-card p-6" data-testid="location-card">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0 flex-1">
							<h3 class="text-lg font-semibold text-slate-950">Partager ma position</h3>
							<p class="mt-1 text-sm text-slate-500">
								L’administration voit où vous êtes pendant que l’application est ouverte. Vous
								pouvez arrêter à tout moment.
							</p>
							{#if sharingOn}
								<p class="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-700">
									<span class="h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
									Partage activé{#if $locationSharing.lastSentAt}
										· envoyée à {$locationSharing.lastSentAt.toLocaleTimeString('fr-FR', {
											hour: '2-digit',
											minute: '2-digit'
										})}{:else if sharingAt}
										· dernière position le {formatPreferredDate(sharingAt, { withTime: true })}{/if}
								</p>
							{/if}
							{#if sharingError || $locationSharing.error}
								<p
									class="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"
									role="alert"
								>
									{sharingError || $locationSharing.error}
								</p>
							{/if}
						</div>
						<button
							type="button"
							class="app-button {sharingOn ? 'app-button-secondary' : 'app-button-primary'}"
							disabled={sharingBusy}
							onclick={toggleSharing}
							data-testid="location-toggle"
						>
							{sharingBusy
								? 'Un instant…'
								: sharingOn
									? 'Arrêter le partage'
									: 'Activer le partage'}
						</button>
					</div>
				</div>

				<!-- Préférences de notification -->
				<div class="app-card p-6">
					<div class="mb-6 border-b border-slate-100 pb-4">
						<h3 class="text-lg font-semibold text-slate-950">Préférences de notification</h3>
						<p class="mt-1 text-sm text-slate-500">
							Gérez vos alertes et notifications. Enregistrement automatique.
						</p>
					</div>

					<div class="space-y-4">
						{#each NOTIFICATION_ITEMS as item (item.key)}
							<div class="flex items-start justify-between gap-4 rounded-2xl bg-slate-50/50 p-4">
								<div class="flex-1">
									<p id="notif-{item.key}" class="font-medium text-slate-950">{item.label}</p>
									<p class="mt-1 text-sm text-slate-500">{item.description}</p>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={notifications[item.key]}
									aria-labelledby="notif-{item.key}"
									disabled={notifSaving === item.key}
									onclick={() => toggleNotification(item.key)}
									class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60 {notifications[
										item.key
									]
										? 'bg-blue-600'
										: 'bg-slate-200'}"
								>
									<span
										class="pointer-events-none absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 {notifications[
											item.key
										]
											? 'translate-x-5'
											: 'translate-x-0'}"
									></span>
								</button>
							</div>
						{/each}
					</div>
					{#if notifError}
						<p class="mt-4 text-sm text-red-600">{notifError}</p>
					{/if}
				</div>

				<!-- Sécurité -->
				<div id="securite" class="app-card scroll-mt-24 p-6">
					<div class="mb-6 border-b border-slate-100 pb-4">
						<h3 class="text-lg font-semibold text-slate-950">Sécurité</h3>
						<p class="mt-1 text-sm text-slate-500">
							Gérez les paramètres de sécurité de votre compte.
						</p>
					</div>

					<div class="space-y-4">
						<div class="flex items-start justify-between gap-4 rounded-2xl bg-slate-50/50 p-4">
							<div class="flex-1">
								<p id="twofa-label" class="font-medium text-slate-950">
									Authentification à deux facteurs
								</p>
								<p class="mt-1 text-sm text-slate-500">
									{#if data.profile.two_factor_enabled}
										Activée : un code de votre application est demandé à chaque connexion.
										<span class="text-slate-400"
											>({data.profile.recovery_codes_left} code{data.profile.recovery_codes_left > 1
												? 's'
												: ''} de secours restant{data.profile.recovery_codes_left > 1
												? 's'
												: ''})</span
										>
									{:else}
										Ajoutez une couche de sécurité à votre compte avec une application comme Google
										Authenticator ou Microsoft Authenticator.
									{/if}
								</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={data.profile.two_factor_enabled}
								aria-labelledby="twofa-label"
								disabled={twoFactorBusy}
								onclick={onTwoFactorToggle}
								class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-60 {data
									.profile.two_factor_enabled
									? 'bg-blue-600'
									: 'bg-slate-200'}"
							>
								<span
									class="pointer-events-none absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 {data
										.profile.two_factor_enabled
										? 'translate-x-5'
										: 'translate-x-0'}"
								></span>
							</button>
						</div>
						{#if twoFactorError && !twoFactorStep}
							<p class="text-sm text-red-600">{twoFactorError}</p>
						{/if}

						<div class="grid gap-3 sm:grid-cols-2">
							<div>
								<p class="text-sm font-medium text-slate-500">Dernière connexion</p>
								<p class="mt-1 text-sm text-slate-950">
									{formatDate(data.profile.previous_login_at, true) || 'Première connexion'}
								</p>
							</div>
							<div>
								<p class="text-sm font-medium text-slate-500">Session actuelle</p>
								<p class="mt-1 text-sm text-slate-950">
									{deviceLabel}{data.profile.last_login_at
										? ` · depuis le ${formatDate(data.profile.last_login_at, true)}`
										: ''}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</section>

{#if twoFactorStep}
	<div class="app-modal-backdrop" role="presentation">
		<div
			class="app-modal max-w-md p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby="twofa-title"
		>
			{#if twoFactorStep === 'scan' && setup}
				<h2 id="twofa-title" class="text-lg font-semibold text-slate-950">
					Activer la double authentification
				</h2>
				<ol class="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
					<li>Installez Google Authenticator ou Microsoft Authenticator sur votre téléphone.</li>
					<li>Dans l'application, ajoutez un compte en scannant ce QR code.</li>
					<li>Saisissez le code à 6 chiffres affiché pour confirmer.</li>
				</ol>
				<img
					src={setup.qr_code}
					alt="QR code à scanner avec votre application"
					class="mx-auto mt-4 h-48 w-48 rounded-xl border border-slate-100"
				/>
				<p class="mt-3 text-center text-xs text-slate-500">
					Impossible de scanner ? Sur ce téléphone :
					<a href={setup.otpauth_url} class="font-semibold text-blue-600 hover:underline"
						>ouvrir dans l'application</a
					>, ou saisissez la clé :
				</p>
				<p
					class="mt-1 text-center font-mono text-sm font-semibold tracking-wider break-all text-slate-800 select-all"
				>
					{groupedSecret}
				</p>
				<form class="mt-5" onsubmit={confirmTwoFactor}>
					<label for="twofa-code" class="text-sm font-medium text-slate-700"
						>Code de vérification</label
					>
					<input
						id="twofa-code"
						class="app-input mt-2 text-center text-lg tracking-[0.3em]"
						inputmode="numeric"
						autocomplete="one-time-code"
						maxlength="7"
						placeholder="123456"
						required
						bind:value={twoFactorCode}
					/>
					{#if twoFactorError}
						<p class="mt-2 text-sm text-red-600">{twoFactorError}</p>
					{/if}
					<div class="mt-5 flex justify-end gap-3">
						<button type="button" class="app-button app-button-secondary" onclick={closeTwoFactor}
							>Annuler</button
						>
						<button type="submit" class="app-button app-button-primary" disabled={twoFactorBusy}>
							{twoFactorBusy ? 'Vérification…' : 'Activer'}
						</button>
					</div>
				</form>
			{:else if twoFactorStep === 'codes'}
				<h2 id="twofa-title" class="text-lg font-semibold text-slate-950">
					Double authentification activée
				</h2>
				<p class="mt-2 text-sm text-slate-600">
					Notez ces <strong>codes de secours</strong> et gardez-les en lieu sûr. Si vous perdez
					votre téléphone, chacun permet de se connecter <strong>une seule fois</strong>. Ils ne
					seront plus affichés.
				</p>
				<ul
					class="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 font-mono text-sm text-slate-800"
				>
					{#each recoveryCodes as code (code)}
						<li class="text-center">{code}</li>
					{/each}
				</ul>
				<div class="mt-4 flex flex-wrap gap-2">
					<button
						type="button"
						class="app-button app-button-secondary px-4 py-2 text-sm"
						onclick={copyRecoveryCodes}
					>
						{copied ? 'Copiés ✓' : 'Copier'}
					</button>
					<button
						type="button"
						class="app-button app-button-secondary px-4 py-2 text-sm"
						onclick={downloadRecoveryCodes}
					>
						Télécharger (.txt)
					</button>
				</div>
				<div class="mt-5 flex justify-end">
					<button type="button" class="app-button app-button-primary" onclick={closeTwoFactor}
						>J'ai noté mes codes</button
					>
				</div>
			{:else if twoFactorStep === 'disable'}
				<h2 id="twofa-title" class="text-lg font-semibold text-slate-950">
					Désactiver la double authentification
				</h2>
				<p class="mt-2 text-sm text-slate-600">
					Pour confirmer, saisissez le code de votre application ou un code de secours. Votre compte
					ne sera ensuite protégé que par le mot de passe.
				</p>
				<form class="mt-4" onsubmit={confirmDisable}>
					<label for="twofa-disable-code" class="text-sm font-medium text-slate-700">Code</label>
					<input
						id="twofa-disable-code"
						class="app-input mt-2 text-center text-lg tracking-[0.2em]"
						autocomplete="one-time-code"
						maxlength="11"
						placeholder="123456"
						required
						bind:value={twoFactorCode}
					/>
					{#if twoFactorError}
						<p class="mt-2 text-sm text-red-600">{twoFactorError}</p>
					{/if}
					<div class="mt-5 flex justify-end gap-3">
						<button type="button" class="app-button app-button-secondary" onclick={closeTwoFactor}
							>Annuler</button
						>
						<button type="submit" class="app-button app-button-danger" disabled={twoFactorBusy}>
							{twoFactorBusy ? 'Vérification…' : 'Désactiver'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
