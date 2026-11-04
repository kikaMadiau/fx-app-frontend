import { apiRequest } from './http.js';

// Message envoyé au client après une opération (GET /transactions/{id}/notifications).
export type CustomerNotification = {
	id: number;
	customer_id: number;
	transaction_id?: number;
	channel: 'SMS' | 'EMAIL';
	template: string;
	recipient: string;
	subject?: string;
	body: string;
	status: 'SENT' | 'SKIPPED' | 'FAILED';
	detail?: string;
	mode: string;
	created_at: string;
};

export type NotificationList = {
	items: CustomerNotification[];
	/** "test" : rien ne part vraiment, les messages sont écrits dans le dossier outbox de l'API. */
	mode: string;
};

export function getTransactionNotifications(transactionId: string | number): Promise<NotificationList> {
	return apiRequest<NotificationList>(`/transactions/${transactionId}/notifications`);
}

export const NOTIFICATION_TEMPLATES: Record<string, string> = {
	'confirmation-change': 'Confirmation de change',
	'dossier-incomplet': 'Dossier incomplet',
	'limite-journaliere': 'Plafond journalier atteint'
};

export function notificationTemplateLabel(template: string): string {
	return NOTIFICATION_TEMPLATES[template] ?? template;
}

/** Libellé du statut d'envoi, selon le mode (en test, rien n'est réellement envoyé). */
export function notificationStatusLabel(n: Pick<CustomerNotification, 'status' | 'mode' | 'detail'>): string {
	switch (n.status) {
		case 'SENT':
			return n.mode === 'test' ? 'Prêt (mode test, non envoyé)' : 'Envoyé';
		case 'SKIPPED':
			return `Non envoyé : ${n.detail || 'destinataire absent'}`;
		default:
			return "Échec de l'envoi";
	}
}

/** Groupe les messages par modèle, dans l'ordre d'envoi : SMS puis e-mail. */
export function groupNotifications(items: CustomerNotification[]) {
	const groups: { template: string; sms?: CustomerNotification; email?: CustomerNotification }[] = [];
	for (const item of items) {
		let group = groups.find((g) => g.template === item.template);
		if (!group) {
			group = { template: item.template };
			groups.push(group);
		}
		if (item.channel === 'SMS') group.sms = item;
		else group.email = item;
	}
	return groups;
}
