import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import mapboxgl, {
  Map as MapboxMap,
  type ExpressionSpecification,
  type MapLayerMouseEvent,
} from "mapbox-gl";
import type { SelectedManualPeak } from "../../../../shared/hooks/useManualPeakSelection";
import {
  MAPBOX_ACCESS_TOKEN,
  PEAK_ICONS,
} from "../../../components/Map/MapUtils";
import {
  PEAK_LABEL_OFFSET,
  createPeakLabelLayout,
  createSelectablePeakIconAnchorExpression,
  createSelectablePeakIconSizeExpression,
  getPeakLabelPaint,
} from "../../../../shared/utils/mapboxPeakPresentation";
import {
  createOfflineTransformRequest,
  installOfflineMapHooks,
  prewarmInitialViewport,
} from "../../../../shared/offline";
import styles from "./AddManualPeaksMap.module.css";

interface AddManualPeaksMapProps {
  selectedPeaks: SelectedManualPeak[];
  onPeakSelect: (peakId: number, peakName: string) => void;
  loading: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
}

const DEFAULT_CENTER: [number, number] = [2.0, 42.0];
const DEFAULT_ZOOM = 1;

/**
 * Mobile map showing discovery peaks with elevation markers
 * Minimal UI (tile layer + markers only)
 * Clicking markers selects the peak
 */
