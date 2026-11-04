import { apiFetchBlob, apiRequest } from '$lib/api/http.js';
import { ApiError } from '$lib/utils/api-errors.js';
import type { Address, SharedLocation } from '$lib/types/profile.js';

// Écrans de l'administrateur de la plateforme : personnel des bureaux et réglages d'envoi.

export type StaffMember = {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	role: string;
	is_active: boolean;
	store_id: number;
	store_name: string;
	gender: '' | 'M' | 'F';
	has_photo: boolean;
	address: Address;
	location: SharedLocation;
	last_login_at: string | null;
};

export type StoreSummary = { id: number; name: string; bcc_license_number: string; status: string };

export function listStaff(storeId = 0): Promise<{ items: StaffMember[]; server_time: string }> {
	return apiRequest(`/staff${storeId ? `?store_id=${storeId}` : ''}`);
}

export function fetchStaffPhoto(id: number): Promise<Blob | null> {
	return apiFetchBlob(`/staff/${id}/photo`);
}

export async function listStores(): Promise<StoreSummary[]> {
	const response = await apiRequest<StoreSummary[] | { items: StoreSummary[] }>('/stores');
	return Array.isArray(response) ? response : (response.items ?? []);
}

export type NotificationMode = 'test' | 'live' | 'off';

export type NotificationSettings = {
	mode: NotificationMode;
	sms_enabled: boolean;
	whatsapp_enabled: boolean;
	email_enabled: boolean;
	twilio_account_sid: string;
	twilio_from: string;
	twilio_whatsapp_from: string;
	smtp_host: string;
	smtp_port: number;
	smtp_user: string;
	smtp_from: string;
	smtp_ssl: boolean;
	twilio_auth_token_set: boolean;
	smtp_pass_set: boolean;
	sms_ready: boolean;
	whatsapp_ready: boolean;
	email_ready: boolean;
};

export type NotificationSettingsUpdate = Omit<
	NotificationSettings,
	'twilio_auth_token_set' | 'smtp_pass_set' | 'sms_ready' | 'whatsapp_ready' | 'email_ready'
> & { twilio_auth_token?: string; smtp_pass?: string };

const MESSAGES: [RegExp, string][] = [
	[/twilio_account_sid must start with AC/i, 'L’Account SID Twilio commence par « AC ».'],
	[
		/enable at least one channel/i,
		'Activez au moins un canal (SMS, WhatsApp ou e-mail) pour l’envoi réel.'
	],
	[
		/invalid sender phone/i,
		'Numéro expéditeur invalide (format international, ex. +1 415 523 8886).'
	],
	[/smtp_port must be/i, 'Le port SMTP doit être compris entre 1 et 65535.'],
	[/invalid phone/i, 'Numéro de téléphone invalide (ex. +243 812 345 678).'],
	[/email must be a valid/i, 'Adresse e-mail invalide.'],
	[/mode must be one of/i, 'Mode d’envoi inconnu.']
];

async function translated<T>(request: Promise<T>): Promise<T> {
	try {
		return await request;
	} catch (error) {
		if (error instanceof ApiError) {
			const french = MESSAGES.find(([pattern]) => pattern.test(error.message))?.[1];
			throw new ApiError(french ?? error.message, error.status, error.fieldErrors);
		}
		throw error;
	}
}

export function getNotificationSettings(): Promise<NotificationSettings> {
	return translated(apiRequest<NotificationSettings>('/admin/notification-settings'));
}

export function saveNotificationSettings(
	settings: NotificationSettingsUpdate
): Promise<NotificationSettings> {
	return translated(
		apiRequest<NotificationSettings>('/admin/notification-settings', {
			method: 'PUT',
			body: settings
		})
	);
}

export function sendTestNotification(
	channel: 'sms' | 'whatsapp' | 'email',
	to: string
): Promise<{ ok: boolean; detail: string }> {
	return translated(
		apiRequest<{ ok: boolean; detail: string }>('/admin/notification-settings/test', {
			method: 'POST',
			body: { channel, to }
		})
	);
}
