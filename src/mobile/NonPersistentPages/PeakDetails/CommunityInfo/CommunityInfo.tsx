import React, { useCallback, useEffect, useRef, useState } from "react";
import styles from "./CommunityInfo.module.css";
import { getPeakCommunityInfo } from "../../../../shared/api/endpoints/peaks";
import type {
  PeakCommunityInfo,
  PeakCommunityUser,
  PeakCommunityRoute,
  PeakCommunityPagination,
} from "../../../../shared/api/types";
import {
  Users,
  ChevronRight,
  X,
  Route,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../shared/context/I18nContext";
import AppModal from "../../../../shared/components/AppModal";
import { useNavigate } from "react-router-dom";
import ShimmerWrapper from "../../../components/Shimmer/ShimmerWrapper";
import {
  formatCompactTime,
} from "../../../utils/numberFormatting";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";
import {
  resolveCommunityInfoScope,
  type CommunityInfoScope,
} from "../../../../shared/utils/communityInfoFilter";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getElevationIconMap } from "../../../../shared/constants/elevationColors";
import {
  createLeafletPreviewInvalidator,
  getLeafletPreviewInitialView,
  hasLeafletPreviewSize,
  waitForLeafletPreviewContainer,
} from "../../../../shared/utils/leafletPreviewLifecycle";
import { addManualPeaks, deleteManualPeak } from "../../../../shared/api/endpoints";
import { RouteExistenceConfirmation } from "../../AddManualPeaks/components/RouteExistenceConfirmation";
import { ConfirmationModal } from "../../AddManualPeaks/components/ConfirmationModal";
import { RouteSelectionModal } from "../../AddManualPeaks/components/RouteSelectionModal";
import SingleDatePicker from "../../UserPeaks/SingleDatePicker";
import { useAuth } from "../../../../shared/context/AuthContext";

