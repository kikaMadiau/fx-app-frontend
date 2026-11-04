// Libelles affiches dans les formulaires <-> codes attendus par l'API (id_type).
const ID_TYPE_CODES: Record<string, string> = {
	"Carte d'identite": 'NATIONAL_ID',
	Passeport: 'PASSPORT',
	'Permis de conduire': 'DRIVER_LICENSE',
	"Carte d'electeur": 'VOTER_CARD'
};

export function toApiIdType(label: string): string | undefined {
	const trimmed = label.trim();

	if (!trimmed) {
		return undefined;
	}

	return ID_TYPE_CODES[trimmed] ?? trimmed;
}

export function fromApiIdType(code: string): string {
	const label = Object.keys(ID_TYPE_CODES).find((key) => ID_TYPE_CODES[key] === code);

	return label ?? code;
}

/** Pièces d'identité acceptées en RDC, pour les listes déroulantes (valeur = code API). */
export const ID_TYPE_OPTIONS = [
	{ value: 'VOTER_CARD', label: "Carte d'électeur" },
	{ value: 'NATIONAL_ID', label: "Carte d'identité nationale" },
	{ value: 'PASSPORT', label: 'Passeport' },
	{ value: 'DRIVER_LICENSE', label: 'Permis de conduire' }
] as const;
