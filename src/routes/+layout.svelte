<script>
	import './layout.css';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { session } from '$lib/stores/session.js';
	import Sidebar from '$lib/components/layouts/sidebar.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let authChecked = $state(false);

	const publicRoutes = ['/', '/login', '/logout'];

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

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if isPublicRoute(page.url.pathname)}
	{@render children()}
{:else if authChecked && $session?.accessToken}
	<div class="min-h-screen">
		<Sidebar />

		<main class="min-h-screen lg:ml-64">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="flex min-h-screen items-center justify-center text-sm text-slate-500">
		Redirection vers l’accueil…
	</div>
{/if}
