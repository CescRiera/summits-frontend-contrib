import type { OfflineSourceSpec } from "./types";
import { regionDownloader } from "./download";
import { getRegion } from "./db";
import { cacheStyleAssets, resolveStyleFromNetwork } from "./style";
import { buildTerrainSourceSpec } from "../../shared/utils/mapboxTerrain";

/**
 * Always-cached "global base" layer: the whole world at low zoom for every map
 * style plus the peaks layer. Guarantees that when offline the map can always
 * render the world and peaks (zooms 0-4), no matter where the user starts.
 */

export const GLOBAL_BASE_REGION_ID = "global-base-world-z0-4";
export const GLOBAL_BASE_MAX_ZOOM = 4;

export const GLOBAL_BASE_STYLE_URLS = {
  satellite: "mapbox://styles/mapbox/satellite-v9",
  outdoors: "mapbox://styles/morris999/cmgzijuf7008n01qu8zwp3byu",
} as const;

export const WORLD_BBOX: [number, number, number, number] = [
  -180,
  -85.0511,
  180,
  85.0511,
];

const TILESERVER_URL = import.meta.env["VITE_TILESERVER_URL"] || "";

let isDownloading = false;
let ensurePromise: Promise<void> | null = null;

/** Number of tiles covering the whole world for one source at zooms 0..maxZoom. */
export function worldTileCountForSource(maxZoom: number): number {
  let total = 0;
  for (let z = 0; z <= maxZoom; z++) {
    total += Math.pow(4, z);
  }
  return total;
}

export async function isGlobalBaseComplete(): Promise<boolean> {
  try {
    const region = await getRegion(GLOBAL_BASE_REGION_ID);
    if (!region) return false;
    return (
      region.status === "completed" &&
      region.totalTiles > 0 &&
      region.doneTiles >= region.totalTiles
    );
  } catch {
    return false;
  }
}

/**
 * Download (or refresh) the whole world at zooms 0..GLOBAL_BASE_MAX_ZOOM for
 * the peaks layer and every source of both map styles. Uses the standard region
 * downloader so the tiles are region-protected (never trimmed) and show up in
 * the offline maps list. Only runs while online; safe to call repeatedly.
 */
export async function downloadGlobalBase(): Promise<void> {
  if (isDownloading) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  isDownloading = true;
  try {
    const sources: OfflineSourceSpec[] = [];
    const seen = new Set<string>();
    const addSpec = (spec: OfflineSourceSpec): void => {
      if (seen.has(spec.sourceKey)) return;
      seen.add(spec.sourceKey);
      sources.push(spec);
    };

    if (TILESERVER_URL) {
      addSpec({
        sourceKey: "peaks",
        template: `${TILESERVER_URL}/peaks_tiles/{z}/{x}/{y}.pbf`,
      });
    }

    // The terrain DEM tileset must be cached too, otherwise enabling 3D
    // terrain offline cannot fetch its tileJSON or tiles.
    const terrainSpec = await buildTerrainSourceSpec().catch(() => null);
    if (terrainSpec) addSpec(terrainSpec);

    // Resolve + cache style assets (style JSON, sprites, glyphs) for BOTH
    // styles so switching styles offline works and the style always loads.
    for (const styleUrl of Object.values(GLOBAL_BASE_STYLE_URLS)) {
      const resolved = await resolveStyleFromNetwork(styleUrl).catch(
        () => null
      );
      if (!resolved) continue;
      await cacheStyleAssets(resolved).catch(() => undefined);
      for (const s of resolved.sources) addSpec(s);
    }

    if (sources.length === 0) return;

    await regionDownloader.start({
      regionId: GLOBAL_BASE_REGION_ID,
      name: "Global base (world)",
      bbox: WORLD_BBOX,
      minZoom: 0,
      maxZoom: GLOBAL_BASE_MAX_ZOOM,
      sources,
    });
  } finally {
    isDownloading = false;
  }
}

/**
 * Ensure the global base layer exists in IndexedDB. Idempotent; only starts a
 * download when online and the layer is missing/incomplete.
 */
export function ensureGlobalBase(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      if (await isGlobalBaseComplete()) return;
      await downloadGlobalBase();
    })().finally(() => {
      ensurePromise = null;
    });
  }
  return ensurePromise;
}
