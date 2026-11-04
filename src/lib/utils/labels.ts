// Libellés français et mise en forme des données de l'API, partagés par les pages
// Vue d'ensemble, Transactions, Clients & KYC et Alertes.

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

/** 26101.5 → « 26 101,5 » (espaces fines remplacées par des espaces normales pour l'affichage). */
export function formatNumber(value: number): string {
	return numberFormat.format(value).replace(/ | /g, ' ');
}

export function formatMoney(value: number, currency: string): string {
	return `${formatNumber(value)} ${currency}`;
}

/** Montant CDF abrégé pour les cartes : 74 203 768 → « 74,2 M CDF ». */
export function formatCompactCdf(value: number): string {
	if (Math.abs(value) >= 1_000_000_000) return `${formatNumber(round1(value / 1e9))} Md CDF`;
	if (Math.abs(value) >= 1_000_000) return `${formatNumber(round1(value / 1e6))} M CDF`;
	return formatMoney(Math.round(value), 'CDF');
}

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

export function transactionTypeLabel(type: string): string {
	return type === 'SELL' ? 'Vente' : type === 'BUY' ? 'Achat' : type;
}

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
	PENDING: { label: 'En attente', badge: 'app-badge-warning' },
	COMPLETED: { label: 'Terminée', badge: 'app-badge-success' },
	CANCELLED: { label: 'Annulée', badge: 'app-badge-danger' }
};

export function transactionStatus(status: string): { label: string; badge: string } {
	return STATUS_LABELS[status] ?? { label: status || '-', badge: 'app-badge-info' };
}

const RISK_LABELS: Record<string, { label: string; badge: string }> = {
	LOW: { label: 'Faible', badge: 'app-badge-success' },
	MEDIUM: { label: 'Moyen', badge: 'app-badge-warning' },
	HIGH: { label: 'Élevé', badge: 'app-badge-danger' },
	CRITICAL: { label: 'Critique', badge: 'app-badge-danger' }
};

export function riskLevel(level?: string): { label: string; badge: string } {
	return RISK_LABELS[level ?? ''] ?? { label: 'Non évalué', badge: 'app-badge-info' };
}

// Règles de config/risk_rules.json et alertes manuelles.
const FLAG_LABELS: Record<string, string> = {
	MANUAL_FLAG: 'Signalement manuel',
	BUSINESS_ACTIVITY_PROFILE: 'Activité incohérente avec le profil',
	CUMULATIVE_VOLUME_24H: 'Volume cumulé élevé sur 24 h',
	CUMULATIVE_VOLUME_30D: 'Volume cumulé élevé sur 30 jours',
	EXPECTED_VOLUME_EXCEEDED: 'Volume attendu dépassé',
	HIGH_TRANSACTION_AMOUNT: 'Montant de transaction élevé',
	HIGH_AMOUNT: 'Montant élevé',
	INCONSISTENT_KYC_PROFILE: 'Profil KYC incohérent',
	INSUFFICIENT_KYC_STATUS: 'KYC insuffisant',
	UNUSUAL_FREQUENCY_24H: 'Fréquence inhabituelle sur 24 h',
	STRUCTURING_BELOW_THRESHOLD: 'Fractionnement sous le seuil',
	ROUND_TRIP_EXCHANGE: 'Aller-retour sur une devise',
	DORMANT_REACTIVATION: "Reprise d'activité après une longue inactivité",
	MISSING_ID_DOCUMENT: "Aucune pièce d'identité",
	MISSING_ID_PHOTO: 'Photo de la pièce manquante',
	MISSING_PHONE: 'Pas de téléphone',
	MISSING_ADDRESS: 'Adresse non renseignée',
	DUPLICATE_ID_NUMBER: 'Pièce enregistrée sur un autre client',
	EXPIRED_ID_DOCUMENT: "Pièce d'identité expirée",
	POLITICALLY_EXPOSED_PERSON: 'Personne politiquement exposée',
	SENSITIVE_SECTOR: "Secteur d'activité sensible",
	ACTS_FOR_THIRD_PARTY: "Opère pour le compte d'un tiers",
	FOREIGN_OR_NON_RESIDENT: 'Étranger ou non-résident',
	KYC_REVIEW_DUE: 'Dossier KYC à revoir'
};

