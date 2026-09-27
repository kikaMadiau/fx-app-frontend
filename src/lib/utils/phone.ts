const DRC_PHONE_REGEX = /^\+243[0-9]{9}$/;

export function normalizePhone(phone: string): string {
	const trimmed = phone.trim();
	const digitsOnly = trimmed.replace(/\D/g, '');

	if (trimmed.startsWith('+')) {
		return `+${digitsOnly}`;
	}

	if (digitsOnly.startsWith('243') && digitsOnly.length === 12) {
		return `+${digitsOnly}`;
	}

	if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
		return `+243${digitsOnly.slice(1)}`;
	}

	if (digitsOnly.length === 9) {
		return `+243${digitsOnly}`;
	}

	return trimmed.replace(/\s+/g, '');
}

export function formatPhoneDisplay(phone: string): string {
	const normalized = normalizePhone(phone);

	if (!DRC_PHONE_REGEX.test(normalized)) {
		return phone.trim();
	}

	const localNumber = normalized.slice(4);
	return `+243 ${localNumber.slice(0, 3)} ${localNumber.slice(3, 6)} ${localNumber.slice(6)}`;
}

export function validatePhone(phone: string): string | null {
	const normalized = normalizePhone(phone);

	if (!normalized) {
		return 'Le numero de telephone est obligatoire.';
	}

	if (!DRC_PHONE_REGEX.test(normalized)) {
		return 'Entrez un numero congolais valide (ex: +243 900 000 000).';
	}

	return null;
}
