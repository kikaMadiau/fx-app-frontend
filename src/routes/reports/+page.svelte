<script lang="ts">
	import { resolve } from '$app/paths';

	const reports = [
		{ title: 'Rapport journalier', date: '25 août 2026', status: 'Pret', type: 'PDF', size: '2.4 MB' },
		{ title: 'Synthèse mensuelle', date: 'Août 2026', status: 'En cours', type: 'Excel', size: '1.8 MB' },
		{ title: 'Rapport KYC', date: 'Août 2026', status: 'Pret', type: 'PDF', size: '3.1 MB' },
		{ title: 'Rapport annuel 2025', date: 'Décembre 2025', status: 'Pret', type: 'PDF', size: '5.6 MB' }
	];

	const downloadReport = (title: string) => {
		console.log(`Téléchargement du rapport: ${title}`);
	};
</script>

<section class="app-shell">
	<div class="app-header">
		<div>
			<span class="app-kicker">Exports</span>
			<h1 class="app-title">Rapports</h1>
			<p class="app-subtitle">Documents de suivi et exports.</p>
		</div>
		<button class="app-button app-button-primary">
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Nouveau rapport
		</button>
	</div>

	<div class="mt-6 grid gap-6 lg:grid-cols-3">
		{#each reports as report (report.title)}
			<div class="app-card group p-6 transition-all hover:shadow-lg">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span
								class="rounded-lg px-2 py-1 text-xs font-semibold"
								class:bg-blue-100={report.type === 'PDF'}
								class:text-blue-700={report.type === 'PDF'}
								class:bg-green-100={report.type === 'Excel'}
								class:text-green-700={report.type === 'Excel'}
							>
								{report.type}
							</span>
							<span class="text-xs text-slate-400">{report.size}</span>
						</div>
						<h2 class="mt-3 text-lg font-bold text-slate-950">{report.title}</h2>
						<p class="mt-1 text-sm text-slate-500">{report.date}</p>
					</div>
					<button
						on:click={() => downloadReport(report.title)}
						class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
						title="Télécharger"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
					</button>
				</div>

				<div class="mt-5 flex items-center justify-between">
					<span
						class={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
							report.status === 'Pret'
								? 'bg-green-100 text-green-700'
								: 'bg-blue-100 text-blue-700'
						}`}
					>
						{#if report.status === 'Pret'}
							<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{/if}
						{report.status}
					</span>
					<button
						on:click={() => downloadReport(report.title)}
						class="text-sm font-medium text-blue-600 hover:text-blue-700"
					>
						Télécharger →
					</button>
				</div>
			</div>
		{/each}
	</div>

	<div class="mt-8 grid gap-6 lg:grid-cols-2">
		<div class="app-card p-6">
			<h3 class="text-lg font-semibold text-slate-950">Filtres</h3>
			<div class="mt-4 space-y-4">
				<div>
					<label class="text-sm font-medium text-slate-700">Période</label>
					<select class="app-input mt-1">
						<option>Tout sélectionner</option>
						<option>Ce mois</option>
						<option>Ce trimestre</option>
						<option>Cette année</option>
					</select>
				</div>
				<div>
					<label class="text-sm font-medium text-slate-700">Type de document</label>
					<select class="app-input mt-1">
						<option>Tout sélectionner</option>
						<option>Rapports PDF</option>
						<option>Rapports Excel</option>
					</select>
				</div>
				<div>
					<label class="text-sm font-medium text-slate-700">Statut</label>
					<select class="app-input mt-1">
						<option>Tout sélectionner</option>
						<option>Prêt</option>
						<option>En cours</option>
					</select>
				</div>
			</div>
			<div class="mt-6 flex gap-3">
				<button class="app-button app-button-secondary flex-1">Appliquer</button>
				<button class="app-button app-button-secondary flex-1">Réinitialiser</button>
			</div>
		</div>

		<div class="app-card p-6">
			<h3 class="text-lg font-semibold text-slate-950">Statistiques</h3>
			<div class="mt-6 grid grid-cols-2 gap-4">
				<div class="rounded-xl bg-slate-50/50 p-4">
					<p class="text-sm font-medium text-slate-500">Total rapports</p>
					<p class="mt-1 text-2xl font-bold text-slate-950">12</p>
				</div>
				<div class="rounded-xl bg-slate-50/50 p-4">
					<p class="text-sm font-medium text-slate-500">Prêts</p>
					<p class="mt-1 text-2xl font-bold text-green-600">9</p>
				</div>
				<div class="rounded-xl bg-slate-50/50 p-4">
					<p class="text-sm font-medium text-slate-500">En cours</p>
					<p class="mt-1 text-2xl font-bold text-blue-600">3</p>
				</div>
				<div class="rounded-xl bg-slate-50/50 p-4">
					<p class="text-sm font-medium text-slate-500">Taille totale</p>
					<p class="mt-1 text-2xl font-bold text-slate-950">15.2 MB</p>
				</div>
			</div>
		</div>
	</div>
</section>

<style>
	.app-input {
		width: 100%;
		border-radius: 12px;
		border: 1px solid #e2e8f0;
		background: white;
		padding: 10px 16px;
		font-size: 14px;
		color: #0f172a;
		outline: none;
		transition: all 200ms ease;
	}
	.app-input:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
	}
	.app-input::placeholder {
		color: #94a3b8;
	}
</style>
