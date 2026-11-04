<script lang="ts">
	import type { Snippet } from 'svelte';

	// Mise en page des écrans de connexion : panneau de marque MOTUYA à gauche (ordinateur)
	// ou en bandeau (téléphone), contenu à droite.
	let { children }: { children: Snippet } = $props();

	const POINTS = [
		'Opérations et bordereaux enregistrés au guichet',
		'Dossiers KYC, alertes et contrôle de la conformité',
		'Rapports d’activité prêts pour la BCC'
	];
</script>

{#snippet brand(size: 'lg' | 'sm')}
	<div class="flex items-center gap-3">
		<img
			src="/branding/motuya-mark.png"
			alt=""
			class={size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-9 w-9 rounded-lg'}
		/>
		<span class="{size === 'lg' ? 'text-2xl' : 'text-xl'} font-bold tracking-wide text-white">
			MOTUYA <span class="font-medium">Fx</span><span class="text-[#C8A04A]">.</span>
		</span>
	</div>
{/snippet}

<div class="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
	<aside class="auth-hero relative hidden flex-col justify-between p-12 text-white lg:flex xl:p-16">
		{@render brand('lg')}

		<div class="max-w-md">
			<p class="mb-4 text-xs font-semibold tracking-[0.2em] text-[#C8A04A] uppercase">
				Plateforme de supervision du marché des changes
			</p>
			<h2 class="text-4xl leading-tight font-semibold xl:text-5xl">
				Le change, en toute conformité.
			</h2>
			<ul class="mt-8 space-y-4 text-[15px] text-slate-200">
				{#each POINTS as point (point)}
					<li class="flex items-start gap-3">
						<span
							class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C8A04A]/20 text-[#E2C27A]"
						>
							<svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path
									fill-rule="evenodd"
									d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
									clip-rule="evenodd"
								/>
							</svg>
						</span>
						{point}
					</li>
				{/each}
			</ul>
		</div>

		<div class="flex items-center gap-3 border-t border-white/15 pt-6 text-sm text-slate-300">
			<img src="/branding/logo-bcc.png" alt="" class="h-10 w-auto" />
			<span
				>Un service de la <span class="font-semibold text-white">Banque Centrale du Congo</span
				></span
			>
		</div>
	</aside>

	<main class="flex flex-col">
		<div class="auth-hero flex items-center px-6 py-5 lg:hidden">
			{@render brand('sm')}
		</div>

		<div class="flex flex-1 items-center justify-center px-6 py-10 sm:px-10">
			<div class="w-full max-w-[400px]">
				{@render children()}

				<p class="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400">
					<svg
						class="h-3.5 w-3.5"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<rect x="5" y="11" width="14" height="10" rx="2" />
						<path stroke-linecap="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
					</svg>
					Connexion chiffrée · vos informations sont protégées.
				</p>
			</div>
		</div>
	</main>
</div>

<style>
	/* Billets de la Banque Centrale du Congo sous un voile bleu nuit MOTUYA. */
	.auth-hero {
		background:
			linear-gradient(
				160deg,
				rgb(11 27 58 / 0.94) 0%,
				rgb(11 27 58 / 0.82) 55%,
				rgb(11 27 58 / 0.9) 100%
			),
			url('/branding/login-billets.webp') center / cover no-repeat;
	}
</style>
