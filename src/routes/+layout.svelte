<script>
	import './layout.css';
	import { page } from '$app/state';
	import Sidebar from '$lib/components/layouts/sidebar.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	const appRoutes = [
		'/dashboard',
		'/transactions',
		'/customers',
		'/alerts',
		'/analytics',
		'/reports',
		'/profile',
		'/settings'
	];

	function hasSidebar(pathname) {
		return appRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if hasSidebar(page.url.pathname)}
	<div class="min-h-screen">
		<Sidebar />

		<main class="min-h-screen lg:ml-64">
			{@render children()}
		</main>
	</div>
{:else}
	{@render children()}
{/if}
