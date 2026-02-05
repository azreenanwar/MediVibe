self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// jangan intercept navigation, supaya login/dashboard tak rosak
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") return;
});
