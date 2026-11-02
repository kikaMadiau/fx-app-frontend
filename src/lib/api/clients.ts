import { apiRequest } from '$lib/api/http.js';
import type { Client } from '$lib/types/client.js';
import { normalizePhone } from '$lib/utils/phone.js';
import { ApiError } from '$lib/utils/api-errors.js';

export async function searchClientByPhone(phone: string): Promise<Client> {
	const normalizedPhone = normalizePhone(phone);

	try {
		return await apiRequest<Client>(`/customers/search?phone=${encodeURIComponent(normalizedPhone)}`);
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			throw new ApiError('Aucun client trouve avec ce numero.', 404);
		}

		throw error;
	}
}
