// Map.tsx - Optimized Version with Filter State Machine
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  lazy,
  Suspense,
} from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Plus, Crosshair, X, WifiOff } from "lucide-react";
import mapboxgl from "mapbox-gl";
import type { MapLayerMouseEvent, MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./Map.module.css";
import {
  MAPBOX_ACCESS_TOKEN,
  PEAK_ICONS,
  getElevationRangeFilter,
} from "../components/Map/MapUtils";
import { MapLayerManager } from "../components/Map/MapLayers";
import LayerControl from "../components/Map/LayerControl";
import { OfflineRegionsControl } from "../components/OfflineMap/OfflineRegionsControl";
import MapHeader from "../components/MapHeader/MapHeader";
import MapChallengesModal from "../components/Map/MapChallengesModal";
import PeakChangeModal from "../components/Map/PeakChangeModal/PeakChangeModal";
import ShelterChangeModal from "../components/Map/ShelterChangeModal/ShelterChangeModal";
import SimpleSheet from "../components/Map/SheetWithKeyboard/SimpleSheet";
const PeakDetailsMap = lazy(
  () => import("../components/Map/PeakDetailsMap/PeakDetailsMap")
);
const ShelterDetailsMap = lazy(
  () => import("../components/Map/ShelterDetailsMap/ShelterDetailsMap")
);
import LoginRequiredPopup from "../components/LoginRequiredPopup";
import { useNavbarVisibility } from "../context/NavbarVisibilityContext";
import { useMapNavigation } from "../context/MapNavigationContext";
import type { PeakData } from "../context/MapNavigationContext";
import { useMap } from "../context/MapContext";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import { useI18n } from "../../shared/context/I18nContext";
import { enableMapboxTerrain } from "../../shared/utils/mapboxTerrain";
import { useOnlineStatus } from "../../shared/hooks/useOnlineStatus";
import { checkWebGLSupport } from "../../shared/utils/webglDetection";
import {
  createOfflineTransformRequest,
  installOfflineMapHooks,
  prewarmInitialViewport,
  getDataUrl,
  assetCacheKey,
} from "../../shared/offline";
import type {
  AdminSearchResult,
  MountainRangeSearchResult,
} from "../../shared/api/types";

// Initialize Mapbox token
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Constants
const DEFAULT_CENTER: [number, number] = [2.0, 42.0];
const DEFAULT_ZOOM = 1;

const TARGET_ZOOM = 16;
const FLY_DURATION = 1200;
const NAVIGATION_FLY_DURATION = 3000;
const WHEEL_ZOOM_RATE = 1.5;
const MAX_PITCH = 60;
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

const SEARCH_GEOMETRY_SOURCE_ID = "search-geometry";
const SEARCH_GEOMETRY_FILL_ID = "search-geometry-fill";
const SEARCH_GEOMETRY_LINE_ID = "search-geometry-line";

type SearchAreaResult = AdminSearchResult | MountainRangeSearchResult;
type SearchGeoJSON = GeoJSON.GeoJSON;

const SEARCH_FIT_BOUNDS_PADDING = {
  top: 120,
  right: 24,
  bottom: 120,
  left: 24,
};

const isRingClosed = (ring: number[][]): boolean => {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return (
    Array.isArray(first) &&
    Array.isArray(last) &&
    first.length >= 2 &&
    last.length >= 2 &&
    first[0] === last[0] &&
    first[1] === last[1]
  );
};

const shouldRenderFill = (data: SearchGeoJSON): boolean => {
  let hasPolygon = false;
  let allClosed = true;

  const checkGeometry = (geometry: GeoJSON.Geometry | null | undefined) => {
    if (!geometry) return;
    if (geometry.type === "Polygon") {
      hasPolygon = true;
      if (!geometry.coordinates.every(isRingClosed)) {
        allClosed = false;
      }
      return;
    }
    if (geometry.type === "MultiPolygon") {
      hasPolygon = true;
      if (
        !geometry.coordinates.every((polygon) =>
          polygon.every(isRingClosed)
        )
      ) {
        allClosed = false;
      }
      return;
    }
    if (geometry.type === "GeometryCollection") {
      geometry.geometries.forEach(checkGeometry);
    }
  };

  if (data.type === "FeatureCollection") {
    data.features.forEach((feature) => checkGeometry(feature.geometry));
  } else if (data.type === "Feature") {
    checkGeometry(data.geometry);
  } else {
    checkGeometry(data);
  }

  return hasPolygon && allClosed;
};

const normalizeSearchGeometry = (
  input: unknown
): SearchGeoJSON | null => {
  if (!input) return null;

  if (typeof input === "string") {
    try {
      return normalizeSearchGeometry(JSON.parse(input));
    } catch {
      return null;
    }
  }

  const asAny = input as {
    type?: unknown;
    features?: unknown;
    geometry?: unknown;
    coordinates?: unknown;
    geometries?: unknown;
    properties?: unknown;
  };

  if (asAny.type === "FeatureCollection" && Array.isArray(asAny.features)) {
    const features = asAny.features
      .map((feature) => normalizeSearchGeometry(feature))
      .filter((feature): feature is GeoJSON.Feature => {
        return Boolean(feature && feature.type === "Feature");
      });
    return { type: "FeatureCollection", features };
  }

  if (asAny.type === "Feature" && asAny.geometry) {
    const geometry = normalizeSearchGeometry(asAny.geometry);
    if (!geometry || geometry.type === "FeatureCollection") {
      return null;
    }
    return {
      type: "Feature",
      geometry: geometry as GeoJSON.Geometry,
      properties: (asAny.properties as GeoJSON.GeoJsonProperties) || {},
    };
  }

  if (
    asAny.type === "Polygon" ||
    asAny.type === "MultiPolygon" ||
    asAny.type === "LineString" ||
    asAny.type === "MultiLineString" ||
    asAny.type === "Point" ||
    asAny.type === "MultiPoint" ||
    asAny.type === "GeometryCollection"
  ) {
    const toPoint = (coord: number[]) => {
      const lng = Number(coord[0]);
      const lat = Number(coord[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
      return [lng, lat] as [number, number];
    };

    if (asAny.type === "Point") {
      const point = toPoint(asAny.coordinates as number[]);
      return point ? { type: "Point", coordinates: point } : null;
    }

    if (asAny.type === "MultiPoint") {
      const coordinates = (asAny.coordinates as number[][])
        .map(toPoint)
        .filter(Boolean) as [number, number][];
      return { type: "MultiPoint", coordinates };
    }

    if (asAny.type === "LineString") {
      const coordinates = (asAny.coordinates as number[][])
        .map(toPoint)
        .filter(Boolean) as [number, number][];
      return { type: "LineString", coordinates };
    }

    if (asAny.type === "MultiLineString") {
      const coordinates = (asAny.coordinates as number[][][]).map((line) =>
        line.map(toPoint).filter(Boolean) as [number, number][]
      );
      return { type: "MultiLineString", coordinates };
    }

    if (asAny.type === "Polygon") {
      const coordinates = (asAny.coordinates as number[][][]).map((ring) =>
        ring.map(toPoint).filter(Boolean) as [number, number][]
      );
      return { type: "Polygon", coordinates };
    }

    if (asAny.type === "MultiPolygon") {
      const coordinates = (asAny.coordinates as number[][][][]).map((polygon) =>
        polygon.map((ring) =>
          ring.map(toPoint).filter(Boolean) as [number, number][]
        )
      );
      return { type: "MultiPolygon", coordinates };
    }

    if (asAny.type === "GeometryCollection") {
      const geometries = Array.isArray(asAny.geometries)
        ? asAny.geometries
            .map((geometry) => normalizeSearchGeometry(geometry))
            .filter(
              (geometry): geometry is GeoJSON.Geometry =>
                Boolean(
                  geometry &&
                    geometry.type !== "FeatureCollection" &&
                    geometry.type !== "Feature"
                )
            )
        : [];
      return { type: "GeometryCollection", geometries };
    }
  }

  if (asAny.geometry) {
    return normalizeSearchGeometry(asAny.geometry);
  }

  return null;
};

const getBoundsFromGeometry = (
  data: SearchGeoJSON
): [[number, number], [number, number]] | null => {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  const extend = (coord: number[] | undefined) => {
    if (!coord || coord.length < 2) return;
    const lng = Number(coord[0]);
    const lat = Number(coord[1]);
    if (typeof lng !== "number" || typeof lat !== "number") return;
    if (Number.isNaN(lng) || Number.isNaN(lat)) return;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  };

  const extendFromGeometry = (geometry: GeoJSON.Geometry) => {
    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach((ring) => {
        ring.forEach(extend);
      });
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          ring.forEach(extend);
        });
      });
    } else if (geometry.type === "LineString") {
      geometry.coordinates.forEach(extend);
    } else if (geometry.type === "MultiLineString") {
      geometry.coordinates.forEach((line) => {
        line.forEach(extend);
      });
    } else if (geometry.type === "Point") {
      extend(geometry.coordinates);
    } else if (geometry.type === "MultiPoint") {
      geometry.coordinates.forEach(extend);
    } else if (geometry.type === "GeometryCollection") {
      geometry.geometries.forEach(extendFromGeometry);
    }
  };

  if (data.type === "FeatureCollection") {
    data.features.forEach((feature) => {
      if (feature.geometry) {
        extendFromGeometry(feature.geometry);
      }
    });
  } else if (data.type === "Feature") {
    if (data.geometry) {
      extendFromGeometry(data.geometry);
    }
  } else {
    extendFromGeometry(data);
  }

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
};

