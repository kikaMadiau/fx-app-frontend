<script>
	import './layout.css';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.js';
	import Sidebar from '$lib/components/layouts/sidebar.svelte';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { applyTheme, preferences } from '$lib/stores/preferences.js';

	// Réapplique le thème (et suit le réglage de l'appareil quand « Système » est choisi).
	onMount(() => applyTheme(get(preferences).theme));

	let { children } = $props();
	let authChecked = $state(false);

	// Pages accessibles sans être connecté ; toutes les autres ont le menu et exigent une session.
	const publicRoutes = ['/', '/login', '/logout', '/register', '/reset', '/demo'];

	function isPublicRoute(pathname) {
		return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
	}

	$effect(() => {
		const pathname = page.url.pathname;
		const publicRoute = isPublicRoute(pathname);
		const authenticated = $session?.accessToken;

		if (publicRoute || authenticated) {
			authChecked = true;
			return;
		}

		authChecked = false;
		void goto(resolve('/'), { replaceState: true });
	});
</script>

<svelte:head><link rel="icon" type="image/png" href="/icons/favicon-64.png" /></svelte:head>

{#if isPublicRoute(page.url.pathname)}
	{@render children()}
{:else if authChecked && $session?.accessToken}
	<div class="min-h-screen">
		<Sidebar />

		<main class="app-banknotes min-h-screen pt-16 lg:ml-64 lg:pt-0">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="flex min-h-screen items-center justify-center text-sm text-slate-500">
		Redirection vers l’accueil…
	</div>
{/if}
