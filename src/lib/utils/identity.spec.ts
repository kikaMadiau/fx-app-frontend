import { describe, expect, it } from 'vitest';
import { fromApiIdType, toApiIdType } from './identity.js';

describe('toApiIdType', () => {
	it('maps each form label to the API code', () => {
		expect(toApiIdType("Carte d'identite")).toBe('NATIONAL_ID');
		expect(toApiIdType('Passeport')).toBe('PASSPORT');
		expect(toApiIdType('Permis de conduire')).toBe('DRIVER_LICENSE');
		expect(toApiIdType("Carte d'electeur")).toBe('VOTER_CARD');
	});

	it('returns undefined for an empty selection', () => {
		expect(toApiIdType('  ')).toBeUndefined();
	});

	it('keeps a value that is already an API code', () => {
		expect(toApiIdType('PASSPORT')).toBe('PASSPORT');
	});
});

describe('fromApiIdType', () => {
	it('maps an API code back to the form label', () => {
		expect(fromApiIdType('VOTER_CARD')).toBe("Carte d'electeur");
	});

	it('keeps an unknown code unchanged', () => {
		expect(fromApiIdType('OTHER')).toBe('OTHER');
	});
});
