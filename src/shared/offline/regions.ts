import type { DownloadProgress, OfflineRegion } from "./types";
import {
  deleteAssetsByRegion,
  deleteRegionRecord,
  deleteTilesByRegion,
  getAllRegions,
  putRegion,
} from "./db";

const regionListeners = new Set<() => void>();
const progressListeners = new Set<(p: DownloadProgress) => void>();

let interruptedRecoveryDone = false;

/**
 * On a fresh page/app load any region still marked "downloading" was
 * interrupted by closing the app (the downloader runs in-memory). When the
 * region has persisted source specs and we're online, `resume` re-starts the
 * download from where it stopped (already-downloaded tiles are skipped).
 * Otherwise the region is marked "cancelled" so it is no longer stuck and can
 * be deleted. Runs at most once per page session.
 */
export async function recoverInterruptedRegions(
  resume?: (region: OfflineRegion) => Promise<void>
): Promise<void> {
  if (interruptedRecoveryDone) return;
  interruptedRecoveryDone = true;
  try {
    const all = await getAllRegions();
    const interrupted = all.filter((r) => r.status === "downloading");
    if (interrupted.length === 0) return;
    const now = Date.now();
    for (const region of interrupted) {
      const canResume =
        typeof resume === "function" &&
        navigator.onLine !== false &&
        Array.isArray(region.specs) &&
        region.specs.length > 0;
      if (canResume) {
        await resume(region);
      } else {
        await putRegion({ ...region, status: "cancelled" as const, updatedAt: now });
      }
    }
    notifyRegionsChanged();
  } catch {
    // ignore
  }
}

export function subscribeRegionsChanged(fn: () => void): () => void {
  regionListeners.add(fn);
  return () => {
    regionListeners.delete(fn);
  };
}

export function notifyRegionsChanged(): void {
  regionListeners.forEach((fn) => fn());
}

export function subscribeDownloadProgress(
  fn: (p: DownloadProgress) => void
): () => void {
  progressListeners.add(fn);
  return () => {
    progressListeners.delete(fn);
  };
}

export function emitDownloadProgress(p: DownloadProgress): void {
  progressListeners.forEach((fn) => fn(p));
}

export async function listRegions(): Promise<OfflineRegion[]> {
  return getAllRegions();
}

/** The world-wide low-zoom cache must always exist; it can never be deleted. */
const PROTECTED_REGION_ID = "global-base-world-z0-4";

export async function deleteRegion(regionId: string): Promise<void> {
  if (regionId === PROTECTED_REGION_ID) return;
  await deleteTilesByRegion(regionId);
  await deleteAssetsByRegion(regionId);
  await deleteRegionRecord(regionId);
  notifyRegionsChanged();
}
