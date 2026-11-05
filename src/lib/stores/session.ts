import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { Trader } from '$lib/types/trader.js';

const STORAGE_KEY = 'fx_session';

export type Session = {
	accessToken: string;
	trader: Trader;
} | null;

// Access tokens stay in memory only. A page reload requires a fresh login, but
// injected scripts cannot recover a persisted bearer token from localStorage.
let currentSession: Session = null;
export const session = writable<Session>(currentSession);
if (browser) {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage may be unavailable; session tokens are never written there.
	}
}

export function setSession(value: Session) {
	if (!browser) return;
	currentSession = value;
	session.set(value);
	// Remove any session written by older versions of the application.
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Storage may be unavailable; session tokens are never written there.
	}
}

export function clearSession() {
	setSession(null);
}

export function getStoredAccessToken(): string | null {
	return browser ? (currentSession?.accessToken ?? null) : null;
}

export function getStoredTrader(): Trader | null {
	return browser ? (currentSession?.trader ?? null) : null;
}

/** Remplace le jeton de la session en cours (ex. après un changement de mot de passe). */
export function replaceSessionToken(accessToken: string) {
	const current = currentSession;
	if (current) setSession({ ...current, accessToken });
}

/** Met à jour les informations du cambiste connecté (ex. après modification du profil). */
export function updateSessionTrader(trader: Trader) {
	const current = currentSession;
	if (current) setSession({ ...current, trader });
}
