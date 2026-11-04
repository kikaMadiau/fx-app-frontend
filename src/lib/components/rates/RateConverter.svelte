<script lang="ts">
	import type { ExchangeRate } from '$lib/api/dashboard.js';
	import { formatMoney } from '$lib/api/dashboard.js';

	// Convertisseur : on passe toujours par le franc congolais.
	// Devise → CDF au taux d'achat du bureau, CDF → devise au taux de vente.
	let { rates }: { rates: ExchangeRate[] } = $props();

	const currencies = $derived([...rates.map((r) => r.pair.split('/')[0]), 'CDF']);
	let amount = $state<number | null>(100);
	let from = $state('USD');
	let to = $state('CDF');

	function swap() {
		[from, to] = [to, from];
	}

	const conversion = $derived.by(() => {
		const value = Number(amount);
		if (!Number.isFinite(value) || value <= 0) {
			return { ok: false as const, message: 'Entrez un montant.' };
		}
		const official = (c: string) => rates.find((r) => r.pair === `${c}/CDF`);
		let cdf = value;
		if (from !== 'CDF') {
			const r = official(from);
			if (!r) return { ok: false as const, message: `Pas de taux pour ${from}.` };
			cdf = value * r.buy_rate;
		}
		let result = cdf;
		if (to !== 'CDF') {
			const r = official(to);
			if (!r) return { ok: false as const, message: `Pas de taux pour ${to}.` };
			result = cdf / r.sell_rate;
		}
		return { ok: true as const, amount: value, result };
	});
</script>

<div class="fx-converter" data-testid="converter">
	<div class="flex items-end gap-2">
		<label class="min-w-0 flex-1">
			<span class="fx-conv-label">Montant</span>
			<input
				class="fx-conv-input"
				type="number"
				min="0"
				step="any"
				inputmode="decimal"
				bind:value={amount}
				data-testid="conv-amount"
			/>
		</label>
		<label>
			<span class="fx-conv-label">De</span>
			<select class="fx-conv-input" bind:value={from} data-testid="conv-from">
				{#each currencies as c (c)}<option value={c}>{c}</option>{/each}
			</select>
		</label>
		<button
			type="button"
			class="fx-swap"
			onclick={swap}
			aria-label="Inverser les devises"
			title="Inverser">⇄</button
		>
		<label>
			<span class="fx-conv-label">Vers</span>
			<select class="fx-conv-input" bind:value={to} data-testid="conv-to">
				{#each currencies as c (c)}<option value={c}>{c}</option>{/each}
			</select>
		</label>
	</div>
	<p class="fx-conv-result" data-testid="conv-result">
		{#if conversion.ok}
			{formatMoney(conversion.amount, from)} = <strong>{formatMoney(conversion.result, to)}</strong>
		{:else}
			{conversion.message}
		{/if}
	</p>
	<p class="text-[10.5px] text-slate-400">
		Le bureau achète la devise au taux d'achat et la vend au taux de vente.
	</p>
</div>

<style>
	.fx-converter {
		border-radius: 10px;
		border: 1px solid var(--fx-border-soft);
		background: var(--fx-surface-muted);
		padding: 10px;
	}
	.fx-conv-label {
		display: block;
		font-size: 10.5px;
		font-weight: 600;
		color: var(--fx-muted);
	}
	.fx-conv-input {
		margin-top: 2px;
		width: 100%;
		border-radius: 7px;
		border: 1px solid var(--fx-border);
		background: var(--fx-surface);
		padding: 5px 7px;
		font-size: 13px;
		color: var(--fx-text);
	}
	.fx-swap {
		margin-bottom: 2px;
		border-radius: 7px;
		padding: 4px 6px;
		font-size: 15px;
		color: var(--fx-blue);
	}
	.fx-swap:hover {
		background: rgb(0 92 169 / 0.08);
	}
	.fx-conv-result {
		margin-top: 8px;
		font-size: 13px;
		color: var(--fx-text);
		font-variant-numeric: tabular-nums;
	}
</style>
