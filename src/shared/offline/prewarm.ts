import type { Map as MapboxMap } from "mapbox-gl";
import type { AssetRecord, TileRecord } from "./types";
import {
  getTilesByKeys,
  getTilesUpToZoom,
  getAllAssets,
  getAllRegions,
  makeTileKey,
  type TileKey,
} from "./db";
import {
  assetCacheKey,
  hasDataUrl,
  setDataUrl,
  tileCacheKey,
} from "./memoryCache";
import { parseTileTemplate, toDataUrl } from "./urlIndex";
import { knownSourceKeysForStyle } from "./style";

const MAX_WARM_KEYS = 1200;
/** Low-zoom "world" range that is always kept cached so the map renders offline. */
const WORLD_MAX_ZOOM = 4;

function lonToTileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z));
}

function latToTileY(lat: number, z: number): number {
  const latRad = (lat * Math.PI) / 180;
  const n = 1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI;
  return Math.floor((n / 2) * Math.pow(2, z));
}

export function tileCoordsInBounds(
  bbox: [number, number, number, number],
  z: number
): Array<[number, number]> {
  const [west, south, east, north] = bbox;
  const size = Math.pow(2, z);
  let x0 = lonToTileX(Math.max(west, -180), z);
  let x1 = lonToTileX(Math.min(east, 180), z);
  if (west > east) x1 = size - 1;
  let y0 = latToTileY(Math.min(north, 85.0511), z);
  let y1 = latToTileY(Math.max(south, -85.0511), z);
  x0 = Math.max(0, Math.min(size - 1, x0));
  x1 = Math.max(0, Math.min(size - 1, x1));
  y0 = Math.max(0, Math.min(size - 1, y0));
  y1 = Math.max(0, Math.min(size - 1, y1));
  if (y0 > y1) [y0, y1] = [y1, y0];
  const coords: Array<[number, number]> = [];
  const total = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (total > 2 * 262144) return [];
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      coords.push([x, y]);
    }
  }
  return coords;
}

export function pointInPolygon(
  lng: number,
  lat: number,
  polygon: Array<[number, number]>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const p = polygon[i];
    const q = polygon[j];
    if (!p || !q) continue;
    const intersect =
      q[1] > lat !== p[1] > lat && lng < ((q[0] - p[0]) * (lat - p[1])) / (q[1] - p[1]) + p[0];
    if (intersect) inside = !inside;
  }
  return inside;
}

export function countTilesInArea(
  bbox: [number, number, number, number],
  minZoom: number,
  maxZoom: number,
  polygon?: Array<[number, number]>
): number {
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    for (const [x, y] of tileCoordsInBounds(bbox, z)) {
      if (polygon && polygon.length >= 3) {
        const { lng, lat } = tileCenterLngLat(x, y, z);
        if (!pointInPolygon(lng, lat, polygon)) continue;
      }
      total++;
    }
  }
  return total;
}

export function tileCenterLngLat(
  x: number,
  y: number,
  z: number
): { lng: number; lat: number } {
  const size = Math.pow(2, z);
  const lng = ((x + 0.5) / size) * 360 - 180;
  const n = Math.PI * (1 - (2 * (y + 0.5)) / size);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lng, lat };
}

export function getSourceKeysFromMap(map: MapboxMap): string[] {
  try {
    const keys = new Set<string>();
    const style = map.getStyle();
    if (!style || !style.sources) return [];
    for (const sourceId of Object.keys(style.sources)) {
      const live = (map.getSource(sourceId) as unknown as { tiles?: string[] }) ?? null;
      const tiles = Array.isArray(live?.tiles) ? live.tiles : undefined;
      if (tiles) {
        for (const t of tiles) {
          const parsed = parseTileTemplate(t);
          if (parsed) keys.add(parsed.sourceKey);
        }
      }
    }
    return [...keys];
  } catch {
    return [];
  }
}
function tileKeysForWindow(
  center: [number, number],
  zoom: number,
  sourceKeys: string[],
  radius: number
): TileKey[] {
  const keys: TileKey[] = [];
  const zoomFloor = Math.max(0, Math.floor(zoom));
  for (const sourceKey of sourceKeys) {
    for (const z of new Set([
      zoomFloor,
      Math.max(0, zoomFloor - 1),
      Math.max(0, zoomFloor - 2),
      zoomFloor + 1,
    ])) {
      const size = Math.pow(2, z);
      const cx = lonToTileX(center[0], z);
      const cy = latToTileY(center[1], z);
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= size || y >= size) continue;
          keys.push(makeTileKey(sourceKey, z, x, y));
        }
      }
    }
  }
  return keys;
}

