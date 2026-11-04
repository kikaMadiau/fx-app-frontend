<script lang="ts">
	// Administrateur : comment partent les messages aux clients (SMS et WhatsApp par Twilio,
	// e-mails par un serveur SMTP), avec un envoi d'essai qui affiche la vraie erreur.
	import { onMount } from 'svelte';
	import {
		getNotificationSettings,
		saveNotificationSettings,
		sendTestNotification,
		type NotificationMode,
		type NotificationSettings
	} from '$lib/api/admin.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';

	const MODES: { value: NotificationMode; label: string; description: string }[] = [
		{
			value: 'test',
			label: 'Essai',
			description: 'Rien ne part. Les messages sont gardés pour contrôle.'
		},
		{ value: 'live', label: 'Envoi réel', description: 'Les clients reçoivent les messages.' },
		{ value: 'off', label: 'Arrêté', description: 'Aucun message n’est préparé.' }
	];

	let current = $state<NotificationSettings | null>(null);
	let form = $state({
		mode: 'test' as NotificationMode,
		sms_enabled: false,
		whatsapp_enabled: false,
		email_enabled: false,
		twilio_account_sid: '',
		twilio_auth_token: '',
		twilio_from: '',
		twilio_whatsapp_from: '',
		smtp_host: '',
		smtp_port: 587,
		smtp_user: '',
		smtp_pass: '',
		smtp_from: '',
		smtp_ssl: false
	});
	let loading = $state(true);
	let loadError = $state('');
	let saving = $state(false);
	let saveMessage = $state<{ kind: 'ok' | 'error'; text: string } | null>(null);

	let testChannel = $state<'sms' | 'whatsapp' | 'email'>('sms');
	let testTo = $state('');
	let testing = $state(false);
	let testResult = $state<{ ok: boolean; text: string } | null>(null);

	function fill(s: NotificationSettings) {
		current = s;
		form = {
			mode: s.mode,
			sms_enabled: s.sms_enabled,
			whatsapp_enabled: s.whatsapp_enabled,
			email_enabled: s.email_enabled,
			twilio_account_sid: s.twilio_account_sid,
			twilio_auth_token: '',
			twilio_from: s.twilio_from,
			twilio_whatsapp_from: s.twilio_whatsapp_from,
			smtp_host: s.smtp_host,
			smtp_port: s.smtp_port || 587,
			smtp_user: s.smtp_user,
			smtp_pass: '',
			smtp_from: s.smtp_from,
			smtp_ssl: s.smtp_ssl
		};
	}

	onMount(async () => {
		try {
			fill(await getNotificationSettings());
		} catch (e) {
			loadError = getUserFacingErrorMessage(e);
		} finally {
			loading = false;
		}
	});

	async function save(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		saveMessage = null;
		try {
			fill(await saveNotificationSettings({ ...form, smtp_port: Number(form.smtp_port) || 0 }));
			saveMessage = { kind: 'ok', text: 'Réglages enregistrés.' };
		} catch (e) {
			saveMessage = { kind: 'error', text: getUserFacingErrorMessage(e) };
		} finally {
			saving = false;
		}
	}

	async function test() {
		testing = true;
		testResult = null;
		try {
			const result = await sendTestNotification(testChannel, testTo);
			testResult = result.ok
				? { ok: true, text: 'Message d’essai envoyé. Vérifiez sa réception.' }
				: { ok: false, text: result.detail };
		} catch (e) {
			testResult = { ok: false, text: getUserFacingErrorMessage(e) };
		} finally {
			testing = false;
		}
	}

	const channels = $derived([
		{ key: 'sms_enabled', label: 'SMS', ready: current?.sms_ready ?? false },
		{ key: 'whatsapp_enabled', label: 'WhatsApp', ready: current?.whatsapp_ready ?? false },
		{ key: 'email_enabled', label: 'E-mail', ready: current?.email_ready ?? false }
	] as const);
</script>

