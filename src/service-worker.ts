/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

// Service worker de la PWA : l'interface reste disponible hors ligne une fois visitée.
// Les appels à l'API (autre origine, ou /api relayé par Vite) ne sont jamais mis en cache :
// les données de change et les jetons restent toujours frais.
import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `fx-cache-${version}`;
const OFFLINE_URL = '/offline.html';
// Fichiers de l'application (JS/CSS générés) et du dossier static (icônes, manifeste…).
const ASSETS = [...build, ...files];
const ASSET_SET = new Set(ASSETS);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
			)
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== sw.location.origin) return;
	// API relayée sous /api (serveur de développement) : jamais en cache non plus.
	if (url.pathname.startsWith('/api/')) return;

	// Fichiers versionnés : le cache suffit.
	if (ASSET_SET.has(url.pathname)) {
		event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
		return;
	}

	// Pages : réseau d'abord (contenu à jour), copie en cache pour le mode hors ligne.
	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const copy = response.clone();
						caches.open(CACHE).then((cache) => cache.put(request, copy));
					}
					return response;
				})
				.catch(async () => {
					const cached = await caches.match(request);
					return cached ?? (await caches.match(OFFLINE_URL)) ?? Response.error();
				})
		);
	}
});
