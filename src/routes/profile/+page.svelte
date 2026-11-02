<script>
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';

	const profile = {
		name: 'FX App',
		email: 'contact@fxapp.com',
		role: 'Changeur',
		company: 'FX App SAS',
		phone: '+243 81 234 5678',
		location: 'Kinshasa, RDC',
		joined: '15 octobre 2024'
	};

	const notifications = [
		{ label: 'Notifications par email', enabled: true, description: 'Recevoir les alertes et mises à jour' },
		{ label: 'Notifications SMS', enabled: false, description: 'Recevoir les alertes urgentes par SMS' },
		{ label: 'Rapports hebdomadaires', enabled: true, description: 'Recevoir un résumé chaque lundi' }
	];

	const security = {
		twoFactor: false,
		lastLogin: 'Aujourd\'hui à 09:30',
		currentSession: 'Kinshasa, RDC - Chrome'
	};

	let showSaveSuccess = false;

	const handleSave = () => {
		showSaveSuccess = true;
		setTimeout(() => {
			showSaveSuccess = false;
		}, 3000);
	};

	const toggleNotification = (index) => {
		notifications[index].enabled = !notifications[index].enabled;
	};
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Compte</span>
			<h1 class="app-title">Mon profil</h1>
			<p class="app-subtitle">Gérez vos informations personnelles et préférences.</p>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		<div class="lg:col-span-1">
			<div class="app-card p-6 text-center">
				<div class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 font-bold text-white shadow-lg shadow-blue-500/20">
					<span class="text-2xl">FX</span>
				</div>
				<h2 class="text-xl font-bold text-slate-950">{profile.name}</h2>
				<p class="mt-1 text-sm text-slate-500">{profile.role}</p>
				<p class="mt-2 text-xs text-slate-400">Membre depuis {profile.joined}</p>

				<div class="mt-6 space-y-3 border-t border-slate-100 pt-6">
					<div class="flex items-center gap-3 text-sm text-slate-600">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
						<span class="truncate">{profile.email}</span>
					</div>
					<div class="flex items-center gap-3 text-sm text-slate-600">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
						</svg>
						<span>{profile.phone}</span>
					</div>
					<div class="flex items-center gap-3 text-sm text-slate-600">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<span>{profile.location}</span>
					</div>
				</div>
			</div>
		</div>

		<div class="lg:col-span-2 space-y-6">
			<div class="app-card p-6">
				<div class="mb-6 border-b border-slate-100 pb-4">
					<h3 class="text-lg font-semibold text-slate-950">Informations personnelles</h3>
					<p class="mt-1 text-sm text-slate-500">Mettez à jour vos coordonnées.</p>
				</div>

				<div class="grid gap-5 sm:grid-cols-2">
					<div class="space-y-2">
						<label class="text-sm font-medium text-slate-700">Nom complet</label>
						<input
							type="text"
							value={profile.name}
							class="app-input"
							placeholder="Votre nom"
						/>
					</div>
					<div class="space-y-2">
						<label class="text-sm font-medium text-slate-700">Email</label>
						<input
							type="email"
							value={profile.email}
							class="app-input"
							placeholder="votre@email.com"
						/>
					</div>
					<div class="space-y-2">
						<label class="text-sm font-medium text-slate-700">Téléphone</label>
						<input
							type="tel"
							value={profile.phone}
							class="app-input"
							placeholder="+243 ..."
						/>
					</div>
					<div class="space-y-2">
						<label class="text-sm font-medium text-slate-700">Société</label>
						<input
							type="text"
							value={profile.company}
							class="app-input"
							placeholder="Nom de votre société"
						/>
					</div>
				</div>

				<div class="mt-6 flex items-center justify-end gap-3">
					<button class="app-button app-button-secondary">Annuler</button>
					<button on:click={handleSave} class="app-button app-button-primary">
						{#if showSaveSuccess}
							<span class="flex items-center gap-2">
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								Enregistré !
							</span>
						{:else}
							Enregistrer les modifications
						{/if}
					</button>
				</div>
			</div>

			<div class="app-card p-6">
				<div class="mb-6 border-b border-slate-100 pb-4">
					<h3 class="text-lg font-semibold text-slate-950">Préférences de notification</h3>
					<p class="mt-1 text-sm text-slate-500">Gérez vos alertes et notifications.</p>
				</div>

				<div class="space-y-4">
					{#each notifications as notification, i (notification.label)}
						<div class="flex items-start justify-between gap-4 rounded-2xl bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
							<div class="flex-1">
								<p class="font-medium text-slate-950">{notification.label}</p>
								<p class="mt-1 text-sm text-slate-500">{notification.description}</p>
							</div>
							<button
								on:click={() => toggleNotification(i)}
								class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
								class:bg-blue-600={notification.enabled}
								class:bg-slate-200={!notification.enabled}
							>
								<span
									class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
									class:translate-x-5={notification.enabled}
									class:translate-x-0={!notification.enabled}
								/>
							</button>
						</div>
					{/each}
				</div>
			</div>

			<div class="app-card p-6">
				<div class="mb-6 border-b border-slate-100 pb-4">
					<h3 class="text-lg font-semibold text-slate-950">Sécurité</h3>
					<p class="mt-1 text-sm text-slate-500">Gérez les paramètres de sécurité de votre compte.</p>
				</div>

				<div class="space-y-4">
					<div class="flex items-start justify-between gap-4 rounded-2xl bg-slate-50/50 p-4 transition-colors hover:bg-slate-50">
						<div class="flex-1">
							<p class="font-medium text-slate-950">Authentification à deux facteurs</p>
							<p class="mt-1 text-sm text-slate-500">Ajoutez une couche de sécurité à votre compte.</p>
						</div>
						<button
							on:click={() => (security.twoFactor = !security.twoFactor)}
							class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							class:bg-blue-600={security.twoFactor}
							class:bg-slate-200={!security.twoFactor}
						>
							<span
								class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
								class:translate-x-5={security.twoFactor}
								class:translate-x-0={!security.twoFactor}
							/>
						</button>
					</div>

					<div class="grid gap-3 sm:grid-cols-2">
						<div>
							<p class="text-sm font-medium text-slate-500">Dernière connexion</p>
							<p class="mt-1 text-sm text-slate-950">{security.lastLogin}</p>
						</div>
						<div>
							<p class="text-sm font-medium text-slate-500">Session actuelle</p>
							<p class="mt-1 text-sm text-slate-950">{security.currentSession}</p>
						</div>
					</div>
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
