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
import { getCountries, getAdminChildren } from "../../shared/api/endpoints/peakLists";
import type { AdminSearchResult, DiscoveryMode, ShelterType } from "../../shared/api/types";
import type { AdminArea } from "../../shared/api/types/common";
import { buildAdminLevelsFromSearchResult } from "../../shared/utils/adminSearchSelection";

// Types
export interface ExploreFilters {
  min_elevation: number;
  max_elevation: number;
  admin_osm_ids: number[];
  mode: DiscoveryMode;
  shelter_types: ShelterType[];
}

/** Represents one level in the cascading admin area selector */
export interface AdminLevel {
  /** The admin areas available at this level */
  options: AdminArea[];
  /** The currently selected osm_id at this level, or null */
  selectedId: number | null;
  /** Whether options are currently loading */
  loading: boolean;
  /** The name of the selected item (for display) */
  selectedName: string | null;
}

export interface ExploreContextType {
  // Explore filters
  exploreFilters: ExploreFilters;
  setExploreFilters: (filters: ExploreFilters) => void;
  updateExploreFilter: <K extends keyof ExploreFilters>(
    key: K,
    value: ExploreFilters[K]
  ) => void;

  // Cascading admin levels
  adminLevels: AdminLevel[];
  selectAdminLevel: (levelIndex: number, osmId: number | null) => void;
  selectAdminSearchResult: (result: AdminSearchResult) => Promise<void>;
  commitAdminSelection: (levels: AdminLevel[]) => void;

  // Filter visibility
  showExploreFilters: boolean;
  setShowExploreFilters: (show: boolean) => void;

  // Filter collapse state
  isExploreFiltersCollapsed: boolean;
  setIsExploreFiltersCollapsed: (collapsed: boolean) => void;

  // Handlers
  handleToggleExploreFilters: () => void;

  // Search handlers
  handleCloseExploreSearch: () => void;

  // Elevation change handlers
  handleExploreElevationChange: (min: number, max: number) => void;

  // Drag handlers
  handleExploreDragStart: () => void;
}

const ExploreContext = createContext<ExploreContextType | undefined>(undefined);

// Initial state
const initialExploreFilters: ExploreFilters = {
  min_elevation: 0,
  max_elevation: 8849,
  admin_osm_ids: [],
  mode: "all",
  shelter_types: [],
};

interface ExploreProviderProps {
  children: ReactNode;
}

