import type { ClientCreatePayload } from './client.js';

export type TransactionType = 'Achat' | 'Vente';
export type TransactionCurrency = 'USD' | 'EUR' | 'GBP';
export type PaymentMethod = 'Cash' | 'Banque' | 'Mobile money';

export type TransactionPayload = {
	amount: number;
	currency: TransactionCurrency;
	type: TransactionType;
	rate?: number;
	payment_method?: PaymentMethod;
	reference?: string;
	note?: string;
};

export type CreateTransactionWithNewClientRequest = {
	client: ClientCreatePayload;
	transaction: TransactionPayload;
};

export type CreateTransactionWithExistingClientRequest = {
	client_id: string;
	transaction: TransactionPayload;
};

export type CreatedTransaction = {
	id: string;
	client: string;
	type: string;
	amount: string;
	rate: string;
	status: string;
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
	kycStatus: ClientCreatePayload['kyc_status'];
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
