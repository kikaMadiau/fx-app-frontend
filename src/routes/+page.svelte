<script>
	import { resolve } from '$app/paths';
	import Hero from '$lib/components/layouts/hero.svelte';
	import Navbar from '$lib/components/layouts/Navbar.svelte';

	const stats = [
		{
			value: '01',
			label: 'Dossier client',
			description:
				'Identité, pièces justificatives et statut de vérification regroupés sans friction.'
		},
		{
			value: '02',
			label: 'Opération contrôlée',
			description: 'Montants, devises, justificatifs et seuils suivis dans un flux unique.'
		},
		{
			value: '03',
			label: 'Revue prête',
			description: 'Les éléments sensibles remontent clairement avant audit ou validation interne.'
		}
	];

	const workflowSteps = [
		{
			step: '01',
			title: 'Identifier',
			description: 'Créez le profil client et rassemblez les pièces utiles.'
		},
		{
			step: '02',
			title: 'Enregistrer',
			description: "Ajoutez l'opération avec les montants, devises et justificatifs."
		},
		{
			step: '03',
			title: 'Contrôler',
			description: "Repérez les dossiers à revoir avant l'audit interne."
		}
	];
</script>

<Navbar />

<main class="home-page">
	<section class="page-section hero-panel">
		<Hero />
	</section>
	<section class="page-section first-section">
		<div
			class="container mx-auto grid min-h-[520px] gap-12 px-6 py-14 md:grid-cols-[0.82fr_1.18fr] md:items-center lg:px-12"
		>
			<div class="max-w-md">
				<span class="eyebrow">Vue exécutive</span>
				<h2 class="mt-4 text-3xl leading-tight font-semibold text-slate-950 md:text-5xl">
					Un cockpit clair pour piloter la conformité.
				</h2>
				<p class="mt-5 text-base leading-7 text-slate-600">
					La page d'accueil doit vendre une promesse simple : moins de dispersion, plus de contrôle,
					et une lecture immédiate des priorités.
				</p>
			</div>

			<div class="stats-grid grid gap-4 md:grid-cols-3">
				{#each stats as stat (stat.value)}
					<div class="metric-card">
						<p class="metric-index">{stat.value}</p>
						<p class="mt-8 text-lg font-semibold text-slate-950">{stat.label}</p>
						<p class="mt-3 text-sm leading-6 text-slate-600">{stat.description}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>
	<section class="page-section second-section">
		<div
			class="container mx-auto grid min-h-[560px] grid-cols-1 gap-12 px-6 py-14 md:grid-cols-[0.9fr_1.1fr] md:items-center lg:px-12"
		>
			<div class="max-w-md">
				<span class="eyebrow dark">Processus</span>

				<h2 class="mt-4 text-3xl leading-tight font-semibold text-slate-950 md:text-5xl">
					Un flux guidé, sans surcharge opérationnelle.
				</h2>

				<p class="mt-5 max-w-xl text-base leading-7 text-slate-600">
					FX App guide les équipes dans les actions essentielles : identifier le client, enregistrer
					l'opération et garder une trace claire des contrôles.
				</p>
			</div>

			<div class="workflow-panel">
				{#each workflowSteps as item (item.step)}
					<div class="workflow-row">
						<p class="workflow-step">{item.step}</p>
						<div>
							<p class="text-base font-semibold text-slate-950">{item.title}</p>
							<p class="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<section class="page-section final-section border-t border-slate-100 bg-blue-600">
		<div
			class="container mx-auto flex min-h-[360px] flex-col justify-center gap-8 px-6 py-14 md:flex-row md:items-center md:justify-between lg:px-12"
		>
			<div class="max-w-2xl">
				<span class="eyebrow final">Prochaine étape</span>
				<h2 class="mt-4 text-3xl leading-tight font-semibold text-white md:text-5xl">
					Prêt à structurer votre conformité de change ?
				</h2>
				<p class="mt-5 text-base leading-7 text-blue-100">
					Découvrez comment FX App peut accompagner vos équipes dans la gestion des clients,
					transactions et rapports.
				</p>
			</div>

			<a
				href={resolve('/contact')}
				class="inline-flex w-fit items-center justify-center rounded-lg bg-white px-7 py-4 text-sm font-semibold text-slate-950 shadow-2xl shadow-blue-950/20 transition duration-300 hover:bg-sky-50"
			>
				Demander une démo
			</a>
		</div>
	</section>
</main>

<style>
	:global(body) {
		background: #f5f7fb;
		color: #111827;
	}
	.home-page {
		position: relative;
		isolation: isolate;
		padding-bottom: 72px;
		background:
			linear-gradient(180deg, #f8fafc 0%, #eef2f7 58%, #f7f8fb 100%),
			linear-gradient(90deg, rgb(15 23 42 / 0.04) 1px, transparent 1px),
			linear-gradient(180deg, rgb(15 23 42 / 0.04) 1px, transparent 1px);
		background-size:
			auto,
			44px 44px,
			44px 44px;
	}
	.page-section {
		margin-right: clamp(18px, 6vw, 88px);
		margin-bottom: 40px;
		margin-left: clamp(18px, 6vw, 88px);
		border: 1px solid rgb(15 23 42 / 0.08);
		border-radius: 28px;
		box-shadow: 0 24px 70px rgb(15 23 42 / 0.12);
		overflow: hidden;
	}
	.hero-panel {
		margin-top: 40px;
		border: 0;
		box-shadow: none;
	}
	.first-section {
		margin-top: 40px;
		background:
			linear-gradient(135deg, rgb(255 255 255 / 0.98), rgb(248 250 252 / 0.98)),
			radial-gradient(circle at 92% 18%, rgb(14 165 233 / 0.12), transparent 30%);
	}
	.second-section {
		margin-top: 40px;
		background:
			linear-gradient(135deg, rgb(239 246 255 / 0.96), rgb(255 255 255 / 0.98)),
			radial-gradient(circle at 15% 85%, rgb(16 185 129 / 0.1), transparent 28%);
	}
	.final-section {
		margin-top: 40px;
		margin-bottom: 0;
		background: linear-gradient(135deg, #0f172a, #1d4ed8 70%, #0369a1);
	}
	.eyebrow {
		display: inline-flex;
		width: fit-content;
		border-radius: 999px;
		border: 1px solid rgb(37 99 235 / 0.16);
		background: rgb(37 99 235 / 0.08);
		padding: 8px 12px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0;
		text-transform: uppercase;
		color: #2563eb;
	}
	.eyebrow.dark {
		border-color: rgb(16 185 129 / 0.18);
		background: rgb(16 185 129 / 0.08);
		color: #047857;
	}
	.eyebrow.final {
		border-color: rgb(255 255 255 / 0.18);
		background: rgb(255 255 255 / 0.1);
		color: #dbeafe;
	}
	.metric-card {
		min-height: 270px;
		border-radius: 8px;
		border: 1px solid rgb(15 23 42 / 0.08);
		background: rgb(255 255 255 / 0.86);
		padding: 28px;
		box-shadow: 0 16px 40px rgb(15 23 42 / 0.06);
	}
	.metric-index {
		display: flex;
		height: 44px;
		width: 44px;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: #eff6ff;
		color: #2563eb;
		font-size: 14px;
		font-weight: 800;
	}
	.workflow-panel {
		border: 1px solid rgb(15 23 42 / 0.08);
		border-radius: 14px;
		background: rgb(255 255 255 / 0.86);
		padding: 8px;
		box-shadow: 0 18px 50px rgb(15 23 42 / 0.08);
	}
	.workflow-row {
		display: grid;
		grid-template-columns: 72px 1fr;
		gap: 20px;
		border-bottom: 1px solid rgb(15 23 42 / 0.08);
		padding: 26px;
	}
	.workflow-row:last-child {
		border-bottom: 0;
	}
	.workflow-step {
		display: flex;
		height: 48px;
		width: 48px;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		background: #ecfdf5;
		color: #047857;
		font-size: 15px;
		font-weight: 800;
	}

	@media (max-width: 768px) {
		.home-page {
			padding-bottom: 40px;
		}
		.page-section {
			margin-right: 16px;
			margin-bottom: 28px;
			margin-left: 16px;
			border-radius: 24px;
		}
		.metric-card {
			min-height: auto;
		}
		.workflow-row {
			grid-template-columns: 1fr;
			gap: 14px;
			padding: 22px;
		}
	}
</style>
