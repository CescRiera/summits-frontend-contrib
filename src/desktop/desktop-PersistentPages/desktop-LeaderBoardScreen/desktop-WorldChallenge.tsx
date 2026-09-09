"use client";

import type React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { X, Trophy, Expand, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense, lazy } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import AppModal from "../../../shared/components/AppModal";
import styles from "./desktop-WorldChallenge.module.css";
import mapControlsStyles from "../../desktop-components/desktop-MapControls/desktop-MapControls.module.css";
import WorldChallengeAdminSearch from "../../../shared/components/WorldChallengeAdminSearch/WorldChallengeAdminSearch";
import { getUserStats } from "../../../shared/api/endpoints/user";
import { PEAK_ICONS, MAPBOX_ACCESS_TOKEN } from "../../desktop-components/desktop-Map/desktop-MapUtils";
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
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import { getElevationColor, getElevationIcon, getTotalAscensions } from "../../../shared/constants/elevationColors";
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
  useWorldChallengeData,
  type SortMode,
} from "../../../shared/hooks/useWorldChallengeData";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen";

const PeakDetailsMap = lazy(async () => {
  console.log("[Chunk] desktop-PeakDetailsMap (WorldChallenge) import start");
  const mod = await import("../../desktop-components/desktop-Map/desktop-PeakDetailsMap/desktop-PeakDetailsMap.tsx");
  console.log("[Chunk] desktop-PeakDetailsMap (WorldChallenge) import done");
  return mod;
});

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
        <span className={`${styles["world-challenge__stat-label"]} typography-desktop-label-large`}>
          {t("leaderboard.shortTotal")}
        </span>
        <span className="typography-desktop-title-large">{fmt(totalWorldPeaks)}</span>
      </div>
      <div className={styles["world-challenge__stat-divider"]} />
      <div className={styles["world-challenge__stat-card"]}>
        <span className={`${styles["world-challenge__stat-label"]} typography-desktop-label-large`}>
          {t("leaderboard.shortCommunity")}
        </span>
        <span className={`${styles["world-challenge__stat-value"]} ${styles["world-challenge__stat-value--community"]} typography-desktop-title-large`}>
          {fmt(communityCompleted)}
        </span>
      </div>
      <div className={styles["world-challenge__stat-divider"]} />
      <div className={styles["world-challenge__stat-card"]}>
        <span className={`${styles["world-challenge__stat-label"]} typography-desktop-label-large`}>
          {t("leaderboard.shortMe")}
        </span>
        <span className={`${styles["world-challenge__stat-value"]} ${styles["world-challenge__stat-value--me"]} typography-desktop-title-large`}>
          {fmt(userCompleted)}
        </span>
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
  showOnlyMyUser?: boolean;
  onToggleShowOnlyMyUser?: () => void;
  user?: any;
  selectedPeakId: number | null;
  selectedPeakData: CommunityPeak | null;
  onSelectPeak: (peak: CommunityPeak, coords: [number, number]) => void;
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
  showOnlyMyUser,
  onToggleShowOnlyMyUser,
  user,
  selectedPeakId,
  selectedPeakData,
  onSelectPeak,
  onClosePeak,
}) => {
  const { t } = useI18n();
  const { formatMeters } = useUnitFormat();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const isMounted = useRef(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  
  console.log("[MapSection] Render - isActive:", isActive, "isExpanded:", isExpanded, "isMapLoaded:", isMapLoaded, "AdminIDs:", appliedAdminOsmIds);

  // Lifecycle
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ResizeObserver
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => mapRef.current?.resize());
    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Resize on expand/collapse
  useEffect(() => {
    if (!mapRef.current) return;
    const delays = [0, 150, 300, 500];
    const timers = delays.map((d) =>
      setTimeout(() => mapRef.current?.resize(), d)
    );
    return () => timers.forEach(clearTimeout);
  }, [isExpanded]);

  // Resize on tab activation
  useEffect(() => {
    if (isActive && mapRef.current) {
      setTimeout(() => mapRef.current?.resize(), 50);
    }
  }, [isActive]);

  // Body scroll lock when expanded
  useEffect(() => {
    document.body.style.overflow = isExpanded ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isExpanded]);

  // Update GeoJSON & tile filters
  useEffect(() => {
    const map = mapRef.current;
    // Use isMapLoaded state instead of map.isStyleLoaded() — the latter can transiently
    // return false after source updates, blocking all subsequent map operations.
    if (!map || !isMapLoaded || !geojson) {
      console.log("[MapSection] Skip Update - Map ready?", !!map, "isMapLoaded?", isMapLoaded, "GeoJSON?", !!geojson);
      return;
    }

    console.log("[MapSection] Applying GeoJSON update and filters...");
    const source = map.getSource("world-peaks") as mapboxgl.GeoJSONSource;
    if (source) source.setData(geojson);

    // Update boundaries
    updateMapBoundaries(map, regionBoundaries);

    const idsToExclude = extractPeakIds(geojson);
    const filter = buildTileFilter(idsToExclude, appliedAdminOsmIds, appliedAdminName);
    applyTileLayerFilter(map, filter);

    if (appliedAdminOsmIds?.length) {
      console.log("[MapSection] Fitting to bounds for IDs:", appliedAdminOsmIds);
      // Short delay ensures Mapbox GL has processed any setData() or filter calls
      setTimeout(() => {
        if (mapRef.current && isMounted.current) {
          fitMapToBounds(mapRef.current, geojson, regionBoundaries);
        }
      }, 100);
    }
  }, [geojson, regionBoundaries, appliedAdminOsmIds, appliedAdminName, isMapLoaded]);

  // Handle peak selection
  const handlePeakClickInternal = useCallback(
    (peak: CommunityPeak, coordinates: [number, number]) => {
      const map = mapRef.current;
      if (!map) return;

      // Fly to the marker — offset right when expanded so peak isn't behind the detail panel
      map.flyTo({
        center: coordinates,
        zoom: 12,
        duration: 1500,
        essential: true,
        ...(isExpanded && { padding: { top: 0, bottom: 0, left: 0, right: 420 } }),
      });

      // Call parent selection handler
      onSelectPeak(peak, coordinates);
    },
    [onSelectPeak, isExpanded]
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
      ...(isExpanded && { padding: { top: 0, bottom: 0, left: 0, right: 420 } }),
    });
  }, [selectedPeakData, isMapLoaded, isExpanded]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let map: mapboxgl.Map | null = null;

    try {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/satellite-v9",
        center: [2.0, 42.0],
        zoom: 2,
        minZoom: 1,
        maxPitch: 60,
        attributionControl: false,
        projection: "mercator",
      });
      map.scrollZoom.setWheelZoomRate(1 / 450);
    } catch (e) {
      console.error("Failed to initialize map:", e);
      return;
    }

    mapRef.current = map;

    map.on("load", async () => {
      if (!map || !isMounted.current) return;

      console.log("[MapSection] Map 'load' event fired. Initializing layers...");
      const exclusionFilter = buildExclusionFilter(extractPeakIds(geojson));
      await initializeWorldChallengeLayers(
        map, geojson, PEAK_ICONS, loadMapImage,
        () => isMounted.current, exclusionFilter
      );

      if (!isMounted.current) return;
      console.log("[MapSection] Layers initialized. Setting isMapLoaded = true");
      setIsMapLoaded(true);
    });

    registerMapClickHandlers(map, mapRef, isMounted, handlePeakClickInternal);

    return () => {
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
        <>
        <div className={styles["world-challenge__map-header"]}>
          <div className={`${styles["world-challenge__map-header-row"]} ${styles["world-challenge__map-header-row--top"]}`}>
            {user && (
              <div className={`${styles["world-challenge__auth-tabs"]} ${styles["world-challenge__auth-tabs--overlay"]}`}>
                <button
                  className={`${styles["world-challenge__auth-tab"]} ${!showOnlyMyUser ? styles["world-challenge__auth-tab--active"] : ""}`}
                  onClick={() => showOnlyMyUser && onToggleShowOnlyMyUser?.()}
                >
                  <span className="typography-desktop-label-medium">{t("leaderboard.community")}</span>
                </button>
                <button
                  className={`${styles["world-challenge__auth-tab"]} ${showOnlyMyUser ? styles["world-challenge__auth-tab--active"] : ""}`}
                  onClick={() => !showOnlyMyUser && onToggleShowOnlyMyUser?.()}
                >
                  <span className="typography-desktop-label-medium">{t("leaderboard.you")}</span>
                </button>
              </div>
            )}
            <div className={`${styles["world-challenge__map-expanded-stats"]} ${styles["world-challenge__map-expanded-stats--compact"]}`}>
              <div className={styles["world-challenge__map-expanded-stat"]}>
                <span className="typography-desktop-label-medium">{t("leaderboard.shortTotal")}</span>
                <span className="typography-desktop-title-medium">{stats.totalWorldPeaks.toLocaleString()}</span>
              </div>
              <div className={styles["world-challenge__map-expanded-stat"]}>
                <span className="typography-desktop-label-medium">{t("leaderboard.shortCommunity")}</span>
                <span className={`${styles["world-challenge__map-expanded-stat-value--community"]} typography-desktop-title-medium`}>
                  {stats.communityCompleted.toLocaleString()}
                </span>
              </div>
              <div className={styles["world-challenge__map-expanded-stat"]}>
                <span className="typography-desktop-label-medium">{t("leaderboard.shortMe")}</span>
                <span className={`${styles["world-challenge__map-expanded-stat-value--me"]} typography-desktop-title-medium`}>
                  {stats.userCompleted.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className={styles["world-challenge__map-header-row"]}>
            <div className={styles["world-challenge__map-filters"]}>
              <WorldChallengeAdminSearch
                key={`desktop-world-challenge-map-admin-${appliedAdminName ?? "none"}`}
                selectedName={appliedAdminName}
                placeholder={t("leaderboard.searchLocationPlaceholder")}
                emptyText={(query) => t("leaderboard.noLocationsFound", { query })}
                ariaLabel={t("leaderboard.locationSearchLabel")}
                onSelect={onAdminSearchSelect}
                onClear={onAdminSearchClear}
              />
            </div>
          </div>
        </div>

        <button
          className={`${styles["world-challenge__expand-btn"]} ${styles["world-challenge__expand-btn--close"]}`}
          onClick={onExpand}
          aria-label={t("leaderboard.shortMinimize")}
        >
          <X size={24} />
        </button>
        </>
      )}
      {isLoading && (
        <div
          className={styles["world-challenge__map-loading"]}
          style={mapRef.current ? {
            position: "absolute",
            top: 0,
            left: 0,
            zIndex: 10,
            background: "rgba(255,255,255,0.28)",
            backdropFilter: "blur(2px)",
          } : {}}
        >
          <div className={styles["world-challenge__loading-spinner"]}></div>
        </div>
      )}
      <div ref={mapContainerRef} className={styles["world-challenge__map-container"]} />
      
      {/* Peak Details Overlay - Replicated from desktop-MapControls logic */}
      <AnimatePresence mode="wait">
        {isExpanded && selectedPeakId && (
          <motion.div
            key={selectedPeakId}
            className={styles["world-challenge__peak-details"]}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            {selectedPeakData && (
              <div className={mapControlsStyles["map-controls__peak-details-header"]}>
                <div className={mapControlsStyles["map-controls__peak-info"]}>
                  <div className={mapControlsStyles["map-controls__peak-names"]}>
                    <div className={mapControlsStyles["map-controls__peak-name-row"]}>
                      <h1 className={mapControlsStyles["map-controls__peak-name"]}>
                        {selectedPeakData.name || selectedPeakData.name_en}
                      </h1>
                      <div className={mapControlsStyles["map-controls__elevation-info"]}>
                        <img
                          src={getElevationIcon(selectedPeakData.elevation)}
                          alt="Elevation icon"
                          className={mapControlsStyles["map-controls__elevation-icon"]}
                        />
                        <span
                          className={mapControlsStyles["map-controls__elevation-value"]}
                          style={{ color: getElevationColor(selectedPeakData.elevation) }}
                        >
                          {formatMeters(selectedPeakData.elevation)}
                        </span>
                      </div>
                    </div>
                    {selectedPeakData.name_en &&
                      selectedPeakData.name !== selectedPeakData.name_en && (
                        <span className={mapControlsStyles["map-controls__peak-name-en"]}>
                          {selectedPeakData.name_en}
                        </span>
                      )}
                  </div>
                </div>
                <button
                  className={mapControlsStyles["map-controls__peak-details-close"]}
                  onClick={onClosePeak}
                  aria-label="Close peak details"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className={styles["world-challenge__peak-details-content"]}>
              <Suspense fallback={<LoadingScreen />}>
                <PeakDetailsMap
                  peakId={selectedPeakId}
                  onClose={onClosePeak}
                />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isExpanded && (
        <button
          className={styles["world-challenge__expand-btn"]}
          onClick={onExpand}
          aria-label={t("leaderboard.shortExpand")}
        >
          <Expand size={20} />
          <span className="typography-desktop-button-small">{t("leaderboard.shortExpand")}</span>
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
  if (!peak) return null;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      ariaLabel={t("leaderboard.climbedBy")}
      contentClassName={styles["world-challenge__modal-content"]}
    >
      <div className={styles["world-challenge__modal-header"]}>
        <h3 className="typography-desktop-title-medium">
          {t("leaderboard.climbedBy")} {peak.name_en || peak.name}
        </h3>
        <button className={styles["world-challenge__modal-close"]} onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <div className={styles["world-challenge__modal-body"]}>
        <div className={styles["world-challenge__modal-stats"]}>
          <div className={styles["world-challenge__modal-stat"]}>
            <span className={`${styles["world-challenge__modal-stat-value"]} typography-desktop-display-small`}>
              {peak.unique_users}
            </span>
            <span className="typography-desktop-label-medium">{t("communityInfo.uniqueUsers")}</span>
          </div>
          <div className={styles["world-challenge__modal-stat"]}>
            <span className={`${styles["world-challenge__modal-stat-value"]} typography-desktop-display-small`}>
              {getTotalAscensions(peak)}
            </span>
            <span className="typography-desktop-label-medium">{t("communityInfo.totalCompletions")}</span>
          </div>
        </div>
        <div className={styles["world-challenge__modal-user-list"]}>
          {peak.users?.map((user: User, index: number) => (
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
                <span className="typography-desktop-title-medium">{user.name}</span>
                <span className="typography-desktop-label-small">
                  <img src={getElevationIcon(peak.elevation)} alt="" style={{ width: 14, height: 14 }} />
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
// SKELETON COMPONENT
// =================================================================

const TableRowSkeleton = ({ isUser = false }: { isUser?: boolean }) => (
  <div className={styles["world-challenge__skeleton-row"]}>
    <div className={`${styles["world-challenge__skeleton-cell"]} ${styles["world-challenge__skeleton-cell--rank"]}`}>
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-rank-circle"]} ${styles["world-challenge__skeleton--circle"]}`} />
    </div>
    <div className={`${styles["world-challenge__skeleton-cell"]} ${styles["world-challenge__skeleton-cell--main"]}`}>
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-image"]} ${isUser ? styles["world-challenge__skeleton--circle"] : ""}`} />
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-text"]}`} />
    </div>
    <div className={`${styles["world-challenge__skeleton-cell"]} ${styles["world-challenge__skeleton-cell--stat"]}`}>
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-stat-text"]}`} />
    </div>
    <div className={`${styles["world-challenge__skeleton-cell"]} ${styles["world-challenge__skeleton-cell--stat"]}`}>
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-stat-text"]}`} />
    </div>
    <div className={`${styles["world-challenge__skeleton-cell"]} ${styles["world-challenge__skeleton-cell--stat"]}`}>
      <div className={`${styles["world-challenge__skeleton"]} ${styles["world-challenge__skeleton-stat-text"]}`} />
    </div>
  </div>
);

// =================================================================
// TABLE ROW – PEAKS
// =================================================================

interface TableRowProps {
  peak: CommunityPeak;
  index: number;
  onUserClick?: (peak: CommunityPeak) => void;
  onPeakClick?: (peak: CommunityPeak) => void;
  onUserNavigation?: (userId: number) => void;
  selectedFiltersCount: number;
  showOnlyMyUser?: boolean | undefined;
}

const TableRow: React.FC<TableRowProps> = ({
  peak,
  index,
  onUserClick,
  onPeakClick,
  onUserNavigation,
  selectedFiltersCount,
  showOnlyMyUser,
}) => {
  const { t } = useI18n();
  const { formatMeters } = useUnitFormat();
  const { user: authUser } = useAuth();
  const coverImage = (peak as CommunityPeak & { image?: string }).image || peak.image_url;
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
    <div className={styles["world-challenge__table-row"]} onClick={() => onPeakClick?.(peak)}>
      <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--rank"]}`}>
        {index + 1}
      </div>
      <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--peak"]}`}>
        <img
          className={styles["world-challenge__table-cell-image"]}
          src={coverImage || getElevationIcon(peak.elevation)}
          alt={peak.name}
          onError={(e) => { (e.target as HTMLImageElement).src = getElevationIcon(peak.elevation); }}
        />
        <div className={styles["world-challenge__table-cell-info"]}>
          <div className={`${styles["world-challenge__table-cell-name"]} typography-desktop-title-small`}>
            {peak.name_en || peak.name}
          </div>
          <div className={`${styles["world-challenge__table-cell-location"]} typography-desktop-label-small`}>
            {getLocationFromHierarchy(getPrunedHierarchy(peak.admin_hierarchy))}
          </div>
        </div>
      </div>
      <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--stat"]} typography-desktop-body-medium`}>
        {formatMeters(peak.elevation)}
      </div>
      <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--stat"]} typography-desktop-body-medium`}>
        {peak.unique_users || 0}
      </div>
      <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--climbers"]}`}>
        {showOnlyMyUser && authUser ? (
          <div
            className={styles["world-challenge__table-cell-climber"]}
            onClick={(e) => { e.stopPropagation(); onUserNavigation?.(authUser.internalUserId!); }}
          >
            <span className={`${styles["world-challenge__table-cell-climber-name"]} typography-desktop-label-medium`}>
              {t("leaderboard.you")}
            </span>
          </div>
        ) : firstUser ? (
          <>
            <div
              className={styles["world-challenge__table-cell-climber"]}
              onClick={(e) => { e.stopPropagation(); onUserNavigation?.(firstUser.id); }}
            >
              <img
                className={styles["world-challenge__table-cell-climber-avatar"]}
                src={firstUser.image || "/placeholder.svg"}
                alt={firstUser.name || t("leaderboard.user")}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className={`${styles["world-challenge__table-cell-climber-name"]} typography-desktop-label-medium`}>
                {firstUser.name || t("leaderboard.user")}
              </span>
            </div>
            {peak.users!.length > 1 && (
              <button
                className={styles["world-challenge__table-cell-more-btn"]}
                onClick={(e) => { e.stopPropagation(); onUserClick?.(peak); }}
              >
                +{peak.unique_users - 1} {t("leaderboard.more")}
              </button>
            )}
          </>
        ) : (
          t("leaderboard.notAvailable")
        )}
      </div>
    </div>
  );
};

// =================================================================
// TABLE ROW – USERS
// =================================================================

interface UserTableRowProps {
  user: CommunityUserStats;
  index: number;
  onUserNavigation?: (userId: number) => void;
}

const UserTableRow: React.FC<UserTableRowProps> = ({ user, index, onUserNavigation }) => (
  <div className={styles["world-challenge__table-row"]} onClick={() => onUserNavigation?.(user.user_id)}>
    <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--rank"]}`}>
      {index < 3 ? (
        <Trophy size={24} color={index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : "#CD7F32"} />
      ) : (
        index + 1
      )}
    </div>
    <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--peak"]}`}>
      <img
        className={styles["world-challenge__table-cell-image"]}
        src={user.user_image || "/placeholder.svg"}
        alt={user.user_name}
        style={{ borderRadius: "50%" }}
      />
      <div className={styles["world-challenge__table-cell-info"]}>
        <div className={`${styles["world-challenge__table-cell-name"]} typography-desktop-label-large`}>
          {user.user_name}
        </div>
      </div>
    </div>
    <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--stat"]} typography-desktop-body-medium`}>
      {user.regional_peaks ?? user.total_peaks}
    </div>
    <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--stat"]} typography-desktop-body-medium`}>
      {user.total_routes}
    </div>
    <div className={`${styles["world-challenge__table-cell"]} ${styles["world-challenge__table-cell--stat"]} typography-desktop-body-medium`}>
      {user.total_distance_km.toFixed(1)} km
    </div>
  </div>
);

// =================================================================
// LEADERBOARD SECTION
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
  showOnlyMyUser?: boolean | undefined;
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
  const observerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          if (sortMode === "highest" && hasMorePeaks) onLoadMorePeaks();
          else if (sortMode === "contributors" && hasMoreUsers) onLoadMoreUsers();
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [sortMode, hasMorePeaks, hasMoreUsers, loadingMore, onLoadMorePeaks, onLoadMoreUsers]);

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

  const authUserAsCommunityUser: CommunityUserStats | null = authUserStats
    ? {
        user_id: authUserStats.user_id,
        user_name: authUserStats.user_name || "Me",
        user_image: authUserStats.user_image || "",
        activity_type: "all",
        total_peaks: authUserStats.totals.global.total_peaks,
        total_routes: authUserStats.totals.global.total_routes,
        total_distance_km: authUserStats.totals.global.total_distance_km,
        total_elevation_gain: authUserStats.totals.global.total_elevation_gain,
        total_time_seconds: authUserStats.totals.global.total_time_seconds,
        total_moving_time_seconds: authUserStats.totals.global.total_moving_time_seconds,
        total_time_formatted: "",
        total_moving_time_formatted: "",
      }
    : null;

  // Table header — adapts column labels based on mode
  const renderTableHeader = () => {
    const columns =
      sortMode === "highest"
        ? [t("leaderboard.rank"), t("leaderboard.peak"), t("leaderboard.elevation"), t("leaderboard.climbers"), t("leaderboard.climbedBy")]
        : [t("leaderboard.rank"), t("leaderboard.user"), t("leaderboard.peaks"), t("leaderboard.routes"), t("leaderboard.distance")];

    return (
      <div
        className={`${styles["world-challenge__table-header"]} typography-desktop-label-small`}
      >
        {columns.map((label, i) => (
          <div
            key={i}
            className={`${styles["world-challenge__table-header-cell"]} ${
              i !== 1 ? styles["world-challenge__table-header-cell--center"] : ""
            } typography-desktop-label-medium`}
          >
            {label}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles["world-challenge__leaderboard"]}>
      <div className={styles["world-challenge__leaderboard-header"]}>
        <div className={styles["world-challenge__sort-toggle"]}>
          {(["highest", "contributors"] as const).map((mode) => (
            <button
              key={mode}
              className={`${styles["world-challenge__sort-btn"]} ${
                sortMode === mode ? styles["world-challenge__sort-btn--active"] : ""
              }`}
              onClick={() => onSortChange(mode)}
            >
              {mode === "highest" ? <Trophy size={14} /> : <Users size={14} />}
              <span className="typography-desktop-button-small">
                {t(mode === "highest" ? "leaderboard.sortByHighest" : "leaderboard.sortByContributors")}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles["world-challenge__table"]}>
        {renderTableHeader()}

        {isLoading ? (
          <div className={styles["world-challenge__table-body"]}>
            {Array.from({ length: 10 }, (_, i) => (
              <TableRowSkeleton key={i} isUser={sortMode === "contributors"} />
            ))}
          </div>
        ) : (
          <>
            {sortMode === "contributors" && authUserAsCommunityUser && !isLoadingUsers && (
              <div className={`${styles["world-challenge__sticky-user"]} ${styles["world-challenge__auth-user-item"]}`}>
                <UserTableRow
                  user={authUserAsCommunityUser}
                  index={(authUserStats?.rank || 0) - 1}
                  onUserNavigation={onUserNavigation}
                />
              </div>
            )}
            <div className={styles["world-challenge__table-body"]}>
              {sortMode === "highest"
                ? peaks.map((peak, i) => (
                    <TableRow
                      key={peak.id}
                      peak={peak}
                      index={i}
                      onUserClick={onUserClick}
                      onPeakClick={onPeakClick}
                      onUserNavigation={onUserNavigation}
                      selectedFiltersCount={selectedFiltersCount}
                      showOnlyMyUser={showOnlyMyUser}
                    />
                  ))
                : users.map((user, i) => (
                    <UserTableRow key={user.user_id} user={user} index={i} onUserNavigation={onUserNavigation} />
                  ))}
            </div>
          </>
        )}
      </div>

      <div ref={observerRef} className={styles["world-challenge__load-more"]}>
        {loadingMore && <div className={styles["world-challenge__loading-spinner"]}></div>}
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

export default function DesktopWorldChallenge({ isActive }: { isActive?: boolean }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const data = useWorldChallengeData("world_challenge_desktop", true);

  // Desktop admin search filter
  const renderAdminFilters = () => (
    <div className={styles["world-challenge__filters"]}>
      <div className={styles["world-challenge__filter-row"]}>
        <div className={styles["world-challenge__filter-selector"]}>
          <WorldChallengeAdminSearch
            key={`desktop-world-challenge-filter-admin-${data.appliedAdminName ?? "none"}`}
            selectedName={data.appliedAdminName}
            placeholder={t("leaderboard.searchLocationPlaceholder")}
            emptyText={(query) => t("leaderboard.noLocationsFound", { query })}
            ariaLabel={t("leaderboard.locationSearchLabel")}
            onSelect={data.selectAdminSearchResult}
            onClear={data.clearAdminSelection}
          />
        </div>
      </div>
      
      {user && (
        <div className={styles["world-challenge__auth-toggle-container"]}>
          <div className={styles["world-challenge__auth-tabs"]}>
            <button
              className={`${styles["world-challenge__auth-tab"]} ${!data.showOnlyMyUser ? styles["world-challenge__auth-tab--active"] : ""}`}
              onClick={() => data.showOnlyMyUser && data.toggleShowOnlyMyUser()}
            >
              <span className="typography-desktop-label-large">{t("leaderboard.community")}</span>
            </button>
            <button
              className={`${styles["world-challenge__auth-tab"]} ${data.showOnlyMyUser ? styles["world-challenge__auth-tab--active"] : ""}`}
              onClick={() => !data.showOnlyMyUser && data.toggleShowOnlyMyUser()}
            >
              <span className="typography-desktop-label-large">{t("leaderboard.you")}</span>
            </button>
          </div>
        </div>
      )}
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
        <p className="typography-desktop-body-medium">{t("leaderboard.description")}</p>
      </div>

      {renderAdminFilters()}

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
        showOnlyMyUser={data.showOnlyMyUser}
        onToggleShowOnlyMyUser={data.toggleShowOnlyMyUser}
        user={user}
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
