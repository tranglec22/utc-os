/* UTC.OS Reconstruction Shell — Phase 7 service worker.
   Cache-first for same-origin shell files only. No background sync,
   no push, no API calls of its own. Cross-origin requests (Google Fonts,
   and the optional bring-your-own-key calls to api.openai.com) are passed
   straight to the network and NEVER cached here. */
const CACHE = "utcos-shell-v7";
const SHELL = [
  "./",
  "./index.html",
  "./lead-center.html",
  "./manifest.json",
  "./assets/app.js",
  "./assets/styles.css",
  "./data/second-brain-public.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("utcos-shell-") && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // e.g. OpenAI POSTs: never touched
  const url = new URL(req.url);
  if (url.hostname === "api.openai.com") return; // never cache AI traffic
  if (url.origin !== self.location.origin) return; // network as normal
  if (url.pathname.endsWith("/data/job-radar.json")) {
    event.respondWith(fetch(req, { cache: "no-store" }));
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
