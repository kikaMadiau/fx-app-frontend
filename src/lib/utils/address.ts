// Les 24 communes de Kinshasa, proposées dans le champ « Commune » (on peut en écrire une autre).
export const KINSHASA_COMMUNES = [
	'Bandalungwa',
	'Barumbu',
	'Bumbu',
	'Gombe',
	'Kalamu',
	'Kasa-Vubu',
	'Kimbanseke',
	'Kinshasa',
	'Kintambo',
	'Kisenso',
	'Lemba',
	'Limete',
	'Lingwala',
	'Makala',
	'Maluku',
	'Masina',
	'Matete',
	'Mont-Ngafula',
	'Ndjili',
	'Ngaba',
	'Ngaliema',
	'Ngiri-Ngiri',
	'Nsele',
	'Selembao'
] as const;

type AddressParts = { commune?: string; quartier?: string; avenue?: string; number?: string };

/** Adresse sur une ligne : « 12, Av. du Port, Q. Golf, C. Gombe ». */
export function formatAddress(a: AddressParts | null | undefined): string {
	if (!a) return '';
	const street = [a.number, a.avenue].filter((v) => v?.trim()).join(', ');
	return [
		street,
		a.quartier?.trim() && `Q. ${a.quartier.trim()}`,
		a.commune?.trim() && `C. ${a.commune.trim()}`
	]
		.filter(Boolean)
		.join(', ');
}
