import { writable } from 'svelte/store';
import { fetchProfilePhoto } from '$lib/api/profile.js';

// Adresse locale (blob:) de la photo du cambiste connecté, partagée entre le menu et la page profil.
export const profilePhotoUrl = writable<string | null>(null);

let current: string | null = null;

export function setProfilePhoto(blob: Blob | null) {
	if (current) URL.revokeObjectURL(current);
	current = blob ? URL.createObjectURL(blob) : null;
	profilePhotoUrl.set(current);
}

export async function loadProfilePhoto() {
	try {
		setProfilePhoto(await fetchProfilePhoto());
	} catch {
		setProfilePhoto(null);
	}
}
