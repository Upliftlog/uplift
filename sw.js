// UP/LIFT offline cache. Bump VERSION whenever you upload a new index.html.
const VERSION = "uplift-v39";
const FILES = ["./", "index.html", "manifest.json", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "icon.svg"];
self.addEventListener("install", e => {
  // first install activates straight away; updates wait until the app says "Refresh"
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => { if (!self.registration.active) return self.skipWaiting(); }));
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first for the page (so updates arrive), cache fallback when offline (gym basements!)
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // never cache account/sync traffic: it must always hit the server
  if (url.hostname.endsWith(".supabase.co") || url.pathname.startsWith("/rest/") || url.pathname.startsWith("/auth/")) return;
  if (url.origin !== location.origin) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
    }).catch(() => r)));
    return;
  }
  e.respondWith(fetch(req).then(res => {
    const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
  }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
});
