<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

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

	const accountNavigation = [
		{
			label: 'Mon profil',
			href: '/profile'
		},
		{
			label: 'Paramètres',
			href: '/settings'
		}
	] as const;

	function isActive(href: string) {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}
</script>

<aside
	class="fixed top-0 left-0 z-40 h-screen w-64
	       border-r border-slate-200 bg-white/90 backdrop-blur"
>
	<div class="flex h-full flex-col">
		<!-- Logo -->
		<div class="flex h-20 items-center border-b border-slate-100 px-6">
			<a href={resolve('/dashboard')} class="text-xl font-bold text-slate-950">
				FX<span class="text-blue-600">.</span>
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
		<div class="border-t border-slate-100 p-4">
			<div class="flex items-center gap-3">
				<div
					class="flex h-9 w-9 items-center justify-center
					       rounded-lg bg-blue-50 text-sm font-semibold
					       text-blue-700"
				>
					FX
				</div>

				<div class="min-w-0">
					<p class="truncate text-sm font-semibold text-slate-950">Compte professionnel</p>

					<p class="truncate text-xs text-slate-500">Changeur</p>
				</div>
			</div>
		</div>
	</div>
</aside>
