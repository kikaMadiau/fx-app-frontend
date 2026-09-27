import { describe, expect, it } from 'vitest';
import { formatPhoneDisplay, normalizePhone, validatePhone } from './phone.js';

describe('normalizePhone', () => {
	it('normalizes a spaced DRC number', () => {
		expect(normalizePhone('+243 900 000 000')).toBe('+243900000000');
	});

	it('normalizes a local number starting with 0', () => {
		expect(normalizePhone('0900000000')).toBe('+243900000000');
	});

	it('normalizes a 9-digit local number', () => {
		expect(normalizePhone('900000000')).toBe('+243900000000');
	});
});

describe('validatePhone', () => {
	it('accepts a valid DRC phone number', () => {
		expect(validatePhone('+243 900 000 000')).toBeNull();
	});

	it('rejects an invalid phone number', () => {
		expect(validatePhone('12345')).toBeTruthy();
	});

	it('rejects an empty phone number', () => {
		expect(validatePhone('')).toBeTruthy();
	});
});

describe('formatPhoneDisplay', () => {
	it('formats a valid phone number for display', () => {
		expect(formatPhoneDisplay('+243900000000')).toBe('+243 900 000 000');
	});
});
