import type { Trader } from '$lib/types/trader.js';
import type { Preferences } from '$lib/stores/preferences.js';

export type NotificationPreferences = {
	email: boolean;
	sms: boolean;
	weekly_report: boolean;
};

export type TraderProfile = {
	birth_date: string | null; // AAAA-MM-JJ
	id_type: string; // code API : NATIONAL_ID, PASSPORT, DRIVER_LICENSE, VOTER_CARD
	id_number: string;
	has_photo: boolean;
	photo_updated_at: string | null;
	notifications: NotificationPreferences;
	two_factor_enabled: boolean;
	recovery_codes_left: number;
	last_login_at: string | null;
	previous_login_at: string | null;
	last_login_agent: string;
	preferences: Preferences;
	gender: '' | 'M' | 'F';
	address: Address;
	location: SharedLocation;
};

export type Address = {
	commune: string;
	quartier: string;
	avenue: string;
	number: string;
	reference: string;
};

export type SharedLocation = {
	sharing: boolean;
	latitude: number | null;
	longitude: number | null;
	accuracy: number | null;
	at: string | null;
};

export type ProfileResponse = {
	trader: Trader & { created_at?: string };
	exchange_office: string;
	store?: { id: number; name: string; bcc_license_number: string; status: string } | null;
	profile: TraderProfile;
};

export type ProfileUpdatePayload = {
	first_name: string;
	last_name: string;
	phone: string;
	exchange_office: string;
	birth_date: string;
	id_type: string;
	id_number: string;
	gender?: string;
	address?: Address;
};

export type TwoFactorSetup = {
	secret: string;
	otpauth_url: string;
	qr_code: string;
};