export function alertLabel(flag: string): string {
	return (
		FLAG_LABELS[flag] ??
		flag
			.replace(/_/g, ' ')
			.toLowerCase()
			.replace(/^./, (c) => c.toUpperCase())
	);
}

const REASON_LABELS: Record<string, string> = {
	'Customer has no KYC profile': "Le client n'a pas encore de dossier KYC",
	'Customer has no identity document on file': "Aucune pièce d'identité enregistrée",
	'Customer has no phone number': 'Aucun numéro de téléphone',
	'Customer has no address': 'Adresse non renseignée',
	'Customer is a politically exposed person': 'Personne politiquement exposée (PPE)',
	'Legal entity cannot have PERSONAL activity profile':
		'Une personne morale ne peut pas avoir un profil « particulier »',
	'Legal entity KYC is missing company name or registration number':
		'Personne morale : raison sociale ou RCCM manquant',
	'Individual professional/business profile is missing profession':
		'Profil professionnel sans profession renseignée',
	'KYC profile is missing source of funds or purpose of operations':
		'Origine des fonds ou objet des opérations non renseigné'
};
const PHOTO_SIDES: Record<string, string> = {
	front: 'recto',
	back: 'verso',
	'front and back': 'recto et verso'
};
// « 2025-03-12 » → « 12/03/2025 »
const frDate = (iso: string) => iso.split('-').reverse().join('/');
// Durée Go (« 24h0m0s », « 720h0m0s ») → « 24 h », « 30 jours ».
function goDuration(text: string): string {
	const hours = Number(text.match(/^(\d+)h/)?.[1] ?? NaN);
	if (!Number.isFinite(hours)) return text;
	return hours % 24 === 0 && hours > 24 ? `${hours / 24} jours` : `${hours} h`;
}
const amount = (text: string) => formatNumber(Number(text));

const REASON_PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
	[
		/^Transaction amount ([\d.]+) exceeds threshold ([\d.]+)$/,
		(m) => `Montant de ${amount(m[1])} supérieur au seuil de ${amount(m[2])}`
	],
	[
		/^Cumulative amount ([\d.]+) exceeds threshold ([\d.]+) over (\S+)$/,
		(m) =>
			`Montant cumulé de ${amount(m[1])} supérieur au seuil de ${amount(m[2])} sur ${goDuration(m[3])}`
	],
	[
		/^Transaction count (\d+) exceeds threshold (\d+) over (\S+)$/,
		(m) => `${m[1]} opérations, au-delà du seuil de ${m[2]} sur ${goDuration(m[3])}`
	],
	[/^Customer activity profile is BUSINESS$/, () => "Profil d'activité du client : entreprise"],
	[
		/^Identity document photo missing \((.+)\)$/,
		(m) => `Photo de la pièce manquante (${PHOTO_SIDES[m[1]] ?? m[1]})`
	],
	[
		/^Identity document number shared with (\d+) other customer\(s\)$/,
		(m) => `Même pièce enregistrée sur ${plural(Number(m[1]), 'autre client', 'autres clients')}`
	],
	[/^Identity document expired on (\S+)$/, (m) => `Pièce expirée depuis le ${frDate(m[1])}`],
	[
		/^Customer is a politically exposed person \((.+)\)$/,
		(m) => `Personne politiquement exposée (${m[1]})`
	],
	[
		/^Customer works in a sensitive sector: (\w+)$/,
		(m) => `Secteur sensible : ${sectorLabel(m[1]).toLowerCase()}`
	],
	[
		/^Customer acts on behalf of a third party: (.*)$/,
		(m) => `Opère pour le compte de ${m[1] || 'un tiers'}`
	],
	[
		/^Customer is ((?:foreign national|not resident).+)$/,
		(m) =>
			'Client ' +
			m[1]
				.replace(
					/foreign national \((\w+)\)/,
					(_, c) => `de nationalité étrangère (${countryLabel(c)})`
				)
				.replace(/not resident in the DRC \((\w+)\)/, (_, c) => `non-résident (${countryLabel(c)})`)
				.replace(' and ', ' et ')
	],
	[
		/^KYC review overdue since (\S+)$/,
		(m) => `Revue du dossier en retard depuis le ${frDate(m[1])}`
	],
	[
		/^(\d+) transactions just below threshold ([\d.]+) over (\S+)$/,
		(m) => `${m[1]} opérations juste sous le seuil de ${amount(m[2])} sur ${goDuration(m[3])}`
	],
	[
		/^Opposite (\w+) after (\w+) on (\w+) within (\S+) \(transaction (\d+)\)$/,
		(m) =>
			`${transactionTypeLabel(m[1])} de ${m[3]} peu après ${m[2] === 'SELL' ? 'une vente' : 'un achat'} (moins de ${goDuration(m[4])}, transaction n° ${m[5]})`
	],
	[
		/^Customer inactive for (\d+) days returns with amount ([\d.]+)$/,
		(m) => `Inactif depuis ${m[1]} jours, revient avec ${amount(m[2])}`
	],
	[
		/^30-day amount ([\d.]+) exceeds expected monthly volume ([\d.]+)$/,
		(m) => `${amount(m[1])} sur 30 jours, au-delà du volume mensuel déclaré (${amount(m[2])})`
	],
	[
		/^KYC status (\w+) is insufficient for transaction$/,
		(m) => `Statut KYC « ${kycStatus(m[1]).label} » insuffisant pour cette opération`
	]
];

