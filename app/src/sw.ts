/// <reference lib="webworker" />
// Quickened's service worker (quickened-app design: Offline; criteria 1.3, 1.12). It precaches
// every file of the build on install, serves cache first, and on activate deletes the caches of
// other versions. There is no runtime caching: the site makes no request to another origin.
// build/serviceWorker.ts writes this file into the build as sw.js, with PRECACHE and VERSION
// set above it.

declare const PRECACHE: string[];
declare const VERSION: string;

const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `quickened-${VERSION}`;

worker.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => worker.skipWaiting()));
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('quickened-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => worker.clients.claim()));
});

worker.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== worker.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async (c) => {
    // ignoreVary: a module script's request carries an Origin header the precache request did
    // not, and a server's `Vary: Origin` would otherwise make the cached copy miss offline.
    const hit = await c.match(request, { ignoreSearch: request.mode === 'navigate', ignoreVary: true });
    if (hit) return hit;
    // A page load of the site's folder is the one page, index.html.
    if (request.mode === 'navigate') {
      const page = await c.match('index.html');
      if (page) return page;
    }
    return fetch(request);
  }));
});
