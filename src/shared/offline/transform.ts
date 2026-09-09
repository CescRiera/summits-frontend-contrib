import type { RequestTransformFunction, ResourceType } from "mapbox-gl";
import { parseAssetUrl, parseTileUrl } from "./urlIndex";
import {
  assetCacheKey,
  getDataUrl,
  hasDataUrl,
  tileCacheKey,
} from "./memoryCache";
import { enqueueBrowseCache } from "./browseCache";

/**
 * transformRequest wrapper that serves offline-cached tiles and map assets.
 *
 * Runs on the main thread and must return synchronously (the returned
 * RequestParameters is serialized to a Web Worker which then fetches the URL).
 * IndexedDB reads are therefore done ahead of time by the viewport prewarmer
 * into the synchronous memory cache. Hits return the bytes as a data: URL
 * (fetchable from any worker context, including WebKit); misses fall through
 * to the original network URL.
 *
 * Also intercepts style JSON requests (mapbox://styles/...) so that when
 * offline the cached style is served instead of a failed network fetch.
 * mapbox-gl fetches the style in its internal worker; the data: URL is
 * transferable and can be decoded there.
 */
export function createOfflineTransformRequest(): RequestTransformFunction {
  return (url: string, resourceType?: ResourceType) => {
    const tile = parseTileUrl(url);
    if (tile) {
      const key = tileCacheKey(tile);
      if (hasDataUrl(key)) {
        const cached = getDataUrl(key);
        if (cached) return { url: cached };
      }
      enqueueBrowseCache(url, tile);
      return { url };
    }

    const asset = parseAssetUrl(url);
    if (asset) {
      const key = assetCacheKey(asset);
      if (hasDataUrl(key)) {
        const cached = getDataUrl(key);
        if (cached) return { url: cached };
      }
      enqueueBrowseCache(url, asset);
      return { url };
    }

    void resourceType;
    return { url };
  };
}
