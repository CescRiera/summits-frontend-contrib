import type { AssetRecord, ParsedAsset, ParsedTile, TileRecord } from "./types";
import {
  assetCacheKey,
  hasDataUrl,
  setDataUrl,
  tileCacheKey,
} from "./memoryCache";
import { countBrowseTiles, getDB, putAsset, putTile } from "./db";
import { toDataUrl } from "./urlIndex";

/**
 * Opportunistic "cache what you browse" pass-through caching.
 *
 * When online and mapbox-gl requests a tile/asset that is not yet in the
 * synchronous memory cache, we fire a background copy into IndexedDB
 * (regionId = null). It is then available offline on the next app start via
 * the viewport prewarmer. Never blocks the map's own network request.
 */

const MAX_CONCURRENCY = 6;
const MAX_BROWSE_TILES = 50000;
const FETCH_TIMEOUT = 20000;

const pending = new Set<string>();
const queue: Array<() => Promise<void>> = [];
let active = 0;

function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function runNext(): void {
  if (active >= MAX_CONCURRENCY) return;
  const task = queue.shift();
  if (!task) return;
  active++;
  task()
    .catch(() => undefined)
    .finally(() => {
      active--;
      runNext();
    });
}

function enqueue(task: () => Promise<void>): void {
  queue.push(task);
  runNext();
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, credentials: "omit" });
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export function enqueueBrowseCache(
  url: string,
  parsed: ParsedTile | ParsedAsset
): void {
  if (!isOnline()) return;
  const isTile = "z" in parsed;
  const key = isTile ? tileCacheKey(parsed) : assetCacheKey(parsed);
  if (pending.has(key) || hasDataUrl(key)) return;
  pending.add(key);

  enqueue(async () => {
    try {
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT);
      if (!res || !res.ok) return;
      const bytes = await res.arrayBuffer();
      if (!bytes || bytes.byteLength === 0) return;
      const cachedAt = Date.now();
      if (isTile) {
        const tile = parsed as ParsedTile;
        await putTile({
          ...tile,
          bytes,
          mime: mimeForUrl(url),
          regionId: null,
          cachedAt,
        } as TileRecord);
        setDataUrl(key, toDataUrl(bytes, mimeForUrl(url)));
        void trimBrowseTiles();
      } else {
        const asset = parsed as ParsedAsset;
        await putAsset({
          sourceKey: asset.sourceKey,
          id: asset.id,
          bytes,
          mime: asset.mime,
          regionId: null,
          cachedAt,
        } as AssetRecord);
        setDataUrl(key, toDataUrl(bytes, asset.mime));
      }
    } catch {
      // transient failure — ignore
    } finally {
      pending.delete(key);
    }
  });
}

function mimeForUrl(url: string): string {
  if (/\.(png)(\?|$)/i.test(url)) return "image/png";
  if (/\.(jpe?g)(\?|$)/i.test(url)) return "image/jpeg";
  if (/\.(webp)(\?|$)/i.test(url)) return "image/webp";
  return "application/octet-stream";
}

/** Delete oldest non-region tiles when the browse cache exceeds its cap. */
async function trimBrowseTiles(): Promise<void> {
  try {
    const count = await countBrowseTiles();
    if (count <= MAX_BROWSE_TILES) return;
    const excess = count - MAX_BROWSE_TILES;
    const db = await getDB();
    const tx = db.transaction("tiles", "readwrite");
    let deleted = 0;
    let cursor = await tx.store.index("cachedAt").openCursor();
    while (cursor && deleted < excess) {
      const rec = cursor.value as TileRecord;
      if (!rec.regionId) {
        cursor.delete();
        deleted++;
      }
      cursor = await cursor.continue();
    }
    await tx.done;
  } catch {
    // ignore
  }
}
