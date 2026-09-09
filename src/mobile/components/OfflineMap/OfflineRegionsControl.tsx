import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { Map as MapboxMap } from "mapbox-gl";
import { Download, Trash2, X, MapPin, Undo2, Check, Loader2, Eraser } from "lucide-react";
import AppModal from "../../../shared/components/AppModal/AppModal";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { MAPBOX_ACCESS_TOKEN } from "../Map/MapUtils";
import { buildTerrainSourceSpec } from "../../../shared/utils/mapboxTerrain";
import type { OfflineRegion, OfflineSourceSpec, DownloadProgress } from "../../../shared/offline";
import {
  GLOBAL_BASE_REGION_ID,
  deleteRegion,
  listRegions,
  regionDownloader,
  resolveCurrentStyle,
  cacheStyleAssets,
  subscribeDownloadProgress,
  subscribeRegionsChanged,
  createOfflineTransformRequest,
} from "../../../shared/offline";
import { countTilesInArea } from "../../../shared/offline/prewarm";
import styles from "./OfflineRegionsControl.module.css";

const DRAW_SOURCE_ID = "offline-draw-source";
const DRAW_FILL_ID = "offline-draw-fill";
const DRAW_LINE_ID = "offline-draw-line";
const DRAW_POINTS_ID = "offline-draw-points";

const TILESERVER_URL = import.meta.env["VITE_TILESERVER_URL"] || "";

const MAX_ZOOM_LIMIT = 18;
const DEFAULT_MAX_ZOOM = 14;
/** Rate estimation window: average tiles/s over the last N ms. */
const RATE_WINDOW_MS = 10000;

type Point = [number, number];

type Screen = "list" | "draw" | "config";

function bboxFromPolygon(points: Point[]): [number, number, number, number] {
  let west = 180;
  let south = 90;
  let east = -180;
  let north = -90;
  for (const [lng, lat] of points) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return [west, south, east, north];
}

function polygonGeometry(points: Point[]): GeoJSON.Feature {
  const ring = [...points, points[0]];
  return {
    type: "Feature",
    properties: {} as GeoJSON.GeoJsonProperties,
    geometry: { type: "Polygon", coordinates: [ring] } as GeoJSON.Polygon,
  };
}

function lineGeometry(points: Point[]): GeoJSON.Feature {
  return {
    type: "Feature",
    properties: {} as GeoJSON.GeoJsonProperties,
    geometry: { type: "LineString", coordinates: points } as GeoJSON.LineString,
  };
}

function drawFeatureCollection(points: Point[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const p of points) {
    features.push({
      type: "Feature",
      properties: {} as GeoJSON.GeoJsonProperties,
      geometry: { type: "Point", coordinates: p } as GeoJSON.Point,
    });
  }
  if (points.length >= 3) {
    features.push(polygonGeometry(points));
  }
  if (points.length >= 2) {
    features.push(lineGeometry(points));
  }
  return { type: "FeatureCollection", features };
}

function makeRegionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `region-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `~${Math.max(1, Math.round(seconds))}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `~${m}m ${s}s` : `~${s}s`;
}

interface OfflineRegionsControlProps {
  open: boolean;
  onClose: () => void;
  map: MapboxMap | null;
  styleUrl: string;
}

