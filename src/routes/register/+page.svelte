<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import AuthShell from '$lib/components/auth/AuthShell.svelte';
	import FloatingField from '$lib/components/auth/FloatingField.svelte';
	import PasswordEye from '$lib/components/auth/PasswordEye.svelte';
	import { register } from '$lib/api/auth.js';
	import { ApiError, getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import { rememberVisit } from '$lib/utils/greeting.js';
	import { validateEmail } from '$lib/utils/validation.js';

	// Inscription d'un cambiste : le compte n'est créé que si le numéro d'agrément BCC correspond
	// à un bureau dont l'agrément est valable. Le compte rejoint ce bureau avec le rôle Cambiste.
	const MIN_LENGTH = 12;

	let form = $state({
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		license: '',
		password: ''
	});
	let confirmation = $state('');
	let showPassword = $state(false);
	let errors = $state<Record<string, string>>({});
	let formError = $state('');
	let busy = $state(false);

	onMount(() => document.getElementById('first-name')?.focus());

	function validate(): boolean {
		const e: Record<string, string> = {};
		if (!form.firstName.trim()) e.firstName = 'Indiquez votre prénom.';
		if (!form.lastName.trim()) e.lastName = 'Indiquez votre nom.';
		if (!form.email.trim()) e.email = 'Indiquez votre adresse e-mail.';
		else if (validateEmail(form.email)) e.email = "L'adresse e-mail n'est pas valide.";
		if (!form.license.trim()) e.license = "Indiquez le numéro d'agrément de votre bureau.";
		if (form.password.length < MIN_LENGTH) e.password = `Au moins ${MIN_LENGTH} caractères.`;
		if (confirmation !== form.password)
			e.confirmation = 'Les deux mots de passe ne sont pas identiques.';
		errors = e;
		return Object.keys(e).length === 0;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		formError = '';
		if (!validate()) return;
		busy = true;
		try {
			await register({
				first_name: form.firstName.trim(),
				last_name: form.lastName.trim(),
				email: form.email.trim().toLowerCase(),
				phone: form.phone.trim() || undefined,
				bcc_license_number: form.license.trim().toUpperCase(),
				password: form.password
			});
			// Le compte attend l'accord d'un superviseur du bureau : pas de connexion directe.
			rememberVisit(form.firstName);
			await goto(resolve('/login') + '?compte=attente');
		} catch (e) {
			if (e instanceof ApiError && e.status === 409) errors = { email: e.message };
			else if (e instanceof ApiError && e.status === 422) errors = { license: e.message };
			else if (e instanceof ApiError && e.status === 429)
				formError = 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
			else formError = e instanceof ApiError ? e.message : getUserFacingErrorMessage(e);
		} finally {
			busy = false;
		}
	}
</script>

<AuthShell>
	<header class="mb-7">
		<h1 class="text-3xl font-bold tracking-tight text-slate-950">Créer un compte</h1>
		<p class="mt-2 text-[15px] text-slate-500">
			Pour les cambistes d’un bureau de change agréé par la Banque Centrale du Congo.
		</p>
	</header>

	{#if formError}
		<div
			role="alert"
			class="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
		>
			{formError}
		</div>
	{/if}

	<form onsubmit={submit} class="space-y-4" novalidate>
		<div class="grid gap-4 sm:grid-cols-2">
			<FloatingField
				id="first-name"
				label="Prénom"
				autocomplete="given-name"
				error={errors.firstName}
				bind:value={form.firstName}
			/>
			<FloatingField
				id="last-name"
				label="Nom"
				autocomplete="family-name"
				error={errors.lastName}
				bind:value={form.lastName}
			/>
		</div>
		<FloatingField
			id="register-email"
			label="Adresse e-mail"
			type="email"
			autocomplete="email"
			error={errors.email}
			bind:value={form.email}
		/>
		<FloatingField
			id="register-phone"
			label="Téléphone (facultatif)"
			type="tel"
			autocomplete="tel"
			bind:value={form.phone}
		/>
		<FloatingField
			id="bcc-license"
			label="Numéro d’agrément BCC du bureau"
			autocomplete="off"
			error={errors.license}
			hint="Le numéro figure sur l’agrément délivré à votre bureau de change."
			bind:value={form.license}
		/>
		<FloatingField
			id="register-password"
			label="Mot de passe"
			type={showPassword ? 'text' : 'password'}
			autocomplete="new-password"
			error={errors.password}
			hint="{MIN_LENGTH} caractères minimum."
			bind:value={form.password}
		>
			{#snippet trailing()}<PasswordEye bind:shown={showPassword} />{/snippet}
		</FloatingField>
		<FloatingField
			id="register-confirm"
			label="Confirmez le mot de passe"
			type={showPassword ? 'text' : 'password'}
			autocomplete="new-password"
			error={errors.confirmation}
			bind:value={confirmation}
		/>

		<button
			type="submit"
			class="app-button app-button-primary h-12 w-full rounded-full text-base disabled:opacity-60"
			disabled={busy}
		>
			{busy ? 'Vérification de l’agrément...' : 'Créer mon compte'}
		</button>
	</form>

	<p class="mt-8 text-center text-[15px] text-slate-600">
		Déjà un compte ?
		<a href={resolve('/login')} class="font-semibold text-blue-700 hover:underline">Se connecter</a>
	</p>
</AuthShell>
