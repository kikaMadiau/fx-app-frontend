<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		changePassword,
		getProfile,
		translateProfileError,
		updatePreferences
	} from '$lib/api/profile.js';
	import { clearSession, session } from '$lib/stores/session.js';
	import { setProfilePhoto } from '$lib/stores/profile-photo.js';
	import {
		DEFAULT_PREFERENCES,
		preferences,
		setPreferences,
		type Preferences,
		type Theme
	} from '$lib/stores/preferences.js';
	import { formatDate } from '$lib/utils/dates.js';
	import NotificationSettingsCard from '$lib/components/admin/NotificationSettingsCard.svelte';
	import { isPlatformAdmin } from '$lib/types/trader.js';

	const CURRENCIES = [
		{ value: 'USD', label: 'USD – Dollar américain' },
		{ value: 'EUR', label: 'EUR – Euro' },
		{ value: 'GBP', label: 'GBP – Livre sterling' }
	];
	// La RDC a deux fuseaux horaires.
	const TIMEZONES = [
		{ value: 'Africa/Kinshasa', label: 'Kinshasa – ouest (UTC+1)' },
		{ value: 'Africa/Lubumbashi', label: 'Lubumbashi – est (UTC+2)' }
	];
	const DATE_FORMATS = [
		{ value: 'DD/MM/YYYY', label: 'JJ/MM/AAAA' },
		{ value: 'YYYY-MM-DD', label: 'AAAA-MM-JJ' },
		{ value: 'LONG', label: 'En toutes lettres' }
	];
	const THEMES: { value: Theme; label: string; description: string; swatch: string }[] = [
		{ value: 'light', label: 'Clair', description: 'Mode clair par défaut', swatch: 'bg-blue-600' },
		{
			value: 'dark',
			label: 'Sombre',
			description: 'Repose les yeux le soir',
			swatch: 'bg-slate-950 ring-1 ring-slate-500'
		},
		{
			value: 'system',
			label: 'Système',
			description: "Suit le réglage de l'appareil",
			swatch: 'bg-gradient-to-br from-slate-200 to-slate-800'
		}
	];

	let form = $state<Preferences>({ ...$preferences });
	let saving = $state(false);
	let message = $state<{ kind: 'ok' | 'error'; text: string } | null>(null);
	let themeSaving = $state(false);
	let themeError = $state('');

	// Mot de passe
	let passwordOpen = $state(false);
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordBusy = $state(false);
	let passwordError = $state('');
	let passwordDone = $state(false);
	const mandatoryPasswordChange = $derived($session?.trader.must_change_password === true);

	const dirty = $derived(
		form.currency !== $preferences.currency ||
			form.timezone !== $preferences.timezone ||
			form.date_format !== $preferences.date_format ||
			form.dashboard_alerts !== $preferences.dashboard_alerts
	);
	const now = new Date();
	const datePreview = $derived(
		formatDate(now, { withTime: true, timezone: form.timezone, dateFormat: form.date_format })
	);

	onMount(async () => {
		if (!$session) {
			await goto(resolve('/login'));
			return;
		}
		try {
			if ($session?.trader.must_change_password) openPassword();
			const response = await getProfile();
			if (response.profile.preferences) {
				setPreferences(response.profile.preferences);
				form = { ...response.profile.preferences };
			}
		} catch (error) {
			message = { kind: 'error', text: translateProfileError(error) };
		}
	});

	async function save(next: Preferences) {
		const saved = await updatePreferences(next);
		setPreferences(saved);
		return saved;
	}

	async function saveGeneral(event: SubmitEvent) {
		event.preventDefault();
		message = null;
		saving = true;
		try {
			const saved = await save({ ...$preferences, ...form, theme: $preferences.theme });
			form = { ...saved };
			message = { kind: 'ok', text: 'Préférences enregistrées.' };
		} catch (error) {
			message = { kind: 'error', text: translateProfileError(error) };
		} finally {
			saving = false;
		}
	}

	function cancel() {
		form = { ...$preferences };
		message = null;
	}

	function restoreDefaults() {
		form = { ...DEFAULT_PREFERENCES, theme: $preferences.theme };
		message = null;
	}

	// Le thème s'applique et s'enregistre dès le clic.
	async function chooseTheme(theme: Theme) {
		if (theme === $preferences.theme) return;
		const previous = $preferences;
		themeError = '';
		themeSaving = true;
		setPreferences({ ...previous, theme });
		try {
			await save({ ...previous, theme });
		} catch (error) {
			setPreferences(previous);
			themeError = translateProfileError(error);
		} finally {
			themeSaving = false;
		}
	}

	function openPassword() {
		passwordOpen = true;
		passwordDone = false;
		passwordError = '';
		currentPassword = newPassword = confirmPassword = '';
	}

	async function submitPassword(event: SubmitEvent) {
		event.preventDefault();
		passwordError = '';
		if (newPassword.length < 12) {
			passwordError = 'Le nouveau mot de passe doit contenir au moins 12 caractères.';
			return;
		}
		if (newPassword !== confirmPassword) {
			passwordError = 'Les deux nouveaux mots de passe ne correspondent pas.';
			return;
		}
		passwordBusy = true;
		try {
			await changePassword(currentPassword, newPassword);
			passwordDone = true;
			currentPassword = newPassword = confirmPassword = '';
		} catch (error) {
			passwordError = translateProfileError(error);
		} finally {
			passwordBusy = false;
		}
	}

	async function logout() {
		clearSession();
		setProfilePhoto(null);
		await goto(resolve('/login'));
	}
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<h1 class="app-title">Paramètres</h1>
			<p class="app-subtitle">Affichage, apparence et sécurité de votre compte.</p>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-2">
			{#if isPlatformAdmin($session?.trader)}
				<NotificationSettingsCard />
			{/if}

			<!-- Préférences générales -->
			<form class="app-card p-6" onsubmit={saveGeneral}>
				<div class="mb-6 border-b border-slate-100 pb-4">
					<h3 class="text-lg font-semibold text-slate-950">Préférences générales</h3>
					<p class="mt-1 text-sm text-slate-500">Appliquées sur tous vos appareils.</p>
				</div>

				<div class="grid gap-5 sm:grid-cols-2">
					<div class="space-y-2">
						<label for="currency" class="text-sm font-medium text-slate-700"
							>Devise par défaut des opérations</label
						>
						<select id="currency" class="app-input" bind:value={form.currency}>
							{#each CURRENCIES as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
						<p class="text-xs text-slate-400">
							Proposée en premier dans « Nouvelle transaction ». La contre-valeur reste en CDF.
						</p>
					</div>
					<div class="space-y-2">
						<label for="timezone" class="text-sm font-medium text-slate-700">Fuseau horaire</label>
						<select id="timezone" class="app-input" bind:value={form.timezone}>
							{#each TIMEZONES as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-2">
						<label for="date_format" class="text-sm font-medium text-slate-700"
							>Format de date</label
						>
						<select id="date_format" class="app-input" bind:value={form.date_format}>
							{#each DATE_FORMATS as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-2">
						<p class="text-sm font-medium text-slate-700">Aperçu</p>
						<p
							class="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-950"
							data-testid="date-preview"
						>
							{datePreview}
						</p>
					</div>
				</div>

				<div class="mt-5 flex items-start justify-between gap-4 rounded-2xl bg-slate-50/50 p-4">
					<div class="flex-1">
						<p id="dashboard-alerts-label" class="font-medium text-slate-950">
							Alertes sur le tableau de bord
						</p>
						<p class="mt-1 text-sm text-slate-500">
							Afficher le nombre d'alertes ouvertes sur la page d'accueil.
						</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={form.dashboard_alerts}
						aria-labelledby="dashboard-alerts-label"
						onclick={() => (form.dashboard_alerts = !form.dashboard_alerts)}
						class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none {form.dashboard_alerts
							? 'bg-blue-600'
							: 'bg-slate-200'}"
					>
						<span
							class="pointer-events-none absolute top-0.5 left-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 {form.dashboard_alerts
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</button>
				</div>

				{#if message}
					<p
						class="mt-5 rounded-xl px-4 py-3 text-sm {message.kind === 'ok'
							? 'bg-green-50 text-green-700'
							: 'bg-red-50 text-red-700'}"
						role="status"
					>
						{message.text}
					</p>
				{/if}

				<div class="mt-6 flex flex-wrap items-center justify-between gap-3">
					<button
						type="button"
						class="text-sm font-semibold text-slate-500 hover:text-slate-700"
						onclick={restoreDefaults}
					>
						Valeurs par défaut
					</button>
					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							class="app-button app-button-secondary"
							onclick={cancel}
							disabled={!dirty || saving}
						>
							Annuler
						</button>
						<button type="submit" class="app-button app-button-primary" disabled={!dirty || saving}>
							{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
						</button>
					</div>
				</div>
			</form>

			<!-- Apparence -->
			<div class="app-card p-6">
				<div class="mb-6 border-b border-slate-100 pb-4">
					<h3 class="text-lg font-semibold text-slate-950">Apparence</h3>
					<p class="mt-1 text-sm text-slate-500">S'applique immédiatement.</p>
				</div>
				<div class="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Thème">
					{#each THEMES as theme (theme.value)}
						<button
							type="button"
							role="radio"
							aria-checked={$preferences.theme === theme.value}
							disabled={themeSaving}
							onclick={() => chooseTheme(theme.value)}
							class="rounded-2xl border-2 p-4 text-left transition-colors {$preferences.theme ===
							theme.value
								? 'border-blue-600 bg-blue-50'
								: 'border-slate-200 hover:border-slate-300'}"
						>
							<div class="flex items-center justify-between">
								<span class="font-semibold text-slate-950">{theme.label}</span>
								<span class="h-5 w-5 rounded-full {theme.swatch}" aria-hidden="true"></span>
							</div>
							<p class="mt-1 text-sm text-slate-500">{theme.description}</p>
						</button>
					{/each}
				</div>
				{#if themeError}
					<p class="mt-3 text-sm text-red-600">{themeError}</p>
				{/if}
			</div>
		</div>

		<div class="space-y-6">
			<!-- Sécurité -->
			<div class="app-card p-6">
				<h3 class="text-lg font-semibold text-slate-950">Sécurité</h3>
				<div class="mt-4 space-y-3">
					<button
						type="button"
						class="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
						onclick={openPassword}
					>
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<rect x="4" y="11" width="16" height="10" rx="2" stroke-width="2" />
							<path stroke-linecap="round" stroke-width="2" d="M8 11V7a4 4 0 118 0v4" />
						</svg>
						Modifier le mot de passe
					</button>
					<a
						href="{resolve('/profile')}#securite"
						class="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"
							/>
						</svg>
						Double authentification
					</a>
					<a
						href={resolve('/profile')}
						class="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"
							/>
						</svg>
						Notifications (email, SMS)
					</a>
				</div>
			</div>

			<!-- Session -->
			<div class="app-card p-6">
				<h3 class="text-lg font-semibold text-slate-950">Session</h3>
				<p class="mt-1 text-sm text-slate-500">
					Connecté en tant que <span class="font-medium text-slate-700"
						>{$session?.trader.email ?? ''}</span
					>.
				</p>
				<button type="button" class="app-button app-button-danger mt-4 w-full" onclick={logout}
					>Se déconnecter</button
				>
			</div>
		</div>
	</div>
</section>

{#if passwordOpen}
	<div class="app-modal-backdrop" role="presentation">
		<div
			class="app-modal max-w-md p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby="password-title"
		>
			<h2 id="password-title" class="text-lg font-semibold text-slate-950">
				{mandatoryPasswordChange ? 'Choisir un nouveau mot de passe' : 'Modifier le mot de passe'}
			</h2>
			{#if mandatoryPasswordChange}
				<p class="mt-2 text-sm text-slate-600">
					Vous devez remplacer votre mot de passe temporaire pour accéder à votre compte.
				</p>
			{/if}
			{#if passwordDone}
				<p class="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
					Mot de passe modifié avec succès.
				</p>
				<div class="mt-5 flex justify-end">
					<button
						type="button"
						class="app-button app-button-primary"
							onclick={() => (passwordOpen = false)}>Continuer</button
					>
				</div>
			{:else}
				<form class="mt-4 space-y-4" onsubmit={submitPassword}>
					<div class="space-y-2">
						<label for="current-password" class="text-sm font-medium text-slate-700"
							>Mot de passe actuel</label
						>
						<input
							id="current-password"
							type="password"
							class="app-input"
							autocomplete="current-password"
							required
							bind:value={currentPassword}
						/>
					</div>
					<div class="space-y-2">
						<label for="new-password" class="text-sm font-medium text-slate-700"
							>Nouveau mot de passe</label
						>
						<input
							id="new-password"
							type="password"
							class="app-input"
							autocomplete="new-password"
							minlength="12"
							maxlength="72"
							required
							bind:value={newPassword}
						/>
						<p class="text-xs text-slate-400">Au moins 12 caractères.</p>
					</div>
					<div class="space-y-2">
						<label for="confirm-password" class="text-sm font-medium text-slate-700"
							>Confirmer le nouveau mot de passe</label
						>
						<input
							id="confirm-password"
							type="password"
							class="app-input"
							autocomplete="new-password"
							required
							bind:value={confirmPassword}
						/>
					</div>
					{#if passwordError}
						<p class="text-sm text-red-600">{passwordError}</p>
					{/if}
					<div class="flex justify-end gap-3 pt-1">
						{#if !mandatoryPasswordChange}
							<button
								type="button"
								class="app-button app-button-secondary"
								onclick={() => (passwordOpen = false)}>Annuler</button
							>
						{/if}
						<button type="submit" class="app-button app-button-primary" disabled={passwordBusy}>
							{passwordBusy ? 'Enregistrement…' : 'Enregistrer'}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
