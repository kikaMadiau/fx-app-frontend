import { apiRequest } from '$lib/api/http.js';
import type { ClientCreatePayload } from '$lib/types/client.js';
import type {
	CreateTransactionWithExistingClientRequest,
	CreateTransactionWithNewClientRequest,
	CreatedTransaction,
	TransactionFormData,
	TransactionPayload
} from '$lib/types/transaction.js';
import { normalizePhone } from '$lib/utils/phone.js';

type TransactionApiResponse = {
	id: string;
	client?: {
		first_name?: string;
		last_name?: string;
		phone?: string;
		identity_document_type?: string;
		identity_document_number?: string;
	};
	client_name?: string;
	type?: string;
	currency?: string;
	amount?: number | string;
	rate?: number | string;
	status?: string;
	created_at?: string;
	date?: string;
};

function getFieldValue(value: string | number): string {
	return String(value).trim();
}

function buildTransactionPayload(form: TransactionFormData): TransactionPayload {
	const rateValue = getFieldValue(form.rate);
	const payload: TransactionPayload = {
		amount: Number(form.amount),
		currency: form.currency,
		type: form.type
	};

	if (rateValue) {
		payload.rate = Number(rateValue);
	}

	if (form.paymentMethod) {
		payload.payment_method = form.paymentMethod;
	}

	if (form.reference.trim()) {
		payload.reference = form.reference.trim();
	}

	if (form.note.trim()) {
		payload.note = form.note.trim();
	}

	return payload;
}

function formatDisplayAmount(amount: number | string, currency: string): string {
	const numericAmount = typeof amount === 'number' ? amount : Number(amount);
	const formattedAmount = Number.isFinite(numericAmount)
		? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(numericAmount)
		: String(amount);

	if (currency === 'USD') {
		return `$${formattedAmount}`;
	}

	return `${currency} ${formattedAmount}`;
}

function formatDisplayDate(date?: string): string {
	const value = date ? new Date(date) : new Date();

	if (Number.isNaN(value.getTime())) {
		return date || '-';
	}

	return new Intl.DateTimeFormat('fr-FR', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(value);
}

function formatCdfAmount(amount: number): string {
	return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(amount)} CDF`;
}

function getCounterValue(
	amount: number | string | undefined,
	rate: number | string | undefined
): string {
	const numericAmount = Number(amount);
	const numericRate = Number(rate);

	if (!Number.isFinite(numericAmount) || !Number.isFinite(numericRate) || numericRate <= 0) {
		return '-';
	}

	return formatCdfAmount(numericAmount * numericRate);
}

function mapApiResponseToTransaction(
	response: TransactionApiResponse,
	form: TransactionFormData,
	fallbackClientName: string
): CreatedTransaction {
	const clientName =
		response.client_name ||
		[response.client?.first_name, response.client?.last_name].filter(Boolean).join(' ') ||
		fallbackClientName;

	const currency = response.currency || form.currency;
	const amount =
		response.amount !== undefined
			? formatDisplayAmount(response.amount, currency)
			: formatDisplayAmount(form.amount, form.currency);
	const transactionType = response.type || `${form.type} ${form.currency}`;
	const rate = response.rate !== undefined ? String(response.rate) : form.rate || '-';
	const currencyCounterValue = getCounterValue(
		response.amount ?? form.amount,
		response.rate ?? form.rate
	);

	return {
		id: response.id || form.reference || `TX-${Date.now()}`,
		client: clientName,
		type: transactionType,
		amount,
		rate,
		status: response.status || 'En cours',
		date: formatDisplayDate(response.created_at || response.date),
		amountGivenToClient: transactionType.startsWith('Achat') ? currencyCounterValue : amount,
		currencyCounterValue,
		clientPhone: response.client?.phone || form.phone,
		identityDocumentType:
			response.client?.identity_document_type || form.identityDocumentType || '-',
		identityDocumentNumber:
			response.client?.identity_document_number || form.identityDocumentNumber || '-'
	};
}

export async function createTransactionWithNewClient(
	form: TransactionFormData
): Promise<CreatedTransaction> {
	const request: CreateTransactionWithNewClientRequest = {
		client: {
			first_name: form.firstName.trim(),
			last_name: form.lastName.trim(),
			phone: normalizePhone(form.phone),
			kyc_status: form.kycStatus,
			identity_document_type: form.identityDocumentType.trim(),
			identity_document_number: form.identityDocumentNumber.trim()
		},
		transaction: buildTransactionPayload(form)
	};

	const response = await apiRequest<TransactionApiResponse>('/transactions', {
		method: 'POST',
		body: request
	});

	return mapApiResponseToTransaction(
		response,
		form,
		`${form.firstName.trim()} ${form.lastName.trim()}`.trim()
	);
}

export async function createTransactionWithExistingClient(
	clientId: string,
	form: TransactionFormData
): Promise<CreatedTransaction> {
	const request: CreateTransactionWithExistingClientRequest = {
		client_id: clientId,
		transaction: buildTransactionPayload(form)
	};

	const response = await apiRequest<TransactionApiResponse>('/transactions', {
		method: 'POST',
		body: request
	});

	return mapApiResponseToTransaction(response, form, 'Client existant');
}
