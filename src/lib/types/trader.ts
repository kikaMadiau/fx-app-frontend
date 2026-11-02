export type Trader = {
	id: number;
	name: string;
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	status: string;
	role: string;
	store_id: number;
	is_active: boolean;
};

export function getTraderDisplayName(trader: Trader): string {
	if (trader.name?.trim()) return trader.name.trim();

	const combined = `${trader.first_name ?? ''} ${trader.last_name ?? ''}`.trim();
	return combined || trader.email;
}
