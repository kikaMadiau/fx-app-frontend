<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		prepareIdDocumentPhoto,
		SIDE_LABELS,
		type IdDocumentSide
	} from '$lib/api/id-document.js';

	// Photos recto / verso de la pièce d'identité. Le composant ne fait que prendre et préparer
	// les images : le parent décide quand les envoyer (tout de suite, ou après la création du client).
	let {
		previews = { front: null, back: null },
		busySide = null,
		disabled = false,
		onCapture
	}: {
		previews?: Record<IdDocumentSide, string | null>; // URL des images à afficher
		busySide?: IdDocumentSide | null;
		disabled?: boolean;
		onCapture: (side: IdDocumentSide, photo: Blob) => void | Promise<void>;
	} = $props();

	const SIDES: IdDocumentSide[] = ['front', 'back'];
	let error = $state('');
	let fileInputs = $state<Record<string, HTMLInputElement | undefined>>({});
	let cameraInputs = $state<Record<string, HTMLInputElement | undefined>>({});

	// Webcam (ordinateur) : flux vidéo affiché dans une fenêtre, image prise au clic.
	let cameraSide = $state<IdDocumentSide | null>(null);
	let video = $state<HTMLVideoElement | undefined>(undefined);
	let stream: MediaStream | null = null;
	let cameraError = $state('');

	// Sur téléphone et tablette, l'appareil photo natif (capture="environment") est plus net.
	const isTouchDevice = () =>
		typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

	async function handle(side: IdDocumentSide, source: Blob | undefined | null) {
		if (!source) return;
		error = '';
		try {
			await onCapture(side, await prepareIdDocumentPhoto(source));
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	async function takePhoto(side: IdDocumentSide) {
		error = '';
		if (isTouchDevice() || !navigator.mediaDevices?.getUserMedia) {
			cameraInputs[side]?.click();
			return;
		}
		cameraSide = side;
		cameraError = '';
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
				audio: false
			});
			if (video) {
				video.srcObject = stream;
				await video.play();
			}
		} catch {
			cameraError =
				"Impossible d'accéder à la caméra (aucune caméra, ou accès refusé). Utilisez « Importer » pour choisir une photo.";
		}
	}

	function stopCamera() {
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
		cameraSide = null;
	}

	async function capture() {
		if (!video || !cameraSide || !video.videoWidth) return;
		const canvas = document.createElement('canvas');
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;
		canvas.getContext('2d')?.drawImage(video, 0, 0);
		const side = cameraSide;
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, 'image/jpeg', 0.92)
		);
		stopCamera();
		await handle(side, blob);
	}

	function onFile(side: IdDocumentSide, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		handle(side, file);
	}

	$effect(() => {
		// Le flux est attaché dès que la vidéo de la fenêtre existe.
		if (video && stream && video.srcObject !== stream) {
			video.srcObject = stream;
			video.play().catch(() => {});
		}
	});

	onDestroy(stopCamera);
</script>

<div class="grid gap-3 sm:grid-cols-2" data-testid="id-document-capture">
	{#each SIDES as side (side)}
		<div class="rounded-lg border border-dashed border-slate-300 p-3">
			<div class="mb-2 flex items-center justify-between gap-2">
				<p class="text-xs font-semibold text-slate-500 uppercase">{SIDE_LABELS[side]}</p>
				{#if previews[side]}
					<span class="app-badge app-badge-success">Photo prise</span>
				{:else}
					<span class="app-badge app-badge-warning">Manquante</span>
				{/if}
			</div>
			<div
				class="flex aspect-[1.586] items-center justify-center overflow-hidden rounded-md bg-slate-50"
			>
				{#if busySide === side}
					<span class="text-xs text-slate-500">Envoi…</span>
				{:else if previews[side]}
					<img
						src={previews[side]}
						alt="{SIDE_LABELS[side]} de la pièce d'identité"
						class="h-full w-full object-contain"
						data-testid="id-preview-{side}"
					/>
				{:else}
					<svg
						class="h-10 w-10 text-slate-300"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<rect x="3" y="5" width="18" height="14" rx="2" stroke-width="1.5" />
						<circle cx="9" cy="11" r="2" stroke-width="1.5" />
						<path d="M14 10h4M14 13h3M6 16h6" stroke-width="1.5" stroke-linecap="round" />
					</svg>
				{/if}
			</div>
			<div class="mt-2 flex gap-2">
				<button
					type="button"
					class="app-button app-button-secondary flex-1 px-2 py-2 text-xs"
					disabled={disabled || busySide !== null}
					onclick={() => takePhoto(side)}
				>
					{previews[side] ? 'Reprendre' : 'Prendre une photo'}
				</button>
				<button
					type="button"
					class="app-button app-button-secondary px-2 py-2 text-xs"
					disabled={disabled || busySide !== null}
					onclick={() => fileInputs[side]?.click()}
				>
					Importer
				</button>
			</div>
			<input
				bind:this={cameraInputs[side]}
				type="file"
				accept="image/*"
				capture="environment"
				class="hidden"
				onchange={(e) => onFile(side, e)}
			/>
			<input
				bind:this={fileInputs[side]}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				class="hidden"
				data-testid="id-file-{side}"
				onchange={(e) => onFile(side, e)}
			/>
		</div>
	{/each}
</div>
{#if error}
	<p class="mt-2 text-sm text-red-600" role="alert">{error}</p>
{/if}

{#if cameraSide}
	<div class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4">
		<div class="app-modal w-full max-w-2xl p-4" role="dialog" aria-modal="true" aria-label="Caméra">
			<p class="mb-3 text-sm font-semibold text-slate-950">
				{SIDE_LABELS[cameraSide]} de la pièce : placez la carte dans le cadre, bien éclairée.
			</p>
			{#if cameraError}
				<p class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{cameraError}</p>
			{:else}
				<div class="relative overflow-hidden rounded-lg bg-black">
					<!-- svelte-ignore a11y_media_has_caption -->
					<video bind:this={video} playsinline muted class="w-full"></video>
					<div
						class="pointer-events-none absolute inset-[10%] rounded-xl border-2 border-dashed border-white/80"
					></div>
				</div>
			{/if}
			<div class="mt-4 flex justify-end gap-2">
				<button
					type="button"
					class="app-button app-button-secondary px-4 py-2"
					onclick={stopCamera}
				>
					Annuler
				</button>
				{#if !cameraError}
					<button type="button" class="app-button app-button-primary px-4 py-2" onclick={capture}>
						Capturer
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
