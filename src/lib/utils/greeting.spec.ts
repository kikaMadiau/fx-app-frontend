import { describe, expect, it } from 'vitest';
import { greeting } from './greeting.js';

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m);
const visit = (hoursAgo: number, from = at(15)) => ({
	firstName: 'Michael',
	at: new Date(from.getTime() - hoursAgo * 3600_000).toISOString()
});

describe('greeting', () => {
	it('welcomes a first visit according to the time of day', () => {
		expect(greeting(at(8), null)).toEqual({
			title: 'Bienvenue sur MOTUYA Fx.',
			subtitle: 'Bonjour ! Connectez-vous à votre espace professionnel.'
		});
		expect(greeting(at(14), null).subtitle).toMatch(/^Bon après-midi/);
		expect(greeting(at(20), null).subtitle).toMatch(/^Bonsoir/);
	});

	it('greets a returning user by name', () => {
		expect(greeting(at(9), visit(20, at(9))).title).toBe('Bonjour, Michael');
		expect(greeting(at(15), visit(5)).title).toBe('Bon après-midi, Michael');
		expect(greeting(at(19), visit(5, at(19))).title).toBe('Bonsoir, Michael');
	});

	it('notices a quick return and a long absence', () => {
		expect(greeting(at(15), visit(1)).title).toBe('Encore là, Michael ?');
		expect(greeting(at(15), visit(24 * 10)).title).toBe('Bon retour, Michael');
	});

	it('has a word for night owls', () => {
		expect(greeting(at(2), null).title).toBe('Couche-tard ?');
		expect(greeting(at(2), visit(1, at(2))).title).toBe('Toujours là, Michael ?');
		expect(greeting(at(23), visit(5, at(23))).subtitle).toMatch(/tard/);
	});
});
