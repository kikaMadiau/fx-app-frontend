<script lang="ts">
	// Administrateur : le personnel de chaque bureau (sexe, adresse, position partagée).
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		fetchStaffPhoto,
		listStaff,
		listStores,
		type StaffMember,
		type StoreSummary
	} from '$lib/api/admin.js';
	import { session } from '$lib/stores/session.js';
	import { isPlatformAdmin } from '$lib/types/trader.js';
	import { formatAddress } from '$lib/utils/address.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import { formatDate } from '$lib/utils/dates.js';

	const ROLE_LABELS: Record<string, string> = {
		TRADER: 'Cambiste',
		COMPLIANCE_OFFICER: 'Conformité',
		SUPERVISOR: 'Superviseur',
		ADMIN: 'Administrateur'
	};
	const REFRESH_MS = 30_000;

	let staff = $state<StaffMember[]>([]);
	let stores = $state<StoreSummary[]>([]);
	let storeId = $state(0);
	let search = $state('');
	let onlyLocated = $state(false);
	let loading = $state(true);
	let error = $state('');
	let updatedAt = $state<Date | null>(null);
	let selectedId = $state<number | null>(null);
	let photos = $state<Record<number, string>>({});
	let timer: ReturnType<typeof setInterval> | null = null;

	async function load(quiet = false) {
		if (!quiet) loading = true;
		error = '';
		try {
			staff = (await listStaff(storeId)).items;
			updatedAt = new Date();
			for (const m of staff) {
				if (m.has_photo && !photos[m.id]) {
					fetchStaffPhoto(m.id)
						.then((blob) => blob && (photos = { ...photos, [m.id]: URL.createObjectURL(blob) }))
						.catch(() => {});
				}
			}
		} catch (e) {
			error = getUserFacingErrorMessage(e);
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		if (!isPlatformAdmin($session?.trader)) {
			await goto(resolve('/dashboard'));
			return;
		}
		listStores()
			.then((s) => (stores = s))
			.catch(() => {});
		await load();
		timer = setInterval(() => load(true), REFRESH_MS);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
		Object.values(photos).forEach((url) => URL.revokeObjectURL(url));
	});

	const located = (m: StaffMember) =>
		m.location.sharing && m.location.latitude !== null && m.location.longitude !== null;

	const visible = $derived(
		staff.filter((m) => {
			if (onlyLocated && !located(m)) return false;
			const q = search.trim().toLowerCase();
			if (!q) return true;
			return [
				m.first_name,
				m.last_name,
				m.email,
				m.phone,
				m.store_name,
				m.address.commune,
				m.address.quartier,
				m.address.avenue,
				m.address.reference
			]
				.join(' ')
				.toLowerCase()
				.includes(q);
		})
	);
	const sharingCount = $derived(staff.filter(located).length);
	const selected = $derived(staff.find((m) => m.id === selectedId && located(m)) ?? null);

	function name(m: StaffMember) {
		return `${m.first_name} ${m.last_name}`.trim() || m.email;
	}
	function initials(m: StaffMember) {
		return (
			name(m)
				.split(/\s+/)
				.slice(0, 2)
				.map((p) => p[0]?.toUpperCase() ?? '')
				.join('') || '?'
		);
	}

	/** « il y a 3 min » : fraîcheur de la dernière position. */
	function ago(at: string | null): string {
		if (!at) return '';
		const minutes = Math.round((Date.now() - new Date(at).getTime()) / 60_000);
		if (minutes < 1) return 'à l’instant';
		if (minutes < 60) return `il y a ${minutes} min`;
		if (minutes < 24 * 60) return `il y a ${Math.round(minutes / 60)} h`;
		return `le ${formatDate(at)}`;
	}
	const fresh = (at: string | null) => !!at && Date.now() - new Date(at).getTime() < 10 * 60_000;

	function mapUrl(m: StaffMember) {
		const lat = m.location.latitude!;
		const lng = m.location.longitude!;
		const d = 0.006;
		return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
	}
	function bigMapUrl(m: StaffMember) {
		return `https://www.openstreetmap.org/?mlat=${m.location.latitude}&mlon=${m.location.longitude}#map=17/${m.location.latitude}/${m.location.longitude}`;
	}
</script>

