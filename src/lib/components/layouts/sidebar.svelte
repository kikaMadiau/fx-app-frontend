<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getProfile } from '$lib/api/profile.js';
	import { clearSession, session } from '$lib/stores/session.js';
	import { loadProfilePhoto, setProfilePhoto } from '$lib/stores/profile-photo.js';
	import ProfileAvatar from '$lib/components/layouts/ProfileAvatar.svelte';
	import { isPlatformAdmin, isSupervisor } from '$lib/types/trader.js';
	import { setPreferences } from '$lib/stores/preferences.js';
	import { pauseSharing, resumeSharing } from '$lib/stores/location-sharing.js';

	const ROLE_LABELS: Record<string, string> = {
		TRADER: 'Cambiste',
		COMPLIANCE_OFFICER: 'Conformité',
		SUPERVISOR: 'Superviseur',
		ADMIN: 'Administrateur'
	};

	// Cambiste connecté (photo, nom et rôle affichés en bas du menu).
	const userName = $derived(
		$session
			? `${$session.trader.first_name ?? ''} ${$session.trader.last_name ?? ''}`.trim() ||
					$session.trader.email
			: 'Compte professionnel'
	);
	const userRole = $derived(
		$session ? (ROLE_LABELS[$session.trader.role] ?? $session.trader.role) : 'Changeur'
	);
	const userInitials = $derived(
		userName
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase() ?? '')
			.join('') || 'FX'
	);

	onMount(async () => {
		if (!$session) return;
		loadProfilePhoto();
		// Préférences (thème, fuseau, format de date…) à jour depuis l'API, au cas où elles
		// auraient été changées sur un autre appareil.
		try {
			const response = await getProfile();
			if (response.profile.preferences) setPreferences(response.profile.preferences);
			resumeSharing(response.profile.location?.sharing ?? false);
		} catch {
			// hors ligne : on garde la copie locale
		}
	});

	async function logout() {
		pauseSharing();
		clearSession();
		setProfilePhoto(null);
		menuOpen = false;
		await goto(resolve('/login'));
	}

	const navigation = [
		{
			label: 'Vue d’ensemble',
			href: '/dashboard',
			icon: 'dashboard'
		},
		{
			label: 'Transactions',
			href: '/transactions',
			icon: 'transactions'
		},
		{
			label: 'Clients & KYC',
			href: '/customers',
			icon: 'customers'
		},
		{
			label: 'Alertes',
			href: '/alerts',
			icon: 'alerts'
		},
		{
			label: 'Analyses',
			href: '/analytics',
			icon: 'analytics'
		},
		{
			label: 'Rapports',
			href: '/reports',
			icon: 'reports'
		}
	] as const;

	type AccountLink = {
		label: string;
		href: '/profile' | '/staff' | '/team' | '/settings' | '/logout';
	};
	const accountNavigation = $derived<AccountLink[]>([
		{ label: 'Mon profil', href: '/profile' },
		// Administrateur : personnel des bureaux (adresse, position) et réglages des envois.
		...(isPlatformAdmin($session?.trader)
			? [{ label: 'Personnel', href: '/staff' } as AccountLink]
			: []),
		// Superviseur : son équipe et les inscriptions à accepter.
		...(isSupervisor($session?.trader)
			? [{ label: 'Mon équipe', href: '/team' } as AccountLink]
			: []),
		{ label: 'Paramètres', href: '/settings' },
		{ label: 'Déconnexion', href: '/logout' }
	]);

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	// Sous lg (1024px), le menu devient un tiroir ouvert par le bouton de la barre du haut.
	let menuOpen = $state(false);

	afterNavigate(() => {
		menuOpen = false;
	});

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') menuOpen = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Barre du haut (mobile et tablette) -->
<header
	class="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden"
>
	<button
		type="button"
		class="flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
		aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
		aria-expanded={menuOpen}
		aria-controls="app-sidebar"
		onclick={() => (menuOpen = !menuOpen)}
	>
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
	</button>

	<a href={resolve('/dashboard')} class="text-xl font-bold text-slate-950">
		MOTUYA <span class="font-medium">Fx</span><span class="text-blue-600">.</span>
	</a>

	<span class="h-10 w-10" aria-hidden="true"></span>
