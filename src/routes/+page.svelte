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
					MOTUYA Fx. guide les équipes dans les actions essentielles : identifier le client, enregistrer
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
					Découvrez comment MOTUYA Fx. peut accompagner vos équipes dans la gestion des clients,
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
		background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
		color: #0f172a;
	}
	.home-page {
		position: relative;
		isolation: isolate;
		padding-bottom: 80px;
		background:
			radial-gradient(circle at 0% 0%, rgba(14, 165, 233, 0.05) 0%, transparent 50%),
			radial-gradient(circle at 100% 100%, rgba(16, 185, 129, 0.05) 0%, transparent 50%);
	}
	.page-section {
		margin-right: clamp(20px, 5vw, 80px);
		margin-bottom: 56px;
		margin-left: clamp(20px, 5vw, 80px);
		border: 1px solid rgba(15, 23, 42, 0.08);
		border-radius: 32px;
		box-shadow: 0 24px 60px rgba(15, 23, 42, 0.06);
		overflow: hidden;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}
	.page-section:hover {
		transform: translateY(-8px);
		box-shadow: 0 32px 80px rgba(15, 23, 42, 0.1);
	}
	.hero-panel {
		margin-top: 48px;
		border: 0;
		box-shadow: none;
		background: transparent;
	}
	.hero-panel:hover {
		transform: none;
		box-shadow: none;
	}
	.first-section {
		margin-top: 48px;
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%),
			radial-gradient(circle at 90% 10%, rgba(14, 165, 233, 0.12) 0%, transparent 40%);
	}
	.second-section {
		margin-top: 48px;
		background:
			linear-gradient(135deg, rgba(239, 246, 255, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%),
			radial-gradient(circle at 10% 90%, rgba(16, 185, 129, 0.1) 0%, transparent 40%);
	}
	.final-section {
		margin-top: 48px;
		margin-bottom: 0;
		background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #0369a1 100%);
		position: relative;
		overflow: hidden;
	}
	.final-section::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
		pointer-events: none;
	}
	.eyebrow {
		display: inline-flex;
		width: fit-content;
		border-radius: 999px;
		border: 1px solid rgba(37, 99, 235, 0.2);
		background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(37, 99, 235, 0.05));
		padding: 10px 16px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.5px;
		text-transform: uppercase;
		color: #2563eb;
		backdrop-filter: blur(8px);
	}
	.eyebrow.dark {
		border-color: rgba(16, 185, 129, 0.2);
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
		color: #047857;
	}
	.eyebrow.final {
		border-color: rgba(255, 255, 255, 0.3);
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
		color: #ffffff;
	}
	.metric-card {
		min-height: 280px;
		border-radius: 16px;
		border: 1px solid rgba(15, 23, 42, 0.1);
		background: rgba(255, 255, 255, 0.95);
		padding: 32px;
		box-shadow: 0 20px 50px rgba(15, 23, 42, 0.05);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		backdrop-filter: blur(10px);
	}
	.metric-card:hover {
		transform: translateY(-8px);
		box-shadow: 0 30px 60px rgba(15, 23, 42, 0.1);
		border-color: rgba(37, 99, 235, 0.2);
	}
	.metric-index {
		display: flex;
		height: 52px;
		width: 52px;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
		background: linear-gradient(135deg, #eff6ff, #dbeafe);
		color: #2563eb;
		font-size: 18px;
		font-weight: 800;
		box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
	}
	.workflow-panel {
		border: 1px solid rgba(15, 23, 42, 0.1);
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.95);
		padding: 12px;
		box-shadow: 0 24px 60px rgba(15, 23, 42, 0.06);
		backdrop-filter: blur(10px);
	}
	.workflow-row {
		display: grid;
		grid-template-columns: 80px 1fr;
		gap: 24px;
		border-bottom: 1px solid rgba(15, 23, 42, 0.08);
		padding: 28px;
		transition: all 0.2s ease;
	}
	.workflow-row:hover {
		background-color: rgba(239, 246, 255, 0.3);
		border-radius: 12px;
	}
	.workflow-row:last-child {
		border-bottom: 0;
	}
	.workflow-step {
		display: flex;
		height: 56px;
		width: 56px;
		align-items: center;
		justify-content: center;
		border-radius: 12px;
		background: linear-gradient(135deg, #ecfdf5, #d1fae5);
		color: #047857;
		font-size: 18px;
		font-weight: 800;
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
	}

	@media (max-width: 768px) {
		.home-page {
			padding-bottom: 48px;
		}
		.page-section {
			margin-right: 20px;
			margin-bottom: 32px;
			margin-left: 20px;
			border-radius: 28px;
		}
		.metric-card {
			min-height: auto;
			padding: 24px;
		}
		.workflow-row {
			grid-template-columns: 1fr;
			gap: 16px;
			padding: 24px;
		}
		.workflow-step {
			height: 48px;
			width: 48px;
			font-size: 16px;
		}
	}
</style>