export function alertReason(reason: string): string {
	if (REASON_LABELS[reason]) return REASON_LABELS[reason];
	for (const [pattern, translate] of REASON_PATTERNS) {
		const match = reason.match(pattern);
		if (match) return translate(match);
	}
	return reason;
}

export function alertStatusLabel(status: string): string {
	return alertStatus(status).label;
}

/** Écart avec la veille : « +3 par rapport à hier », « −2 … », « Autant qu'hier ». */
export function dayOverDay(today: number, yesterday: number): string {
	const diff = today - yesterday;
	if (diff === 0) return "Autant qu'hier";
	return `${diff > 0 ? '+' : '−'}${Math.abs(diff)} par rapport à hier`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return `${formatNumber(count)} ${count > 1 ? pluralForm : singular}`;
}

const KYC_LABELS: Record<string, { label: string; badge: string }> = {
	UNVERIFIED: { label: 'Non vérifié', badge: 'app-badge-warning' },
	PARTIALLY_VERIFIED: { label: 'Partiel', badge: 'app-badge-warning' },
	VERIFIED: { label: 'Vérifié', badge: 'app-badge-success' },
	ENHANCED_VERIFICATION: { label: 'Vérification renforcée', badge: 'app-badge-success' }
};

export function kycStatus(status?: string): { label: string; badge: string } {
	return KYC_LABELS[status ?? ''] ?? { label: 'Sans dossier', badge: 'app-badge-danger' };
}

export const ALERT_STATUSES: { value: string; label: string; badge: string }[] = [
	{ value: 'OPEN', label: 'Ouverte', badge: 'app-badge-danger' },
	{ value: 'IN_REVIEW', label: 'En revue', badge: 'app-badge-warning' },
	{ value: 'RESOLVED', label: 'Résolue', badge: 'app-badge-success' },
	{ value: 'FALSE_POSITIVE', label: 'Faux positif', badge: 'app-badge-info' }
];

export function alertStatus(status: string): { label: string; badge: string } {
	return (
		ALERT_STATUSES.find((s) => s.value === status) ?? { label: status, badge: 'app-badge-info' }
	);
}

// --- Dossier KYC : listes de choix -----------------------------------------------------

