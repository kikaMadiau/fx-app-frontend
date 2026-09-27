import { searchClientByPhone } from '$lib/api/clients.js';
import type { Client } from '$lib/types/client.js';
import { ApiError } from '$lib/utils/api-errors.js';

export type ClientLookupState =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'success'; client: Client }
	| { status: 'not_found'; phone: string }
	| { status: 'error'; message: string; phone: string };

export function createIdleLookupState(): ClientLookupState {
	return { status: 'idle' };
}

export async function lookupClientByPhone(phone: string): Promise<ClientLookupState> {
	try {
		const client = await searchClientByPhone(phone);
		return { status: 'success', client };
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			return { status: 'not_found', phone };
		}

		const message =
			error instanceof ApiError
				? error.message
				: 'Impossible de rechercher le client pour le moment.';

		return { status: 'error', message, phone };
	}
}

export function resetLookupState(): ClientLookupState {
	return createIdleLookupState();
}
