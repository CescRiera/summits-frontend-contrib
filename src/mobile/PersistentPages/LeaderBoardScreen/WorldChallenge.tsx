"use client";

import type React from "react";
import { useEffect, useState, useRef, useCallback, Suspense, lazy } from "react";
import { useLocation } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { X, Trophy, Expand, Users } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import AppModal from "../../../shared/components/AppModal";
import styles from "./WorldChallenge.module.css";
import SimpleSheet from "../../components/Map/SheetWithKeyboard/SimpleSheet";
import WorldChallengeAdminSearch from "../../../shared/components/WorldChallengeAdminSearch/WorldChallengeAdminSearch";
import { getUserStats } from "../../../shared/api/endpoints/user";
import { PEAK_ICONS, MAPBOX_ACCESS_TOKEN } from "../../components/Map/MapUtils";
import type {
  AdminSearchResult,
  CommunityPeak,
  CommunityUserStats,
  User,
  WorldPeaksGeoJSONResponse,
  UserStatsResponse,
  AdminHierarchy,
  RegionBoundary,
} from "../../../shared/api/types";
import { useNavbarVisibility } from "../../context/NavbarVisibilityContext";
import { getElevationIcon, getTotalAscensions } from "../../../shared/constants/elevationColors";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import {
  loadMapImage,
  extractPeakIds,
  buildExclusionFilter,
  buildTileFilter,
  applyTileLayerFilter,
  fitMapToBounds,
  updateMapBoundaries,
  initializeWorldChallengeLayers,
  registerMapClickHandlers,
} from "../../../shared/utils/worldChallengeMapUtils";
import {
  createOfflineTransformRequest,
  installOfflineMapHooks,
  prewarmInitialViewport,
} from "../../../shared/offline";
import {
  useWorldChallengeData,
  type SortMode,
} from "../../../shared/hooks/useWorldChallengeData";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";

const PeakDetailsMap = lazy(
  () => import("../../components/Map/PeakDetailsMap/PeakDetailsMap")
);

// Initialize Mapbox token
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// =================================================================
// STATS CHART COMPONENT
// =================================================================

interface StatsChartProps {
  totalWorldPeaks: number;
  communityCompleted: number;
  userCompleted: number;
  isLoading: boolean;
}

const StatsChart: React.FC<StatsChartProps> = ({
  totalWorldPeaks,
  communityCompleted,
  userCompleted,
  isLoading,
}) => {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className={styles["world-challenge__stats"]}>
        <div className={styles["world-challenge__stats-loading"]}>
          <div className={styles["world-challenge__loading-spinner"]}></div>
        </div>
      </div>
    );
  }

  const fmt = (num: number | undefined) => (num ?? 0).toLocaleString();

  return (
    <div className={styles["world-challenge__stats"]}>
      <div className={styles["world-challenge__stat-card"]}>
        <span className={`${styles["world-challenge__stat-label"]} typography-label-medium`}>
          {t("leaderboard.shortTotal")}
        </span>
        <span className="typography-headline-small">{fmt(totalWorldPeaks)}</span>
      </div>
      <div className={styles["world-challenge__stat-divider"]} />
      <div className={styles["world-challenge__stat-card"]}>
        <span className={`${styles["world-challenge__stat-label"]} typography-label-medium`}>
          {t("leaderboard.shortCommunity")}
        </span>
        <span className="typography-headline-small">{fmt(communityCompleted)}</span>
      </div>
      <div className={styles["world-challenge__stat-divider"]} />
      <div className={styles["world-challenge__stat-card"]}>
        <span className={`${styles["world-challenge__stat-label"]} typography-label-medium`}>
          {t("leaderboard.shortMe")}
        </span>
        <span className="typography-headline-small">{fmt(userCompleted)}</span>
      </div>
    </div>
  );
};

// =================================================================
// MAP SECTION COMPONENT
// =================================================================

