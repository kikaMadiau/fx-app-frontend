<script>
	import { resolve } from '$app/paths';

	let isMenuOpen = $state(false);

	const navLinks = [
		{ href: '/', label: 'Accueil' },
		{ href: '/about', label: 'À propos' },
		{ href: '/contact', label: 'Contact' }
	];
</script>

<nav class="relative z-[1000] border-b border-slate-100 bg-white/90 backdrop-blur">
	<div class="container mx-auto flex items-center justify-between px-6 py-5">
		<a href={resolve('/')} class="flex items-center gap-2" onclick={() => (isMenuOpen = false)}>
			<span class="text-xl font-bold text-slate-950">
				MOTUYA <span class="font-medium">Fx</span><span class="text-blue-600">.</span>
			</span>
		</a>

		<div class="hidden items-center gap-8 text-sm font-semibold md:flex">
			{#each navLinks as link (link.href)}
				<a
					href={resolve(link.href)}
					class="text-slate-600 transition-colors duration-200 hover:text-blue-600"
				>
					{link.label}
				</a>
			{/each}

			<a
				href={resolve('/login')}
				class="rounded-lg bg-slate-950 px-5 py-2.5 text-white shadow-lg shadow-slate-950/10 transition-colors duration-200 hover:bg-blue-700"
			>
				Connexion
			</a>
		</div>

		<button
			type="button"
			class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-950 transition duration-200 hover:bg-slate-50 md:hidden"
			aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
			aria-expanded={isMenuOpen}
			onclick={() => (isMenuOpen = !isMenuOpen)}
		>
			<span class="flex w-5 flex-col gap-1.5">
				<span
					class={`h-0.5 rounded-full bg-current transition ${isMenuOpen ? 'translate-y-2 rotate-45' : ''}`}
				></span>
				<span class={`h-0.5 rounded-full bg-current transition ${isMenuOpen ? 'opacity-0' : ''}`}
				></span>
				<span
					class={`h-0.5 rounded-full bg-current transition ${isMenuOpen ? '-translate-y-2 -rotate-45' : ''}`}
				></span>
			</span>
		</button>
	</div>

	{#if isMenuOpen}
		<div
			class="absolute inset-x-0 top-full z-[1000] h-[250px] border-t border-slate-100 bg-white shadow-lg md:hidden"
		>
			<div class="container mx-auto flex flex-col gap-1 px-6 py-4 text-sm font-medium">
				{#each navLinks as link (link.href)}
					<a
						href={resolve(link.href)}
						class="rounded-lg px-3 py-3 text-slate-700 transition duration-200 hover:bg-slate-50 hover:text-blue-600"
						onclick={() => (isMenuOpen = false)}
					>
						{link.label}
					</a>
				{/each}

				<a
					href={resolve('/login')}
					class="mt-2 inline-flex items-center justify-center rounded-lg bg-slate-950 px-5 py-3 text-white transition-colors duration-200 hover:bg-blue-700"
					onclick={() => (isMenuOpen = false)}
				>
					Connexion
				</a>
			</div>
		</div>
	{/if}
</nav>
