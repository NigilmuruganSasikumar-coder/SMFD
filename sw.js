/* ==========================================================================
   SELVAMURUGAN FAST DRILLS — SERVICE WORKER
   Relative paths throughout so this works when the site is served from a
   GitHub Pages repo subdirectory (e.g. https://user.github.io/repo-name/).
   ========================================================================== */

// Bump this version string any time a cached file's contents change.
const CACHE_VERSION = "v3";
const CACHE_NAME = "selvamurugan-fast-drills-" + CACHE_VERSION;

// Core "app shell" — cached up front on install so the site works offline.
const PRECACHE_URLS = [
    "./",
    "./index.html",
    "./quotation.html",
    "./manifest.json",

    // CSS
    "./css/index1.css",
    "./css/index2.css",
    "./css/quotation.css",

    // JavaScript
    "./js/script.js",
    "./js/script1.js",
    "./js/ui.js",
    "./js/pwa.js",
    "./js/quotation.js",

    // PWA icons
    "./img/icon-192.png",
    "./img/icon-512.png"
];

/* ── INSTALL ───────────────────────────────────────────────────────────────
   Cache each file individually (instead of cache.addAll) so that if one
   asset happens to be missing or fails to fetch, it doesn't abort caching
   for every other file — the service worker still installs successfully. */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(
                PRECACHE_URLS.map(url =>
                    cache.add(url).catch(err => {
                        console.warn("[SW] Skipping (couldn't precache):", url, err);
                    })
                )
            );
        })
    );

    self.skipWaiting();
});

/* ── ACTIVATE ──────────────────────────────────────────────────────────────
   Remove any caches from previous versions and take control of open pages
   immediately, so the very next fetch is served from the new cache. */
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key.startsWith("selvamurugan-fast-drills-") && key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );

    self.clients.claim();
});

/* ── FETCH ─────────────────────────────────────────────────────────────────
   Strategy: cache-first for anything already cached, falling back to the
   network. Same-origin GET requests that succeed over the network but
   weren't in the precache list (e.g. gallery photos) get opportunistically
   stored too, so a second visit works offline without bloating the initial
   install. Cross-origin requests (Google Fonts, Font Awesome CDN, etc.) are
   left alone and simply pass through to the network. */
self.addEventListener("fetch", event => {
    const request = event.request;

    // Only handle simple same-origin GET requests; let everything else
    // (POST requests, browser extensions, cross-origin calls) go straight
    // to the network untouched.
    if (request.method !== "GET") return;

    const requestUrl = new URL(request.url);
    if (requestUrl.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) return cachedResponse;

            return fetch(request)
                .then(networkResponse => {
                    // Only cache successful, basic (same-origin) responses.
                    if (
                        networkResponse &&
                        networkResponse.ok &&
                        networkResponse.type === "basic"
                    ) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone).catch(() => {
                                /* Storage quota or opaque-response issues: ignore. */
                            });
                        });
                    }
                    return networkResponse;
                })
                .catch(err => {
                    // Offline and not cached — let it fail naturally; the
                    // pwa.js online/offline listeners handle the offline
                    // indicator, so we don't need a fallback page here.
                    throw err;
                });
        })
    );
});