import { writable } from 'svelte/store';
import { apiRequest } from '$lib/api/http.js';
import type { SharedLocation } from '$lib/types/profile.js';

// Partage de la position du membre du personnel avec l'administration, tant que l'application
// est ouverte. Rien ne part sans l'accord du navigateur (autorisation de localisation).

export type SharingState = {
	active: boolean;
	error: string;
	lastSentAt: Date | null;
	accuracy: number | null;
};

export const locationSharing = writable<SharingState>({
	active: false,
	error: '',
	lastSentAt: null,
	accuracy: null
});

const MIN_INTERVAL_MS = 60_000; // au plus une position par minute…
const MIN_MOVE_METERS = 50; // …sauf déplacement notable

let watchId: number | null = null;
let last: { lat: number; lng: number; at: number } | null = null;

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
	const rad = Math.PI / 180;
	const dLat = (b.lat - a.lat) * rad;
	const dLng = (b.lng - a.lng) * rad;
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
	return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function geolocationMessage(error: GeolocationPositionError): string {
	if (error.code === error.PERMISSION_DENIED) {
		return 'La localisation est refusée par le navigateur. Autorisez-la dans les réglages du site.';
	}
	if (error.code === error.TIMEOUT) return 'La position met trop de temps à arriver. Réessayez.';
	return 'Position introuvable sur cet appareil.';
}

async function send(position: GeolocationPosition, force = false) {
	const point = { lat: position.coords.latitude, lng: position.coords.longitude, at: Date.now() };
	if (
		!force &&
		last &&
		point.at - last.at < MIN_INTERVAL_MS &&
		distanceMeters(last, point) < MIN_MOVE_METERS
	) {
		return;
	}
	last = point;
	try {
		await apiRequest<SharedLocation>('/auth/me/location', {
			method: 'PUT',
			body: {
				latitude: point.lat,
				longitude: point.lng,
				accuracy: Math.round(position.coords.accuracy)
			}
		});
		locationSharing.set({
			active: true,
			error: '',
			lastSentAt: new Date(),
			accuracy: Math.round(position.coords.accuracy)
		});
	} catch {
		locationSharing.update((s) => ({ ...s, error: "La position n'a pas pu être envoyée." }));
	}
}

function watch() {
	if (watchId !== null) return;
	watchId = navigator.geolocation.watchPosition(
		(position) => void send(position),
		(error) => locationSharing.update((s) => ({ ...s, error: geolocationMessage(error) })),
		{ enableHighAccuracy: true, maximumAge: 30_000, timeout: 30_000 }
	);
}

/** Demande l'autorisation, envoie la position tout de suite puis la suit. */
export function startSharing(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			reject(new Error('Cet appareil ne permet pas la localisation.'));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			async (position) => {
				await send(position, true);
				watch();
				resolve();
			},
			(error) => {
				const message = geolocationMessage(error);
				locationSharing.update((s) => ({ ...s, active: false, error: message }));
				reject(new Error(message));
			},
			{ enableHighAccuracy: true, timeout: 30_000 }
		);
	});
}

/** Coupe le partage : l'appareil arrête d'envoyer et la dernière position est effacée. */
export async function stopSharing(): Promise<void> {
	if (watchId !== null) navigator.geolocation.clearWatch(watchId);
	watchId = null;
	last = null;
	await apiRequest<void>('/auth/me/location', { method: 'DELETE' });
	locationSharing.set({ active: false, error: '', lastSentAt: null, accuracy: null });
}

/** Reprend le partage à l'ouverture de l'application s'il était activé. */
export function resumeSharing(sharing: boolean) {
	if (!sharing || watchId !== null || typeof navigator === 'undefined' || !navigator.geolocation) {
		return;
	}
	locationSharing.update((s) => ({ ...s, active: true }));
	watch();
}

/** À la déconnexion : on arrête de suivre (sans effacer la position côté serveur). */
export function pauseSharing() {
	if (watchId !== null) navigator.geolocation.clearWatch(watchId);
	watchId = null;
	last = null;
	locationSharing.set({ active: false, error: '', lastSentAt: null, accuracy: null });
}
