export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
	status: number;
	fieldErrors: FieldErrors;

	constructor(message: string, status: number, fieldErrors: FieldErrors = {}) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.fieldErrors = fieldErrors;
	}
}

export function getUserFacingErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'Une erreur inattendue est survenue. Veuillez reessayer.';
}

export function mapHttpStatusToMessage(status: number, fallback?: string): string {
	switch (status) {
		case 400:
			return fallback || 'Les donnees envoyees sont invalides.';
		case 404:
			return fallback || 'Ressource introuvable.';
		case 409:
			return fallback || 'Un conflit a ete detecte. Verifiez les informations saisies.';
		case 422:
			return fallback || 'Certains champs sont invalides.';
		case 500:
			return 'Le serveur a rencontre une erreur. Veuillez reessayer plus tard.';
		default:
			return fallback || 'Une erreur est survenue. Veuillez reessayer.';
	}
}

export function extractFieldErrors(payload: unknown): FieldErrors {
	if (!payload || typeof payload !== 'object') {
		return {};
	}

	const data = payload as Record<string, unknown>;
	const errors: FieldErrors = {};

	if (data.errors && typeof data.errors === 'object') {
		for (const [key, value] of Object.entries(data.errors as Record<string, unknown>)) {
			if (typeof value === 'string') {
				errors[key] = value;
			} else if (Array.isArray(value) && typeof value[0] === 'string') {
				errors[key] = value[0];
			}
		}
	}

	if (typeof data.detail === 'object' && data.detail !== null) {
		for (const [key, value] of Object.entries(data.detail as Record<string, unknown>)) {
			if (typeof value === 'string') {
				errors[key] = value;
			} else if (Array.isArray(value) && typeof value[0] === 'string') {
				errors[key] = value[0];
			}
		}
	}

	return errors;
}
