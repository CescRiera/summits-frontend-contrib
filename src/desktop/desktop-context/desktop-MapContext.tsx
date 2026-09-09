/* eslint_disable react-refresh/only-export-components */
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import type { ReactNode } from "react";
import type {
  PeakListWithPeaks,
  UserPeaksWithGeoJSON,
  ListPeaksGeoJSONResponse,
} from "../../shared/api/types";
import { getPeakListsWithPeaks, getUserPeaksMap, getListPeaksGeoJson } from "../../shared/api/endpoints/peakLists";
import { useAuth } from "../../shared/context/AuthContext";

// Types
export type MapFilterType =
  | { type: "tile" }
  | { type: "user-peaks" }
  | { type: "list-detail"; listId: number };

// Legacy MapFilters interface (for backwards compatibility)
export interface MapFilters {
  elevationRange: [number, number];
  activeFilter: MapFilterType;
  showMapFilters: boolean;
}

export interface MapContextType {
  // Map filters (legacy - for backwards compatibility)
  mapFilters: MapFilters;
  setMapFilters: (filters: MapFilters) => void;
  updateMapFilter: <K extends keyof MapFilters>(
    key: K,
    value: MapFilters[K]
  ) => void;

  // NEW: Simplified filter state
  activeFilter: MapFilterType;       // Currently applied filter
  pendingFilter: MapFilterType | null; // Filter waiting to be applied
  isApplyingFilter: boolean;         // True while filter is being applied
  requestFilter: (filter: MapFilterType) => void;
  confirmFilterApplied: () => void;

  // Peak lists
  peakLists: PeakListWithPeaks[];
  isLoadingLists: boolean;
  loadPeakLists: () => Promise<void>;

  // User peaks
  userPeaks: UserPeaksWithGeoJSON | null;
  isLoadingUserPeaks: boolean;
  loadUserPeaks: () => Promise<void>;

  // GeoJSON data for individual lists
  listGeoJsons: Record<number, ListPeaksGeoJSONResponse>;
  isLoadingGeoJson: boolean;
  fetchListGeoJson: (listId: number) => Promise<ListPeaksGeoJSONResponse | null>;

  // Login popup state
  showLoginPopup: boolean;
  loginPopupMessage: string;
  setShowLoginPopup: (show: boolean) => void;
  setLoginPopupMessage: (message: string) => void;

  // Handlers
  handleToggleUserPeaks: () => void;
  handleSelectList: (listId: number | null) => void;
  handleCloseMapFilters: () => void;
  handleToggleMapFilters: () => void;

  // Challenges modal state
  isChallengesModalOpen: boolean;
  setIsChallengesModalOpen: (isOpen: boolean) => void;
  toggleChallengesModal: () => void;

  // Elevation change handlers
  handleMapElevationChange: (min: number, max: number) => void;

  // Drag handlers
  handleMapDragStart: () => void;

  // Nearby peaks toggle
  isNearbyPeaksEnabled: boolean;
  setIsNearbyPeaksEnabled: (enabled: boolean) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

// Initial filter
const initialFilter: MapFilterType = { type: "tile" };

// Initial legacy map filters
const initialMapFilters: MapFilters = {
  elevationRange: [0, 8849],
  activeFilter: initialFilter,
  showMapFilters: false,
};

// Helper to compare filter states
const areFiltersEqual = (a: MapFilterType, b: MapFilterType): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === "list-detail" && b.type === "list-detail") {
    return a.listId === b.listId;
  }
  return true;
};

interface MapProviderProps {
  children: ReactNode;
}

