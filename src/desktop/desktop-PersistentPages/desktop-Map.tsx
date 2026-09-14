import React, { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import type { MapLayerMouseEvent, MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./desktop-Map.module.css";
import {
  MAPBOX_ACCESS_TOKEN,
  PEAK_ICONS,
  getElevationRangeFilter,
} from "../desktop-components/desktop-Map/desktop-MapUtils.tsx";
import { MapLayerManager } from "../desktop-components/desktop-Map/desktop-MapLayers.tsx";
import MapControls from "../desktop-components/desktop-MapControls/desktop-MapControls.tsx";
import MapChallengesModal from "../desktop-components/desktop-Map/desktop-MapChallengesModal.tsx";
import type { VisiblePeaksListItem } from "../desktop-components/desktop-MapControls/desktop-MapControls.tsx";
import LoginRequiredPopup from "../desktop-components/desktop-LoginRequiredPopup";
import { useMapNavigation } from "../desktop-context/desktop-MapNavigationContext.tsx";
import type { PeakData, ShelterData } from "../desktop-context/desktop-MapNavigationContext.tsx";
import { useMap } from "../desktop-context/desktop-MapContext.tsx";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import { enableMapboxTerrain } from "../../shared/utils/mapboxTerrain";
import { checkWebGLSupport } from "../../shared/utils/webglDetection";

// Initialize Mapbox token
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Constants
const DEFAULT_CENTER: [number, number] = [2.0, 42.0];
const DEFAULT_ZOOM = 1;
const TARGET_ZOOM = 16;
const FLY_DURATION = 1200;
const NAVIGATION_FLY_DURATION = 3000;
const WHEEL_ZOOM_RATE = 1 / 450;
const RESIZE_DELAY = 200;
const STYLE_CHECK_INTERVAL = 100;

// Layer IDs constants
const LAYER_IDS = {
  PEAK_SYMBOLS: "peak-symbols",
  PEAK_LABELS: "peak-labels",
  USER_PEAKS: "user-peaks-symbols",
  SHELTER_SYMBOLS: "shelter-symbols",
  LIST_PEAKS: {
    COMPLETED: "list-peaks-completed",
    BLACK: "list-peaks-black",
    BURGUNDY: "list-peaks-burgundy",
    RED: "list-peaks-red",
    ORANGE: "list-peaks-orange",
    YELLOW: "list-peaks-yellow",
    GREEN: "list-peaks-green",
  },
} as const;

// Source IDs constants
const SOURCE_IDS = {
  PEAKS: "peaks-source",
  SHELTERS: "shelters-source",
  USER_PEAKS: "user-peaks-source",
  LIST_PEAKS: "list-peaks",
} as const;

/**
 * Main Map component that handles Mapbox GL integration and peak visualization
 */
const Map: React.FC = () => {
  // Load initial values from localStorage (defined before refs to avoid hoisting issues)
  const getInitialStyle = (): "outdoors" | "satellite" => {
    const savedStyle = localStorage.getItem("mapStyle") as
      | "outdoors"
      | "satellite"
      | null;
    return savedStyle === "outdoors" || savedStyle === "satellite"
      ? savedStyle
      : "satellite";
  };

  const getInitialGlobeEnabled = (): boolean => {
    const savedGlobeEnabled = localStorage.getItem("globeEnabled");
    return savedGlobeEnabled !== null ? savedGlobeEnabled === "true" : true;
  };

  const getInitialTerrainEnabled = (): boolean => {
    const savedTerrainEnabled = localStorage.getItem("terrainEnabled");
    // Default to true if not set
    return savedTerrainEnabled !== null ? savedTerrainEnabled === "true" : true;
  };

  const getInitialPeaksVisible = (): boolean => {
    const saved = localStorage.getItem("peaksVisible");
    return saved !== null ? saved === "true" : true;
  };

  const getInitialSheltersVisible = (): boolean => {
    const saved = localStorage.getItem("sheltersVisible");
    return saved !== null ? saved === "true" : true;
  };

  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layerManagerRef = useRef<MapLayerManager | null>(null);
  const mapLoadedRef = useRef<boolean>(false);
  const visiblePeaksTimerRef = useRef<number | null>(null);
  const isVisiblePeaksEnabledRef = useRef(true);
  const isTerrainEnabledRef = useRef(getInitialTerrainEnabled());
  const previousUrlParamsRef = useRef<{ userPeaks: string | null; listId: string | null }>({
    userPeaks: null,
    listId: null,
  });

  // Context hooks
  const { navigationState, clearNavigation } = useMapNavigation();
  const {
    mapFilters,
    peakLists,
    isLoadingLists,
    userPeaks,
    isLoadingUserPeaks,
    handleCloseMapFilters,
    handleMapDragStart,
    showLoginPopup,
    loginPopupMessage,
    setShowLoginPopup,
    listGeoJsons,
    fetchListGeoJson,
    // Simplified filter state
    pendingFilter,
    requestFilter,
    confirmFilterApplied,
    isNearbyPeaksEnabled,
    setIsNearbyPeaksEnabled,
  } = useMap();

  const mapFiltersRef = useRef(mapFilters);
  const peakListsRef = useRef(peakLists);
  const listGeoJsonsRef = useRef(listGeoJsons);
  const userPeaksRef = useRef(userPeaks);
  const selectedListIdRef = useRef<number | null>(null);
  const selectedPeakIdRef = useRef<number | null>(null);
  const { trackEvent } = useAnalytics();

  // Extract values from context
  const elevationRange = mapFilters.elevationRange;

  // State
  const [selectedPeakId, setSelectedPeakId] = useState<number | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<number | null>(null);
  const [selectedPeakData, setSelectedPeakData] = useState<PeakData | null>(
    null
  );
  const [selectedShelterData, setSelectedShelterData] =
    useState<ShelterData | null>(null);
  const [currentMapStyle, setCurrentMapStyle] = useState<
    "outdoors" | "satellite"
  >(() => getInitialStyle());
  const [isGlobeEnabled, setIsGlobeEnabled] = useState<boolean>(
    () => getInitialGlobeEnabled()
  );
  const [isTerrainEnabled, setIsTerrainEnabled] = useState<boolean>(
    () => getInitialTerrainEnabled()
  );
  const [isPeaksVisible, setIsPeaksVisible] = useState<boolean>(
    () => getInitialPeaksVisible()
  );
  const [isSheltersVisible, setIsSheltersVisible] = useState<boolean>(
    () => getInitialSheltersVisible()
  );
  const [mapInstanceReady, setMapInstanceReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isVisiblePeaksEnabled, setIsVisiblePeaksEnabled] = useState(true);
  const [visiblePeaks, setVisiblePeaks] = useState<VisiblePeaksListItem[]>([]);
  const [isVisiblePeaksLoading, setIsVisiblePeaksLoading] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);

  // Close sheet when navigating away from map routes
  const handleCloseSheet = useCallback(() => {
    setSelectedPeakId(null);
    setSelectedPeakData(null);
  }, []);

  const handleCloseShelterDetails = useCallback(() => {
    setSelectedShelterId(null);
    setSelectedShelterData(null);
  }, []);

  // URL params → map state (processes whenever URL params change)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const userPeaksParam = searchParams.get("userPeaks");
    const listId = searchParams.get("listId");

    // Check if URL params have changed
    const hasChanged =
      previousUrlParamsRef.current.userPeaks !== userPeaksParam ||
      previousUrlParamsRef.current.listId !== listId;

    if (!hasChanged) return;

    // Update previous values
    previousUrlParamsRef.current = {
      userPeaks: userPeaksParam,
      listId: listId,
    };

    // Process userPeaks parameter
    if (userPeaksParam === "1" || userPeaksParam === "true") {
      requestFilter({ type: "user-peaks" });
      return;
    }

    // Process listId parameter
    if (listId) {
      requestFilter({ type: "list-detail", listId: Number(listId) });
      return;
    }
  }, [searchParams, requestFilter]);

  // Update refs when props change
  useEffect(() => {
    mapFiltersRef.current = mapFilters;
  }, [mapFilters]);

  useEffect(() => {
    peakListsRef.current = peakLists;
  }, [peakLists]);

  useEffect(() => {
    listGeoJsonsRef.current = listGeoJsons;
  }, [listGeoJsons]);

  useEffect(() => {
    userPeaksRef.current = userPeaks;
  }, [userPeaks]);

  useEffect(() => {
    const currentFilter = pendingFilter || mapFilters.activeFilter;
    selectedListIdRef.current =
      currentFilter.type === "list-detail" ? currentFilter.listId : null;
  }, [pendingFilter, mapFilters.activeFilter]);

  useEffect(() => {
    selectedPeakIdRef.current = selectedPeakId;
  }, [selectedPeakId]);

  useEffect(() => {
    isVisiblePeaksEnabledRef.current = isVisiblePeaksEnabled;
  }, [isVisiblePeaksEnabled]);

  useEffect(() => {
    isTerrainEnabledRef.current = isTerrainEnabled;
  }, [isTerrainEnabled]);

  /**
   * Wait for map style to be loaded
   */
  const waitForMapStyle = useCallback(
    async (map: mapboxgl.Map): Promise<void> => {
      if (map.isStyleLoaded()) return;

      return new Promise((resolve) => {
        const checkStyle = () => {
          if (map.isStyleLoaded()) {
            resolve();
          } else {
            setTimeout(checkStyle, STYLE_CHECK_INTERVAL);
          }
        };
        checkStyle();
      });
    },
    []
  );

  /**
   * Wait for map readiness (map initialized, style loaded, map load event fired, layer manager ready, peakLists loaded)
   */
  const waitForMapReadiness = useCallback(async (): Promise<boolean> => {
    const map = mapRef.current;
    if (!map) {
      return false;
    }

    // Wait for map style to be loaded
    await waitForMapStyle(map);

    // Wait for map load event to have fired (this is when tile peaks are added)
    if (!mapLoadedRef.current) {
      return false;
    }

    // Wait for layer manager to be ready
    if (!layerManagerRef.current) {
      return false;
    }

    return true;
  }, [waitForMapStyle]);

  /**
   * Load an image into the map
   */
  const loadMapImage = useCallback(
    async (
      map: mapboxgl.Map,
      imageId: string,
      imageUrl: string
    ): Promise<void> => {
      if (map.hasImage(imageId)) return;

      return new Promise((resolve) => {
        map.loadImage(imageUrl, (err, img) => {
          if (!err && img && !map.hasImage(imageId)) {
            try {
              map.addImage(imageId, img);
            } catch {
              // Ignore duplicate add errors
            }
          }
          resolve();
        });
      });
    },
    []
  );

  /**
   * Calculate the best coordinates considering map wrapping
   */
  const calculateBestCoordinates = useCallback(
    (
      baseCoords: [number, number],
      clickPoint: { x: number; y: number },
      map: mapboxgl.Map
    ): [number, number] => {
      const candidateLngs = [-720, -360, 0, 360, 720].map(
        (offset) => baseCoords[0] + offset
      );

      const candidatePoints = candidateLngs.map((lng) => {
        const screenPoint = map.project([lng, baseCoords[1]]);
        const dx = screenPoint.x - clickPoint.x;
        const dy = screenPoint.y - clickPoint.y;
        return {
          lng,
          lat: baseCoords[1],
          distance: dx * dx + dy * dy,
        };
      });

      const best = candidatePoints.reduce((prev, curr) =>
        curr.distance < prev.distance ? curr : prev
      );

      return [best.lng, best.lat];
    },
    []
  );

  /**
   * Handle peak selection and navigation
   */
  const handlePeakSelection = useCallback(
    async (
      peakId: number,
      coordinates: [number, number],
      map: mapboxgl.Map,
      peakData?: PeakData | null
    ) => {
      // Track peak click
      // Set peak data immediately if available for instant sheet display
      if (peakData) {
        setSelectedPeakData(peakData);
      }

      // Set selected peak ID for bottom sheet immediately
      setSelectedPeakId(peakId);

      // Fly to peak immediately using click coordinates
      const targetZoom = Math.max(TARGET_ZOOM, map.getZoom());
      map.flyTo({
        center: coordinates,
        zoom: targetZoom,
        duration: FLY_DURATION,
        essential: true,
      });
    },
    []
  );

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
   * Handle map touch events
   */
  const handleMapTouch = useCallback(() => {
    handleCloseMapFilters();
    handleMapDragStart();
  }, [handleCloseMapFilters, handleMapDragStart]);

  /**
   * Get list layers that should be queried
   */
  const getQueryLayers = useCallback((map: mapboxgl.Map): string[] => {
    const layers: string[] = [LAYER_IDS.PEAK_SYMBOLS, LAYER_IDS.SHELTER_SYMBOLS];

    Object.values(LAYER_IDS.LIST_PEAKS).forEach((layerId) => {
      if (map.getLayer(layerId)) layers.push(layerId);
    });

    if (map.getLayer(LAYER_IDS.USER_PEAKS)) {
      layers.push(LAYER_IDS.USER_PEAKS);
    }

    return layers;
  }, []);

  const clearVisiblePeaksTimer = useCallback(() => {
    if (visiblePeaksTimerRef.current) {
      window.clearTimeout(visiblePeaksTimerRef.current);
      visiblePeaksTimerRef.current = null;
    }
  }, []);

  const refreshVisiblePeaks = useCallback(async () => {
    if (!isVisiblePeaksEnabledRef.current) return;
    const map = mapRef.current;
    if (!map) return;

    const isReady = await waitForMapReadiness();
    if (!isReady || !isVisiblePeaksEnabledRef.current) return;

    const currentFilter = pendingFilter || mapFilters.activeFilter;
    const activeSource: "tile" | "list" | "user" =
      currentFilter.type === "user-peaks"
        ? "user"
        : currentFilter.type === "list-detail"
        ? "list"
        : "tile";

    const layerIds =
      activeSource === "user"
        ? [LAYER_IDS.USER_PEAKS]
        : activeSource === "list"
        ? Object.values(LAYER_IDS.LIST_PEAKS)
        : [LAYER_IDS.PEAK_SYMBOLS];

    const availableLayerIds = layerIds.filter((layerId) =>
      map.getLayer(layerId)
    );

    if (!availableLayerIds.length) {
      setVisiblePeaks([]);
      setIsVisiblePeaksLoading(false);
      return;
    }

    setIsVisiblePeaksLoading(true);
    try {
      // Query all rendered features in the entire viewport
      // This gets all features that are currently visible/rendered on the map
      const container = map.getContainer();
      const features = map.queryRenderedFeatures(
        [
          [0, 0],
          [container.clientWidth, container.clientHeight],
        ],
        {
          layers: availableLayerIds,
        }
      );

      // Collect all unique peaks first
      const uniquePeaks = new globalThis.Map<number, VisiblePeaksListItem>();
      for (const feature of features) {
        const props = feature.properties || {};
        const rawId =
          (props as Record<string, unknown>)["id"] ?? feature.id ?? null;
        const idNumber =
          typeof rawId === "string" ? Number(rawId) : (rawId as number | null);
        if (!idNumber || Number.isNaN(idNumber) || uniquePeaks.has(idNumber)) {
          continue;
        }

        const elevationValue = Number(
          (props as Record<string, unknown>)["elevation"] ?? 0
        );

        const nameEnValue = (props as Record<string, unknown>)["name_en"];
        const adminHierarchyValue = (props as Record<string, unknown>)[
          "admin_hierarchy"
        ];
        const imageValue = (props as Record<string, unknown>)["image"] as
          | string
          | null
          | undefined;

        // Extract coordinates based on source type (matching map click handler logic)
        let coordinates: { lat: number; lng: number } | null = null;

        if (activeSource === "user" && userPeaksRef.current) {
          // For user peaks, look up from original GeoJSON
          const match = userPeaksRef.current.geojson.features.find(
            (f) => f.properties?.id === idNumber
          );
          if (match?.geometry?.type === "Point") {
            const [lng, lat] = match.geometry.coordinates;
            if (
              typeof lng === "number" &&
              typeof lat === "number" &&
              !Number.isNaN(lng) &&
              !Number.isNaN(lat)
            ) {
              coordinates = { lng, lat };
            }
          }
        } else if (activeSource === "list" && selectedListIdRef.current) {
          // For list peaks, look up from original GeoJSON
          const geojson = listGeoJsonsRef.current[selectedListIdRef.current];
          const match = geojson?.features.find(
            (f) => f.properties?.id === idNumber
          );
          if (match?.geometry?.type === "Point") {
            const [lng, lat] = match.geometry.coordinates;
            if (
              typeof lng === "number" &&
              typeof lat === "number" &&
              !Number.isNaN(lng) &&
              !Number.isNaN(lat)
            ) {
              coordinates = { lng, lat };
            }
          }
        } else if (activeSource === "tile") {
          // For tile peaks, try properties first, then geometry
          const lng = (props as Record<string, unknown>)["lng"] as
            | number
            | undefined;
          const lat = (props as Record<string, unknown>)["lat"] as
            | number
            | undefined;

          if (typeof lng === "number" && typeof lat === "number") {
            coordinates = { lng, lat };
          } else if (
            feature.geometry &&
            feature.geometry.type === "Point" &&
            Array.isArray(feature.geometry.coordinates) &&
            feature.geometry.coordinates.length >= 2
          ) {
            // GeoJSON Point coordinates are [lng, lat]
            const [geoLng, geoLat] = feature.geometry.coordinates;
            if (
              typeof geoLng === "number" &&
              typeof geoLat === "number" &&
              !Number.isNaN(geoLng) &&
              !Number.isNaN(geoLat)
            ) {
              coordinates = { lng: geoLng, lat: geoLat };
            }
          }
        }

        // Skip if no coordinates found
        if (!coordinates) {
          continue;
        }

        uniquePeaks.set(idNumber, {
          id: idNumber,
          name:
            ((props as Record<string, unknown>)["name"] as string) ||
            `Peak ${idNumber}`,
          name_en:
            nameEnValue === undefined ? null : (nameEnValue as string | null),
          elevation: Number.isNaN(elevationValue) ? 0 : elevationValue,
          admin_hierarchy:
            adminHierarchyValue === undefined
              ? null
              : (adminHierarchyValue as any),
          source: activeSource,
          image:
            imageValue === undefined ? null : (imageValue as string | null),
          coordinates,
        });
      }

      // Sort all peaks by elevation (descending)
      const sorted = Array.from(uniquePeaks.values()).sort(
        (a, b) => b.elevation - a.elevation
      );
      setVisiblePeaks(sorted);
    } finally {
      setIsVisiblePeaksLoading(false);
    }
  }, [pendingFilter, mapFilters.activeFilter, waitForMapReadiness]);

  const scheduleVisiblePeaksRefresh = useCallback(() => {
    clearVisiblePeaksTimer();
    if (!isVisiblePeaksEnabledRef.current) return;
    visiblePeaksTimerRef.current = window.setTimeout(() => {
      void refreshVisiblePeaks();
    }, 500);
  }, [clearVisiblePeaksTimer, refreshVisiblePeaks]);

  const handleVisiblePeaksInteractionStart = useCallback(() => {
    if (!isVisiblePeaksEnabledRef.current) return;
    clearVisiblePeaksTimer();
    setIsVisiblePeaksLoading(false);
  }, [clearVisiblePeaksTimer]);

  const handleVisiblePeaksInteractionEnd = useCallback(() => {
    if (!isVisiblePeaksEnabledRef.current) return;
    scheduleVisiblePeaksRefresh();
  }, [scheduleVisiblePeaksRefresh]);

  const handleVisiblePeaksToggle = useCallback(
    (enabled: boolean) => {
      setIsVisiblePeaksEnabled(enabled);
      if (!enabled) {
        clearVisiblePeaksTimer();
        setVisiblePeaks([]);
        setIsVisiblePeaksLoading(false);
      } else {
        scheduleVisiblePeaksRefresh();
      }
    },
    [clearVisiblePeaksTimer, scheduleVisiblePeaksRefresh]
  );

  // Keep the layer manager in sync with the tile peaks/shelters visibility toggles
  useEffect(() => {
    layerManagerRef.current?.setPeaksVisible(isPeaksVisible);
  }, [isPeaksVisible]);

  useEffect(() => {
    layerManagerRef.current?.setSheltersVisible(isSheltersVisible);
  }, [isSheltersVisible]);

  const handlePeaksToggle = useCallback(
    (enabled: boolean) => {
      trackEvent("map_layer_toggle", `peaks_${enabled ? "on" : "off"}`);
      setIsPeaksVisible(enabled);
      try {
        localStorage.setItem("peaksVisible", enabled.toString());
      } catch {
        // Ignore storage write failures (e.g. private mode)
      }
    },
    [trackEvent]
  );

  const handleSheltersToggle = useCallback(
    (enabled: boolean) => {
      trackEvent("map_layer_toggle", `shelters_${enabled ? "on" : "off"}`);
      setIsSheltersVisible(enabled);
      try {
        localStorage.setItem("sheltersVisible", enabled.toString());
      } catch {
        // Ignore storage write failures (e.g. private mode)
      }
    },
    [trackEvent]
  );

  /**
   * Initialize map
   */
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check WebGL support before initializing
    const webglCheck = checkWebGLSupport();
    if (!webglCheck.isSupported) {
      setWebglError(webglCheck.error || "WebGL is not available");
      return;
    }

    // Get initial style and projection from localStorage
    const initialStyle = getInitialStyle();
    const initialGlobeEnabled = getInitialGlobeEnabled();
    const initialTerrainEnabled = getInitialTerrainEnabled();
    const initialStyleUrl =
      initialStyle === "satellite"
        ? "mapbox://styles/mapbox/satellite-v9"
        : "mapbox://styles/morris999/cmgzijuf7008n01qu8zwp3byu";
    const initialProjection = initialGlobeEnabled ? "globe" : "mercator";

    let map: mapboxgl.Map | null = null;
    try {
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: initialStyleUrl,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        minZoom: 1,
        attributionControl: false,
        projection: initialProjection,
        maxPitch: 60,
      });
    } catch (error) {
      console.error("[Map] Failed to initialize Mapbox:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to initialize map. Please try refreshing the page.";
      setWebglError(errorMessage);
      return;
    }

    if (!map) return;

    mapRef.current = map;
    setMapInstanceReady(true);

    // Add error handler for WebGL context loss
    map.on("error", (e) => {
      console.error("[Map] Mapbox error:", e);
      if (e.error?.message?.includes("WebGL") || e.error?.message?.includes("Failed to initialize")) {
        setWebglError(e.error.message || "WebGL initialization failed");
      }
    });

    // Configure zoom behavior
    map.scrollZoom.setWheelZoomRate(WHEEL_ZOOM_RATE);
    map.scrollZoom.enable({ around: "center" });
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();

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

    // Initialize on load
    map.on("load", async () => {
      mapLoadedRef.current = true;
      setTimeout(() => map.resize(), RESIZE_DELAY);

      // Load all peak icons
      await Promise.all(
        Object.entries(PEAK_ICONS).map(([key, url]) =>
          loadMapImage(map, key, url)
        )
      );

      // Set initial terrain if enabled
      if (initialTerrainEnabled) {
        enableMapboxTerrain(map);
      }

      // Add vector source
      if (!map.getSource(SOURCE_IDS.PEAKS)) {
        const tileserverUrl = import.meta.env["VITE_TILESERVER_URL"];
        map.addSource(SOURCE_IDS.PEAKS, {
          type: "vector",
          tiles: [`${tileserverUrl}/peaks_tiles/{z}/{x}/{y}.pbf`],
          maxzoom: 15,
        });
      }

      // Add shelter vector source
      if (!map.getSource(SOURCE_IDS.SHELTERS)) {
        const tileserverUrl = import.meta.env["VITE_TILESERVER_URL"];
        map.addSource(SOURCE_IDS.SHELTERS, {
          type: "vector",
          tiles: [`${tileserverUrl}/shelters_tiles/{z}/{x}/{y}.pbf`],
          maxzoom: 15,
        });
      }

      // Add peak layers
      getElevationRangeFilter(elevationRange[0], elevationRange[1]);

      // Mark map as loaded
      setMapLoaded(true);
    });

    // Initialize layer manager
    layerManagerRef.current = new MapLayerManager(map);

    // Update layer manager's current style to match the initial style
    layerManagerRef.current.setCurrentStyle(initialStyleUrl);

    // Restore peaks/shelters visibility from localStorage
    layerManagerRef.current.setPeaksVisible(getInitialPeaksVisible());
    layerManagerRef.current.setSheltersVisible(getInitialSheltersVisible());

    // Set initial elevation range
    layerManagerRef.current.setElevationRange(elevationRange);

    // Re-initialize terrain on style changes
    map.on("style.load", () => {
      if (isTerrainEnabledRef.current) {
        // Wait a bit for style to be fully ready
        setTimeout(() => {
          const currentMap = mapRef.current;
          if (!currentMap || !isTerrainEnabledRef.current) return;

          try {
            enableMapboxTerrain(currentMap);
          } catch (error) {
            console.error("[Map] Failed to re-enable terrain on style load:", error);
          }
        }, 100);
      }
    });

    // Event listeners
    map.on("click", LAYER_IDS.PEAK_SYMBOLS, (e: MapLayerMouseEvent) => {
      e.preventDefault();
      if (!e.features?.length) return;

      const feature = e.features[0];
      if (!feature) return;
      const props = feature.properties || {};

      // Try to get coordinates from feature properties first (most accurate)
      const lng = (props as Record<string, unknown>)["lng"] as
        | number
        | undefined;
      const lat = (props as Record<string, unknown>)["lat"] as
        | number
        | undefined;

      // Fall back to click coordinates if properties don't have lng/lat
      const coords: [number, number] =
        typeof lng === "number" && typeof lat === "number"
          ? [lng, lat]
          : [e.lngLat.lng, e.lngLat.lat];

      const peakId =
        ((props as Record<string, unknown>)["id"] as
          | string
          | number
          | undefined) || feature.id?.toString();

      if (peakId) {
        // Extract peak data for immediate display
        const peakName = (props as Record<string, unknown>)["name"] as
          | string
          | undefined;
        const peakNameEn = (props as Record<string, unknown>)["name_en"] as
          | string
          | undefined;
        const peakElevation = (props as Record<string, unknown>)[
          "elevation"
        ] as number | undefined;

        let peakData: PeakData | null = null;
        if (peakName && peakElevation !== undefined) {
          peakData = {
            name: peakName,
            elevation: peakElevation,
          };
          if (peakNameEn) {
            peakData.name_en = peakNameEn;
          }
        } else {
          peakData = {
            name: `Peak ${peakId}`,
            elevation: peakElevation || 0,
          };
        }

        handlePeakSelection(Number(peakId), coords, map, peakData);
      }
    });

    // General click handler
    map.on("click", async (e: MapMouseEvent) => {
      const layers = getQueryLayers(map);
      const features = map.queryRenderedFeatures(e.point, { layers });

      if (features.length === 0) {
        // Empty click - handle based on sheet state
        if (selectedPeakIdRef.current !== null) {
          // Sheet is open - close sheet
          setSelectedPeakId(null);
          setSelectedPeakData(null);
        }
        return;
      }

      // Check if clicked on shelter layer first
      const shelterFeature = features.find(f => f.layer?.id === LAYER_IDS.SHELTER_SYMBOLS);
      if (shelterFeature) {
        e.preventDefault();
        const props = shelterFeature.properties || {};
        const shelterId = (props as Record<string, unknown>)["id"] as
          | string
          | number
          | undefined;
        if (shelterId) {
          trackEvent("shelter_click", `shelter_${shelterId}`);
          const shelterProps = props as Record<string, unknown>;
          const shelterName =
            typeof shelterProps["name_en"] === "string" &&
            shelterProps["name_en"]
              ? shelterProps["name_en"]
              : typeof shelterProps["name"] === "string" &&
                  shelterProps["name"]
                ? shelterProps["name"]
                : "Shelter";
          const elevationRaw = shelterProps["elevation"];
          setSelectedShelterData({
            name: shelterName,
            name_en:
              typeof shelterProps["name_en"] === "string"
                ? (shelterProps["name_en"] as string)
                : null,
            elevation:
              typeof elevationRaw === "number"
                ? elevationRaw
                : elevationRaw != null
                  ? Number(elevationRaw)
                  : null,
            shelter_type:
              typeof shelterProps["shelter_type"] === "string"
                ? (shelterProps["shelter_type"] as string)
                : "shelter",
          });
          setSelectedShelterId(Number(shelterId));
          // Fly to shelter
          const lng = (props as Record<string, unknown>)["lng"] as number | undefined;
          const lat = (props as Record<string, unknown>)["lat"] as number | undefined;
          if (typeof lng === "number" && typeof lat === "number" && map) {
            map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16), duration: 1200 });
          }
        }
        return;
      }

      // Priority system for feature selection
      const priorityMap: Record<string, number> = {
        [LAYER_IDS.LIST_PEAKS.COMPLETED]: 0,
        [LAYER_IDS.LIST_PEAKS.BLACK]: 1,
        [LAYER_IDS.LIST_PEAKS.BURGUNDY]: 2,
        [LAYER_IDS.LIST_PEAKS.RED]: 3,
        [LAYER_IDS.LIST_PEAKS.ORANGE]: 4,
        [LAYER_IDS.LIST_PEAKS.YELLOW]: 5,
        [LAYER_IDS.LIST_PEAKS.GREEN]: 6,
        [LAYER_IDS.USER_PEAKS]: 7,
        [LAYER_IDS.PEAK_SYMBOLS]: 8,
      };

      const topFeature = features.sort((a, b) => {
        const aPriority = priorityMap[a.layer?.id || ""] ?? 99;
        const bPriority = priorityMap[b.layer?.id || ""] ?? 99;
        return aPriority - bPriority;
      })[0];

      if (!topFeature) {
        return;
      }

      const isListPeak = topFeature.source === SOURCE_IDS.LIST_PEAKS;
      const isUserPeak = topFeature.source === SOURCE_IDS.USER_PEAKS;
      const isTilePeak = topFeature.source === SOURCE_IDS.PEAKS;

      if (!isListPeak && !isUserPeak && !isTilePeak) return;

      const props = topFeature.properties || {};
      const peakId = (props as Record<string, unknown>)["id"] as
        | string
        | number
        | undefined;

      if (!peakId) return;

      // If clicking the same peak while sheet is open, do nothing
      if (selectedPeakId === Number(peakId)) {
        return;
      }

      // Track peak click
      trackEvent(
        "peak_click",
        `peak_${peakId}_${isListPeak ? "list" : isUserPeak ? "user" : "tile"}`
      );

      // Extract peak data from feature properties
      const peakName = (props as Record<string, unknown>)["name"] as
        | string
        | undefined;
      const peakNameEn = (props as Record<string, unknown>)["name_en"] as
        | string
        | undefined;
      const peakElevation = (props as Record<string, unknown>)["elevation"] as
        | number
        | undefined;

      // Prepare peak data for immediate display
      let peakData: PeakData | null = null;
      if (peakName && peakElevation !== undefined) {
        peakData = {
          name: peakName,
          elevation: peakElevation,
        };
        if (peakNameEn) {
          peakData.name_en = peakNameEn;
        }
      } else {
        // For user peaks or list peaks without name, we'll need to fetch the data
        // For now, set a placeholder
        peakData = {
          name: `Peak ${peakId}`,
          elevation: peakElevation || 0,
        };
      }

      // Find original coordinates based on source type
      let originalCoords: [number, number] | null = null;

      if (isUserPeak && userPeaksRef.current) {
        const match = userPeaksRef.current.geojson.features.find(
          (f) => f.properties?.id === peakId
        );
        if (match?.geometry?.type === "Point") {
          originalCoords = match.geometry.coordinates as [number, number];
        }
      } else if (isListPeak && selectedListIdRef.current) {
        const geojson = listGeoJsonsRef.current[selectedListIdRef.current];
        const match = geojson?.features.find(
          (f) => f.properties?.id === peakId
        );
        if (match?.geometry?.type === "Point") {
          originalCoords = match.geometry.coordinates as [number, number];
        }
      } else if (isTilePeak) {
        // For tile peaks, try to get coordinates from properties first
        const lng = (props as Record<string, unknown>)["lng"] as
          | number
          | undefined;
        const lat = (props as Record<string, unknown>)["lat"] as
          | number
          | undefined;

        if (typeof lng === "number" && typeof lat === "number") {
          originalCoords = [lng, lat];
        }
      }

      // Use the best available coordinates
      const baseCoords =
        originalCoords ||
        (topFeature.geometry?.type === "Point"
          ? (topFeature.geometry?.coordinates as
              | [number, number]
              | undefined) ?? [e.lngLat.lng, e.lngLat.lat]
          : [e.lngLat.lng, e.lngLat.lat]);

      const coords = calculateBestCoordinates(baseCoords, e.point, map);
      await handlePeakSelection(Number(peakId), coords, map, peakData);
    });

    // Touch events
    map.on("touchstart", handleMapTouch);
    map.on("touchend", handleMapTouch);

    // Resize handling
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    document.addEventListener("visibilitychange", handleResize);

    const currentContainerRef = mapContainerRef.current;
    let resizeObserver: ResizeObserver | null = null;

    if (currentContainerRef && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(currentContainerRef);
    }

    // Cleanup
    return () => {
      map.off("touchstart", handleMapTouch);
      map.off("touchend", handleMapTouch);
      map.off("rotate", updateCompassVisibility);
      map.off("pitch", updateCompassVisibility);
      map.off("moveend", updateCompassVisibility);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      document.removeEventListener("visibilitychange", handleResize);

      if (resizeObserver && currentContainerRef) {
        resizeObserver.unobserve(currentContainerRef);
      }

      map.remove();
      setMapInstanceReady(false);
    };
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstanceReady || !mapRef.current) return;
    const map = mapRef.current;
    const startEvents = [
      "movestart",
      "zoomstart",
      "rotatestart",
      "pitchstart",
      "dragstart",
    ] as const;
    const endEvents = [
      "moveend",
      "zoomend",
      "rotateend",
      "pitchend",
      "dragend",
    ] as const;

    startEvents.forEach((event) =>
      map.on(event as any, handleVisiblePeaksInteractionStart)
    );
    endEvents.forEach((event) =>
      map.on(event as any, handleVisiblePeaksInteractionEnd)
    );

    return () => {
      startEvents.forEach((event) =>
        map.off(event as any, handleVisiblePeaksInteractionStart)
      );
      endEvents.forEach((event) =>
        map.off(event as any, handleVisiblePeaksInteractionEnd)
      );
    };
  }, [
    mapInstanceReady,
    handleVisiblePeaksInteractionStart,
    handleVisiblePeaksInteractionEnd,
  ]);

  // Trigger visible peaks refresh when dependencies change
  useEffect(() => {
    if (!isVisiblePeaksEnabled) return;
    if (!mapInstanceReady || !mapLoadedRef.current) return;
    scheduleVisiblePeaksRefresh();
  }, [
    isVisiblePeaksEnabled,
    mapFilters.activeFilter,
    elevationRange,
    mapInstanceReady,
    scheduleVisiblePeaksRefresh,
  ]);

  // Initial load: trigger visible peaks after map is fully loaded
  useEffect(() => {
    if (!isVisiblePeaksEnabled) return;
    if (!mapInstanceReady || !mapLoaded) return;

    // Wait a bit for layers to be fully rendered before querying
    const timer = setTimeout(() => {
      if (isVisiblePeaksEnabledRef.current && mapLoadedRef.current) {
        void refreshVisiblePeaks();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [mapInstanceReady, mapLoaded, isVisiblePeaksEnabled, refreshVisiblePeaks]);

  useEffect(() => {
    return () => {
      clearVisiblePeaksTimer();
    };
  }, [clearVisiblePeaksTimer]);

  /**
   * Handle navigation state changes
   */
  useEffect(() => {
    if (
      !navigationState.targetCoordinates ||
      (!navigationState.targetPeakId && !navigationState.targetShelterId)
    ) {
      return;
    }

    const { lat, lng } = navigationState.targetCoordinates;
    const targetShelterId = navigationState.targetShelterId;
    const targetShelterData = navigationState.targetShelterData;
    const targetPeakId = navigationState.targetPeakId;
    const targetPeakData = navigationState.targetPeakData;
    const resetMapState = navigationState.resetMapState;

    let cancelled = false;

    const applyNavigation = () => {
      const map = mapRef.current;
      if (!map) {
        // Map not initialized yet (e.g. Map page just mounted): retry
        // instead of dropping the navigation request.
        if (!cancelled) {
          setTimeout(applyNavigation, STYLE_CHECK_INTERVAL);
        }
        return;
      }

      const targetZoom = Math.max(TARGET_ZOOM, map.getZoom());

      // Reset map state if requested
      if (resetMapState) {
        // Wait for map to be ready before resetting filters to avoid race conditions
        waitForMapReadiness().then((isReady) => {
          if (isReady && !cancelled) {
            // Reset to default tile mode by clearing any active filters
            requestFilter({ type: "tile" });
          }
        });
      }

      // Calculate padding that accounts for header
      const calculateMapPadding = (): {
        top: number;
        right: number;
        bottom: number;
        left: number;
      } => {
        // Round all values to integers
        return {
          top: Math.round(16), // Small margin
          right: Math.round(16),
          bottom: Math.round(100), // Space for sheet/UI
          left: Math.round(16), // Small margin
        };
      };

      // Add a small delay to ensure map and overlays are fully rendered
      setTimeout(() => {
        map.flyTo({
          center: [lng, lat],
          zoom: targetZoom,
          duration: NAVIGATION_FLY_DURATION,
          essential: true,
          padding: calculateMapPadding(),
        });
      }, 100);

      // Handle shelter navigation
      if (targetShelterId) {
        // Close peak sheet if open
        if (selectedPeakIdRef.current !== null) {
          setSelectedPeakId(null);
          setSelectedPeakData(null);
        }

        setSelectedShelterId(targetShelterId);
        setSelectedShelterData(targetShelterData);
      } else {
        // Set peak data from navigation context if available
        if (targetPeakData) {
          setSelectedPeakData(targetPeakData);
        }

        handlePeakSelection(targetPeakId!, [lng, lat], map, targetPeakData);
      }

      // Clear navigation state after processing
      clearNavigation();
    };

    applyNavigation();

    return () => {
      cancelled = true;
    };
  }, [navigationState, handlePeakSelection, requestFilter, clearNavigation, waitForMapReadiness]);

  /**
   * Simplified Filter Effect
   * Applies the pending filter when one is set and data is ready.
   */
  useEffect(() => {
    // Only proceed if there's a pending filter
    if (!pendingFilter) {
      return;
    }

    const requestedFilter = pendingFilter;

    // Check data dependencies
    const canApplyFilter = (): boolean => {
      switch (requestedFilter.type) {
        case 'tile':
          return true; // No dependencies for tile mode
        case 'user-peaks':
          return !isLoadingUserPeaks && userPeaks !== null;
        case 'list-detail':
          return !isLoadingLists && peakLists.length > 0;
        default:
          return false;
      }
    };

    // If data not ready, wait (effect will re-run when dependencies change)
    if (!canApplyFilter()) {
      return;
    }

    // Data is ready, start applying
    const applyFilter = async () => {
      try {
        // Wait for map to be ready
        const isReady = await waitForMapReadiness();
        if (!isReady) {
          // Retry after a short delay
          setTimeout(applyFilter, STYLE_CHECK_INTERVAL);
          return;
        }

        const layerManager = layerManagerRef.current;
        if (!layerManager) {
          console.warn("[Map] Layer manager not available");
          confirmFilterApplied(); // Still confirm to reset status
          return;
        }

        // Determine if we should fit bounds (true when switching TO a filter, false when clearing to tile)
        const shouldFitBounds = requestedFilter.type !== "tile";

        switch (requestedFilter.type) {
          case "tile":
            await layerManager.setActiveFilter({ type: "tile" }, false);
            break;

          case "user-peaks":
            if (!userPeaks) {
              console.warn("[Map] User peaks data not available");
              confirmFilterApplied(); // Still confirm to reset status
              return;
            }
            await layerManager.setActiveFilter(
              { type: "user-peaks", data: userPeaks },
              shouldFitBounds
            );
            break;

          case "list-detail":
            // Find the selected list in peakLists
            const selectedList = peakLists.find(
              (l) => Number(l.list_id) === Number(requestedFilter.listId)
            );

            if (selectedList) {
              // Ensure GeoJSON is fetched
              const geojson = listGeoJsons[selectedList.list_id] || await fetchListGeoJson(selectedList.list_id);
              
              await layerManager.setActiveFilter(
                { type: "list-detail", data: selectedList, geojson },
                shouldFitBounds
              );
            } else {
              console.warn("[Map] List not found in peakLists", requestedFilter.listId);
              confirmFilterApplied(); // Still confirm to reset status
              return;
            }
            break;
        }

        // Successfully applied - confirm it
        confirmFilterApplied();
      } catch (error) {
        console.error("[Map] Error applying filter:", error);
        confirmFilterApplied(); // Still confirm to reset status even on error
      }
    };

    applyFilter();
  }, [
    pendingFilter,
    userPeaks,
    isLoadingUserPeaks,
    peakLists,
    isLoadingLists,
    listGeoJsons,
    fetchListGeoJson,
    waitForMapReadiness,
    confirmFilterApplied,
  ]);

  /**
   * Update elevation filters
   */
  useEffect(() => {
    layerManagerRef.current?.setElevationRange(elevationRange);
  }, [elevationRange]);

  /**
   * Handle map style change
   */
  const handleStyleChange = useCallback(
    async (style: "outdoors" | "satellite") => {
      trackEvent("map_style_change", style);
      setCurrentMapStyle(style);
      await layerManagerRef.current?.setMapStyle(style);
      
      // Re-initialize terrain after style change if enabled
      if (isTerrainEnabled && mapRef.current) {
        const map = mapRef.current;
        // Wait for style to load
        const waitForStyle = () => {
          if (map.isStyleLoaded()) {
            try {
              enableMapboxTerrain(map);
            } catch (error) {
              console.error("[Map] Failed to re-enable terrain:", error);
            }
          } else {
            setTimeout(waitForStyle, 100);
          }
        };
        waitForStyle();
      }
    },
    [trackEvent, isTerrainEnabled]
  );

  /**
   * Handle globe projection toggle
   */
  const handleGlobeToggle = useCallback((enabled: boolean) => {
    setIsGlobeEnabled(enabled);
    layerManagerRef.current?.setGlobeProjection(enabled);
  }, []);

  /**
   * Handle terrain toggle
   */
  const handleTerrainToggle = useCallback((enabled: boolean) => {
    setIsTerrainEnabled(enabled);
    isTerrainEnabledRef.current = enabled;
    const map = mapRef.current;
    if (!map) return;

    if (enabled) {
      try {
        enableMapboxTerrain(map);
      } catch (error) {
        console.error("[Map] Failed to set terrain:", error);
      }
    } else {
      // Disable terrain
      try {
        map.setTerrain(null);
      } catch (error) {
        console.error("[Map] Failed to remove terrain:", error);
      }
    }
  }, []);

  // Handle nearby peaks toggle
  useEffect(() => {
    if (layerManagerRef.current) {
      layerManagerRef.current.setNearbyPeaksEnabled(isNearbyPeaksEnabled);
    }
  }, [isNearbyPeaksEnabled]);

  // Show error state if WebGL is not available
  if (webglError) {
    return (
      <div className={styles["persistent-pages__page"]}>
        <div className={styles["map__layout"]}>
          <div className={styles["map__container"]}>
            <div className={styles["map__error-container"]}>
              <div className={styles["map__error-content"]}>
                <h2 className={`${styles["map__error-title"]} typography-desktop-title-large`}>
                  Map Unavailable
                </h2>
                <p className={`${styles["map__error-message"]} typography-desktop-body-medium`}>
                  Your browser doesn't support WebGL.
                </p>
                <a
                  href="https://get.webgl.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles["map__error-link"]} typography-desktop-body-medium`}
                >
                  Click here for more information
                </a>
                <button
                  className={`${styles["map__error-retry"]} typography-desktop-body-medium`}
                  onClick={() => {
                    setWebglError(null);
                    window.location.reload();
                  }}
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["persistent-pages__page"]}>
      <div className={styles["map__layout"]}>
        {/* Map Container */}
        <div className={styles["map__container"]}>
          <div
            ref={mapContainerRef}
            className={styles["map__mapbox-container"]}
          />
        </div>

        {/* Map Controls */}
        <MapControls
          onStyleChange={handleStyleChange}
          onGlobeToggle={handleGlobeToggle}
          onTerrainToggle={handleTerrainToggle}
          currentStyle={currentMapStyle}
          isGlobeEnabled={isGlobeEnabled}
          isTerrainEnabled={isTerrainEnabled}
          selectedPeakId={selectedPeakId}
          selectedPeakData={selectedPeakData}
          onClosePeakDetails={handleCloseSheet}
          isVisiblePeaksEnabled={isVisiblePeaksEnabled}
          onToggleVisiblePeaks={handleVisiblePeaksToggle}
          visiblePeaks={visiblePeaks}
          isVisiblePeaksLoading={isVisiblePeaksLoading}
          map={mapRef.current}
          isNearbyPeaksEnabled={isNearbyPeaksEnabled}
          onToggleNearbyPeaks={setIsNearbyPeaksEnabled}
          selectedShelterId={selectedShelterId}
          selectedShelterData={selectedShelterData}
          onCloseShelterDetails={handleCloseShelterDetails}
          isPeaksVisible={isPeaksVisible}
          onTogglePeaks={handlePeaksToggle}
          isSheltersVisible={isSheltersVisible}
          onToggleShelters={handleSheltersToggle}
        />
      </div>

      {/* Login Required Popup */}
      <LoginRequiredPopup
        isOpen={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
        message={loginPopupMessage}
      />

      <MapChallengesModal />
    </div>
  );
};

export default Map;
