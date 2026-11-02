import type { ClientCreatePayload } from './client.js';

export type TransactionType = 'Achat' | 'Vente';
export type TransactionCurrency = 'USD' | 'EUR' | 'GBP';
export type PaymentMethod = 'Cash' | 'Banque' | 'Mobile money';

/** Devise de contrepartie de l'agence : toutes les transactions sont converties en CDF. */
export const TARGET_CURRENCY = 'CDF';

// Ce que le backend attend réellement dans `transaction` (voir CreateTransactionRequest côté Go).
export type TransactionPayload = {
	amount: number;
	currency: TransactionCurrency;
	target_currency: string;
	type: TransactionType;
	rate: number;
	trader_id: number;
	customer_id?: number;
};

export type CreateTransactionWithNewClientRequest = {
	client: ClientCreatePayload;
	transaction: TransactionPayload;
};

export type CreateTransactionWithExistingClientRequest = {
	transaction: TransactionPayload;
};

// Réponse brute renvoyée par le backend (entity.Transaction), sans objet client imbriqué.
export type TransactionApiResponse = {
	id: number;
	amount: number;
	currency: string;
	target_currency?: string;
	type: string;
	rate: number;
	converted_amount?: number;
	risk_level?: string;
	risk_score?: number;
	status: string;
	created_at?: string;
	trader_id: number;
	customer_id: number;
};

export type CreatedTransaction = {
	id: string;
	client: string;
	type: string;
	amount: string;
	rate: string;
	status: string;
	riskLevel?: string;
	date?: string;
	amountGivenToClient?: string;
	currencyCounterValue?: string;
	clientPhone?: string;
	identityDocumentType?: string;
	identityDocumentNumber?: string;
};

export type TransactionFormData = {
	firstName: string;
	lastName: string;
	phone: string;
	kycStatus: 'Verifie' | 'A completer' | 'En revue';
	identityDocumentType: string;
	identityDocumentNumber: string;
	type: TransactionType;
	currency: TransactionCurrency;
	amount: string | number;
	rate: string | number;
	paymentMethod: PaymentMethod;
	reference: string;
	note: string;
};

export function createEmptyTransactionForm(): TransactionFormData {
	return {
		firstName: '',
		lastName: '',
		phone: '',
		kycStatus: 'Verifie',
		identityDocumentType: '',
		identityDocumentNumber: '',
		type: 'Achat',
		currency: 'USD',
		amount: '',
		rate: '',
		paymentMethod: 'Cash',
		reference: '',
		note: ''
	};
}
