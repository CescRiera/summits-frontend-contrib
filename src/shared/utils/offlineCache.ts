import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "summits-offline";
const DB_VERSION = 3;

interface CachedEntry<T> {
  id: number;
  data: T;
  cachedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("peak-basic-names", { keyPath: "id" });
        }
        if (oldVersion < 2) {
          db.createObjectStore("peak-details", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function cachePeakBasicName(
  peakId: number,
  data: unknown
): Promise<void> {
  try {
    const db = await getDB();
    await db.put("peak-basic-names", {
      id: peakId,
      data,
      cachedAt: Date.now(),
    } as CachedEntry<unknown>);
  } catch (err) {
    console.warn("[OfflineCache] Failed to cache peak basic name:", err);
  }
}

export async function getCachedPeakBasicName<T>(
  peakId: number
): Promise<T | null> {
  try {
    const db = await getDB();
    const entry = await db.get("peak-basic-names", peakId);
    if (!entry) return null;
    return (entry as CachedEntry<T>).data;
  } catch (err) {
    console.warn("[OfflineCache] Failed to read cached peak basic name:", err);
    return null;
  }
}

export async function cachePeakDetails(
  peakId: number,
  data: unknown
): Promise<void> {
  try {
    const db = await getDB();
    await db.put("peak-details", {
      id: peakId,
      data,
      cachedAt: Date.now(),
    } as CachedEntry<unknown>);
  } catch (err) {
    console.warn("[OfflineCache] Failed to cache peak details:", err);
  }
}

export async function getCachedPeakDetails<T>(
  peakId: number
): Promise<T | null> {
  try {
    const db = await getDB();
    const entry = await db.get("peak-details", peakId);
    if (!entry) return null;
    return (entry as CachedEntry<T>).data;
  } catch (err) {
    console.warn("[OfflineCache] Failed to read cached peak details:", err);
    return null;
  }
}

export async function getOfflineCacheSize(): Promise<number> {
  try {
    const db = await getDB();
    const basicNamesCount = await db.count("peak-basic-names");
    const detailsCount = await db.count("peak-details");
    return basicNamesCount + detailsCount;
  } catch {
    return 0;
  }
}
