<script>
	import { resolve } from '$app/paths';
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Demo</span>
			<h1 class="app-title">Espace demo</h1>
			<p class="app-subtitle">Acces aux pages de demonstration et de verification.</p>
		</div>
	</div>

	<a class="app-button app-button-secondary" href={resolve('/demo/playwright')}>Playwright</a>
</section>
