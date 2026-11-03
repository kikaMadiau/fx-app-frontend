<script lang="ts">
	import { onMount } from 'svelte';
	import {
		listAnalyses,
		saveConfiguredAnalyses,
		type ExchangeAnalysis
	} from '$lib/api/analyses.js';
	let exchangeRates = $state<ExchangeAnalysis[]>([]);
	let ratesLoading = $state(true);
	let ratesSaving = $state(false);
	let ratesMessage = $state('');
	let ratesError = $state('');

	onMount(async () => {
		try {
			const apiRates = await listAnalyses();
			const saved = localStorage.getItem('fx-app.exchange-rate-overrides');
			const overrides = saved ? (JSON.parse(saved) as Record<string, Partial<ExchangeAnalysis>>) : {};
			exchangeRates = apiRates.map((rate) => ({ ...rate, ...overrides[rate.pair] }));
		} catch {
			ratesError = 'Impossible de charger les taux de change.';
		} finally {
			ratesLoading = false;
		}
	});

	const saveExchangeRates = () => {
		ratesSaving = true;
		ratesMessage = '';
		ratesError = '';
		if (exchangeRates.some((rate) => !Number.isFinite(rate.buy_rate) || rate.buy_rate <= 0 || !Number.isFinite(rate.sell_rate) || rate.sell_rate <= 0 || !Number.isFinite(rate.change_rate))) {
			ratesError = 'Saisissez des taux d’achat et de vente positifs, ainsi qu’une variation valide.';
			ratesSaving = false;
			return;
		}
		try {
			saveConfiguredAnalyses(exchangeRates);
			ratesMessage = 'Les taux sont enregistrés et seront affichés sur le tableau de bord de ce navigateur.';
		} catch {
			ratesError = 'Impossible d’enregistrer les taux dans ce navigateur.';
		} finally {
			ratesSaving = false;
		}
	};

	const settings = {
		currency: 'CDF',
		timezone: 'Africa/Kinshasa',
		language: 'Français',
		dateFormat: 'JJ/MM/AAAA',
		notifications: {
			email: true,
			sms: false,
			dashboard: true
		},
		theme: 'Clair'
	};

	const handleSave = () => {
		console.log('Paramètres sauvegardés');
	};
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Configuration</span>
			<h1 class="app-title">Paramètres</h1>
			<p class="app-subtitle">Configuration générale de la plateforme.</p>
		</div>
	</div>

	<div class="mt-6 grid gap-6 lg:grid-cols-3">
		<div class="space-y-6 lg:col-span-2">
			<div class="app-card p-6">
				<div class="mb-6 border-b border-slate-100 pb-4">
					<h3 class="text-lg font-semibold text-slate-950">Taux de change</h3>
					<p class="mt-1 text-sm text-slate-500">
						Configurez les taux affichés sur le tableau de bord.
					</p>
				</div>

				{#if ratesLoading}
					<p class="text-sm text-slate-500">Chargement des taux…</p>
				{:else if ratesError && exchangeRates.length === 0}
					<p class="text-sm text-red-700" role="alert">{ratesError}</p>
				{:else}
					<div class="space-y-4">
						{#each exchangeRates as rate, index (rate.pair)}
							<div class="rounded-xl border border-slate-100 p-4">
								<p class="mb-3 font-semibold text-slate-950">{rate.pair}</p>
								<div class="grid gap-3 sm:grid-cols-3">
									<label class="space-y-2 text-sm font-medium text-slate-700">
										Achat
										<input class="app-input" type="number" min="0.01" step="0.01" bind:value={exchangeRates[index].buy_rate} />
									</label>
									<label class="space-y-2 text-sm font-medium text-slate-700">
										Vente
										<input class="app-input" type="number" min="0.01" step="0.01" bind:value={exchangeRates[index].sell_rate} />
									</label>
									<label class="space-y-2 text-sm font-medium text-slate-700">
										Variation (%)
										<input class="app-input" type="number" step="0.01" bind:value={exchangeRates[index].change_rate} />
									</label>
								</div>
							</div>
						{/each}
					</div>

					{#if ratesError}<p class="mt-4 text-sm text-red-700" role="alert">{ratesError}</p>{/if}
					{#if ratesMessage}<p class="mt-4 text-sm text-green-700" role="status">{ratesMessage}</p>{/if}
					<div class="mt-6 flex justify-end">
						<button class="app-button app-button-primary" onclick={saveExchangeRates} disabled={ratesSaving}>
							{ratesSaving ? 'Enregistrement…' : 'Enregistrer les taux'}
						</button>
					</div>
				{/if}
			</div>

			<div class="app-card p-6">
				<div class="mb-6 border-b border-slate-100 pb-4">
					<h3 class="text-lg font-semibold text-slate-950">Préférences générales</h3>
					<p class="mt-1 text-sm text-slate-500">Configuration de base de votre compte.</p>
				</div>

				<div class="space-y-5">
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="space-y-2">
							<label for="settings-currency" class="text-sm font-medium text-slate-700"
								>Devise principale</label
							>
							<select id="settings-currency" class="app-input">
								<option>CDF</option>
								<option>USD</option>
								<option>EUR</option>
							</select>
						</div>
						<div class="space-y-2">
							<label for="settings-timezone" class="text-sm font-medium text-slate-700"
								>Fuseau horaire</label
							>
							<select id="settings-timezone" class="app-input">
								<option>Africa/Kinshasa</option>
								<option>Europe/Paris</option>
								<option>America/New_York</option>
							</select>
						</div>
					</div>
					<div class="space-y-2">
						<label for="settings-language" class="text-sm font-medium text-slate-700">Langue</label>
						<select id="settings-language" class="app-input">
							<option>Français</option>
							<option>Anglais</option>
						</select>
					</div>
					<div class="space-y-2">
						<label for="settings-date-format" class="text-sm font-medium text-slate-700"
							>Format de date</label
						>
						<select id="settings-date-format" class="app-input">
							<option>JJ/MM/AAAA</option>
							<option>AAAA-MM-JJ</option>
							<option>MM/JJ/AAAA</option>
						</select>
					</div>
				</div>

				<div class="mt-6 flex items-center justify-end gap-3">
					<button class="app-button app-button-secondary">Annuler</button>
					<button onclick={handleSave} class="app-button app-button-primary">
						Enregistrer les modifications
					</button>
				</div>
			</div>

			<div class="app-card p-6">
				<div class="mb-6 border-b border-slate-100 pb-4">
					<h3 class="text-lg font-semibold text-slate-950">Notifications</h3>
					<p class="mt-1 text-sm text-slate-500">Gérez vos alertes et notifications.</p>
				</div>

				<div class="space-y-4">
					<div
						class="flex items-start justify-between gap-4 rounded-xl bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
					>
						<div class="flex-1">
							<p class="font-medium text-slate-950">Notifications par email</p>
							<p class="mt-1 text-sm text-slate-500">
								Recevoir les alertes et mises à jour par email.
							</p>
						</div>
						<button
							aria-label="Notifications par email"
							class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
							class:bg-blue-600={settings.notifications.email}
							class:bg-slate-200={!settings.notifications.email}
						>
							<span
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
								class:translate-x-5={settings.notifications.email}
								class:translate-x-0={!settings.notifications.email}
							></span>
						</button>
					</div>

					<div
						class="flex items-start justify-between gap-4 rounded-xl bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
					>
						<div class="flex-1">
							<p class="font-medium text-slate-950">Notifications SMS</p>
							<p class="mt-1 text-sm text-slate-500">Recevoir les alertes urgentes par SMS.</p>
						</div>
						<button
							aria-label="Notifications SMS"
							class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
							class:bg-blue-600={settings.notifications.sms}
							class:bg-slate-200={!settings.notifications.sms}
						>
							<span
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
								class:translate-x-5={settings.notifications.sms}
								class:translate-x-0={!settings.notifications.sms}
							></span>
						</button>
					</div>

					<div
						class="flex items-start justify-between gap-4 rounded-xl bg-slate-50/50 p-4 transition-colors hover:bg-slate-50"
					>
						<div class="flex-1">
							<p class="font-medium text-slate-950">Notifications sur le dashboard</p>
							<p class="mt-1 text-sm text-slate-500">Afficher les alertes sur la page d'accueil.</p>
						</div>
						<button
							aria-label="Notifications sur le dashboard"
							class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
							class:bg-blue-600={settings.notifications.dashboard}
							class:bg-slate-200={!settings.notifications.dashboard}
						>
							<span
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
								class:translate-x-5={settings.notifications.dashboard}
								class:translate-x-0={!settings.notifications.dashboard}
							></span>
						</button>
					</div>
				</div>
			</div>

			<div class="app-card p-6">
				<div class="mb-6 border-b border-slate-100 pb-4">
					<h3 class="text-lg font-semibold text-slate-950">Apparence</h3>
					<p class="mt-1 text-sm text-slate-500">Personnalisez l'apparence de la plateforme.</p>
				</div>

				<div class="grid gap-4 sm:grid-cols-3">
					<div
						class="rounded-xl border-2 border-slate-200 p-4 transition-colors hover:border-blue-500"
					>
						<div class="flex items-center justify-between">
							<span class="font-medium text-slate-950">Clair</span>
							<div class="h-4 w-4 rounded-full bg-blue-600"></div>
						</div>
						<p class="mt-2 text-xs text-slate-500">Mode clair par défaut</p>
					</div>
					<div
						class="rounded-xl border-2 border-slate-200 p-4 transition-colors hover:border-blue-500"
					>
						<div class="flex items-center justify-between">
							<span class="font-medium text-slate-950">Sombre</span>
							<div class="h-4 w-4 rounded-full bg-slate-800"></div>
						</div>
						<p class="mt-2 text-xs text-slate-500">Mode sombre</p>
					</div>
					<div
						class="rounded-xl border-2 border-slate-200 p-4 transition-colors hover:border-blue-500"
					>
						<div class="flex items-center justify-between">
							<span class="font-medium text-slate-950">Système</span>
							<div class="h-4 w-4 rounded-full bg-gradient-to-br from-slate-200 to-slate-800"></div>
						</div>
						<p class="mt-2 text-xs text-slate-500">Adaptatif</p>
					</div>
				</div>
			</div>
		</div>

		<div class="space-y-6">
			<div class="app-card p-6">
				<h3 class="text-lg font-semibold text-slate-950">Informations du compte</h3>
				<div class="mt-6 space-y-4">
					<div>
						<p class="text-sm font-medium text-slate-500">Devise principale</p>
						<p class="mt-1 text-sm text-slate-950">CDF (Franc congolais)</p>
					</div>
					<div>
						<p class="text-sm font-medium text-slate-500">Fuseau horaire</p>
						<p class="mt-1 text-sm text-slate-950">Africa/Kinshasa (GMT+2)</p>
					</div>
					<div>
						<p class="text-sm font-medium text-slate-500">Langue</p>
						<p class="mt-1 text-sm text-slate-950">Français</p>
					</div>
					<div>
						<p class="text-sm font-medium text-slate-500">Format de date</p>
						<p class="mt-1 text-sm text-slate-950">JJ/MM/AAAA</p>
					</div>
				</div>
			</div>

			<div class="app-card p-6">
				<h3 class="text-lg font-semibold text-slate-950">Actions rapides</h3>
				<div class="mt-4 space-y-3">
					<button
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
					>
						<svg class="mr-2 inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						Modifier le mot de passe
					</button>
					<button
						class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
					>
						<svg class="mr-2 inline h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
							/>
						</svg>
						Sécurité du compte
					</button>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.app-input {
		width: 100%;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		background: white;
		padding: 10px 16px;
		font-size: 14px;
		color: #0f172a;
		outline: none;
		transition: all 200ms ease;
	}
	.app-input:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
	}
	.app-input::placeholder {
		color: #94a3b8;
	}
</style>
