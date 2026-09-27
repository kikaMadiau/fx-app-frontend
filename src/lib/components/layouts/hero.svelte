<script>
	import { resolve } from '$app/paths';
</script>

<section class="hero-section">
	<div
		class="hero-shell container mx-auto grid min-h-[calc(100vh-177px)] items-center gap-14 px-6 py-12 lg:grid-cols-[0.88fr_1.12fr] lg:px-10 lg:py-16"
	>
		<div class="max-w-2xl">
			<span class="hero-eyebrow">Compliance desk for exchange offices</span>

			<h1
				class="mt-6 max-w-xl text-5xl leading-[1.02] font-semibold text-balance text-slate-950 md:text-6xl"
			>
				Modernisez la conformité de votre bureau de change.
			</h1>

			<p class="mt-6 max-w-xl text-base leading-8 text-slate-600 md:text-lg">
				Centralisez vos dossiers KYC, suivez chaque opération et détectez les signaux à risque avec
				une plateforme pensée pour les équipes financières en RDC.
			</p>

			<div class="mt-9 flex flex-col gap-3 sm:flex-row">
				<a
					href={resolve('/contact')}
					class="inline-flex items-center justify-center rounded-lg bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-950/15 transition duration-300 hover:bg-blue-700"
				>
					Demander une démo
				</a>

				<a
					href={resolve('/about')}
					class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition duration-300 hover:border-slate-300 hover:bg-slate-50"
				>
					Découvrir la solution
				</a>
			</div>

			<div class="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
				<div class="proof-tile">
					<p class="text-lg font-semibold text-slate-950">KYC</p>
					<p class="mt-1 text-slate-500">Dossiers centralisés</p>
				</div>
				<div class="proof-tile">
					<p class="text-lg font-semibold text-slate-950">AML</p>
					<p class="mt-1 text-slate-500">Alertes lisibles</p>
				</div>
				<div class="proof-tile">
					<p class="text-lg font-semibold text-slate-950">RDC</p>
					<p class="mt-1 text-slate-500">Terrain local</p>
				</div>
			</div>
		</div>

		<div class="trust-panel">
			<div class="trust-panel-header">
				<p class="text-sm font-semibold text-slate-950">Contrôle quotidien</p>
				<span>Live</span>
			</div>

			<div class="mt-8 space-y-4">
				<div class="trust-row">
					<span class="status-dot valid"></span>
					<div>
						<p class="text-sm font-semibold text-slate-950">Identités vérifiées</p>
						<p class="text-sm text-slate-500">Documents clients, statuts et dates de revue.</p>
					</div>
				</div>
				<div class="trust-row">
					<span class="status-dot warning"></span>
					<div>
						<p class="text-sm font-semibold text-slate-950">Opérations sensibles</p>
						<p class="text-sm text-slate-500">Montants, devises et justificatifs à contrôler.</p>
					</div>
				</div>
				<div class="trust-row">
					<span class="status-dot info"></span>
					<div>
						<p class="text-sm font-semibold text-slate-950">Rapports auditables</p>
						<p class="text-sm text-slate-500">Historique clair pour les validations internes.</p>
					</div>
				</div>
			</div>

			<div class="trust-summary">
				<p class="text-xs font-semibold text-blue-700 uppercase">Priorité du jour</p>
				<p class="mt-2 text-2xl font-semibold text-slate-950">3 contrôles</p>
				<p class="mt-1 text-sm text-slate-500">à finaliser avant clôture.</p>
			</div>
		</div>
	</div>
</section>

<style>
	.hero-section {
		min-height: calc(100vh - 136px);
		overflow: hidden;
		border: 1px solid rgb(15 23 42 / 0.08);
		border-radius: 28px;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.94), rgb(248 250 252 / 0.96)),
			radial-gradient(circle at 88% 12%, rgb(37 99 235 / 0.14), transparent 34%);
		box-shadow: 0 28px 80px rgb(15 23 42 / 0.12);
	}
	.hero-shell {
		position: relative;
	}
	.hero-eyebrow {
		display: inline-flex;
		width: fit-content;
		border-radius: 999px;
		border: 1px solid rgb(37 99 235 / 0.14);
		background: rgb(37 99 235 / 0.06);
		padding: 8px 12px;
		color: #2563eb;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
	}
	.proof-tile {
		border: 1px solid rgb(15 23 42 / 0.08);
		border-radius: 8px;
		background: rgb(255 255 255 / 0.72);
		padding: 16px;
		box-shadow: 0 12px 34px rgb(15 23 42 / 0.06);
	}
	.trust-panel {
		border: 1px solid rgb(15 23 42 / 0.1);
		border-radius: 16px;
		background: rgb(255 255 255 / 0.84);
		padding: 28px;
		box-shadow: 0 32px 90px rgb(15 23 42 / 0.14);
	}
	.trust-panel-header,
	.trust-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}
	.trust-panel-header span {
		border-radius: 8px;
		background: #ecfdf5;
		padding: 6px 10px;
		color: #047857;
		font-size: 12px;
		font-weight: 700;
	}
	.trust-row {
		justify-content: flex-start;
		border: 1px solid rgb(15 23 42 / 0.08);
		border-radius: 8px;
		background: white;
		padding: 16px;
	}
	.status-dot {
		margin-top: 6px;
		height: 10px;
		width: 10px;
		flex: 0 0 auto;
		border-radius: 999px;
	}
	.status-dot.valid {
		background: #10b981;
	}
	.status-dot.warning {
		background: #f59e0b;
	}
	.status-dot.info {
		background: #2563eb;
	}
	.trust-summary {
		margin-top: 24px;
		border-radius: 8px;
		background: #eff6ff;
		padding: 20px;
	}

	@media (max-width: 768px) {
		.hero-section {
			min-height: calc(100vh - 112px);
			padding-left: 0;
		}
		.trust-panel {
			display: none;
		}
		.hero-shell {
			min-height: calc(100vh - 112px);
		}
		.hero-shell {
			grid-template-columns: 1fr;
		}
		.hero-shell :global(.grid-cols-3) {
			grid-template-columns: repeat(1, minmax(0, 1fr));
		}
	}
</style>
