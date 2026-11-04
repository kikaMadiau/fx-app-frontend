import { apiRequest } from '$lib/api/http.js';
import { setSession } from '$lib/stores/session.js';
import type { Trader } from '$lib/types/trader.js';

type LoginResponse = {
	access_token: string;
	token_type: string;
	expires_in: number;
	trader: Trader;
};

type TwoFactorChallenge = {
	two_factor_required: true;
	message: string;
};

export type LoginResult = { status: 'ok'; trader: Trader } | { status: 'two_factor_required' };

/**
 * Connexion en une ou deux étapes : si la double authentification est active, l'API répond
 * d'abord « code requis » ; il faut alors rappeler login avec le code de l'application (otpCode).
 */
export async function login(
	email: string,
	password: string,
	otpCode?: string
): Promise<LoginResult> {
	const body: Record<string, string> = { email, password };
	if (otpCode) body.otp_code = otpCode;

	const response = await apiRequest<LoginResponse | TwoFactorChallenge>('/auth/trader/login', {
		method: 'POST',
		body,
		skipAuth: true
	});

	if ('two_factor_required' in response && response.two_factor_required) {
		return { status: 'two_factor_required' };
	}

	const success = response as LoginResponse;
	setSession({ accessToken: success.access_token, trader: success.trader });

	return { status: 'ok', trader: success.trader };
}

/** « Mot de passe oublié » : la réponse est la même que le compte existe ou non. */
export function requestPasswordReset(email: string) {
	return apiRequest<{ message: string; mode: string }>('/auth/password/forgot', {
		method: 'POST',
		body: { email },
		skipAuth: true
	});
}

/** Nouveau mot de passe choisi avec le lien reçu par e-mail. */
export function resetPassword(token: string, password: string) {
	return apiRequest<{ message: string }>('/auth/password/reset', {
		method: 'POST',
		body: { token, password },
		skipAuth: true
	});
}

export type RegisterPayload = {
	first_name: string;
	last_name: string;
	email: string;
	phone?: string;
	bcc_license_number: string;
	password: string;
};

/** « Créer un compte » : accepté seulement avec un numéro d'agrément BCC valable. */
export function register(payload: RegisterPayload) {
	return apiRequest<{ message: string; store_name: string }>('/auth/register', {
		method: 'POST',
		body: payload,
		skipAuth: true
	});
}
