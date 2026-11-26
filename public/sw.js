// One-release recovery worker at the same path as the broken deployed app SW.
function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  return (hasWorkboxBucket && name.endsWith(self.registration.scope)) ||
    ["html-navigations", "assets", "google-fonts"].includes(name);
}
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil((async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.allSettled(cacheNames.filter(isWorkboxCacheForThisRegistration).map((name) => caches.delete(name)));
      await self.clients.claim();
      const windowClients = await self.clients.matchAll({ type: "window" });
      await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
    } finally {
      await self.registration.unregister();
    }
  })()),
);