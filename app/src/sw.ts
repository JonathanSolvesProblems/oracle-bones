/// <reference lib="webworker" />
// Quickened's service worker (quickened-app design: Offline; criteria 1.3, 1.12, 1.13). It
// precaches every file of the build on install, serves cache first, and on activate deletes the
// caches of other versions. There is no runtime caching: the site makes no request to another origin.
// build/serviceWorker.ts writes this file into the build as sw.js, with PRECACHE and VERSION
// set above it.

declare const PRECACHE: string[];
declare const VERSION: string;

const worker = self as unknown as ServiceWorkerGlobalScope;
/**
 * "quickened-3-" marks a build whose pages reload themselves when a newer build takes over and
 * nothing was typed (criterion 1.13, amended 2026-11-27), and whose cache was filled from the
 * server. Builds before it named the cache "quickened-" and the hash alone, and their pages only
 * show a line; the one "quickened-2-" build could keep the previous build's page in its cache.
 */
const PAGES_RELOAD = 'quickened-3-';
const CACHE = `${PAGES_RELOAD}${VERSION}`;

worker.addEventListener('install', (event) => {
  // From the server, past the browser's own cache: GitHub Pages lets a browser keep a file for ten
  // minutes, and a page kept from the previous build would point at scripts this build removed.
  const fresh = PRECACHE.map((url) => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(fresh)).then(() => worker.skipWaiting()));
});

worker.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const old = (await caches.keys()).filter((k) => k.startsWith('quickened-') && k !== CACHE);
    // Taking over from a build whose pages cannot reload themselves: reload them here, so a
    // returning visitor gets this build, not the cached one. The worker takes over just after a
    // page opens, when nothing has been typed yet.
    const reloadPages = old.some((k) => !k.startsWith(PAGES_RELOAD));
    await Promise.all(old.map((k) => caches.delete(k)));
    await worker.clients.claim();
    if (!reloadPages) return;
    const pages = await worker.clients.matchAll({ type: 'window' });
    // Not awaited: each reload is fetched through this worker, which serves fetches only once this
    // activation has finished, so waiting for them here would never end.
    for (const p of pages) if (typeof p.navigate === 'function') void p.navigate(p.url).catch(() => null);
  })());
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
