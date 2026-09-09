import { useEffect, useState, useCallback, useRef } from "react";
import { useAnalytics } from "../context/AnalyticsContext";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getHighestCommunityPeaks,
  getHighestCommunityUsers,
} from "../api/endpoints/user";
import { getWorldListPeaksGeoJson, getWorldChallengeStats, getRegionBoundaries, getCountries, getAdminChildren } from "../api/endpoints/peakLists";
import type {
  CommunityPeak,
  CommunityUserStats,
  WorldPeaksGeoJSONResponse,
  WorldChallengeStatsResponse,
  RegionBoundary,
  AdminSearchResult,
} from "../api/types";
import type { AdminArea } from "../api/types/common";
import { buildAdminLevelsFromSearchResult } from "../utils/adminSearchSelection";


// =================================================================
// TYPES
// =================================================================

export type SortMode = "highest" | "contributors";

export interface AdminLevel {
  options: AdminArea[];
  selectedId: number | null;
  loading: boolean;
  selectedName: string | null;
}

const EMPTY_ADMIN_LEVEL: AdminLevel = {
  options: [],
  selectedId: null,
  loading: false,
  selectedName: null,
};

const LOADING_ADMIN_LEVEL: AdminLevel = {
  options: [],
  selectedId: null,
  loading: true,
  selectedName: null,
};

const PAGE_SIZE = 20;

const getUrlSortMode = (searchParams: URLSearchParams): SortMode => {
  const mode = searchParams.get("sort_mode");
  return mode === "highest" || mode === "contributors" ? mode : "highest";
};

const getUrlViewMe = (searchParams: URLSearchParams) =>
  searchParams.get("view_me") === "true";

const getUrlAdminIds = (searchParams: URLSearchParams) => {
  const adminIdsParam = searchParams.get("admin_ids");
  if (!adminIdsParam) return undefined;

  const ids = adminIdsParam
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "")
    .map(Number)
    .filter((id) => !isNaN(id) && id > 0);

  return ids.length > 0 ? ids : undefined;
};

const getAdminIdsKey = (adminIds?: number[]) => adminIds?.join(",") ?? "";

// =================================================================
// HOOK
// =================================================================

