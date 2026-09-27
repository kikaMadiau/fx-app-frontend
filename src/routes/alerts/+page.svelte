<script lang="ts">
	const alerts = [
		{
			id: 'AL-001',
			level: 'Critique',
			title: 'Transaction inhabituelle',
			description: 'Montant superieur au profil habituel du client.',
			client: {
				name: 'Marie M.',
				phone: '+243 820 000 002',
				kyc: 'A completer'
			},
			transaction: {
				id: 'TX-002',
				type: 'Vente EUR',
				amount: 'EUR 8,200',
				rate: '3,020 CDF',
				date: '25 aout 2026'
			}
		},
		{
			id: 'AL-002',
			level: 'Moyen',
			title: 'KYC incomplet',
			description: 'Piece identite manquante dans le dossier client.',
			client: {
				name: 'Aline B.',
				phone: '+243 850 000 004',
				kyc: 'En revue'
			},
			transaction: {
				id: 'TX-004',
				type: 'Vente GBP',
				amount: 'GBP 3,600',
				rate: '3,510 CDF',
				date: '24 aout 2026'
			}
		},
		{
			id: 'AL-003',
			level: 'Moyen',
			title: 'Operations rapprochees',
			description: 'Plusieurs transactions detectees sur une courte periode.',
			client: {
				name: 'Patrick N.',
				phone: '+243 990 000 003',
				kyc: 'Verifie'
			},
			transaction: {
				id: 'TX-003',
				type: 'Achat USD',
				amount: '$1,180',
				rate: '2,775 CDF',
				date: '24 aout 2026'
			}
		}
	];

	function levelClass(level: string) {
		if (level === 'Critique') {
			return 'app-badge-danger';
		}

		return 'app-badge-warning';
	}

	let openedAlerts = $state<string[]>([]);

	function isOpen(id: string) {
		return openedAlerts.includes(id);
	}

	function toggleAlert(id: string) {
		openedAlerts = isOpen(id)
			? openedAlerts.filter((openedAlert) => openedAlert !== id)
			: [...openedAlerts, id];
	}
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Surveillance</span>
			<h1 class="app-title">Alertes</h1>
			<p class="app-subtitle">Alertes avec le client et la transaction concernee.</p>
		</div>
	</div>

	<div class="space-y-5">
		{#each alerts as alert}
			<article class="app-card p-5">
				<div
					class={`flex flex-col gap-4 md:flex-row md:items-start md:justify-between ${
						isOpen(alert.id) ? 'border-b border-slate-100 pb-5' : ''
					}`}
				>
					<div>
						<div class="flex flex-wrap items-center gap-3">
							<h2 class="font-semibold text-slate-950">{alert.title}</h2>
							<span class={`app-badge ${levelClass(alert.level)}`}>{alert.level}</span>
						</div>
						<p class="mt-2 text-sm text-slate-500">{alert.description}</p>
					</div>

					<button
						class="app-button app-button-secondary w-fit px-3 py-2"
						aria-expanded={isOpen(alert.id)}
						aria-controls={`${alert.id}-details`}
						onclick={() => toggleAlert(alert.id)}
					>
						{isOpen(alert.id) ? 'Masquer' : 'Voir details'}
					</button>
				</div>

				{#if isOpen(alert.id)}
					<div id={`${alert.id}-details`} class="mt-5 grid gap-5 lg:grid-cols-2">
						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-xs font-semibold text-slate-400 uppercase">Client concerne</p>
							<h3 class="mt-3 font-semibold text-slate-950">{alert.client.name}</h3>
							<div class="mt-3 grid gap-2 text-sm">
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Telephone</span>
									<span class="font-semibold text-slate-950">{alert.client.phone}</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">KYC</span>
									<span class="font-semibold text-slate-950">{alert.client.kyc}</span>
								</div>
							</div>
						</div>

						<div class="rounded-lg bg-slate-50 p-4">
							<p class="text-xs font-semibold text-slate-400 uppercase">Transaction concernee</p>
							<h3 class="mt-3 font-semibold text-slate-950">{alert.transaction.id}</h3>
							<div class="mt-3 grid gap-2 text-sm">
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Operation</span>
									<span class="font-semibold text-slate-950">{alert.transaction.type}</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Montant</span>
									<span class="font-semibold text-slate-950">{alert.transaction.amount}</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Taux</span>
									<span class="font-semibold text-slate-950">{alert.transaction.rate}</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="text-slate-500">Date</span>
									<span class="font-semibold text-slate-950">{alert.transaction.date}</span>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</article>
		{/each}
	</div>
</section>
