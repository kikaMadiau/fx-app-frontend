export type Trader = {
	id: number;
	name: string;
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	status: string;
	role: string;
	roles?: string[];
	permissions?: string[];
	store_id: number;
	is_active: boolean;
	is_platform_admin?: boolean;
	store?: { id: number; name: string; bcc_license_number?: string } | null;
};

/** Administrateur de la plateforme (voit tous les bureaux). */
export function isPlatformAdmin(trader: Trader | null | undefined): boolean {
	return !!trader && (trader.is_platform_admin === true || trader.role === 'ADMIN');
}

/** Superviseur d'un bureau : gère l'équipe et accepte les inscriptions. */
export function isSupervisor(trader: Trader | null | undefined): boolean {
	return (
		!!trader && (trader.role ?? '').split(',').some((r) => r.trim().toUpperCase() === 'SUPERVISOR')
	);
}

export function getTraderDisplayName(trader: Trader): string {
	if (trader.name?.trim()) return trader.name.trim();

	const combined = `${trader.first_name ?? ''} ${trader.last_name ?? ''}`.trim();
	return combined || trader.email;
}