export const MapProvider: React.FC<MapProviderProps> = ({ children }) => {
  // ============================================
  // Simplified Filter State
  // ============================================
  const [activeFilter, setActiveFilter] = useState<MapFilterType>(initialFilter);
  const [pendingFilter, setPendingFilter] = useState<MapFilterType | null>(null);
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  
  // Ref to prevent double-clicks (checked synchronously)
  const isApplyingRef = useRef(false);

  // Legacy map filters (for backwards compatibility)
  const [mapFilters, setMapFilters] = useState<MapFilters>(initialMapFilters);

  // Peak lists
  const [peakLists, setPeakLists] = useState<PeakListWithPeaks[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);

  // User peaks
  const [userPeaks, setUserPeaks] = useState<UserPeaksWithGeoJSON | null>(null);
  const [isLoadingUserPeaks, setIsLoadingUserPeaks] = useState(false);

  // Nearby peaks toggle state
  const [isNearbyPeaksEnabled, setIsNearbyPeaksEnabled] = useState(false);

  const lastMapToggleAtRef = useRef(0);

  // Login popup state
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [loginPopupMessage, setLoginPopupMessage] = useState("");

  // Challenges modal state
  const [isChallengesModalOpen, setIsChallengesModalOpen] = useState(false);

  const toggleChallengesModal = useCallback(() => {
    setIsChallengesModalOpen(prev => !prev);
  }, []);

  // GeoJSON caching for lists
  const [listGeoJsons, setListGeoJsons] = useState<Record<number, ListPeaksGeoJSONResponse>>({});
  const [isLoadingGeoJson, setIsLoadingGeoJson] = useState(false);

  const fetchListGeoJson = useCallback(async (listId: number) => {
    if (listGeoJsons[listId]) return listGeoJsons[listId];

    try {
      setIsLoadingGeoJson(true);
      const data = await getListPeaksGeoJson(listId);
      setListGeoJsons(prev => ({ ...prev, [listId]: data }));
      return data;
    } catch (error) {
      console.error(`Failed to fetch GeoJSON for list ${listId}:`, error);
      return null;
    } finally {
      setIsLoadingGeoJson(false);
    }
  }, [listGeoJsons]);

  // Auth context
  const { user, idToken } = useAuth();

  // ============================================
  // Simplified Filter Methods
  // ============================================

  /**
   * Request a filter change. Uses ref to prevent double-clicks.
   */
  const requestFilter = useCallback((filter: MapFilterType) => {
    // Synchronous check to prevent double-clicks
    if (isApplyingRef.current) {
      return;
    }
    
    // Don't re-request the same filter that's already active
    if (areFiltersEqual(activeFilter, filter)) {
      return;
    }
    
    // Mark as applying (both ref and state)
    isApplyingRef.current = true;
    setPendingFilter(filter);
    setIsApplyingFilter(true);
    
    // Update legacy mapFilters for backwards compatibility
    setMapFilters((prev) => ({
      ...prev,
      activeFilter: filter,
      showMapFilters: false,
    }));
  }, [activeFilter]);

  /**
   * Called by Map.tsx when filter has been applied.
   */
  const confirmFilterApplied = useCallback(() => {
    // Get the pending filter and make it active
    setPendingFilter((current) => {
      if (current) {
        setActiveFilter(current);
      }
      return null;
    });
    
    // Clear applying state
    isApplyingRef.current = false;
    setIsApplyingFilter(false);
  }, []);

  // ============================================
  // Legacy Methods
  // ============================================

  const updateMapFilter = useCallback(
    <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => {
      if (key === "activeFilter") {
        requestFilter(value as MapFilterType);
      } else {
        setMapFilters((prev) => ({
          ...prev,
          [key]: value,
        }));
      }
    },
    [requestFilter]
  );

  // Load peak lists
  const loadPeakLists = useCallback(async () => {
    try {
      setIsLoadingLists(true);
      const response = await getPeakListsWithPeaks();
      setPeakLists(response.lists || []);
    } catch (error) {
      console.error("Failed to load peak lists:", error);
      setPeakLists([]);
    } finally {
      setIsLoadingLists(false);
    }
  }, []);

  // Load user peaks
  const loadUserPeaks = useCallback(async () => {
    if (!user || !idToken) {
      setUserPeaks(null);
      return;
    }

    try {
      setIsLoadingUserPeaks(true);
      const response = await getUserPeaksMap();
      const userPeaksData: UserPeaksWithGeoJSON = {
        user_id: user.uid ? parseInt(user.uid) : 0,
        total_peaks: response.total_peaks,
        user_authenticated: true,
        geojson: response.geojson,
      };
      setUserPeaks(userPeaksData);
    } catch (error) {
      console.error("Failed to load user peaks:", error);
      setUserPeaks(null);
    } finally {
      setIsLoadingUserPeaks(false);
    }
  }, [user, idToken]);

  // ============================================
  // Filter Handlers
  // ============================================

  const handleToggleUserPeaks = useCallback(() => {
    if (!user || !idToken) {
      setLoginPopupMessage("auth.loginRequired.message");
      setShowLoginPopup(true);
      return;
    }

    const isActive = activeFilter.type === "user-peaks";
    if (!isActive) {
      setIsNearbyPeaksEnabled(false);
    }
    requestFilter(isActive ? { type: "tile" } : { type: "user-peaks" });
  }, [activeFilter, user, idToken, requestFilter]);

  const handleSelectList = useCallback(
    async (listId: number | null) => {
      const currentListId =
        activeFilter.type === "list-detail" ? activeFilter.listId : null;

      if (listId === null || currentListId === listId) {
        requestFilter({ type: "tile" });
      } else {
        // Fetch GeoJSON before applying filter
        await fetchListGeoJson(listId);
        setIsNearbyPeaksEnabled(false);
        requestFilter({ type: "list-detail", listId });
      }
    },
    [activeFilter, requestFilter, fetchListGeoJson]
  );

  const handleCloseMapFilters = useCallback(() => {
    setMapFilters((prev) => ({ ...prev, showMapFilters: false }));
  }, []);

  const handleToggleMapFilters = useCallback(() => {
    const now = Date.now();
    if (now - lastMapToggleAtRef.current < 250) return;
    lastMapToggleAtRef.current = now;
    setMapFilters((prev) => ({ ...prev, showMapFilters: !prev.showMapFilters }));
  }, []);

  const handleMapElevationChange = useCallback((min: number, max: number) => {
    setMapFilters((prev) => ({ ...prev, elevationRange: [min, max] }));
  }, []);

  const handleMapDragStart = useCallback(() => {}, []);

  // Load data on mount
  useEffect(() => {
    loadPeakLists();
  }, [loadPeakLists]);

  useEffect(() => {
    loadUserPeaks();
  }, [user, idToken]);

  const contextValue: MapContextType = useMemo(
    () => ({
      mapFilters,
      setMapFilters,
      updateMapFilter,
      activeFilter,
      pendingFilter,
      isApplyingFilter,
      requestFilter,
      confirmFilterApplied,
      peakLists,
      isLoadingLists,
      loadPeakLists,
      userPeaks,
      isLoadingUserPeaks,
      loadUserPeaks,
      showLoginPopup,
      loginPopupMessage,
      setShowLoginPopup,
      setLoginPopupMessage,
      listGeoJsons,
      isLoadingGeoJson,
      fetchListGeoJson,
      handleToggleUserPeaks,
      handleSelectList,
      handleCloseMapFilters,
      handleToggleMapFilters,
      isChallengesModalOpen,
      setIsChallengesModalOpen,
      toggleChallengesModal,
      handleMapElevationChange,
      handleMapDragStart,
      isNearbyPeaksEnabled,
      setIsNearbyPeaksEnabled,
    }),
    [
      mapFilters,
      updateMapFilter,
      activeFilter,
      pendingFilter,
      isApplyingFilter,
      requestFilter,
      confirmFilterApplied,
      peakLists,
      isLoadingLists,
      loadPeakLists,
      userPeaks,
      isLoadingUserPeaks,
      loadUserPeaks,
      showLoginPopup,
      loginPopupMessage,
      listGeoJsons,
      isLoadingGeoJson,
      fetchListGeoJson,
      handleToggleUserPeaks,
      handleSelectList,
      handleCloseMapFilters,
      handleToggleMapFilters,
      isChallengesModalOpen,
      setIsChallengesModalOpen,
      toggleChallengesModal,
      handleMapElevationChange,
      handleMapDragStart,
      isNearbyPeaksEnabled,
      setIsNearbyPeaksEnabled,
    ]
  );

  return (
    <MapContext.Provider value={contextValue}>{children}</MapContext.Provider>
  );
};

export const useMap = (): MapContextType => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error("useMap must be used within a MapProvider");
  }
  return context;
};
