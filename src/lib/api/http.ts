import { env } from '$env/dynamic/public';
import { ApiError, extractFieldErrors, mapHttpStatusToMessage } from '$lib/utils/api-errors.js';
import { clearSession, getStoredAccessToken } from '$lib/stores/session.js';

type RequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	headers?: Record<string, string>;
	/** Set true for endpoints that must not send the stored Bearer token (e.g. login). */
	skipAuth?: boolean;
	/** Corps brut (ex. FormData pour un envoi de fichier) : le navigateur fixe lui-même le Content-Type. */
	rawBody?: BodyInit;
};

function getApiBaseUrl(): string {
	const baseUrl = env.PUBLIC_API_BASE_URL?.trim();

	if (!baseUrl) {
		return 'http://localhost:3000';
	}

	return baseUrl.replace(/\/$/, '');
}

async function parseJsonResponse(response: Response): Promise<unknown> {
	const text = await response.text();

	if (!text) {
		return null;
	}

	try {
		return JSON.parse(text);
	} catch {
		// Texte court de l'API (http.Error) : on le garde. Page HTML (ex. 404 du serveur
		// de développement quand le relais /api est absent) : jamais affichée telle quelle.
		const trimmed = text.trim();
		if (trimmed.startsWith('<') || trimmed.length > 300) return null;
		return { message: trimmed };
	}
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
	const headers: Record<string, string> = {
		Accept: 'application/json',
		...options.headers
	};

	if (!options.skipAuth) {
		const token = getStoredAccessToken();
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
	}

	const init: RequestInit = {
		method: options.method ?? 'GET',
		headers
	};

	if (options.rawBody !== undefined) {
		init.body = options.rawBody;
	} else if (options.body !== undefined) {
		headers['Content-Type'] = 'application/json';
		init.body = JSON.stringify(options.body);
	}

	let response: Response;

	try {
		response = await fetch(url, init);
	} catch {
		throw new ApiError('Impossible de contacter le serveur. Verifiez votre connexion.', 0);
	}

	const payload = await parseJsonResponse(response);

	if (response.ok) {
		return payload as T;
	}

	if (response.status === 401 && !options.skipAuth) {
		clearSession();
	}

	const fieldErrors = extractFieldErrors(payload);
	const payloadMessage =
		payload &&
		typeof payload === 'object' &&
		typeof (payload as Record<string, unknown>).message === 'string'
			? ((payload as Record<string, string>).message as string)
			: undefined;

	throw new ApiError(
		mapHttpStatusToMessage(response.status, payloadMessage),
		response.status,
		fieldErrors
	);
}

/** Télécharge un fichier protégé (ex. photo de profil). Renvoie null s'il n'existe pas (404). */
export async function apiFetchBlob(path: string): Promise<Blob | null> {
	const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
	const token = getStoredAccessToken();
	let response: Response;

	try {
		response = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
	} catch {
		throw new ApiError('Impossible de contacter le serveur. Verifiez votre connexion.', 0);
	}

	if (response.status === 404) return null;
	if (response.status === 401) clearSession();
	if (!response.ok) throw new ApiError(mapHttpStatusToMessage(response.status), response.status);

	return response.blob();
}
