import type { Map as MapboxMap } from "mapbox-gl";
import { warmViewport } from "./prewarm";
import { cacheStyleAssets, resolveCurrentStyle } from "./style";
import { recoverInterruptedRegions } from "./regions";
import { ensureGlobalBase } from "./globalBase";
import { resumeRegion } from "./download";

/**
 * Hooks to attach after `new mapboxgl.Map(...)` in every mobile map.
 * Returns a cleanup function.
 */
export function installOfflineMapHooks(
  map: MapboxMap,
  styleUrl: string
): () => void {
  let timer: number | undefined;

  recoverInterruptedRegions(resumeRegion).catch(() => undefined);
  ensureGlobalBase().catch(() => undefined);

  const debouncedWarm = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      warmViewport(map).catch(() => undefined);
    }, 250);
  };

  map.on("load", debouncedWarm);
  map.on("idle", debouncedWarm);
  map.on("moveend", debouncedWarm);

  const styleTimer = window.setTimeout(() => {
    if (navigator.onLine === false) return;
    resolveCurrentStyle(map, styleUrl)
      .then((resolved) => {
        if (resolved) return cacheStyleAssets(resolved);
        return undefined;
      })
      .catch(() => undefined);
  }, 2000);

  return () => {
    window.clearTimeout(timer);
    window.clearTimeout(styleTimer);
    map.off("load", debouncedWarm);
    map.off("idle", debouncedWarm);
    map.off("moveend", debouncedWarm);
  };
}

export { createOfflineTransformRequest } from "./transform";
export { prewarmInitialViewport, warmViewport, prewarmStyleAssets, prewarmWorldLowZoom } from "./prewarm";
export {
  cacheStyleAssets,
  resolveCurrentStyle,
  resolveStyleFromNetwork,
  knownSourceKeysForStyle,
} from "./style";