export const AddManualPeaksMap: React.FC<AddManualPeaksMapProps> = ({
  selectedPeaks,
  onPeakSelect,
  loading,
  t,
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const onPeakSelectRef = useRef(onPeakSelect);

  // Keep ref in sync with latest callback
  useEffect(() => {
    onPeakSelectRef.current = onPeakSelect;
  }, [onPeakSelect]);

  // Initialize map - only runs once
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    let cancelled = false;
    let offlineHooksCleanup: (() => void) | undefined;

    const boot = async () => {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

      const STYLE_URL = "mapbox://styles/mapbox/streets-v12";
      // Warm offline tiles/assets BEFORE constructing the map so the sync
      // transformRequest can serve them from the memory cache when offline.
      await prewarmInitialViewport({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        styleUrl: STYLE_URL,
      });
      if (cancelled) return;

      const map = new mapboxgl.Map({
        container,
        style: STYLE_URL,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
        minZoom: 1,
        maxPitch: 60,
        projection: "mercator",
        dragRotate: false,
        touchZoomRotate: false,
        touchPitch: false,
        pitchWithRotate: false,
        transformRequest: createOfflineTransformRequest(),
      });

      offlineHooksCleanup = installOfflineMapHooks(map, STYLE_URL);

      map.on("load", async () => {
      // Load all peak icons
      try {
        for (const [key, url] of Object.entries(PEAK_ICONS)) {
          if (!map.hasImage(key)) {
            await new Promise<void>((resolve) => {
              map.loadImage(url as string, (err, image) => {
                if (!err && image) {
                  map.addImage(key, image);
                }
                resolve();
              });
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load peak icons:", err);
      }

      // Add vector source for ALL world peaks
      const tileserverUrl = import.meta.env["VITE_TILESERVER_URL"];
      if (!map.getSource("peaks-source")) {
        map.addSource("peaks-source", {
          type: "vector",
          tiles: [`${tileserverUrl}/peaks_tiles/{z}/{x}/{y}.pbf`],
          minzoom: 0,
          maxzoom: 15,
        });
      }

      // Hide default Mapbox peak/point labels to avoid duplicates
      const defaultPointLayers = [
        "poi-label",
        "natural-point-label",
        "natural-line-label",
      ];
      defaultPointLayers.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", "none");
        }
      });

      // Also hide Mapbox's built-in peak labels specifically if they are in other layers
      const mapboxStyle = map.getStyle();
      if (mapboxStyle && mapboxStyle.layers) {
        mapboxStyle.layers.forEach((layer) => {
          if (
            layer.id.includes("peak") || 
            layer.id.includes("mountain") ||
            (layer.layout && (layer.layout as any)["text-field"] && (layer.layout as any)["text-field"].toString().includes("name"))
          ) {
            if (!layer.id.startsWith("peak-") && !layer.id.startsWith("discovery-")) {
               map.setLayoutProperty(layer.id, "visibility", "none");
            }
          }
        });
      }

      const selectedIds = selectedPeaks.map((p: SelectedManualPeak) => p.peak_id);
      const selectedCondition: ExpressionSpecification = [
        "in",
        ["to-number", ["get", "id"]],
        ["literal", selectedIds],
      ];

      // Add peak symbols layer from tile source
      if (!map.getLayer("peak-symbols")) {
        map.addLayer({
          id: "peak-symbols",
          type: "symbol",
          source: "peaks-source",
          "source-layer": "peaks",
          minzoom: 0,
          layout: {
            "icon-image": [
              "case",
              selectedCondition,
              "list_peak_user",
              ["<", ["to-number", ["get", "elevation"]], 2000],
              "peak_green",
              ["<", ["to-number", ["get", "elevation"]], 3000],
              "peak_yellow",
              ["<", ["to-number", ["get", "elevation"]], 4000],
              "peak_orange",
              ["<", ["to-number", ["get", "elevation"]], 6000],
              "peak_red",
              ["<", ["to-number", ["get", "elevation"]], 8000],
              "peak_burgundy",
              "peak_black",
            ],
            "icon-size": createSelectablePeakIconSizeExpression(
              selectedCondition
            ),
            "icon-anchor": createSelectablePeakIconAnchorExpression(
              selectedCondition
            ),
            "icon-allow-overlap": true,
            "icon-ignore-placement":  true,
            "symbol-sort-key": [
              "case",
              selectedCondition,
              1,
              0,
            ],
          },
        });
      }

      // Add peak labels layer from tile source
      if (!map.getLayer("peak-labels")) {
        map.addLayer({
          id: "peak-labels",
          type: "symbol",
          source: "peaks-source",
          "source-layer": "peaks",
          minzoom: 0, 
          layout: {
            ...createPeakLabelLayout({
              family: "tile",
              textIgnorePlacement: false,
              symbolSortKey: ["case", selectedCondition, 1, 0],
            }),
            "text-offset": [
              "case",
              selectedCondition,
              ["literal", [...PEAK_LABEL_OFFSET.map]],
              ["literal", [...PEAK_LABEL_OFFSET.tile]],
            ],
          },
          paint: getPeakLabelPaint("default"),
        });
      }

      // Add click handler for peaks
      const handlePeakClick = (e: MapLayerMouseEvent) => {
        if (!e.features?.length) return;
        const feature = e.features[0];
        if (!feature) return;
        const props = feature.properties || {};
        const peakId = props["id"] as number | undefined;
        const peakName = (props["name_en"] || props["name"]) as
          | string
          | undefined;

        if (peakId && peakName) {
          onPeakSelectRef.current(peakId, peakName);
        }
      };

      map.on("click", "peak-symbols", handlePeakClick);

      setMapLoaded(true);
      });

      mapRef.current = map;
    };

    void boot();

    return () => {
      cancelled = true;
      offlineHooksCleanup?.();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update peak icons when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const selectedIds = selectedPeaks.map((p: SelectedManualPeak) => p.peak_id);
    const selectedCondition: ExpressionSpecification = [
      "in",
      ["to-number", ["get", "id"]],
      ["literal", selectedIds],
    ];

    if (map.getLayer("peak-symbols")) {
      map.setLayoutProperty("peak-symbols", "icon-image", [
        "case",
        selectedCondition,
        "list_peak_user",
        ["<", ["to-number", ["get", "elevation"]], 2000],
        "peak_green",
        ["<", ["to-number", ["get", "elevation"]], 3000],
        "peak_yellow",
        ["<", ["to-number", ["get", "elevation"]], 4000],
        "peak_orange",
        ["<", ["to-number", ["get", "elevation"]], 6000],
        "peak_red",
        ["<", ["to-number", ["get", "elevation"]], 8000],
        "peak_burgundy",
        "peak_black",
      ]);
      map.setLayoutProperty(
        "peak-symbols",
        "icon-size",
        createSelectablePeakIconSizeExpression(selectedCondition)
      );
      map.setLayoutProperty(
        "peak-symbols",
        "icon-anchor",
        createSelectablePeakIconAnchorExpression(selectedCondition)
      );
      map.setLayoutProperty("peak-symbols", "symbol-sort-key", [
        "case",
        selectedCondition,
        1,
        0,
      ]);
    }

    if (map.getLayer("peak-labels")) {
      map.setLayoutProperty("peak-labels", "symbol-sort-key", [
        "case",
        selectedCondition,
        1,
        0,
      ]);
      map.setLayoutProperty("peak-labels", "text-offset", [
        "case",
        selectedCondition,
        ["literal", [...PEAK_LABEL_OFFSET.map]],
        ["literal", [...PEAK_LABEL_OFFSET.tile]],
      ]);
    }
  }, [selectedPeaks, mapLoaded]);

  if (loading && !mapLoaded) {
    return (
      <div className={styles["add-manual-peaks-map__loading"]}>
        <Loader2
          size={40}
          className={styles["add-manual-peaks-map__spinner"]}
        />
        <span className="typography-body-medium">
          {t("addManualPeaks.loadingMap")}
        </span>
      </div>
    );
  }

  return (
    <div className={styles["add-manual-peaks-map"]}>
      <div
        ref={mapContainer}
        className={styles["add-manual-peaks-map__container"]}
      />
    </div>
  );
};