<form class="app-card p-6" onsubmit={save} data-testid="notification-settings">
	<div class="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
		<div>
			<h3 class="text-lg font-semibold text-slate-950">Messages aux clients</h3>
			<p class="mt-1 text-sm text-slate-500">
				SMS et WhatsApp par Twilio, e-mails par votre serveur de messagerie.
			</p>
		</div>
		{#if current}
			<span
				class="rounded-full px-3 py-1 text-xs font-bold {current.mode === 'live'
					? 'bg-green-50 text-green-700'
					: current.mode === 'off'
						? 'bg-slate-100 text-slate-600'
						: 'bg-amber-50 text-amber-700'}"
				data-testid="notify-mode-badge"
			>
				{current.mode === 'live' ? 'Envoi réel' : current.mode === 'off' ? 'Arrêté' : 'Essai'}
			</span>
		{/if}
	</div>

	{#if loading}
		<p class="text-sm text-slate-500">Chargement…</p>
	{:else if loadError}
		<p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{loadError}</p>
	{:else}
		<!-- 1. Mode -->
		<p class="mb-3 text-sm font-semibold text-slate-700">1. Mode d’envoi</p>
		<div class="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Mode d’envoi">
			{#each MODES as m (m.value)}
				<label
					class="cursor-pointer rounded-xl border p-4 transition-colors {form.mode === m.value
						? 'border-blue-600 bg-blue-50'
						: 'border-slate-200 hover:bg-slate-50'}"
				>
					<input
						type="radio"
						class="sr-only"
						name="notify-mode"
						value={m.value}
						bind:group={form.mode}
					/>
					<span class="block text-sm font-bold text-slate-950">{m.label}</span>
					<span class="mt-1 block text-xs text-slate-500">{m.description}</span>
				</label>
			{/each}
		</div>

		<!-- 2. Canaux -->
		<p class="mt-6 mb-3 text-sm font-semibold text-slate-700">2. Canaux utilisés</p>
		<div class="grid gap-3 sm:grid-cols-3">
			{#each channels as c (c.key)}
				<label
					class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
				>
					<span>
						<span class="block text-sm font-bold text-slate-950">{c.label}</span>
						<span class="text-xs {c.ready ? 'text-green-700' : 'text-slate-400'}">
							{c.ready ? 'Prêt' : 'À configurer'}
						</span>
					</span>
					<input type="checkbox" class="h-5 w-5 accent-blue-600" bind:checked={form[c.key]} />
				</label>
			{/each}
		</div>

		<!-- 3. Twilio -->
		<div class="mt-8 rounded-2xl border border-slate-200 p-5">
			<p class="text-sm font-semibold text-slate-700">3. Twilio (SMS et WhatsApp)</p>
			<p class="mt-1 text-xs text-slate-500">
				Ces informations se trouvent sur console.twilio.com, rubrique « Account Info ».
			</p>
			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label for="tw_sid" class="text-sm font-medium text-slate-700">Account SID</label>
					<input
						id="tw_sid"
						class="app-input font-mono"
						autocomplete="off"
						placeholder="AC…"
						bind:value={form.twilio_account_sid}
					/>
				</div>
				<div class="space-y-2">
					<label for="tw_token" class="text-sm font-medium text-slate-700">Auth Token</label>
					<input
						id="tw_token"
						type="password"
						class="app-input"
						autocomplete="new-password"
						placeholder={current?.twilio_auth_token_set
							? 'Enregistré · laisser vide pour garder'
							: ''}
						bind:value={form.twilio_auth_token}
					/>
				</div>
				<div class="space-y-2">
					<label for="tw_from" class="text-sm font-medium text-slate-700">Numéro SMS Twilio</label>
					<input
						id="tw_from"
						class="app-input"
						autocomplete="off"
						placeholder="+1 415 000 0000"
						bind:value={form.twilio_from}
					/>
				</div>
				<div class="space-y-2">
					<label for="tw_wa" class="text-sm font-medium text-slate-700"
						>Numéro WhatsApp Twilio</label
					>
					<input
						id="tw_wa"
						class="app-input"
						autocomplete="off"
						placeholder="+1 415 523 8886"
						bind:value={form.twilio_whatsapp_from}
					/>
				</div>
			</div>
		</div>

		<!-- 4. E-mail -->
		<div class="mt-4 rounded-2xl border border-slate-200 p-5">
			<p class="text-sm font-semibold text-slate-700">4. E-mail (serveur SMTP)</p>
			<p class="mt-1 text-xs text-slate-500">
				Gmail : smtp.gmail.com, port 587, avec un « mot de passe d’application ». SendGrid (Twilio)
				: smtp.sendgrid.net, utilisateur « apikey », mot de passe = votre clé API.
			</p>
			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label for="smtp_host" class="text-sm font-medium text-slate-700">Serveur</label>
					<input
						id="smtp_host"
						class="app-input"
						autocomplete="off"
						placeholder="smtp.gmail.com"
						bind:value={form.smtp_host}
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div class="space-y-2">
						<label for="smtp_port" class="text-sm font-medium text-slate-700">Port</label>
						<input
							id="smtp_port"
							type="number"
							min="1"
							max="65535"
							class="app-input"
							bind:value={form.smtp_port}
						/>
					</div>
					<label class="mt-7 flex items-center gap-2 text-sm text-slate-700">
						<input type="checkbox" class="h-4 w-4 accent-blue-600" bind:checked={form.smtp_ssl} />
						SSL (port 465)
					</label>
				</div>
				<div class="space-y-2">
					<label for="smtp_user" class="text-sm font-medium text-slate-700">Utilisateur</label>
					<input id="smtp_user" class="app-input" autocomplete="off" bind:value={form.smtp_user} />
				</div>
				<div class="space-y-2">
					<label for="smtp_pass" class="text-sm font-medium text-slate-700">Mot de passe</label>
					<input
						id="smtp_pass"
						type="password"
						class="app-input"
						autocomplete="new-password"
						placeholder={current?.smtp_pass_set ? 'Enregistré · laisser vide pour garder' : ''}
						bind:value={form.smtp_pass}
					/>
				</div>
				<div class="space-y-2 sm:col-span-2">
					<label for="smtp_from" class="text-sm font-medium text-slate-700">Expéditeur</label>
					<input
						id="smtp_from"
						class="app-input"
						autocomplete="off"
						placeholder="MOTUYA Fx <no-reply@votre-domaine.cd>"
						bind:value={form.smtp_from}
					/>
				</div>
			</div>
		</div>

		{#if saveMessage}
			<p
				class="mt-5 rounded-xl px-4 py-3 text-sm {saveMessage.kind === 'ok'
					? 'bg-green-50 text-green-700'
					: 'bg-red-50 text-red-700'}"
				role="status"
			>
				{saveMessage.text}
			</p>
		{/if}
		<div class="mt-6 flex justify-end">
			<button type="submit" class="app-button app-button-primary" disabled={saving}>
				{saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
			</button>
		</div>

		<!-- 5. Essai -->
		<div class="mt-8 border-t border-slate-100 pt-6">
			<p class="text-sm font-semibold text-slate-700">5. Envoyer un message d’essai</p>
			<p class="mt-1 text-xs text-slate-500">
				Utilise les réglages enregistrés, même en mode Essai. Enregistrez d’abord vos changements.
			</p>
			<div class="mt-3 flex flex-col gap-3 sm:flex-row">
				<select class="app-input sm:w-40" bind:value={testChannel} aria-label="Canal de l’essai">
					<option value="sms">SMS</option>
					<option value="whatsapp">WhatsApp</option>
					<option value="email">E-mail</option>
				</select>
				<input
					class="app-input flex-1"
					aria-label="Destinataire de l’essai"
					placeholder={testChannel === 'email' ? 'adresse@exemple.cd' : '+243 812 345 678'}
					bind:value={testTo}
				/>
				<button
					type="button"
					class="app-button app-button-secondary"
					disabled={testing || !testTo.trim()}
					onclick={test}
				>
					{testing ? 'Envoi…' : 'Envoyer l’essai'}
				</button>
			</div>
			{#if testResult}
				<p
					class="mt-3 rounded-xl px-4 py-3 text-sm break-words {testResult.ok
						? 'bg-green-50 text-green-700'
						: 'bg-red-50 text-red-700'}"
					role="status"
					data-testid="notify-test-result"
				>
					{testResult.ok ? testResult.text : `Échec : ${testResult.text}`}
				</p>
			{/if}
		</div>
	{/if}
</form>
