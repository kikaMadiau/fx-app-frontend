<script lang="ts">
	const rates = [
		{ pair: 'USD/CDF', buy: '2,770', sell: '2,795', change: '+0.6%', trend: 'up' },
		{ pair: 'EUR/CDF', buy: '3,000', sell: '3,035', change: '+0.3%', trend: 'up' },
		{ pair: 'GBP/CDF', buy: '3,480', sell: '3,525', change: '-0.2%', trend: 'down' }
	];
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Marché</span>
			<h1 class="app-title">Analyses</h1>
			<p class="app-subtitle">Suivi des taux et tendances principales.</p>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-3">
		{#each rates as rate (rate.pair)}
			<div class="app-card p-6 transition-all hover:shadow-lg">
				<div class="flex items-center justify-between">
					<p class="text-lg font-bold text-slate-950">{rate.pair}</p>
					<span
						class="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
						class:bg-green-100={rate.trend === 'up'}
						class:text-green-700={rate.trend === 'up'}
						class:bg-red-100={rate.trend === 'down'}
						class:text-red-700={rate.trend === 'down'}
					>
						{#if rate.trend === 'up'}
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
							</svg>
						{:else}
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
							</svg>
						{/if}
						{rate.change}
					</span>
				</div>

				<div class="mt-6 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50/50 p-4">
					<div>
						<p class="text-xs font-medium text-slate-500">Taux d'achat</p>
						<p class="mt-1 text-2xl font-bold text-slate-950">{rate.buy}</p>
					</div>
					<div>
						<p class="text-xs font-medium text-slate-500">Taux de vente</p>
						<p class="mt-1 text-2xl font-bold text-slate-950">{rate.sell}</p>
					</div>
				</div>

				<div class="mt-4 flex items-center justify-between text-xs text-slate-500">
					<span>Dernière mise à jour: il y a 5 min</span>
					<span class="flex items-center gap-1">
						<span class="h-2 w-2 rounded-full bg-green-500"></span>
						En temps réel
					</span>
				</div>
			</div>
		{/each}
	</div>

	<div class="mt-8 app-card p-6">
		<h2 class="text-lg font-semibold text-slate-950">Tendances du marché</h2>
		<p class="mt-1 text-sm text-slate-500">Analyse des mouvements récents sur le marché des changes.</p>

		<div class="mt-6 space-y-4">
			<div class="flex items-center justify-between rounded-xl bg-slate-50/50 p-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
						<svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="font-semibold text-slate-950">USD/CDF</p>
						<p class="text-xs text-slate-500">Stable - Faible volatilité</p>
					</div>
				</div>
				<span class="text-sm font-semibold text-green-600">+0.6%</span>
			</div>

			<div class="flex items-center justify-between rounded-xl bg-slate-50/50 p-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
						<svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="font-semibold text-slate-950">EUR/CDF</p>
						<p class="text-xs text-slate-500">En hausse - Faible volatilité</p>
					</div>
				</div>
				<span class="text-sm font-semibold text-green-600">+0.3%</span>
			</div>

			<div class="flex items-center justify-between rounded-xl bg-slate-50/50 p-4">
				<div class="flex items-center gap-3">
					<div class="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
						<svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<div>
						<p class="font-semibold text-slate-950">GBP/CDF</p>
						<p class="text-xs text-slate-500">En baisse - Faible volatilité</p>
					</div>
				</div>
				<span class="text-sm font-semibold text-red-600">-0.2%</span>
			</div>
		</div>
	</div>
</section>

<style>
	.app-card {
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}
</style>
