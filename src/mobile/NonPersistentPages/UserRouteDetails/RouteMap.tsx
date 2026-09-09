import React, {
  useRef,
  useEffect,
  useCallback,
  memo,
  useMemo,
  useState,
} from "react";
import mapboxgl from "mapbox-gl";
import type { MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./RouteMap.module.css";
import { MAPBOX_ACCESS_TOKEN, PEAK_ICONS } from "../../components/Map/MapUtils";
import type { Route } from "../../../shared/api/types";
import {
  applyPeakLabelPaint,
  createPeakLabelLayout,
  createPeakSymbolLayout,
  getPeakLabelPaint,
  getPeakLabelTheme,
} from "../../../shared/utils/mapboxPeakPresentation";
import { enableMapboxTerrain } from "../../../shared/utils/mapboxTerrain";
import {
  createOfflineTransformRequest,
  installOfflineMapHooks,
  prewarmInitialViewport,
} from "../../../shared/offline";
import { usePeakSynchronization } from "./usePeakSynchronization";
import SimpleSheet from "../../components/Map/SheetWithKeyboard/SimpleSheet";
const PeakDetailsMap = React.lazy(() => import("../../components/Map/PeakDetailsMap/PeakDetailsMap"));
import { useNavigationSheetClose } from "../../hooks/useNavigationSheetClose";

// Initialize Mapbox token
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Map styles
const MAP_STYLES = {
  OUTDOORS: "mapbox://styles/morris999/cmgzijuf7008n01qu8zwp3byu",
  SATELLITE: "mapbox://styles/mapbox/satellite-v9",
} as const;

// Projections
const PROJECTIONS = {
  MERCATOR: "mercator",
  GLOBE: "globe",
} as const;

/**
 * RouteMapLayerManager handles all layer operations for the route map
 * Provides clean abstraction for managing route layers, peaks, and fog
 */
class RouteMapLayerManager {
  private map: mapboxgl.Map;
  private isDestroyed = false;
  private currentStyle: string = MAP_STYLES.OUTDOORS;
  private isGlobeEnabled: boolean = true;

  constructor(map: mapboxgl.Map) {
    this.map = map;
    this.setupStyleLoadHandler();
  }

  /**
   * Setup style load handler to persist layers when style changes
   */
  private setupStyleLoadHandler(): void {
    this.map.on("style.load", () => {
      this.reinitializeLayers();
      this.configureFog();
    });
  }

  /**
   * Reinitialize all layers after style change
   */
  private async reinitializeLayers(): Promise<void> {
    if (!this.isValid()) return;

    const styleReady = await this.waitForStyle();
    if (!styleReady) return;

    // Load all peak icons
    await this.loadAllIcons();

    // Update label styling based on current base style
    this.updatePeakLabelPaintForStyle();

    // Note: Layer reinitialization with route data is handled by the parent component
    // via the reinitializeWithRouteData method when needed
  }

  /**
   * Convert SVG string to data URL (using URI encoding)
   */
  private svgToDataUrl(svgString: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  }

  /**
   * Load SVG icon into the map using Image element
   */
  private async loadSvgIcon(svgString: string, imageId: string): Promise<void> {
    if (this.map.hasImage(imageId)) return;

    return new Promise((resolve) => {
      // Create an Image element and load the SVG
      const img = new Image();
      img.onload = () => {
        // Ensure image has dimensions before adding
        if (img.width > 0 && img.height > 0) {
          try {
            if (!this.map.hasImage(imageId)) {
              this.map.addImage(imageId, img);
            }
          } catch (error) {
            console.warn(`Failed to add SVG icon ${imageId}:`, error);
          }
        }
        resolve();
      };
      img.onerror = (error) => {
        console.warn(`Failed to load SVG icon ${imageId}:`, error);
        resolve();
      };

      // Set explicit dimensions
      img.width = 28;
      img.height = 28;

      const dataUrl = this.svgToDataUrl(svgString);
      img.src = dataUrl;
    });
  }

  /**
   * Load all peak icons into the map
   */
  private async loadAllIcons(): Promise<void> {
    const iconPromises = Object.entries(PEAK_ICONS).map(([key, url]) =>
      this.loadMapImage(key, url)
    );
    await Promise.all(iconPromises);

    // Load start and finish SVG icons
    const startIconSvg = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1Z" fill="white" stroke="#ED254E" stroke-width="2"></path>
<path d="M13.6055 13.501V15.999C12.5597 16.6286 11.3367 16.9932 10.0283 16.998V13.501H13.6055ZM6.45117 13.501V16.0303C5.41294 15.4176 4.5477 14.5447 3.94336 13.501H6.45117ZM10.0283 10.0029V13.501H6.45117V10.0029H10.0283ZM17 10.002C16.9997 11.2771 16.6567 12.4715 16.0605 13.501H13.6055V10.002H17ZM6.45117 6.50293V10.0029H3.00391V10C3.00399 8.72575 3.34626 7.532 3.94141 6.50293H6.45117ZM13.6055 6.50293V10.002H10.0283V6.50293H13.6055ZM10.0283 3.00488V6.50293H6.45117V3.96973C7.46311 3.37262 8.63806 3.02396 9.89355 3.00488H10.0283ZM13.6055 4.00098C14.6216 4.61258 15.4682 5.47539 16.0625 6.50293H13.6055V4.00098Z" fill="#000000"></path>
</svg>`;

    const finishIconSvg = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1Z" fill="white" stroke="#ED254E" stroke-width="2"></path>
<path d="M6.79078 9.81555C6.79078 9.81555 7.34865 9.62581 8.47007 10.178C9.59149 10.7302 9.97098 11.8459 11.0924 12.3981C12.2138 12.9503 12.7717 12.7606 12.7717 12.7606L14.9804 8.27487C14.9804 8.27487 14.4226 8.46461 13.3012 7.91242C12.1797 7.36023 11.8002 6.24449 10.6788 5.69231C9.5574 5.14012 8.99953 5.32986 8.99953 5.32986L6.79078 9.81555ZM6.79078 9.81555L5.50234 12.4322" stroke="#000000" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

    await Promise.all([
      this.loadSvgIcon(startIconSvg, "route-start-icon"),
      this.loadSvgIcon(finishIconSvg, "route-finish-icon"),
    ]);
  }

  /**
   * Remove existing layers and sources to avoid conflicts
   */
  private removeExistingLayers(): void {
    if (!this.isValid()) return;

    const layersToRemove = [
      LAYER_IDS.ROUTE_LINE,
      LAYER_IDS.PEAKS_SYMBOLS,
      "route-peaks-labels",
      LAYER_IDS.NEARBY_PEAKS_SYMBOLS,
      "nearby-peaks-labels",
      "route-start-circle",
      "route-finish-circle",
    ];

    const sourcesToRemove = [
      SOURCE_IDS.ROUTE_LINE,
      SOURCE_IDS.PEAKS,
      SOURCE_IDS.NEARBY_PEAKS,
      "route-start",
      "route-finish",
    ];

    // Remove layers
    layersToRemove.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        try {
          this.map.removeLayer(layerId);
        } catch (error) {
          console.warn(`Failed to remove layer ${layerId}:`, error);
        }
      }
    });

    // Remove sources
    sourcesToRemove.forEach((sourceId) => {
      if (this.map.getSource(sourceId)) {
        try {
          this.map.removeSource(sourceId);
        } catch (error) {
          console.warn(`Failed to remove source ${sourceId}:`, error);
        }
      }
    });
  }

  /**
   * Load a single image into the map
   */
  private async loadMapImage(imageId: string, imageUrl: string): Promise<void> {
    if (this.map.hasImage(imageId)) return;

    return new Promise((resolve) => {
      this.map.loadImage(imageUrl, (err, img) => {
        if (!err && img && !this.map.hasImage(imageId)) {
          try {
            this.map.addImage(imageId, img);
          } catch {
            // Ignore duplicate add errors
          }
        }
        resolve();
      });
    });
  }

  /**
   * Public method to reinitialize layers with route data
   */
  public async reinitializeWithRouteData(
    routeGeoJSON: GeoJSON.FeatureCollection,
    peaksGeoJSON: GeoJSON.FeatureCollection,
    nearbyPeaksGeoJSON: GeoJSON.FeatureCollection,
    route: Route
  ): Promise<void> {
    if (!this.isValid()) return;

    const styleReady = await this.waitForStyle();
    if (!styleReady) {
      console.warn(
        "RouteMapLayerManager: Style not ready, aborting reinitialization"
      );
      return;
    }

    // Load all peak icons
    await this.loadAllIcons();

    // Remove existing sources and layers first to avoid conflicts
    this.removeExistingLayers();

    // Re-add route line source and layer
    this.map.addSource(SOURCE_IDS.ROUTE_LINE, {
      type: "geojson",
      data: routeGeoJSON,
    });

    this.map.addLayer({
      id: LAYER_IDS.ROUTE_LINE,
      type: "line",
      source: SOURCE_IDS.ROUTE_LINE,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#ED254E",
        "line-width": 4,
        "line-opacity": 0.9,
      },
    });

    // Re-add start and finish circles
    if (route.coordinates.length > 0) {
      const startCoord = route.coordinates[0];
      const finishCoord = route.coordinates[route.coordinates.length - 1];

      if (startCoord) {
        this.map.addSource("route-start", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [startCoord.lng, startCoord.lat],
            },
            properties: {},
          },
        });

        this.map.addLayer({
          id: "route-start-circle",
          type: "symbol",
          source: "route-start",
          layout: {
            "icon-image": "route-start-icon",
            "icon-size": 1,
            "icon-allow-overlap": true,
            "icon-anchor": "center",
          },
        });
      }

      if (finishCoord) {
        this.map.addSource("route-finish", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [finishCoord.lng, finishCoord.lat],
            },
            properties: {},
          },
        });

        this.map.addLayer({
          id: "route-finish-circle",
          type: "symbol",
          source: "route-finish",
          layout: {
            "icon-image": "route-finish-icon",
            "icon-size": 1,
            "icon-allow-overlap": true,
            "icon-anchor": "center",
          },
        });
      }
    }

    // Re-add peaks source and layers
    this.map.addSource(SOURCE_IDS.PEAKS, {
      type: "geojson",
      data: peaksGeoJSON,
    });
    const labelTheme = getPeakLabelTheme(this.currentStyle);

    this.map.addLayer({
      id: LAYER_IDS.PEAKS_SYMBOLS,
      type: "symbol",
      source: SOURCE_IDS.PEAKS,
      layout: createPeakSymbolLayout({
        family: "map",
        iconImage: ["get", "icon_id"],
      }),
      paint: {
        "icon-opacity": 1.0,
      },
    });

    this.map.addLayer({
      id: "route-peaks-labels",
      type: "symbol",
      source: SOURCE_IDS.PEAKS,
      layout: createPeakLabelLayout({
        family: "map",
      }),
      paint: getPeakLabelPaint(labelTheme),
    });

    // Re-add nearby peaks if they exist
    if (nearbyPeaksGeoJSON.features.length > 0) {
      this.map.addSource(SOURCE_IDS.NEARBY_PEAKS, {
        type: "geojson",
        data: nearbyPeaksGeoJSON,
      });

      this.map.addLayer({
        id: LAYER_IDS.NEARBY_PEAKS_SYMBOLS,
        type: "symbol",
        source: SOURCE_IDS.NEARBY_PEAKS,
        layout: createPeakSymbolLayout({
          family: "tile",
          iconImage: ["get", "icon_id"],
        }),
        paint: {
          "icon-opacity": 1,
        },
      });

      this.map.addLayer({
        id: "nearby-peaks-labels",
        type: "symbol",
        source: SOURCE_IDS.NEARBY_PEAKS,
        layout: createPeakLabelLayout({
          family: "tile",
        }),
        paint: getPeakLabelPaint(labelTheme),
      });
    }

    // Configure fog and update label styling
    this.configureFog();
    this.updatePeakLabelPaintForStyle();
  }

  /**
   * Configure fog settings based on current style
   */
  private configureFog(): void {
    if (!this.isValid()) return;

    try {
      this.map.setFog({
        color: "rgb(186, 210, 235)", // Lower atmosphere
        "high-color": "rgb(36, 92, 223)", // Upper atmosphere
        "horizon-blend": 0.02, // Atmosphere thickness (default 0.2 at low zooms)
        "space-color": "rgb(11, 11, 25)", // Background color
        "star-intensity": 0.6, // Background star brightness (default 0.35 at low zooms)
      });
    } catch (error) {
      console.warn("Failed to configure fog:", error);
    }
  }

  /**
   * Update peak label paint properties based on current base style
   */
  private updatePeakLabelPaintForStyle(): void {
    if (!this.isValid()) return;

    try {
      // Update route peaks labels
      if (this.map.getLayer("route-peaks-labels")) {
        applyPeakLabelPaint(this.map, "route-peaks-labels", this.currentStyle);
      }

      // Update nearby peaks labels
      if (this.map.getLayer("nearby-peaks-labels")) {
        applyPeakLabelPaint(this.map, "nearby-peaks-labels", this.currentStyle);
      }
    } catch (error) {
      console.warn("Failed to update peak labels paint for style:", error);
    }
  }

  /**
   * Check if the manager is still valid
   */
  private isValid(): boolean {
    return !this.isDestroyed && this.map && !this.map._removed;
  }

  /**
   * Wait for map style to be loaded
   */
  private async waitForStyle(): Promise<boolean> {
    if (!this.isValid()) return false;

    if (this.map.isStyleLoaded()) return true;

    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;

      const checkStyle = () => {
        if (!this.isValid() || attempts >= maxAttempts) {
          resolve(false);
          return;
        }

        if (this.map.isStyleLoaded()) {
          resolve(true);
        } else {
          attempts++;
          setTimeout(checkStyle, 100);
        }
      };

      checkStyle();
    });
  }

  /**
   * Destroy the manager and clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
  }

  // Public methods for style and projection management
  public setMapStyle(style: "outdoors" | "satellite"): void {
    if (!this.isValid()) return;

    const newStyle =
      style === "satellite" ? MAP_STYLES.SATELLITE : MAP_STYLES.OUTDOORS;

    if (this.currentStyle !== newStyle) {
      this.currentStyle = newStyle;
      try {
        this.map.setStyle(newStyle);
        // Fog and labels will be configured by the style.load handler
      } catch (error) {
        console.warn("Failed to set map style:", error);
      }
    } else {
    }
  }

  public setGlobeProjection(enabled: boolean): void {
    if (!this.isValid()) return;

    this.isGlobeEnabled = enabled;
    const projection = enabled ? PROJECTIONS.GLOBE : PROJECTIONS.MERCATOR;

    try {
      this.map.setProjection(projection);
    } catch (error) {
      console.warn("Failed to set projection:", error);
    }
  }

  public getCurrentStyle(): string {
    return this.currentStyle;
  }

  public setCurrentStyle(style: string): void {
    this.currentStyle = style;
  }

  public isGlobeProjectionEnabled(): boolean {
    return this.isGlobeEnabled;
  }
}

// Layer and source IDs - moved outside component to avoid dependency issues
const SOURCE_IDS = {
  ROUTE_LINE: "route-line",
  PEAKS: "route-peaks",
  NEARBY_PEAKS: "nearby-peaks",
};

const LAYER_IDS = {
  ROUTE_LINE: "route-line-layer",
  PEAKS_SYMBOLS: "route-peaks-symbols",
  NEARBY_PEAKS_SYMBOLS: "nearby-peaks-symbols",
};

interface RouteMapProps {
  route: Route;
  selectedPeakId?: number | null;
  onPeakSelect?: (peakId: number) => void;
  onFlyToPeak?: (peak: { lng?: number; lat?: number; name?: string }) => void;
  onMapRef?: (map: mapboxgl.Map | null) => void;
  onPopupChange?: (isOpen: boolean) => void;
  mapStyle?: "outdoors" | "satellite";
  globeEnabled?: boolean;
  terrainEnabled?: boolean;
  onTerrainToggle?: (enabled: boolean) => void;
  isUIHidden?: boolean;
  setIsUIHidden?: (hidden: boolean) => void;
}

const RouteMap: React.FC<RouteMapProps> = memo(
  ({
    route,
    selectedPeakId,
    onPeakSelect,
    onFlyToPeak: externalOnFlyToPeak,
    onMapRef,
    onPopupChange,
    mapStyle,
    globeEnabled,
    terrainEnabled,
    isUIHidden = false,
    setIsUIHidden,
  }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const layerManagerRef = useRef<RouteMapLayerManager | null>(null);
    const selectedPeakRef = useRef<number | null>(selectedPeakId || null);
    const nearbyPeakIdRef = useRef<number | null>(null);
    const routePeakIdRef = useRef<number | null>(null);
    const isUIHiddenRef = useRef<boolean>(isUIHidden);
    const [nearbyPeakId, setNearbyPeakId] = useState<number | null>(null);
    const [nearbyPeakData, setNearbyPeakData] = useState<{
      name: string;
      name_en?: string;
      elevation: number;
    } | null>(null);
    const [routePeakId, setRoutePeakId] = useState<number | null>(null);
    const [routePeakData, setRoutePeakData] = useState<{
      name: string;
      name_en?: string;
      elevation: number;
    } | null>(null);

    // Refs for persistence across style changes
    const isTerrainEnabledRef = useRef(terrainEnabled);
    const isGlobeEnabledRef = useRef(globeEnabled);
    const mapStyleRef = useRef(mapStyle);

    useEffect(() => {
      isTerrainEnabledRef.current = terrainEnabled;
    }, [terrainEnabled]);

    useEffect(() => {
      isGlobeEnabledRef.current = globeEnabled;
    }, [globeEnabled]);

    useEffect(() => {
      mapStyleRef.current = mapStyle;
    }, [mapStyle]);

    // Update refs when IDs change
    useEffect(() => {
      nearbyPeakIdRef.current = nearbyPeakId;
    }, [nearbyPeakId]);

    useEffect(() => {
      routePeakIdRef.current = routePeakId;
    }, [routePeakId]);

    // Update isUIHidden ref when prop changes
    useEffect(() => {
      isUIHiddenRef.current = isUIHidden;
    }, [isUIHidden]);

    // Close nearby peak sheet when navigating away from route details
    const handleCloseNearbySheet = useCallback(() => {
      setNearbyPeakId(null);
      setNearbyPeakData(null);
      // Restore UI visibility when closing the sheet
      if (setIsUIHidden) {
        setIsUIHidden(false);
      }
    }, [setIsUIHidden]);

    // Close route peak sheet when navigating away from route details
    const handleCloseRouteSheet = useCallback(() => {
      setRoutePeakId(null);
      setRoutePeakData(null);
      // Restore UI visibility when closing the sheet
      if (setIsUIHidden) {
        setIsUIHidden(false);
      }
    }, [setIsUIHidden]);

    useNavigationSheetClose(
      !!nearbyPeakId || !!routePeakId,
      () => {
        handleCloseNearbySheet();
        handleCloseRouteSheet();
      },
      [`/routes/${route.id}`] // Only keep sheet open on the specific route page
    );

    // Get peaks for synchronization - memoized to prevent unnecessary recalculations
    const peaks = useMemo(() => {
      return route.properties.peaks || route.completed_peaks || [];
    }, [route.properties.peaks, route.completed_peaks]);

    // Get nearby peaks - memoized to prevent unnecessary recalculations
    const nearbyPeaks = useMemo(() => {
      return route.properties.nearby_peaks || [];
    }, [route.properties.nearby_peaks]);

    /**
     * Handle flyTo from swiper
     */
    const handleFlyToPeak = useCallback(
      (peak: { lng?: number; lat?: number; name?: string }) => {
        // If there's an external onFlyToPeak (from parent), use it instead
        if (externalOnFlyToPeak) {
          externalOnFlyToPeak(peak);
          return;
        }

        if (!mapRef.current || !peak.lng || !peak.lat) {
          return;
        }

        const map = mapRef.current;

        // Function to execute the flyTo
        const executeFlyTo = () => {
          map.stop();
          map.flyTo({
            center: [peak.lng!, peak.lat!],
            duration: 500,
            essential: true,
            easing: (t) => t * t * (3 - 2 * t), // Smooth easing function
          });
        };

        // Execute flyTo immediately if map is ready
        if (map.isStyleLoaded()) {
          executeFlyTo();
        } else {
          // If map isn't ready, wait for it to load

          const handleLoad = () => {
            executeFlyTo();
          };

          // Try both events to catch when map becomes ready
          map.once("load", handleLoad);
          map.once("styledata", handleLoad);
        }
      },
      [externalOnFlyToPeak]
    );

    // Use the synchronization hook
    const { handleMapPeakClick, setMapRef } = usePeakSynchronization({
      selectedPeakId: selectedPeakId || null,
      onPeakSelect: onPeakSelect || (() => {}),
      peaks,
      onFlyToPeak: handleFlyToPeak, // Pass the flyTo callback
    });

    /**
     * Get elevation-based icon for a peak - memoized for performance
     */
    const getElevationIcon = useMemo(() => {
      const iconMap = new Map<number, string>();

      return (elevation: number): string => {
        if (iconMap.has(elevation)) {
          return iconMap.get(elevation)!;
        }

        let icon: string;
        if (elevation >= 8000) icon = "list_peak_black";
        else if (elevation >= 6000) icon = "list_peak_burgundy";
        else if (elevation >= 4000) icon = "list_peak_red";
        else if (elevation >= 3000) icon = "list_peak_orange";
        else if (elevation >= 2000) icon = "list_peak_yellow";
        else if (elevation >= 0) icon = "list_peak_green";
        else icon = "list_peak_green"; // default fallback

        iconMap.set(elevation, icon);
        return icon;
      };
    }, []);

    /**
     * Get tile elevation icon for nearby peaks (same as MapLayers.tsx)
     */
    const getTileElevationIcon = useMemo(() => {
      const iconMap = new Map<number, string>();

      return (elevation: number): string => {
        if (iconMap.has(elevation)) {
          return iconMap.get(elevation)!;
        }

        let icon: string;
        if (elevation >= 8000) icon = "peak_black";
        else if (elevation >= 6000) icon = "peak_burgundy";
        else if (elevation >= 4000) icon = "peak_red";
        else if (elevation >= 3000) icon = "peak_orange";
        else if (elevation >= 2000) icon = "peak_yellow";
        else if (elevation >= 1000) icon = "peak_green";
        else icon = "peak_green"; // default fallback

        iconMap.set(elevation, icon);
        return icon;
      };
    }, []);

    /**
     * Create GeoJSON for route polyline - memoized for performance
     */
    const routeGeoJSON = useMemo((): GeoJSON.FeatureCollection => {
      const coordinates = route.coordinates.map((coord) => [
        coord.lng,
        coord.lat,
      ]);

      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates,
            },
          },
        ],
      };
    }, [route.coordinates]);

    /**
     * Create GeoJSON for peaks - memoized for performance
     */
    const peaksGeoJSON = useMemo((): GeoJSON.FeatureCollection => {
      return {
        type: "FeatureCollection",
        features: peaks.map((peak, index) => {
          // Get the appropriate icon based on elevation
          const iconId = getElevationIcon(peak.elevation);

          return {
            type: "Feature",
            properties: {
              id: peak.id,
              name: peak.name,
              name_en: peak.name_en || peak.name,
              elevation: peak.elevation,
              order: index + 1,
              icon_id: iconId,
            },
            geometry: {
              type: "Point",
              coordinates: [peak.lng!, peak.lat!],
            },
          };
        }),
      };
    }, [peaks, getElevationIcon]);

    /**
     * Create GeoJSON for nearby peaks - memoized for performance
     */
    const nearbyPeaksGeoJSON = useMemo((): GeoJSON.FeatureCollection => {
      return {
        type: "FeatureCollection",
        features: nearbyPeaks.map((peak) => {
          // Get the appropriate tile icon based on elevation
          const iconId = getTileElevationIcon(peak.elevation);

          return {
            type: "Feature",
            properties: {
              id: peak.id,
              name: peak.name,
              name_en: peak.name_en || peak.name,
              elevation: peak.elevation,
              admin_hierarchy: peak.admin_hierarchy,
              image_url: peak.image,
              user_data: (peak as any).user_data,
              icon_id: iconId,
            },
            geometry: {
              type: "Point",
              coordinates: [peak.lng!, peak.lat!],
            },
          };
        }),
      };
    }, [nearbyPeaks, getTileElevationIcon]);

    /**
     * Load map images
     */
    // Helper function to convert SVG string to data URL (using URI encoding instead of base64)
    const svgToDataUrl = (svgString: string): string => {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        svgString
      )}`;
    };

    // Start icon SVG
    const startIconSvg = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1Z" fill="white" stroke="#ED254E" stroke-width="2"></path>
<path d="M13.6055 13.501V15.999C12.5597 16.6286 11.3367 16.9932 10.0283 16.998V13.501H13.6055ZM6.45117 13.501V16.0303C5.41294 15.4176 4.5477 14.5447 3.94336 13.501H6.45117ZM10.0283 10.0029V13.501H6.45117V10.0029H10.0283ZM17 10.002C16.9997 11.2771 16.6567 12.4715 16.0605 13.501H13.6055V10.002H17ZM6.45117 6.50293V10.0029H3.00391V10C3.00399 8.72575 3.34626 7.532 3.94141 6.50293H6.45117ZM13.6055 6.50293V10.002H10.0283V6.50293H13.6055ZM10.0283 3.00488V6.50293H6.45117V3.96973C7.46311 3.37262 8.63806 3.02396 9.89355 3.00488H10.0283ZM13.6055 4.00098C14.6216 4.61258 15.4682 5.47539 16.0625 6.50293H13.6055V4.00098Z" fill="#000000"></path>
</svg>`;

    // Finish icon SVG
    const finishIconSvg = `<svg width="28" height="28" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1Z" fill="white" stroke="#ED254E" stroke-width="2"></path>
<path d="M6.79078 9.81555C6.79078 9.81555 7.34865 9.62581 8.47007 10.178C9.59149 10.7302 9.97098 11.8459 11.0924 12.3981C12.2138 12.9503 12.7717 12.7606 12.7717 12.7606L14.9804 8.27487C14.9804 8.27487 14.4226 8.46461 13.3012 7.91242C12.1797 7.36023 11.8002 6.24449 10.6788 5.69231C9.5574 5.14012 8.99953 5.32986 8.99953 5.32986L6.79078 9.81555ZM6.79078 9.81555L5.50234 12.4322" stroke="#000000" stroke-linecap="round" stroke-linejoin="round"></path>
</svg>`;

    const loadMapImages = useCallback(async (map: mapboxgl.Map) => {
      // Load all peak icons like in the main Map.tsx
      await Promise.all(
        Object.entries(PEAK_ICONS).map(
          ([key, url]) =>
            new Promise<void>((resolve) => {
              if (map.hasImage(key)) {
                resolve();
                return;
              }

              map.loadImage(url, (err, img) => {
                if (!err && img && !map.hasImage(key)) {
                  try {
                    map.addImage(key, img);
                  } catch {
                    // Ignore duplicate add errors
                  }
                }
                resolve();
              });
            })
        )
      );

      // Load start and finish SVG icons using Image element approach
      const loadSvgIcon = (svgString: string, imageId: string) => {
        return new Promise<void>((resolve) => {
          if (map.hasImage(imageId)) {
            resolve();
            return;
          }

          // Create an Image element and load the SVG
          const img = new Image();
          img.onload = () => {
            // Ensure image has dimensions before adding
            if (img.width > 0 && img.height > 0) {
              try {
                if (!map.hasImage(imageId)) {
                  map.addImage(imageId, img);
                }
              } catch (error) {
                console.warn(`Failed to add SVG icon ${imageId}:`, error);
              }
            }
            resolve();
          };
          img.onerror = (error) => {
            console.warn(`Failed to load SVG icon ${imageId}:`, error);
            resolve();
          };

          // Set explicit dimensions
          img.width = 28;
          img.height = 28;

          const dataUrl = svgToDataUrl(svgString);
          img.src = dataUrl;
        });
      };

      await Promise.all([
        loadSvgIcon(startIconSvg, "route-start-icon"),
        loadSvgIcon(finishIconSvg, "route-finish-icon"),
      ]);
    }, []);

    /**
     * Calculate bounds for the route - memoized for performance
     */
    const bounds = useMemo((): [[number, number], [number, number]] | null => {
      let minLng = Infinity;
      let maxLng = -Infinity;
      let minLat = Infinity;
      let maxLat = -Infinity;

      // Add route coordinates
      route.coordinates.forEach((coord) => {
        minLng = Math.min(minLng, coord.lng);
        maxLng = Math.max(maxLng, coord.lng);
        minLat = Math.min(minLat, coord.lat);
        maxLat = Math.max(maxLat, coord.lat);
      });

      // Add peak coordinates
      peaks.forEach((peak) => {
        if (peak.lng && peak.lat) {
          minLng = Math.min(minLng, peak.lng);
          maxLng = Math.max(maxLng, peak.lng);
          minLat = Math.min(minLat, peak.lat);
          maxLat = Math.max(maxLat, peak.lat);
        }
      });

      // Validate bounds
      if (
        minLng === Infinity ||
        maxLng === -Infinity ||
        minLat === Infinity ||
        maxLat === -Infinity
      ) {
        return null;
      }

      return [
        [minLng, minLat],
        [maxLng, maxLat],
      ];
    }, [route.coordinates, peaks]);

    /**
     * Handle map resize
     */
    const handleResize = useCallback(() => {
      try {
        mapRef.current?.resize();
      } catch {
        // Ignore resize errors
      }
    }, []);

    /**
     * Update map styling for selected peak without re-rendering
     */
    const updateSelectedPeak = useCallback(
      (peakId: number | null) => {
        const map = mapRef.current;

        if (!map || !map.isStyleLoaded()) {
          return;
        }

        // Only update if the peak actually changed
        if (selectedPeakRef.current === peakId) {
          return;
        }

        // Get the peaks data to find elevation-based icons

        // Update the GeoJSON data with the new icon for the selected peak
        const updatedFeatures: GeoJSON.Feature[] = peaks.map((peak) => {
          const isActive = Number(peak.id) === peakId;
          const iconId = isActive
            ? "list_peak_user"
            : getElevationIcon(peak.elevation);
          return {
            type: "Feature" as const,
            properties: {
              id: peak.id,
              name: peak.name,
              name_en: peak.name_en || peak.name,
              elevation: peak.elevation,
              icon_id: iconId,
            },
            geometry: {
              type: "Point" as const,
              coordinates: [peak.lng!, peak.lat!],
            },
          };
        });

        // Update the source data
        const peaksSource = map.getSource(
          SOURCE_IDS.PEAKS
        ) as mapboxgl.GeoJSONSource;
        if (peaksSource) {
          peaksSource.setData({
            type: "FeatureCollection",
            features: updatedFeatures,
          });
        } else {
        }

        selectedPeakRef.current = peakId;
      },
      [peaks, getElevationIcon]
    );

    /**
     * Initialize map
     */
    useEffect(() => {
      if (!mapContainerRef.current || !mapStyle || globeEnabled === undefined) {
        return;
      }

      const styleUrl =
        mapStyle === "satellite"
          ? "mapbox://styles/mapbox/satellite-v9"
          : "mapbox://styles/morris999/cmgzijuf7008n01qu8zwp3byu";

      // Increase worker count to improve tile cache during fast animations
      mapboxgl.workerCount = 4;

      let cancelled = false;
      let offlineHooksCleanup: (() => void) | undefined;
      let mapInstance: mapboxgl.Map | null = null;

      const boot = async () => {
        // Warm offline tiles/assets BEFORE constructing the map so the sync
        // transformRequest can serve them from the memory cache when offline.
        try {
          await prewarmInitialViewport({
            center: [0, 0],
            zoom: 0,
            styleUrl,
          });
        } catch {
          console.warn(
            "[RouteMap] Offline prewarm failed, continuing with online map"
          );
        }
        if (cancelled) return;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: styleUrl,
          center: [0, 0], // Start at world view
          zoom: 0, // Start at zoom 0
          attributionControl: false,
          projection: globeEnabled && navigator.onLine ? "globe" : "mercator",
          maxPitch: 60,
          prefetchZoomDelta: 4, // Prefetch tiles at higher zoom levels for smoother animations
          maxTileCacheSize: 300, // Increased tile cache for smoother animations (default is ~50-100)
          transformRequest: createOfflineTransformRequest(),
        } as mapboxgl.MapOptions);

        mapInstance = map;
        mapRef.current = map;
        setMapRef(map);
        offlineHooksCleanup = installOfflineMapHooks(map, styleUrl);

      // Initialize layer manager
      layerManagerRef.current = new RouteMapLayerManager(map);

      // Update layer manager's current style to match the initial style
      layerManagerRef.current.setCurrentStyle(styleUrl);

      // Geolocation control is handled by the main Map component
      // No need to add it here to avoid conflicts

      // Persistent feature state (Terrain and Globe) on style load
      map.on("style.load", () => {
        const currentMap = mapRef.current;
        if (!currentMap) return;

        // Re-apply projection
        if (isGlobeEnabledRef.current !== undefined) {
          currentMap.setProjection(
            isGlobeEnabledRef.current && navigator.onLine ? "globe" : "mercator"
          );
        }

        // Re-apply terrain if enabled
        if (isTerrainEnabledRef.current) {
          setTimeout(() => {
            if (!currentMap || !isTerrainEnabledRef.current) return;

            try {
              enableMapboxTerrain(currentMap);
              // Ensure we have some pitch to see the 3D effect
              if (currentMap.getPitch() < 30) {
                currentMap.easeTo({ pitch: 45, duration: 1000 });
              }
            } catch (error) {
              console.error("[RouteMap] Failed to re-enable terrain:", error);
            }
          }, 100);
        }
      });

      // Also call the external onMapRef callback
      if (onMapRef) {
        onMapRef(map);
      }

      // Configure zoom behavior - multiply mouse wheel zoom sensitivity
      map.scrollZoom.setWheelZoomRate(1 / 450); // Increased from default 1.0

      // Compass — hidden when north, fades in on rotation/tilt
      map.addControl(
        new mapboxgl.NavigationControl({
          showCompass: true,
          showZoom: false,
          visualizePitch: true,
        }),
        "top-right",
      );

      const updateCompassVisibility = () => {
        const bearing = map.getBearing();
        const pitch = map.getPitch();
        const visible = Math.abs(bearing) > 0.5 || Math.abs(pitch) > 0.5;
        const el = document.querySelector(
          ".mapboxgl-ctrl-top-right",
        ) as HTMLElement;
        if (el) {
          el.dataset["compassVisible"] = visible ? "true" : "false";
        }
      };

      map.on("rotate", updateCompassVisibility);
      map.on("pitch", updateCompassVisibility);
      map.on("moveend", updateCompassVisibility);

      map.on("load", async () => {
        setMapRef(map);

        // Geolocation control positioning is handled by the main Map component

        await loadMapImages(map);

        // Add route line source and layer
        map.addSource(SOURCE_IDS.ROUTE_LINE, {
          type: "geojson",
          data: routeGeoJSON,
        });

        map.addLayer({
          id: LAYER_IDS.ROUTE_LINE,
          type: "line",
          source: SOURCE_IDS.ROUTE_LINE,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#ED254E",
            "line-width": 4,
            "line-opacity": 0.9,
          },
        });

        // Add start and finish icons using circles with different colors
        if (route.coordinates.length > 0) {
          // Start point (first coordinate)
          const startCoord = route.coordinates[0];

          // Finish point (last coordinate)
          const finishCoord = route.coordinates[route.coordinates.length - 1];

          // Add start and finish sources
          if (startCoord) {
            map.addSource("route-start", {
              type: "geojson",
              data: {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [startCoord.lng, startCoord.lat],
                },
                properties: {},
              },
            });
          }

          if (finishCoord) {
            map.addSource("route-finish", {
              type: "geojson",
              data: {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [finishCoord.lng, finishCoord.lat],
                },
                properties: {},
              },
            });
          }

          // Add start icon
          if (startCoord) {
            map.addLayer({
              id: "route-start-circle",
              type: "symbol",
              source: "route-start",
              layout: {
                "icon-image": "route-start-icon",
                "icon-size": 1,
                "icon-allow-overlap": true,
                "icon-anchor": "center",
              },
            });
          }

          // Add finish icon
          if (finishCoord) {
            map.addLayer({
              id: "route-finish-circle",
              type: "symbol",
              source: "route-finish",
              layout: {
                "icon-image": "route-finish-icon",
                "icon-size": 1,
                "icon-allow-overlap": true,
                "icon-anchor": "center",
              },
            });
          }
        }

        // Add peaks source and layers
        map.addSource(SOURCE_IDS.PEAKS, {
          type: "geojson",
          data: peaksGeoJSON,
        });
        const labelTheme = getPeakLabelTheme(styleUrl);

        // Peak symbols - start with elevation-based icons, will be updated dynamically for active peak
        map.addLayer({
          id: LAYER_IDS.PEAKS_SYMBOLS,
          type: "symbol",
          source: SOURCE_IDS.PEAKS,
          layout: createPeakSymbolLayout({
            family: "map",
            iconImage: ["get", "icon_id"],
          }),
          paint: {
            "icon-opacity": 1.0, // Full opacity for all icons
          },
        });

        // Peak labels
        map.addLayer({
          id: "route-peaks-labels",
          type: "symbol",
          source: SOURCE_IDS.PEAKS,
          layout: createPeakLabelLayout({
            family: "map",
          }),
          paint: getPeakLabelPaint(labelTheme),
        });

        // Add nearby peaks source and layer
        if (nearbyPeaks.length > 0) {
          map.addSource(SOURCE_IDS.NEARBY_PEAKS, {
            type: "geojson",
            data: nearbyPeaksGeoJSON,
          });

          // Nearby peaks symbols - use tile elevation icons
          map.addLayer({
            id: LAYER_IDS.NEARBY_PEAKS_SYMBOLS,
            type: "symbol",
            source: SOURCE_IDS.NEARBY_PEAKS,
            layout: createPeakSymbolLayout({
              family: "tile",
              iconImage: ["get", "icon_id"],
            }),
            paint: {
              "icon-opacity": 1, // Slightly transparent
            },
          });

          // Nearby peaks labels
          map.addLayer({
            id: "nearby-peaks-labels",
            type: "symbol",
            source: SOURCE_IDS.NEARBY_PEAKS,
            layout: createPeakLabelLayout({
              family: "tile",
            }),
            paint: getPeakLabelPaint(labelTheme),
          });
        }

        // Wait for sources to be loaded before fitting bounds
        const waitForSources = () => {
          const routeSource = map.getSource(SOURCE_IDS.ROUTE_LINE);
          const peaksSource = map.getSource(SOURCE_IDS.PEAKS);

          if (routeSource && peaksSource && bounds) {
            map.fitBounds(bounds, {
              padding: { top: 200, bottom: 200, left: 16, right: 16 },
              duration: 3000, // 2 second animation from zoom 0 to route bounds
              essential: true,
            });
          } else {
            // Retry after a short delay
            setTimeout(waitForSources, 100);
          }
        };

        // Start waiting for sources
        waitForSources();

        // Set initial peak selection after map is loaded
        if (selectedPeakId) {
          // Use setTimeout to ensure the map is fully ready
          setTimeout(() => {
            updateSelectedPeak(selectedPeakId);
          }, 100);
        }
      });

      // Get layers that should be queried for clicks
      const getQueryLayers = () => {
        const layers: string[] = [];

        if (map.getLayer(LAYER_IDS.PEAKS_SYMBOLS)) {
          layers.push(LAYER_IDS.PEAKS_SYMBOLS);
        }

        if (map.getLayer(LAYER_IDS.NEARBY_PEAKS_SYMBOLS)) {
          layers.push(LAYER_IDS.NEARBY_PEAKS_SYMBOLS);
        }

        return layers;
      };

      // General click handler - handles both empty clicks and peak clicks
      map.on("click", async (e: MapMouseEvent) => {
        const layers = getQueryLayers();
        const features = map.queryRenderedFeatures(e.point, { layers });

        if (features.length === 0) {
          // Empty click - handle based on sheet state
          if (
            nearbyPeakIdRef.current !== null ||
            routePeakIdRef.current !== null
          ) {
            // Sheet is open - close sheet and show UI
            setNearbyPeakId(null);
            setNearbyPeakData(null);
            setRoutePeakId(null);
            setRoutePeakData(null);
            if (setIsUIHidden) {
              isUIHiddenRef.current = false;
              setIsUIHidden(false);
            }
          } else {
            // Sheet is closed - toggle UI visibility
            if (setIsUIHidden) {
              const newValue = !isUIHiddenRef.current;
              isUIHiddenRef.current = newValue;
              setIsUIHidden(newValue);
            }
          }
          return;
        }

        // Handle peak clicks
        const topFeature = features[0];
        if (!topFeature) return;

        const props = topFeature.properties || {};
        const peakId = (props as Record<string, unknown>)["id"] as
          | string
          | number
          | undefined;

        if (!peakId) return;

        // Handle route peaks (LAYER_IDS.PEAKS_SYMBOLS)
        if (topFeature.layer?.id === LAYER_IDS.PEAKS_SYMBOLS) {
          const peakData = props;
          const peakGeometry = topFeature.geometry as GeoJSON.Point;
          const peakCoordinates = peakGeometry?.coordinates;

          if (peakData && peakCoordinates) {
            // Close any open nearby peak sheet when selecting a route peak
            setNearbyPeakId(null);
            setNearbyPeakData(null);

            // Convert feature properties to peak data for SimpleSheet
            const peakName = peakData["name"] as string;
            const peakNameEn = peakData["name_en"] as string;
            const peakElevation = peakData["elevation"] as number;

            // Set peak data for the SimpleSheet header
            setRoutePeakData({
              name: peakName,
              name_en: peakNameEn,
              elevation: peakElevation,
            });

            // Set the peak ID for the SimpleSheet
            setRoutePeakId(Number(peakId));

            // Stop any ongoing animations first
            map.stop();

            // Fly to the peak coordinates without changing zoom
            map.flyTo({
              center: peakCoordinates as [number, number],
              duration: 500,
              essential: true,
              easing: (t) => t * t * (3 - 2 * t), // Smooth easing function
            });

            // Immediately select the peak for responsive UI
            handleMapPeakClick(Number(peakId));
          }
        }
        // Handle nearby peaks (LAYER_IDS.NEARBY_PEAKS_SYMBOLS)
        else if (topFeature.layer?.id === LAYER_IDS.NEARBY_PEAKS_SYMBOLS) {
          const peakData = props;
          const peakGeometry = topFeature.geometry as GeoJSON.Point;
          const peakCoordinates = peakGeometry?.coordinates;

          if (peakData && peakCoordinates) {
            // Close any open route peak sheet when selecting a nearby peak
            setRoutePeakId(null);
            setRoutePeakData(null);

            // Convert feature properties to peak data for SimpleSheet
            const peakName = peakData["name"] as string;
            const peakNameEn = peakData["name_en"] as string;
            const peakElevation = peakData["elevation"] as number;

            // Set peak data for the SimpleSheet header
            setNearbyPeakData({
              name: peakName,
              name_en: peakNameEn,
              elevation: peakElevation,
            });

            // Set the peak ID for the SimpleSheet
            setNearbyPeakId(Number(peakId));

            // Fly to the nearby peak coordinates
            map.stop(); // Stop any ongoing animations
            map.flyTo({
              center: peakCoordinates as [number, number],
              duration: 500,
              essential: true,
              easing: (t) => t * t * (3 - 2 * t), // Smooth easing function
            });
          }
        }
      });

      // Change cursor on hover
      map.on("mouseenter", LAYER_IDS.PEAKS_SYMBOLS, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", LAYER_IDS.PEAKS_SYMBOLS, () => {
        map.getCanvas().style.cursor = "";
      });

      // Change cursor on hover for nearby peaks
      map.on("mouseenter", LAYER_IDS.NEARBY_PEAKS_SYMBOLS, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", LAYER_IDS.NEARBY_PEAKS_SYMBOLS, () => {
        map.getCanvas().style.cursor = "";
      });

      // Add resize event listeners
      window.addEventListener("resize", handleResize);
      window.addEventListener("orientationchange", handleResize);
      };

      void boot();

      // Cleanup
      return () => {
        cancelled = true;
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("orientationchange", handleResize);
        offlineHooksCleanup?.();
        if (layerManagerRef.current) {
          layerManagerRef.current.destroy();
        }
        if (mapInstance) {
          mapInstance.remove();
        }
      };
      // selectedPeakId, mapStyle, and globeEnabled intentionally excluded to prevent map re-initialization
      // mapStyle and globeEnabled are handled by separate effects
      // eslint_disable-next-line react-hooks/exhaustive-deps
    }, [
      route.id,
      route.coordinates,
      onPeakSelect,
      loadMapImages,
      routeGeoJSON,
      peaksGeoJSON,
      bounds,
      handleResize,
      handleMapPeakClick,
      setMapRef,
      updateSelectedPeak,
    ]);

    /**
     * Update selected peak styling when selectedPeakId changes
     */
    useEffect(() => {
      updateSelectedPeak(selectedPeakId || null);
    }, [selectedPeakId, updateSelectedPeak]);

    /**
     * Notify parent when popup state changes
     */
    useEffect(() => {
      if (onPopupChange) {
        onPopupChange(!!nearbyPeakId || !!routePeakId);
      }
    }, [nearbyPeakId, routePeakId, onPopupChange]);

    /**
     * Fly to peak when popup changes (for programmatic popup changes)
     */
    useEffect(() => {
      if (nearbyPeakId && mapRef.current) {
        // Find the peak coordinates in nearby peaks data
        const nearbyPeak = nearbyPeaks.find(
          (peak) => Number(peak.id) === Number(nearbyPeakId)
        );
        if (nearbyPeak && nearbyPeak.lng && nearbyPeak.lat) {
          mapRef.current.stop();
          mapRef.current.flyTo({
            center: [nearbyPeak.lng, nearbyPeak.lat],
            duration: 500,
            essential: true,
            easing: (t) => t * t * (3 - 2 * t),
          });
        }
      }
    }, [nearbyPeakId, nearbyPeaks]);

    useEffect(() => {
      if (routePeakId && mapRef.current) {
        // Find the peak coordinates in route peaks data
        const routePeak = peaks.find(
          (peak) => Number(peak.id) === Number(routePeakId)
        );
        if (routePeak && routePeak.lng && routePeak.lat) {
          mapRef.current.stop();
          mapRef.current.flyTo({
            center: [routePeak.lng, routePeak.lat],
            duration: 500,
            essential: true,
            easing: (t) => t * t * (3 - 2 * t),
          });
        }
      }
    }, [routePeakId, peaks]);

    /**
     * Handle map style changes without re-initializing the map
     */
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded() || !mapStyle) {
        return;
      }

      // Use the layer manager to handle style changes
      if (layerManagerRef.current) {
        layerManagerRef.current.setMapStyle(mapStyle);

        // Listen for style load event, then reinitialize layers with route data
        const handleStyleLoad = () => {
          if (layerManagerRef.current) {
            layerManagerRef.current.reinitializeWithRouteData(
              routeGeoJSON,
              peaksGeoJSON,
              nearbyPeaksGeoJSON,
              route
            );
          }

          // Geolocation control repositioning is handled by the main Map component

          map.off("style.load", handleStyleLoad);
        };

        map.on("style.load", handleStyleLoad);
      } else {
        console.warn("RouteMap: Layer manager not available for style change");
      }
    }, [mapStyle, routeGeoJSON, peaksGeoJSON, nearbyPeaksGeoJSON, route]);

    /**
     * Handle globe projection changes without re-initializing the map
     */
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded() || globeEnabled === undefined) {
        return;
      }

      // Use the layer manager to handle projection changes
      if (layerManagerRef.current) {
        layerManagerRef.current.setGlobeProjection(globeEnabled);
      }
    }, [globeEnabled]);

    /**
     * Handle terrain toggle changes
     */
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) {
        return;
      }

      if (terrainEnabled) {
        try {
          enableMapboxTerrain(map);
          // Tilt the map to make 3D visible
          map.easeTo({
            pitch: 45,
            duration: 800,
          });
        } catch (error) {
          console.error("[RouteMap] Failed to set terrain:", error);
        }
      } else {
        // Disable terrain
        try {
          map.setTerrain(null);
          // Gently return to flat view
          map.easeTo({
            pitch: 0,
            duration: 800,
          });
        } catch (error) {
          console.error("[RouteMap] Failed to remove terrain:", error);
        }
      }
    }, [terrainEnabled]);

    /**
     * Update route data when route changes (only when route actually changes, not on peak selection)
     */
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) {
        return;
      }

      // Update route line
      const routeSource = map.getSource(
        SOURCE_IDS.ROUTE_LINE
      ) as mapboxgl.GeoJSONSource;
      if (routeSource) {
        routeSource.setData(routeGeoJSON);
      }

      // Update peaks
      const peaksSource = map.getSource(
        SOURCE_IDS.PEAKS
      ) as mapboxgl.GeoJSONSource;
      if (peaksSource) {
        peaksSource.setData(peaksGeoJSON);
      }

      // Update nearby peaks
      const nearbyPeaksSource = map.getSource(
        SOURCE_IDS.NEARBY_PEAKS
      ) as mapboxgl.GeoJSONSource;
      if (nearbyPeaksSource) {
        nearbyPeaksSource.setData(nearbyPeaksGeoJSON);
      }

      // Only fit to bounds on initial load, not on every update
      // This prevents interference with flyTo animations
      if (route.id && bounds) {
        map.fitBounds(bounds, {
          padding: { top: 0, bottom: 16, left: 0, right: 16 },
          duration: 1000, // Shorter duration for initial fit
          essential: true,
        });
      }
    }, [route.id, routeGeoJSON, peaksGeoJSON, nearbyPeaksGeoJSON, bounds]);

    return (
      <div className={styles["routeMapContainer"]}>
        <div ref={mapContainerRef} className={styles["mapContainer"]} />
        <React.Suspense fallback={null}>
          {nearbyPeakId && (
            <SimpleSheet
              isOpen={!!nearbyPeakId}
              onClose={handleCloseNearbySheet}
              peakData={nearbyPeakData}
            >
              <PeakDetailsMap
                peakId={nearbyPeakId}
                onClose={handleCloseNearbySheet}
              />
            </SimpleSheet>
          )}
          {routePeakId && (
            <SimpleSheet
              isOpen={!!routePeakId}
              onClose={handleCloseRouteSheet}
              peakData={routePeakData}
            >
              <PeakDetailsMap
                peakId={routePeakId}
                onClose={handleCloseRouteSheet}
              />
            </SimpleSheet>
          )}
        </React.Suspense>
      </div>
    );
  }
);

export default RouteMap;

RouteMap.displayName = "RouteMap";
