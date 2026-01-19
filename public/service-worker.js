self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("medivibe-cache").then(cache => {
      return cache.addAll([
        "/",
        "/index.html",
        "/dashboard.html",
        "/about.html",
        "/styles.css",
        "/main.js",
        "/images/favicon.png"
      ]);
    })
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      return response || fetch(e.request);
    })
  );
});
