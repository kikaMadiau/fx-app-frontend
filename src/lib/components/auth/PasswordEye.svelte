<script lang="ts">
	// Bouton « œil » placé dans un champ mot de passe : affiche ou masque ce qui est saisi.
	let { shown = $bindable(false) }: { shown?: boolean } = $props();
</script>

<button
	type="button"
	class="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 hover:text-slate-700 focus-visible:text-slate-700"
	aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
	aria-pressed={shown}
	data-testid="toggle-password"
	onclick={() => (shown = !shown)}
>
	<svg
		class="h-5 w-5"
		fill="none"
		stroke="currentColor"
		stroke-width="1.8"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		{#if shown}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.5-2.4 3.7M6.4 6.4C4.4 7.7 3 9.8 2.5 12c1 2.8 4.5 7 9.5 7 1.7 0 3.2-.5 4.5-1.2"
			/>
		{:else}
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M2.5 12C3.5 9.2 7 5 12 5s8.5 4.2 9.5 7c-1 2.8-4.5 7-9.5 7s-8.5-4.2-9.5-7Z"
			/>
			<circle cx="12" cy="12" r="3" />
		{/if}
	</svg>
</button>
