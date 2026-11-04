<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { clearSession } from '$lib/stores/session.js';

	onMount(async () => {
		clearSession();
		await goto(resolve('/login'), { replaceState: true });
	});
</script>

<div class="flex min-h-screen items-center justify-center text-sm text-slate-500">
	Déconnexion en cours…
</div>
