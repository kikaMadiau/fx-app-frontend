import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { Trader } from '$lib/types/trader.js';

const STORAGE_KEY = 'fx_session';

export type Session = {
	accessToken: string;
	trader: Trader;
} | null;

function readStoredSession(): Session {
	if (!browser) return null;

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Session) : null;
	} catch {
		return null;
	}
}

export const session = writable<Session>(readStoredSession());

export function setSession(value: Session) {
	session.set(value);

	if (!browser) return;

	if (value) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	} else {
		localStorage.removeItem(STORAGE_KEY);
	}
}

export function clearSession() {
	setSession(null);
}

export function getStoredAccessToken(): string | null {
	return readStoredSession()?.accessToken ?? null;
}

export function getStoredTrader(): Trader | null {
	return readStoredSession()?.trader ?? null;
}

/** Remplace le jeton de la session en cours (ex. après un changement de mot de passe). */
export function replaceSessionToken(accessToken: string) {
	const current = readStoredSession();
	if (current) setSession({ ...current, accessToken });
}

/** Met à jour les informations du cambiste connecté (ex. après modification du profil). */
export function updateSessionTrader(trader: Trader) {
	const current = readStoredSession();
	if (current) setSession({ ...current, trader });
}
