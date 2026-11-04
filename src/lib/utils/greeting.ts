// Message d'accueil de la page de connexion : il dépend de l'heure et de la dernière connexion
// faite sur cet appareil (prénom et date, mémorisés après une connexion réussie).

export type LastVisit = { firstName: string; at: string };
export type Greeting = { title: string; subtitle: string };

const STORAGE_KEY = 'fx_last_visit';
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function greeting(now: Date, last: LastVisit | null): Greeting {
	const hour = now.getHours();
	const name = last?.firstName?.trim() ?? '';
	const withName = (text: string) => (name ? `${text}, ${name}` : text);
	const elapsed = last ? now.getTime() - new Date(last.at).getTime() : Infinity;

	// Nuit : le message prime, qu'on soit nouveau ou non.
	if (hour < 5) {
		return elapsed < 3 * HOUR
			? {
					title: name ? `Toujours là, ${name} ?` : 'Toujours là ?',
					subtitle: 'Il est tard. Une dernière vérification avant de dormir ?'
				}
			: {
					title: name ? `Couche-tard, ${name} ?` : 'Couche-tard ?',
					subtitle: 'Le marché dort, pas vous. Connectez-vous à votre espace.'
				};
	}

	if (!last) {
		return {
			title: 'Bienvenue sur MOTUYA Fx.',
			subtitle: `${timeOfDay(hour)} ! Connectez-vous à votre espace professionnel.`
		};
	}
	if (elapsed < 2 * HOUR) {
		return {
			title: name ? `Encore là, ${name} ?` : 'Encore là ?',
			subtitle: 'Reprenez là où vous en étiez.'
		};
	}
	if (elapsed > 7 * DAY) {
		return {
			title: withName('Bon retour'),
			subtitle: 'Ça faisait longtemps. Connectez-vous pour retrouver votre activité.'
		};
	}
	if (hour >= 22) {
		return {
			title: withName('Bonsoir'),
			subtitle: 'Vous travaillez tard. Connectez-vous à votre espace.'
		};
	}
	return { title: withName(timeOfDay(hour)), subtitle: subtitleFor(hour) };
}

export function timeOfDay(hour: number): string {
	if (hour < 12) return 'Bonjour';
	if (hour < 18) return 'Bon après-midi';
	return 'Bonsoir';
}

function subtitleFor(hour: number): string {
	if (hour < 9) return 'Prêt pour l’ouverture du guichet ?';
	if (hour < 12) return 'Connectez-vous pour suivre les opérations du jour.';
	if (hour < 18) return 'Connectez-vous pour reprendre vos opérations.';
	return 'Connectez-vous pour clôturer votre journée.';
}

/** Dernière connexion sur cet appareil (null si aucune, ou si le stockage est indisponible). */
export function readLastVisit(): LastVisit | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		const value = raw ? (JSON.parse(raw) as LastVisit) : null;
		return value && typeof value.at === 'string' ? value : null;
	} catch {
		return null;
	}
}

export function rememberVisit(firstName: string, at = new Date()) {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ firstName: firstName.trim(), at: at.toISOString() })
		);
	} catch {
		// Navigation privée ou stockage bloqué : le message reste générique.
	}
}
