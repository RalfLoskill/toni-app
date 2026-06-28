// ============================================================
// TONI-ToGo · Service Worker
// Scope: /togo/  (kontrolliert NUR den Player, nie die Hauptplattform)
//
// Strategie:
//   - App-Shell (HTML/Manifest/SW): cache-first, bei Update im Hintergrund frisch
//   - Reise-Assets (Bilder/SVG): cache-first, on-demand beim Reise-Download
//   - Videos / Supabase-API / YouTube: NIE cachen (Stream bzw. live)
// ============================================================

const SHELL_CACHE = "toni-togo-shell-v1";
const ASSET_CACHE = "toni-togo-assets-v1";

// Die App-Shell: minimal, damit die Bibliothek offline startet.
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Hostnamen, die niemals vom SW angefasst werden (immer direkt ans Netz).
function isBypass(url) {
  const h = url.hostname;
  return (
    h.endsWith("supabase.co") ||      // Edge Function / API: immer live
    h.includes("youtube.com") ||      // Video-Stream
    h.includes("youtu.be") ||
    h.includes("ytimg.com") ||
    h.includes("vimeo.com")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // API & Video: nie cachen, direkt durchreichen.
  if (isBypass(url)) return;

  // Navigations-Anfragen (Seitenaufruf): erst Netz, sonst Shell aus Cache.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Same-origin Shell-Dateien: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req))
    );
    return;
  }

  // Fremde Assets (z. B. Bilder, die eine Reise referenziert): cache-first,
  // bei Miss laden und in den Asset-Cache legen.
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        // Nur erfolgreiche, „echte" Antworten cachen (kein opaque-Fehler-Müll).
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
