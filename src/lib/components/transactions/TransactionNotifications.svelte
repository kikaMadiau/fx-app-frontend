<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getTransactionNotifications,
		groupNotifications,
		notificationStatusLabel,
		notificationTemplateLabel,
		type CustomerNotification
	} from '$lib/api/notifications.js';
	import { formatPhoneDisplay } from '$lib/utils/phone.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';

	// Messages envoyés au client pour cette opération : affichés à l'écran, jamais imprimés.
	let { transactionId }: { transactionId: string } = $props();

	let items = $state<CustomerNotification[]>([]);
	let mode = $state('');
	let loading = $state(true);
	let error = $state('');
	let openEmail = $state<number | null>(null);

	const groups = $derived(groupNotifications(items));

	async function load() {
		loading = true;
		error = '';
		try {
			const result = await getTransactionNotifications(transactionId);
			items = result.items;
			mode = result.mode;
		} catch (e) {
			error = getUserFacingErrorMessage(e);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void load();
		// Les messages partent juste après l'enregistrement (SMS puis e-mail) : on relit une fois.
		const retry = setTimeout(() => void load(), 1500);
		return () => clearTimeout(retry);
	});

	function statusClass(n: CustomerNotification) {
		if (n.status === 'SENT') return 'bg-emerald-50 text-emerald-700';
		if (n.status === 'SKIPPED') return 'bg-slate-100 text-slate-600';
		return 'bg-red-50 text-red-700';
	}
</script>

<section class="space-y-3" data-testid="client-notifications">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h3 class="text-sm font-semibold text-slate-900">Messages au client</h3>
			{#if mode === 'test'}
				<p class="text-xs text-slate-500" data-testid="notifications-test-mode">
					Mode test : rien n'est réellement envoyé. Les messages sont aussi enregistrés dans le
					dossier <code>outbox</code> de l'API.
				</p>
			{:else if mode === 'off'}
				<p class="text-xs text-slate-500">Notifications désactivées (NOTIFY_MODE=off).</p>
			{/if}
		</div>
		<button
			class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
			onclick={load}
			disabled={loading}
		>
			Actualiser
		</button>
	</div>

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{:else if loading && !items.length}
		<p class="text-sm text-slate-500">Chargement…</p>
	{:else if !groups.length}
		<p class="text-sm text-slate-500" data-testid="notifications-empty">
			Aucun message pour cette opération.
		</p>
	{:else}
		{#each groups as group (group.template)}
			<article class="rounded-xl border border-slate-200 p-4" data-testid="notification-group">
				<p class="mb-3 text-sm font-semibold text-slate-800">
					{notificationTemplateLabel(group.template)}
				</p>
				{#if group.sms}
					<div class="mb-3" data-testid="notification-sms">
						<div class="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
							<span class="font-semibold text-slate-700">SMS</span>
							{#if group.sms.recipient}<span>{formatPhoneDisplay(group.sms.recipient)}</span>{/if}
							<span class="rounded-full px-2 py-0.5 {statusClass(group.sms)}"
								>{notificationStatusLabel(group.sms)}</span
							>
						</div>
						{#if group.sms.body}
							<p
								class="max-w-md rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-900"
							>
								{group.sms.body}
							</p>
						{/if}
					</div>
				{/if}
				{#if group.email}
					<div data-testid="notification-email">
						<div class="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
							<span class="font-semibold text-slate-700">E-mail</span>
							{#if group.email.recipient}<span>{group.email.recipient}</span>{/if}
							<span class="rounded-full px-2 py-0.5 {statusClass(group.email)}"
								>{notificationStatusLabel(group.email)}</span
							>
						</div>
						{#if group.email.status === 'SENT'}
							<p class="text-sm text-slate-700">
								<span class="text-slate-500">Objet :</span>
								{group.email.subject}
							</p>
							<button
								class="mt-1 text-sm font-semibold text-sky-700 hover:underline"
								onclick={() => (openEmail = openEmail === group.email!.id ? null : group.email!.id)}
							>
								{openEmail === group.email.id ? "Masquer l'e-mail" : "Voir l'e-mail"}
							</button>
							{#if openEmail === group.email.id}
								<iframe
									title={group.email.subject}
									srcdoc={group.email.body}
									sandbox=""
									class="mt-2 h-[560px] w-full rounded-lg border border-slate-200 bg-white"
									data-testid="notification-email-preview"
								></iframe>
							{/if}
						{/if}
					</div>
				{/if}
			</article>
		{/each}
	{/if}
	<p class="text-xs text-slate-500">
		Le rappel « dossier incomplet » part une minute après l'opération, si la pièce ou ses photos
		manquent encore.
	</p>
</section>
