import { env } from '$env/dynamic/public';
import { ApiError, extractFieldErrors, mapHttpStatusToMessage } from '$lib/utils/api-errors.js';

type RequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	body?: unknown;
	headers?: Record<string, string>;
};

function getApiBaseUrl(): string {
	const baseUrl = env.PUBLIC_API_BASE_URL?.trim();

	if (!baseUrl) {
		return 'http://localhost:8000/api';
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
		return { message: text };
	}
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
	const headers: Record<string, string> = {
		Accept: 'application/json',
		...options.headers
	};

	const init: RequestInit = {
		method: options.method ?? 'GET',
		headers
	};

	if (options.body !== undefined) {
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