</header>

{#if menuOpen}
	<button
		type="button"
		class="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
		aria-label="Fermer le menu"
		onclick={() => (menuOpen = false)}
	></button>
{/if}

<aside
	id="app-sidebar"
	class={`fixed top-0 left-0 z-50 h-dvh w-64 max-w-[85vw]
	       border-r border-slate-200 bg-white/95 backdrop-blur
	       transition-transform duration-200 lg:z-40 lg:translate-x-0
	       ${menuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
>
	<div class="flex h-full flex-col">
		<!-- Logo -->
		<div class="flex h-20 items-center border-b border-slate-100 px-6">
			<a href={resolve('/dashboard')} class="text-xl font-bold text-slate-950">
				MOTUYA <span class="font-medium">Fx</span><span class="text-blue-600">.</span>
			</a>
		</div>

		<!-- Navigation -->
		<div class="flex-1 overflow-y-auto px-4 py-6">
			<p
				class="mb-3 px-3 text-xs font-semibold
			          text-slate-400 uppercase"
			>
				Plateforme
			</p>

			<nav>
				<ul class="space-y-1">
					{#each navigation as item}
						<li>
							<a
								href={resolve(item.href)}
								class={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors
								        ${
													isActive(item.href)
														? 'bg-blue-50 text-blue-700'
														: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
												}`}
							>
								<!-- Icon -->
								<div class="flex h-5 w-5 items-center justify-center">
									{#if item.icon === 'dashboard'}
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<rect x="3" y="3" width="7" height="7" rx="1" />
											<rect x="14" y="3" width="7" height="7" rx="1" />
											<rect x="3" y="14" width="7" height="7" rx="1" />
											<rect x="14" y="14" width="7" height="7" rx="1" />
										</svg>
									{:else if item.icon === 'transactions'}
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M4 7h16M4 12h16M4 17h16"
											/>
										</svg>
									{:else if item.icon === 'customers'}
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
											/>
											<circle cx="9" cy="7" r="4" />
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
											/>
										</svg>
									{:else if item.icon === 'alerts'}
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
											/>
										</svg>
									{:else if item.icon === 'analytics'}
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d="M3 3v18h18" />
											<path stroke-linecap="round" stroke-linejoin="round" d="M7 16l4-5 3 3 5-7" />
										</svg>
									{:else if item.icon === 'reports'}
										<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 2h9l5 5v15H6z" />
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M14 2v6h6M9 13h6M9 17h6"
											/>
										</svg>
									{/if}
								</div>

								<span>{item.label}</span>
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<div class="mt-8">
				<p class="mb-3 px-3 text-xs font-semibold text-slate-400 uppercase">Compte</p>

				<nav>
					<ul class="space-y-1">
						{#each accountNavigation as item}
							<li>
								<a
									href={resolve(item.href)}
									class={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors
									        ${
														isActive(item.href)
															? 'bg-blue-50 text-blue-700'
															: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
													}`}
								>
									{item.label}
								</a>
							</li>
						{/each}
					</ul>
				</nav>
			</div>
		</div>

		<!-- User -->
		<div class="flex items-center gap-2 border-t border-slate-100 p-4">
			{#if $session}
				<ProfileAvatar initials={userInitials} size={44} />
			{/if}
			<a
				href={resolve('/profile')}
				class="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 hover:bg-slate-50"
			>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold text-slate-950">{userName}</p>

					<p class="truncate text-xs text-slate-500">{userRole}</p>
				</div>
			</a>
			{#if $session}
				<button
					type="button"
					class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
					aria-label="Se déconnecter"
					title="Se déconnecter"
					onclick={logout}
				>
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 17l5-5-5-5M20 12H9M12 21H5a2 2 0 01-2-2V5a2 2 0 012-2h7"
						/>
					</svg>
				</button>
			{/if}
		</div>
	</div>
</aside>