export const OfflineRegionsControl: React.FC<OfflineRegionsControlProps> = ({
  open,
  onClose,
  map,
  styleUrl,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [screen, setScreen] = useState<Screen>("list");
  const [regions, setRegions] = useState<OfflineRegion[]>([]);
  const [progress, setProgress] = useState<Record<string, DownloadProgress>>({});
  const [points, setPoints] = useState<Point[]>([]);
  const [name, setName] = useState("");
  const [maxZoom, setMaxZoom] = useState<number>(DEFAULT_MAX_ZOOM);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OfflineRegion | null>(null);
  const [deleting, setDeleting] = useState(false);

  const mapRef = useRef<MapboxMap | null>(null);
  mapRef.current = map;

  const pointsRef = useRef<Point[]>([]);
  const drawContainerRef = useRef<HTMLDivElement | null>(null);
  const drawMapRef = useRef<mapboxgl.Map | null>(null);
  const progressSamplesRef = useRef<Record<string, { done: number; t: number }[]>>(
    {}
  );

  const recordProgressSample = useCallback((p: DownloadProgress) => {
    const now = Date.now();
    const samples = progressSamplesRef.current[p.regionId] || [];
    samples.push({ done: p.doneTiles, t: now });
    // Keep only the last RATE_WINDOW_MS of samples so the average reflects the
    // current (not the historical/startup) throughput.
    while (samples.length > 0) {
      const oldest = samples[0];
      if (!oldest || now - oldest.t <= RATE_WINDOW_MS) break;
      samples.shift();
    }
    progressSamplesRef.current[p.regionId] = samples;
  }, []);

  const computeTilesPerSecond = useCallback((regionId: string): number => {
    const samples = progressSamplesRef.current[regionId];
    if (!samples || samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (!first || !last) return 0;
    const spanSec = (last.t - first.t) / 1000;
    if (spanSec < 2) return 0;
    return Math.max(0, (last.done - first.done) / spanSec);
  }, []);

  const refreshRegions = useCallback(async () => {
    const all = await listRegions();
    setRegions(all.sort((a, b) => b.createdAt - a.createdAt));
  }, []);

  useEffect(() => {
    const unsubRegions = subscribeRegionsChanged(() => {
      refreshRegions().catch(() => undefined);
    });
    const unsubProgress = subscribeDownloadProgress((p) => {
      setProgress((prev) => ({ ...prev, [p.regionId]: p }));
      recordProgressSample(p);
    });
    refreshRegions().catch(() => undefined);
    return () => {
      unsubRegions();
      unsubProgress();
    };
  }, [refreshRegions, recordProgressSample]);

  // Reset transient state when the modal opens/closes
  useEffect(() => {
    if (!open) {
      setScreen("list");
      setDownloadError(null);
      setDownloading(false);
      pointsRef.current = [];
      setPoints([]);
    }
  }, [open]);

  // Track modal open
  useEffect(() => {
    if (open) {
      trackEvent("interaction", "offline_maps_open");
    }
  }, [open, trackEvent]);

  const updateDrawSource = useCallback((pointsToDraw: Point[]) => {
    const instance = drawMapRef.current;
    if (!instance) return;
    const source = instance.getSource(DRAW_SOURCE_ID) as
      | { setData: (data: unknown) => void }
      | undefined;
    if (!source) return;
    source.setData(drawFeatureCollection(pointsToDraw));
  }, []);

  const addPoint = useCallback(
    (point: Point) => {
      const next = [...pointsRef.current, point];
      pointsRef.current = next;
      setPoints(next);
      updateDrawSource(next);
    },
    [updateDrawSource]
  );

  // Embedded map for drawing the polygon
  useEffect(() => {
    if (!open || screen !== "draw" || !drawContainerRef.current) return;

    const container = drawContainerRef.current;
    const center = mapRef.current?.getCenter();
    const zoom = mapRef.current?.getZoom();

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    const instance = new mapboxgl.Map({
      container,
      style: styleUrl,
      center: center ? [center.lng, center.lat] : [19.5, 49.2],
      zoom: zoom ?? 8,
      attributionControl: false,
      transformRequest: createOfflineTransformRequest(),
    });
    requestAnimationFrame(() => {
      try {
        instance.resize();
      } catch {
        // ignore
      }
    });

    instance.on("error", (e) => {
      console.warn("[OfflineRegions] Draw map error:", e.error);
    });

    instance.on("load", () => {
      try {
        instance.addSource(DRAW_SOURCE_ID, {
          type: "geojson",
          data: drawFeatureCollection([]),
        });
        instance.addLayer({
          id: DRAW_FILL_ID,
          type: "fill",
          source: DRAW_SOURCE_ID,
          paint: { "fill-color": "#c2cf94", "fill-opacity": 0.3 },
        });
        instance.addLayer({
          id: DRAW_LINE_ID,
          type: "line",
          source: DRAW_SOURCE_ID,
          paint: { "line-color": "#5f7440", "line-width": 3 },
        });
        instance.addLayer({
          id: DRAW_POINTS_ID,
          type: "circle",
          source: DRAW_SOURCE_ID,
          paint: {
            "circle-color": "#5f7440",
            "circle-radius": 7,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2.5,
          },
          filter: ["==", "$type", "Point"],
        });
        if (pointsRef.current.length > 0) {
          updateDrawSource(pointsRef.current);
        }
      } catch {
        // ignore
      }
    });

    instance.on("click", (e) => {
      const lng = e.lngLat.lng;
      const lat = e.lngLat.lat;
      addPoint([lng, lat]);
    });

    drawMapRef.current = instance;
    return () => {
      try {
        instance.remove();
      } catch {
        // ignore
      }
      drawMapRef.current = null;
    };
  }, [open, screen, styleUrl, addPoint, updateDrawSource]);

  const undoPoint = useCallback(() => {
    const next = pointsRef.current.slice(0, -1);
    pointsRef.current = next;
    setPoints(next);
    updateDrawSource(next);
    trackEvent("button_click", "offline_maps_undo");
  }, [updateDrawSource, trackEvent]);

  const clearPoints = useCallback(() => {
    pointsRef.current = [];
    setPoints([]);
    updateDrawSource([]);
    trackEvent("button_click", "offline_maps_clear");
  }, [updateDrawSource, trackEvent]);

  const finishDrawing = useCallback(() => {
    const pts = pointsRef.current;
    if (pts.length < 3) return;
    trackEvent("button_click", "offline_maps_finish");
    setScreen("config");
  }, [trackEvent]);

  // ---- derived ----

  const polygon = useMemo(() => (points.length >= 3 ? points : undefined), [points]);
  const bbox = useMemo(() => (points.length >= 2 ? bboxFromPolygon(points) : null), [points]);

  const estimate = useMemo(() => {
    if (!bbox) return { tiles: 0, size: "" };
    const count = countTilesInArea(bbox, 0, maxZoom, polygon);
    const baseAvgBytes = styleUrl.includes("satellite") ? 120_000 : 40_000;
    const bytes = count * baseAvgBytes + count * 20_000;
    const tiles = count * 2;
    const size =
      bytes >= 1024 ** 3
        ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
        : `${(bytes / 1024 ** 2).toFixed(0)} MB`;
    return { tiles, size };
  }, [bbox, polygon, maxZoom, styleUrl]);

  const handleStartDownload = useCallback(async () => {
    const mainMap = mapRef.current;
    if (!mainMap || !bbox || downloading) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      const resolved = await resolveCurrentStyle(mainMap, styleUrl);
      if (!resolved) {
        setDownloadError(t("offline.errorResolve"));
        trackEvent("interaction", "offline_maps_download_failed_resolve");
        return;
      }

      const sources: OfflineSourceSpec[] = [];
      const seen = new Set<string>();
      resolved.sources.forEach((s) => {
        if (s.sourceKey !== "peaks" && !seen.has(s.sourceKey)) {
          seen.add(s.sourceKey);
          sources.push(s);
        }
      });
      // Always include the terrain DEM tileset so 3D works offline regardless
      // of whether the terrain toggle was on when the download started.
      const terrainSpec = await buildTerrainSourceSpec().catch(() => null);
      if (terrainSpec && !seen.has(terrainSpec.sourceKey)) {
        seen.add(terrainSpec.sourceKey);
        sources.push(terrainSpec);
      }
      sources.push({
        sourceKey: "peaks",
        template: `${TILESERVER_URL}/peaks_tiles/{z}/{x}/{y}.pbf`,
      });
      if (!seen.has("shelters")) {
        seen.add("shelters");
        sources.push({
          sourceKey: "shelters",
          template: `${TILESERVER_URL}/shelters_tiles/{z}/{x}/{y}.pbf`,
        });
      }
      if (sources.length === 0) {
        setDownloadError(t("offline.errorNoSources"));
        trackEvent("interaction", "offline_maps_download_failed_no_sources");
        return;
      }

      await cacheStyleAssets(resolved);

      regionDownloader
        .start({
          regionId: makeRegionId(),
          name: name.trim() || t("offline.area"),
          bbox,
          ...(polygon ? { polygon } : {}),
          minZoom: 0,
          maxZoom: Math.min(maxZoom, MAX_ZOOM_LIMIT),
          sources,
        })
        .catch((err) => {
          console.error("[OfflineRegions] Download failed:", err);
          setDownloadError(err instanceof Error ? err.message : t("offline.errorDownload"));
          trackEvent("interaction", "offline_maps_download_failed");
        });
      trackEvent(
        "interaction",
        `offline_maps_download_start_z${Math.min(maxZoom, MAX_ZOOM_LIMIT)}`
      );
    } catch (err) {
      console.error("[OfflineRegions] Download failed:", err);
      setDownloadError(err instanceof Error ? err.message : t("offline.errorDownload"));
      trackEvent("interaction", "offline_maps_download_failed");
      return;
    } finally {
      setDownloading(false);
    }

    pointsRef.current = [];
    setPoints([]);
    setScreen("list");
  }, [bbox, polygon, maxZoom, name, styleUrl, downloading, t, trackEvent]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteRegion(deleteTarget.id);
      trackEvent("interaction", "offline_maps_delete_confirm");
      setProgress((prev) => {
        const next = { ...prev };
        delete next[deleteTarget.id];
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      console.error("[OfflineRegions] Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, trackEvent]);

  const handleNavigateToRegion = useCallback(
    (region: OfflineRegion) => {
      if (!mapRef.current) return;
      const [west, south, east, north] = region.bbox;
      mapRef.current.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 48, essential: true, maxZoom: Math.min(region.maxZoom, 14) }
      );
      trackEvent("navigation", "offline_maps_go_to");
      onClose();
    },
    [onClose, trackEvent]
  );

  const handleClose = useCallback(() => {
    if (downloading) return;
    trackEvent("button_click", "offline_maps_close");
    onClose();
  }, [downloading, onClose, trackEvent]);

  const anyActive = regions.some((region) => {
    const p = progress[region.id];
    const total = p ? p.totalTiles : region.totalTiles;
    const done = p ? p.doneTiles : region.doneTiles;
    return (
      region.status === "downloading" &&
      (regionDownloader.isRunning(region.id) || done < total)
    );
  });

  // The world-wide low-zoom base layer is always cached and never shown in or
  // removable from this list.
  const visibleRegions = regions.filter(
    (region) => region.id !== GLOBAL_BASE_REGION_ID
  );

  return (
    <AppModal open={open} onClose={handleClose} variant="fullscreen" contentClassName={styles["offline-regions-modal"]}>
      <div className={styles["offline-regions"]}>
        {/* Header */}
        <div className={styles["offline-regions__header"]}>
          <span className={`${styles["offline-regions__title"]} typography-title-medium`}>
            {t("offline.title")}
          </span>
          <button
            className={styles["offline-regions__icon-btn"]}
            onClick={handleClose}
            disabled={downloading}
            title={t("common.close")}
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        {screen === "list" && (
          <div className={styles["offline-regions__body"]}>
            <div className={styles["offline-regions__list"]}>
              {visibleRegions.length === 0 && (
                <div className={styles["offline-regions__empty"]}>
                  <MapPin size={28} />
                  <span className="typography-body-small">{t("offline.empty")}</span>
                </div>
              )}

              {visibleRegions.map((region) => {
                const p = progress[region.id];
                const total = p ? p.totalTiles : region.totalTiles;
                const done = p ? p.doneTiles : region.doneTiles;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const isActive =
                  region.status === "downloading" &&
                  (regionDownloader.isRunning(region.id) || done < total);
                const displayBytes = p ? p.bytes : region.bytes;
                const rate = computeTilesPerSecond(region.id);
                const remaining =
                  isActive && rate > 0 && total > done
                    ? Math.ceil((total - done) / rate)
                    : null;

                return (
                  <div
                    key={region.id}
                    className={`${styles["offline-regions__item"]} ${
                      region.status === "completed" ? styles["offline-regions__item--go-to"] : ""
                    }`}
                    onClick={
                      region.status === "completed" ? () => handleNavigateToRegion(region) : undefined
                    }
                    role={region.status === "completed" ? "button" : undefined}
                    aria-label={region.status === "completed" ? t("offline.goTo") : undefined}
                  >
                    <div className={styles["offline-regions__item-main"]}>
                      <div className={styles["offline-regions__item-title"]}>
                        <span className="typography-body-medium">{region.name}</span>
                        <span
                          className={`${styles["offline-regions__status"]} typography-body-small ${
                            isActive
                              ? styles["offline-regions__status--active"]
                              : region.status === "completed"
                                ? styles["offline-regions__status--done"]
                                : styles["offline-regions__status--failed"]
                          }`}
                        >
                          {isActive
                            ? t("offline.downloading")
                            : region.status === "completed"
                              ? t("offline.ready")
                              : t(`offline.${region.status}`)}
                        </span>
                      </div>
                      <div className={styles["offline-regions__item-meta"]}>
                        <span className="typography-body-small">
                          {total.toLocaleString()} {t("offline.tiles")} · {formatBytes(displayBytes)} ·{" "}
                          {t("offline.zoom", { min: region.minZoom, max: region.maxZoom })}
                        </span>
                      </div>
                      {isActive && (
                        <div className={styles["offline-regions__progress"]}>
                          <div
                            className={styles["offline-regions__progress-bar"]}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      {isActive && (
                        <div className={styles["offline-regions__progress-meta"]}>
                          <span className="typography-body-small">
                            {pct}%
                            {remaining !== null
                              ? ` · ${t("offline.eta", { eta: formatEta(remaining) })}`
                              : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={styles["offline-regions__item-actions"]}>
                      <button
                        className={styles["offline-regions__icon-btn"]}
                        onClick={(e) => {
                          e.stopPropagation();
                          trackEvent("button_click", "offline_maps_delete_open");
                          setDeleteTarget(region);
                        }}
                        title={t("offline.delete")}
                        aria-label={t("offline.delete")}
                        disabled={
                          region.status === "downloading" && regionDownloader.isRunning(region.id)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {anyActive && (
              <div className={`${styles["offline-regions__warning"]} ${styles["offline-regions__warning--list"]} typography-body-small`}>
                {t("offline.keepOpen")}
              </div>
            )}

            <div className={styles["offline-regions__footer"]}>
              <button
                className={`${styles["offline-regions__primary-btn"]} typography-button-medium`}
                onClick={() => {
                  trackEvent("button_click", "offline_maps_new_area");
                  pointsRef.current = [];
                  setPoints([]);
                  setDownloadError(null);
                  setScreen("draw");
                }}
              >
                <Download size={16} />
                {t("offline.newArea")}
              </button>
            </div>
          </div>
        )}

        {screen === "draw" && (
          <div className={styles["offline-regions__draw"]}>
            <div className={styles["offline-regions__draw-map"]} ref={drawContainerRef} />
            <div className={styles["offline-regions__draw-footer"]}>
              <span className="typography-body-small">{t("offline.drawHint")}</span>
              <div className={styles["offline-regions__draw-actions"]}>
                <button
                  className={`${styles["offline-regions__secondary-btn"]} ${styles["offline-regions__secondary-btn--icon"]} typography-button-medium`}
                  onClick={undoPoint}
                  disabled={points.length === 0}
                  title={t("offline.undo")}
                  aria-label={t("offline.undo")}
                >
                  <Undo2 size={18} />
                </button>
                <button
                  className={`${styles["offline-regions__secondary-btn"]} ${styles["offline-regions__secondary-btn--icon"]} typography-button-medium`}
                  onClick={clearPoints}
                  disabled={points.length === 0}
                  title={t("offline.clear")}
                  aria-label={t("offline.clear")}
                >
                  <Eraser size={18} />
                </button>
                <button
                  className={`${styles["offline-regions__primary-btn"]} typography-button-medium`}
                  onClick={finishDrawing}
                  disabled={points.length < 3}
                >
                  <Check size={16} />
                  {t("offline.finish")}
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === "config" && (
          <div className={styles["offline-regions__config"]}>
            <div className={styles["offline-regions__config-scroll"]}>
              <label className={styles["offline-regions__field"]}>
                <span className="typography-body-medium">{t("offline.configName")}</span>
                <input
                  className={`${styles["offline-regions__input"]} typography-body-small`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("offline.namePlaceholder")}
                />
              </label>

              <div className={styles["offline-regions__field"]}>
                <div className={styles["offline-regions__zoom-header"]}>
                  <span className="typography-body-medium">{t("offline.maxZoomLabel")}</span>
                  <span className={`${styles["offline-regions__zoom-value"]} typography-body-medium`}>
                    {t("offline.zoomRange", { min: 0, max: maxZoom })}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={MAX_ZOOM_LIMIT}
                  step={1}
                  value={maxZoom}
                  onChange={(e) => setMaxZoom(Number(e.target.value))}
                />
                <div className={styles["offline-regions__zoom-scale"]}>
                  {Array.from({ length: MAX_ZOOM_LIMIT + 1 }, (_, z) => (
                    <span
                      key={z}
                      className={`${styles["offline-regions__zoom-scale-tick"]} ${
                        z <= maxZoom ? styles["offline-regions__zoom-scale-tick--on"] : ""
                      }`}
                    />
                  ))}
                </div>
                {maxZoom > 16 && (
                  <p className={`${styles["offline-regions__warning"]} typography-body-small`}>
                    {t("offline.zoomExpensive")}
                  </p>
                )}
              </div>

              <div className={styles["offline-regions__estimate"]}>
                <span className="typography-body-medium">
                  {t("offline.estimate", {
                    count: estimate.tiles.toLocaleString(),
                    size: estimate.size,
                  })}
                </span>
              </div>

              {downloadError && (
                <div className={styles["offline-regions__error"]}>
                  <span className="typography-body-small">{downloadError}</span>
                </div>
              )}
            </div>

            <div className={styles["offline-regions__footer"]}>
              <button
                className={`${styles["offline-regions__secondary-btn"]} typography-button-medium`}
                onClick={() => {
                  trackEvent("button_click", "offline_maps_redraw");
                  setScreen("draw");
                }}
                disabled={downloading}
              >
                {t("offline.redraw")}
              </button>
              <button
                className={`${styles["offline-regions__primary-btn"]} typography-button-medium`}
                onClick={handleStartDownload}
                disabled={downloading || estimate.tiles === 0}
              >
                {downloading ? (
                  <Loader2 size={16} className={styles["offline-regions__spin"]} />
                ) : (
                  <Download size={16} />
                )}
                {downloading ? t("offline.starting") : t("offline.download")}
              </button>
            </div>
          </div>
        )}
      </div>

      <AppModal
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        variant="dialog"
        contentClassName={styles["offline-regions__delete-modal"]}
        ariaLabel={t("offline.deleteTitle")}
      >
        <div className={styles["offline-regions__delete"]}>
          <h2 className="typography-title-large">{t("offline.deleteTitle")}</h2>
          <p className="typography-body-medium">
            {t("offline.deleteMessage", {
              name: deleteTarget?.name ?? "",
              tiles: (deleteTarget?.totalTiles ?? 0).toLocaleString(),
              size: formatBytes(deleteTarget?.bytes ?? 0),
            })}
          </p>
          <div className={styles["offline-regions__delete-actions"]}>
            <button
              className={`${styles["offline-regions__secondary-btn"]} typography-label-medium`}
              onClick={() => {
                trackEvent("button_click", "offline_maps_delete_cancel");
                setDeleteTarget(null);
              }}
              disabled={deleting}
            >
              {t("offline.deleteCancel")}
            </button>
            <button
              className={`${styles["offline-regions__delete-btn"]} typography-label-medium`}
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 size={16} className={styles["offline-regions__spin"]} />
              ) : (
                <Trash2 size={16} />
              )}
              {deleting ? t("offline.deleting") : t("offline.deleteConfirm")}
            </button>
          </div>
        </div>
      </AppModal>
    </AppModal>
  );
};
