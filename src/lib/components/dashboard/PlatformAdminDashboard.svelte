<script lang="ts">
	import { onMount } from 'svelte';
	import { listStores, type Store } from '$lib/api/stores.js';
	import { ApiError } from '$lib/utils/api-errors.js';

	// Administration de la plateforme : maisons de change et validité de leurs agréments.
	// Affiché dans la Vue d'ensemble de l'administrateur, au-dessus des chiffres d'activité.
	let stores = $state<Store[]>([]);
	let isLoading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			stores = await listStores();
		} catch (cause) {
			error =
				cause instanceof ApiError ? cause.message : 'Impossible de charger les maisons de change.';
		} finally {
			isLoading = false;
		}
	});

	const activeStores = $derived(
		stores.filter((store) => store.status.toUpperCase() === 'ACTIVE').length
	);
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
		const labels: Record<string, string> = {
			ACTIVE: 'Active',
			SUSPENDED: 'Suspendue',
			EXPIRED: 'Expirée',
			INACTIVE: 'Inactive'
		};
		return labels[status.toUpperCase()] ?? status;
	}

	// Un bureau « actif » dont l'agrément est échu ne peut plus opérer : on le montre.
	function isExpired(store: Store) {
		return !!store.license_expires_at && new Date(store.license_expires_at).getTime() < Date.now();
	}

	function statusBadge(status: string) {
		return status.toUpperCase() === 'ACTIVE' ? 'app-badge-success' : 'app-badge-warning';
	}
</script>

<section class="app-card admin-panel" data-testid="platform-stores">
	<div class="flex flex-wrap items-start justify-between gap-2">
		<div>
			<h2 class="admin-title">Maisons de change</h2>
			<p class="admin-sub">État des établissements et validité des agréments BCC.</p>
		</div>
		<div class="flex flex-wrap gap-1.5 text-[11px] font-semibold">
			<span class="admin-chip">{stores.length} enregistrées</span>
			<span class="admin-chip text-emerald-700">{activeStores} actives</span>
			<span class="admin-chip {inactiveStores ? 'text-amber-700' : ''}">{inactiveStores} inactives</span>
			<span class="admin-chip {expiringLicenses ? 'text-red-700' : ''}"
				>{expiringLicenses} agrément(s) à renouveler sous 30 j</span
			>
		</div>
	</div>

	{#if error}
		<p class="mt-2 text-sm text-red-700">{error}</p>
	{:else if isLoading}
		<p class="mt-2 text-sm text-slate-500">Chargement des établissements…</p>
	{:else if stores.length === 0}
		<p class="mt-2 text-sm text-slate-500">Aucune maison de change enregistrée.</p>
	{:else}
		<div class="mt-2 overflow-x-auto">
			<table class="admin-table">
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
							<td>
								{#if isExpired(store)}
									<span class="app-badge app-badge-danger">Agrément expiré</span>
								{:else}
									<span class="app-badge {statusBadge(store.status)}">{statusLabel(store.status)}</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.admin-panel {
		border-radius: 16px;
		padding: 14px 16px;
	}
	.admin-title {
		font-size: 15px;
		font-weight: 700;
		color: var(--fx-text);
	}
	.admin-sub {
		margin-top: 2px;
		font-size: 11.5px;
		color: var(--fx-muted);
	}
	.admin-chip {
		border-radius: 999px;
		border: 1px solid var(--fx-border-soft);
		background: var(--fx-surface-muted);
		padding: 1px 8px;
		color: var(--fx-muted);
	}
	.admin-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		color: var(--fx-muted);
	}
	.admin-table th {
		padding: 2px 10px 6px 0;
		text-align: left;
		font-size: 10.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		white-space: nowrap;
	}
	.admin-table td {
		border-top: 1px solid var(--fx-border);
		padding: 7px 10px 7px 0;
		white-space: nowrap;
	}
	.admin-table :global(.app-badge) {
		padding: 1px 8px;
		font-size: 10.5px;
	}
</style>