function storeRecords(records: TileRecord[]): void {
  for (const rec of records) {
    setDataUrl(
      tileCacheKey({ sourceKey: rec.sourceKey, z: rec.z, x: rec.x, y: rec.y }),
      toDataUrl(rec.bytes, rec.mime)
    );
  }
}

/**
 * Prewarm the synchronous memory cache with every cached style/sprite/glyph
 * asset. Without this, the style JSON itself fails to load when offline and the
 * whole map renders nothing.
 */
export async function prewarmStyleAssets(): Promise<void> {
  try {
    const assets = await getAllAssets();
    for (const rec of assets) {
      setDataUrl(
        assetCacheKey({
          sourceKey: rec.sourceKey as AssetRecord["sourceKey"],
          id: rec.id,
          mime: rec.mime,
        }),
        toDataUrl(rec.bytes, rec.mime)
      );
    }
  } catch {
    // ignore
  }
}

/**
 * Prewarm every cached tile at zooms 0..WORLD_MAX_ZOOM into the memory cache.
 * With the global base layer in IndexedDB this means the entire low-zoom world
 * (both styles + peaks) is always servable synchronously, so offline the map
 * renders instead of showing nothing. Chunked with yields to avoid jank.
 */
export async function prewarmWorldLowZoom(): Promise<void> {
  try {
    const records = await getTilesUpToZoom(WORLD_MAX_ZOOM);
    if (records.length === 0) return;
    const CHUNK = 120;
    for (let i = 0; i < records.length; i += CHUNK) {
      storeRecords(records.slice(i, i + CHUNK));
      if (i + CHUNK < records.length) {
        await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    }
  } catch {
    // ignore
  }
}

async function allCachedSourceKeys(): Promise<string[]> {
  try {
    const regions = await getAllRegions();
    const keys = new Set<string>();
    for (const region of regions) {
      for (const sourceKey of region.sources) {
        if (sourceKey) keys.add(sourceKey);
      }
    }
    return [...keys];
  } catch {
    return [];
  }
}

/**
 * Prewarm the synchronous memory cache for the map's current viewport before
 * mapbox-gl asks for those tiles. Run right before constructing the map to
 * cover the initial viewport without racing the worker's fetch. Also loads all
 * cached style assets and kicks off a background prewarm of the low-zoom world.
 */
export async function prewarmInitialViewport(opts: {
  center: [number, number];
  zoom: number;
  styleUrl?: string;
  radius?: number;
}): Promise<void> {
  const styleKeys = opts.styleUrl
    ? knownSourceKeysForStyle(opts.styleUrl)
    : ["peaks"];
  const cachedKeys = await allCachedSourceKeys();
  const sourceKeys = [...new Set([...styleKeys, ...cachedKeys])];

  const keys = tileKeysForWindow(opts.center, opts.zoom, sourceKeys, opts.radius ?? 2);
  const missing = keys.filter(([s, z, x, y]) => {
    return !hasDataUrl(tileCacheKey({ sourceKey: s, z, x, y }));
  });
  if (missing.length > 0) {
    const records = await getTilesByKeys(missing.slice(0, MAX_WARM_KEYS));
    storeRecords(records);
  }
  await prewarmStyleAssets();

  // Low-zoom world is heavier; fill it in the background so startup stays fast.
  void prewarmWorldLowZoom();
}

/**
 * Warm the memory cache for whatever the map currently shows. Debounced by the
 * caller; source keys are derived from the live style so it stays correct even
 * after setStyle() calls.
 */
export async function warmViewport(map: MapboxMap): Promise<void> {
  try {
    if (!map.isStyleLoaded()) return;
    const sourceKeys = getSourceKeysFromMap(map);
    if (sourceKeys.length === 0) return;
    const zoom = Math.max(0, Math.floor(map.getZoom()));
    const bounds = map.getBounds();
    if (!bounds) return;
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
    const keys: TileKey[] = [];
    for (const sourceKey of sourceKeys) {
      for (const z of new Set([
        zoom,
        Math.max(0, zoom - 1),
        Math.max(0, zoom - 2),
        zoom + 1,
      ])) {
        for (const [x, y] of tileCoordsInBounds(bbox, z)) {
          if (hasDataUrl(tileCacheKey({ sourceKey, z, x, y }))) continue;
          keys.push(makeTileKey(sourceKey, z, x, y));
        }
      }
    }
    if (keys.length === 0) return;
    const records = await getTilesByKeys(keys.slice(0, MAX_WARM_KEYS));
    storeRecords(records);
  } catch {
    // ignore
  }
}
