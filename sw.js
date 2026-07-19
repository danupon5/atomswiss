const CACHE_NAME = "trip-cache-v4";
const PRECACHE_URLS = [
  "index.html",
  "day1.html",
  "day2.html",
  "day3.html",
  "day4.html",
  "plan.html",
  "assets/css/style.css",
  "assets/js/main.js",
  "assets/js/chat.js",
  "assets/js/plan.js",
  "assets/js/plan-editor.js",
  "assets/data/trip-context.json",
  "assets/data/trip-items.json",
  "manifest.webmanifest",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
          return response;
        })
        .catch(function () {
          return cached;
        });
    })
  );
});
