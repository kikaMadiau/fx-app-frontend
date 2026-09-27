<script lang="ts">
	const rates = [
		{ pair: 'USD/CDF', buy: '2,770', sell: '2,795', change: '+0.6%' },
		{ pair: 'EUR/CDF', buy: '3,000', sell: '3,035', change: '+0.3%' },
		{ pair: 'GBP/CDF', buy: '3,480', sell: '3,525', change: '-0.2%' }
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

	<div class="grid gap-5 md:grid-cols-3">
		{#each rates as rate (rate.pair)}
			<div class="app-card p-5">
				<p class="text-sm font-semibold text-slate-500">{rate.pair}</p>
				<div class="mt-4 grid grid-cols-2 gap-4">
					<div>
						<p class="text-xs font-semibold text-slate-400 uppercase">Achat</p>
						<p class="mt-1 text-xl font-semibold text-slate-950">{rate.buy}</p>
					</div>
					<div>
						<p class="text-xs font-semibold text-slate-400 uppercase">Vente</p>
						<p class="mt-1 text-xl font-semibold text-slate-950">{rate.sell}</p>
					</div>
				</div>
				<p class="mt-4 text-sm font-semibold text-blue-600">{rate.change}</p>
			</div>
		{/each}
	</div>
</section>
