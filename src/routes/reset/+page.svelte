<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
	import FloatingField from '$lib/components/auth/FloatingField.svelte';
	import PasswordEye from '$lib/components/auth/PasswordEye.svelte';
	import { requestPasswordReset, resetPassword } from '$lib/api/auth.js';
	import { ApiError, getUserFacingErrorMessage } from '$lib/utils/api-errors.js';

	// Deux étapes : sans jeton, on demande l'adresse ; avec le jeton du lien reçu par e-mail,
	// on choisit le nouveau mot de passe.
	const MIN_LENGTH = 12;
	const token = $derived(page.url.searchParams.get('token') ?? '');

	let email = $state('');
	let password = $state('');
	let confirmation = $state('');
	let showPassword = $state(false);
	let busy = $state(false);
	let error = $state('');
	let sent = $state(false);
	let testMode = $state(false);
	let done = $state(false);

	const tooShort = $derived(password.length > 0 && password.length < MIN_LENGTH);
	const mismatch = $derived(confirmation.length > 0 && confirmation !== password);

	onMount(() => document.getElementById(token ? 'new-password' : 'reset-email')?.focus());

	function message(e: unknown): string {
		if (e instanceof ApiError && e.status === 429) {
			return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
		}
		if (e instanceof ApiError && /invalid or has expired/.test(e.message)) {
			return 'Ce lien n’est plus valable (expiré ou déjà utilisé). Demandez-en un nouveau.';
		}
		return getUserFacingErrorMessage(e);
	}

	async function askLink(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
			error = 'Saisissez l’adresse e-mail de votre compte.';
			return;
		}
		busy = true;
		try {
			const res = await requestPasswordReset(email.trim());
			testMode = res.mode === 'test';
			sent = true;
		} catch (e) {
			error = message(e);
		} finally {
			busy = false;
		}
	}

	async function choosePassword(event: SubmitEvent) {
		event.preventDefault();
		error = '';
		if (password.length < MIN_LENGTH) {
			error = `Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`;
			return;
		}
		if (password !== confirmation) {
			error = 'Les deux mots de passe ne sont pas identiques.';
			return;
		}
		busy = true;
		try {
			await resetPassword(token, password);
			done = true;
		} catch (e) {
			error = message(e);
		} finally {
			busy = false;
		}
	}
</script>

{#snippet alert(text: string)}
	<div
		role="alert"
		class="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
	>
		<svg class="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path
				fill-rule="evenodd"
				d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0V7a1 1 0 0 0-1-1Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
				clip-rule="evenodd"
			/>
		</svg>
		<span>{text}</span>
	</div>
{/snippet}

<AuthShell>
	{#if !token}
		{#if sent}
			<header class="mb-6" data-testid="reset-sent">
				<div
					class="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
				>
					<svg
						class="h-6 w-6"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M3 7l9 6 9-6M4 5h16v14H4z" />
					</svg>
				</div>
				<h1 class="text-3xl font-bold tracking-tight text-slate-950">Vérifiez vos e-mails</h1>
				<p class="mt-3 text-[15px] text-slate-500">
					Si un compte existe pour <span class="font-semibold text-slate-700">{email.trim()}</span>,
					vous allez recevoir un lien pour choisir un nouveau mot de passe. Il est valable 30
					minutes.
				</p>
			</header>
			{#if testMode}
				<p
					class="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
					data-testid="reset-test-mode"
				>
					Mode test : aucun e-mail n’est envoyé. Le message est enregistré dans le dossier
					<code>outbox</code> de l’API.
				</p>
			{/if}
			<button
				type="button"
				class="app-button app-button-secondary h-12 w-full rounded-full"
				onclick={() => (sent = false)}
			>
				Utiliser une autre adresse
			</button>
		{:else}
			<header class="mb-8">
				<h1 class="text-3xl font-bold tracking-tight text-slate-950">Mot de passe oublié ?</h1>
				<p class="mt-2 text-[15px] text-slate-500">
					Indiquez l’adresse e-mail de votre compte. Nous vous enverrons un lien pour en choisir un
					nouveau.
				</p>
			</header>
			{#if error}{@render alert(error)}{/if}
			<form onsubmit={askLink} class="space-y-5" novalidate>
				<FloatingField
					id="reset-email"
					label="Adresse e-mail"
					type="email"
					autocomplete="username"
					bind:value={email}
				/>
				<button
					type="submit"
					class="app-button app-button-primary h-12 w-full rounded-full text-base disabled:opacity-60"
					disabled={busy}
				>
					{busy ? 'Envoi...' : 'Recevoir le lien'}
				</button>
			</form>
		{/if}
	{:else if done}
		<header class="mb-6" data-testid="reset-done">
			<div
				class="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
			>
				<svg
					class="h-6 w-6"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5" />
				</svg>
			</div>
			<h1 class="text-3xl font-bold tracking-tight text-slate-950">Mot de passe modifié</h1>
			<p class="mt-2 text-[15px] text-slate-500">
				Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
			</p>
		</header>
		<a
			href={resolve('/login')}
			class="app-button app-button-primary h-12 w-full rounded-full text-base">Se connecter</a
		>
	{:else}
		<header class="mb-8">
			<h1 class="text-3xl font-bold tracking-tight text-slate-950">Nouveau mot de passe</h1>
			<p class="mt-2 text-[15px] text-slate-500">
				Choisissez un mot de passe d’au moins {MIN_LENGTH} caractères, que vous n’utilisez nulle part
				ailleurs.
			</p>
		</header>
		{#if error}{@render alert(error)}{/if}
		<form onsubmit={choosePassword} class="space-y-5" novalidate>
			<FloatingField
				id="new-password"
				label="Nouveau mot de passe"
				type={showPassword ? 'text' : 'password'}
				autocomplete="new-password"
				error={tooShort ? `${password.length} / ${MIN_LENGTH} caractères minimum` : ''}
				hint="{MIN_LENGTH} caractères minimum."
				bind:value={password}
			>
				{#snippet trailing()}<PasswordEye bind:shown={showPassword} />{/snippet}
			</FloatingField>
			<FloatingField
				id="confirm-password"
				label="Confirmez le mot de passe"
				type={showPassword ? 'text' : 'password'}
				autocomplete="new-password"
				error={mismatch ? 'Les deux mots de passe ne sont pas identiques.' : ''}
				bind:value={confirmation}
			/>
			<button
				type="submit"
				class="app-button app-button-primary h-12 w-full rounded-full text-base disabled:opacity-60"
				disabled={busy}
			>
				{busy ? 'Enregistrement...' : 'Enregistrer le mot de passe'}
			</button>
		</form>
	{/if}

	<p class="mt-8 text-center text-sm">
		<a href={resolve('/login')} class="font-semibold text-blue-600 hover:underline"
			>← Retour à la connexion</a
		>
	</p>
</AuthShell>
