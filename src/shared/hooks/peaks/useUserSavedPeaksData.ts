import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getUserSavedPeaks } from "../../api/endpoints/user";
import type {
  UserSavedPeaksRequest,
  UserSavedPeaksResponse,
  UserSavedPeak,
} from "../../api/types";
import type { FilterState } from "./types";
import { PEAKS_PER_PAGE } from "./types";

export type UserSavedSortField = "name" | "elevation" | "saved_at";
export type UserSavedSortOption = {
  field: UserSavedSortField;
  direction: "asc" | "desc";
};

export const useUserSavedPeaksData = (
  user: unknown,
  filters: FilterState,
  sortOption: UserSavedSortOption,
) => {
  const [peaksData, setPeaksData] = useState<UserSavedPeaksResponse | null>(
    null,
  );
  const [allPeaks, setAllPeaks] = useState<UserSavedPeak[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingPeaks, setIsLoadingPeaks] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  const getRequestParams = useCallback(
    (page: number): UserSavedPeaksRequest => {
      return {
        page,
        limit: PEAKS_PER_PAGE,
        searchQuery: filters.searchQuery || "",
        startDate: filters.startDate || "",
        endDate: filters.endDate || "",
        admin_osm_ids: getMostSpecificAdminOsmIds(filters.admin_osm_ids),
        min_elevation: filters.elevationRange[0],
        max_elevation: filters.elevationRange[1],
        sortBy: sortOption.field,
        sortOrder: sortOption.direction,
      };
    },
    [filters, sortOption, getMostSpecificAdminOsmIds],
  );

  const generateRequestKey = useCallback(
    (page: number, params: UserSavedPeaksRequest) => {
      return JSON.stringify({ ...params, page });
    },
    [],
  );

  const fetchPeaks = useCallback(
    async (page: number, reset: boolean = false) => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (fetchingRef.current && !reset) {
        return;
      }

      const requestParams = getRequestParams(page);
      const requestKey = generateRequestKey(page, requestParams);

      if (lastRequestKeyRef.current === requestKey && !reset) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

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

        const data = await getUserSavedPeaks(requestParams);

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
        console.error("Error fetching saved peaks:", err);
        setError("Failed to load saved peaks. Please try again.");
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
    [user, getRequestParams, generateRequestKey, isInitialLoad],
  );

  const filterKey = useMemo(() => {
    return JSON.stringify(filters);
  }, [filters]);

  const sortKey = useMemo(() => {
    return JSON.stringify(sortOption);
  }, [sortOption]);

  useEffect(() => {
    if (!user) {
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
  }, [user, filterKey, sortKey, fetchPeaks]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
