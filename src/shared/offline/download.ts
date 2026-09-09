import type {
  DownloadOptions,
  OfflineRegion,
  TileRecord,
} from "./types";
import { putRegion, putTiles, getTile } from "./db";
import { pointInPolygon, tileCenterLngLat, tileCoordsInBounds } from "./prewarm";
import {
  emitDownloadProgress,
  notifyRegionsChanged,
} from "./regions";
import { App } from "@capacitor/app";
import { BackgroundTask } from "@capawesome/capacitor-background-task";
import { Capacitor } from "@capacitor/core";

const MAX_CONCURRENCY = 96;
const RETRIES = 2;
const FETCH_TIMEOUT = 8000;
const RETRY_BACKOFF_MS = 400;
const WRITE_BATCH_SIZE = 100;
const MAX_PENDING_WRITES = WRITE_BATCH_SIZE * 4;

type DownloadTask = {
  z: number;
  x: number;
  y: number;
  sourceKey: string;
  url: string;
};

function tileInsidePolygon(
  x: number,
  y: number,
  z: number,
  polygon: Array<[number, number]>
): boolean {
  const { lng, lat } = tileCenterLngLat(x, y, z);
  return pointInPolygon(lng, lat, polygon);
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response | null> {
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

function mimeForUrl(url: string): string {
  if (/\.(png|pngraw)(\?|$)/i.test(url)) return "image/png";
  if (/\.(jpe?g)(\?|$)/i.test(url)) return "image/jpeg";
  if (/\.(webp)(\?|$)/i.test(url)) return "image/webp";
  return "application/octet-stream";
}

async function fetchTile(
  task: DownloadTask
): Promise<Pick<TileRecord, "sourceKey" | "z" | "x" | "y" | "bytes" | "mime"> | null> {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const res = await fetchWithTimeout(task.url, FETCH_TIMEOUT);
    if (!res) continue;
    if (res.status === 429 || res.status >= 500) {
      if (attempt < RETRIES) await sleep(RETRY_BACKOFF_MS * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    if (!bytes || bytes.byteLength === 0) return null;
    return {
      sourceKey: task.sourceKey,
      z: task.z,
      x: task.x,
      y: task.y,
      bytes,
      mime: mimeForUrl(task.url),
    };
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// ---------- screen wake lock ----------
// Phones auto-lock after a few seconds of inactivity, which stops in-flight
// fetches (or the OS kills the WebView). A screen wake lock keeps the screen
// on while a download is running so it is not throttled or interrupted by the
// screen turning off. Falls back to a no-op on platforms without wake lock
// support (e.g. iOS before 16.4).

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener?: (type: string, cb: () => void) => void;
};

let wakeLock: WakeLockSentinelLike | null = null;

function wakeLockApi():
  | { request: (type: "screen") => Promise<WakeLockSentinelLike> }
  | null {
  if (typeof navigator === "undefined") return null;
  const api = (navigator as unknown as {
    wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
  }).wakeLock;
  return api ?? null;
}

async function acquireWakeLock(): Promise<void> {
  const api = wakeLockApi();
  if (!api || wakeLock) return;
  try {
    wakeLock = await api.request("screen");
    wakeLock?.addEventListener?.("release", () => {
      wakeLock = null;
    });
  } catch {
    // Not supported or permission denied; the download just proceeds without it.
    wakeLock = null;
  }
}

async function releaseWakeLock(): Promise<void> {
  if (!wakeLock) return;
  try {
    await wakeLock.release();
  } catch {
    // ignore
  }
  wakeLock = null;
}

// OSes auto-release the wake lock when the app is backgrounded or the screen
// is interacted with; re-acquire whenever the app is visible again while a
// download is still running.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      regionDownloader.hasRunningDownloads()
    ) {
      void acquireWakeLock();
    }
  });
}

