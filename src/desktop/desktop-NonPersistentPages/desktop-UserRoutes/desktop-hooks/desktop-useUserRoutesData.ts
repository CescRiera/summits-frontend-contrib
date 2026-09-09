import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  getUserRoutes,
  getUserPeaksCountries,
  deleteRoute,
} from "../../../../shared/api/endpoints/routes";
import type {
  UserRoutesPaginationRequest,
  UserRoutesPaginationResponse,
  UserRoute,
  AdminAreaWithCount,
} from "../../../../shared/api/types";
import type { FilterState, SortOption } from "../desktop-types.ts";
import { ROUTES_PER_PAGE } from "../desktop-types.ts";

export const useUserRoutesData = (
  user: unknown,
  filters: FilterState,
  sortOption: SortOption,
  userId?: string
) => {
  const [routesData, setRoutesData] =
    useState<UserRoutesPaginationResponse | null>(null);
  const [allRoutes, setAllRoutes] = useState<UserRoute[]>([]);
  const [availableCountries, setAvailableCountries] = useState<AdminAreaWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refs for deduplication and preventing multiple calls
  const loadingRef = useRef(false);
  const fetchingRef = useRef(false);
  const lastRequestKeyRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const filtersRef = useRef<FilterState>(filters);
  const sortOptionRef = useRef<SortOption>(sortOption);
  const fetchRoutesRef = useRef<((page: number, reset?: boolean) => Promise<void>) | null>(null);
  const hasLoadedDataRef = useRef(false);

  // Update refs when filters or sortOption change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    sortOptionRef.current = sortOption;
  }, [sortOption]);

  // Memoize request params to prevent unnecessary recalculations
  const getRequestParams = useCallback(
    (page: number): UserRoutesPaginationRequest => {
      const currentFilters = filtersRef.current;
      const currentSort = sortOptionRef.current;

      return {
        page,
        limit: ROUTES_PER_PAGE,
        searchQuery: currentFilters.searchQuery || "",
        startDate: currentFilters.startDate || "",
        endDate: currentFilters.endDate || "",
        ...(currentFilters.admin_osm_ids && currentFilters.admin_osm_ids.length > 0 ? {
          admin_osm_ids: [Number(currentFilters.admin_osm_ids[currentFilters.admin_osm_ids.length - 1])]
        } : {}),
        sortBy: currentSort.field,
        sortOrder: currentSort.direction,
      };
    },
    []
  );

  // Generate stable request key for deduplication
  const generateRequestKey = useCallback(
    (page: number, params: UserRoutesPaginationRequest) => {
      return JSON.stringify({ ...params, page });
    },
    []
  );

  // Fetch countries data
  const fetchCountriesData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingFilters(true);
      const data = await getUserPeaksCountries();
      setAvailableCountries(data.admin_areas || []);
    } catch (err) {
      console.error("Error fetching countries data:", err);
    } finally {
      setIsLoadingFilters(false);
    }
  }, [user]);

  // Fetch routes with proper error handling and deduplication
  const fetchRoutes = useCallback(
    async (page: number, reset: boolean = false) => {
      if (!user && !userId) {
        setLoading(false);
        return;
      }

      // Prevent concurrent requests
      if (fetchingRef.current && !reset) {
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const requestParams = getRequestParams(page);
      const requestKey = generateRequestKey(page, requestParams);

      // Prevent duplicate requests
      if (lastRequestKeyRef.current === requestKey && !reset) {
        return;
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        fetchingRef.current = true;
        loadingRef.current = true;
        lastRequestKeyRef.current = requestKey;

        if (reset) {
          setAllRoutes([]);
          setCurrentPage(1);
          setHasMore(true);
          setError(null);
          // Loading states are set in the useEffect before fetchRoutes is called
          // Just mark that initial load is done
          if (isInitialLoad) {
            setIsInitialLoad(false);
          }
        } else {
          setIsLoadingMore(true);
        }

        const data = await getUserRoutes(requestParams, userId);

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        setRoutesData(data);

        // Mark that we've successfully loaded data
        hasLoadedDataRef.current = true;

        if (reset) {
          setAllRoutes(data.routes);
          setCurrentPage(1);
        } else {
          setAllRoutes((prev) => {
            // Deduplicate by route ID
            const existingIds = new Set(prev.map((r) => r.id));
            const newRoutes = data.routes.filter(
              (r) => !existingIds.has(r.id)
            );
            return [...prev, ...newRoutes];
          });
          setCurrentPage(page);
        }

        setHasMore(data.pagination.has_next_page);
        setError(null);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Error fetching routes:", err);
        setError("Failed to load routes. Please try again.");
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        setIsLoadingRoutes(false);
        loadingRef.current = false;
        fetchingRef.current = false;
        abortControllerRef.current = null;
      }
    },
    [user, userId, getRequestParams, generateRequestKey]
  );

  const filterKey = useMemo(() => {
    return JSON.stringify({
      searchQuery: filters.searchQuery,
      startDate: filters.startDate,
      endDate: filters.endDate,
      admin_osm_ids: filters.admin_osm_ids,
    });
  }, [
    filters.searchQuery,
    filters.startDate,
    filters.endDate,
    filters.admin_osm_ids,
  ]);

  // Memoize sort key for stable comparison
  const sortKey = useMemo(() => {
    return JSON.stringify(sortOption);
  }, [sortOption.field, sortOption.direction]);

  // Update fetchRoutes ref whenever it changes
  useEffect(() => {
    fetchRoutesRef.current = fetchRoutes;
  }, [fetchRoutes]);

  // Reset and fetch when filters or sort change
  useEffect(() => {
    if (!user && !userId) {
      return;
    }

    // Simple approach: If we've ever loaded data before, always use routes list loading
    // Only use full screen loading on the very first load
    if (hasLoadedDataRef.current) {
      // We've loaded data before, so this is a filter change - use routes list loading
      setLoading(false);
      setIsLoadingRoutes(true);
    } else {
      // First time loading - use full screen loading
      setLoading(true);
      setIsLoadingRoutes(false);
    }

    // Reset pagination state
    setCurrentPage(1);
    setHasMore(true);
    setAllRoutes([]);
    setError(null);

    // Fetch first page with reset flag using ref to avoid dependency issues
    if (fetchRoutesRef.current) {
      fetchRoutesRef.current(1, true);
    }
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, [user, userId, filterKey, sortKey]);

  // Fetch countries data only once when user changes
  useEffect(() => {
    if (user) {
      fetchCountriesData();
    }
  }, [user, fetchCountriesData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Delete route
  const deleteUserRoute = useCallback(async (routeId: string) => {
    try {
      await deleteRoute(Number(routeId));
      setAllRoutes((prev) => prev.filter((r) => r.id !== routeId));
      setRoutesData((prev) =>
        prev
          ? {
              ...prev,
              pagination: {
                ...prev.pagination,
                total_routes: Math.max(0, prev.pagination.total_routes - 1),
              },
            }
          : null
      );
      return true;
    } catch (err) {
      console.error("Error deleting route:", err);
      throw err;
    }
  }, []);

  return {
    routesData,
    allRoutes,
    availableCountries,
    loading,
    isLoadingMore,
    isLoadingRoutes,
    isLoadingFilters,
    hasMore,
    currentPage,
    error,
    fetchRoutes,
    deleteUserRoute,
  };
};
