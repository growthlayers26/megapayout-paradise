// Mega Payout Paradise: service worker for the home-screen app.
// Pages: always try the network first (so players see the latest offers), fall back
// to the last copy if they're offline. Site images/icons: serve the saved copy and
// refresh it in the background. Chat, sign-in, payments and other sites are never touched.
var CACHE = "mpp-v1";
var PRECACHE = [
  "/",
  "/privacy.html",
  "/manifest.webmanifest",
  "/assets/logo.png",
  "/assets/cover.jpg",
  "/assets/icons/icon-192.png",
  "/assets/icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  var url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(url.pathname === "/" ? "/" : req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match("/"); });
      })
    );
    return;
  }

  if (url.pathname.indexOf("/assets/") === 0) {
    event.respondWith(
      caches.match(req).then(function (hit) {
        var fresh = fetch(req).then(function (res) {
          if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
          return res;
        }).catch(function () { return hit; });
        return hit || fresh;
      })
    );
  }
});