export const SECTORS: { value: string; label: string; sensitive?: boolean }[] = [
	{ value: 'NONE', label: 'Sans activité / particulier' },
	{ value: 'PUBLIC_SECTOR', label: 'Fonction publique' },
	{ value: 'PRIVATE_EMPLOYEE', label: 'Salarié du privé' },
	{ value: 'TRADE', label: 'Commerce' },
	{ value: 'IMPORT_EXPORT', label: 'Import-export' },
	{ value: 'MINING', label: 'Mines et minerais', sensitive: true },
	{ value: 'CURRENCY_EXCHANGE', label: "Change ou transfert d'argent", sensitive: true },
	{ value: 'MOBILE_MONEY', label: 'Agent mobile money', sensitive: true },
	{ value: 'REAL_ESTATE', label: 'Immobilier', sensitive: true },
	{ value: 'TRANSPORT', label: 'Transport' },
	{ value: 'NGO', label: 'ONG / organisation internationale' },
	{ value: 'OTHER', label: 'Autre' }
];

export function sectorLabel(code: string): string {
	return SECTORS.find((s) => s.value === code)?.label ?? code;
}

/** Pays proposés pour la nationalité et la résidence (code ISO 3166 ; ZZ = autre pays). */
export const COUNTRIES: { value: string; label: string }[] = [
	{ value: 'CD', label: 'RD Congo' },
	{ value: 'CG', label: 'Congo-Brazzaville' },
	{ value: 'AO', label: 'Angola' },
	{ value: 'ZM', label: 'Zambie' },
	{ value: 'TZ', label: 'Tanzanie' },
	{ value: 'UG', label: 'Ouganda' },
	{ value: 'RW', label: 'Rwanda' },
	{ value: 'BI', label: 'Burundi' },
	{ value: 'SS', label: 'Soudan du Sud' },
	{ value: 'CF', label: 'Centrafrique' },
	{ value: 'ZA', label: 'Afrique du Sud' },
	{ value: 'KE', label: 'Kenya' },
	{ value: 'NG', label: 'Nigeria' },
	{ value: 'CM', label: 'Cameroun' },
	{ value: 'BE', label: 'Belgique' },
	{ value: 'FR', label: 'France' },
	{ value: 'GB', label: 'Royaume-Uni' },
	{ value: 'US', label: 'États-Unis' },
	{ value: 'CN', label: 'Chine' },
	{ value: 'IN', label: 'Inde' },
	{ value: 'LB', label: 'Liban' },
	{ value: 'AE', label: 'Émirats arabes unis' },
	{ value: 'TR', label: 'Turquie' },
	{ value: 'ZZ', label: 'Autre pays' }
];

export function countryLabel(code: string): string {
	return COUNTRIES.find((c) => c.value === code)?.label ?? code;
}

export const LEGAL_NATURES = [
	{ value: 'INDIVIDUAL', label: 'Personne physique' },
	{ value: 'LEGAL_ENTITY', label: 'Personne morale (société)' }
];

export const ACTIVITY_PROFILES = [
	{ value: 'PERSONAL', label: 'Particulier (besoins personnels)' },
	{ value: 'PROFESSIONAL', label: 'Professionnel' },
	{ value: 'BUSINESS', label: 'Entreprise' },
	{ value: 'OTHER', label: 'Autre' }
];

const SEVERITY_LABELS: Record<string, { label: string; badge: string }> = {
	HIGH: { label: 'Élevé', badge: 'app-badge-danger' },
	MEDIUM: { label: 'Moyen', badge: 'app-badge-warning' },
	LOW: { label: 'Faible', badge: 'app-badge-info' }
};

/** Libellé d'un facteur de risque, suivi de son détail quand celui-ci ne fait pas que le répéter. */
export function factorText(code: string, reason: string): string {
	const label = alertLabel(code);
	const detail = alertReason(reason);
	return detail.toLowerCase().startsWith(label.toLowerCase()) ? detail : `${label} — ${detail}`;
}

export function factorSeverity(severity: string): { label: string; badge: string } {
	return SEVERITY_LABELS[severity] ?? SEVERITY_LABELS.LOW;
}
