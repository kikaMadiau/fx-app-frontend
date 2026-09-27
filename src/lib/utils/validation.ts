import type { Client } from '$lib/types/client.js';
import type { TransactionFormData } from '$lib/types/transaction.js';
import { validatePhone } from '$lib/utils/phone.js';

export type FormErrors = Record<string, string>;

function getFieldValue(value: string | number): string {
	return String(value).trim();
}

export function validateNewClientFields(form: TransactionFormData): FormErrors {
	const errors: FormErrors = {};

	if (!form.firstName.trim()) {
		errors.firstName = 'Le prenom est obligatoire.';
	}

	if (!form.lastName.trim()) {
		errors.lastName = 'Le nom est obligatoire.';
	}

	const phoneError = validatePhone(form.phone);
	if (phoneError) {
		errors.phone = phoneError;
	}

	if (!form.identityDocumentType.trim()) {
		errors.identityDocumentType = 'Le type de piece est obligatoire.';
	}

	if (!form.identityDocumentNumber.trim()) {
		errors.identityDocumentNumber = 'Le numero de piece est obligatoire.';
	}

	return errors;
}

export function validateExistingClientPhone(phone: string): FormErrors {
	const errors: FormErrors = {};
	const phoneError = validatePhone(phone);

	if (phoneError) {
		errors.phone = phoneError;
	}

	return errors;
}

export function validateTransactionFields(form: TransactionFormData): FormErrors {
	const errors: FormErrors = {};
	const amountValue = getFieldValue(form.amount);
	const rateValue = getFieldValue(form.rate);
	const amount = Number(amountValue);

	if (!amountValue) {
		errors.amount = 'Le montant est obligatoire.';
	} else if (!Number.isFinite(amount) || amount <= 0) {
		errors.amount = 'Entrez un montant superieur a zero.';
	}

	if (rateValue) {
		const rate = Number(rateValue);
		if (!Number.isFinite(rate) || rate <= 0) {
			errors.rate = 'Entrez un taux valide.';
		}
	}

	return errors;
}

export function validateIdentityDocumentFields(form: TransactionFormData): FormErrors {
	const errors: FormErrors = {};

	if (!form.identityDocumentType.trim()) {
		errors.identityDocumentType = 'Le type de piece presentee est obligatoire.';
	}

	if (!form.identityDocumentNumber.trim()) {
		errors.identityDocumentNumber = 'Le numero de piece presentee est obligatoire.';
	}

	return errors;
}

export function hasErrors(errors: FormErrors): boolean {
	return Object.keys(errors).length > 0;
}

export function mergeErrors(...errorGroups: FormErrors[]): FormErrors {
	return errorGroups.reduce<FormErrors>((merged, group) => ({ ...merged, ...group }), {});
}

export function requireFoundClient(client: Client | null): FormErrors {
	if (!client) {
		return { client: 'Recherchez et confirmez un client existant avant de continuer.' };
	}

	return {};
}
