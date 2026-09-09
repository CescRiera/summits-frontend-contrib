export interface TileRecord {
  sourceKey: string;
  z: number;
  x: number;
  y: number;
  bytes: ArrayBuffer;
  mime: string;
  regionId: string | null;
  cachedAt: number;
}

export interface AssetRecord {
  sourceKey: "style" | "sprite" | "glyphs";
  id: string;
  bytes: ArrayBuffer;
  mime: string;
  regionId: string | null;
  cachedAt: number;
}

export interface OfflineRegion {
  id: string;
  name: string;
  /** west, south, east, north */
  bbox: [number, number, number, number];
  /** Clockwise polygon vertices [lng, lat]; optional when the area is a bbox */
  polygon?: Array<[number, number]>;
  minZoom: number;
  maxZoom: number;
  /** sourceKeys included in this region, e.g. ["peaks", "mapbox.mapbox-streets-v8"] */
  sources: string[];
  /**
   * Full source specs (with tile templates) needed to resume an interrupted
   * download after the app is closed/reopened. Only present when a download
   * has been started by this version of the app.
   */
  specs?: OfflineSourceSpec[];
  totalTiles: number;
  doneTiles: number;
  bytes: number;
  status: "downloading" | "completed" | "failed" | "cancelled";
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export interface OfflineSourceSpec {
  sourceKey: string;
  /** Tile URL template with {z} {x} {y} placeholders, e.g. "https://tileserver.summitstracker.com/peaks_tiles/{z}/{x}/{y}.pbf" */
  template: string;
  /**
   * Extra zoom levels to add on top of the region zoom when downloading
   * (e.g. raster-dem sources with tileSize 512 request tiles at z+1).
   */
  zoomOffset?: number;
  /** Tileset maximum zoom; tiles beyond this are never requested. */
  maxZoom?: number;
}

export interface DownloadOptions {
  regionId: string;
  name: string;
  bbox: [number, number, number, number];
  /** Polygon vertices [lng, lat]; only tiles whose center falls inside are downloaded */
  polygon?: Array<[number, number]>;
  minZoom: number;
  maxZoom: number;
  sources: OfflineSourceSpec[];
}

export interface DownloadProgress {
  regionId: string;
  doneTiles: number;
  totalTiles: number;
  bytes: number;
  zoom: number;
  sourceKey: string;
}

export interface ParsedTile {
  sourceKey: string;
  z: number;
  x: number;
  y: number;
}

export interface ParsedAsset {
  sourceKey: "style" | "sprite" | "glyphs";
  id: string;
  mime: string;
}
