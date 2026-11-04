import { get } from 'svelte/store';
import { preferences, type DateFormat, type Timezone } from '$lib/stores/preferences.js';

type FormatOptions = {
	withTime?: boolean;
	timezone?: Timezone;
	dateFormat?: DateFormat;
};

/**
 * Formate une date selon les préférences du cambiste (fuseau horaire et format choisis
 * dans Paramètres). Renvoie une chaîne vide si la date est absente ou invalide.
 */
export function formatDate(
	value: string | Date | null | undefined,
	options: FormatOptions = {}
): string {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const prefs = get(preferences);
	const timeZone = options.timezone ?? prefs.timezone;
	const format = options.dateFormat ?? prefs.date_format;

	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('fr-FR', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		})
			.formatToParts(date)
			.map((part) => [part.type, part.value])
	);

	let text: string;
	if (format === 'LONG') {
		text = new Intl.DateTimeFormat('fr-FR', { timeZone, dateStyle: 'long' }).format(date);
	} else if (format === 'YYYY-MM-DD') {
		text = `${parts.year}-${parts.month}-${parts.day}`;
	} else {
		text = `${parts.day}/${parts.month}/${parts.year}`;
	}

	return options.withTime ? `${text} à ${parts.hour}:${parts.minute}` : text;
}
