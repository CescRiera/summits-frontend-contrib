/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { precacheAndRoute, matchPrecache, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import { StaleWhileRevalidate, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute((self as any).__WB_MANIFEST);

const CACHE_30DAYS = 60 * 60 * 24 * 30;
const CACHE_7DAYS = 60 * 60 * 24 * 7;

// Mapbox style JSON
registerRoute(
  /^https:\/\/api\.mapbox\.com\/styles\/v[0-9]+\/.*/i,
  async ({ request, event }) => {
    const strategy = new StaleWhileRevalidate({
      cacheName: "mapbox-styles",
      plugins: [
        new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: CACHE_30DAYS }) as any,
      ],
    });
    return strategy.handle({ request, event });
  }
);

// Mapbox sprites and glyphs
registerRoute(
  /^https:\/\/api\.mapbox\.com\/(styles\/v[0-9]+\/.+\/sprite|fonts\/).*/i,
  async ({ request, event }) => {
    const strategy = new StaleWhileRevalidate({
      cacheName: "mapbox-sprites-glyphs",
      plugins: [
        new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: CACHE_30DAYS }) as any,
      ],
    });
    return strategy.handle({ request, event });
  }
);

// Mapbox raster tiles (api.mapbox.com/v4/*)
registerRoute(
  /^https:\/\/api\.mapbox\.com\/v4\/.*/i,
  async ({ request, event }) => {
    const strategy = new StaleWhileRevalidate({
      cacheName: "mapbox-raster-tiles",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 5000,
          maxAgeSeconds: CACHE_30DAYS,
        }) as any,
      ],
    });
    return strategy.handle({ request, event });
  }
);

// Mapbox vector tiles (*.tiles.mapbox.com/*)
registerRoute(
  /^https:\/\/[a-z0-9]+\.tiles\.mapbox\.com\/.*/i,
  async ({ request, event }) => {
    const strategy = new StaleWhileRevalidate({
      cacheName: "mapbox-tiles",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 10000,
          maxAgeSeconds: CACHE_30DAYS,
        }) as any,
      ],
    });
    return strategy.handle({ request, event });
  }
);

// Peak tiles (tileserver)
registerRoute(
  /^https:\/\/tileserver\.summitstracker\.com\/.*/i,
  async ({ request, event }) => {
    const strategy = new StaleWhileRevalidate({
      cacheName: "peak-tiles",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 5000,
          maxAgeSeconds: CACHE_30DAYS,
        }) as any,
      ],
    });
    return strategy.handle({ request, event });
  }
);

// Backend API (NetworkFirst with 5s timeout)
registerRoute(
  /^https:\/\/backend\.summitstracker\.com\/api\/.*/i,
  async ({ request, event }) => {
    const strategy = new NetworkFirst({
      cacheName: "api-cache",
      plugins: [
        new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: CACHE_7DAYS }) as any,
      ],
      networkTimeoutSeconds: 5,
    });
    return strategy.handle({ request, event });
  }
);

setCatchHandler(async ({ request }: any) => {
  if (request && request.destination === "document") {
    const response = await matchPrecache("/index.html");
    if (response) return response;
  }
  return Response.error();
});
