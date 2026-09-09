import type { ParsedAsset, ParsedTile } from "./types";

const PEAK_TILE_RE =
  /\/peaks_tiles\/(\d+)\/(\d+)\/(\d+)\.pbf(?:\?[^#]*)?$/i;

const SHELTER_TILE_RE =
  /\/shelters_tiles\/(\d+)\/(\d+)\/(\d+)\.pbf(?:\?[^#]*)?$/i;

const MAPBOX_TILE_RE =
  /\/(?:api\.mapbox\.com\/v4|[a-z0-9]+\.tiles\.mapbox\.com\/v4|api\.mapbox\.com\/raster\/v1|[a-z0-9]+\.tiles\.mapbox\.com\/raster\/v1)\/([^/]+)\/(\d+)\/(\d+)\/(\d+)\.((?:vector\.)?pbf|pngraw|png|jpe?g|webp)(?:\?[^#]*)?$/i;

const MAPBOX_GLYPH_RE =
  /api\.mapbox\.com\/fonts\/v1\/[^/]+\/([^/?]+)\/(\d+)-(\d+)\.pbf(?:\?[^#]*)?$/i;

const MAPBOX_SPRITE_RE =
  /(?:api\.mapbox\.com\/styles\/v1|mapbox:\/\/styles)\/?([^/]+)\/([^/?]+)\/([^/?]+?)\.(png|json)(?:\?[^#]*)?$/i;

const MAPBOX_STYLE_RE =
  /(?:api\.mapbox\.com\/styles\/v1|mapbox:\/\/styles)\/([^/]+)\/([^/?]+)(?:\?[^#]*)?$/i;

const TILE_MIME: Record<string, string> = {
  pbf: "application/octet-stream",
  png: "image/png",
  pngraw: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const MAPBOX_TILES_CANONICAL_RE = /^mapbox:\/\/tiles\/([^?]*)(?:\?(.*))?$/i;

const MAPBOX_RASTER_CANONICAL_RE = /^mapbox:\/\/raster\/([^?]*)(?:\?(.*))?$/i;

/**
 * mapbox-gl canonicalizes tile templates it loads from tileJSON into
 * `mapbox://tiles/{tileset}/{z}/{x}/{y}.{ext}` for v4 tilesets and
 * `mapbox://raster/{tileset}/{z}/{x}/{y}.{ext}` for raster/v1 tilesets
 * (see canonicalizeTileURL in mapbox-gl). Normalize both back to the
 * api.mapbox.com form so parsing and keying is identical to the URLs the
 * worker actually requests.
 */
export function normalizeCanonicalTileTemplate(template: string): string {
  let m = template.match(MAPBOX_TILES_CANONICAL_RE);
  if (m) {
    const query = m[2] ? `?${m[2]}` : "";
    return `https://api.mapbox.com/v4/${m[1]}${query}`;
  }
  m = template.match(MAPBOX_RASTER_CANONICAL_RE);
  if (m) {
    const query = m[2] ? `?${m[2]}` : "";
    // The /raster/v1/ endpoint requires a raster-scoped token; the same
    // tileset (e.g. terrain-dem-v1) is served under /v4/ with a normal token.
    return `https://api.mapbox.com/v4/${m[1]}${query}`;
  }
  return template;
}

/** Convert a canonical mapbox://tiles template into a directly fetchable URL. */
export function tileTemplateToFetchable(template: string, token: string): string {
  const url = normalizeCanonicalTileTemplate(template);
  if (url === template) return template;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}access_token=${token}`;
}

export function parseTileUrl(url: string): ParsedTile | null {
  const peak = url.match(PEAK_TILE_RE);
  if (peak) {
    return { sourceKey: "peaks", z: Number(peak[1]), x: Number(peak[2]), y: Number(peak[3]) };
  }
  const shelter = url.match(SHELTER_TILE_RE);
  if (shelter) {
    return {
      sourceKey: "shelters",
      z: Number(shelter[1]),
      x: Number(shelter[2]),
      y: Number(shelter[3]),
    };
  }
  const mapbox = normalizeCanonicalTileTemplate(url).match(MAPBOX_TILE_RE);
  if (mapbox && mapbox[1]) {
    return {
      sourceKey: mapbox[1],
      z: Number(mapbox[2]),
      x: Number(mapbox[3]),
      y: Number(mapbox[4]),
    };
  }
  return null;
}

export function parseAssetUrl(url: string): ParsedAsset | null {
  const glyph = url.match(MAPBOX_GLYPH_RE);
  if (glyph) {
    return {
      sourceKey: "glyphs",
      id: `${glyph[1]}/${glyph[2]}-${glyph[3]}`,
      mime: "application/octet-stream",
    };
  }
  const sprite = url.match(MAPBOX_SPRITE_RE);
  if (sprite) {
    return {
      sourceKey: "sprite",
      id: `${sprite[1]}/${sprite[2]}/${sprite[3]}.${sprite[4]}`,
      mime: sprite[4] === "json" ? "application/json" : "image/png",
    };
  }
  const style = url.match(MAPBOX_STYLE_RE);
  if (style) {
    return {
      sourceKey: "style",
      id: `${style[1]}/${style[2]}`,
      mime: "application/json",
    };
  }
  return null;
}

/** Derive a sourceKey from a tile URL template that still contains {z}/{x}/{y}. */
export function parseTileTemplate(template: string): ParsedTile | null {
  return parseTileUrl(template.replace("{z}", "1").replace("{x}", "1").replace("{y}", "1"));
}

export function mimeForExtension(ext: string): string {
  return TILE_MIME[ext] || "application/octet-stream";
}

export function toDataUrl(bytes: ArrayBuffer, mime: string): string {
  return `data:${mime};base64,${arrayBufferToBase64(bytes)}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
