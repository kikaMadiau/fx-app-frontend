import { describe, expect, it } from 'vitest';
import { groupNotifications, notificationStatusLabel, notificationTemplateLabel } from './notifications.js';
import { createEmptyTransactionForm } from '$lib/types/transaction.js';
import { validateEmail, validateNewClientFields } from '$lib/utils/validation.js';

describe('notifications client', () => {
	it('labels test-mode messages as not really sent', () => {
		expect(notificationStatusLabel({ status: 'SENT', mode: 'test' })).toBe(
			'Prêt (mode test, non envoyé)'
		);
		expect(notificationStatusLabel({ status: 'SKIPPED', mode: 'test', detail: "pas d'adresse e-mail" })).toBe(
			"Non envoyé : pas d'adresse e-mail"
		);
		expect(notificationTemplateLabel('limite-journaliere')).toBe('Plafond journalier atteint');
	});

	it('groups SMS and e-mail of the same message', () => {
		const base = { customer_id: 1, recipient: 'x', body: 'b', status: 'SENT' as const, mode: 'test', created_at: '' };
		const groups = groupNotifications([
			{ ...base, id: 1, channel: 'SMS', template: 'confirmation-change' },
			{ ...base, id: 2, channel: 'EMAIL', template: 'confirmation-change' },
			{ ...base, id: 3, channel: 'SMS', template: 'dossier-incomplet' }
		]);
		expect(groups.map((g) => [g.template, g.sms?.id, g.email?.id])).toEqual([
			['confirmation-change', 1, 2],
			['dossier-incomplet', 3, undefined]
		]);
	});

	it('accepts an empty e-mail but rejects a malformed one', () => {
		expect(validateEmail('')).toBe('');
		expect(validateEmail('client@exemple.cd')).toBe('');
		const form = createEmptyTransactionForm();
		form.email = 'pas-un-email';
		expect(validateNewClientFields(form).email).toBeTruthy();
	});
});
