// Service worker da versão navegador (app novo, 21/10/2026): o app funciona sem internet.
// Substitui o do app antigo (mesmo endereço): o nome do cache mudou, então os arquivos guardados do app
// antigo são apagados ao ativar — nenhum celular fica preso na versão velha.
// v9 (22/10/2026): fontes leves em /fonts (nome fixo: ao trocar uma fonte, subir este número)
const CACHE_NAME = "ficha-evolucao-v9";
// Cartão de instalação e ícones da marca do cliente (gravados pela página, ver src/lib/marca.web.ts): não apagar.
const CACHE_MARCA = "ficha-marca";
const FONTES = ["Inter_400Regular", "Inter_500Medium", "Inter_600SemiBold", "Inter_700Bold", "BricolageGrotesque_700Bold", "BricolageGrotesque_800ExtraBold"].map((f) => `./fonts/${f}.woff2`);
const APP_SHELL = ["./", "./index.html", "./android/icone-app.png", "./apple-touch-icon.png", ...FONTES];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME && key !== CACHE_MARCA).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

function guardarCopia(request, response) {
  if (response.ok && new URL(request.url).origin === self.location.origin) {
    const copia = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // APK e gerador: sempre direto da internet (nunca uma versão velha)
  if (url.pathname.includes("/android/") && url.pathname.endsWith(".apk")) return;
  if (url.pathname.includes("/gerador/")) return;
  // Google (login/Drive do backup): nunca passa pelo cache
  if (url.origin !== self.location.origin) return;

  // A página do app: com internet, sempre a versão nova; sem internet, a guardada.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => guardarCopia(event.request, response))
        .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match("./"))),
    );
    return;
  }

  // Arquivos do app (scripts, fontes, ícones): os guardados primeiro (os nomes mudam a cada versão).
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => guardarCopia(event.request, response))));
});