/**
 * Main Map component that handles Mapbox GL integration and peak visualization
 */
const Map: React.FC = () => {
  // Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const layerManagerRef = useRef<MapLayerManager | null>(null);
  const selectedListIdRef = useRef<number | null>(null);
  const selectedPeakIdRef = useRef<number | null>(null);
  const selectedShelterIdRef = useRef<number | null>(null);
  const isUIHiddenRef = useRef<boolean>(false);
  const mapLoadedRef = useRef<boolean>(false);
  const previousUrlParamsRef = useRef<{
    userPeaks: string | null;
    listId: string | null;
  }>({
    userPeaks: null,
    listId: null,
  });

  // Context hooks
  const { navigationState, clearNavigation } = useMapNavigation();
  const {
    mapFilters,
    peakLists,
    isLoadingLists,
    listGeoJsons,
    fetchListGeoJson,
    userPeaks,
    isLoadingUserPeaks,
    handleCloseMapFilters,
    handleMapDragStart,
    showLoginPopup,
    loginPopupMessage,
    setShowLoginPopup,
    // Simplified filter state
    pendingFilter,
    requestFilter,
    confirmFilterApplied,
    isNearbyPeaksEnabled,
    setIsNearbyPeaksEnabled,
  } = useMap();

  const peakListsRef = useRef(peakLists);
  const listGeoJsonsRef = useRef(listGeoJsons);
  const userPeaksRef = useRef(userPeaks);
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { setNavbarHidden } = useNavbarVisibility();

  // Extract values from context
  const elevationRange = mapFilters.elevationRange;

  const location = useLocation();

  // Load initial values from localStorage
  const getInitialStyle = (): "outdoors" | "satellite" => {
    const savedStyle = localStorage.getItem("mapStyle") as
      | "outdoors"
      | "satellite"
      | null;
    const preferred =
      savedStyle === "outdoors" || savedStyle === "satellite"
        ? savedStyle
        : "satellite";
    if (preferred === "satellite" && typeof navigator !== "undefined" && !navigator.onLine) {
      return "outdoors";
    }
    return preferred;
  };

  const getSavedViewport = (): { center: [number, number]; zoom: number } | null => {
    try {
      const vp = localStorage.getItem("mapViewport");
      if (vp) {
        const parsed = JSON.parse(vp);
        if (
          Array.isArray(parsed.center) &&
          parsed.center.length === 2 &&
          typeof parsed.zoom === "number"
        ) {
          return { center: parsed.center as [number, number], zoom: parsed.zoom };
        }
      }
    } catch {}
    return null;
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

  // State
  const [selectedPeakId, setSelectedPeakId] = useState<number | null>(null);
  const [selectedShelterId, setSelectedShelterId] = useState<number | null>(null);
  const [selectedPeakData, setSelectedPeakData] = useState<PeakData | null>(
    null
  );
  const [selectedShelterData, setSelectedShelterData] = useState<PeakData | null>(
    null
  );
  const [currentMapStyle, setCurrentMapStyle] = useState<
    "outdoors" | "satellite"
  >(() => getInitialStyle());
  const [isGlobeEnabled, setIsGlobeEnabled] = useState<boolean>(
    () => getInitialGlobeEnabled()
  );
  const [isTerrainEnabled, setIsTerrainEnabled] = useState<boolean>(
    () => getInitialTerrainEnabled()
  );
  const isOnline = useOnlineStatus();
  const [isUIHidden, setIsUIHidden] = useState<boolean>(false);
  const [isLayerControlOpen, setIsLayerControlOpen] = useState<boolean>(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState<boolean>(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [entityTab, setEntityTab] = useState<"peak" | "shelter">("peak");
  const [isPickingPeakLocation, setIsPickingPeakLocation] = useState(false);
  const [pendingPeakCoords, setPendingPeakCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingShelterCoords, setPendingShelterCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingEditPeakCoords, setPendingEditPeakCoords] = useState<{ lat: number; lng: number } | null>(null);
  const isPickingForEditRef = useRef(false);
  const savedPeakIdForEditRef = useRef<number | null>(null);
  const savedPeakDataForEditRef = useRef<PeakData | null>(null);

  const setSelectedPeakIdWithNavbar = useCallback(
    (nextPeakId: number | null) => {
      selectedPeakIdRef.current = nextPeakId;
      setSelectedPeakId(nextPeakId);
    },
    []
  );

  const isPickingPeakLocationRef = useRef(false);
  const selectedPeakDataRef = useRef<PeakData | null>(null);
  const pendingAddTypeRef = useRef<"peak" | "shelter">("peak");

  useEffect(() => {
    isPickingPeakLocationRef.current = isPickingPeakLocation;
  }, [isPickingPeakLocation]);

  useEffect(() => {
    selectedPeakDataRef.current = selectedPeakData;
  }, [selectedPeakData]);

  const pickMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const removePickMarker = useCallback(() => {
    if (pickMarkerRef.current) {
      pickMarkerRef.current.remove();
      pickMarkerRef.current = null;
    }
  }, []);

  const setIsUIHiddenWithNavbar = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      const nextValue =
        typeof value === "function" ? value(isUIHiddenRef.current) : value;
      isUIHiddenRef.current = nextValue;
      setIsUIHidden(nextValue);
    },
    []
  );

  const setIsLayerControlOpenWithNavbar = useCallback(
    (open: boolean) => {
      setIsLayerControlOpen(open);
    },
    []
  );

  // Terrain ref for style.load handler
  const isTerrainEnabledRef = useRef(getInitialTerrainEnabled());
  
  useEffect(() => {
    isTerrainEnabledRef.current = isTerrainEnabled;
  }, [isTerrainEnabled]);

  const isOnlineRef = useRef(isOnline);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  /**
   * Enforce a flat 2D camera when offline: no terrain, no tilt (pitch is
   * clamped to 0 and the pitch gestures are disabled). Rotation and pan stay
   * enabled. Restores pitch gestures and terrain when back online.
   */
  const applyCameraMode = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (isOnlineRef.current) {
        map.setMaxPitch(MAX_PITCH);
        map.touchPitch.enable();
        if (isTerrainEnabledRef.current) {
          enableMapboxTerrain(map);
        }
      } else {
        map.setMaxPitch(0);
        map.setPitch(0);
        map.setTerrain(null);
        map.touchPitch.disable();
      }
    } catch {
      // ignore gesture/terrain errors on styles that don't support them
    }
  }, []);

  useEffect(() => {
    applyCameraMode();
  }, [isOnline, applyCameraMode]);

  useEffect(() => {
    selectedPeakIdRef.current = selectedPeakId;
  }, [selectedPeakId]);

  useEffect(() => {
    selectedShelterIdRef.current = selectedShelterId;
  }, [selectedShelterId]);

  useEffect(() => {
    isUIHiddenRef.current = isUIHidden;
  }, [isUIHidden]);

  useEffect(() => {
    if (location.pathname === "/map") {
      setNavbarHidden(
        isUIHidden || selectedPeakId !== null || isLayerControlOpen
      );
    } else {
      setNavbarHidden(false);
    }
  }, [isLayerControlOpen, isUIHidden, selectedPeakId, setNavbarHidden, location.pathname]);

  useEffect(() => {
    return () => {
      setNavbarHidden(false);
    };
  }, [setNavbarHidden]);

  // Close sheet when navigating away from map routes
  const handleCloseSheet = useCallback(() => {
    setSelectedPeakIdWithNavbar(null);
    setSelectedPeakData(null);
  }, [setSelectedPeakIdWithNavbar]);

  const handleCloseShelterSheet = useCallback(() => {
    setSelectedShelterId(null);
    setSelectedShelterData(null);
    setIsUIHiddenWithNavbar(false);
  }, [setIsUIHiddenWithNavbar]);

  const handleRequestPickLocation = useCallback(() => {
    setShowCreateModal(false);
    setPendingPeakCoords(null);
    isPickingForEditRef.current = false;
    pendingAddTypeRef.current = "peak";
    removePickMarker();
    setPickedCoords(null);
    setIsPickingPeakLocation(true);
  }, [removePickMarker]);

  const handleRequestShelterPickLocation = useCallback(() => {
    setShowCreateModal(false);
    setPendingShelterCoords(null);
    isPickingForEditRef.current = false;
    pendingAddTypeRef.current = "shelter";
    removePickMarker();
    setPickedCoords(null);
    setIsPickingPeakLocation(true);
  }, [removePickMarker]);

  const handleEntityTabChange = useCallback((tab: "peak" | "shelter") => {
    setEntityTab(tab);
  }, []);

  const handleRequestEditPickLocation = useCallback(() => {
    setShowCreateModal(false);
    setPendingPeakCoords(null);
    isPickingForEditRef.current = true;
    savedPeakIdForEditRef.current = selectedPeakIdRef.current;
    savedPeakDataForEditRef.current = selectedPeakDataRef.current;
    setSelectedPeakIdWithNavbar(null);
    setSelectedPeakData(null);
    removePickMarker();
    setPickedCoords(null);
    setIsPickingPeakLocation(true);
  }, [removePickMarker, setSelectedPeakIdWithNavbar]);

  const handleCancelPickLocation = useCallback(() => {
    removePickMarker();
    setPickedCoords(null);
    setIsPickingPeakLocation(false);
    trackEvent("interaction", "peak_change_pick_cancel");
  }, [removePickMarker, trackEvent]);

  const handleAcceptPickLocation = useCallback(() => {
    if (!pickedCoords) return;
    removePickMarker();
    const coords = pickedCoords;
    setPickedCoords(null);
    setIsPickingPeakLocation(false);
    trackEvent("interaction", "peak_change_pick_accept");
    if (isPickingForEditRef.current) {
      setPendingEditPeakCoords(coords);
      const peakId = savedPeakIdForEditRef.current;
      const peakData = savedPeakDataForEditRef.current;
      savedPeakIdForEditRef.current = null;
      savedPeakDataForEditRef.current = null;
      if (peakId) setSelectedPeakIdWithNavbar(peakId);
      if (peakData) setSelectedPeakData(peakData);
    } else if (pendingAddTypeRef.current === "shelter") {
      pendingAddTypeRef.current = "peak";
      setEntityTab("shelter");
      setPendingShelterCoords(coords);
      setShowCreateModal(true);
    } else {
      setEntityTab("peak");
      setPendingPeakCoords(coords);
      setShowCreateModal(true);
    }
  }, [pickedCoords, removePickMarker, trackEvent]);

  // Clean up pick marker on unmount
  useEffect(() => {
    return () => {
      removePickMarker();
    };
  }, [removePickMarker]);

  // Update map cursor when in pick-location mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = isPickingPeakLocation ? "crosshair" : "";
  }, [isPickingPeakLocation]);

  // Handle nearby peaks toggle
  useEffect(() => {
    if (layerManagerRef.current) {
      layerManagerRef.current.setNearbyPeaksEnabled(isNearbyPeaksEnabled);
    }
  }, [isNearbyPeaksEnabled]);

  // URL params → map state (processes whenever URL params change)
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const userPeaksParam = searchParams.get("userPeaks");
    const listId = searchParams.get("listId") ?? searchParams.get("list_id");

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
    peakListsRef.current = peakLists;
  }, [peakLists]);

  useEffect(() => {
    listGeoJsonsRef.current = listGeoJsons;
  }, [listGeoJsons]);

  useEffect(() => {
    const currentFilter = pendingFilter || mapFilters.activeFilter;
    selectedListIdRef.current =
      currentFilter.type === "list-detail" ? currentFilter.listId : null;
  }, [pendingFilter, mapFilters.activeFilter]);

  useEffect(() => {
    userPeaksRef.current = userPeaks;
  }, [userPeaks]);

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
   * Wait for map readiness (map initialized, style loaded, map load event fired, layer manager ready)
   * Returns a promise that resolves to true when the map is ready, false otherwise
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

  const drawSearchGeometry = useCallback((data: SearchGeoJSON) => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const normalizedData: GeoJSON.FeatureCollection =
      data.type === "FeatureCollection"
        ? data
        : data.type === "Feature"
          ? { type: "FeatureCollection", features: [data] }
          : {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: data,
                  properties: {},
                },
              ],
            };

    const existingSource = map.getSource(
      SEARCH_GEOMETRY_SOURCE_ID
    ) as mapboxgl.GeoJSONSource | null;

    if (existingSource) {
      existingSource.setData(normalizedData);
    } else {
      map.addSource(SEARCH_GEOMETRY_SOURCE_ID, {
        type: "geojson",
        data: normalizedData,
      });
    }

    const beforeLayerId = map.getLayer(LAYER_IDS.PEAK_SYMBOLS)
      ? LAYER_IDS.PEAK_SYMBOLS
      : undefined;

    const shouldFill = shouldRenderFill(normalizedData);
    if (shouldFill) {
      if (!map.getLayer(SEARCH_GEOMETRY_FILL_ID)) {
        map.addLayer(
          {
            id: SEARCH_GEOMETRY_FILL_ID,
            type: "fill",
            source: SEARCH_GEOMETRY_SOURCE_ID,
            paint: {
              "fill-color": "#3b82f6",
              "fill-opacity": 0.18,
            },
          },
          beforeLayerId
        );
      }
    } else if (map.getLayer(SEARCH_GEOMETRY_FILL_ID)) {
      map.removeLayer(SEARCH_GEOMETRY_FILL_ID);
    }

    if (!map.getLayer(SEARCH_GEOMETRY_LINE_ID)) {
      map.addLayer(
        {
          id: SEARCH_GEOMETRY_LINE_ID,
          type: "line",
          source: SEARCH_GEOMETRY_SOURCE_ID,
          paint: {
            "line-color": "#2563eb",
            "line-width": 2,
          },
        },
        beforeLayerId
      );
    }
    if (map.getLayer(SEARCH_GEOMETRY_LINE_ID)) {
      map.moveLayer(SEARCH_GEOMETRY_LINE_ID);
    }
  }, []);

  const handleSearchAreaSelect = useCallback(
    async (result: SearchAreaResult) => {
      const isReady = await waitForMapReadiness();
      if (!isReady) return;

      const map = mapRef.current;
      if (!map) return;

      const geometry = normalizeSearchGeometry(result.geometry);
      if (!geometry) {
        console.warn("[Map] Invalid search geometry", result);
        return;
      }

      drawSearchGeometry(geometry);
      const bounds = getBoundsFromGeometry(geometry);
      if (bounds) {
        map.fitBounds(bounds, {
          padding: SEARCH_FIT_BOUNDS_PADDING,
          duration: 1000,
          essential: true,
        });
      }
    },
    [waitForMapReadiness, drawSearchGeometry]
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
      console.log("[Map] handlePeakSelection: peakId =", peakId, "| hasPeakData =", !!peakData);
      // Close shelter sheet if open
      if (selectedShelterIdRef.current !== null) {
        setSelectedShelterId(null);
        setSelectedShelterData(null);
      }
      // Set peak data immediately if available for instant sheet display
      if (peakData) {
        setSelectedPeakData(peakData);
      }

      // Show UI and set selected peak ID for bottom sheet immediately
      setIsUIHiddenWithNavbar(false);
      setSelectedPeakIdWithNavbar(peakId);

      // Fly to peak immediately using click coordinates
      const targetZoom = Math.max(TARGET_ZOOM, map.getZoom());
      map.flyTo({
        center: coordinates,
        zoom: targetZoom,
        duration: FLY_DURATION,
        essential: true,
      });
    },
    [setIsUIHiddenWithNavbar, setSelectedPeakData, setSelectedPeakIdWithNavbar]
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

  /**
   * Initialize map
   */
  useEffect(() => {
    if (!mapContainerRef.current) return;

    let cancelled = false;
    let mapInstance: mapboxgl.Map | null = null;
    let offlineHooksCleanup: (() => void) | undefined;
    let resizeObserver: ResizeObserver | null = null;
    const currentContainerRef = mapContainerRef.current;
    let updateCompassVisibility: (() => void) | null = null;

    const saveViewport = () => {
      if (!mapRef.current) return;
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      try {
        localStorage.setItem(
          "mapViewport",
          JSON.stringify({
            center: [center.lng, center.lat],
            zoom,
          })
        );
      } catch {
        // Ignore storage write failures (e.g. private mode)
      }
    };

    const boot = async () => {
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
      const initialProjection =
        initialGlobeEnabled && navigator.onLine ? "globe" : "mercator";
      const savedViewport = getSavedViewport();
      const initialCenter = savedViewport?.center ?? DEFAULT_CENTER;
      const initialZoom = savedViewport?.zoom ?? DEFAULT_ZOOM;

      // Warm the offline tile cache BEFORE the map asks for tiles (IndexedDB is
      // async, transformRequest must stay synchronous). Waiting here guarantees
      // the style + visible tiles are in the memory cache before mapbox-gl
      // requests them, so the map renders instead of a blank canvas when offline.
      await prewarmInitialViewport({
        center: initialCenter,
        zoom: initialZoom,
        styleUrl: initialStyleUrl,
      });
      if (cancelled) return;

      // When offline, the map must be served entirely from the offline cache.
      // mapbox-gl resolves `mapbox://styles/...` URLs via network tileJSON, so
      // hand it the cached style (a data: URL) directly instead. The memory
      // cache is only populated by prewarmInitialViewport above, so this lookup
      // must happen after it.  The globe projection also needs network
      // (background + ocean tiles), so mercator is forced when offline — either
      // way the style load fails and the map would never appear.
      let offlineStyleUrl: string | undefined;
      if (!navigator.onLine) {
        const candidates = [
          initialStyleUrl,
          initialStyle === "satellite"
            ? "mapbox://styles/morris999/cmgzijuf7008n01qu8zwp3byu"
            : "mapbox://styles/mapbox/satellite-v9",
        ];
        for (const url of candidates) {
          const cached = getDataUrl(
            assetCacheKey({
              sourceKey: "style",
              id: url.replace(/^mapbox:\/\/styles\//, ""),
              mime: "application/json",
            })
          );
          if (cached) {
            offlineStyleUrl = cached;
            break;
          }
        }
      }

      let map: mapboxgl.Map;
      try {
        map = new mapboxgl.Map({
          container: currentContainerRef,
          style: offlineStyleUrl || initialStyleUrl,
          center: initialCenter,
          zoom: initialZoom,
          minZoom: 1,
          maxPitch: MAX_PITCH,
          attributionControl: false,
          projection: initialProjection,
          transformRequest: createOfflineTransformRequest(),
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
      mapInstance = map;
      try {
        mapRef.current = map;
        offlineHooksCleanup = installOfflineMapHooks(map, initialStyleUrl);
      } catch (error) {
        console.warn("[Map] Failed to install offline hooks:", error);
      }


    // Add error handler for WebGL context loss
    map.on("error", (e) => {
      console.error("[Map] Mapbox error:", e);
      if (
        e.error?.message?.includes("WebGL") ||
        e.error?.message?.includes("Failed to initialize")
      ) {
        setWebglError(e.error.message || "WebGL initialization failed");
      }
    });

    // Configure zoom behavior
    map.scrollZoom.setWheelZoomRate(WHEEL_ZOOM_RATE);
    map.scrollZoom.enable(); // Standard zoom behavior (towards cursor) is more intuitive
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enable();
    map.touchPitch.enable();
    map.dragRotate.enable();
    map.dragPan.enable();

    // Compass — hidden when north, fades in on rotation/tilt
    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: false,
        visualizePitch: true,
      }),
      "top-right",
    );

    updateCompassVisibility = () => {
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

      // Enforce offline camera mode (flat 2D) right at load if needed.
      applyCameraMode();

      // Set initial terrain if enabled
      if (initialTerrainEnabled && isOnlineRef.current) {
        enableMapboxTerrain(map);
      }

      // Add vector source
      if (!map.getSource(SOURCE_IDS.PEAKS)) {
        const tileserverUrl = import.meta.env["VITE_TILESERVER_URL"];
        map.addSource(SOURCE_IDS.PEAKS, {
          type: "vector",
          tiles: [`${tileserverUrl}/peaks_tiles/{z}/{x}/{y}.pbf`],
          maxzoom: 15,
          promoteId: "id",
        });
      }

      // Add shelter vector source
      if (!map.getSource(SOURCE_IDS.SHELTERS)) {
        const tileserverUrl = import.meta.env["VITE_TILESERVER_URL"];
        map.addSource(SOURCE_IDS.SHELTERS, {
          type: "vector",
          tiles: [`${tileserverUrl}/shelters_tiles/{z}/{x}/{y}.pbf`],
          maxzoom: 15,
          promoteId: "id",
        });
      }

      // Add peak layers
      getElevationRangeFilter(elevationRange[0], elevationRange[1]);
    });

    // Initialize layer manager
    layerManagerRef.current = new MapLayerManager(map);

    // Update layer manager's current style to match the initial style
    layerManagerRef.current.setCurrentStyle(initialStyleUrl);

    // Set initial elevation range
    layerManagerRef.current.setElevationRange(elevationRange);

    // Re-initialize terrain on style changes
    map.on("style.load", () => {
      if (isTerrainEnabledRef.current) {
        setTimeout(() => {
          const currentMap = mapRef.current;
          if (!currentMap || !isTerrainEnabledRef.current) return;

          try {
            if (isOnlineRef.current) {
              enableMapboxTerrain(currentMap);
            }
          } catch (error) {
            console.error("[Map] Failed to re-enable terrain on style load:", error);
          }
        }, 100);
      }
    });

    // Event listeners
    map.on("click", LAYER_IDS.PEAK_SYMBOLS, (e: MapLayerMouseEvent) => {
      if (!e.features?.length) {
        console.log("[Map] PEAK_SYMBOLS click: no features");
        return;
      }

      const feature = e.features[0];
      if (!feature) {
        console.log("[Map] PEAK_SYMBOLS click: no feature");
        return;
      }
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
        e.preventDefault();
        console.log("[Map] PEAK_SYMBOLS click: peakId =", peakId);

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
      } else {
        console.log("[Map] PEAK_SYMBOLS click: no peakId in properties");
      }
    });

    // General click handler
    map.on("click", async (e: MapMouseEvent) => {
      // Pick-location mode
      if (isPickingPeakLocationRef.current) {
        const coords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        removePickMarker();
        setPickedCoords(coords);
        pickMarkerRef.current = new mapboxgl.Marker({ color: "#dc2626" })
          .setLngLat([coords.lng, coords.lat])
          .addTo(map);
        return;
      }

      const layers = getQueryLayers(map);
      const features = map.queryRenderedFeatures(e.point, { layers });

      console.log("[Map] General click: features found =", features.length);

      if (features.length === 0) {
        console.log("[Map] General click: no features, peak sheet open =", selectedPeakIdRef.current !== null, "shelter sheet open =", selectedShelterIdRef.current !== null);
        // Empty click - handle based on sheet state
        if (selectedPeakIdRef.current !== null) {
          // Peak sheet is open - close it and show UI
          setSelectedPeakIdWithNavbar(null);
          setSelectedPeakData(null);
          setIsUIHiddenWithNavbar(false);
        } else if (selectedShelterIdRef.current !== null) {
          // Shelter sheet is open - close it and show UI
          setSelectedShelterId(null);
          setSelectedShelterData(null);
          setIsUIHiddenWithNavbar(false);
        } else {
          // Sheet is closed - toggle UI visibility
          setIsUIHiddenWithNavbar((prev) => !prev);
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
          // Close peak sheet if open
          if (selectedPeakIdRef.current !== null) {
            setSelectedPeakIdWithNavbar(null);
            setSelectedPeakData(null);
          }
          trackEvent("shelter_click", `shelter_${shelterId}`);
          const name = (props as Record<string, unknown>)["name"] as string | undefined;
          const nameEn = (props as Record<string, unknown>)["name_en"] as string | undefined;
          const elevation = (props as Record<string, unknown>)["elevation"] as number | undefined;
          setSelectedShelterId(Number(shelterId));
          setSelectedShelterData({
            name: name || nameEn || "Unknown Shelter",
            name_en: nameEn || null,
            elevation: elevation || 0,
          });
          setIsUIHiddenWithNavbar(true);
          // Fly to shelter
          const lng = (props as Record<string, unknown>)["lng"] as number | undefined;
          const lat = (props as Record<string, unknown>)["lat"] as number | undefined;
          if (typeof lng === "number" && typeof lat === "number" && map) {
            map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), TARGET_ZOOM), duration: FLY_DURATION });
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
        console.log("[Map] General click: no topFeature after sort");
        return;
      }

      const isListPeak = topFeature.source === SOURCE_IDS.LIST_PEAKS;
      const isUserPeak = topFeature.source === SOURCE_IDS.USER_PEAKS;
      const isTilePeak = topFeature.source === SOURCE_IDS.PEAKS;

      console.log("[Map] General click: topFeature source =", topFeature.source, { isListPeak, isUserPeak, isTilePeak });

      if (!isListPeak && !isUserPeak && !isTilePeak) {
        console.log("[Map] General click: unrecognized source, skipping");
        return;
      }

      const props = topFeature.properties || {};
      const peakId = (props as Record<string, unknown>)["id"] as
        | string
        | number
        | undefined;

      if (!peakId) {
        console.log("[Map] General click: no peakId in properties");
        return;
      }

      console.log("[Map] General click: peakId =", peakId, "| current selectedPeakId =", selectedPeakId);

      // If clicking the same peak while sheet is open, do nothing
      if (selectedPeakId === Number(peakId)) {
        console.log("[Map] General click: same peak, ignoring");
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
      } else if (isListPeak) {
        const geojson = selectedListIdRef.current ? listGeoJsonsRef.current[selectedListIdRef.current] : null;
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

    // Save viewport on move for offline restoration
    map.on("moveend", saveViewport);

    if (currentContainerRef && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(currentContainerRef);
    }
    };

    void boot();

    // Cleanup
    return () => {
      cancelled = true;
      if (mapInstance) {
        mapInstance.off("touchstart", handleMapTouch);
        mapInstance.off("touchend", handleMapTouch);
        mapInstance.off("moveend", saveViewport);
        mapInstance.off("rotate", updateCompassVisibility!);
        mapInstance.off("pitch", updateCompassVisibility!);
        mapInstance.off("moveend", updateCompassVisibility!);
      }
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      document.removeEventListener("visibilitychange", handleResize);

      if (resizeObserver && currentContainerRef) {
        resizeObserver.unobserve(currentContainerRef);
      }

      offlineHooksCleanup?.();
      if (mapInstance) {
        mapInstance.remove();
      }
    };
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // Add a small delay to ensure map and overlays are fully rendered
      setTimeout(() => {
        // Remove all padding so the target location is dead center
        map.flyTo({
          center: [lng, lat],
          zoom: targetZoom,
          duration: NAVIGATION_FLY_DURATION,
          essential: true,
          padding: { top: 0, bottom: 100, left: 0, right: 0 },
        });
      }, 100);

      // Handle shelter navigation
      if (targetShelterId) {
        // Close peak sheet if open
        if (selectedPeakIdRef.current !== null) {
          setSelectedPeakIdWithNavbar(null);
          setSelectedPeakData(null);
        }

        if (targetShelterData) {
          const sd = targetShelterData;
          setSelectedShelterData({
            name: sd.name || sd.name_en || "Unknown Shelter",
            name_en: sd.name_en || null,
            elevation: sd.elevation || 0,
          });
        }

        setSelectedShelterId(targetShelterId);
        setIsUIHiddenWithNavbar(true);
      } else {
        // Handle peak navigation (existing logic)
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
  }, [navigationState, handlePeakSelection, requestFilter, clearNavigation, waitForMapReadiness, setSelectedPeakIdWithNavbar, setSelectedPeakData, setSelectedShelterId, setSelectedShelterData, setIsUIHiddenWithNavbar]);

  /**
   * Simplified Filter Effect
   * Applies the pending filter when one is set and data is ready.
   */
  useEffect(() => {
    let isCancelled = false;
    // Only proceed if there's a pending filter
    if (!pendingFilter) {
      return;
    }

    const requestedFilter = pendingFilter;

    // Check data dependencies
    const canApplyFilter = (): boolean => {
      switch (requestedFilter.type) {
        case "tile":
          return true; // No dependencies for tile mode
        case "user-peaks":
          return !isLoadingUserPeaks && userPeaks !== null;
        case "list-detail":
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
              console.warn(
                "[Map] List not found in peakLists",
                requestedFilter.listId
              );
              confirmFilterApplied(); // Still confirm to reset status
              return;
            }
            break;
        }

        // Successfully applied - confirm it
        if (!isCancelled) {
          confirmFilterApplied();
        }
      } catch (error) {
        if (!isCancelled) {
          console.error("[Map] Error applying filter:", error);
          confirmFilterApplied(); // Still confirm to reset status even on error
        }
      }
    };

    applyFilter();

    return () => {
      isCancelled = true;
    };
  }, [
    pendingFilter,
    userPeaks,
    isLoadingUserPeaks,
    peakLists,
    isLoadingLists,
    waitForMapReadiness,
    confirmFilterApplied,
  ]);

  useEffect(() => {
    layerManagerRef.current?.setNearbyPeaksEnabled(isNearbyPeaksEnabled);
  }, [isNearbyPeaksEnabled]);

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
      if (isTerrainEnabled && isOnlineRef.current && mapRef.current) {
        const map = mapRef.current;
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
  const handleGlobeToggle = useCallback(
    (enabled: boolean) => {
      trackEvent("map_layer_toggle", `globe_${enabled ? "on" : "off"}`);
      setIsGlobeEnabled(enabled);
      layerManagerRef.current?.setGlobeProjection(enabled);
    },
    [trackEvent]
  );

  /**
   * Handle terrain toggle
   */
  const handleTerrainToggle = useCallback((enabled: boolean) => {
    if (enabled && !isOnlineRef.current) return;
    trackEvent("map_layer_toggle", `terrain_${enabled ? "on" : "off"}`);
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
      try {
        map.setTerrain(null);
      } catch (error) {
        console.error("[Map] Failed to remove terrain:", error);
      }
    }
  }, [trackEvent]);

  // Show error state if WebGL is not available
  if (webglError) {
    return (
      <div className={styles["persistent-pages__page"]}>
        <div className={styles["map__container"]}>
          <div className={styles["map__error-container"]}>
            <div className={styles["map__error-content"]}>
              <h2
                className={`${styles["map__error-title"]} typography-headline-small`}
              >
                Map Unavailable
              </h2>
              <p
                className={`${styles["map__error-message"]} typography-body-medium`}
              >
                Your browser doesn't support WebGL.
              </p>
              <a
                href="https://get.webgl.org"
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles["map__error-link"]} typography-body-medium`}
              >
                Click here for more information
              </a>
              <button
                className={`${styles["map__error-retry"]} typography-body-medium`}
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
    );
  }

  return (
    <div className={styles["persistent-pages__page"]}>
      <div className={styles["map__container"]}>
        <div
          ref={mapContainerRef}
          className={styles["map__mapbox-container"]}
        />
        {selectedPeakId && (
          <SimpleSheet
            isOpen={!!selectedPeakId}
            onClose={handleCloseSheet}
            peakData={selectedPeakData}
          >
            <Suspense
              fallback={
                <div style={{ padding: "24px" }}>Loading peak details...</div>
              }
            >
              <PeakDetailsMap
                peakId={selectedPeakId}
                onClose={handleCloseSheet}
                onRequestPickLocation={handleRequestEditPickLocation}
                pendingEditCoords={pendingEditPeakCoords}
                onClearPendingEditCoords={() => setPendingEditPeakCoords(null)}
              />
            </Suspense>
          </SimpleSheet>
        )}
        {selectedShelterId && (
          <SimpleSheet
            isOpen={!!selectedShelterId}
            onClose={handleCloseShelterSheet}
            peakData={selectedShelterData}
            type="shelter"
          >
            <Suspense
              fallback={
                <div style={{ padding: "24px" }}>Loading shelter details...</div>
              }
            >
              <ShelterDetailsMap
                shelterId={selectedShelterId}
              />
            </Suspense>
          </SimpleSheet>
        )}
      </div>

      {/* LayerControl - moved outside map container */}
      <LayerControl
        onStyleChange={handleStyleChange}
        onGlobeToggle={handleGlobeToggle}
        onTerrainToggle={handleTerrainToggle}
        currentStyle={currentMapStyle}
        isGlobeEnabled={isGlobeEnabled}
        isTerrainEnabled={isTerrainEnabled}
        isOnline={isOnline}
        map={mapRef.current}
        isPopupVisible={!!selectedPeakId}
        fixedPosition={false}
        isUIHidden={isUIHidden || !!selectedPeakId}
        onOpenChange={setIsLayerControlOpenWithNavbar}
      />

      {/* Offline areas control */}
      <OfflineRegionsControl
        open={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
        map={mapRef.current}
        styleUrl={
          currentMapStyle === "satellite"
            ? "mapbox://styles/mapbox/satellite-v9"
            : "mapbox://styles/morris999/cmgzijuf7008n01qu8zwp3byu"
        }
      />

      {/* Header */}
      <MapHeader
        isUIHidden={isUIHidden || !!selectedPeakId}
        onAreaSelect={handleSearchAreaSelect}
      />

      {/* Nearby Peaks Toggle - Bottom Left */}
      {(mapFilters.activeFilter.type === "user-peaks" ||
        mapFilters.activeFilter.type === "list-detail") && (
        <label
          className={`${styles["map__nearby-toggle"]} ${
            isUIHidden || !!selectedPeakId
              ? styles["map__nearby-toggle--hidden"]
              : ""
          }`}
        >
          <input
            type="checkbox"
            checked={isNearbyPeaksEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              setIsNearbyPeaksEnabled(enabled);
              trackEvent("filter_change", `map_nearby_peaks_${enabled ? "on" : "off"}`);
            }}
            className={styles["map__checkbox"]}
          />
          <span
            className={`${styles["map__label"]} typography-body-medium`}
          >
            {t("main.allPeaks")}
          </span>
        </label>
      )}

      {/* Peak Location Picker Overlay */}
      {isPickingPeakLocation && (
        <div className={styles["map__pick-overlay"]}>
          <div className={styles["map__pick-overlay-content"]}>
            <Crosshair size={18} />
            <span className="typography-body-medium">
              {pendingAddTypeRef.current === "shelter"
                ? t("shelterChange.clickMapInstruction")
                : t("peakChange.clickMapInstruction")}
            </span>
          </div>
          <button
            className={styles["map__pick-overlay-close"]}
            onClick={handleCancelPickLocation}
            aria-label={t("peakChange.close")}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Peak Location Confirm Bar */}
      {isPickingPeakLocation && pickedCoords && (
        <div className={styles["map__pick-confirm"]}>
          <span className={`${styles["map__pick-confirm-coords"]} typography-body-small`}>
            {pickedCoords.lat.toFixed(5)}, {pickedCoords.lng.toFixed(5)}
          </span>
          <button
            className={`${styles["map__pick-confirm-accept"]} typography-button-medium`}
            onClick={handleAcceptPickLocation}
          >
            {t("peakChange.acceptLocation")}
          </button>
        </div>
      )}

      {/* Submit Peak Button */}
      <div
        className={`${styles["map__submit-peak-btn"]} ${
          isUIHidden || !!selectedPeakId || isPickingPeakLocation
            ? styles["map__submit-peak-btn--hidden"]
            : ""
        }`}
      >
        <button
          className={styles["map__submit-peak-btn__button"]}
          onClick={() => {
            setEntityTab("peak");
            setShowCreateModal(true);
          }}
          aria-label={t("peakChange.mapButtonLabel")}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Offline Maps Button */}
      <div
        className={`${styles["map__offline-btn"]} ${
          isUIHidden || !!selectedPeakId || isPickingPeakLocation
            ? styles["map__offline-btn--hidden"]
            : ""
        }`}
      >
        <button
          className={styles["map__offline-btn__button"]}
          onClick={() => setIsOfflineModalOpen(true)}
          aria-label={t("offline.title")}
        >
          <WifiOff size={20} />
        </button>
      </div>

      {/* Peak Change Create Modal */}
      <PeakChangeModal
        open={showCreateModal}
        hidden={entityTab !== "peak"}
        onClose={() => {
          setShowCreateModal(false);
          setPendingPeakCoords(null);
        }}
        mode="create"
        initialCoords={pendingPeakCoords}
        onRequestPickLocation={handleRequestPickLocation}
        showEntityTabs
        activeEntityTab={entityTab}
        onEntityTabChange={handleEntityTabChange}
      />

      {/* Shelter Change Create Modal */}
      <ShelterChangeModal
        open={showCreateModal}
        hidden={entityTab !== "shelter"}
        onClose={() => {
          setShowCreateModal(false);
          setPendingShelterCoords(null);
        }}
        mode="create"
        initialCoords={pendingShelterCoords}
        onRequestPickLocation={handleRequestShelterPickLocation}
        showEntityTabs
        activeEntityTab={entityTab}
        onEntityTabChange={handleEntityTabChange}
      />

      {/* Login Required Popup */}
      <LoginRequiredPopup
        isOpen={showLoginPopup}
        onClose={() => setShowLoginPopup(false)}
        message={loginPopupMessage}
      />

      {/* Challenges Modal */}
      <MapChallengesModal />
    </div>
  );
};

export default Map;
