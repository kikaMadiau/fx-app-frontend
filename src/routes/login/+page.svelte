<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
	import FloatingField from '$lib/components/auth/FloatingField.svelte';
	import PasswordEye from '$lib/components/auth/PasswordEye.svelte';
	import { login } from '$lib/api/auth.js';
	import { ApiError, getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import { greeting, readLastVisit, rememberVisit, type Greeting } from '$lib/utils/greeting.js';

	let email = $state('');
	let password = $state('');
	let formError = $state('');
	let isSubmitting = $state(false);
	// Deuxième étape quand la double authentification est active.
	let needsCode = $state(false);
	let otpCode = $state('');
	let showPassword = $state(false);
	// Calculé dans le navigateur (heure locale, dernière connexion sur cet appareil).
	let welcome = $state<Greeting>({
		title: 'Bienvenue',
		subtitle: 'Connectez-vous à votre espace professionnel.'
	});

	onMount(() => {
		const refresh = () => (welcome = greeting(new Date(), readLastVisit()));
		refresh();
		document.getElementById('usermail')?.focus();
		const timer = setInterval(refresh, 60_000);
		return () => clearInterval(timer);
	});

	function loginErrorMessage(error: unknown): string {
		if (error instanceof ApiError && error.status === 401) {
			return needsCode
				? 'Code incorrect ou expiré. Saisissez le nouveau code affiché dans votre application.'
				: 'E-mail ou mot de passe incorrect.';
		}
		if (error instanceof ApiError && error.status === 403 && /pending/i.test(error.message)) {
			return "Votre compte attend l'accord d'un superviseur de votre bureau. Vous pourrez vous connecter dès qu'il l'aura accepté.";
		}
		if (error instanceof ApiError && error.status === 429) {
			return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
		}
		return error instanceof ApiError ? error.message : getUserFacingErrorMessage(error);
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		if (!email.trim() || !password) {
			formError = 'Veuillez renseigner votre e-mail et votre mot de passe.';
			return;
		}
		if (needsCode && !otpCode.trim()) {
			formError = 'Saisissez le code à 6 chiffres de votre application.';
			return;
		}

		isSubmitting = true;

		try {
			const result = await login(email.trim(), password, needsCode ? otpCode.trim() : undefined);
			if (result.status === 'two_factor_required') {
				needsCode = true;
				return;
			}
			// Prénom retenu pour le message d'accueil de la prochaine visite (« Bonsoir, Michael »).
			rememberVisit(result.trader.first_name ?? '');
			await goto(resolve('/dashboard'));
		} catch (error) {
			formError = loginErrorMessage(error);
			otpCode = '';
		} finally {
			isSubmitting = false;
		}
	}

	function backToPassword() {
		needsCode = false;
		otpCode = '';
		formError = '';
	}
</script>

<AuthShell>
	<header class="mb-7">
		<h1 class="text-3xl font-bold tracking-tight text-slate-950" data-testid="login-greeting">
			{welcome.title}
		</h1>
		<p class="mt-2 text-[15px] text-slate-500">{welcome.subtitle}</p>
	</header>

	{#if page.url.searchParams.get('compte') === 'attente'}
		<p
			class="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
			data-testid="pending-notice"
		>
			Demande envoyée. Un superviseur de votre bureau doit accepter votre compte. Vous pourrez
			ensuite vous connecter avec votre adresse e-mail et votre mot de passe.
		</p>
	{:else if page.url.searchParams.get('compte') === 'cree'}
		<p
			class="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
		>
			Compte créé. Connectez-vous avec votre adresse e-mail et votre mot de passe.
		</p>
	{/if}

	{#if formError}
		<div
			role="alert"
			class="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
		>
			<svg
				class="mt-0.5 h-4 w-4 shrink-0"
				viewBox="0 0 20 20"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					fill-rule="evenodd"
					d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-4a1 1 0 0 0-1 1v3a1 1 0 1 0 2 0V7a1 1 0 0 0-1-1Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
					clip-rule="evenodd"
				/>
			</svg>
			<span>{formError}</span>
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-4" novalidate>
		{#if needsCode}
			<div>
				<p class="mb-1 text-base font-semibold text-slate-950">Double authentification</p>
				<p class="mb-4 text-sm text-slate-500">
					Ouvrez votre application d'authentification et saisissez le code à 6 chiffres pour
					<span class="font-semibold text-slate-700">{email}</span>. Vous pouvez aussi utiliser un
					code de secours.
				</p>
				<FloatingField
					id="otp"
					label="Code de vérification"
					inputmode="numeric"
					autocomplete="one-time-code"
					bind:value={otpCode}
				/>
			</div>
			<button
				type="submit"
				class="app-button app-button-primary h-12 w-full rounded-full text-base disabled:cursor-not-allowed disabled:opacity-60"
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Vérification...' : 'Valider le code'}
			</button>
			<button
				type="button"
				class="w-full py-2 text-center text-[15px] font-semibold text-slate-700 hover:underline"
				onclick={backToPassword}
			>
				Retour
			</button>
		{:else}
			<FloatingField
				id="usermail"
				label="Adresse e-mail"
				type="email"
				autocomplete="username"
				bind:value={email}
			/>
			<FloatingField
				id="password"
				label="Mot de passe"
				type={showPassword ? 'text' : 'password'}
				autocomplete="current-password"
				bind:value={password}
			>
				{#snippet trailing()}<PasswordEye bind:shown={showPassword} />{/snippet}
			</FloatingField>

			<button
				type="submit"
				class="app-button app-button-primary h-12 w-full gap-2 rounded-full text-base disabled:cursor-not-allowed disabled:opacity-60"
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<span
						class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
						aria-hidden="true"
					></span>
					Connexion...
				{:else}
					Se connecter
				{/if}
			</button>

			<p class="pt-1 text-center">
				<a
					href={resolve('/reset')}
					class="text-[15px] font-semibold text-slate-800 hover:text-blue-700 hover:underline"
				>
					Mot de passe oublié ?
				</a>
			</p>
		{/if}
	</form>

	{#if !needsCode}
		<div class="mt-10">
			<a
				href={resolve('/register')}
				class="flex h-12 w-full items-center justify-center rounded-xl border border-blue-600 text-base font-semibold text-blue-700 transition hover:bg-blue-50"
			>
				Créer un nouveau compte
			</a>
			<p class="mt-3 text-center text-xs text-slate-500">
				Réservé aux bureaux de change agréés par la BCC.
			</p>
		</div>
	{/if}
</AuthShell>
