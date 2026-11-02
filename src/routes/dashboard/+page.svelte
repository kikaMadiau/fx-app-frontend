<script lang="ts">
	const cards = [
		{ label: "Transactions aujourd'hui", value: '128', detail: '+12 depuis hier' },
		{ label: 'Volume total', value: '$48,200', detail: 'Operations du jour' },
		{ label: 'Clients actifs', value: '342', detail: '24 nouveaux ce mois' },
		{ label: 'Alertes ouvertes', value: '7', detail: '3 urgentes' }
	];

	const recentTransactions = [
		{ client: 'Jean K.', operation: 'Achat USD', amount: '$2,450', status: 'Validee' },
		{ client: 'Marie M.', operation: 'Vente EUR', amount: 'EUR 8,200', status: 'A verifier' },
		{ client: 'Patrick N.', operation: 'Achat USD', amount: '$1,180', status: 'En cours' }
	];
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Pilotage</span>
			<h1 class="app-title">Vue d'ensemble</h1>
			<p class="app-subtitle">Resume des donnees principales de la plateforme.</p>
		</div>
	</div>

	<div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
		{#each cards as card (card.label)}
			<div class="app-stat-card">
				<p class="app-stat-label">{card.label}</p>
				<p class="app-stat-value">{card.value}</p>
				<p class="app-stat-detail">{card.detail}</p>
			</div>
		{/each}
	</div>

	<div class="mt-8 grid gap-6 xl:grid-cols-[1fr_360px]">
		<div class="app-card">
			<div class="app-card-header">
				<h2 class="app-card-title">Transactions recentes</h2>
				<p class="app-card-subtitle">Les dernieres operations saisies.</p>
			</div>

			<div class="overflow-x-auto">
				<table class="app-table">
					<thead>
						<tr>
							<th>Client</th>
							<th>Operation</th>
							<th>Montant</th>
							<th>Statut</th>
						</tr>
					</thead>
					<tbody>
						{#each recentTransactions as transaction (transaction.client)}
							<tr>
								<td class="font-semibold text-slate-950">{transaction.client}</td>
								<td>{transaction.operation}</td>
								<td class="font-semibold text-slate-950">{transaction.amount}</td>
								<td>{transaction.status}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="app-card p-5">
			<h2 class="app-card-title">Taux du jour</h2>
			<div class="mt-5 space-y-4 text-sm">
				<div class="rounded-xl bg-slate-50/50 p-3">
					<p class="mb-2 text-xs font-medium text-slate-500">USD / CDF</p>
					<div class="flex justify-between gap-4">
						<div class="flex-1">
							<p class="text-xs text-slate-500">Achat</p>
							<p class="mt-1 font-semibold text-slate-950">2,775</p>
						</div>
						<div class="flex-1">
							<p class="text-xs text-slate-500">Vente</p>
							<p class="mt-1 font-semibold text-slate-950">2,785</p>
						</div>
					</div>
				</div>
				<div class="rounded-xl bg-slate-50/50 p-3">
					<p class="mb-2 text-xs font-medium text-slate-500">EUR / CDF</p>
					<div class="flex justify-between gap-4">
						<div class="flex-1">
							<p class="text-xs text-slate-500">Achat</p>
							<p class="mt-1 font-semibold text-slate-950">3,015</p>
						</div>
						<div class="flex-1">
							<p class="text-xs text-slate-500">Vente</p>
							<p class="mt-1 font-semibold text-slate-950">3,025</p>
						</div>
					</div>
				</div>
				<div class="rounded-xl bg-slate-50/50 p-3">
					<p class="mb-2 text-xs font-medium text-slate-500">GBP / CDF</p>
					<div class="flex justify-between gap-4">
						<div class="flex-1">
							<p class="text-xs text-slate-500">Achat</p>
							<p class="mt-1 font-semibold text-slate-950">3,505</p>
						</div>
						<div class="flex-1">
							<p class="text-xs text-slate-500">Vente</p>
							<p class="mt-1 font-semibold text-slate-950">3,515</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
