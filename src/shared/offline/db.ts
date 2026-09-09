import { openDB, type IDBPDatabase } from "idb";
import type { AssetRecord, OfflineRegion, TileRecord } from "./types";

const DB_NAME = "summits-offline-maps";
const DB_VERSION = 2;

export type OfflineDB = IDBPDatabase;

let dbPromise: Promise<OfflineDB> | null = null;

export function getDB(): Promise<OfflineDB> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const tiles = db.createObjectStore("tiles", {
            keyPath: ["sourceKey", "z", "x", "y"],
          });
          tiles.createIndex("regionId", "regionId");
          tiles.createIndex("cachedAt", "cachedAt");
          tiles.createIndex("z", "z");
          const assets = db.createObjectStore("assets", {
            keyPath: ["sourceKey", "id"],
          });
          assets.createIndex("regionId", "regionId");
          db.createObjectStore("regions", { keyPath: "id" });
        } else {
          // During upgradeneeded you cannot start a new transaction - use the
          // versionchange transaction idb passes as the 4th argument instead.
          const tilesStore = transaction.objectStore("tiles");
          if (!tilesStore.indexNames.contains("z")) {
            (tilesStore as unknown as IDBObjectStore).createIndex("z", "z");
          }
        }
      },
    }).catch((error) => {
      // Don't cache a rejected promise forever: a failed open (e.g. a cancelled
      // version change) must be retried by the next getDB() call.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export type TileKey = [string, number, number, number];
export type AssetKey = [string, string];

export function makeTileKey(
  sourceKey: string,
  z: number,
  x: number,
  y: number
): TileKey {
  return [sourceKey, z, x, y];
}

// ---------- tiles ----------

export async function putTile(record: TileRecord): Promise<void> {
  try {
    const db = await getDB();
    await db.put("tiles", record);
  } catch (err) {
    console.warn("[OfflineMaps] putTile failed:", err);
  }
}

export async function putTiles(records: TileRecord[]): Promise<void> {
  if (records.length === 0) return;
  try {
    const db = await getDB();
    const tx = db.transaction("tiles", "readwrite");
    await Promise.all([...records.map((r) => tx.store.put(r)), tx.done]);
  } catch (err) {
    console.warn("[OfflineMaps] putTiles failed:", err);
  }
}

export async function getTile(
  sourceKey: string,
  z: number,
  x: number,
  y: number
): Promise<TileRecord | undefined> {
  try {
    const db = await getDB();
    return (await db.get("tiles", makeTileKey(sourceKey, z, x, y))) as
      | TileRecord
      | undefined;
  } catch (err) {
    console.warn("[OfflineMaps] getTile failed:", err);
    return undefined;
  }
}

export async function getTilesByKeys(
  keys: TileKey[]
): Promise<TileRecord[]> {
  if (keys.length === 0) return [];
  try {
    const db = await getDB();
    const records = await Promise.all(keys.map((key) => db.get("tiles", key)));
    return records.filter((r): r is TileRecord => Boolean(r)) as TileRecord[];
  } catch (err) {
    console.warn("[OfflineMaps] getTilesByKeys failed:", err);
    return [];
  }
}

/** Every cached tile (any source/region) at zoom <= maxZ. Used to prewarm the low-zoom world. */
export async function getTilesUpToZoom(maxZ: number): Promise<TileRecord[]> {
  try {
    const db = await getDB();
    const records: TileRecord[] = [];
    for (let z = 0; z <= maxZ; z++) {
      const recs = (await db.getAllFromIndex("tiles", "z", z)) as TileRecord[];
      records.push(...recs);
    }
    return records;
  } catch (err) {
    console.warn("[OfflineMaps] getTilesUpToZoom failed:", err);
    return [];
  }
}

const DELETE_BATCH_SIZE = 500;

/**
 * Delete every record in a store owned by regionId by streaming an index
 * cursor, so only one record is ever held in memory at a time. Large regions
 * used to be deleted via getAllFromIndex(), which loaded every tile's bytes
 * into memory at once and crashed on big zones. Deletion is chunked into
 * short transactions and yields between batches so the UI thread stays
 * responsive no matter how big the region is.
 */
async function deleteRecordsByRegionIndex(
  storeName: "tiles" | "assets",
  regionId: string
): Promise<void> {
  try {
    const db = await getDB();
    for (;;) {
      let deleted = 0;
      const tx = db.transaction(storeName, "readwrite");
      let cursor = await tx
        .store
        .index("regionId")
        .openCursor(IDBKeyRange.only(regionId));
      while (cursor && deleted < DELETE_BATCH_SIZE) {
        await cursor.delete();
        deleted++;
        cursor = await cursor.continue();
      }
      await tx.done;
      if (deleted < DELETE_BATCH_SIZE) break;
      // Yield to the event loop between batches so other work (paint, input,
      // active downloads) is not starved during a very large delete.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  } catch (err) {
    console.warn(`[OfflineMaps] deleteRecordsByRegionIndex(${storeName}) failed:`, err);
  }
}

export async function deleteTilesByRegion(regionId: string): Promise<void> {
  await deleteRecordsByRegionIndex("tiles", regionId);
}

/** Count of tiles not owned by any region (browse cache). */
export async function countBrowseTiles(): Promise<number> {
  try {
    const db = await getDB();
    return await db.countFromIndex("tiles", "regionId", null as unknown as string);
  } catch {
    return 0;
  }
}

// ---------- assets ----------

export async function putAsset(record: AssetRecord): Promise<void> {
  try {
    const db = await getDB();
    await db.put("assets", record);
  } catch (err) {
    console.warn("[OfflineMaps] putAsset failed:", err);
  }
}

export async function getAsset(
  sourceKey: string,
  id: string
): Promise<AssetRecord | undefined> {
  try {
    const db = await getDB();
    return (await db.get("assets", [sourceKey, id] as AssetKey)) as
      | AssetRecord
      | undefined;
  } catch (err) {
    console.warn("[OfflineMaps] getAsset failed:", err);
    return undefined;
  }
}

/** Every cached style/sprite/glyph asset. Used to prewarm the memory cache. */
export async function getAllAssets(): Promise<AssetRecord[]> {
  try {
    const db = await getDB();
    return (await db.getAll("assets")) as AssetRecord[];
  } catch (err) {
    console.warn("[OfflineMaps] getAllAssets failed:", err);
    return [];
  }
}

export async function deleteAssetsByRegion(regionId: string): Promise<void> {
  await deleteRecordsByRegionIndex("assets", regionId);
}

// ---------- regions ----------

export async function putRegion(region: OfflineRegion): Promise<void> {
  try {
    const db = await getDB();
    await db.put("regions", region);
  } catch (err) {
    console.warn("[OfflineMaps] putRegion failed:", err);
  }
}

export async function getRegion(
  regionId: string
): Promise<OfflineRegion | undefined> {
  try {
    const db = await getDB();
    return (await db.get("regions", regionId)) as OfflineRegion | undefined;
  } catch (err) {
    console.warn("[OfflineMaps] getRegion failed:", err);
    return undefined;
  }
}

export async function getAllRegions(): Promise<OfflineRegion[]> {
  try {
    const db = await getDB();
    return (await db.getAll("regions")) as OfflineRegion[];
  } catch (err) {
    console.warn("[OfflineMaps] getAllRegions failed:", err);
    return [];
  }
}

export async function deleteRegionRecord(regionId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("regions", regionId);
  } catch (err) {
    console.warn("[OfflineMaps] deleteRegionRecord failed:", err);
  }
}

export async function getTotalTileBytes(): Promise<number> {
  try {
    const db = await getDB();
    let total = 0;
    let cursor = await db.transaction("tiles").store.openCursor();
    while (cursor) {
      const rec = cursor.value as TileRecord;
      total += rec.bytes.byteLength;
      cursor = await cursor.continue();
    }
    return total;
  } catch {
    return 0;
  }
}
