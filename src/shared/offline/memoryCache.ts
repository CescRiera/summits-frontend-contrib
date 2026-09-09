import type { ParsedAsset, ParsedTile } from "./types";

/**
 * Synchronous in-memory cache of tile/asset bytes as data: URLs.
 *
 * mapbox-gl's transformRequest runs on the main thread but MUST return
 * synchronously (its result is serialized and sent to a Web Worker which then
 * fetches the returned URL). IndexedDB is async, so offline tiles are only
 * servable from here. The viewport prewarmer (prewarm.ts) fills this cache
 * ahead of mapbox-gl's tile requests.
 */
const dataUrls = new Map<string, string>();
const MAX_ENTRIES = 6000;

export function tileCacheKey(tile: ParsedTile): string {
  return `${tile.sourceKey}/${tile.z}/${tile.x}/${tile.y}`;
}

export function assetCacheKey(asset: ParsedAsset): string {
  return `asset:${asset.sourceKey}/${asset.id}`;
}

export function hasDataUrl(key: string): boolean {
  return dataUrls.has(key);
}

export function getDataUrl(key: string): string | undefined {
  return dataUrls.get(key);
}

export function setDataUrl(key: string, dataUrl: string): void {
  if (dataUrls.has(key)) {
    dataUrls.delete(key);
  }
  dataUrls.set(key, dataUrl);
  if (dataUrls.size > MAX_ENTRIES) {
    const oldest = dataUrls.keys().next().value;
    if (oldest !== undefined) {
      dataUrls.delete(oldest);
    }
  }
}

export function clearMemoryCache(): void {
  dataUrls.clear();
}

export function memoryCacheSize(): number {
  return dataUrls.size;
}
