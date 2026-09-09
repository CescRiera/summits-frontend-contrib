import type { Map as MapboxMap } from "mapbox-gl";
import type { OfflineSourceSpec } from "../offline/types";

export const MAPBOX_TERRAIN_SOURCE_ID = "mapbox-dem";
export const MAPBOX_TERRAIN_SOURCE_URL =
  "mapbox://mapbox.mapbox-terrain-dem-v1";
export const MAPBOX_TERRAIN_TILE_SIZE = 512;
export const MAPBOX_TERRAIN_MAX_ZOOM = 14;
export const MAPBOX_TERRAIN_EXAGGERATION = 1.5;
export const MAPBOX_TERRAIN_SOURCE_KEY = "mapbox.mapbox-terrain-dem-v1";

const MAPBOX_TOKEN = import.meta.env["VITE_MAPBOX_ACCESS_TOKEN"] || "";

const TERRAIN_TILES_STORAGE_KEY = "offline_terrain_tiles";

const MAPBOX_TERRAIN_SOURCE = {
  type: "raster-dem" as const,
  url: MAPBOX_TERRAIN_SOURCE_URL,
  tileSize: MAPBOX_TERRAIN_TILE_SIZE,
  maxzoom: MAPBOX_TERRAIN_MAX_ZOOM,
};

/**
 * Resolved DEM tile URL templates (with {z}/{x}/{y} placeholders). Cached in
 * localStorage so the raster-dem source can be recreated offline with inline
 * `tiles` and never needs to resolve its tileJSON over the network.
 */
export function getTerrainTileTemplatesSync(): string[] {
  try {
    const raw = localStorage.getItem(TERRAIN_TILES_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as string[];
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch {
    // ignore
  }
  return [];
}

export async function getTerrainTileTemplates(): Promise<string[]> {
  const cached = getTerrainTileTemplatesSync();
  if (cached.length > 0) return cached;
  try {
    const url = `https://api.mapbox.com/v4/${MAPBOX_TERRAIN_SOURCE_KEY}.json?access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url, { credentials: "omit" });
    if (!res.ok) return [];
    const json = (await res.json()) as { tiles?: string[] };
    const tiles = Array.isArray(json.tiles)
      ? json.tiles.filter((t): t is string => Boolean(t))
      : [];
    if (tiles.length > 0) {
      try {
        localStorage.setItem(TERRAIN_TILES_STORAGE_KEY, JSON.stringify(tiles));
      } catch {
        // ignore
      }
    }
    return tiles;
  } catch {
    return [];
  }
}

/**
 * OfflineSourceSpec for the terrain DEM tileset, or null if the tileset
 * could not be resolved. `zoomOffset` keeps the existing behavior of fetching
 * DEM one zoom above the region zoom; mapbox requests terrain at a lower zoom
 * so this safely covers everything.
 */
export async function buildTerrainSourceSpec(): Promise<OfflineSourceSpec | null> {
  const tiles = await getTerrainTileTemplates();
  if (tiles.length === 0) return null;
  const template = tiles[0];
  if (!template || !template.includes("{z}")) return null;
  const separator = template.includes("?") ? "&" : "?";
  return {
    sourceKey: MAPBOX_TERRAIN_SOURCE_KEY,
    template: `${template}${separator}access_token=${MAPBOX_TOKEN}`,
    zoomOffset: 1,
    maxZoom: MAPBOX_TERRAIN_MAX_ZOOM + 1,
  };
}

export const ensureMapboxTerrainSource = (
  map: MapboxMap,
  sourceId = MAPBOX_TERRAIN_SOURCE_ID
): void => {
  if (map.getSource(sourceId)) {
    return;
  }

  // Prefer inline tiles from the cached terrain templates so the source works
  // without resolving tileJSON over the network (critical offline).
  const tiles = getTerrainTileTemplatesSync();
  if (tiles.length > 0) {
    map.addSource(sourceId, {
      type: "raster-dem",
      tiles,
      tileSize: MAPBOX_TERRAIN_TILE_SIZE,
      maxzoom: MAPBOX_TERRAIN_MAX_ZOOM,
    });
    return;
  }

  map.addSource(sourceId, MAPBOX_TERRAIN_SOURCE);
};

export const enableMapboxTerrain = (
  map: MapboxMap,
  options?: {
    sourceId?: string;
    exaggeration?: number;
  }
): void => {
  const sourceId = options?.sourceId ?? MAPBOX_TERRAIN_SOURCE_ID;
  const exaggeration =
    options?.exaggeration ?? MAPBOX_TERRAIN_EXAGGERATION;

  ensureMapboxTerrainSource(map, sourceId);
  map.setTerrain({ source: sourceId, exaggeration });
};
