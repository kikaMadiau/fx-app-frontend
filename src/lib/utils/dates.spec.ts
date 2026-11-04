import { describe, expect, it } from 'vitest';
import { formatDate } from './dates.js';

// 2 novembre 2026 à 23:30 UTC : déjà le 3 novembre à Kinshasa (UTC+1) et à Lubumbashi (UTC+2).
const instant = '2026-11-02T23:30:00Z';

describe('formatDate', () => {
	it('applies the Kinshasa time zone (UTC+1)', () => {
		expect(
			formatDate(instant, { withTime: true, timezone: 'Africa/Kinshasa', dateFormat: 'DD/MM/YYYY' })
		).toBe('03/11/2026 à 00:30');
	});

	it('applies the Lubumbashi time zone (UTC+2)', () => {
		expect(
			formatDate(instant, {
				withTime: true,
				timezone: 'Africa/Lubumbashi',
				dateFormat: 'DD/MM/YYYY'
			})
		).toBe('03/11/2026 à 01:30');
	});

	it('supports the ISO and long formats', () => {
		expect(formatDate(instant, { timezone: 'Africa/Kinshasa', dateFormat: 'YYYY-MM-DD' })).toBe(
			'2026-11-03'
		);
		expect(formatDate(instant, { timezone: 'Africa/Kinshasa', dateFormat: 'LONG' })).toBe(
			'3 novembre 2026'
		);
	});

	it('returns an empty string for a missing or invalid date', () => {
		expect(formatDate(null)).toBe('');
		expect(formatDate('pas une date')).toBe('');
	});
});
