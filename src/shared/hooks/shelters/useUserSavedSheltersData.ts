import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getUserSavedShelters } from "../../api/endpoints/user";
import type {
  UserSavedSheltersRequest,
  UserSavedSheltersResponse,
  UserSavedShelter,
  ShelterType,
} from "../../api/types";
import type { FilterState } from "../peaks/types";

export type UserSavedShelterSortField = "name" | "elevation" | "saved_at";
export type UserSavedShelterSortOption = {
  field: UserSavedShelterSortField;
  direction: "asc" | "desc";
};

export type ShelterFilterState = FilterState & {
  shelterType: ShelterType | "";
};

export const SHELTERS_PER_PAGE = 100;

export const useUserSavedSheltersData = (
  user: unknown,
  filters: ShelterFilterState,
  sortOption: UserSavedShelterSortOption,
) => {
  const [sheltersData, setSheltersData] =
    useState<UserSavedSheltersResponse | null>(null);
  const [allShelters, setAllShelters] = useState<UserSavedShelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingShelters, setIsLoadingShelters] = useState(false);
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
    (page: number): UserSavedSheltersRequest => {
      const params: UserSavedSheltersRequest = {
        page,
        limit: SHELTERS_PER_PAGE,
        searchQuery: filters.searchQuery || "",
        startDate: filters.startDate || "",
        endDate: filters.endDate || "",
        admin_osm_ids: getMostSpecificAdminOsmIds(filters.admin_osm_ids),
        min_elevation: filters.elevationRange[0],
        max_elevation: filters.elevationRange[1],
        sortBy: sortOption.field,
        sortOrder: sortOption.direction,
      };
      if (filters.shelterType) {
        params.type = filters.shelterType;
      }
      return params;
    },
    [filters, sortOption, getMostSpecificAdminOsmIds],
  );

  const generateRequestKey = useCallback(
    (page: number, params: UserSavedSheltersRequest) => {
      return JSON.stringify({ ...params, page });
    },
    [],
  );

  const fetchShelters = useCallback(
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
          setAllShelters([]);
          setCurrentPage(1);
          setHasMore(true);
          setError(null);
          if (isInitialLoad) {
            setIsInitialLoad(false);
          }
        } else {
          setIsLoadingMore(true);
        }

        const data = await getUserSavedShelters(requestParams);

        if (
          abortController.signal.aborted ||
          requestId !== latestRequestIdRef.current
        ) {
          return;
        }

        setSheltersData(data);
        hasLoadedDataRef.current = true;

        if (reset) {
          setAllShelters(data.shelters);
          setCurrentPage(1);
        } else {
          setAllShelters((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newShelters = data.shelters.filter(
              (s) => !existingIds.has(s.id),
            );
            return [...prev, ...newShelters];
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
        console.error("Error fetching saved shelters:", err);
        setError("Failed to load saved shelters. Please try again.");
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
          setIsLoadingMore(false);
          setIsLoadingShelters(false);
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
      setIsLoadingShelters(true);
    } else {
      setLoading(true);
      setIsLoadingShelters(false);
    }

    setCurrentPage(1);
    setHasMore(true);
    setAllShelters([]);
    setError(null);

    fetchShelters(1, true);
  }, [user, filterKey, sortKey, fetchShelters]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    sheltersData,
    allShelters,
    loading,
    isLoadingMore,
    isLoadingShelters,
    hasMore,
    currentPage,
    error,
    fetchShelters,
    setAllShelters,
  };
};