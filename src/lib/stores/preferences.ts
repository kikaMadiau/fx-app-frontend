import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { TransactionCurrency } from '$lib/types/transaction.js';

export type Theme = 'light' | 'dark' | 'system';
export type DateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'LONG';
export type Timezone = 'Africa/Kinshasa' | 'Africa/Lubumbashi';

export type Preferences = {
	currency: TransactionCurrency;
	timezone: Timezone;
	date_format: DateFormat;
	theme: Theme;
	dashboard_alerts: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
	currency: 'USD',
	timezone: 'Africa/Kinshasa',
	date_format: 'DD/MM/YYYY',
	theme: 'light',
	dashboard_alerts: true
};

// Copie locale : l'interface applique le thème et les formats dès l'ouverture, avant la réponse de l'API.
// La clé est aussi lue par le petit script de src/app.html (thème sans flash blanc).
export const PREFERENCES_STORAGE_KEY = 'fx_preferences';

function readStored(): Preferences {
	if (!browser) return DEFAULT_PREFERENCES;
	try {
		const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
		return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
	} catch {
		return DEFAULT_PREFERENCES;
	}
}

export const preferences = writable<Preferences>(readStored());

export function setPreferences(value: Preferences) {
	preferences.set(value);
	if (!browser) return;
	try {
		localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(value));
	} catch {
		// stockage indisponible (navigation privée) : les préférences restent valables pour la session
	}
	applyTheme(value.theme);
}

let systemQuery: MediaQueryList | null = null;

function onSystemThemeChange() {
	applyTheme('system');
}

/** Applique le thème sur <html data-theme="light|dark"> ; « system » suit le réglage de l'appareil. */
export function applyTheme(theme: Theme) {
	if (!browser) return;
	systemQuery ??= window.matchMedia('(prefers-color-scheme: dark)');
	systemQuery.removeEventListener('change', onSystemThemeChange);
	const dark = theme === 'dark' || (theme === 'system' && systemQuery.matches);
	document.documentElement.dataset.theme = dark ? 'dark' : 'light';
	document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
	if (theme === 'system') systemQuery.addEventListener('change', onSystemThemeChange);
}

export function resetPreferences() {
	setPreferences(DEFAULT_PREFERENCES);
}
