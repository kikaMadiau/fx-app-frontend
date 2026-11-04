import { env } from '$env/dynamic/public';
import { getProfile } from '$lib/api/profile.js';
import type { Trader } from '$lib/types/trader.js';

// Coordonnées du bureau imprimées sur les bordereaux et les rapports : le nom vient du
// profil du cambiste (« Bureau de change »), le reste du .env de l'interface.
// logo : chemin du logo du bureau (vide = pas de logo, donc aucune requête vers le serveur).
export type Bureau = { name: string; address: string; phone: string; agrement: string; logo: string };

export function bureauFromEnv(name = ''): Bureau {
	return {
		name: name.trim() || 'Bureau de change',
		address: env.PUBLIC_RECEIPT_ADDRESS?.trim() ?? '',
		phone: env.PUBLIC_RECEIPT_PHONE?.trim() ?? '',
		agrement: env.PUBLIC_RECEIPT_BCC_AGREMENT?.trim() ?? '',
		logo: env.PUBLIC_RECEIPT_LOGO?.trim() ?? ''
	};
}

export async function loadBureau(): Promise<Bureau> {
	try {
		return bureauFromEnv((await getProfile()).exchange_office ?? '');
	} catch {
		return bureauFromEnv();
	}
}

/** Prénom et nom (dans cette API, « name » est le nom du bureau du compte). */
export function personName(trader: Trader | null | undefined): string {
	if (!trader) return '—';
	return `${trader.first_name ?? ''} ${trader.last_name ?? ''}`.trim() || trader.email;
}
