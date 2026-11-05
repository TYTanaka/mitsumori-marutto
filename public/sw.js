/* Service worker for みつもりまるっと.
 *
 * Strategies:
 * - Navigations (the HTML shell) are network-first and fall back to
 *   the cached shell, so after the first visit the app still opens
 *   on a reload with no connection.
 * - Everything else same-origin (the hashed JS/CSS bundles and other
 *   static files) is cache-first; successful responses are stored so
 *   the shell found in the cache can always find its assets.
 *
 * Paths are resolved against the registration scope, so the worker
 * behaves the same under the production base (/mitsumori-marutto/)
 * and any other mount point. Bump CACHE_VERSION when this file's
 * strategy changes; outdated caches are deleted on activate.
 */
const CACHE_VERSION = 'v1';
const CACHE_NAME = `mitsumori-marutto-${CACHE_VERSION}`;
const SHELL_URL = new URL('./', self.registration.scope).toString();

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const response = await fetch(SHELL_URL);
        if (response.ok) {
          const html = await response.clone().text();
          await cache.put(SHELL_URL, response);
          // The shell names its hashed JS/CSS bundles; pre-cache
          // them too, so even the first visit leaves everything an
          // offline reload needs. Same-origin paths only — external
          // references (web fonts) are left to the network.
          const assetUrls = [
            ...html.matchAll(/(?:src|href)="([^"]+)"/g),
          ]
            .map((match) => match[1])
            .filter((path) => path.startsWith('/'))
            .map((path) => new URL(path, self.registration.scope).toString())
            .filter((url) => url !== SHELL_URL);
          await cache.addAll(assetUrls);
        }
      } catch {
        // Pre-caching is best-effort: runtime caching below still
        // fills the cache during the first successful visit.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('mitsumori-marutto-') && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Cross-origin requests (web fonts, etc.) pass straight through.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(SHELL_URL, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(SHELL_URL, { ignoreSearch: true })
            .then(
              (cached) =>
                cached ??
                new Response('オフラインのため表示できません', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                }),
            ),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
