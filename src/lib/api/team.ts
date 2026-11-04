import { apiRequest } from '$lib/api/http.js';
import { ApiError } from '$lib/utils/api-errors.js';

// Superviseur : l'équipe de son bureau et les inscriptions en attente d'accord.

export type TeamMember = {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	phone: string;
	/** PENDING tant qu'une inscription n'a pas été acceptée. */
	status: string;
	roles: string;
	is_active: boolean;
	created_at: string;
};

const MESSAGES: Record<string, string> = {
	'store not found': "Ce bureau n'est pas le vôtre.",
	'pending registration not found': "Cette demande n'existe plus (déjà traitée ?).",
	'cannot remove the last store supervisor': 'Le bureau doit garder au moins un superviseur.',
	'cannot remove the last supervisor': 'Le bureau doit garder au moins un superviseur.'
};

async function translated<T>(request: Promise<T>): Promise<T> {
	try {
		return await request;
	} catch (error) {
		if (error instanceof ApiError && MESSAGES[error.message]) {
			throw new ApiError(MESSAGES[error.message], error.status);
		}
		throw error;
	}
}

export function isPending(member: TeamMember): boolean {
	return member.status?.toUpperCase() === 'PENDING' && !member.is_active;
}

export async function listTeam(storeId: number): Promise<TeamMember[]> {
	const response = await translated(
		apiRequest<{ items: TeamMember[] }>(`/stores/${storeId}/members`)
	);
	return response.items ?? [];
}

/** Accepte une inscription : le compte devient cambiste actif du bureau. */
export function approveMember(storeId: number, member: TeamMember): Promise<unknown> {
	const roles = member.roles ? member.roles.split(',') : ['TRADER'];
	return translated(
		apiRequest(`/stores/${storeId}/members/${member.id}`, {
			method: 'PATCH',
			body: { roles, is_active: true }
		})
	);
}

/** Refuse une inscription en attente : le compte est supprimé. */
export function rejectMember(storeId: number, memberId: number): Promise<unknown> {
	return translated(apiRequest(`/stores/${storeId}/members/${memberId}`, { method: 'DELETE' }));
}
