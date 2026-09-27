export type ClientKycStatus = 'Verifie' | 'A completer' | 'En revue';

export type ClientCreatePayload = {
	first_name: string;
	last_name: string;
	phone: string;
	kyc_status?: ClientKycStatus;
	identity_document_type?: string;
	identity_document_number?: string;
};

export type Client = {
	id: string;
	first_name: string;
	last_name: string;
	phone: string;
	kyc_status?: ClientKycStatus;
	identity_document_type?: string;
	identity_document_number?: string;
};

export function getClientFullName(client: Pick<Client, 'first_name' | 'last_name'>): string {
	return [client.first_name, client.last_name].filter(Boolean).join(' ').trim();
}
