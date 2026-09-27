<script lang="ts">
	const reports = [
		{ title: 'Rapport journalier', date: '25 aout 2026', status: 'Pret' },
		{ title: 'Synthese mensuelle', date: 'Aout 2026', status: 'En cours' },
		{ title: 'Rapport KYC', date: 'Aout 2026', status: 'Pret' }
	];
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Exports</span>
			<h1 class="app-title">Rapports</h1>
			<p class="app-subtitle">Documents de suivi et exports.</p>
		</div>
	</div>

	<div class="app-card">
		{#each reports as report (report.title)}
			<div class="flex items-center justify-between border-b border-slate-100 p-5 last:border-b-0">
				<div>
					<h2 class="font-semibold text-slate-950">{report.title}</h2>
					<p class="mt-1 text-sm text-slate-500">{report.date}</p>
				</div>
				<span
					class={`app-badge ${report.status === 'Pret' ? 'app-badge-success' : 'app-badge-info'}`}
				>
					{report.status}
				</span>
			</div>
		{/each}
	</div>
</section>
