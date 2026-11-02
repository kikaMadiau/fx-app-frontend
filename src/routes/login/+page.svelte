<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Input from '$lib/components/ui/Input.svelte';
	import { login } from '$lib/api/auth.js';
	import { ApiError, getUserFacingErrorMessage } from '$lib/utils/api-errors.js';

	let email = $state('');
	let password = $state('');
	let formError = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		if (!email.trim() || !password) {
			formError = 'Veuillez renseigner votre e-mail et votre mot de passe.';
			return;
		}

		isSubmitting = true;

		try {
			await login(email.trim(), password);
			await goto(resolve('/dashboard'));
		} catch (error) {
			formError =
				error instanceof ApiError
					? error.message
					: getUserFacingErrorMessage(error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
	<div class="w-full max-w-md">
		<div class="mb-8 text-center">
			<div class="mb-6">
				<span class="text-2xl font-bold text-slate-950">
					FX<span class="text-blue-600">.</span>
				</span>
			</div>

			<h1 class="text-3xl font-bold text-slate-950">Bon retour</h1>

			<p class="mt-2 text-sm text-slate-500">Connectez-vous à votre espace professionnel.</p>
		</div>

		<div class="app-card p-8">
			{#if formError}
				<div class="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{formError}
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-5">
				<div>
					<label for="usermail" class="mb-2 block text-sm font-semibold text-slate-700">
						Adresse e-mail
					</label>

					<Input
						inputType="email"
						className="app-input"
						placeholder="vous@exemple.com"
						name="usermail"
						bind:value={email}
					/>
				</div>

				<div>
					<div class="mb-2 flex items-center justify-between">
						<label for="password" class="block text-sm font-semibold text-slate-700">
							Mot de passe
						</label>

						<a
							href={resolve('/reset')}
							class="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
						>
							Mot de passe oublié ?
						</a>
					</div>

					<Input
						inputType="password"
						className="app-input"
						placeholder="••••••••"
						name="password"
						bind:value={password}
					/>
				</div>

				<button
					type="submit"
					class="app-button app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
					disabled={isSubmitting}
				>
					{isSubmitting ? 'Connexion...' : 'Se connecter'}
				</button>
			</form>

			<div class="mt-6 border-t border-slate-100 pt-6 text-center">
				<p class="text-sm text-slate-500">
					Vous n'avez pas encore de compte ?
					<a
						href={resolve('/register')}
						class="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
					>
						Créer un compte
					</a>
				</p>
			</div>
		</div>

		<p class="mt-6 text-center text-xs text-slate-400">
			Vos informations sont protégées et sécurisées.
		</p>
	</div>
</div>
