export type Client = {
	id: number;
	full_name: string;
	id_number: string;
	id_type: string;
	phone: string;
	address?: string;
};

export type ClientCreatePayload = {
	full_name: string;
	id_number?: string;
	id_type?: string;
	phone: string;
	address?: string;
};

export function getClientFullName(client: Pick<Client, 'full_name'>): string {
	return client.full_name?.trim() ?? '';
}
