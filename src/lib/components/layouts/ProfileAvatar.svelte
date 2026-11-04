<script lang="ts">
	// Avatar du compte connecté : anneau aux couleurs BCC, initiales si pas de photo.
	// Un clic ouvre un petit menu pour ajouter, changer ou supprimer la photo.
	import { deleteProfilePhoto, prepareProfilePhoto, uploadProfilePhoto } from '$lib/api/profile.js';
	import { profilePhotoUrl, setProfilePhoto } from '$lib/stores/profile-photo.js';
	import { getUserFacingErrorMessage } from '$lib/utils/api-errors.js';

	let {
		initials = 'FX',
		size = 44,
		placement = 'top'
	}: { initials?: string; size?: number; placement?: 'top' | 'bottom' } = $props();

	let open = $state(false);
	let busy = $state(false);
	let message = $state('');
	let input = $state<HTMLInputElement | null>(null);
	let root = $state<HTMLDivElement | null>(null);

	function choose() {
		message = '';
		input?.click();
	}

	async function onFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		(event.currentTarget as HTMLInputElement).value = '';
		if (!file) return;
		busy = true;
		message = '';
		try {
			const photo = await prepareProfilePhoto(file);
			await uploadProfilePhoto(photo);
			setProfilePhoto(photo);
			open = false;
		} catch (e) {
			message = getUserFacingErrorMessage(e);
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!confirm('Supprimer votre photo de profil ?')) return;
		busy = true;
		message = '';
		try {
			await deleteProfilePhoto();
			setProfilePhoto(null);
			open = false;
		} catch (e) {
			message = getUserFacingErrorMessage(e);
		} finally {
			busy = false;
		}
	}

	function onWindowClick(event: MouseEvent) {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window
	onclick={onWindowClick}
	onkeydown={(e) => e.key === 'Escape' && open && (open = false)}
/>

<div class="relative flex-shrink-0" bind:this={root}>
	<button
		type="button"
		class="avatar-ring group"
		style="--size: {size}px"
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label="Photo de profil : ajouter, changer ou supprimer"
		title="Cliquer pour changer la photo"
		data-testid="avatar-button"
		onclick={() => {
			open = !open;
			message = '';
		}}
	>
		<span class="avatar-inner">
			{#if $profilePhotoUrl}
				<img src={$profilePhotoUrl} alt="" class="h-full w-full object-cover" />
			{:else}
				<span class="avatar-initials">{initials}</span>
			{/if}
			{#if busy}
				<span class="absolute inset-0 flex items-center justify-center bg-slate-950/40">
					<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></span>
				</span>
			{/if}
		</span>
		<span class="avatar-badge" aria-hidden="true">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
				/>
				<circle cx="12" cy="13" r="3.5" />
			</svg>
		</span>
	</button>

	<input
		bind:this={input}
		type="file"
		accept="image/jpeg,image/png,image/webp"
		class="hidden"
		data-testid="avatar-input"
		onchange={onFile}
	/>

	{#if open}
		<div
			class="avatar-menu {placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}"
			role="menu"
		>
			<button type="button" role="menuitem" class="avatar-item" disabled={busy} onclick={choose}>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
					><path stroke-linecap="round" d="M12 5v14M5 12h14" /></svg
				>
				{$profilePhotoUrl ? 'Changer la photo' : 'Ajouter une photo'}
			</button>
			{#if $profilePhotoUrl}
				<button
					type="button"
					role="menuitem"
					class="avatar-item text-red-600 hover:bg-red-50"
					disabled={busy}
					onclick={remove}
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						><path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
						/></svg
					>
					Supprimer la photo
				</button>
			{/if}
			<p class="px-3 pt-1 pb-0.5 text-[11px] text-slate-400">JPEG, PNG ou WebP · 2 Mo max.</p>
			{#if message}
				<p class="px-3 pb-1 text-xs text-red-600" role="alert">{message}</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.avatar-ring {
		position: relative;
		display: block;
		width: var(--size);
		height: var(--size);
		border-radius: 999px;
		padding: 2px;
		/* Bleu BCC vers l'or des billets */
		background: conic-gradient(from 210deg, #005ca9, #3d8fd6, #ffa401, #005ca9);
		box-shadow: 0 6px 16px rgb(0 92 169 / 0.25);
		transition: transform 0.15s ease;
	}
	.avatar-ring:hover {
		transform: scale(1.05);
	}
	.avatar-ring:focus-visible {
		outline: 3px solid rgb(0 92 169 / 0.35);
		outline-offset: 2px;
	}
	.avatar-inner {
		position: relative;
		display: flex;
		height: 100%;
		width: 100%;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 999px;
		border: 2px solid var(--fx-surface, #fff);
		background: linear-gradient(135deg, #0f2849, #005ca9);
	}
	.avatar-initials {
		color: #fff;
		font-weight: 800;
		font-size: calc(var(--size) * 0.34);
		letter-spacing: 0.02em;
	}
	.avatar-badge {
		position: absolute;
		right: -2px;
		bottom: -2px;
		display: flex;
		height: 18px;
		width: 18px;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
		border: 2px solid var(--fx-surface, #fff);
		background: #ffa401;
		color: #0f2849;
		opacity: 0.95;
	}
	.avatar-badge svg {
		height: 10px;
		width: 10px;
	}
	.avatar-menu {
		position: absolute;
		left: 0;
		z-index: 60;
		width: 13rem;
		border-radius: 12px;
		border: 1px solid var(--fx-border, #e2e8f0);
		background: var(--fx-surface, #fff);
		padding: 6px;
		box-shadow: 0 18px 40px rgb(15 23 42 / 0.18);
	}
	.avatar-item {
		display: flex;
		width: 100%;
		align-items: center;
		gap: 8px;
		border-radius: 8px;
		padding: 8px 10px;
		font-size: 14px;
		font-weight: 600;
		text-align: left;
	}
	.avatar-item:not(.text-red-600) {
		color: var(--fx-text, #0f172a);
	}
	.avatar-item:not(.text-red-600):hover {
		background: #eaf6ff;
	}
	.avatar-item:disabled {
		opacity: 0.6;
	}
	:global(:root[data-theme='dark']) .avatar-item:not(.text-red-600):hover {
		background: rgb(61 143 214 / 0.15);
	}
</style>
