import type { Map as MapboxMap, StyleSpecification } from "mapbox-gl";
import type { AssetRecord, OfflineSourceSpec } from "./types";
import { assetCacheKey, setDataUrl } from "./memoryCache";
import { getAsset, putAsset } from "./db";
import { parseTileTemplate, tileTemplateToFetchable, toDataUrl } from "./urlIndex";
import {
  MAPBOX_TERRAIN_MAX_ZOOM,
  MAPBOX_TERRAIN_SOURCE_ID,
  MAPBOX_TERRAIN_TILE_SIZE,
  getTerrainTileTemplates,
  getTerrainTileTemplatesSync,
} from "../../shared/utils/mapboxTerrain";

const MAPBOX_TOKEN = import.meta.env["VITE_MAPBOX_ACCESS_TOKEN"] || "";

const storedStyleIds = new Set<string>();

const SOURCE_KEYS_STORAGE_KEY = "offline_map_sourcekeys";

export interface ResolvedStyle {
  style: StyleSpecification;
  styleId: string;
  sources: OfflineSourceSpec[];
  glyphTemplate: string | undefined;
  fontStacks: string[];
  spriteUrls: string[];
}

function resolveMapboxUrl(template: string): string {
  let url = template
    .replace("mapbox://styles/", "https://api.mapbox.com/styles/v1/")
    .replace("mapbox://fonts/", "https://api.mapbox.com/fonts/v1/")
    .replace("mapbox://sprites/", "https://api.mapbox.com/styles/v1/");
  const separator = url.includes("?") ? "&" : "?";
  url += `${separator}access_token=${MAPBOX_TOKEN}`;
  return url;
}

function collectFontStacks(style: StyleSpecification): string[] {
  const stacks = new Set<string>();
  for (const layer of style.layers || []) {
    if (layer.type !== "symbol") continue;
    const layout = (layer as { layout?: { "text-font"?: string[] } }).layout;
    const fonts = layout?.["text-font"];
    if (Array.isArray(fonts)) {
      fonts.forEach((f) => f && stacks.add(f));
    }
  }
  return [...stacks];
}

function collectSpriteUrls(style: StyleSpecification): string[] {
  const urls: string[] = [];
  const sprite = (style as { sprite?: string | Array<{ id: string; url: string }> }).sprite;
  if (typeof sprite === "string") {
    urls.push(resolveMapboxUrl(sprite));
  } else if (Array.isArray(sprite)) {
    sprite.forEach((s) => {
      if (s && typeof s.url === "string") {
        urls.push(resolveMapboxUrl(s.url));
      }
    });
  }
  return urls;
}

function spriteUrlVariants(url: string): string[] {
  const base = url.replace(/\.(png|json)$/i, "");
  return [
    `${base}.json`,
    `${base}.png`,
    `${base}@2x.png`,
  ];
}

function styleIdFromStyleUrl(styleUrl: string): string | null {
  const m = styleUrl.match(/(?:styles\/v1\/|mapbox:\/\/styles\/)([^/]+\/[^/?]+)/);
  return m ? (m[1] ?? null) : null;
}

export function knownSourceKeysForStyle(styleUrl: string): string[] {
  const styleId = styleIdFromStyleUrl(styleUrl);
  if (!styleId) return ["peaks"];
  try {
    const raw = localStorage.getItem(SOURCE_KEYS_STORAGE_KEY);
    if (raw) {
      const map = JSON.parse(raw) as Record<string, string[]>;
      const keys = map[styleId];
      if (Array.isArray(keys) && keys.length > 0) return keys;
    }
  } catch {
    // ignore
  }
  return ["peaks"];
}

