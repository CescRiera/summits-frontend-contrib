import React, { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import mapboxgl, {
  Map as MapboxMap,
  type ExpressionSpecification,
  type MapLayerMouseEvent,
} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { SelectedManualPeak } from "../../../../shared/hooks/useManualPeakSelection";
import {
  MAPBOX_ACCESS_TOKEN,
  PEAK_ICONS,
} from "../../../desktop-components/desktop-Map/desktop-MapUtils";
import {
  PEAK_LABEL_OFFSET,
  createPeakLabelLayout,
  createSelectablePeakIconAnchorExpression,
  createSelectablePeakIconSizeExpression,
  getPeakLabelPaint,
} from "../../../../shared/utils/mapboxPeakPresentation";
import styles from "./desktop-AddManualPeaksMap.module.css";

interface DesktopAddManualPeaksMapProps {
  selectedPeaks: SelectedManualPeak[];
  onPeakSelect: (peakId: number, peakName: string) => void;
  loading: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
}



const DEFAULT_CENTER: [number, number] = [2.0, 42.0];
const DEFAULT_ZOOM = 1;

/**
 * Desktop map showing discovery peaks with elevation markers
 * Synchronized with list selection state
 * Minimal UI (tile layer + markers only)
 */
export const DesktopAddManualPeaksMap: React.FC<
  DesktopAddManualPeaksMapProps
> = ({ selectedPeaks, onPeakSelect, loading, t }) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const onPeakSelectRef = useRef(onPeakSelect);

  useEffect(() => {
    onPeakSelectRef.current = onPeakSelect;
  }, [onPeakSelect]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/morris999/cmgzijuf7008n01qu8zwp3byu",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 1,
      maxPitch: 60,
      attributionControl: false,
      projection: "mercator",
      dragRotate: false,
      touchZoomRotate: false,
      touchPitch: false,
      pitchWithRotate: false,
    });

    map.on("load", async () => {
      // Load all peak icons
      try {
        for (const [key, url] of Object.entries(PEAK_ICONS)) {
          if (!map.hasImage(key)) {
            await new Promise<void>((resolve) => {
              map.loadImage(url, (err, image) => {
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

      // Hide ONLY Mapbox's built-in peak layers to avoid duplicates with our tileserver data
      const mapboxStyle = map.getStyle();
      if (mapboxStyle && mapboxStyle.layers) {
        mapboxStyle.layers.forEach((layer) => {
          if (
            layer.type === "symbol" && 
            (layer.id.includes("peak") || layer.id.includes("mountain")) &&
            !layer.id.startsWith("peak-") && 
            !layer.id.startsWith("discovery-")
          ) {
            map.setLayoutProperty(layer.id, "visibility", "none");
          }
        });
      }

      const selectedIds = selectedPeaks.map((peak) => peak.peak_id);
      const selectedCondition: ExpressionSpecification = [
        "in",
        ["to-number", ["get", "id"]],
        ["literal", selectedIds],
      ];

      // Add peak symbols layer
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
            "icon-ignore-placement": true,
            "symbol-sort-key": [
              "case",
              selectedCondition,
              1,
              0,
            ],
          } as Record<string, unknown>,
        });
      }

      // Add peak labels layer to match mobile but maybe visible on higher zooms?
      // Mobile has it, let's add it for consistency
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
        
        // Ensure peakId is a number (it might come as a string from vector tiles)
        const rawId = props["id"];
        const peakId = rawId !== undefined ? Number(rawId) : undefined;
        
        // Mobile uses name_en or name
        const peakName = (props["name_en"] || props["name"]) as string | undefined;

        if (peakId && peakName) {
          onPeakSelectRef.current(peakId, peakName);
        }
      };

      map.on("click", "peak-symbols", handlePeakClick);

      // Change cursor on hover
      map.on("mouseenter", "peak-symbols", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "peak-symbols", () => {
        map.getCanvas().style.cursor = "";
      });

      setMapLoaded(true);
    });

    map.on("error", (e) => {
      console.error("Mapbox error:", e);
    });

    mapRef.current = map;

    // Handle resize
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    document.addEventListener("visibilitychange", handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    // Special handling for sidebar transition (60fps resize)
    const sidebarTransitionInterval = setInterval(handleResize, 16);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      document.removeEventListener("visibilitychange", handleResize);
      resizeObserver.disconnect();
      clearInterval(sidebarTransitionInterval);
      mapRef.current = null;
      map.remove();
    };
  }, []);

  // Sync selected peaks - update icon styles if needed
  // Mobile uses checking if in selected set to change icon. 
  useEffect(() => {
     const map = mapRef.current;
     if (!map || !mapLoaded) return;

     const selectedIds = selectedPeaks.map((p) => p.peak_id);
     const selectedCondition: ExpressionSpecification = [
       "in",
       ["to-number", ["get", "id"]],
       ["literal", selectedIds],
     ];

    if (map.getLayer("peak-symbols")) {
        // We can update the icon-image expression to show selection
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

  return (
    <div className={styles["desktop-add-manual-peaks-map"]}>
      <div
        ref={mapContainer}
        className={styles["desktop-add-manual-peaks-map__container"]}
      />
      {loading && !mapLoaded && (
        <div className={styles["desktop-add-manual-peaks-map__overlay"]}>
          <Loader2
            size={48}
            className={styles["desktop-add-manual-peaks-map__spinner"]}
          />
          <span className="typography-desktop-body-medium">
            {t("addManualPeaks.loadingMap")}
          </span>
        </div>
      )}
    </div>
  );
};