export function useWorldChallengeData(
  analyticsPrefix = "world_challenge",
  useUrlSync = false,
  ignoreMissingUrlParams = false
) {
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ----- Stats -----
  const [worldPeaksData, setWorldPeaksData] =
    useState<WorldPeaksGeoJSONResponse | null>(null);
  const [worldChallengeStats, setWorldChallengeStats] =
    useState<WorldChallengeStatsResponse | null>(null);
  const [regionBoundaries, setRegionBoundaries] =
    useState<RegionBoundary[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const location = useLocation();

  // ----- Leaderboard -----
  const [sortMode, setSortMode] = useState<SortMode>(() =>
    useUrlSync ? getUrlSortMode(searchParams) : "highest"
  );
  const [peaks, setPeaks] = useState<CommunityPeak[]>([]);
  const [users, setUsers] = useState<CommunityUserStats[]>([]);
  const [peaksLoading, setPeaksLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [peaksLoadingMore, setPeaksLoadingMore] = useState(false);
  const [usersLoadingMore, setUsersLoadingMore] = useState(false);
  const [hasMorePeaks, setHasMorePeaks] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [peaksOffset, setPeaksOffset] = useState(0);
  const [usersOffset, setUsersOffset] = useState(0);

  // ----- Admin filter cascade -----
  const [adminLevels, setAdminLevels] = useState<AdminLevel[]>([LOADING_ADMIN_LEVEL]);
  const [appliedAdminOsmIds, setAppliedAdminOsmIds] = useState<number[] | undefined>(() =>
    useUrlSync ? getUrlAdminIds(searchParams) : undefined
  );
  const [appliedAdminName, setAppliedAdminName] = useState<string | null>(null);

  // ----- Selection -----
  const [selectedPeakId, setSelectedPeakId] = useState<number | null>(null);
  const [selectedPeakData, setSelectedPeakData] = useState<CommunityPeak | null>(null);

  // ----- Modal -----
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [selectedPeak, setSelectedPeak] = useState<CommunityPeak | null>(null);

  // ----- Auth User Peaks Filter -----
  const [showOnlyMyUser, setShowOnlyMyUser] = useState(() =>
    useUrlSync ? getUrlViewMe(searchParams) : false
  );

  // ----- Map expansion -----
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const skipNextUrlWriteRef = useRef(false);

  // ----- URL SYNC -----
  // Keep local state aligned with browser navigation when URL sync is enabled.
  useEffect(() => {
    const isLeaderBoardPath = location.pathname.startsWith("/leaderboard");

    if (!useUrlSync || !isLeaderBoardPath) return;

    const hasSortModeParam = searchParams.has("sort_mode");
    const hasViewMeParam = searchParams.has("view_me");
    const hasAdminIdsParam = searchParams.has("admin_ids");

    if (
      ignoreMissingUrlParams &&
      !hasSortModeParam &&
      !hasViewMeParam &&
      !hasAdminIdsParam
    ) {
      return;
    }

    const nextSortMode = hasSortModeParam ? getUrlSortMode(searchParams) : "highest";
    const nextViewMe = hasViewMeParam ? getUrlViewMe(searchParams) : false;
    const nextAdminIds = hasAdminIdsParam ? getUrlAdminIds(searchParams) : undefined;

    let updated = false;

    setSortMode((current) => {
      if (current !== nextSortMode) {
        updated = true;
        return nextSortMode;
      }
      return current;
    });

    setShowOnlyMyUser((current) => {
      if (current !== nextViewMe) {
        updated = true;
        return nextViewMe;
      }
      return current;
    });

    setAppliedAdminOsmIds((current) => {
      if (getAdminIdsKey(current) !== getAdminIdsKey(nextAdminIds)) {
        updated = true;
        return nextAdminIds;
      }
      return current;
    });

    if (updated) {
      skipNextUrlWriteRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, useUrlSync, ignoreMissingUrlParams]);

  // Sync state to URL whenever it changes
  useEffect(() => {
    const isLeaderBoardPath = location.pathname.startsWith("/leaderboard");

    if (!useUrlSync || !isLeaderBoardPath) return;

    if (skipNextUrlWriteRef.current) {
      skipNextUrlWriteRef.current = false;
      return;
    }

    const next = new URLSearchParams(searchParams);
    let changed = false;

    // Sync sort mode - omitting default "highest" to keep URL clean
    const targetSort = sortMode === "highest" ? null : sortMode;
    if (next.get("sort_mode") !== targetSort) {
      if (targetSort) next.set("sort_mode", targetSort);
      else next.delete("sort_mode");
      changed = true;
    }
    
    // Sync show only my user
    const viewMe = showOnlyMyUser ? "true" : null;
    if (next.get("view_me") !== viewMe) {
      if (viewMe) next.set("view_me", "true");
      else next.delete("view_me");
      changed = true;
    }
    
    // Sync admin IDs
    const idsStr = appliedAdminOsmIds && appliedAdminOsmIds.length > 0
      ? getAdminIdsKey(appliedAdminOsmIds)
      : null;
    if (next.get("admin_ids") !== idsStr) {
      if (idsStr) next.set("admin_ids", idsStr);
      else next.delete("admin_ids");
      changed = true;
    }
    
    if (changed) {
      setSearchParams(next, { replace: true });
    }
  }, [
    sortMode,
    showOnlyMyUser,
    appliedAdminOsmIds,
    useUrlSync,
    searchParams,
    setSearchParams,
  ]);

  // =================================================================
  // ADMIN LEVEL LOADING
  // =================================================================

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCountries();
        if (cancelled) return;
        setAdminLevels([
          { options: data, selectedId: null, loading: false, selectedName: null },
        ]);
      } catch (error) {
        console.error("Failed to load countries:", error);
        if (!cancelled) setAdminLevels([EMPTY_ADMIN_LEVEL]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sync Applied Name whenever admin levels change
  useEffect(() => {
    // Find the deepest selected level
    const filledLevels = adminLevels.filter(l => l.selectedId !== null);
    if (filledLevels.length > 0) {
      const deepest = filledLevels[filledLevels.length - 1];
      setAppliedAdminName(deepest?.selectedName || null);
    } else {
      setAppliedAdminName(null);
    }
  }, [adminLevels]);

  const handleAdminLevelChange = useCallback(
    (levelIndex: number, osmId: number | null, isRestoring = false) => {
      console.log(`[useWorldChallengeData] handleAdminLevelChange - Index: ${levelIndex}, OsmId: ${osmId}, isRestoring: ${isRestoring}`);
      trackEvent("filter_change", `${analyticsPrefix}_admin_level_${levelIndex}_${osmId || "all"}`);

      // Only set loading states when NOT restoring from URL.
      // During restoration, appliedAdminOsmIds doesn't change so fetchData won't re-run.
      if (!isRestoring) {
        setPeaksLoading(true);
        setUsersLoading(true);
        setStatsLoading(true);
      }

      setAdminLevels((prev) => {
        const currentLevel = prev[levelIndex];
        if (!currentLevel) {
          console.warn("[useWorldChallengeData] Level not found at index:", levelIndex);
          return prev;
        }

        const selectedOption =
          osmId && currentLevel.options
            ? currentLevel.options.find((o) => Number(o.osm_id) === Number(osmId)) ?? null
            : null;
        const selectedName = selectedOption?.name ?? null;
        console.log(`[useWorldChallengeData] Level ${levelIndex} Selected:`, selectedName);

        const updatedLevels = prev.slice(0, levelIndex + 1).map((level, i) => {
          if (i === levelIndex) {
            return { ...level, selectedId: osmId, selectedName };
          }
          return level;
        });

        if (osmId !== null) {
          updatedLevels.push(LOADING_ADMIN_LEVEL);
        }

        // Handle sync of applied filters breadcrumb
        if (!isRestoring) {
          const breadcrumb = updatedLevels
            .map(l => l.selectedId)
            .filter((id): id is number => id !== null);

          setAppliedAdminOsmIds(breadcrumb.length > 0 ? breadcrumb : undefined);
          if (breadcrumb.length === 0) setAppliedAdminName(null);
        }
        return updatedLevels;
      });

      // Load children when an area is selected
      if (osmId !== null) {
        (async () => {
          try {
            console.log("[useWorldChallengeData] Fetching children for:", osmId);
            const children = await getAdminChildren(osmId);
            console.log(`[useWorldChallengeData] Received ${children.length} children for ${osmId}`);
            setAdminLevels((prev) => {
              const childIdx = levelIndex + 1;
              if (childIdx >= prev.length) return prev;
              if (children.length === 0) return prev.slice(0, childIdx);
              const updated = [...prev];
              updated[childIdx] = {
                options: children,
                selectedId: null,
                loading: false,
                selectedName: null,
              };
              return updated;
            });
          } catch (error) {
            console.error("[useWorldChallengeData] Failed to load admin children:", error);
            setAdminLevels((prev) => prev.slice(0, levelIndex + 1));
          }
        })();
      }
    },
    [trackEvent, analyticsPrefix, appliedAdminOsmIds]
  );

  const selectAdminSearchResult = useCallback(
    async (result: AdminSearchResult) => {
      trackEvent("filter_change", `${analyticsPrefix}_admin_search_${result.id}`);
      setPeaksLoading(true);
      setUsersLoading(true);
      setStatsLoading(true);

      try {
        const nextLevels = await buildAdminLevelsFromSearchResult(
          result,
          adminLevels[0]?.options ?? [],
          getCountries,
          getAdminChildren
        );
        const breadcrumb = nextLevels
          .map((level) => level.selectedId)
          .filter((id): id is number => id !== null);
        const deepestSelectedLevel = [...nextLevels]
          .reverse()
          .find((level) => level.selectedId !== null);

        setAdminLevels(nextLevels);
        setAppliedAdminOsmIds(
          breadcrumb.length > 0 ? breadcrumb : [result.id]
        );
        setAppliedAdminName(
          deepestSelectedLevel?.selectedName || result.name_only || result.name
        );
      } catch (error) {
        console.error(
          "[useWorldChallengeData] Failed to apply admin search result:",
          error
        );

        const fallbackOption: AdminArea = {
          osm_id: result.id,
          level: result.admin_level,
          name: result.name_only || result.name,
        };
        const rootOptions = adminLevels[0]?.options ?? [];
        const nextRootOptions = rootOptions.some(
          (option) => option.osm_id === result.id
        )
          ? rootOptions
          : [fallbackOption, ...rootOptions];

        setAdminLevels([
          {
            options: nextRootOptions,
            selectedId: result.id,
            loading: false,
            selectedName: fallbackOption.name,
          },
        ]);
        setAppliedAdminOsmIds([result.id]);
        setAppliedAdminName(fallbackOption.name);
      }
    },
    [adminLevels, analyticsPrefix, trackEvent]
  );

  const clearAdminSelection = useCallback(() => {
    trackEvent("filter_change", `${analyticsPrefix}_admin_search_clear`);
    setPeaksLoading(true);
    setUsersLoading(true);
    setStatsLoading(true);

    const rootLevel = adminLevels[0];
    if (rootLevel?.options.length) {
      setAdminLevels([
        {
          options: rootLevel.options,
          selectedId: null,
          loading: false,
          selectedName: null,
        },
      ]);
    } else {
      setAdminLevels([LOADING_ADMIN_LEVEL]);
      (async () => {
        try {
          const data = await getCountries();
          setAdminLevels([
            {
              options: data,
              selectedId: null,
              loading: false,
              selectedName: null,
            },
          ]);
        } catch (error) {
          console.error("Failed to reload countries:", error);
          setAdminLevels([EMPTY_ADMIN_LEVEL]);
        }
      })();
    }

    setAppliedAdminOsmIds(undefined);
    setAppliedAdminName(null);
  }, [adminLevels, analyticsPrefix, trackEvent]);

  // =================================================================
  // DATA FETCHING
  // =================================================================

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const leafId = appliedAdminOsmIds?.[appliedAdminOsmIds.length - 1];
      const apiIds = leafId ? [leafId] : undefined;

      const res = await getHighestCommunityUsers({
        limit: PAGE_SIZE,
        offset: 0,
        sort_by: "total_peaks",
        ...(apiIds && { admin_osm_ids: apiIds }),
      });
      setUsers(res.users || []);
      setHasMoreUsers(res.has_more);
      setUsersOffset(res.pagination.next_offset || 0);
    } finally {
      setUsersLoading(false);
    }
  }, [appliedAdminOsmIds]);

  const fetchData = useCallback(async (isInitial = false) => {
    console.log("[useWorldChallengeData] fetchData - isInitial:", isInitial, "Applied IDs:", appliedAdminOsmIds);
    try {
      if (isInitial) {
        setStatsLoading(true);
        setPeaksLoading(true);
        setUsersLoading(true);
      }

      const leafId = appliedAdminOsmIds?.[appliedAdminOsmIds.length - 1];
      const apiIds = leafId ? [leafId] : undefined;

      const [geoData, statsData, peaksRes, usersRes] = await Promise.all([
        getWorldListPeaksGeoJson(apiIds),
        getWorldChallengeStats(apiIds),
        getHighestCommunityPeaks(PAGE_SIZE, 0, apiIds),
        sortMode === "contributors"
          ? getHighestCommunityUsers({
              limit: PAGE_SIZE,
              offset: 0,
              sort_by: "total_peaks",
              ...(apiIds && { admin_osm_ids: apiIds }),
            })
          : Promise.resolve(null),
      ]);

      console.log("[useWorldChallengeData] Fetched Data - Features count:", geoData.features.length);
      setWorldPeaksData(geoData);
      setWorldChallengeStats(statsData);
      setPeaks(peaksRes.peaks || []);
      setHasMorePeaks(peaksRes.has_more);
      setPeaksOffset(peaksRes.pagination.next_offset || 0);

      if (usersRes) {
        setUsers(usersRes.users || []);
        setHasMoreUsers(usersRes.has_more);
        setUsersOffset(usersRes.pagination.next_offset || 0);
      } else {
        setUsers([]);
        setUsersOffset(0);
        setHasMoreUsers(false);
      }
    } catch (error) {
      console.error("[useWorldChallengeData] fetchData failed:", error);
    } finally {
      setStatsLoading(false);
      setPeaksLoading(false);
      setUsersLoading(false);
    }
  }, [appliedAdminOsmIds, sortMode]);

  // Initial + filter-change fetch
  useEffect(() => {
    fetchData(true);
  }, [appliedAdminOsmIds]); // eslint_disable-line react-hooks/exhaustive-deps

  // Fetch region boundaries only when admin filters are active
  useEffect(() => {
    if (!appliedAdminOsmIds || appliedAdminOsmIds.length === 0) {
      setRegionBoundaries([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const leafId = appliedAdminOsmIds[appliedAdminOsmIds.length - 1];
        if (leafId == null) return;
        const res = await getRegionBoundaries([leafId]);
        if (!cancelled) setRegionBoundaries(res.boundaries || []);
      } catch (error) {
        console.error("[useWorldChallengeData] Failed to load region boundaries:", error);
        if (!cancelled) setRegionBoundaries([]);
      }
    })();
    return () => { cancelled = true; };
  }, [appliedAdminOsmIds]);

  // ... URL SYNC RESTORATION ...
  // This effect attempts to "catch up" the dropdown cascade based on the breadcrumb in appliedAdminOsmIds
  useEffect(() => {
    if (!useUrlSync || !appliedAdminOsmIds || appliedAdminOsmIds.length === 0) return;

    console.log("[useWorldChallengeData] Restoration Loop Check - adminLevels count:", adminLevels.length);

    for (let i = 0; i < appliedAdminOsmIds.length; i++) {
      const targetId = Number(appliedAdminOsmIds[i]);
      const currentLevel = adminLevels[i];

      console.log(`[useWorldChallengeData] Step ${i} - Target ID: ${targetId}, Current Selection: ${currentLevel?.selectedId}`);

      if (currentLevel) {
        if (Number(currentLevel.selectedId) === targetId) {
          console.log(`[useWorldChallengeData] Step ${i} already matched.`);
          continue;
        }
        
        if (currentLevel.loading) {
          console.log(`[useWorldChallengeData] Step ${i} is loading... waiting.`);
          break;
        }

        if (currentLevel.options && currentLevel.options.length > 0) {
          const found = currentLevel.options.find(o => Number(o.osm_id) === targetId);
          if (found) {
            console.log(`[useWorldChallengeData] Found match for step ${i} (${found.name}). selecting...`);
            handleAdminLevelChange(i, targetId, true); 
          } else {
            console.warn(`[useWorldChallengeData] Target ID ${targetId} NOT found in level ${i} options.`);
          }
          break;
        } else {
          console.log(`[useWorldChallengeData] Step ${i} has no options yet.`);
          break;
        }
      } else {
        console.log(`[useWorldChallengeData] Step ${i} level not initialized in state.`);
        break;
      }
    }
  }, [appliedAdminOsmIds, adminLevels, handleAdminLevelChange, useUrlSync]);

  // Lazy-load users when tab changes to "contributors"
  useEffect(() => {
    if (sortMode === "contributors" && users.length === 0 && !usersLoading) {
      loadUsers();
    }
  }, [sortMode]); // eslint_disable-line react-hooks/exhaustive-deps

  // =================================================================
  // PAGINATION
  // =================================================================

  const loadMorePeaks = useCallback(async () => {
    if (!hasMorePeaks || peaksLoadingMore) return;
    try {
      trackEvent("pagination", `${analyticsPrefix}_load_more_peaks`);
      setPeaksLoadingMore(true);
      const leafId = appliedAdminOsmIds?.[appliedAdminOsmIds.length - 1];
      const apiIds = leafId ? [leafId] : undefined;
      const res = await getHighestCommunityPeaks(PAGE_SIZE, peaksOffset, apiIds);
      setPeaks((prev) => [...prev, ...res.peaks]);
      setHasMorePeaks(res.has_more);
      setPeaksOffset(res.pagination.next_offset || 0);
    } finally {
      setPeaksLoadingMore(false);
    }
  }, [hasMorePeaks, peaksLoadingMore, peaksOffset, appliedAdminOsmIds, trackEvent, analyticsPrefix]);

  const loadMoreUsers = useCallback(async () => {
    if (!hasMoreUsers || usersLoadingMore) return;
    try {
      trackEvent("pagination", `${analyticsPrefix}_load_more_users`);
      setUsersLoadingMore(true);
      const leafId = appliedAdminOsmIds?.[appliedAdminOsmIds.length - 1];
      const apiIds = leafId ? [leafId] : undefined;
      const res = await getHighestCommunityUsers({
        limit: PAGE_SIZE,
        offset: usersOffset,
        sort_by: "total_peaks",
        ...(apiIds && { admin_osm_ids: apiIds }),
      });
      setUsers((prev) => [...prev, ...res.users]);
      setHasMoreUsers(res.has_more);
      setUsersOffset(res.pagination.next_offset || 0);
    } finally {
      setUsersLoadingMore(false);
    }
  }, [hasMoreUsers, usersLoadingMore, usersOffset, appliedAdminOsmIds, trackEvent, analyticsPrefix]);

  // =================================================================
  // EVENT HANDLERS
  // =================================================================

  const handleSortChange = useCallback(
    (mode: SortMode) => {
      trackEvent("button_click", `${analyticsPrefix}_sort_${mode}`);
      setSortMode(mode);
      if (mode === "contributors") loadUsers();
    },
    [trackEvent, analyticsPrefix, loadUsers]
  );

  const handlePeakClick = useCallback(
    (peak: CommunityPeak) => {
      trackEvent("peak_click", `${analyticsPrefix}_${peak.id}`);
      navigate(`/peaks/${peak.id}`);
    },
    [trackEvent, analyticsPrefix, navigate]
  );

  const handleUserClick = useCallback(
    (peak: CommunityPeak) => {
      if (peak.users && peak.users.length > 1) {
        trackEvent("button_click", `${analyticsPrefix}_user_popup_${peak.id}`);
        setSelectedPeak(peak);
        setShowUserPopup(true);
      }
    },
    [trackEvent, analyticsPrefix]
  );

  const handleUserNavigation = useCallback(
    (userId: number) => {
      trackEvent("button_click", `${analyticsPrefix}_user_navigate_${userId}`);
      setShowUserPopup(false);

      if (user && user.internalUserId === userId) {
        navigate("/profile");
      } else {
        navigate(`/externalprofile/${userId}`);
      }
    },
    [trackEvent, analyticsPrefix, user, navigate]
  );

  const closeUserPopup = useCallback(() => {
    trackEvent("interaction", `${analyticsPrefix}_user_popup_close`);
    setShowUserPopup(false);
  }, [trackEvent, analyticsPrefix]);

  const handleExpandMap = useCallback(() => {
    trackEvent("button_click", `${analyticsPrefix}_expand_map`);
    setIsMapExpanded((prev) => !prev);
  }, [trackEvent, analyticsPrefix]);

  const toggleShowOnlyMyUser = useCallback(() => {
    setShowOnlyMyUser((prev) => !prev);
  }, []);

  // Prevent background scroll when map or modal is expanded
  useEffect(() => {
    document.body.style.overflow = isMapExpanded ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMapExpanded]);

  // =================================================================
  // DERIVED STATS
  // =================================================================

  const statsObj = {
    totalWorldPeaks: worldChallengeStats?.total_peaks || 0,
    communityCompleted: worldChallengeStats?.community_peaks || 0,
    userCompleted: worldChallengeStats?.user_peaks || 0,
  };

  const displayPeaks = showOnlyMyUser && user && worldPeaksData && worldPeaksData.features
    ? worldPeaksData.features
        .filter((f) => f.properties && f.properties.completed)
        .sort((a, b) => (b.properties?.elevation || 0) - (a.properties?.elevation || 0))
        .map((f) => {
          const props = f.properties as any;
          if (!props) return null;
          return {
            id: props.id,
            name: props.name,
            name_en: props.name || null,
            lat: f.geometry?.type === "Point" ? f.geometry.coordinates[1] : 0,
            lng: f.geometry?.type === "Point" ? f.geometry.coordinates[0] : 0,
            elevation: props.elevation || 0,
            count: 1,
            unique_users: 1,
            users: [],
          };
        }).filter(p => p !== null) as CommunityPeak[]
    : peaks;

  const displayUsers = showOnlyMyUser && user
    ? []
    : users;

  const displayGeoJson = showOnlyMyUser && worldPeaksData && worldPeaksData.features
    ? {
        ...worldPeaksData,
        features: worldPeaksData.features.filter((f) => f.properties && f.properties.completed),
      }
    : worldPeaksData;

  return {
    // Data
    worldPeaksData: displayGeoJson,
    regionBoundaries,
    stats: statsObj,
    peaks: displayPeaks,
    users: displayUsers,
    showOnlyMyUser,
    sortMode,
    adminLevels,
    appliedAdminOsmIds,
    appliedAdminName,
    selectedPeakId,
    selectedPeakData,

    // Loading states
    statsLoading,
    peaksLoading,
    usersLoading,
    peaksLoadingMore,
    usersLoadingMore,
    hasMorePeaks,
    hasMoreUsers,

    // Modal
    showUserPopup,
    selectedPeak,

    // Map
    isMapExpanded,

    // Actions
    handleAdminLevelChange,
    selectAdminSearchResult,
    clearAdminSelection,
    handleSortChange,
    handlePeakClick,
    handleUserClick,
    handleUserNavigation,
    closeUserPopup,
    handleExpandMap,
    loadMorePeaks,
    loadMoreUsers,
    toggleShowOnlyMyUser,
    setSelectedPeakId,
    setSelectedPeakData,
  };
}