function rememberSourceKeys(styleId: string, sourceKeys: string[]): void {
  try {
    const raw = localStorage.getItem(SOURCE_KEYS_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    map[styleId] = sourceKeys;
    localStorage.setItem(SOURCE_KEYS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Build an offline-servable copy of the current style: source tile templates
 * resolved to concrete URLs (fetched from the live map sources) so no network
 * is needed to resolve tileJSON offline.
 */
export async function resolveCurrentStyle(
  map: MapboxMap,
  styleUrl: string
): Promise<ResolvedStyle | null> {
  const style = map.getStyle();
  if (!style || !style.layers) return null;
  const styleId = styleIdFromStyleUrl(styleUrl);
  if (!styleId) return null;

  const resolved = JSON.parse(JSON.stringify(style)) as StyleSpecification;
  const sources: OfflineSourceSpec[] = [];
  const sourceKeys: string[] = [];

  for (const sourceId of Object.keys(style.sources || {})) {
    const spec = (style.sources || {})[sourceId];
    const live = (map.getSource(sourceId) as unknown as {
      tiles?: string[];
      maxzoom?: number;
      tileSize?: number;
      type?: string;
    }) ?? null;
    let tiles = Array.isArray(live?.tiles) ? live.tiles : undefined;
    if (!tiles || tiles.length === 0) {
      tiles = (await resolveTileTemplatesFromNetwork(
        spec as { url?: string; tiles?: string[] }
      )) ?? undefined;
    }
    if (tiles && tiles.length > 0) {
      (resolved.sources as Record<string, unknown>)[sourceId] = {
        ...(spec as object),
        tiles,
        url: undefined,
      };
      const type = live?.type || (spec as { type?: string })?.type;
      const tileSize = live?.tileSize || (spec as { tileSize?: number })?.tileSize;
      const maxzoom =
        typeof live?.maxzoom === "number"
          ? live.maxzoom
          : (spec as { maxzoom?: number })?.maxzoom;

      // raster-dem sources with tileSize 512 are requested one zoom level
      // above the map zoom (capped at the tileset maxzoom).
      const zoomOffset = type === "raster-dem" && tileSize === 512 ? 1 : 0;
      for (const t of tiles) {
        const parsed = parseTileTemplate(t);
        if (parsed && !sourceKeys.includes(parsed.sourceKey)) {
          sourceKeys.push(parsed.sourceKey);
          sources.push({
            sourceKey: parsed.sourceKey,
            template: tileTemplateToFetchable(t, MAPBOX_TOKEN),
            ...(zoomOffset ? { zoomOffset } : {}),
            ...(typeof maxzoom === "number" ? { maxZoom: maxzoom } : {}),
          });
        }
      }
    }
  }

  if (sourceKeys.length > 0) {
    rememberSourceKeys(styleId, sourceKeys);
  }

  const glyphTemplate =
    typeof resolved.glyphs === "string" ? resolveMapboxUrl(resolved.glyphs) : undefined;

  return {
    style: resolved,
    styleId,
    sources,
    glyphTemplate,
    fontStacks: collectFontStacks(resolved),
    spriteUrls: collectSpriteUrls(style),
  };
}

function normalizeTileUrl(url: string): string {
  return url.replace(/^http:\/\//i, "https://");
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(url, { signal: signal ?? null, credentials: "omit" });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Resolve a source's literal tile URL templates without a live map.
 * Prefers an inline `tiles` array; otherwise resolves the mapbox:// tileJSON
 * reference (including composite tilesets) via the styles API.
 */
async function resolveTileTemplatesFromNetwork(
  spec: { url?: string; tiles?: string[] },
  signal?: AbortSignal
): Promise<string[] | null> {
  if (Array.isArray(spec.tiles) && spec.tiles.length > 0) {
    return spec.tiles.map(normalizeTileUrl);
  }
  const ref = spec.url;
  if (typeof ref !== "string") return null;
  const m = ref.match(/^mapbox:\/\/(.+)$/);
  if (!m) return null;
  const tileset = m[1];
  if (!tileset) return null;
  const tileJson = (await fetchJson(
    `${"https://api.mapbox.com/v4/"}${tileset}.json?access_token=${MAPBOX_TOKEN}`,
    signal
  )) as { tiles?: string[] } | null;
  const tiles = tileJson?.tiles;
  if (!Array.isArray(tiles) || tiles.length === 0) return null;
  return tiles.map(normalizeTileUrl);
}

/**
 * Resolve a style's sources, glyphs, sprites and fonts purely from the network
 * (no live map required). Used to keep BOTH map styles cached for offline use.
 */
export async function resolveStyleFromNetwork(
  styleUrl: string
): Promise<ResolvedStyle | null> {
  const styleId = styleIdFromStyleUrl(styleUrl);
  if (!styleId) return null;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30000);
  try {
    const style = (await fetchJson(
      resolveMapboxUrl(styleUrl),
      controller.signal
    )) as StyleSpecification | null;
    if (!style || !style.layers) return null;

    const resolved = JSON.parse(JSON.stringify(style)) as StyleSpecification;
    const sources: OfflineSourceSpec[] = [];
    const sourceKeys: string[] = [];

    for (const sourceId of Object.keys(style.sources || {})) {
      const spec = (style.sources || {})[sourceId];
      const tiles = await resolveTileTemplatesFromNetwork(
        spec as { url?: string; tiles?: string[] },
        controller.signal
      );
      if (tiles && tiles.length > 0) {
        (resolved.sources as Record<string, unknown>)[sourceId] = {
          ...(spec as object),
          tiles,
          url: undefined,
        };
        for (const t of tiles) {
          const parsed = parseTileTemplate(t);
          if (parsed && !sourceKeys.includes(parsed.sourceKey)) {
            sourceKeys.push(parsed.sourceKey);
            sources.push({ sourceKey: parsed.sourceKey, template: t });
          }
        }
      }
    }

    if (sourceKeys.length > 0) {
      rememberSourceKeys(styleId, sourceKeys);
    }

    const glyphTemplate =
      typeof resolved.glyphs === "string"
        ? resolveMapboxUrl(resolved.glyphs)
        : undefined;

    return {
      style: resolved,
      styleId,
      sources,
      glyphTemplate,
      fontStacks: collectFontStacks(resolved),
      spriteUrls: collectSpriteUrls(style),
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function storeAssetBytes(
  sourceKey: "style" | "sprite" | "glyphs",
  id: string,
  bytes: ArrayBuffer,
  mime: string,
  regionId: string | null
): Promise<void> {
  const record: AssetRecord = { sourceKey, id, bytes, mime, regionId, cachedAt: Date.now() };
  await putAsset(record);
  setDataUrl(assetCacheKey({ sourceKey, id, mime }), toDataUrl(bytes, mime));
}

/**
 * Return a copy of the style that always contains the terrain DEM source with
 * inline `tiles`, so terrain can be enabled offline without fetching tileJSON.
 */
function withTerrainSource(style: StyleSpecification): StyleSpecification {
  if (style.sources && style.sources[MAPBOX_TERRAIN_SOURCE_ID]) return style;
  const tiles = getTerrainTileTemplatesSync();
  if (tiles.length === 0) return style;
  const copy: StyleSpecification = JSON.parse(JSON.stringify(style));
  copy.sources = copy.sources || {};
  copy.sources[MAPBOX_TERRAIN_SOURCE_ID] = {
    type: "raster-dem",
    tiles,
    tileSize: MAPBOX_TERRAIN_TILE_SIZE,
    maxzoom: MAPBOX_TERRAIN_MAX_ZOOM,
  } as StyleSpecification["sources"][string];
  return copy;
}

export async function cacheStyleAssets(resolved: ResolvedStyle): Promise<void> {
  const id = resolved.styleId;
  // Ensure the terrain DEM tile templates are resolved (fetched once, then
  // served from localStorage) so the stored style can include inline tiles.
  await getTerrainTileTemplates();
  if (storedStyleIds.has(id)) return;
  storedStyleIds.add(id);

  // Inject the terrain DEM source with inline tiles into the stored style so
  // offline the map can create terrain without resolving tileJSON over the
  // network. Without this, 3D never renders when the device has no connection.
  const style = withTerrainSource(resolved.style);

  await storeAssetBytes(
    "style",
    id,
    new TextEncoder().encode(JSON.stringify(style)).buffer,
    "application/json",
    null
  );

  for (const spriteUrl of resolved.spriteUrls) {
    for (const variant of spriteUrlVariants(spriteUrl)) {
      await storeRemoteAsset(variant, "sprite", null);
    }
  }

  const glyphs = resolved.glyphTemplate;
  if (glyphs) {
    for (const stack of resolved.fontStacks) {
      for (let range = 0; range <= 11; range++) {
        const start = range * 256;
        const end = start + 255;
        const url = glyphs
          .replace("{fontstack}", stack)
          .replace("{range}", `${start}-${end}`);
        await storeRemoteAsset(url, "glyphs", null);
      }
    }
  }
}

async function storeRemoteAsset(
  url: string,
  sourceKey: "sprite" | "glyphs",
  regionId: string | null
): Promise<void> {
  try {
    const ext = /\.(json|png|pbf)(?:\?|$)/i.exec(url);
    const mime =
      ext?.[1] === "json" ? "application/json" : ext?.[1] === "png" ? "image/png" : "application/octet-stream";
    const id = buildAssetId(url);
    if (!id) return;
    const existing = await getAsset(sourceKey, id);
    if (existing) {
      setDataUrl(
        assetCacheKey({ sourceKey, id, mime }),
        toDataUrl(existing.bytes, existing.mime)
      );
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 30000);
    const res = await fetch(url, { signal: controller.signal, credentials: "omit" });
    window.clearTimeout(timer);
    if (!res.ok) return;
    const bytes = await res.arrayBuffer();
    await storeAssetBytes(sourceKey, id, bytes, mime, regionId);
  } catch {
    // ignore offline/transient
  }
}

function buildAssetId(url: string): string | null {
  const glyph = url.match(/\/fonts\/v1\/[^/]+\/([^/?]+)\/(\d+)-(\d+)\.pbf/);
  if (glyph) return `${glyph[1]}/${glyph[2]}-${glyph[3]}`;
  const sprite = url.match(
    /(?:styles\/v1\/|styles\/)([^/]+)\/([^/?]+)\/([^/?]+?)\.(png|json)/
  );
  if (sprite) return `${sprite[1]}/${sprite[2]}/${sprite[3]}.${sprite[4]}`;
  return null;
}
