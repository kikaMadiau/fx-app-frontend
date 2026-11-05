import { apiFetchBlob, apiRequest } from '$lib/api/http.js';
import { ApiError } from '$lib/utils/api-errors.js';
import { getStoredTrader, replaceSessionToken, updateSessionTrader } from '$lib/stores/session.js';
import type { Preferences } from '$lib/stores/preferences.js';
import type {
	NotificationPreferences,
	ProfileResponse,
	ProfileUpdatePayload,
	TwoFactorSetup
} from '$lib/types/profile.js';

// Messages de l'API (en anglais) traduits pour l'écran.
const MESSAGES: [RegExp, string][] = [
	[/birth_date must use/i, 'La date de naissance est invalide.'],
	[/age between 18 and 120/i, 'Le cambiste doit avoir au moins 18 ans.'],
	[/id_type must be one of/i, "Type de pièce d'identité non reconnu."],
	[
		/id_type and id_number must be provided together/i,
		"Indiquez le type ET le numéro de la pièce d'identité."
	],
	[/first_name and last_name are required/i, 'Le prénom et le nom sont obligatoires.'],
	[/at most 100 characters/i, 'Le prénom et le nom ne doivent pas dépasser 100 caractères.'],
	[
		/exchange_office must be at most/i,
		'Le nom du bureau de change est trop long (120 caractères maximum).'
	],
	[/id_number must be at most/i, 'Le numéro de pièce est trop long (60 caractères maximum).'],
	[/invalid phone/i, 'Numéro de téléphone invalide (ex. +243 812 345 678).'],
	[/JPEG, PNG or WebP/i, 'La photo doit être une image JPEG, PNG ou WebP.'],
	[/at most 2 MB/i, 'La photo ne doit pas dépasser 2 Mo.'],
	[
		/invalid two-factor code/i,
		'Code incorrect ou expiré. Vérifiez votre application et réessayez.'
	],
	[/already enabled/i, 'La double authentification est déjà activée.'],
	[/start the two-factor setup first/i, "Relancez l'activation de la double authentification."],
	[/is not enabled/i, "La double authentification n'est pas activée."],
	[/current password is incorrect/i, 'Le mot de passe actuel est incorrect.'],
	[
		/must be different from the current/i,
		"Le nouveau mot de passe doit être différent de l'actuel."
	],
	[/at least 12 bytes/i, 'Le nouveau mot de passe doit contenir au moins 12 caractères.'],
	[/must not exceed 72 bytes/i, 'Le nouveau mot de passe est trop long (72 caractères maximum).'],
	[/must be one of/i, "Cette valeur n'est pas autorisée."]
];

export function translateProfileError(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	for (const [pattern, french] of MESSAGES) {
		if (pattern.test(message)) return french;
	}
	return message;
}

async function translated<T>(request: Promise<T>): Promise<T> {
	try {
		return await request;
	} catch (error) {
		if (error instanceof ApiError) {
			throw new ApiError(translateProfileError(error), error.status, error.fieldErrors);
		}
		throw error;
	}
}

export function getProfile(): Promise<ProfileResponse> {
	return translated(apiRequest<ProfileResponse>('/auth/me/profile'));
}

export function updateProfile(payload: ProfileUpdatePayload): Promise<ProfileResponse> {
	return translated(
		apiRequest<ProfileResponse>('/auth/me/profile', { method: 'PUT', body: payload })
	);
}

export function uploadProfilePhoto(photo: Blob): Promise<ProfileResponse> {
	const form = new FormData();
	form.append('photo', photo, 'photo.jpg');
	return translated(
		apiRequest<ProfileResponse>('/auth/me/photo', { method: 'PUT', rawBody: form })
	);
}

export function deleteProfilePhoto(): Promise<void> {
	return translated(apiRequest<void>('/auth/me/photo', { method: 'DELETE' }));
}

export function fetchProfilePhoto(): Promise<Blob | null> {
	return apiFetchBlob('/auth/me/photo');
}

export function updateNotifications(
	preferences: NotificationPreferences
): Promise<NotificationPreferences> {
	return translated(
		apiRequest<NotificationPreferences>('/auth/me/notifications', {
			method: 'PUT',
			body: preferences
		})
	);
}

export function startTwoFactorSetup(): Promise<TwoFactorSetup> {
	return translated(apiRequest<TwoFactorSetup>('/auth/me/2fa/setup', { method: 'POST' }));
}

export function confirmTwoFactorSetup(code: string): Promise<{ recovery_codes: string[] }> {
	return translated(
		apiRequest<{ recovery_codes: string[] }>('/auth/me/2fa/enable', {
			method: 'POST',
			body: { code }
		})
	);
}

export function disableTwoFactor(code: string): Promise<void> {
	return translated(apiRequest<void>('/auth/me/2fa/disable', { method: 'POST', body: { code } }));
}

/**
 * Réduit une photo choisie par l'utilisateur (souvent plusieurs Mo depuis un téléphone)
 * à un carré de 512 px en JPEG, avant l'envoi.
 */
export async function prepareProfilePhoto(file: File, size = 512): Promise<Blob> {
	if (!file.type.startsWith('image/')) {
		throw new Error('Choisissez une image (JPEG, PNG ou WebP).');
	}
	const bitmap = await createImageBitmap(file).catch(() => {
		throw new Error("Cette image n'a pas pu être lue. Essayez une autre photo.");
	});
	const side = Math.min(bitmap.width, bitmap.height);
	const canvas = document.createElement('canvas');
	canvas.width = canvas.height = Math.min(size, side);
	const context = canvas.getContext('2d');
	if (!context) throw new Error("Votre navigateur ne permet pas de préparer l'image.");
	// Recadrage centré en carré.
	context.drawImage(
		bitmap,
		(bitmap.width - side) / 2,
		(bitmap.height - side) / 2,
		side,
		side,
		0,
		0,
		canvas.width,
		canvas.height
	);
	bitmap.close();
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("L'image n'a pas pu être préparée."))),
			'image/jpeg',
			0.88
		)
	);
}

export function updatePreferences(preferences: Preferences): Promise<Preferences> {
	return translated(
		apiRequest<Preferences>('/auth/me/preferences', { method: 'PUT', body: preferences })
	);
}

/** Change le mot de passe. Les autres sessions sont coupées ; celle-ci garde un nouveau jeton. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
	const result = await translated(
		apiRequest<{ access_token?: string } | undefined>('/auth/me/password', {
			method: 'POST',
			body: { current_password: currentPassword, new_password: newPassword }
		})
	);
	if (result?.access_token) replaceSessionToken(result.access_token);
	const trader = getStoredTrader();
	if (trader?.must_change_password) updateSessionTrader({ ...trader, must_change_password: false });
}
