import { describe, expect, it } from 'vitest';
import { localToday, presetRange, toCsv } from './reports.js';

describe('report periods', () => {
	it('computes presets from the local day', () => {
		expect(presetRange('today', '2026-11-03')).toEqual({ from: '2026-11-03', to: '2026-11-03' });
		expect(presetRange('yesterday', '2026-11-01')).toEqual({
			from: '2026-10-31',
			to: '2026-10-31'
		});
		expect(presetRange('week', '2026-11-03')).toEqual({ from: '2026-10-28', to: '2026-11-03' });
		expect(presetRange('month', '2026-11-03')).toEqual({ from: '2026-11-01', to: '2026-11-03' });
		expect(presetRange('last_month', '2026-03-15')).toEqual({
			from: '2026-02-01',
			to: '2026-02-28'
		});
	});

	it('uses the Kinshasa day, not UTC', () => {
		// 23:30 UTC le 2 novembre = 00:30 le 3 novembre à Kinshasa.
		expect(localToday('Africa/Kinshasa', new Date('2026-11-02T23:30:00Z'))).toBe('2026-11-03');
	});
});

describe('toCsv', () => {
	it('writes French Excel CSV (BOM, semicolons, decimal comma, safe cells)', () => {
		const csv = toCsv([
			{
				header: ['Client', 'Montant'],
				rows: [
					['Jean; "JD"', 1234.5],
					['=SOMME(A1)', 2]
				]
			}
		]);
		expect(csv.startsWith('﻿')).toBe(true);
		expect(csv).toContain('Client;Montant\r\n');
		expect(csv).toContain('"Jean; ""JD""";1234,5\r\n');
		expect(csv).toContain("'=SOMME(A1);2\r\n");
	});
});