// IndexedDB writes are batched into shared transactions so the download loop
// never blocks a worker on a per-tile transaction.
const pendingWrites: TileRecord[] = [];
let writeChain: Promise<void> = Promise.resolve();

let tilesInFlight = 0;

async function queueTileRecord(
  rec: Pick<TileRecord, "sourceKey" | "z" | "x" | "y" | "bytes" | "mime">,
  regionId: string
): Promise<void> {
  tilesInFlight++;
  pendingWrites.push({ ...rec, regionId, cachedAt: Date.now() });
  if (pendingWrites.length >= WRITE_BATCH_SIZE) {
    const batch = pendingWrites.splice(0, WRITE_BATCH_SIZE);
    writeChain = writeChain.then(async () => {
      await putTiles(batch);
      tilesInFlight -= batch.length;
    });
  }

  // Backpressure: if the number of tiles waiting to be written grows too large,
  // block this worker until the pending writes catch up.
  if (tilesInFlight >= MAX_PENDING_WRITES) {
    await writeChain;
  }
}

async function flushTileWrites(): Promise<void> {
  if (pendingWrites.length > 0) {
    const batch = pendingWrites.splice(0, pendingWrites.length);
    writeChain = writeChain.then(async () => {
      await putTiles(batch);
      tilesInFlight = 0;
    });
  }
  await writeChain;
}

async function runPool<T>(
  tasks: T[],
  concurrency: number,
  worker: (task: T) => Promise<void>
): Promise<void> {
  const queue = [...tasks];
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (index < queue.length) {
      const current = index++;
      const task = queue[current];
      if (task !== undefined) {
        await worker(task);
      }
    }
  });
  await Promise.all(runners);
}

export class RegionDownloader {
  private running = new Set<string>();
  private cancelled = new Set<string>();

  isRunning(regionId: string): boolean {
    return this.running.has(regionId);
  }

  isCancelled(regionId: string): boolean {
    return this.cancelled.has(regionId);
  }

  hasRunningDownloads(): boolean {
    return this.running.size > 0;
  }

  cancel(regionId: string): void {
    this.cancelled.add(regionId);
  }

  async start(opts: DownloadOptions): Promise<void> {
    if (this.running.has(opts.regionId)) return;
    this.running.add(opts.regionId);
    this.cancelled.delete(opts.regionId);
    if (this.running.size === 1) {
      void acquireWakeLock();
    }
    try {
      await this.run(opts);
    } finally {
      this.running.delete(opts.regionId);
      if (this.running.size === 0) {
        void releaseWakeLock();
      }
      notifyRegionsChanged();
    }
  }

  /**
   * Restart a download that was interrupted (e.g. the app was closed). Existing
   * tiles in IndexedDB are skipped by `run`, so this effectively resumes the
   * download from where it stopped.
   */
  async resume(region: OfflineRegion): Promise<void> {
    if (!region.specs || region.specs.length === 0) return;
    await this.start({
      regionId: region.id,
      name: region.name,
      bbox: region.bbox,
      ...(region.polygon ? { polygon: region.polygon } : {}),
      minZoom: region.minZoom,
      maxZoom: region.maxZoom,
      sources: region.specs,
    });
  }

