import { describe, expect, it } from 'vitest';
import { translateProfileError } from './profile.js';
import { ID_TYPE_OPTIONS, fromApiIdType, toApiIdType } from '$lib/utils/identity.js';

describe('translateProfileError', () => {
	it('translates API messages into French', () => {
		expect(
			translateProfileError(new Error('birth_date must correspond to an age between 18 and 120'))
		).toBe('Le cambiste doit avoir au moins 18 ans.');
		expect(translateProfileError(new Error('invalid two-factor code'))).toMatch(/Code incorrect/);
		expect(translateProfileError(new Error('photo must be a JPEG, PNG or WebP image'))).toMatch(
			/JPEG, PNG ou WebP/
		);
	});

	it('keeps an unknown message unchanged', () => {
		expect(translateProfileError(new Error('Erreur réseau'))).toBe('Erreur réseau');
	});
});

describe('ID_TYPE_OPTIONS', () => {
	it('uses the codes accepted by the API', () => {
		expect(ID_TYPE_OPTIONS.map((option) => option.value).sort()).toEqual(
			['DRIVER_LICENSE', 'NATIONAL_ID', 'PASSPORT', 'VOTER_CARD'].sort()
		);
	});

	it('stays consistent with the transaction form mapping', () => {
		for (const option of ID_TYPE_OPTIONS) {
			expect(toApiIdType(fromApiIdType(option.value))).toBe(option.value);
		}
	});
});
