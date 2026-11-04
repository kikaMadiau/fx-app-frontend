import { apiRequest } from '$lib/api/http.js';

export type Store = {
	id: number;
	name: string;
	bcc_license_number: string;
	license_issued_at: string | null;
	license_expires_at: string | null;
	status: string;
	created_at: string;
	updated_at: string;
};

type StoreList = { items: Store[]; total: number };

export async function listStores(): Promise<Store[]> {
	const response = await apiRequest<StoreList>('/stores');
	return response.items ?? [];
}