export const ExploreProvider: React.FC<ExploreProviderProps> = ({
  children,
}) => {
  // Explore filters
  const [exploreFilters, setExploreFilters] = useState<ExploreFilters>(
    initialExploreFilters
  );

  // Cascading admin levels
  const [adminLevels, setAdminLevels] = useState<AdminLevel[]>([
    { options: [], selectedId: null, loading: true, selectedName: null },
  ]);

  // Filter visibility
  const [showExploreFilters, setShowExploreFilters] = useState(false);
  const lastExploreToggleAtRef = useRef(0);

  // Filter collapse state (default to true = collapsed)
  const [isExploreFiltersCollapsed, setIsExploreFiltersCollapsed] =
    useState(true);

  // Update explore filter helper
  const updateExploreFilter = useCallback(
    <K extends keyof ExploreFilters>(key: K, value: ExploreFilters[K]) => {
      setExploreFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  // Load top-level countries on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data: AdminArea[] = await getCountries();
        if (cancelled) return;
        setAdminLevels([
          { options: data, selectedId: null, loading: false, selectedName: null },
        ]);
      } catch (error) {
        console.error("Failed to load countries:", error);
        if (!cancelled) {
          setAdminLevels([
            { options: [], selectedId: null, loading: false, selectedName: null },
          ]);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Handle selecting an admin area at a given level
  const selectAdminLevel = useCallback(
    (levelIndex: number, osmId: number | null) => {
      setAdminLevels((prev) => {
        // Clone existing levels up to and including levelIndex
        const updated = prev.slice(0, levelIndex + 1).map((level, i) => {
          if (i === levelIndex) {
            const selectedOption = osmId
              ? level.options.find((o) => o.osm_id === osmId) || null
              : null;
            return {
              ...level,
              selectedId: osmId,
              selectedName: selectedOption ? selectedOption.name : null,
            };
          }
          return { ...level };
        });

        // If an option was selected, add a loading placeholder for the next level
        if (osmId !== null) {
          updated.push({
            options: [],
            selectedId: null,
            loading: true,
            selectedName: null,
          });
        }

        return updated;
      });

      // Update admin_osm_ids filter to use the deepest selected ID
      if (osmId !== null) {
        updateExploreFilter("admin_osm_ids", [osmId]);

        // Load children for the selected area
        const loadChildren = async () => {
          try {
            const children = await getAdminChildren(osmId);
            setAdminLevels((prev) => {
              // Ensure we still have the right structure
              const childLevelIndex = levelIndex + 1;
              if (childLevelIndex >= prev.length) return prev;

              // If children is empty, remove the loading placeholder
              if (children.length === 0) {
                return prev.slice(0, childLevelIndex);
              }

              const updated = [...prev];
              updated[childLevelIndex] = {
                options: children,
                selectedId: null,
                loading: false,
                selectedName: null,
              };
              return updated;
            });
          } catch (error) {
            console.error("Failed to load admin children:", error);
            // Remove the loading placeholder on error
            setAdminLevels((prev) => prev.slice(0, levelIndex + 1));
          }
        };
        loadChildren();
      } else {
        // Deselected: clear this level, drop deeper levels, and keep the deepest remaining selected ID
        setAdminLevels((prev) => {
          const updated = prev.slice(0, levelIndex + 1).map((level, i) => {
            if (i === levelIndex) {
              return { ...level, selectedId: null, selectedName: null };
            }
            return level;
          });
          const deepestSelected = updated
            .slice(0, levelIndex)
            .reverse()
            .find((l) => l.selectedId !== null);
          const newOsmIds = deepestSelected?.selectedId
            ? [deepestSelected.selectedId]
            : [];
          // We need to update filter outside this setter
          setTimeout(() => updateExploreFilter("admin_osm_ids", newOsmIds), 0);
          return updated;
        });
      }
    },
    [updateExploreFilter]
  );

  const selectAdminSearchResult = useCallback(
    async (result: AdminSearchResult) => {
      updateExploreFilter("admin_osm_ids", [result.id]);

      try {
        const nextLevels = await buildAdminLevelsFromSearchResult(
          result,
          adminLevels[0]?.options ?? [],
          getCountries,
          getAdminChildren
        );
        setAdminLevels(nextLevels);
      } catch (error) {
        console.error("Failed to apply admin search selection:", error);

        const fallbackOption: AdminArea = {
          osm_id: result.id,
          level: result.admin_level,
          name: result.name_only || result.name,
        };
        const fallbackOptions = adminLevels[0]?.options ?? [];
        const options =
          fallbackOptions.some((option) => option.osm_id === result.id)
            ? fallbackOptions
            : [fallbackOption, ...fallbackOptions];

        setAdminLevels([
          {
            options,
            selectedId: result.id,
            loading: false,
            selectedName: fallbackOption.name,
          },
        ]);
      }
    },
    [adminLevels, updateExploreFilter]
  );

  const handleToggleExploreFilters = useCallback(() => {
    const now = Date.now();
    if (now - lastExploreToggleAtRef.current < 250) {
      return;
    }
    lastExploreToggleAtRef.current = now;
    setShowExploreFilters((prev) => !prev);
  }, []);

  // Search handlers
  const handleCloseExploreSearch = useCallback(() => {
    // SearchExplore component handles its own state
  }, []);

  // Commit a full admin level chain (used by the filters modal on Apply)
  const commitAdminSelection = useCallback(
    (levels: AdminLevel[]) => {
      const deepest = [...levels]
        .reverse()
        .find((level) => level.selectedId !== null);
      setAdminLevels(levels);
      updateExploreFilter(
        "admin_osm_ids",
        deepest?.selectedId ? [deepest.selectedId] : []
      );
    },
    [updateExploreFilter]
  );

  // Elevation change handlers
  const handleExploreElevationChange = useCallback(
    (min: number, max: number) => {
      updateExploreFilter("min_elevation", min);
      updateExploreFilter("max_elevation", max);
    },
    [updateExploreFilter]
  );

  // Drag handlers
  const handleExploreDragStart = useCallback(() => {
    setIsExploreFiltersCollapsed(true);
  }, []);

  const contextValue: ExploreContextType = useMemo(
    () => ({
      // Explore filters
      exploreFilters,
      setExploreFilters,
      updateExploreFilter,

      // Cascading admin levels
      adminLevels,
      selectAdminLevel,
      selectAdminSearchResult,
      commitAdminSelection,

      // Filter visibility
      showExploreFilters,
      setShowExploreFilters,

      // Filter collapse state
      isExploreFiltersCollapsed,
      setIsExploreFiltersCollapsed,

      // Handlers
      handleToggleExploreFilters,

      // Search handlers
      handleCloseExploreSearch,

      // Elevation change handlers
      handleExploreElevationChange,

      // Drag handlers
      handleExploreDragStart,
    }),
    [
      exploreFilters,
      setExploreFilters,
      updateExploreFilter,
      adminLevels,
      selectAdminLevel,
      selectAdminSearchResult,
      commitAdminSelection,
      showExploreFilters,
      setShowExploreFilters,
      isExploreFiltersCollapsed,
      setIsExploreFiltersCollapsed,
      handleToggleExploreFilters,
      handleCloseExploreSearch,
      handleExploreElevationChange,
      handleExploreDragStart,
    ]
  );

  return (
    <ExploreContext.Provider value={contextValue}>
      {children}
    </ExploreContext.Provider>
  );
};

export const useExplore = (): ExploreContextType => {
  const context = useContext(ExploreContext);
  if (context === undefined) {
    throw new Error("useExplore must be used within an ExploreProvider");
  }
  return context;
};
