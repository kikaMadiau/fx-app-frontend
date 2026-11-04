import { apiFetchBlob, apiRequest } from '$lib/api/http.js';

// Photos de la pièce d'identité d'un client (recto / verso), routes /customers/{id}/id-document.
export type IdDocumentSide = 'front' | 'back';

export type IdDocumentFace = { uploaded_at: string; uploaded_by: number; size_bytes: number };
export type IdDocumentStatus = { front: IdDocumentFace | null; back: IdDocumentFace | null };

export const SIDE_LABELS: Record<IdDocumentSide, string> = { front: 'Recto', back: 'Verso' };

export function getIdDocumentStatus(customerId: number): Promise<IdDocumentStatus> {
	return apiRequest<IdDocumentStatus>(`/customers/${customerId}/id-document`);
}

export function getIdDocumentImage(customerId: number, side: IdDocumentSide): Promise<Blob | null> {
	return apiFetchBlob(`/customers/${customerId}/id-document/${side}`);
}

export function uploadIdDocument(
	customerId: number,
	side: IdDocumentSide,
	photo: Blob
): Promise<IdDocumentStatus> {
	const data = new FormData();
	data.append('photo', photo, `piece-${side}.jpg`);
	return apiRequest<IdDocumentStatus>(`/customers/${customerId}/id-document/${side}`, {
		method: 'PUT',
		rawBody: data
	});
}

/**
 * Prépare la photo d'une pièce : réduite à 1600 px sur le grand côté, en JPEG, pour rester
 * lisible (numéro, photo du titulaire) tout en pesant quelques centaines de Ko.
 */
export async function prepareIdDocumentPhoto(source: Blob, maxSide = 1600): Promise<Blob> {
	if (source.type && !source.type.startsWith('image/')) {
		throw new Error('Choisissez une image (JPEG, PNG ou WebP).');
	}
	const bitmap = await createImageBitmap(source).catch(() => {
		throw new Error("Cette image n'a pas pu être lue. Reprenez la photo.");
	});
	const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	const context = canvas.getContext('2d');
	if (!context) throw new Error("Votre navigateur ne permet pas de préparer l'image.");
	context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("L'image n'a pas pu être préparée."))),
			'image/jpeg',
			0.85
		)
	);
}

/** Messages de l'API traduits pour le guichet. */
export function translateIdDocumentError(error: unknown): string {
	const message = error instanceof Error ? error.message : String(error);
	if (/4 MB/i.test(message)) return 'La photo est trop lourde (4 Mo maximum).';
	if (/JPEG, PNG or WebP/i.test(message))
		return 'Format non accepté : utilisez une photo JPEG, PNG ou WebP.';
	if (/customer not found/i.test(message)) return 'Client introuvable.';
	return message;
}
