// Service worker de LocationTracker : rend l'app installable et utilisable
// hors-ligne pour son interface (logo et manifeste sont intégrés directement
// dans index.html, il n'y a donc plus qu'une seule page à mettre en cache).
// Le partage collectif, lui, a toujours besoin du réseau (Firestore).

const CACHE_NAME = "location-tracker-v2";

const APP_SHELL = [
  "./",
  "./index.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn("Pré-mise en cache incomplète :", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Jamais de cache pour les domaines externes : Firestore, Google Fonts,
  // SDK Firebase (gstatic) doivent toujours passer par le réseau.
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
