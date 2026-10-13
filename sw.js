const CACHE_NAME = "ficha-evolucao-v4";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./fonts/inter.woff2",
  "./fonts/bricolage.woff2",
  "./logo-vivaz.svg",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

function saveCopy(request, response) {
  if (response.ok && new URL(request.url).origin === self.location.origin) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  // A página do app: com internet, sempre a versão nova; sem internet, a guardada.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => saveCopy(event.request, response))
        .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match("./"))),
    );
    return;
  }

  // Arquivos do app (scripts, estilos, fontes, ícones): os guardados primeiro.
  event.respondWith(
    caches.match(event.request).then(
      (cached) => cached ?? fetch(event.request).then((response) => saveCopy(event.request, response)),
    ),
  );
});
