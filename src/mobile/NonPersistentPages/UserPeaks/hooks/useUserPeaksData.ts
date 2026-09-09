import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getAllUserPeaks } from "../../../../shared/api/endpoints/peakLists";
import type { UserPeaksRequest, UserPeaksResponse, UserPeak } from "../../../../shared/api/types";
import type { FilterState, SortOption } from "../types";
import { PEAKS_PER_PAGE } from "../types";

export const useUserPeaksData = (
  user: any,
  filters: FilterState,
  sortOption: SortOption,
  userId?: string
) => {
  const [peaksData, setPeaksData] = useState<UserPeaksResponse | null>(null);
  const [allPeaks, setAllPeaks] = useState<UserPeak[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingPeaks, setIsLoadingPeaks] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refs for deduplication and preventing multiple calls
  const fetchingRef = useRef(false);
  const lastRequestKeyRef = useRef<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedDataRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  const getMostSpecificAdminOsmIds = useCallback((adminOsmIds: number[] = []) => {
    if (adminOsmIds.length === 0) {
      return [];
    }

    return [adminOsmIds[adminOsmIds.length - 1] as number];
  }, []);

  // Memoize request params to prevent unnecessary recalculations
  const getRequestParams = useCallback(
    (page: number): UserPeaksRequest => {
      return {
        page,
        limit: PEAKS_PER_PAGE,
        userId,
        searchQuery: filters.searchQuery || "",
        startDate: filters.startDate || "",
        endDate: filters.endDate || "",
        admin_osm_ids: getMostSpecificAdminOsmIds(filters.admin_osm_ids),
        min_elevation: filters.elevationRange[0],
        max_elevation: filters.elevationRange[1],
        sortBy: sortOption.field === "ascents" ? "count" : sortOption.field,
        sortOrder: sortOption.direction,
      };
    },
    [userId, filters, sortOption, getMostSpecificAdminOsmIds]
  );

  // Generate stable request key for deduplication
  const generateRequestKey = useCallback(
    (page: number, params: UserPeaksRequest) => {
      return JSON.stringify({ ...params, page });
    },
    []
  );

  // Fetch peaks with proper error handling and deduplication
  const fetchPeaks = useCallback(
    async (page: number, reset: boolean = false) => {
      if (!user && !userId) {
        setLoading(false);
        return;
      }

      // Prevent concurrent requests
      if (fetchingRef.current && !reset) {
        return;
      }

      const requestParams = getRequestParams(page);
      const requestKey = generateRequestKey(page, requestParams);

      // Prevent duplicate requests
      if (lastRequestKeyRef.current === requestKey && !reset) {
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const requestId = ++latestRequestIdRef.current;

      try {
        fetchingRef.current = true;
        lastRequestKeyRef.current = requestKey;

        if (reset) {
          setAllPeaks([]);
          setCurrentPage(1);
          setHasMore(true);
          setError(null);
          if (isInitialLoad) {
            setIsInitialLoad(false);
          }
        } else {
          setIsLoadingMore(true);
        }

        const data = await getAllUserPeaks(requestParams);

        // Ignore aborted or stale responses
        if (
          abortController.signal.aborted ||
          requestId !== latestRequestIdRef.current
        ) {
          return;
        }

        setPeaksData(data);
        hasLoadedDataRef.current = true;

        if (reset) {
          setAllPeaks(data.peaks);
          setCurrentPage(1);
        } else {
          setAllPeaks((prev) => {
            // Deduplicate by peak ID
            const existingIds = new Set(prev.map((p) => p.id));
            const newPeaks = data.peaks.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newPeaks];
          });
          setCurrentPage(page);
        }

        setHasMore(data.pagination?.has_next_page || false);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (requestId !== latestRequestIdRef.current) {
          return;
        }
        console.error("Error fetching peaks:", err);
        setError("Failed to load peaks. Please try again.");
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
          setIsLoadingMore(false);
          setIsLoadingPeaks(false);
          fetchingRef.current = false;
          abortControllerRef.current = null;
        }
      }
    },
    [user, userId, getRequestParams, generateRequestKey, isInitialLoad]
  );

  // Memoize filter and sort keys for stable comparison
  const filterKey = useMemo(() => {
    return JSON.stringify(filters);
  }, [filters]);

  const sortKey = useMemo(() => {
    return JSON.stringify(sortOption);
  }, [sortOption]);

  // Reset and fetch when filters or sort change
  useEffect(() => {
    if (!user && !userId) {
      return;
    }

    if (hasLoadedDataRef.current) {
      setLoading(false);
      setIsLoadingPeaks(true);
    } else {
      setLoading(true);
      setIsLoadingPeaks(false);
    }

    setCurrentPage(1);
    setHasMore(true);
    setAllPeaks([]);
    setError(null);

    fetchPeaks(1, true);
  }, [user, userId, filterKey, sortKey, fetchPeaks]);

  return {
    peaksData,
    allPeaks,
    loading,
    isLoadingMore,
    isLoadingPeaks,
    hasMore,
    currentPage,
    error,
    fetchPeaks,
    setAllPeaks,
  };
};