interface MapSectionProps {
  geojson: WorldPeaksGeoJSONResponse | null;
  regionBoundaries: RegionBoundary[];
  isLoading: boolean;
  isExpanded: boolean;
  onExpand: () => void;
  isActive?: boolean | undefined;
  appliedAdminOsmIds: number[] | undefined;
  appliedAdminName: string | null;
  onAdminSearchSelect: (result: AdminSearchResult) => void | Promise<void>;
  onAdminSearchClear: () => void;
  stats: {
    totalWorldPeaks: number;
    communityCompleted: number;
    userCompleted: number;
  };
  selectedPeakId: number | null;
  selectedPeakData: CommunityPeak | null;
  onSelectPeak: (peak: CommunityPeak, coordinates: [number, number]) => void;
  onClosePeak: () => void;
}

const MapSection: React.FC<MapSectionProps> = ({
  geojson,
  regionBoundaries,
  isLoading,
  isExpanded,
  onExpand,
  isActive,
  appliedAdminOsmIds,
  appliedAdminName,
  onAdminSearchSelect,
  onAdminSearchClear,
  stats,
  selectedPeakId,
  selectedPeakData,
  onSelectPeak,
  onClosePeak,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { setNavbarHidden } = useNavbarVisibility();
  const location = useLocation();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const isMounted = useRef(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Lifecycle
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ResizeObserver for container changes
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => mapRef.current?.resize());
    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Resize on expand/collapse transition
  useEffect(() => {
    if (!mapRef.current) return;
    const delays = [0, 150, 300, 500];
    const timers = delays.map((d) =>
      setTimeout(() => mapRef.current?.resize(), d)
    );
    return () => timers.forEach(clearTimeout);
  }, [isExpanded]);

  // Resize when tab becomes active
  useEffect(() => {
    if (isActive && mapRef.current) {
      setTimeout(() => mapRef.current?.resize(), 50);
    }
  }, [isActive]);

  // Navbar visibility & body scroll when expanded
  useEffect(() => {
    const isLeaderboardRoute = location.pathname === "/leaderboard";
    
    if (isLeaderboardRoute) {
      setNavbarHidden(isExpanded);
      document.body.style.overflow = isExpanded ? "hidden" : "";
    } else {
      setNavbarHidden(false);
      document.body.style.overflow = "";
    }

    return () => {
      if (isExpanded) {
        setNavbarHidden(false);
        document.body.style.overflow = "";
      }
    };
  }, [isExpanded, setNavbarHidden, location.pathname]);

  // Update GeoJSON data & tile filters when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson || !isMapLoaded) return;

    const source = map.getSource("world-peaks") as mapboxgl.GeoJSONSource;
    if (source) source.setData(geojson);

    // Update boundaries
    updateMapBoundaries(map, regionBoundaries);

    const idsToExclude = extractPeakIds(geojson);
    const filter = buildTileFilter(idsToExclude, appliedAdminOsmIds, appliedAdminName);
    applyTileLayerFilter(map, filter);

    if (appliedAdminOsmIds?.length) {
      fitMapToBounds(map, geojson, regionBoundaries);
    }
  }, [geojson, regionBoundaries, appliedAdminOsmIds, appliedAdminName, isMapLoaded]);

  // Handle peak selection
  const handlePeakClickInternal = useCallback(
    (peak: CommunityPeak, coordinates: [number, number]) => {
      const map = mapRef.current;
      if (!map) return;

      trackEvent("peak_click", `world_map_${peak.id}_tile`);

      // Fly to peak
      map.flyTo({ center: coordinates, zoom: 12, duration: 1500, essential: true });

      // Call parent selection handler
      onSelectPeak(peak, coordinates);
    },
    [trackEvent, onSelectPeak]
  );

  // Sync map center with selected peak (handles list clicks)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPeakData || !isMapLoaded) return;

    map.flyTo({
      center: [selectedPeakData.lng, selectedPeakData.lat],
      zoom: 12,
      duration: 1500,
      essential: true,
    });
  }, [selectedPeakData, isMapLoaded]);

  // Initialize map on mount
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;
    let offlineHooksCleanup: (() => void) | undefined;
    const STYLE_URL = "mapbox://styles/mapbox/satellite-v9";

    const boot = async () => {
      try {
        mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
        // Warm offline tiles/assets BEFORE constructing the map so the sync
        // transformRequest can serve them from the memory cache when offline.
        await prewarmInitialViewport({
          center: [2.0, 42.0],
          zoom: 1,
          styleUrl: STYLE_URL,
        });
        if (cancelled) return;

        const map = new mapboxgl.Map({
          container,
          style: STYLE_URL,
          center: [2.0, 42.0],
          zoom: 1,
          minZoom: 1,
          maxPitch: 60,
          attributionControl: false,
          projection: "mercator",
          transformRequest: createOfflineTransformRequest(),
        });
        map.scrollZoom.setWheelZoomRate(1 / 450);

        mapRef.current = map;
        try {
          offlineHooksCleanup = installOfflineMapHooks(map, STYLE_URL);
        } catch (e) {
          console.warn("Failed to install offline hooks:", e);
        }

        map.on("load", async () => {
          if (!isMounted.current) return;

          // Unset active peak when clicking raw map (not a symbol)
          map.on('click', (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: ['peak-symbols', 'unclustered-point'] });
            if (!features.length) {
              onClosePeak();
            }
          });

          const exclusionFilter = buildExclusionFilter(extractPeakIds(geojson));
          await initializeWorldChallengeLayers(
            map, geojson, PEAK_ICONS, loadMapImage,
            () => isMounted.current, exclusionFilter
          );

          if (!isMounted.current) return;
          setIsMapLoaded(true);
        });

        registerMapClickHandlers(map, mapRef, isMounted, handlePeakClickInternal);
      } catch (e) {
        console.error("Failed to initialize map:", e);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      offlineHooksCleanup?.();
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch (e) {
          console.warn("Error removing map instance:", e);
        }
        mapRef.current = null;
      }
    };
  }, []); // eslint_disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`${styles["world-challenge__map"]} ${isExpanded ? styles["world-challenge__map--expanded"] : ""}`}
    >
      {isExpanded && (
        <div className={styles["world-challenge__map-header"]}>
          <div className={styles["world-challenge__map-filters"]}>
            <WorldChallengeAdminSearch
              key={`world-challenge-map-admin-${appliedAdminName ?? "none"}`}
              selectedName={appliedAdminName}
              placeholder={t("leaderboard.searchLocationPlaceholder")}
              emptyText={(query) => t("leaderboard.noLocationsFound", { query })}
              ariaLabel={t("leaderboard.locationSearchLabel")}
              onSelect={onAdminSearchSelect}
              onClear={onAdminSearchClear}
            />
          </div>
          <button
            className={styles["world-challenge__expand-btn"]}
            onClick={onExpand}
            aria-label={t("leaderboard.shortMinimize")}
          >
            <X size={20} />
          </button>
          
          <div className={styles["world-challenge__map-expanded-stats"]}>
            <div className={styles["world-challenge__map-expanded-stat"]}>
              <span className="typography-label-medium">{t("leaderboard.shortTotal")}</span>
              <span className="typography-title-medium">{stats.totalWorldPeaks.toLocaleString()}</span>
            </div>
            <div className={styles["world-challenge__map-expanded-stat"]}>
              <span className="typography-label-medium">{t("leaderboard.shortCommunity")}</span>
              <span className={`${styles["world-challenge__map-expanded-stat-value--community"]} typography-title-medium`}>
                {stats.communityCompleted.toLocaleString()}
              </span>
            </div>
            <div className={styles["world-challenge__map-expanded-stat"]}>
              <span className="typography-label-medium">{t("leaderboard.shortMe")}</span>
              <span className={`${styles["world-challenge__map-expanded-stat-value--me"]} typography-title-medium`}>
                {stats.userCompleted.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
      {isLoading && (
        <div
          className={styles["world-challenge__map-loading"]}
          style={mapRef.current ? {
            position: 'absolute', top: 0, left: 0, zIndex: 10,
            background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(2px)',
          } : {}}
        >
          <div className={styles["world-challenge__loading-spinner"]}></div>
        </div>
      )}
      <div ref={mapContainerRef} className={styles["world-challenge__map-container"]} />
      
      {/* Peak Details Sheet - Replicated from mobile Map.tsx logic */}
      {isExpanded && selectedPeakId && (
        <SimpleSheet
          isOpen={!!selectedPeakId}
          onClose={onClosePeak}
          peakData={selectedPeakData}
          variant="short"
        >
          <Suspense
            fallback={
              <div style={{ padding: "24px" }}>Loading peak details...</div>
            }
          >
            <PeakDetailsMap
              peakId={selectedPeakId}
              onClose={onClosePeak}
            />
          </Suspense>
        </SimpleSheet>
      )}

      {!isExpanded && (
        <button
          className={styles["world-challenge__expand-btn"]}
          onClick={onExpand}
          aria-label={t("leaderboard.shortExpand")}
        >
          <Expand size={18} />
          <span className="typography-label-medium">{t("leaderboard.shortExpand")}</span>
        </button>
      )}
    </div>
  );
};

// =================================================================
// USER MODAL COMPONENT
// =================================================================

interface UserModalProps {
  isOpen: boolean;
  peak: CommunityPeak | null;
  onClose: () => void;
  onUserClick: (userId: number) => void;
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  peak,
  onClose,
  onUserClick,
}) => {
  const { t } = useI18n();

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      ariaLabel={t("leaderboard.climbedBy")}
      contentClassName={styles["world-challenge__modal-content"]}
    >
      <div className={styles["world-challenge__modal-header"]}>
        <h3 className="typography-title-medium">
          {t("leaderboard.climbedBy")} {peak?.name_en || peak?.name || ""}
        </h3>
        <button className={styles["world-challenge__modal-close"]} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className={styles["world-challenge__modal-body"]}>
        <div className={styles["world-challenge__modal-stats"]}>
          <div className={styles["world-challenge__modal-stat"]}>
            <span className={`${styles["world-challenge__modal-stat-value"]} typography-headline-small`}>
              {peak?.unique_users || 0}
            </span>
            <span className="typography-label-medium">{t("communityInfo.uniqueUsers")}</span>
          </div>
          <div className={styles["world-challenge__modal-stat"]}>
            <span className={`${styles["world-challenge__modal-stat-value"]} typography-headline-small`}>
              {peak ? getTotalAscensions(peak) : 0}
            </span>
            <span className="typography-label-medium">{t("communityInfo.totalCompletions")}</span>
          </div>
        </div>
        <div className={styles["world-challenge__modal-user-list"]}>
          {peak?.users?.map((user: User, index: number) => (
            <div
              key={`${user.id}-${index}`}
              className={styles["world-challenge__modal-user-item"]}
              onClick={() => onUserClick(user.id)}
            >
              <img
                className={styles["world-challenge__modal-user-avatar"]}
                src={user.image || "/placeholder.svg"}
                alt={user.name}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className={styles["world-challenge__modal-user-info"]}>
                <span className="typography-title-medium">{user.name}</span>
                <span className="typography-label-large">
                  <img src={getElevationIcon(peak?.elevation || 0)} alt="" style={{ width: 12, height: 12 }} />
                  {user.completion_count}{" "}
                  {user.completion_count === 1
                    ? t("communityInfo.timeSingle")
                    : t("communityInfo.timePlural")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppModal>
  );
};

// =================================================================
// SKELETON COMPONENTS
// =================================================================

const PeakItemSkeleton = () => (
  <div className={styles["world-challenge__skeleton-peak-item"]}>
    <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-peak-image"]}`} />
    <div className={styles["world-challenge__skeleton-peak-info"]}>
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-peak-name"]}`} />
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-peak-meta"]}`} />
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-peak-footer"]}`} />
    </div>
  </div>
);

const UserItemSkeleton = () => (
  <div className={styles["world-challenge__skeleton-user-item"]}>
    <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-user-rank"]}`} />
    <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton--circle"]} ${styles["world-challenge__skeleton-user-avatar"]}`} />
    <div className={styles["world-challenge__skeleton-user-info"]}>
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-user-name"]}`} />
      <div className={styles["world-challenge__skeleton-user-stats"]}>
        <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-user-stat"]}`} />
        <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-user-stat"]}`} />
      </div>
    </div>
  </div>
);

// =================================================================
// LIST ITEM COMPONENT
// =================================================================

interface ListItemProps {
  peak: CommunityPeak;
  index: number;
  onUserClick?: (peak: CommunityPeak) => void;
  onPeakClick?: (peak: CommunityPeak) => void;
  onUserNavigation?: (userId: number) => void;
  selectedFiltersCount: number;
}

const ListItem: React.FC<ListItemProps> = ({
  peak,
  index,
  onUserClick,
  onPeakClick,
  onUserNavigation,
  selectedFiltersCount,
}) => {
  const { t } = useI18n();
  const { formatMeters } = useUnitFormat();

  const coverImage = (peak as CommunityPeak & { image?: string }).image || peak.image_url;
  const hasImage = Boolean(coverImage);
  const firstUser = peak.users?.[0];

  // Prune admin hierarchy based on selected filters
  const getPrunedHierarchy = (hierarchy?: AdminHierarchy | null) => {
    if (!hierarchy || selectedFiltersCount <= 0) return hierarchy;

    // Sort by level (2, 4, 6...)
    const sortedEntries = Object.entries(hierarchy).sort(
      ([a], [b]) => Number(a) - Number(b)
    );

    // Skip the first N entries (where N is the number of selected filters)
    const prunedEntries = sortedEntries.slice(selectedFiltersCount);

    return Object.fromEntries(prunedEntries);
  };

  return (
    <div className={styles["world-challenge__list-item"]} onClick={() => onPeakClick?.(peak)}>
      <div className={styles["world-challenge__list-image-container"]}>
        {hasImage ? (
          <img
            className={styles["world-challenge__list-image"]}
            src={coverImage || "/placeholder.svg"}
            alt={peak.name}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className={styles["world-challenge__list-placeholder-bg-new"]} aria-hidden="true">
            <img src={getElevationIcon(peak.elevation)} alt="Elevation icon" style={{ width: 40, height: 40, opacity: 0.7 }} />
          </div>
        )}
        <div className={`${styles["world-challenge__list-rank-badge"]} typography-label-medium`}>
          {index + 1}
        </div>
      </div>

      <div className={styles["world-challenge__list-info"]}>
        <div className={styles["world-challenge__list-top-row"]}>
          <div className={`${styles["world-challenge__list-name"]} typography-title-medium`}>
            {peak.name_en || peak.name}
          </div>
          <div className={styles["world-challenge__list-elevation-row"]}>
            <img src={getElevationIcon(peak.elevation)} alt="Elevation icon" style={{ width: 16, height: 16 }} />
            <span className="typography-label-large">{formatMeters(peak.elevation)}</span>
          </div>
        </div>

        <div className={styles["world-challenge__list-stats-row"]}>
          <div className={`${styles["world-challenge__list-location-label"]} typography-body-small`}>
            {getLocationFromHierarchy(getPrunedHierarchy(peak.admin_hierarchy))}
          </div>
        </div>

        <div className={styles["world-challenge__list-footer-row"]}>
          {firstUser ? (
            <div className={styles["world-challenge__list-users"]}>
              <div
                className={styles["world-challenge__list-user-chip"]}
                onClick={(e) => { e.stopPropagation(); onUserNavigation?.(firstUser.id); }}
              >
                <img
                  className={styles["world-challenge__list-user-avatar"]}
                  src={firstUser.image || "/placeholder.svg"}
                  alt={firstUser.name}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="typography-label-large">{firstUser.name}</span>
              </div>
              {peak.users!.length > 1 && (
                <button
                  className={`${styles["world-challenge__list-more-btn"]} typography-label-medium`}
                  onClick={(e) => { e.stopPropagation(); onUserClick?.(peak); }}
                >
                  +{peak.unique_users - 1} {t("leaderboard.more")}
                </button>
              )}
            </div>
          ) : (
            <span className="typography-label-medium" style={{ opacity: 0.6 }}>
              {t("leaderboard.notAvailable")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// =================================================================
// LEADERBOARD SECTION COMPONENT
// =================================================================

interface LeaderboardSectionProps {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  peaks: CommunityPeak[];
  users: CommunityUserStats[];
  isLoadingPeaks: boolean;
  isLoadingUsers: boolean;
  hasMorePeaks: boolean;
  hasMoreUsers: boolean;
  loadingMore: boolean;
  onLoadMorePeaks: () => void;
  onLoadMoreUsers: () => void;
  onPeakClick: (peak: CommunityPeak) => void;
  onUserClick: (peak: CommunityPeak) => void;
  onUserNavigation: (userId: number) => void;
  appliedAdminOsmIds: number[] | undefined;
  selectedFiltersCount: number;
  showOnlyMyUser: boolean;
}

const LeaderboardSection: React.FC<LeaderboardSectionProps> = ({
  sortMode,
  onSortChange,
  peaks,
  users,
  isLoadingPeaks,
  isLoadingUsers,
  hasMorePeaks,
  hasMoreUsers,
  loadingMore,
  onLoadMorePeaks,
  onLoadMoreUsers,
  onPeakClick,
  onUserClick,
  onUserNavigation,
  appliedAdminOsmIds,
  selectedFiltersCount,
  showOnlyMyUser,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const observerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore && !showOnlyMyUser) {
          if (sortMode === "highest" && hasMorePeaks) onLoadMorePeaks();
          else if (sortMode === "contributors" && hasMoreUsers) onLoadMoreUsers();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [sortMode, hasMorePeaks, hasMoreUsers, loadingMore, showOnlyMyUser, onLoadMorePeaks, onLoadMoreUsers]);

  const isLoading = sortMode === "highest" ? isLoadingPeaks : isLoadingUsers;

  // Auth user stats for sticky row
  const { user: authUser } = useAuth();
  const [authUserStats, setAuthUserStats] = useState<UserStatsResponse | null>(null);

  useEffect(() => {
    if (!authUser) return;
    getUserStats(undefined, appliedAdminOsmIds)
      .then(setAuthUserStats)
      .catch((err) => console.error("Failed to fetch auth user stats", err));
  }, [authUser, appliedAdminOsmIds]);

  const renderSortToggle = () => (
    <div className={styles["world-challenge__leaderboard-header"]}>
      <div className={styles["world-challenge__sort-toggle"]}>
        {(["highest", "contributors"] as const).map((mode) => (
          <button
            key={mode}
            className={`${styles["world-challenge__sort-btn"]} ${
              sortMode === mode ? styles["world-challenge__sort-btn--active"] : ""
            }`}
            onClick={() => {
              trackEvent("button_click", `world_challenge_sort_${mode}`);
              onSortChange(mode);
            }}
          >
            {mode === "highest" ? <Trophy size={14} /> : <Users size={14} />}
            <span className="typography-label-medium">
              {t(mode === "highest" ? "leaderboard.sortByHighest" : "leaderboard.sortByContributors")}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderUsersListHeader = () => (
    <div className={`${styles["world-challenge__list-header"]} typography-label-medium uppercase`}>
      <div className={styles["world-challenge__header-rank"]}><strong>{t("leaderboard.rank")}</strong></div>
      <div className={styles["world-challenge__header-user"]}>{t("leaderboard.user")}</div>
      <div className={styles["world-challenge__header-stat"]}>{t("leaderboard.peaks")}</div>
      <div className={styles["world-challenge__header-stat"]}>{t("leaderboard.routes")}</div>
    </div>
  );

  const renderContributorItem = (user: CommunityUserStats, index: number) => {
    let rankClass = "";
    if (index === 0) rankClass = styles["world-challenge__rank-badge--top-1"] || "";
    else if (index === 1) rankClass = styles["world-challenge__rank-badge--top-2"] || "";
    else if (index === 2) rankClass = styles["world-challenge__rank-badge--top-3"] || "";

    return (
      <div
        key={user.user_id}
        className={styles["world-challenge__contributor-item"]}
        onClick={() => onUserNavigation(user.user_id)}
      >
        <div className={`${styles["world-challenge__rank-badge"]} ${rankClass} typography-title-medium`}>
          {index < 3 ? <Trophy size={18} /> : index + 1}
        </div>
        <img
          src={user.user_image || "/placeholder.svg"}
          alt={user.user_name}
          className={styles["world-challenge__contributor-avatar"]}
        />
        <div className={styles["world-challenge__contributor-content"]}>
          <div className={styles["world-challenge__contributor-name-container"]}>
            <span className={`${styles["world-challenge__contributor-name"]} typography-title-small`}>
              {user.user_name}
            </span>
          </div>
          <div className={styles["world-challenge__contributor-stats-container"]}>
            <span className={`${styles["world-challenge__contributor-stat"]} typography-title-medium`}>
              {user.regional_peaks ?? user.total_peaks}
            </span>
            <span className={`${styles["world-challenge__contributor-stat"]} typography-title-medium`}>
              {user.total_routes}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles["world-challenge__leaderboard"]}>
      {renderSortToggle()}

      {isLoading ? (
        sortMode === "highest" ? (
          <div className={styles["world-challenge__peaks-list"]}>
            {Array.from({ length: 5 }, (_, i) => <PeakItemSkeleton key={i} />)}
          </div>
        ) : (
          <div className={styles["world-challenge__users-list-wrapper"]}>
            {renderUsersListHeader()}
            <div className={styles["world-challenge__users-list"]}>
              {Array.from({ length: 8 }, (_, i) => <UserItemSkeleton key={i} />)}
            </div>
          </div>
        )
      ) : sortMode === "highest" ? (
        <div className={styles["world-challenge__peaks-list"]}>
          {peaks.map((peak, index) => (
            <ListItem
              key={peak.id}
              peak={peak}
              index={index}
              onUserClick={onUserClick}
              onPeakClick={onPeakClick}
              onUserNavigation={onUserNavigation}
              selectedFiltersCount={selectedFiltersCount}
            />
          ))}
        </div>
      ) : (
        <div className={styles["world-challenge__users-list-wrapper"]}>
          {renderUsersListHeader()}

          {authUserStats && !isLoadingUsers && (
            <div className={`${styles["world-challenge__sticky-user"]} ${styles["world-challenge__auth-user-item"]}`}>
              <div
                className={styles["world-challenge__contributor-item"]}
                onClick={() => onUserNavigation(authUserStats.user_id)}
                style={{ borderBottom: 'none', background: 'transparent' }}
              >
                <div className={`${styles["world-challenge__rank-badge"]} typography-label-large`}>
                  {authUserStats.rank}
                </div>
                <img
                  className={styles["world-challenge__contributor-avatar"]}
                  src={authUserStats.user_image || "/placeholder.svg"}
                  alt={authUserStats.user_name || "Me"}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className={styles["world-challenge__contributor-content"]}>
                  <div className={styles["world-challenge__contributor-name-container"]}>
                    <span className={`${styles["world-challenge__contributor-name"]} typography-title-medium`}>
                      {authUserStats.user_name || "Me"}
                    </span>
                  </div>
                  <div className={styles["world-challenge__contributor-stats-container"]}>
                    <div className={styles["world-challenge__contributor-stat"]}>
                      <div className="typography-title-medium">{authUserStats.totals.global.total_peaks}</div>
                    </div>
                  </div>
                  <div className={styles["world-challenge__contributor-stats-container"]}>
                    <div className={styles["world-challenge__contributor-stat"]}>
                      <div className="typography-title-medium">{authUserStats.totals.global.total_routes}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={styles["world-challenge__users-list"]}>
            {users.map((user, index) => renderContributorItem(user, index))}
          </div>
        </div>
      )}

      <div ref={observerRef} className={styles["world-challenge__load-more"]}>
        {loadingMore && <div className={styles["world-challenge__loading-spinner"]}></div>}
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

export default function WorldChallenge({ isActive }: { isActive?: boolean }) {
  const { t } = useI18n();
  const { user } = useAuth();
  
  console.log("[DEBUG-WORLDCHALLENGE] render! isActive:", isActive);
  
  useEffect(() => {
    console.log("[DEBUG-WORLDCHALLENGE] MOUNTED.");
    return () => console.log("[DEBUG-WORLDCHALLENGE] UNMOUNTED.");
  }, []);

  const data = useWorldChallengeData("world_challenge", true, true);

  // Render admin search filter
  const renderAdminFilters = () => (
    <div className={styles["world-challenge__filters"]}>
      <div className={styles["world-challenge__filter-row"]}>
        <div
          className={`${styles["world-challenge__filter-selector"]} ${styles["world-challenge__filter-selector--full"]}`}
        >
          <WorldChallengeAdminSearch
            key={`world-challenge-filter-admin-${data.appliedAdminName ?? "none"}`}
            selectedName={data.appliedAdminName}
            placeholder={t("leaderboard.searchLocationPlaceholder")}
            emptyText={(query) => t("leaderboard.noLocationsFound", { query })}
            ariaLabel={t("leaderboard.locationSearchLabel")}
            onSelect={data.selectAdminSearchResult}
            onClear={data.clearAdminSelection}
          />
        </div>
      </div>
      
    
    </div>

  );

  return (
    <div className={styles["world-challenge"]}>
      <StatsChart
        totalWorldPeaks={data.stats.totalWorldPeaks}
        communityCompleted={data.stats.communityCompleted}
        userCompleted={data.stats.userCompleted}
        isLoading={data.statsLoading}
      />

      <div className={styles["world-challenge__description"]}>
        <p className="typography-body-small">{t("leaderboard.description")}</p>
      </div>

      {renderAdminFilters()}
        {user && (
        <div className={styles["world-challenge__auth-toggle-container"]}>
          <div className={styles["world-challenge__auth-tabs"]}>
            <button
              className={`${styles["world-challenge__auth-tab"]} ${!data.showOnlyMyUser ? styles["world-challenge__auth-tab--active"] : ""}`}
              onClick={() => data.showOnlyMyUser && data.toggleShowOnlyMyUser()}
            >
              <span className="typography-label-large">{t("leaderboard.community")}</span>
            </button>
            <button
              className={`${styles["world-challenge__auth-tab"]} ${data.showOnlyMyUser ? styles["world-challenge__auth-tab--active"] : ""}`}
              onClick={() => !data.showOnlyMyUser && data.toggleShowOnlyMyUser()}
            >
              <span className="typography-label-large">{t("leaderboard.you")}</span>
            </button>
          </div>
        </div>
      )}

      <MapSection
        geojson={data.worldPeaksData}
        regionBoundaries={data.regionBoundaries}
        isLoading={data.statsLoading}
        isExpanded={data.isMapExpanded}
        onExpand={data.handleExpandMap}
        isActive={isActive}
        appliedAdminOsmIds={data.appliedAdminOsmIds}
        appliedAdminName={data.appliedAdminName}
        onAdminSearchSelect={data.selectAdminSearchResult}
        onAdminSearchClear={data.clearAdminSelection}
        stats={data.stats}
        selectedPeakId={data.selectedPeakId}
        selectedPeakData={data.selectedPeakData}
        onSelectPeak={(peak, _coords) => {
          data.setSelectedPeakId(peak.id);
          data.setSelectedPeakData(peak);
        }}
        onClosePeak={() => {
          data.setSelectedPeakId(null);
          data.setSelectedPeakData(null);
        }}
      />

      <LeaderboardSection
        sortMode={data.sortMode}
        onSortChange={data.handleSortChange}
        peaks={data.peaks}
        users={data.users}
        isLoadingPeaks={data.peaksLoading}
        isLoadingUsers={data.usersLoading}
        hasMorePeaks={data.hasMorePeaks}
        hasMoreUsers={data.hasMoreUsers}
        loadingMore={data.peaksLoadingMore || data.usersLoadingMore}
        onLoadMorePeaks={data.loadMorePeaks}
        onLoadMoreUsers={data.loadMoreUsers}
        onPeakClick={data.handlePeakClick}
        onUserClick={data.handleUserClick}
        onUserNavigation={data.handleUserNavigation}
        appliedAdminOsmIds={data.appliedAdminOsmIds}
        selectedFiltersCount={data.adminLevels.filter((l) => l.selectedId !== null).length}
        showOnlyMyUser={data.showOnlyMyUser}
      />

      <UserModal
        isOpen={data.showUserPopup}
        peak={data.selectedPeak}
        onClose={data.closeUserPopup}
        onUserClick={data.handleUserNavigation}
      />
    </div>
  );
}