const LeafletRouteMap: React.FC<{
  coordinates?: { type: string; coordinates: [number, number][] };
  peaks?: Array<{ lat: number; lng: number; elevation: number }>;
}> = ({ coordinates, peaks }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const invalidatorRef = useRef<ReturnType<
    typeof createLeafletPreviewInvalidator
  > | null>(null);
  const latestDataRef = useRef({ coordinates, peaks });
  const initialViewRef = useRef<ReturnType<
    typeof getLeafletPreviewInitialView
  >>(null);
  const [initialView, setInitialView] = useState<ReturnType<
    typeof getLeafletPreviewInitialView
  >>(null);
  const shouldRenderMap = initialView !== null;

  useEffect(() => {
    const nextInitialView = getLeafletPreviewInitialView(coordinates, peaks);
    initialViewRef.current = nextInitialView;
    setInitialView(nextInitialView);
  }, [coordinates, peaks]);

  const syncMapContent = useCallback((map: L.Map) => {
    const currentCoordinates = latestDataRef.current.coordinates;
    const currentPeaks = latestDataRef.current.peaks;

    map.invalidateSize({ pan: false, debounceMoveend: true });

    map.eachLayer((layer) => {
      if (
        layer instanceof L.Polyline ||
        layer instanceof L.Marker ||
        layer instanceof L.CircleMarker
      ) {
        map.removeLayer(layer);
      }
    });

    const hasCoordinates = Boolean(currentCoordinates?.coordinates?.length);
    const hasPeaks = Boolean(currentPeaks?.length);

    if (!hasCoordinates && !hasPeaks) {
      invalidatorRef.current?.scheduleRefresh();
      return;
    }

    let polyline: L.Polyline | null = null;

    if (hasCoordinates && currentCoordinates) {
      const latlngs = currentCoordinates.coordinates.map(
        (coordinate) => [coordinate[1], coordinate[0]] as [number, number]
      );
      polyline = L.polyline(latlngs, {
        color: "#ED254E",
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
    }

    if (hasPeaks && currentPeaks) {
      currentPeaks.forEach((peak) => {
        if (peak.lat != null && peak.lng != null) {
          const iconUrl = getElevationIconMap(peak.elevation || 0);
          const icon = L.divIcon({
            html: `<img src="${iconUrl}" style="height: 32px; width: auto; transform: translate(-50%, -100%); transform-origin: bottom center; display: block;" />`,
            className: "",
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });
          L.marker([peak.lat, peak.lng], { icon }).addTo(map);
        }
      });

      if (!polyline) {
        const firstPeak = currentPeaks[0];
        if (firstPeak) {
          map.setView([firstPeak.lat, firstPeak.lng], 11);
        }
      } else {
        map.fitBounds(polyline.getBounds(), { padding: [10, 10] });
      }
    } else if (polyline) {
      map.fitBounds(polyline.getBounds(), { padding: [10, 10] });
    }

    invalidatorRef.current?.scheduleRefresh();
  }, []);

  useEffect(() => {
    if (!shouldRenderMap || !mapRef.current || mapInstance.current) return;

    const container = mapRef.current;

    const initializeMap = () => {
      const currentInitialView = initialViewRef.current;

      if (
        !currentInitialView ||
        mapInstance.current ||
        !hasLeafletPreviewSize(container)
      ) {
        return;
      }

      const map = L.map(container, {
        center: currentInitialView.center,
        zoom: currentInitialView.zoom,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "Â© OpenStreetMap",
      }).addTo(map);

      mapInstance.current = map;
      invalidatorRef.current = createLeafletPreviewInvalidator(
        container,
        mapInstance
      );

      syncMapContent(map);
      invalidatorRef.current.scheduleRefresh();
    };

    initializeMap();

    const stopWaitingForSize = mapInstance.current
      ? () => {}
      : waitForLeafletPreviewContainer(container, initializeMap);

    return () => {
      stopWaitingForSize();
      invalidatorRef.current?.cleanup();
      invalidatorRef.current = null;

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [shouldRenderMap, syncMapContent]);

  /*
  useEffect(() => {
    return;
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    mapInstance.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);
  */

  useEffect(() => {
    latestDataRef.current = { coordinates, peaks };

    const map = mapInstance.current;
    if (!map) return;

    syncMapContent(map);
  }, [coordinates, peaks, syncMapContent]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {shouldRenderMap ? (
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      ) : null}
    </div>
  );
};

type CommunityInfoProps = {
  peakId: number;
};

interface UserModalProps {
  isOpen: boolean;
  peakName: string;
  scope: CommunityInfoScope;
  scopeData: ReturnType<typeof resolveCommunityInfoScope>;
  onScopeChange: (nextScope: CommunityInfoScope) => void;
  getScopeLabel: (scope: CommunityInfoScope) => string;
  onClose: () => void;
  onUserClick: (userId: number) => void;
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  peakName,
  scope,
  scopeData,
  onScopeChange,
  getScopeLabel,
  onClose,
  onUserClick,
}) => {
  const { t } = useI18n();


  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      ariaLabel={t("communityInfo.completedBy")}
      contentClassName={styles["modalContent"]}
    >
      <div className={styles["modalHeader"]}>
        <h3 className={`${styles["modalTitle"]} typography-title-small`}>
          {t("communityInfo.completedBy")} {peakName}
        </h3>
        <button className={styles["modalClose"]} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className={styles["modalBody"]}>
        <div className={styles["modalStats"]}>
          <div className={styles["modalStat"]}>
            <span className={styles["modalStatValue"]}>
              {scopeData.active.totalCompletions}
            </span>
            <span
              className={`${styles["modalStatLabel"]} typography-label-large`}
            >
              {t("communityInfo.totalCompletions")}
            </span>
          </div>
          <div className={styles["modalStat"]}>
            <span className={styles["modalStatValue"]}>
              {scopeData.active.uniqueUsers}
            </span>
            <span
              className={`${styles["modalStatLabel"]} typography-label-large`}
            >
              {t("communityInfo.uniqueUsers")}
            </span>
          </div>
        </div>
        {scopeData.hasClubScope && (
          <div className={styles["communityInfo__filter"]}>
            <button
              type="button"
              className={`${styles["communityInfo__filterButton"]} ${
                scope === "all" ? styles["communityInfo__filterButton--active"] : ""
              }`}
              onClick={() => onScopeChange("all")}
            >
              {getScopeLabel("all")}
            </button>
            <button
              type="button"
              className={`${styles["communityInfo__filterButton"]} ${
                scope === "club"
                  ? styles["communityInfo__filterButton--active"]
                  : ""
              }`}
              onClick={() => onScopeChange("club")}
            >
              {getScopeLabel("club")}
            </button>
          </div>
        )}
        <div className={styles["modalUserList"]}>
          {scopeData.active.users.map(
            (user: PeakCommunityUser, index: number) => (
              <div
                key={`${user.id}-${index}`}
                className={styles["modalUserItem"]}
                onClick={() => onUserClick(user.id)}
              >
                <img
                  className={styles["modalUserAvatar"]}
                  src={user.image || "/placeholder.svg"}
                  alt={user.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className={styles["modalUserInfo"]}>
                  <span
                    className={`${styles["modalUserName"]} typography-title-small`}
                  >
                    {user.name}
                  </span>
                  <div className={styles["modalUserDetails"]}>
                    <span
                      className={`${styles["modalUserCompletions"]} typography-body-small`}
                    >
                      <MountainIcon size={12} />
                      {user.completion_count}{" "}
                      {user.completion_count === 1 ? t("communityInfo.timeSingle") : t("communityInfo.timePlural")}
                    </span>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </AppModal>
  );
};

const CommunityInfo: React.FC<CommunityInfoProps> = ({ peakId }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { formatDistance, formatElevationGain, formatMeters } = useUnitFormat();
  const navigate = useNavigate();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "mobile",
    "community_info",
    peakId
  );
  const [communityInfo, setCommunityInfo] = useState<PeakCommunityInfo | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [loadingMoreRoutes, setLoadingMoreRoutes] = useState(false);
  const [pagination, setPagination] = useState<PeakCommunityPagination | null>(null);
  const routesScrollRef = useRef<HTMLDivElement>(null);

  // Manual peak selection state
  const [isAddingPeak, setIsAddingPeak] = useState(false);
  const [showRouteExistenceModal, setShowRouteExistenceModal] = useState(false);
  const [showRouteSelectionModal, setShowRouteSelectionModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingPeak, setIsDeletingPeak] = useState(false);
  const [scope, setScope] = useState<CommunityInfoScope>("all");

  const refreshCommunityInfo = useCallback(() => {
    if (!peakId) return;
    setLoading(true);
    getPeakCommunityInfo(peakId, 1, 20)
      .then((data) => {
        setCommunityInfo(data);
        setPagination(data.pagination ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [peakId]);

  useEffect(() => {
    refreshCommunityInfo();
  }, [refreshCommunityInfo]);

  const loadMoreRoutes = useCallback(async () => {
    if (!peakId || !pagination || loadingMoreRoutes || !pagination.has_next) return;
    setLoadingMoreRoutes(true);
    try {
      const nextPage = pagination.page + 1;
      const data = await getPeakCommunityInfo(peakId, nextPage, pagination.limit);
      setCommunityInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          routes: [...(prev.routes ?? []), ...(data.routes ?? [])],
        };
      });
      setPagination(data.pagination ?? null);
    } catch {
      // silently fail - user can try again by scrolling
    } finally {
      setLoadingMoreRoutes(false);
    }
  }, [peakId, pagination, loadingMoreRoutes]);

  const handleRoutesScroll = useCallback(() => {
    const el = routesScrollRef.current;
    if (!el || !pagination?.has_next || loadingMoreRoutes) return;
    const nearEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 200;
    if (nearEnd) {
      loadMoreRoutes();
    }
  }, [pagination, loadingMoreRoutes, loadMoreRoutes]);

  const scopeData = resolveCommunityInfoScope(communityInfo, scope);
  const activeScope = scopeData.active;

  useEffect(() => {
    if (scope === "club" && !scopeData.hasClubScope) {
      setScope("all");
    }
  }, [scope, scopeData.hasClubScope]);

  const hasData = Boolean(
    communityInfo &&
      (scopeData.all.users.length > 0 ||
        scopeData.all.routes.length > 0 ||
        communityInfo.current_user)
  );
  usePeakDetailsView("mobile", "community_info", hasData, peakId);

  const getScopeLabel = (nextScope: CommunityInfoScope): string => {
    if (nextScope === "all") return t("communityInfo.filterAll") || "All";
    if (scopeData.clubNames.length === 1) return scopeData.clubNames[0] || "Club";
    if (scopeData.clubNames.length > 1) {
      return t("communityInfo.filterMyClubs") || "My clubs";
    }
    return t("communityInfo.filterClubRelated") || "Club related";
  };

  const handleScopeChange = (nextScope: CommunityInfoScope) => {
    if (scope === nextScope) return;
    if (nextScope === "club" && !scopeData.hasClubScope) return;
    trackSectionEvent(
      "filter_change",
      nextScope === "club" ? "club_related" : "all"
    );
    setScope(nextScope);
  };

  const handleSeeMore = () => {
    trackSectionEvent("button_click", "see_more_open");
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    trackSectionEvent("interaction", "modal_close");
    setShowUserModal(false);
  };

  const handleUserClick = (userId: number) => {
    // Close modal immediately and navigate
    trackSectionEvent("navigation", "open_user", userId);
    setShowUserModal(false);
    navigate(`/externalprofile/${userId}`);
  };

  const handleRouteClick = (routeId: number) => {
    trackSectionEvent("route_click", "open_route", routeId);
    navigate(`/routes/${routeId}`);
  };

  const handleDeleteClick = () => {
    trackSectionEvent("button_click", "delete_manual_peak_opened");
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!communityInfo?.peak_id) return;

    setIsDeletingPeak(true);
    try {
      await deleteManualPeak(communityInfo.peak_id);
      trackSectionEvent("button_click", "manual_peak_deleted");
      const updatedInfo = await getPeakCommunityInfo(communityInfo.peak_id, 1, 20);
      setCommunityInfo(updatedInfo);
      setPagination(updatedInfo.pagination ?? null);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Failed to delete peak:", err);
      trackSectionEvent("interaction", "peak_delete_failed");
    } finally {
      setIsDeletingPeak(false);
    }
  };

  const handleAddAsAscended = () => {
    if (!user) {
      return;
    }
    trackSectionEvent("button_click", "add_as_ascended");
    setShowRouteExistenceModal(true);
  };

  const handleRouteExistenceConfirmation = (exists: boolean) => {
    setShowRouteExistenceModal(false);
    trackSectionEvent("interaction", exists ? "route_exists" : "route_not_exists");
    if (exists) {
      setShowRouteSelectionModal(true);
    } else {
      submitManualPeak(null);
    }
  };

  const handleAddWithDate = () => {
    setShowRouteExistenceModal(false);
    trackSectionEvent("button_click", "add_with_date");
    setShowDatePicker(true);
  };

  const handleDateSelected = (date: string | null) => {
    setShowDatePicker(false);
    if (date) {
      submitManualPeak(null, date);
    }
  };

  const handleRouteSelection = (routeId: number, _routeName: string, _routeDate: string) => {
    setShowRouteSelectionModal(false);
    trackSectionEvent("route_click", "select_route_for_peak", routeId);
    submitManualPeak(routeId);
  };

  const submitManualPeak = async (routeId: number | null, date?: string | null) => {
    if (!peakId || isAddingPeak) return;

    setIsAddingPeak(true);
    try {
      await addManualPeaks([{ peak_id: peakId, route_id: routeId, date: date ?? null }]);
      trackSectionEvent("button_click", routeId ? "peak_added_with_route" : date ? "peak_added_with_date" : "peak_added");
      refreshCommunityInfo();
    } catch (error) {
      console.error("Error adding manual peak:", error);
      trackSectionEvent("interaction", "peak_add_failed");
    } finally {
      setIsAddingPeak(false);
    }
  };

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      <section className={styles["communityInfo"]}>
        <h3
          className={`${styles["communityInfo__title"]} typography-title-medium`}
        >
          <Users className={styles["communityInfo__icon"]} />
          {t("communityInfo.title")}
        </h3>

        {communityInfo && (
          <div className={styles["communityInfo__content"]}>
            <div className={styles["communityInfo__stats"]}>
              <div className={styles["communityInfo__stat"]}>
                <span className={styles["communityInfo__statValue"]}>
                  {activeScope.totalCompletions}
                </span>
                <span
                  className={`${styles["communityInfo__statLabel"]} typography-label-large`}
                >
                  {t("communityInfo.totalCompletions")}
                </span>
              </div>
              <div className={styles["communityInfo__stat"]}>
                <span className={styles["communityInfo__statValue"]}>
                  {activeScope.uniqueUsers}
                </span>
                <span
                  className={`${styles["communityInfo__statLabel"]} typography-label-large`}
                >
                  {t("communityInfo.uniqueUsers")}
                </span>
              </div>
            </div>
            {scopeData.hasClubScope && (
              <div className={styles["communityInfo__filter"]}>
                <button
                  type="button"
                  className={`${styles["communityInfo__filterButton"]} ${
                    scope === "all"
                      ? styles["communityInfo__filterButton--active"]
                      : ""
                  }`}
                  onClick={() => handleScopeChange("all")}
                >
                  {getScopeLabel("all")}
                </button>
                <button
                  type="button"
                  className={`${styles["communityInfo__filterButton"]} ${
                    scope === "club"
                      ? styles["communityInfo__filterButton--active"]
                      : ""
                  }`}
                  onClick={() => handleScopeChange("club")}
                >
                  {getScopeLabel("club")}
                </button>
              </div>
            )}
            {communityInfo.current_user && (
              <div className={styles["communityInfo__currentUserWrapper"]}>
                <div className={styles["communityInfo__currentUser"]}>
                  <span className="typography-body-medium">
                    {communityInfo.current_user.completed ? (
                      <>
                        {t("communityInfo.youHaveCompleted")}{" "}
                        <strong>{communityInfo.peak_name}</strong>{" "}
                        <strong>
                          {communityInfo.current_user.completion_count}{" "}
                          {communityInfo.current_user.completion_count === 1
                            ? t("communityInfo.timeSingle")
                            : t("communityInfo.timePlural")}
                        </strong>
                      </>
                    ) : (
                      t("communityInfo.notCompleted")
                    )}
                  </span>
                </div>
                <div className={styles["communityInfo__actions"]}>
                  <button 
                    className={`${styles["communityInfo__addBtn"]} typography-label-medium`}
                    onClick={handleAddAsAscended}
                    disabled={isAddingPeak}
                  >
                    {isAddingPeak ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                  </button>
                  {communityInfo.current_user.completed && (
                    <button
                      className={styles["communityInfo__deleteBtn"]}
                      onClick={handleDeleteClick}
                      disabled={isDeletingPeak}
                    >
                      {isDeletingPeak ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeScope.users.length > 0 && (
            <div className={styles["communityInfo__users"]}>
              {activeScope.users
                .slice(0, 2)
                .map((user: PeakCommunityUser, index: number) => (
                  <div
                    key={`${user.id}-${index}`}
                    className={styles["communityInfo__userItem"]}
                    onClick={() => handleUserClick(user.id)}
                  >
                    <img
                      className={styles["communityInfo__userAvatar"]}
                      src={user.image || "/placeholder.svg"}
                      alt={user.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className={styles["communityInfo__userInfo"]}>
                      <span
                        className={`${styles["communityInfo__userName"]} typography-title-small`}
                      >
                        {user.name}
                      </span>
                      <div className={styles["communityInfo__userDetails"]}>
                        <span
                          className={`${styles["communityInfo__userCompletions"]} typography-body-small`}
                        >
                          <MountainIcon size={12} /> {user.completion_count}{" "}
                          {user.completion_count === 1 ? t("communityInfo.timeSingle") : t("communityInfo.timePlural")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            )}

            {activeScope.users.length > 2 && (
              <button
                className={styles["communityInfo__seeMoreBtn"]}
                onClick={handleSeeMore}
              >
                {t("communityInfo.seeMore")} ({activeScope.users.length - 2}{" "}
                {t("communityInfo.more")})
                <ChevronRight size={16} />
              </button>
            )}

            {/* Routes Section */}
            {activeScope.routes.length > 0 && (
              <div className={styles["communityInfo__routes-section"]}>
                <div
                  className={`${styles["communityInfo__routes-title"]} typography-title-medium`}
                >
                  <Route size={18} />
                  {t("communityInfo.routes") || "Routes"}
                </div>
                <div className={styles["communityInfo__routes-scroll"]} ref={routesScrollRef} onScroll={handleRoutesScroll}>
                  {activeScope.routes.map((route: PeakCommunityRoute) => (
                    <div
                      key={route.id}
                      className={styles["communityInfo__route-card"]}
                      onClick={() => handleRouteClick(route.id)}
                    >
                      <div className={styles["communityInfo__route-content"]}>
                        {/* Header with user and date */}
                        <div className={styles["communityInfo__route-header-row"]}>
                          <div
                            className={styles["communityInfo__route-user-info"]}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (route.user) {
                                handleUserClick(route.user.id);
                              }
                            }}
                          >
                            {route.user && (
                              <>
                                {route.user.image ? (
                                  <img
                                    src={route.user.image}
                                    alt={route.user.name}
                                    className={styles["communityInfo__route-user-avatar"]}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = "none";
                                      const parent = target.parentElement;
                                      if (parent && route.user) {
                                        parent.innerHTML = route.user.name.charAt(0).toUpperCase();
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className={styles["communityInfo__route-user-avatar-placeholder"]}>
                                    {route.user.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className={styles["communityInfo__route-user-details"]}>
                                  <span className={`${styles["communityInfo__route-user-name"]} typography-title-small`}>
                                    {route.user.name}
                                  </span>
                                  {(route as any).activity_type && (
                                    <span className={`${styles["communityInfo__route-activity-type"]} typography-body-small`}>
                                      {(route as any).activity_type}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <div className={styles["communityInfo__route-header-actions"]}>
                            {route.date && (
                              <div className={styles["communityInfo__route-date"]}>
                                <span className="typography-label-medium">
                                  {new Date(route.date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Route name */}
                        <h3 className={`${styles["communityInfo__route-name-title"]} typography-title-medium`}>
                          {route.name}
                        </h3>

                        <div className={styles["communityInfo__route-secondsection"]}>
                          {/* Route image */}
                          <div className={styles["communityInfo__route-image-section"]}>
                            {route.image && !imgErrors.has(route.id) ? (
                              <img
                                src={route.image}
                                alt={route.name}
                                className={styles["communityInfo__route-image"]}
                                onError={() =>
                                  setImgErrors((prev) => new Set([...Array.from(prev), route.id]))
                                }
                              />
                            ) : (route as any).coordinates && (route as any).coordinates.coordinates && (route as any).coordinates.coordinates.length > 0 ? (
                              <div className={styles["communityInfo__route-image"]}>
                                <LeafletRouteMap coordinates={(route as any).coordinates} peaks={(route as any).peaks ?? []} />
                              </div>
                            ) : route.peaks && route.peaks.length > 0 && (route.peaks[0] as any).lat != null ? (
                              <div className={styles["communityInfo__route-image"]}>
                                <LeafletRouteMap peaks={(route as any).peaks ?? []} />
                              </div>
                            ) : (
                              <div className={styles["communityInfo__route-image-placeholder"]}>
                                <Route size={32} color="rgb(71, 85, 105)" />
                              </div>
                            )}

                            {/* Stats Overlay on Image */}
                            <div className={styles["communityInfo__route-stats-overlay"]}>
                              <div className={styles["communityInfo__route-stat-item"]}>
                                <span className={`${styles["communityInfo__route-stat-label"]} typography-button-small`}>
                                  {t("recentRoutes.distance") || "Distance"}
                                </span>
                                <span className={`${styles["communityInfo__route-stat-value"]} typography-title-small`}>
                                  {formatDistance(Number(route.distance))}
                                </span>
                              </div>
                              <div className={styles["communityInfo__route-stat-divider"]} />
                              <div className={styles["communityInfo__route-stat-item"]}>
                                <span className={`${styles["communityInfo__route-stat-label"]} typography-button-small`}>
                                  {t("recentRoutes.elevationGain") || "Elevation Gain"}
                                </span>
                                <span className={`${styles["communityInfo__route-stat-value"]} typography-title-small`}>
                                  {route.elevation_gain != null
                                    ? formatElevationGain(route.elevation_gain)
                                    : "—"}
                                </span>
                              </div>
                              <div className={styles["communityInfo__route-stat-divider"]} />
                              <div className={styles["communityInfo__route-stat-item"]}>
                                <span className={`${styles["communityInfo__route-stat-label"]} typography-button-small`}>
                                  {t("recentRoutes.time") || "Time"}
                                </span>
                                <span className={`${styles["communityInfo__route-stat-value"]} typography-title-small`}>
                                  {route.time != null ? formatCompactTime(route.time) : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Peaks Section */}
                          {route.peaks && route.peaks.length > 0 && (
                            <div className={styles["communityInfo__route-peaks-container"]}>
                              <div className={styles["communityInfo__route-peaks-list"]}>
                                {route.peaks.slice(0, 4).map((peak: any, idx: number) => (
                                  <div key={idx} className={styles["communityInfo__route-peak-chip"]}>
                                    <span className="typography-label-small">
                                      {peak.name} {peak.elevation != null && `(${formatMeters(peak.elevation)})`}
                                    </span>
                                  </div>
                                ))}
                                {route.peaks.length > 4 && (
                                  <div className={styles["communityInfo__route-peak-chip"]}>
                                    <span className="typography-label-small">
                                      +{route.peaks.length - 4} {t("communityInfo.more") || "more"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                    {loadingMoreRoutes && (
                      <div className={styles["communityInfo__route-loading"]}>
                        <Loader2 size={24} className="animate-spin" />
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}

        <UserModal
          isOpen={showUserModal}
          peakName={communityInfo?.peak_name || ""}
          scope={scopeData.selectedScope}
          scopeData={scopeData}
          onScopeChange={handleScopeChange}
          getScopeLabel={getScopeLabel}
          onClose={closeUserModal}
          onUserClick={handleUserClick}
        />

        <RouteExistenceConfirmation
          isOpen={showRouteExistenceModal}
          peakName={communityInfo?.peak_name || ""}
          onHasRoute={() => handleRouteExistenceConfirmation(true)}
          onNoRoute={() => handleRouteExistenceConfirmation(false)}
          onAddWithDate={handleAddWithDate}
          onClose={() => setShowRouteExistenceModal(false)}
          t={t}
        />

        <RouteSelectionModal
          isOpen={showRouteSelectionModal}
          peakName={communityInfo?.peak_name || ""}
          onSelectRoute={handleRouteSelection}
          onClose={() => setShowRouteSelectionModal(false)}
        />

        <div style={{ display: "none" }}>
          <SingleDatePicker
            onDateChange={handleDateSelected}
            buttonLabel={t("addManualPeaks.routeExistence.addWithDate")}
            controlledOpen={showDatePicker}
            onControlledClose={() => setShowDatePicker(false)}
          />
        </div>

        <ConfirmationModal
          isOpen={showDeleteModal}
          title={t("userPeaks.deleteConfirmation.title")}
          message={t("userPeaks.deleteConfirmation.message", { peakName: communityInfo?.peak_name })}
          confirmLabel={t("userPeaks.deleteConfirmation.confirm")}
          cancelLabel={t("userPeaks.deleteConfirmation.cancel")}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDanger={true}
        />

      </section>
    </ShimmerWrapper>
  );
};

export default CommunityInfo;