<section class="app-shell">
	<div class="app-header">
		<div class="app-header-row flex-wrap">
			<div>
				<h1 class="app-title">Personnel</h1>
				<p class="app-subtitle">
					Les équipes de chaque bureau : adresse, sexe et position partagée.
				</p>
			</div>
			<div class="flex items-center gap-3">
				{#if updatedAt}
					<span class="text-xs text-slate-500">
						Actualisé à {updatedAt.toLocaleTimeString('fr-FR', {
							hour: '2-digit',
							minute: '2-digit'
						})}
					</span>
				{/if}
				<button class="app-button app-button-secondary" onclick={() => load()} disabled={loading}>
					Actualiser
				</button>
			</div>
		</div>
	</div>

	<div class="mb-6 grid gap-3 sm:grid-cols-3">
		<div class="app-card p-4">
			<p class="text-xs font-semibold text-slate-500 uppercase">Membres</p>
			<p class="mt-1 text-2xl font-extrabold text-slate-950">{staff.length}</p>
		</div>
		<div class="app-card p-4">
			<p class="text-xs font-semibold text-slate-500 uppercase">Position partagée</p>
			<p class="mt-1 text-2xl font-extrabold text-green-700">{sharingCount}</p>
		</div>
		<div class="app-card p-4">
			<p class="text-xs font-semibold text-slate-500 uppercase">Bureaux</p>
			<p class="mt-1 text-2xl font-extrabold text-slate-950">
				{new Set(staff.map((m) => m.store_id).filter(Boolean)).size}
			</p>
		</div>
	</div>

	<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
		<input
			class="app-input sm:max-w-xs"
			type="search"
			placeholder="Rechercher un nom, une commune…"
			aria-label="Rechercher"
			bind:value={search}
		/>
		<select
			class="app-input sm:max-w-xs"
			aria-label="Bureau"
			bind:value={storeId}
			onchange={() => load()}
		>
			<option value={0}>Tous les bureaux</option>
			{#each stores as s (s.id)}
				<option value={s.id}>{s.name}</option>
			{/each}
		</select>
		<label class="flex items-center gap-2 text-sm text-slate-700">
			<input type="checkbox" class="h-4 w-4 accent-blue-600" bind:checked={onlyLocated} />
			Seulement ceux qui partagent leur position
		</label>
	</div>

	{#if error}
		<p class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
			Impossible de charger le personnel : {error}
		</p>
	{/if}

	<div class="grid gap-6 {selected ? 'xl:grid-cols-[1fr_420px]' : ''}">
		<div
			class="grid gap-4 md:grid-cols-2 {selected ? '' : 'xl:grid-cols-3'}"
			data-testid="staff-list"
		>
			{#if loading && !staff.length}
				<p class="text-sm text-slate-500">Chargement…</p>
			{:else if !visible.length}
				<p class="text-sm text-slate-500">Aucun membre ne correspond.</p>
			{/if}
			{#each visible as m (m.id)}
				<article
					class="app-card flex flex-col gap-3 p-5 {selectedId === m.id
						? 'ring-2 ring-blue-600'
						: ''}"
					data-testid="staff-card"
				>
					<div class="flex items-center gap-3">
						<span class="staff-avatar">
							{#if photos[m.id]}
								<img src={photos[m.id]} alt="" class="h-full w-full object-cover" />
							{:else}
								{initials(m)}
							{/if}
						</span>
						<div class="min-w-0 flex-1">
							<p class="truncate font-bold text-slate-950">{name(m)}</p>
							<p class="truncate text-xs text-slate-500">
								{ROLE_LABELS[m.role] ?? m.role}{m.gender
									? ` · ${m.gender === 'F' ? 'Femme' : 'Homme'}`
									: ''}{m.is_active ? '' : ' · inactif'}
							</p>
						</div>
					</div>
					<p class="text-xs font-semibold text-blue-700">{m.store_name || 'Plateforme'}</p>
					<dl class="space-y-1 text-sm">
						<div class="flex gap-2">
							<dt class="w-20 flex-shrink-0 text-slate-400">Adresse</dt>
							<dd class="text-slate-700">
								{formatAddress(m.address) || '—'}{#if m.address.reference}<span
										class="block text-xs text-slate-400">{m.address.reference}</span
									>{/if}
							</dd>
						</div>
						<div class="flex gap-2">
							<dt class="w-20 flex-shrink-0 text-slate-400">Téléphone</dt>
							<dd class="text-slate-700">{m.phone || '—'}</dd>
						</div>
					</dl>
					<div
						class="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3"
					>
						{#if located(m)}
							<span class="inline-flex items-center gap-2 text-xs font-semibold text-green-700">
								<span
									class="h-2 w-2 rounded-full {fresh(m.location.at)
										? 'animate-pulse bg-green-500'
										: 'bg-amber-400'}"
								></span>
								Position {ago(m.location.at)}
							</span>
							<button
								type="button"
								class="text-sm font-semibold text-blue-700 hover:underline"
								onclick={() => (selectedId = selectedId === m.id ? null : m.id)}
							>
								{selectedId === m.id ? 'Masquer la carte' : 'Voir sur la carte'}
							</button>
						{:else}
							<span class="text-xs text-slate-400">Position non partagée</span>
						{/if}
					</div>
				</article>
			{/each}
		</div>

		{#if selected}
			<aside class="app-card h-fit overflow-hidden xl:sticky xl:top-6" data-testid="staff-map">
				<div class="flex items-center justify-between gap-2 p-4">
					<div class="min-w-0">
						<p class="truncate font-bold text-slate-950">{name(selected)}</p>
						<p class="text-xs text-slate-500">
							{ago(selected.location.at)}{selected.location.accuracy
								? ` · précision ± ${Math.round(selected.location.accuracy)} m`
								: ''}
						</p>
					</div>
					<button
						type="button"
						class="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
						aria-label="Fermer la carte"
						onclick={() => (selectedId = null)}>✕</button
					>
				</div>
				{#key `${selected.location.latitude},${selected.location.longitude}`}
					<iframe
						title="Position de {name(selected)}"
						src={mapUrl(selected)}
						class="h-80 w-full border-0"
						loading="lazy"
					></iframe>
				{/key}
				<a
					class="block p-4 text-sm font-semibold text-blue-700 hover:underline"
					href={bigMapUrl(selected)}
					target="_blank"
					rel="noopener noreferrer">Ouvrir la carte en grand ↗</a
				>
			</aside>
		{/if}
	</div>
</section>

<style>
	.staff-avatar {
		display: flex;
		height: 44px;
		width: 44px;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 999px;
		border: 2px solid #fff;
		outline: 2px solid #005ca9;
		background: linear-gradient(135deg, #0f2849, #005ca9);
		color: #fff;
		font-weight: 800;
		font-size: 15px;
	}
</style>
