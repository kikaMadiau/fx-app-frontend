import { apiRequest } from '$lib/api/http.js';
import { setSession } from '$lib/stores/session.js';
import type { Trader } from '$lib/types/trader.js';

type LoginResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	trader: Trader;
};

export async function login(email: string, password: string): Promise<Trader> {
	const response = await apiRequest<LoginResponse>('/auth/trader/login', {
		method: 'POST',
		body: { email, password },
		skipAuth: true
	});

	setSession({ accessToken: response.access_token, trader: response.trader });

	return response.trader;
}
