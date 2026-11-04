<script lang="ts">
	import { onMount } from 'svelte';
	import { listStores, type Store } from '$lib/api/stores.js';
	import { ApiError } from '$lib/utils/api-errors.js';

	let stores = $state<Store[]>([]);
	let isLoading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			stores = await listStores();
		} catch (cause) {
			error = cause instanceof ApiError ? cause.message : 'Impossible de charger les maisons de change.';
		} finally {
			isLoading = false;
		}
	});

	const activeStores = $derived(stores.filter((store) => store.status.toUpperCase() === 'ACTIVE').length);
	const inactiveStores = $derived(stores.length - activeStores);
	const expiringLicenses = $derived(
		stores.filter((store) => {
			if (!store.license_expires_at || store.status.toUpperCase() !== 'ACTIVE') return false;
			const daysRemaining = (new Date(store.license_expires_at).getTime() - Date.now()) / 86_400_000;
			return daysRemaining >= 0 && daysRemaining <= 30;
		}).length
	);

	function licenseExpiry(value: string | null) {
		if (!value) return 'Non renseignée';
		return new Intl.DateTimeFormat('fr-CD', { dateStyle: 'medium' }).format(new Date(value));
	}

	function statusLabel(status: string) {
		return status.toUpperCase() === 'ACTIVE' ? 'Active' : status;
	}
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Administration plateforme</span>
			<h1 class="app-title">Vue globale</h1>
			<p class="app-subtitle">Suivi des maisons de change et de leurs agréments.</p>
		</div>
	</div>

	<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
		<div class="app-stat-card">
			<p class="app-stat-label">Maisons de change</p>
			<p class="app-stat-value">{stores.length}</p>
			<p class="app-stat-detail">Enregistrées sur la plateforme</p>
		</div>
		<div class="app-stat-card">
			<p class="app-stat-label">Maisons actives</p>
			<p class="app-stat-value">{activeStores}</p>
			<p class="app-stat-detail">Statut actif</p>
		</div>
		<div class="app-stat-card">
			<p class="app-stat-label">Maisons inactives</p>
			<p class="app-stat-value">{inactiveStores}</p>
			<p class="app-stat-detail">À vérifier</p>
		</div>
		<div class="app-stat-card">
			<p class="app-stat-label">Agrément à renouveler</p>
			<p class="app-stat-value">{expiringLicenses}</p>
			<p class="app-stat-detail">Expiration dans les 30 prochains jours</p>
		</div>
	</div>

	<section class="app-card mt-8">
		<div class="app-card-header">
			<h2 class="app-card-title">Maisons de change</h2>
			<p class="app-card-subtitle">État des établissements et dates de validité des agréments.</p>
		</div>

		{#if error}
			<p class="px-5 pb-5 text-sm text-red-700">{error}</p>
		{:else if isLoading}
			<p class="px-5 pb-5 text-sm text-slate-500">Chargement des établissements…</p>
		{:else if stores.length === 0}
			<p class="px-5 pb-5 text-sm text-slate-500">Aucune maison de change enregistrée.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="app-table">
					<thead>
						<tr>
							<th>Établissement</th>
							<th>N° d’agrément BCC</th>
							<th>Expiration de l’agrément</th>
							<th>Statut</th>
						</tr>
					</thead>
					<tbody>
						{#each stores as store (store.id)}
							<tr>
								<td class="font-semibold text-slate-950">{store.name}</td>
								<td>{store.bcc_license_number || 'Non renseigné'}</td>
								<td>{licenseExpiry(store.license_expires_at)}</td>
								<td>{statusLabel(store.status)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</section>
