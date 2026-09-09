"use client";

import React, {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search as SearchIcon,
  X,
  Clock,
  Users,
  List,
  User,
  Trophy,
  Plus,
} from "lucide-react";
import AdminSearchIcon from "../../../shared/components/AdminSearchIcon/AdminSearchIcon";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import MountainRangeIcon from "../../../shared/components/MountainRangeIcon/MountainRangeIcon";
import styles from "./desktop-MapControls.module.css";
import { useMapNavigation } from "../../desktop-context/desktop-MapNavigationContext.tsx";
import { useMap } from "../../desktop-context/desktop-MapContext.tsx";
import type { MapFilterType } from "../../desktop-context/desktop-MapContext.tsx";
import Slider from "@mui/material/Slider";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { searchRealtime } from "../../../shared/api/endpoints/user";
import { getElevationColor } from "../../../shared/constants/elevationColors";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import { useLatestSearchToken } from "../../../shared/hooks/useLatestSearchToken";
import ShelterIcon from "../../../shared/components/ShelterIcon/ShelterIcon";
import MapLayersDropdown from "./desktop-MapLayersDropdown.tsx";
import PeakChangeModal from "../../../mobile/components/Map/PeakChangeModal/PeakChangeModal";
import ShelterChangeModal from "../../../mobile/components/Map/ShelterChangeModal/ShelterChangeModal";
import type { PeakData, ShelterData } from "../../desktop-context/desktop-MapNavigationContext.tsx";
import type {
  PeakSearchResult,
  UserSearchResult,
  AdminHierarchy,
  AdminSearchResult,
  MountainRangeSearchResult,
  ClubSearchResult,
  ShelterSearchResult,
} from "../../../shared/api/types";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import {
  mergeRecentSearchResults,
  sanitizeStoredSearchResults,
} from "../../../shared/utils/searchResultStorage";

type SearchResult =
  | PeakSearchResult
  | UserSearchResult
  | AdminSearchResult
  | MountainRangeSearchResult
  | ClubSearchResult
  | ShelterSearchResult;

type SearchAreaResult = AdminSearchResult | MountainRangeSearchResult;
type SearchGeoJSON = GeoJSON.GeoJSON;

const SEARCH_GEOMETRY_SOURCE_ID = "search-geometry";
const SEARCH_GEOMETRY_FILL_ID = "search-geometry-fill";
const SEARCH_GEOMETRY_LINE_ID = "search-geometry-line";

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

