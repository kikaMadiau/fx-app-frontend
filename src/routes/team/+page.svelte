<script lang="ts">
	// Superviseur : les inscriptions en attente (accepter / refuser) et l'équipe de son bureau.
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		approveMember,
		isPending,
		listTeam,
		rejectMember,
		type TeamMember
	} from '$lib/api/team.js';
	import { session } from '$lib/stores/session.js';
	import { isSupervisor } from '$lib/types/trader.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';
	import { formatDate } from '$lib/utils/dates.js';

	const ROLE_LABELS: Record<string, string> = {
		TRADER: 'Cambiste',
		COMPLIANCE_OFFICER: 'Conformité',
		SUPERVISOR: 'Superviseur'
	};

	let members = $state<TeamMember[]>([]);
	let loading = $state(true);
	let error = $state('');
	let notice = $state('');
	let busyId = $state<number | null>(null);
	let confirmReject = $state<TeamMember | null>(null);

	const storeId = $derived($session?.trader.store_id ?? 0);
	const officeName = $derived($session?.trader.store?.name ?? '');
	const pending = $derived(members.filter(isPending));
	const team = $derived(members.filter((m) => !isPending(m)));

	function fullName(m: TeamMember) {
		return `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.email;
	}
	function initials(m: TeamMember) {
		const parts = fullName(m).split(/\s+/).filter(Boolean);
		return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
	}
	function roles(m: TeamMember) {
		return (m.roles || 'TRADER')
			.split(',')
			.map((r) => ROLE_LABELS[r.trim()] ?? r.trim())
			.join(', ');
	}

	async function load() {
		loading = true;
		error = '';
		try {
			members = await listTeam(storeId);
		} catch (e) {
			error = getUserFacingErrorMessage(e);
		} finally {
			loading = false;
		}
	}

	async function approve(m: TeamMember) {
		busyId = m.id;
		error = notice = '';
		try {
			await approveMember(storeId, m);
			notice = `${fullName(m)} peut maintenant se connecter.`;
			await load();
		} catch (e) {
			error = getUserFacingErrorMessage(e);
		} finally {
			busyId = null;
		}
	}

	async function reject() {
		const m = confirmReject;
		if (!m) return;
		busyId = m.id;
		error = notice = '';
		try {
			await rejectMember(storeId, m.id);
			notice = `La demande de ${fullName(m)} est refusée.`;
			confirmReject = null;
			await load();
		} catch (e) {
			error = getUserFacingErrorMessage(e);
		} finally {
			busyId = null;
		}
	}

	onMount(async () => {
		if (!isSupervisor($session?.trader) || !storeId) {
			await goto(resolve('/dashboard'));
			return;
		}
		await load();
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (confirmReject = null)} />

<section class="app-shell">
	<div class="app-header">
		<div class="app-header-row flex-wrap">
			<div>
				<h1 class="app-title">Mon équipe</h1>
				<p class="app-subtitle">
					{officeName ? `${officeName} : ` : ''}acceptez les nouvelles inscriptions et voyez qui
					travaille au bureau.
				</p>
			</div>
			<button class="app-button app-button-secondary" onclick={load} disabled={loading}>
				Actualiser
			</button>
		</div>
	</div>

	{#if notice}
		<p
			class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
			role="status"
			data-testid="team-notice"
		>
			{notice}
		</p>
	{/if}
	{#if error}
		<p class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>
	{/if}

	<div class="app-card mb-6 p-5" data-testid="team-pending">
		<div class="mb-4 flex items-center gap-3">
			<h2 class="text-lg font-bold text-slate-950">Demandes en attente</h2>
			{#if pending.length}
				<span class="pending-count">{pending.length}</span>
			{/if}
		</div>
		{#if loading && !members.length}
			<p class="text-sm text-slate-500">Chargement…</p>
		{:else if !pending.length}
			<p class="text-sm text-slate-500">
				Aucune demande. Quand quelqu'un crée un compte avec l'agrément de votre bureau, il apparaît
				ici.
			</p>
		{:else}
			<p class="mb-4 text-sm text-slate-600">
				N'acceptez que les personnes qui travaillent vraiment dans votre bureau : une fois
				acceptées, elles voient vos clients et leurs pièces d'identité.
			</p>
			<ul class="grid gap-3 md:grid-cols-2">
				{#each pending as m (m.id)}
					<li class="pending-card" data-testid="pending-card">
						<span class="team-avatar pending" aria-hidden="true">{initials(m)}</span>
						<div class="min-w-0 flex-1">
							<p class="truncate font-bold text-slate-950">{fullName(m)}</p>
							<p class="truncate text-sm text-slate-600">{m.email}</p>
							{#if m.phone}<p class="text-sm text-slate-600">{m.phone}</p>{/if}
							<p class="mt-1 text-xs text-slate-500">
								Demande du {formatDate(m.created_at, { withTime: true })}
							</p>
							<div class="mt-3 flex flex-wrap gap-2">
								<button
									class="app-button app-button-primary"
									onclick={() => approve(m)}
									disabled={busyId === m.id}
									data-testid="approve"
								>
									Accepter
								</button>
								<button
									class="app-button app-button-secondary text-red-700"
									onclick={() => (confirmReject = m)}
									disabled={busyId === m.id}
									data-testid="reject"
								>
									Refuser
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<div class="app-card p-5" data-testid="team-list">
		<h2 class="mb-4 text-lg font-bold text-slate-950">L'équipe ({team.length})</h2>
		{#if !team.length && !loading}
			<p class="text-sm text-slate-500">Aucun membre.</p>
		{/if}
		<ul class="divide-y divide-slate-100">
			{#each team as m (m.id)}
				<li class="flex items-center gap-3 py-3">
					<span class="team-avatar" aria-hidden="true">{initials(m)}</span>
					<div class="min-w-0 flex-1">
						<p class="truncate font-semibold text-slate-950">
							{fullName(m)}
							{#if m.id === $session?.trader.id}<span class="text-xs font-normal text-slate-500"
									>(vous)</span
								>{/if}
						</p>
						<p class="truncate text-sm text-slate-500">{m.email}</p>
					</div>
					<span class="role-pill">{roles(m)}</span>
					{#if !m.is_active}
						<span class="inactive-pill">Désactivé</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
</section>

{#if confirmReject}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
		<div
			class="app-card w-full max-w-md p-6"
			role="dialog"
			aria-modal="true"
			aria-labelledby="reject-title"
		>
			<h2 id="reject-title" class="text-lg font-bold text-slate-950">Refuser cette demande ?</h2>
			<p class="mt-2 text-sm text-slate-600">
				Le compte de <strong>{fullName(confirmReject)}</strong> sera supprimé. Cette personne pourra refaire
				une demande plus tard.
			</p>
			<div class="mt-6 flex justify-end gap-2">
				<button class="app-button app-button-secondary" onclick={() => (confirmReject = null)}>
					Annuler
				</button>
				<button
					class="app-button app-button-primary bg-red-600 hover:bg-red-700"
					onclick={reject}
					disabled={busyId === confirmReject.id}
					data-testid="confirm-reject"
				>
					Refuser la demande
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.pending-count {
		border-radius: 999px;
		background: #ffa401;
		padding: 2px 10px;
		font-size: 13px;
		font-weight: 800;
		color: #0f2849;
	}
	.pending-card {
		display: flex;
		gap: 14px;
		border-radius: 14px;
		border: 1px solid rgb(255 164 1 / 0.45);
		background: rgb(255 164 1 / 0.07);
		padding: 16px;
	}
	.team-avatar {
		display: flex;
		height: 42px;
		width: 42px;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		background: #eaf6ff;
		font-size: 14px;
		font-weight: 800;
		color: #005ca9;
	}
	.team-avatar.pending {
		background: #fff3d6;
		color: #8a5a00;
	}
	.role-pill {
		border-radius: 999px;
		background: #eaf6ff;
		padding: 3px 10px;
		font-size: 12px;
		font-weight: 700;
		color: #005ca9;
		white-space: nowrap;
	}
	.inactive-pill {
		border-radius: 999px;
		background: #f1f5f9;
		padding: 3px 10px;
		font-size: 12px;
		font-weight: 700;
		color: #64748b;
	}
	:global(:root[data-theme='dark']) .team-avatar,
	:global(:root[data-theme='dark']) .role-pill {
		background: rgb(61 143 214 / 0.15);
		color: #a9d3f5;
	}
	:global(:root[data-theme='dark']) .team-avatar.pending {
		background: rgb(255 164 1 / 0.15);
		color: #ffc966;
	}
</style>
