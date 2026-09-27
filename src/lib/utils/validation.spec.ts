import { describe, expect, it } from 'vitest';
import { createEmptyTransactionForm } from '$lib/types/transaction.js';
import {
	hasErrors,
	validateExistingClientPhone,
	validateNewClientFields,
	validateTransactionFields
} from './validation.js';

describe('validateNewClientFields', () => {
	it('requires first name, last name and phone', () => {
		const errors = validateNewClientFields(createEmptyTransactionForm());

		expect(errors.firstName).toBeTruthy();
		expect(errors.lastName).toBeTruthy();
		expect(errors.phone).toBeTruthy();
		expect(hasErrors(errors)).toBe(true);
	});
});

describe('validateExistingClientPhone', () => {
	it('requires a valid phone number', () => {
		const errors = validateExistingClientPhone('invalid');
		expect(errors.phone).toBeTruthy();
	});
});

describe('validateTransactionFields', () => {
	it('requires a positive amount', () => {
		const form = createEmptyTransactionForm();
		form.amount = '0';

		const errors = validateTransactionFields(form);
		expect(errors.amount).toBeTruthy();
	});

	it('accepts a valid transaction form', () => {
		const form = createEmptyTransactionForm();
		form.amount = '150';
		form.rate = '2780';
		form.identityDocumentType = "Carte d'identite";
		form.identityDocumentNumber = 'ID-12345';

		const errors = validateTransactionFields(form);
		expect(hasErrors(errors)).toBe(false);
	});

	it('accepts numeric values from number inputs', () => {
		const form = createEmptyTransactionForm();
		form.amount = 150;
		form.rate = 2780;

		const errors = validateTransactionFields(form);
		expect(hasErrors(errors)).toBe(false);
	});
});