const normalizeSearchGeometry = (input: unknown): SearchGeoJSON | null => {
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

const PeakDetailsMap = lazy(async () => {
  console.log("[Chunk] desktop-PeakDetailsMap import start");
  const mod = await import("../desktop-Map/desktop-PeakDetailsMap/desktop-PeakDetailsMap.tsx");
  console.log("[Chunk] desktop-PeakDetailsMap import done");
  return mod;
});
const ShelterDetailsMap = lazy(async () => {
  const mod = await import("../desktop-Map/desktop-ShelterDetailsMap/desktop-ShelterDetailsMap.tsx");
  return mod;
});
import LoadingScreen from "../desktop-LoadingScreen/desktop-LoadingScreen.tsx";

export interface VisiblePeaksListItem {
  id: number;
  name: string;
  name_en?: string | null;
  elevation: number;
  admin_hierarchy?: AdminHierarchy | null;
  source: "tile" | "list" | "user";
  image?: string | null;
  coordinates: { lat: number; lng: number };
}

interface MapControlsProps {
  onStyleChange: (style: "outdoors" | "satellite") => void;
  onGlobeToggle: (enabled: boolean) => void;
  onTerrainToggle: (enabled: boolean) => void;
  currentStyle: "outdoors" | "satellite";
  isGlobeEnabled: boolean;
  isTerrainEnabled: boolean;
  selectedPeakId: number | null;
  selectedPeakData: PeakData | null;
  onClosePeakDetails: () => void;
  isVisiblePeaksEnabled: boolean;
  onToggleVisiblePeaks: (enabled: boolean) => void;
  visiblePeaks: VisiblePeaksListItem[];
  isVisiblePeaksLoading: boolean;
  map: mapboxgl.Map | null;
  isNearbyPeaksEnabled: boolean;
  onToggleNearbyPeaks: (enabled: boolean) => void;
  selectedShelterId: number | null;
  selectedShelterData: ShelterData | null;
  onCloseShelterDetails: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  onStyleChange,
  onGlobeToggle,
  onTerrainToggle,
  currentStyle,
  isGlobeEnabled,
  isTerrainEnabled,
  selectedPeakId,
  selectedPeakData,
  onClosePeakDetails,
  isVisiblePeaksEnabled,
  onToggleVisiblePeaks,
  visiblePeaks,
  isVisiblePeaksLoading,
  map,
  isNearbyPeaksEnabled,
  onToggleNearbyPeaks,
  selectedShelterId,
  selectedShelterData,
  onCloseShelterDetails,
}) => {
  const { formatMeters } = useUnitFormat();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { navigateToMapWithPeak, navigateToMapWithShelter } = useMapNavigation();
  const {
    mapFilters,
    isLoadingLists,
    handleMapElevationChange,
    handleToggleUserPeaks,
    handleSelectList,
    isChallengesModalOpen,
    toggleChallengesModal,
    // Simplified filter state
    activeFilter,
    isApplyingFilter,
  } = useMap();

  // Helper to compare filter states
  const filtersMatch = (a: MapFilterType, b: MapFilterType): boolean => {
    if (a.type !== b.type) return false;
    if (a.type === "list-detail" && b.type === "list-detail") {
      return a.listId === b.listId;
    }
    return true;
  };

  // Helper to check if a filter is active
  const isFilterActive = (filterType: MapFilterType) => {
    return filtersMatch(activeFilter, filterType);
  };

  // User peaks button active state
  const isUserPeaksActive = isFilterActive({ type: "user-peaks" });

  // Challenge selected state (a list is actively filtering the map)
  const isChallengeSelected = activeFilter.type === "list-detail";

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [completedQuery, setCompletedQuery] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<
    (PeakSearchResult | UserSearchResult | ClubSearchResult | ShelterSearchResult)[]
  >([]);
  const [visiblePeaksDisplayLimit, setVisiblePeaksDisplayLimit] = useState(50);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [entityTab, setEntityTab] = useState<"peak" | "shelter">("peak");
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const visiblePeaksBodyRef = useRef<HTMLDivElement>(null);
  const {
    nextSearchToken,
    invalidateSearchToken,
    isLatestSearchToken,
  } = useLatestSearchToken();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mapSidebar_recentSearches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(sanitizeStoredSearchResults(parsed));
        }
      } catch (error) {
        console.error("Failed to parse recent searches:", error);
        setRecentSearches([]);
      }
    }
  }, []);

  // Elevation color and icon helpers
  const getElevationColorWithVar = (elevation: number) => {
    const color = getElevationColor(elevation);
    return `var(--color-elevation-${color.replace("#", "")}, ${color})`;
  };

  const getElevationIconForSearch = (elevation: number) => {
    if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
    if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
    if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
    if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
    if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
    return "/icons/altitude/ic_mountain_green.png";
  };

  const handleEntityTabChange = useCallback((tab: "peak" | "shelter") => {
    setEntityTab(tab);
  }, []);

  const handleSearch = useCallback(async (query: string, searchToken: number) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      setCompletedQuery(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchRealtime(trimmedQuery);
      // Sort results by relevance score (higher first)
      const getScore = (item: SearchResult) =>
        typeof item.relevance_score === "number" ? item.relevance_score : 0;
      const sortedResults = response.results.sort(
        (a, b) => getScore(b) - getScore(a)
      );
      if (!isLatestSearchToken(searchToken)) return;
      setSearchResults(sortedResults);
      setCompletedQuery(trimmedQuery);
      setShowDropdown(true);
    } catch (error) {
      if (!isLatestSearchToken(searchToken)) return;
      console.error("Search failed:", error);
      setSearchResults([]);
      setCompletedQuery(trimmedQuery);
      setShowDropdown(true);
    } finally {
      if (isLatestSearchToken(searchToken)) {
        setIsSearching(false);
      }
    }
  }, [isLatestSearchToken]);

  const addToRecentSearches = useCallback(
    (result: PeakSearchResult | UserSearchResult | ClubSearchResult | ShelterSearchResult) => {
      if (!result) return;
      const updated = mergeRecentSearchResults(recentSearches, result, 5);
      setRecentSearches(updated);
      localStorage.setItem(
        "mapSidebar_recentSearches",
        JSON.stringify(updated)
      );
    },
    [recentSearches]
  );

  // Handle peak selection for map navigation
  const handleMapPeakSelect = useCallback(
    (peak: PeakSearchResult) => {
      // Ensure map is in tiles mode (no user peaks, no selected list)
      handleSelectList(null);
      if (peak.lat && peak.lng) {
        // Prepare peak data for the map
        const peakData = {
          name: peak.name || peak.name_en || "Unknown Peak",
          name_en: peak.name_en || null,
          elevation: peak.elevation || 0,
        };

        navigateToMapWithPeak(
          peak.id,
          { lat: peak.lat, lng: peak.lng },
          peakData
        );
      }
    },
    [navigateToMapWithPeak, handleSelectList]
  );

  // Handle shelter selection for map navigation
  const handleMapShelterSelect = useCallback(
    (shelter: ShelterSearchResult) => {
      // Ensure map is in tiles mode (no user peaks, no selected list)
      handleSelectList(null);
      if (shelter.lat && shelter.lng) {
        // Prepare shelter data for the map
        const shelterData = {
          name: shelter.name || shelter.name_en || "Unknown Shelter",
          name_en: shelter.name_en || null,
          elevation: shelter.elevation || null,
          shelter_type: shelter.shelter_type,
        };

        navigateToMapWithShelter(
          shelter.id,
          { lat: shelter.lat, lng: shelter.lng },
          shelterData
        );
      }
    },
    [navigateToMapWithShelter, handleSelectList]
  );

  const drawSearchGeometry = useCallback(
    (data: SearchGeoJSON) => {
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

      const beforeLayerId = map.getLayer("peak-symbols")
        ? "peak-symbols"
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
    },
    [map]
  );

  const handleSearchAreaSelect = useCallback(
    (result: SearchAreaResult) => {
      if (!map) return;
      const geometry = normalizeSearchGeometry(result.geometry);
      if (!geometry) {
        console.warn("[MapControls] Invalid search geometry", result);
        return;
      }
      drawSearchGeometry(geometry);
      const bounds = getBoundsFromGeometry(geometry);
      if (bounds) {
        map.fitBounds(bounds, {
          padding: 40,
          duration: 1000,
          essential: true,
        });
      }
    },
    [map, drawSearchGeometry]
  );

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      invalidateSearchToken();
      setCompletedQuery(null);
      if (result.type === "peak") {
        trackEvent("search_result_select", `peak_${result.id}`);
        addToRecentSearches(result);
        handleMapPeakSelect(result);
        setSearchQuery("");
        setSearchResults([]);
        setShowDropdown(false);
        setIsSearching(false);
      } else if (result.type === "shelter") {
        trackEvent("search_result_select", `shelter_${result.id}`);
        addToRecentSearches(result);
        handleMapShelterSelect(result);
        setSearchQuery("");
        setSearchResults([]);
        setShowDropdown(false);
        setIsSearching(false);
      } else if (result.type === "user") {
        trackEvent("search_result_select", `user_${result.id}`);
        addToRecentSearches(result);
        // Navigate to profile
        if (user && user.internalUserId === result.id) {
          navigate("/profile");
        } else {
          navigate(`/externalprofile/${result.id}`);
        }
        setSearchQuery("");
        setSearchResults([]);
        setShowDropdown(false);
        setIsSearching(false);
      } else if (result.type === "club") {
        trackEvent("search_result_select", `club_${result.id}`);
        addToRecentSearches(result);
        navigate(`/clubs/${result.id}`);
        setSearchQuery("");
        setSearchResults([]);
        setShowDropdown(false);
        setIsSearching(false);
      } else if (result.type === "admin" || result.type === "mountain_range") {
        trackEvent("search_result_select", `${result.type}_${result.id}`);
        handleSearchAreaSelect(result);
        setSearchQuery("");
        setSearchResults([]);
        setShowDropdown(false);
        setIsSearching(false);
      }
    },
    [
      invalidateSearchToken,
      addToRecentSearches,
      trackEvent,
      handleMapPeakSelect,
      handleMapShelterSelect,
      handleSearchAreaSelect,
      navigate,
      user,
    ]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem("mapSidebar_recentSearches");
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);
      setCompletedQuery(null);
      const searchToken = nextSearchToken();

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (!query.trim()) {
        setSearchResults([]);
        setShowDropdown(true);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      setShowDropdown(true);
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(query, searchToken);
      }, 300);
    },
    [handleSearch, nextSearchToken]
  );

  const handleInputFocus = useCallback(() => {
    setShowDropdown(true);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleRecentSearchClick = useCallback(
    (item: PeakSearchResult | UserSearchResult | ClubSearchResult | ShelterSearchResult) => {
      handleResultSelect(item);
    },
    [handleResultSelect]
  );

  const mapElevationRange = useMemo(
    () => mapFilters.elevationRange as [number, number],
    [mapFilters.elevationRange[0], mapFilters.elevationRange[1]]
  );

  const onElevationRangeChange = useCallback(
    ([min, max]: [number, number]) => handleMapElevationChange(min, max),
    [handleMapElevationChange]
  );

  // Local state to control slider smoothly during drag
  const [pendingRange, setPendingRange] =
    React.useState<[number, number]>(mapElevationRange);

  // Keep local state in sync if parent changes the range externally
  React.useEffect(() => {
    setPendingRange(mapElevationRange);
  }, [mapElevationRange]);

  const sanitizeRange = (value: number | number[]): [number, number] | null => {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const min = Math.max(0, Math.min(8849, Math.round(value[0] || 0)));
    const max = Math.max(min, Math.min(8849, Math.round(value[1] || 0)));
    return [min, max];
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const sanitized = sanitizeRange(value);
    if (!sanitized) return;
    setPendingRange(sanitized);
  };

  const handleSliderChangeCommitted = (
    _: Event | React.SyntheticEvent,
    value: number | number[]
  ) => {
    const sanitized = sanitizeRange(value);
    if (!sanitized) return;
    setPendingRange(sanitized);
    trackEvent("filter_change", `elevation_${sanitized[0]}_${sanitized[1]}`);
    onElevationRangeChange(sanitized);
  };

  // Helper function to get elevation icon for peak details header
  const getElevationIconForHeader = (elevation: number) => {
    if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
    if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
    if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
    if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
    if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
    return "/icons/altitude/ic_mountain_green.png";
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showDropdown &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(
          `.${styles["map-controls__search-dropdown"]}`
        )
      ) {
        setShowDropdown(false);
        setCompletedQuery(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleVisiblePeaksToggle = useCallback(() => {
    const newValue = !isVisiblePeaksEnabled;
    trackEvent("map_layer_toggle", `visible_peaks_${newValue ? "on" : "off"}`);
    onToggleVisiblePeaks(newValue);
  }, [isVisiblePeaksEnabled, onToggleVisiblePeaks, trackEvent]);

  const handleUserPeaksToggle = useCallback(() => {
    trackEvent(
      "map_layer_toggle",
      `user_peaks_${!isUserPeaksActive ? "on" : "off"}`
    );
    handleToggleUserPeaks();
  }, [isUserPeaksActive, handleToggleUserPeaks, trackEvent]);

  // Reset display limit and scroll to top on any change in visiblePeaks
  useEffect(() => {
    setVisiblePeaksDisplayLimit(50);

    // Scroll to the top of the peaks list container if it exists
    const container = document.querySelector(
      `.${styles["map-controls__visible-peaks-body"]}`
    );
    if (container) {
      container.scrollTop = 0;
    }
  }, [visiblePeaks]);

  const handleLoadMorePeaks = useCallback(() => {
    setVisiblePeaksDisplayLimit((prev) => prev + 50);
  }, []);

  const renderVisiblePeaksContent = () => {
    if (isVisiblePeaksLoading) {
      return (
        <div className={styles["map-controls__visible-peaks-loading"]}>
          {[1, 2, 3].map((item) => (
            <div
              key={`visible-peak-loading-${item}`}
              className={styles["map-controls__visible-peaks-loading-row"]}
            >
              <div
                className={styles["map-controls__visible-peaks-loading-rank"]}
              />
              <div
                className={styles["map-controls__visible-peaks-loading-body"]}
              />
              <div
                className={
                  styles["map-controls__visible-peaks-loading-elevation"]
                }
              />
            </div>
          ))}
        </div>
      );
    }

    if (visiblePeaks.length === 0) {
      return (
        <div className={styles["map-controls__visible-peaks-empty"]}>
          <List size={24} color="#9ca3af" />
          <p className="typography-desktop-body-small">
            {t("map.visiblePeaks.empty")}
          </p>
        </div>
      );
    }

    const displayedPeaks = visiblePeaks.slice(0, visiblePeaksDisplayLimit);
    const hasMorePeaks = visiblePeaks.length > visiblePeaksDisplayLimit;

    return (
      <>
        <div className={styles["map-controls__visible-peaks-list"]}>
          {displayedPeaks.map((peak) => {
            const hasImage = Boolean(peak.image);
            const elevationColor = getElevationColorWithVar(peak.elevation);
            const elevationIcon = getElevationIconForSearch(peak.elevation);

            const handlePeakClick = () => {
              trackEvent(
                "peak_click",
                `visible_peak_${peak.id}_${peak.source}`
              );
              const peakData: PeakData = {
                name: peak.name,
                name_en: peak.name_en || null,
                elevation: peak.elevation,
              };
              navigateToMapWithPeak(peak.id, peak.coordinates, peakData);
            };

            return (
              <div
                key={`visible-peak-${peak.id}`}
                className={styles["map-controls__visible-peaks-item"]}
                onClick={handlePeakClick}
              >
                <div className={styles["map-controls__visible-peaks-image"]}>
                  {hasImage ? (
                    <img
                      src={peak.image || ""}
                      alt={peak.name_en || peak.name}
                      className={
                        styles["map-controls__visible-peaks-image-img"]
                      }
                    />
                  ) : (
                    <div
                      className={
                        styles["map-controls__visible-peaks-image-placeholder"]
                      }
                      style={{
                        background: `linear-gradient(rgba(255,255,255,0.5), rgba(255,255,255,0.5)), ${elevationColor}`,
                      }}
                    >
                      <img
                        src={elevationIcon}
                        alt=""
                        className={
                          styles["map-controls__visible-peaks-image-icon"]
                        }
                      />
                    </div>
                  )}
                </div>
                <div
                  className={styles["map-controls__visible-peaks-item-info"]}
                >
                  <p className="typography-desktop-body-medium">
                    {peak.name_en || peak.name}
                  </p>
                  <div
                    className={styles["map-controls__visible-peaks-elevation"]}
                  >
                    <img src={elevationIcon} alt="" width={20} height={20} />
                    <span className="typography-desktop-label-medium">
                      {formatMeters(peak.elevation)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {hasMorePeaks && (
          <button
            className={styles["map-controls__visible-peaks-load-more"]}
            onClick={handleLoadMorePeaks}
          >
            <span className="typography-desktop-body-medium">
              {t("map.visiblePeaks.loadMore", {
                remaining: visiblePeaks.length - visiblePeaksDisplayLimit,
              })}
            </span>
          </button>
        )}
      </>
    );
  };

  return (
    <div className={styles["map-controls"]}>
      {/* Top Bar: Search + Filters */}
      <div className={styles["map-controls__top-bar"]}>
        {/* Searchbar */}
        <div className={styles["map-controls__search-container"]}>
          <div className={styles["map-controls__search-input-wrapper"]}>
            <SearchIcon
              className={styles["map-controls__search-icon"]}
              size={20}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder={
                isSearching ? t("search.searching") : t("search.searchForPeaks")
              }
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              className={`${styles["map-controls__search-input"]} typography-desktop-label-small`}
              aria-label={t("search.searchLabel")}
            />
            {searchQuery && (
              <button
                className={styles["map-controls__search-clear"]}
              onClick={() => {
                  invalidateSearchToken();
                  setSearchQuery("");
                  setSearchResults([]);
                  setShowDropdown(false);
                  setIsSearching(false);
                  setCompletedQuery(null);
                }}
                title={t("search.closeSearch")}
                aria-label={t("search.closeSearch")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown && (
            <div className={styles["map-controls__search-dropdown"]}>
              {isSearching ? (
                // Loading shimmer
                <div className={styles["map-controls__search-shimmer"]}>
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className={styles["map-controls__search-shimmer-item"]}
                    >
                      <div
                        className={styles["map-controls__search-shimmer-thumb"]}
                      />
                      <div
                        className={styles["map-controls__search-shimmer-text"]}
                      >
                        <div
                          className={styles["map-controls__search-shimmer-title"]}
                        />
                        <div
                          className={
                            styles["map-controls__search-shimmer-subtitle"]
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                // Search results
                searchResults.map((result) => {
                  if (result.type === "peak") {
                    const hasImage = Boolean(result.image);
                    const elevationColor = getElevationColorWithVar(
                      result.elevation
                    );
                    const elevationIcon = getElevationIconForSearch(
                      result.elevation
                    );

                    return (
                      <div
                        key={`peak-${result.id}`}
                        className={styles["map-controls__search-result"]}
                        onClick={() => handleResultSelect(result)}
                      >
                        <div
                          className={styles["map-controls__search-result-image"]}
                        >
                          {hasImage ? (
                            <img
                              src={result.image}
                              alt={result.name}
                              className={
                                styles["map-controls__search-result-img"]
                              }
                            />
                          ) : (
                            <div
                              className={
                                styles["map-controls__search-result-placeholder"]
                              }
                              style={{
                                background: `linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), ${elevationColor}`,
                              }}
                            >
                              <img
                                src={elevationIcon}
                                alt=""
                                className={
                                  styles["map-controls__search-result-icon"]
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div
                          className={styles["map-controls__search-result-info"]}
                        >
                          <div className="typography-desktop-body-medium">
                            {result.name_en || result.name}
                          </div>
                          <div
                            className={
                              styles["map-controls__search-result-details"]
                            }
                          >
                            <img
                              src={elevationIcon}
                              alt=""
                              style={{ width: 14, height: 14 }}
                            />
                            <span className="typography-desktop-body-small">
                              {formatMeters(result.elevation)}
                            </span>
                            {getLocationFromHierarchy(result.admin_hierarchy) && (
                              <span
                                className="typography-desktop-body-small"
                                style={{ color: "#6b7280" }}
                              >
                                {getLocationFromHierarchy(result.admin_hierarchy)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else if (result.type === "shelter") {
                    const shelterResult = result as ShelterSearchResult;
                    const shelterTypeColors: Record<string, string> = {
                      alpine_hut: "#0C4A7B",
                      wilderness_hut: "#2D6A4F",
                      shelter: "#D92B2B",
                    };
                    const hasImage = Boolean(shelterResult.image);
                    const typeLabel = t(`shelterDetails.type.${shelterResult.shelter_type}`) || "Shelter";
                    const typeColor = shelterTypeColors[shelterResult.shelter_type] || "#D92B2B";

                    return (
                      <div
                        key={`shelter-${result.id}`}
                        className={styles["map-controls__search-result"]}
                        onClick={() => handleResultSelect(shelterResult)}
                      >
                        <div
                          className={styles["map-controls__search-result-image"]}
                        >
                          {hasImage ? (
                            <img
                              src={shelterResult.image || ""}
                              alt={shelterResult.name}
                              className={
                                styles["map-controls__search-result-img"]
                              }
                            />
                          ) : (
                            <div
                              className={
                                styles["map-controls__search-result-placeholder"]
                              }
                              style={{
                                background: `linear-gradient(rgba(255,255,255,0.3), rgba(255,255,255,0.3)), ${typeColor}`,
                              }}
                            >
                              <ShelterIcon
                                size={20}
                                className={
                                  styles["map-controls__search-result-icon"]
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div
                          className={styles["map-controls__search-result-info"]}
                        >
                          <div className="typography-desktop-body-medium">
                            {shelterResult.name_en || shelterResult.name}
                          </div>
                          <div
                            className={
                              styles["map-controls__search-result-details"]
                            }
                          >
                            <span
                              style={{
                                fontSize: 10,
                                padding: "1px 6px",
                                borderRadius: 4,
                                backgroundColor: typeColor,
                                color: "white",
                                fontWeight: 600,
                              }}
                            >
                              {typeLabel}
                            </span>
                            {shelterResult.elevation != null && (
                              <span className="typography-desktop-body-small">
                                {formatMeters(shelterResult.elevation)}
                              </span>
                            )}
                            {getLocationFromHierarchy(shelterResult.admin_hierarchy) && (
                              <span
                                className="typography-desktop-body-small"
                                style={{ color: "#6b7280" }}
                              >
                                {getLocationFromHierarchy(shelterResult.admin_hierarchy)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  } else if (result.type === "user") {
                    const hasImage = Boolean(result.image);

                    return (
                      <div
                        key={`user-${result.id}`}
                        className={styles["map-controls__search-result"]}
                        onClick={() => handleResultSelect(result)}
                      >
                        <div
                          className={styles["map-controls__search-result-image"]}
                        >
                          {hasImage ? (
                            <img
                              src={result.image}
                              alt={result.name}
                              className={
                                styles["map-controls__search-result-img"]
                              }
                            />
                          ) : (
                            <div
                              className={
                                styles["map-controls__search-result-placeholder"]
                              }
                              style={{
                                backgroundColor: "black",
                                opacity: 0.7,
                              }}
                            >
                              <User
                                size={28}
                                color="white"
                                className={
                                  styles["map-controls__search-result-icon"]
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div
                          className={styles["map-controls__search-result-info"]}
                        >
                          <div className="typography-desktop-body-medium">
                            {result.name}
                          </div>
                          <div
                            className={
                              styles["map-controls__search-result-details"]
                            }
                          >
                            <span className="typography-desktop-body-small">
                              {result.total_peaks} {t("search.peaks")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (result.type === "club") {
                    const hasImage = Boolean(result.image);

                    return (
                      <div
                        key={`club-${result.id}`}
                        className={styles["map-controls__search-result"]}
                        onClick={() => handleResultSelect(result)}
                      >
                        <div
                          className={styles["map-controls__search-result-image"]}
                        >
                          {hasImage ? (
                            <img
                              src={result.image || ""}
                              alt={result.name}
                              className={
                                styles["map-controls__search-result-img"]
                              }
                            />
                          ) : (
                            <div
                              className={
                                styles["map-controls__search-result-placeholder"]
                              }
                              style={{ backgroundColor: "rgba(194, 207, 148, 0.35)" }}
                            >
                              <Users
                                size={28}
                                className={
                                  styles["map-controls__search-result-icon"]
                                }
                              />
                            </div>
                          )}
                        </div>
                        <div
                          className={styles["map-controls__search-result-info"]}
                        >
                          <div className="typography-desktop-body-medium">
                            {result.name}
                          </div>
                          <div
                            className={
                              styles["map-controls__search-result-details"]
                            }
                          >
                            <span className="typography-desktop-body-small">
                              {result.member_count} {t("clubs.metrics.members") || "members"}
                            </span>
                            <span className="typography-desktop-body-small">
                              {result.distinct_peak_count || 0} {t("clubs.metrics.distinctPeaks") || "peaks"}
                            </span>
                            <span
                              className="typography-desktop-body-small"
                              style={{ color: "#6b7280" }}
                            >
                              {result.visibility}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (result.type === "admin") {
                    const adminTitle = result.name_only || result.name;
                    const adminSubtitle =
                      result.parent_name ||
                      (result.name_only && result.name !== result.name_only
                        ? result.name
                        : null);
                    const hasImageUrl =
                      typeof result.image === "string" &&
                      (result.image.startsWith("http://") ||
                        result.image.startsWith("https://"));

                    return (
                      <div
                        key={`admin-${result.id}`}
                        className={styles["map-controls__search-result"]}
                        onClick={() => handleResultSelect(result)}
                      >
                        <div
                          className={
                            styles["map-controls__search-result-image"]
                          }
                        >
                          {hasImageUrl ? (
                            <img
                              src={result.image || ""}
                              alt={adminTitle}
                              className={
                                styles["map-controls__search-result-img"]
                              }
                            />
                          ) : (
                            <div
                              className={
                                styles[
                                  "map-controls__search-result-placeholder"
                                ]
                              }
                              style={{
                                backgroundColor: "rgba(15, 23, 42, 0.08)",
                              }}
                            >
                              {result.image && !hasImageUrl ? (
                                <span className="typography-desktop-body-medium">
                                  {result.image}
                                </span>
                              ) : (
                                <AdminSearchIcon
                                  size={28}
                                  className={
                                    styles["map-controls__search-result-icon"]
                                  }
                                />
                              )}
                            </div>
                          )}
                        </div>
                        <div
                          className={styles["map-controls__search-result-info"]}
                        >
                          <div className="typography-desktop-body-medium">
                            {adminTitle}
                          </div>
                          {adminSubtitle && (
                            <div
                              className={
                                styles["map-controls__search-result-details"]
                              }
                            >
                              <span
                                className="typography-desktop-body-small"
                                style={{ color: "#6b7280" }}
                              >
                                {adminSubtitle}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  } else if (result.type === "mountain_range") {
                    const rangeTitle = result.name_en || result.name;
                    const rangeSubtitle =
                      result.name_en && result.name_en !== result.name
                        ? result.name
                        : null;

                    return (
                      <div
                        key={`range-${result.id}`}
                        className={styles["map-controls__search-result"]}
                        onClick={() => handleResultSelect(result)}
                      >
                        <div
                          className={
                            styles["map-controls__search-result-image"]
                          }
                        >
                          <div
                            className={
                              styles["map-controls__search-result-placeholder"]
                            }
                            style={{ backgroundColor: "rgba(75, 140, 46, 0.1)" }}
                          >
                            <MountainRangeIcon
                              size={32}
                              className={
                                styles["map-controls__search-result-icon"]
                              }
                            />
                          </div>
                        </div>
                        <div
                          className={styles["map-controls__search-result-info"]}
                        >
                          <div className="typography-desktop-body-medium">
                            {rangeTitle}
                          </div>
                          {rangeSubtitle && (
                            <div
                              className={
                                styles["map-controls__search-result-details"]
                              }
                            >
                              <MountainRangeIcon size={16} />
                              <span
                                className="typography-desktop-body-small"
                                style={{ color: "#6b7280" }}
                              >
                                {rangeSubtitle}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })
              ) : showDropdown &&
                !isSearching &&
                searchResults.length === 0 &&
                completedQuery === searchQuery.trim() &&
                searchQuery.trim().length > 0 ? (
                // No results
                <div className={styles["map-controls__search-empty"]}>
                  <MountainIcon size={32} color="#9ca3af" />
                  <span
                    className="typography-desktop-body-medium"
                    style={{ color: "#6b7280" }}
                  >
                    {t("search.noPeaksFound", { query: searchQuery })}
                  </span>
                </div>
              ) : !searchQuery.trim() && recentSearches.length > 0 ? (
                // Recent searches
                <div className={styles["map-controls__search-recent"]}>
                  <div className={styles["map-controls__search-recent-header"]}>
                    <Clock size={16} />
                    <span className="typography-desktop-label-medium">
                      {t("search.recentSearches")}
                    </span>
                    <button
                      className={styles["map-controls__search-clear-recent"]}
                      onClick={clearRecentSearches}
                      title={t("search.clearRecentSearches")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {recentSearches.map((item) => (
                    <div
                      key={`recent-${item.type}-${item.id}`}
                      className={styles["map-controls__search-recent-item"]}
                      onClick={() => handleRecentSearchClick(item)}
                    >
                      {item.type === "peak" ? (
                        <MountainIcon size={14} />
                      ) : item.type === "shelter" ? (
                        <ShelterIcon size={14} />
                      ) : item.type === "club" ? (
                        <Users size={14} />
                      ) : (
                        <User size={14} />
                      )}
                      <span className="typography-desktop-body-small">
                        {item.type === "peak" ? item.name_en || item.name : item.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Filter Buttons */}
        <div className={styles["map-controls__filter-buttons"]}>
          {/* User Peaks Section */}
          <button
            type="button"
            className={`${styles["map-controls__filter-button"]} ${
              isUserPeaksActive
                ? styles["map-controls__filter-button--active"]
                : ""
            }`}
            onClick={handleUserPeaksToggle}
            disabled={isApplyingFilter}
            title={t("filters.yourPeaks")}
          >
            <Users size={22} color={isUserPeaksActive ? "#ffffff" : "#000000"} />
            <span className="typography-desktop-label-medium">
              {t("filters.yourPeaks")}
            </span>
          </button>

          {/* Challenges Button */}
          <button
            type="button"
            className={`${styles["map-controls__filter-button"]} ${
              isChallengesModalOpen
                ? styles["map-controls__filter-button--active"]
                : isChallengeSelected
                  ? styles["map-controls__filter-button--challenge-selected"]
                  : ""
            }`}
            onClick={toggleChallengesModal}
            disabled={isLoadingLists || isApplyingFilter}
            title={t("peakLists.challenges")}
          >
            <Trophy size={22} color={isChallengesModalOpen || isChallengeSelected ? "#ffffff" : "#000000"} />
            <span className="typography-desktop-label-medium">
              {t("peakLists.challenges")}
            </span>
          </button>

          {/* Nearby Peaks Toggle - Moved to the right */}
          {(isUserPeaksActive || activeFilter.type === "list-detail") && (
            <div className={styles["map-controls__nearby-toggle-container"]}>
              <label className={styles["map-controls__nearby-toggle"]}>
                <input
                  type="checkbox"
                  checked={isNearbyPeaksEnabled}
                  onChange={(e) => onToggleNearbyPeaks(e.target.checked)}
                  className={styles["map-controls__checkbox"]}
                />
                <span
                  className={`${styles["map-controls__label"]} typography-desktop-label-medium`}
                >
                  {t("main.allPeaks")}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Left panel: elevation filter + visible peaks */}
      <div className={styles["map-controls__left-panel"]}>
        <div className={styles["map-controls__elevation-filter"]}>
          <div className={styles["map-controls__elevation-slider"]}>
            <div className={styles["map-controls__elevation-range"]}>
              <span className="typography-desktop-label-medium">
                {formatMeters(pendingRange[0])}
              </span>
              <span className="typography-desktop-label-medium">
                {formatMeters(pendingRange[1])}
              </span>
            </div>
            <Slider
              value={pendingRange}
              min={0}
              max={8849}
              onChange={handleSliderChange}
              onChangeCommitted={handleSliderChangeCommitted}
              valueLabelDisplay="off"
              size="small"
              sx={{
                color: "#1e3a8a",
                height: 6,
                padding: "0px !important",
                margin: "8px 0 !important",
                width: "100%",
                "& .MuiSlider-thumb": {
                  width: 18,
                  height: 18,
                  background: "#1e3a8a",
                  border: "2px solid #ffffff",
                  boxShadow: "0 2px 8px rgba(30, 58, 138, 0.3)",
                },
                "& .MuiSlider-rail": {
                  height: 6,
                  background: "rgba(30, 58, 138, 0.15)",
                  borderRadius: 3,
                  width: "100% !important",
                },
                "& .MuiSlider-track": {
                  height: 6,
                  background: "#1e3a8a",
                  borderRadius: 3,
                },
              }}
            />
          </div>
        </div>
        <div
          className={`${styles["map-controls__visible-peaks"]} ${
            isVisiblePeaksEnabled
              ? styles["map-controls__visible-peaks--enabled"]
              : ""
          }`}
        >
          <div className={styles["map-controls__visible-peaks-header"]}>
            <span className="typography-desktop-label-medium">
              {t("map.visiblePeaks.title")}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isVisiblePeaksEnabled}
              onClick={handleVisiblePeaksToggle}
              className={`${styles["map-controls__visible-peaks-switch"]} ${
                isVisiblePeaksEnabled
                  ? styles["map-controls__visible-peaks-switch--on"]
                  : ""
              }`}
            >
              <span className={styles["map-controls__visible-peaks-thumb"]} />
            </button>
          </div>
          {isVisiblePeaksEnabled && (
            <div
              ref={visiblePeaksBodyRef}
              className={styles["map-controls__visible-peaks-body"]}
            >
              {renderVisiblePeaksContent()}
            </div>
          )}
        </div>
      </div>

      {/* Peak Details - Below Elevation Filter */}
      <AnimatePresence mode="wait">
        {selectedPeakId && (
          <motion.div
            key={selectedPeakId}
            className={styles["map-controls__peak-details"]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Peak Details Header */}
            {selectedPeakData && (
              <div className={styles["map-controls__peak-details-header"]}>
                <div className={styles["map-controls__peak-info"]}>
                  <div className={styles["map-controls__peak-names"]}>
                    <div className={styles["map-controls__peak-name-row"]}>
                      <h1 className={`${styles["map-controls__peak-name"]} typography-body-medium`}>
                        {selectedPeakData.name || selectedPeakData.name_en}
                      </h1>
                      <div className={styles["map-controls__elevation-info"]}>
                        <img
                          src={getElevationIconForHeader(
                            selectedPeakData.elevation
                          )}
                          alt="Elevation icon"
                          className={styles["map-controls__elevation-icon"]}
                        />
                        <span
                          className={`${styles["map-controls__elevation-value"]} typography-desktop-label-large`}
                          style={{
                            color: getElevationColor(
                              selectedPeakData.elevation
                            ),
                          }}
                        >
                          {formatMeters(selectedPeakData.elevation)}
                        </span>
                      </div>
                    </div>
                    {selectedPeakData.name_en &&
                      selectedPeakData.name !== selectedPeakData.name_en && (
                        <span className={styles["map-controls__peak-name-en"]}>
                          {selectedPeakData.name_en}
                        </span>
                      )}
                  </div>
                </div>
                <button
                  className={styles["map-controls__peak-details-close"]}
                  onClick={onClosePeakDetails}
                  aria-label="Close peak details"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Peak Details Content */}
            <div
              key={selectedPeakId}
              className={styles["map-controls__peak-details-content"]}
            >
              <Suspense fallback={<LoadingScreen />}>
                <PeakDetailsMap
                  peakId={selectedPeakId}
                  onClose={onClosePeakDetails}
                />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shelter Details */}
      <AnimatePresence mode="wait">
        {selectedShelterId && (
          <motion.div
            key={`shelter-${selectedShelterId}`}
            className={styles["map-controls__peak-details"]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <div
              className={styles["map-controls__peak-details-header"]}
            >
              <div className={styles["map-controls__peak-info"]}>
                <div className={styles["map-controls__peak-names"]}>
                  <div className={styles["map-controls__peak-name-row"]}>
                    <h1 className={`${styles["map-controls__peak-name"]} typography-body-medium`}>
                      {selectedShelterData?.name ||
                        selectedShelterData?.name_en ||
                        "Shelter"}
                    </h1>
                    {selectedShelterData?.elevation != null && (
                      <div className={styles["map-controls__elevation-info"]}>
                        <img
                          src={getElevationIconForHeader(
                            selectedShelterData.elevation
                          )}
                          alt="Elevation icon"
                          className={styles["map-controls__elevation-icon"]}
                        />
                        <span
                          className={`${styles["map-controls__elevation-value"]} typography-desktop-label-large`}
                          style={{
                            color: getElevationColor(
                              selectedShelterData.elevation
                            ),
                          }}
                        >
                          {formatMeters(selectedShelterData.elevation)}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedShelterData?.name_en &&
                    selectedShelterData.name_en !==
                      selectedShelterData.name && (
                      <span className={styles["map-controls__peak-name-en"]}>
                        {selectedShelterData.name_en}
                      </span>
                    )}
                </div>
              </div>
              <button
                className={styles["map-controls__peak-details-close"]}
                onClick={onCloseShelterDetails}
                aria-label="Close shelter details"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div
              key={`shelter-${selectedShelterId}`}
              className={styles["map-controls__peak-details-content"]}
            >
              <Suspense fallback={<LoadingScreen />}>
                <ShelterDetailsMap
                  shelterId={selectedShelterId}
                />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Left: MapLayers Icon */}
      <div className={styles["map-controls__bottom-right"]}>
        <button
          className={styles["map-controls__create-peak-btn"]}
          onClick={() => {
            setEntityTab("peak");
            setShowCreateModal(true);
          }}
          aria-label={t("peakChange.mapButtonLabel")}
        >
          <Plus size={20} />
        </button>
        <MapLayersDropdown
        onStyleChange={onStyleChange}
        onGlobeToggle={onGlobeToggle}
        onTerrainToggle={onTerrainToggle}
        currentStyle={currentStyle}
        isGlobeEnabled={isGlobeEnabled}
        isTerrainEnabled={isTerrainEnabled}
        map={map}
        />
      </div>

      <PeakChangeModal
        open={showCreateModal}
        hidden={entityTab !== "peak"}
        onClose={() => setShowCreateModal(false)}
        mode="create"
        showEntityTabs
        activeEntityTab={entityTab}
        onEntityTabChange={handleEntityTabChange}
      />

      <ShelterChangeModal
        open={showCreateModal}
        hidden={entityTab !== "shelter"}
        onClose={() => setShowCreateModal(false)}
        mode="create"
        showEntityTabs
        activeEntityTab={entityTab}
        onEntityTabChange={handleEntityTabChange}
      />
    </div>
  );
};

export default React.memo(MapControls);