  private async run(opts: DownloadOptions): Promise<void> {
    const { regionId, name, bbox, minZoom, maxZoom, sources, polygon } = opts;

    const tasks: DownloadTask[] = [];
    for (let z = minZoom; z <= maxZoom; z++) {
      for (const [x, y] of tileCoordsInBounds(bbox, z)) {
        if (polygon && !tileInsidePolygon(x, y, z, polygon)) continue;
        for (const spec of sources) {
          // Sources like terrain (tileSize 512 raster-dem) are requested one
          // zoom above the map zoom and capped at their tileset maxzoom.
          const zoomOffset = spec.zoomOffset ?? 0;
          const sourceZ = z + zoomOffset;
          if (spec.maxZoom !== undefined && sourceZ > spec.maxZoom) continue;
          const addTask = (sz: number) =>
            tasks.push({
              z: sz,
              x,
              y,
              sourceKey: spec.sourceKey,
              url: spec.template
                .replace("{z}", String(sz))
                .replace("{x}", String(x))
                .replace("{y}", String(y)),
            });
          addTask(sourceZ);
          // raster-dem sources are also requested one zoom below the map zoom;
          // at the lowest map zoom that means source zoom 0, which is otherwise
          // never reached with a positive zoomOffset.
          if (z === 0 && zoomOffset > 0) addTask(0);
        }
      }
    }

    const totalTiles = tasks.length;
    const now = Date.now();

    const region: OfflineRegion = {
      id: regionId,
      name,
      bbox,
      ...(polygon ? { polygon } : {}),
      minZoom,
      maxZoom,
      sources: sources.map((s) => s.sourceKey),
      specs: sources,
      totalTiles,
      doneTiles: 0,
      bytes: 0,
      status: "downloading",
      createdAt: now,
      updatedAt: now,
    };
    await putRegion(region);
    notifyRegionsChanged();

    let doneTiles = 0;
    let bytes = 0;
    let lastEmit = 0;

    await runPool(tasks, MAX_CONCURRENCY, async (task) => {
      if (this.cancelled.has(regionId)) return;

      // Skip fetching if the tile is already present in the database.
      const existing = await getTile(task.sourceKey, task.z, task.x, task.y);
      if (existing) {
        bytes += existing.bytes.byteLength;
        doneTiles++;
        const nowMs = Date.now();
        if (doneTiles === totalTiles || nowMs - lastEmit > 300) {
          lastEmit = nowMs;
          await putRegion({
            ...region,
            doneTiles,
            bytes,
            status: "downloading",
            updatedAt: nowMs,
          });
          emitDownloadProgress({
            regionId,
            doneTiles,
            totalTiles,
            bytes,
            zoom: task.z,
            sourceKey: task.sourceKey,
          });
        }
        return;
      }

      const rec = await fetchTile(task);
      if (rec) {
        // Queue the write asynchronously to avoid blocking HTTP fetch concurrency.
        void queueTileRecord(rec, regionId);
        bytes += rec.bytes.byteLength;
      }
      doneTiles++;
      const nowMs = Date.now();
      if (doneTiles === totalTiles || nowMs - lastEmit > 300) {
        lastEmit = nowMs;
        await putRegion({
          ...region,
          doneTiles,
          bytes,
          status: "downloading",
          updatedAt: nowMs,
        });
        emitDownloadProgress({
          regionId,
          doneTiles,
          totalTiles,
          bytes,
          zoom: task.z,
          sourceKey: task.sourceKey,
        });
      }
    });

    await flushTileWrites();

    const finalStatus = this.cancelled.has(regionId)
      ? ("cancelled" as const)
      : ("completed" as const);
    await putRegion({
      ...region,
      doneTiles,
      bytes,
      status: finalStatus,
      updatedAt: Date.now(),
    });
    emitDownloadProgress({
      regionId,
      doneTiles,
      totalTiles,
      bytes,
      zoom: maxZoom,
      sourceKey: sources[0]?.sourceKey || "",
    });
  }
}

export const regionDownloader = new RegionDownloader();

export async function resumeRegion(region: OfflineRegion): Promise<void> {
  await regionDownloader.resume(region);
}

// Handle background execution when the app is minimized.
if (Capacitor.isNativePlatform()) {
  App.addListener("appStateChange", async (state) => {
    if (!state.isActive) {
      if (regionDownloader.hasRunningDownloads()) {
        try {
          const taskId = await BackgroundTask.beforeExit(async () => {
            while (regionDownloader.hasRunningDownloads()) {
              await sleep(1000);
            }
            BackgroundTask.finish({ taskId });
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("[RegionDownloader] BackgroundTask registration failed:", err);
        }
      }
    }
  });
}
