import { apiRequest } from '$lib/api/http.js';
import { get } from 'svelte/store';
import { session } from '$lib/stores/session.js';
import { ApiError } from '$lib/utils/api-errors.js';
import type { ClientCreatePayload } from '$lib/types/client.js';
import {
	TARGET_CURRENCY,
	type CreateTransactionWithExistingClientRequest,
	type CreateTransactionWithNewClientRequest,
	type CreatedTransaction,
	type TransactionApiResponse,
	type TransactionFormData,
	type TransactionPayload
} from '$lib/types/transaction.js';
import { normalizePhone } from '$lib/utils/phone.js';

export type TransactionListItem = TransactionApiResponse & {
	customer_name: string;
	customer_phone?: string;
	customer_id_type: string;
	customer_id_number: string;
};

export async function listTransactions(limit = 100): Promise<TransactionListItem[]> {
	const page = await apiRequest<{ items: TransactionListItem[] }>('/transactions?limit=' + limit);
	return page.items ?? [];
}

function getCurrentTraderId(): number {
	const current = get(session);
	if (!current?.trader?.id) {
		throw new ApiError('Votre session a expire. Veuillez vous reconnecter.', 401);
	}

	return current.trader.id;
}

function getFieldValue(value: string | number): string {
	return String(value).trim();
}

// Note : le backend ne supporte pas encore payment_method / reference / note / kyc_status.
// Ces champs restent dans le formulaire (UI) mais ne sont pas envoyes a l'API pour le moment.
function buildTransactionPayload(form: TransactionFormData): TransactionPayload {
	return {
		amount: Number(form.amount),
		currency: form.currency,
		target_currency: TARGET_CURRENCY,
		type: form.type,
		rate: Number(getFieldValue(form.rate)) || 0,
		trader_id: getCurrentTraderId()
	};
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

function getCounterValue(amount: number | undefined, rate: number | undefined): string {
	if (!Number.isFinite(amount) || !Number.isFinite(rate) || !rate || rate <= 0) {
		return '-';
	}

	return formatCdfAmount((amount as number) * (rate as number));
}

function mapApiResponseToTransaction(
	response: TransactionApiResponse,
	form: TransactionFormData,
	fallbackClientName: string,
	fallbackPhone: string
): CreatedTransaction {
	const currency = response.currency || form.currency;
	const amount = formatDisplayAmount(response.amount, currency);
	const transactionType = response.type || form.type;
	const rate = response.rate !== undefined ? String(response.rate) : String(form.rate || '-');
	const currencyCounterValue = getCounterValue(response.amount, response.rate);

	return {
		id: String(response.id),
		client: fallbackClientName,
		type: transactionType,
		amount,
		rate,
		status: response.status || 'Terminee',
		riskLevel: response.risk_level,
		date: formatDisplayDate(response.created_at),
		amountGivenToClient: currencyCounterValue,
		currencyCounterValue,
		clientPhone: fallbackPhone,
		identityDocumentType: form.identityDocumentType || '-',
		identityDocumentNumber: form.identityDocumentNumber || '-'
	};
}

export async function createTransactionWithNewClient(
	form: TransactionFormData
): Promise<CreatedTransaction> {
	const client: ClientCreatePayload = {
		full_name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
		phone: normalizePhone(form.phone),
		id_type: form.identityDocumentType.trim() || undefined,
		id_number: form.identityDocumentNumber.trim() || undefined
	};

	const request: CreateTransactionWithNewClientRequest = {
		client,
		transaction: buildTransactionPayload(form)
	};

	const response = await apiRequest<TransactionApiResponse>('/transactions', {
		method: 'POST',
		body: request
	});

	return mapApiResponseToTransaction(response, form, client.full_name, client.phone);
}

export async function createTransactionWithExistingClient(
	clientId: number,
	form: TransactionFormData,
	clientFullName: string,
	clientPhone: string
): Promise<CreatedTransaction> {
	const request: CreateTransactionWithExistingClientRequest = {
		transaction: {
			...buildTransactionPayload(form),
			customer_id: clientId
		}
	};

	const response = await apiRequest<TransactionApiResponse>('/transactions', {
		method: 'POST',
		body: request
	});

	return mapApiResponseToTransaction(response, form, clientFullName, clientPhone);
}
