import { apiRequest } from '$lib/api/http.js';
import { get } from 'svelte/store';
import { session } from '$lib/stores/session.js';
import { ApiError } from '$lib/utils/api-errors.js';
import { toApiIdType } from '$lib/utils/identity.js';
import { formatDate } from '$lib/utils/dates.js';
import { formatMoney, transactionStatus, transactionTypeLabel } from '$lib/utils/labels.js';
import { fromApiIdType } from '$lib/utils/identity.js';
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
		trader_id: getCurrentTraderId()
	};
}

function formatDisplayAmount(amount: number | string, currency: string): string {
	const numericAmount = typeof amount === 'number' ? amount : Number(amount);
	return Number.isFinite(numericAmount)
		? formatMoney(numericAmount, currency)
		: `${amount} ${currency}`;
}

function formatDisplayDate(date?: string): string {
	const value = date ? new Date(date) : new Date();

	if (Number.isNaN(value.getTime())) {
		return date || '-';
	}

	return formatDate(value, { withTime: true });
}

function formatCdfAmount(amount: number): string {
	return formatMoney(amount, 'CDF');
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
	const transactionType = `${transactionTypeLabel(response.type || form.type)} ${currency}`;
	const rate = response.rate !== undefined ? String(response.rate) : String(form.rate || '-');
	const currencyCounterValue = getCounterValue(response.amount, response.rate);

	const apiType = String(response.type || form.type).toUpperCase();
	return {
		id: String(response.id),
		customerId: response.customer_id,
		receipt: {
			type: apiType === 'SELL' || apiType === 'VENTE' ? 'SELL' : 'BUY',
			currency,
			amount: Number(response.amount),
			rate: Number(response.rate),
			counterValue: response.converted_amount ?? Number(response.amount) * Number(response.rate),
			status: response.status || 'PENDING',
			createdAt: response.created_at || new Date().toISOString(),
			traderId: response.trader_id
		},
		client: fallbackClientName,
		type: transactionType,
		amount,
		rate,
		status: transactionStatus(response.status || 'PENDING').label,
		riskLevel: response.risk_level,
		date: formatDisplayDate(response.created_at),
		// Vente : l'agence remet la devise au client ; Achat : elle lui remet des francs congolais.
		amountGivenToClient: ['SELL', 'Vente'].includes(response.type || form.type)
			? amount
			: currencyCounterValue,
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
		id_type: toApiIdType(form.identityDocumentType),
		id_number: form.identityDocumentNumber.trim() || undefined,
		id_expiry_date: form.identityDocumentExpiry.trim() || undefined,
		address: form.address.trim() || undefined,
		email: form.email.trim().toLowerCase() || undefined
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

// --- Liste des transactions (GET /transactions) ------------------------------------

export type TransactionListItem = TransactionApiResponse & {
	created_at: string;
	customer_name?: string;
	customer_phone?: string;
	customer_id_type?: string;
	customer_id_number?: string;
};

export type TransactionListFilter = {
	q?: string;
	status?: string;
	type?: string;
	customerId?: number;
	limit?: number;
	offset?: number;
};

export async function listTransactions(
	filter: TransactionListFilter = {}
): Promise<{ items: CreatedTransaction[]; total: number; limit: number; offset: number }> {
	const search = new URLSearchParams();
	if (filter.q?.trim()) search.set('q', filter.q.trim());
	if (filter.status) search.set('status', filter.status);
	if (filter.type) search.set('type', filter.type);
	if (filter.customerId) search.set('customer_id', String(filter.customerId));
	search.set('limit', String(filter.limit ?? 20));
	if (filter.offset) search.set('offset', String(filter.offset));

	const page = await apiRequest<{
		items: TransactionListItem[] | null;
		total: number;
		limit: number;
		offset: number;
	}>(`/transactions?${search}`);
	return { ...page, items: (page.items ?? []).map(mapListItemToTransaction) };
}

/** Met une transaction de la liste au format du bordereau affiché par la page Transactions. */
export function mapListItemToTransaction(item: TransactionListItem): CreatedTransaction {
	const counterValue = item.converted_amount
		? formatCdfAmount(item.converted_amount)
		: getCounterValue(item.amount, item.rate);
	return {
		id: String(item.id),
		customerId: item.customer_id,
		receipt: {
			type: item.type === 'SELL' ? 'SELL' : 'BUY',
			currency: item.currency,
			amount: item.amount,
			rate: item.rate,
			counterValue: item.converted_amount ?? item.amount * item.rate,
			status: item.status,
			createdAt: item.created_at,
			traderId: item.trader_id
		},
		client: item.customer_name || '-',
		type: `${transactionTypeLabel(item.type)} ${item.currency}`,
		amount: formatDisplayAmount(item.amount, item.currency),
		rate: new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 })
			.format(item.rate)
			.replace(/ | /g, ' '),
		status: transactionStatus(item.status).label,
		riskLevel: item.risk_level,
		date: formatDisplayDate(item.created_at),
		amountGivenToClient:
			item.type === 'SELL' ? formatDisplayAmount(item.amount, item.currency) : counterValue,
		currencyCounterValue: counterValue,
		clientPhone: item.customer_phone,
		identityDocumentType: item.customer_id_type ? fromApiIdType(item.customer_id_type) : undefined,
		identityDocumentNumber: item.customer_id_number
	};
}
