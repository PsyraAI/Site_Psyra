/* Psyra AI — service worker (PWA e app Android). Sprint: S10 | Risco: R2
 * - Nunca guarda respostas da API (/v1): dado de empresa e de questionário não fica em cache.
 * - Arquivos com hash (/assets) ficam em cache para abrir rápido.
 * - Páginas: rede primeiro; sem internet, mostra /offline.html.
 */
const VERSAO = "psyra-v1-2026-10-17";
const ESTATICOS = ["/offline.html", "/icone-192.png", "/icone-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ESTATICOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fontes do Google etc.: o navegador decide
  if (url.pathname.startsWith("/v1") || url.pathname.startsWith("/health")) return; // API: sempre rede

  if (url.pathname.startsWith("/assets/")) {
    evento.respondWith(
      caches.match(req).then(
        (salvo) =>
          salvo ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(VERSAO).then((c) => c.put(req, copia));
            }
            return resp;
          })
      )
    );
    return;
  }

  if (req.mode === "navigate") {
    evento.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
  }
});
