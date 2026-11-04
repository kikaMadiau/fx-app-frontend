<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	// Champ à libellé flottant : le libellé est dans le champ et remonte quand on écrit
	// (ou quand le champ a le focus). Pas de faux exemple en placeholder.
	let {
		id,
		label,
		type = 'text',
		value = $bindable(''),
		autocomplete,
		inputmode,
		error = '',
		hint = '',
		trailing
	}: {
		id: string;
		label: string;
		type?: string;
		value?: string;
		autocomplete?: HTMLInputAttributes['autocomplete'];
		inputmode?: HTMLInputAttributes['inputmode'];
		error?: string;
		hint?: string;
		trailing?: Snippet;
	} = $props();
</script>

<div>
	<div class="relative">
		<input
			{id}
			{type}
			{autocomplete}
			{inputmode}
			placeholder=" "
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error || hint ? `${id}-help` : undefined}
			class="floating-input peer block h-14 w-full rounded-xl border bg-white px-4 pt-5 pb-1.5 text-[15px] text-slate-950 transition outline-none
				{error
				? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
				: 'border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'}
				{trailing ? 'pr-12' : ''}"
			bind:value
		/>
		<label
			for={id}
			class="pointer-events-none absolute top-2 left-4 text-xs font-medium text-slate-500 transition-all
				peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-normal
				peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium
				{error ? 'peer-focus:text-red-600' : 'peer-focus:text-blue-700'}"
		>
			{label}
		</label>
		{#if trailing}{@render trailing()}{/if}
	</div>
	{#if error}
		<p id="{id}-help" class="mt-1.5 text-sm text-red-600">{error}</p>
	{:else if hint}
		<p id="{id}-help" class="mt-1.5 text-xs text-slate-500">{hint}</p>
	{/if}
</div>
