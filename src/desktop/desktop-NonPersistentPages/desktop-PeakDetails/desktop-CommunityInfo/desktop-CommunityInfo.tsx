import React, { useCallback, useEffect, useState } from "react";
import styles from "./desktop-CommunityInfo.module.css";
import { getPeakCommunityInfo } from "../../../../shared/api/endpoints/peaks";
import type {
  PeakCommunityInfo,
  PeakCommunityUser,
  PeakCommunityRoute,
  PeakCommunityPagination,
} from "../../../../shared/api/types";
import {
  Users,
  ChevronDown,
  ChevronUp,
  Route,
  Clock,
  TrendingUp,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import ShimmerWrapper from "../../../desktop-components/desktop-Shimmer/desktop-ShimmerWrapper.tsx";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";
import {
  resolveCommunityInfoScope,
  type CommunityInfoScope,
} from "../../../../shared/utils/communityInfoFilter";
import { addManualPeaks, deleteManualPeak } from "../../../../shared/api/endpoints";
import { DesktopRouteExistenceConfirmation } from "../../desktop-AddManualPeaks/components/desktop-RouteExistenceConfirmation";
import { DesktopRouteSelectionModal } from "../../desktop-AddManualPeaks/components/desktop-RouteSelectionModal";
import { DesktopConfirmationModal } from "../../../desktop-components/desktop-ConfirmationModal/desktop-ConfirmationModal";
import { useAuth } from "../../../../shared/context/AuthContext";
import { AnimatePresence } from "framer-motion";

type CommunityInfoProps = {
  peakId: number;
};

const CommunityInfo: React.FC<CommunityInfoProps> = ({ peakId }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop",
    "community_info",
    peakId
  );
  const [communityInfo, setCommunityInfo] = useState<PeakCommunityInfo | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [scope, setScope] = useState<CommunityInfoScope>("all");
  const { formatDistance, formatElevationGain, formatMeters: formatElevation } = useUnitFormat();
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [pagination, setPagination] = useState<PeakCommunityPagination | null>(null);
  const [loadingMoreRoutes, setLoadingMoreRoutes] = useState(false);

  // Manual peak selection state
  const [isAddingPeak, setIsAddingPeak] = useState(false);
  const [showRouteExistenceModal, setShowRouteExistenceModal] = useState(false);
  const [showRouteSelectionModal, setShowRouteSelectionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingPeak, setIsDeletingPeak] = useState(false);


  const fetchCommunityInfo = useCallback(() => {
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
    fetchCommunityInfo();
  }, [fetchCommunityInfo]);

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
  usePeakDetailsView("desktop", "community_info", hasData, peakId);

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
    setShowAllUsers(false);
    setShowAllRoutes(false);
  };

  const handleUserClick = (userId: number) => {
    trackSectionEvent("navigation", "open_user", userId);
    navigate(`/externalprofile/${userId}`);
  };

  const handleRouteClick = (routeId: number) => {
    trackSectionEvent("route_click", "open_route", routeId);
    navigate(`/routes/${routeId}`);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!communityInfo?.peak_id) return;

    setIsDeletingPeak(true);
    try {
      await deleteManualPeak(communityInfo.peak_id);
      // Refresh data
      const updatedInfo = await getPeakCommunityInfo(communityInfo.peak_id, 1, 20);
      setCommunityInfo(updatedInfo);
      setPagination(updatedInfo.pagination ?? null);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Failed to delete peak:", err);
    } finally {
      setIsDeletingPeak(false);
    }
  };

  const handleAddAsAscended = () => {
    if (!user) return;
    setShowRouteExistenceModal(true);
  };

  const handleRouteExistenceConfirmation = (exists: boolean) => {
    setShowRouteExistenceModal(false);
    if (exists) {
      setShowRouteSelectionModal(true);
    } else {
      // Submit immediately without confirmation
      submitManualPeak(null);
    }
  };

  const handleRouteSelection = (routeId: number, _routeName: string, _routeDate: string) => {
    setShowRouteSelectionModal(false);
    // Submit immediately without confirmation
    submitManualPeak(routeId);
  };

  const submitManualPeak = async (routeId: number | null) => {
    if (!peakId || isAddingPeak) return;

    setIsAddingPeak(true);
    try {
      await addManualPeaks([{ peak_id: peakId, route_id: routeId }]);
      // Refresh component data
      fetchCommunityInfo();
    } catch (error) {
      console.error("Error adding manual peak:", error);
    } finally {
      setIsAddingPeak(false);
    }
  };

  const INITIAL_USERS_SHOWN = 12; // Show enough users to fill ~3 rows
  const INITIAL_ROUTES_SHOWN = 2;

  const formatTime = (timeString: string | null | undefined): string => {
    // Handle null, undefined, or empty values
    if (timeString === null || timeString === undefined || timeString === "") {
      return "—";
    }
    // Format "04:30:00" to "4h 30m"
    const parts = timeString.split(":");
    const hours = parseInt(parts[0] || "0", 10);
    const minutes = parseInt(parts[1] || "0", 10);
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    }
    return timeString;
  };

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
      // silently fail
    } finally {
      setLoadingMoreRoutes(false);
    }
  }, [peakId, pagination, loadingMoreRoutes]);

  const handleShowMoreRoutes = async () => {
    if (showAllRoutes) {
      setShowAllRoutes(false);
      return;
    }
    // If there are more pages to load, fetch them first
    if (pagination?.has_next && !loadingMoreRoutes) {
      await loadMoreRoutes();
    }
    setShowAllRoutes(true);
  };

  const displayedUsers = showAllUsers
    ? activeScope.users
    : activeScope.users.slice(0, INITIAL_USERS_SHOWN);

  const displayedRoutes = showAllRoutes
    ? activeScope.routes
    : activeScope.routes.slice(0, INITIAL_ROUTES_SHOWN);

  const hasMoreUsers = activeScope.users.length > INITIAL_USERS_SHOWN;
  const hasMoreRoutes = activeScope.routes.length > INITIAL_ROUTES_SHOWN || Boolean(pagination?.has_next);

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      <div className={styles["community-info"]}>
        <div
          className={`${styles["community-info__title"]} typography-desktop-title-small`}
        >
          <Users size={24} />
          {t("communityInfo.title")}
        </div>

        {communityInfo && (
          <div className={styles["community-info__content"]}>
            {/* Stats */}
            <div className={styles["community-info__stats"]}>
              <div className={styles["community-info__stat"]}>
                <span
                  className={`${styles["community-info__stat-value"]} typography-desktop-title-medium`}
                >
                  {activeScope.totalCompletions}
                </span>
                <span
                  className={`${styles["community-info__stat-label"]} typography-desktop-label-medium`}
                >
                  {t("communityInfo.totalCompletions")}
                </span>
              </div>
              <div className={styles["community-info__stat"]}>
                <span
                  className={`${styles["community-info__stat-value"]} typography-desktop-title-medium`}
                >
                  {activeScope.uniqueUsers}
                </span>
                <span
                  className={`${styles["community-info__stat-label"]} typography-desktop-label-medium`}
                >
                  {t("communityInfo.uniqueUsers")}
                </span>
              </div>
            </div>
            {scopeData.hasClubScope && (
              <div className={styles["community-info__filter"]}>
                <button
                  type="button"
                  className={`${styles["community-info__filter-button"]} ${
                    scope === "all"
                      ? styles["community-info__filter-button--active"]
                      : ""
                  }`}
                  onClick={() => handleScopeChange("all")}
                >
                  {getScopeLabel("all")}
                </button>
                <button
                  type="button"
                  className={`${styles["community-info__filter-button"]} ${
                    scope === "club"
                      ? styles["community-info__filter-button--active"]
                      : ""
                  }`}
                  onClick={() => handleScopeChange("club")}
                >
                  {getScopeLabel("club")}
                </button>
              </div>
            )}

            {/* Current User Status */}
            {communityInfo.current_user && (
              <div className={styles["community-info__current-user-wrapper"]}>
                <div className={styles["community-info__current-user"]}>
                  <span className="typography-desktop-body-medium">
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
                <div className={styles["community-info__actions"]}>
                  <button
                    className={`${styles["community-info__add-btn"]} typography-desktop-label-medium`}
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
                      className={styles["community-info__delete-btn"]}
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

            {/* Users Section */}
            {activeScope.users.length > 0 && (
              <div className={styles["community-info__section"]}>
                <div
                  className={`${styles["community-info__section-title"]} typography-desktop-body-medium`}
                >
                  {t("communityInfo.completedBy")}
                </div>
                <div
                  className={styles["community-info__users"]}
                  style={
                    !showAllUsers
                      ? { maxHeight: "192px", overflow: "hidden" }
                      : {}
                  }
                >
                  {displayedUsers.map(
                    (user: PeakCommunityUser, index: number) => (
                      <div
                        key={`${user.id}-${index}`}
                        className={styles["community-info__user-item"]}
                        onClick={() => handleUserClick(user.id)}
                      >
                        <div className={`${styles["community-info__user-avatar"]} typography-desktop-label-medium`}>
                          {user.image ? (
                            <img
                              src={user.image}
                              alt={user.name}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = user.name
                                    .charAt(0)
                                    .toUpperCase();
                                }
                              }}
                            />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className={styles["community-info__user-info"]}>
                          <span
                            className={`${styles["community-info__user-name"]} typography-desktop-body-medium`}
                          >
                            {user.name}
                          </span>
                          <div
                            className={`${styles["community-info__user-completions"]} typography-desktop-label-small`}
                          >
                            <MountainIcon size={12} />
                            {user.completion_count}{" "}
                            {user.completion_count === 1
                              ? t("communityInfo.timeSingle")
                              : t("communityInfo.timePlural")}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
                {hasMoreUsers && (
                  <button
                    className={`${styles["community-info__expand-button"]} typography-desktop-body-small`}
                    onClick={() => {
                      trackSectionEvent(
                        "interaction",
                        showAllUsers ? "users_collapse" : "users_expand"
                      );
                      setShowAllUsers(!showAllUsers);
                    }}
                  >
                    {showAllUsers ? (
                      <>
                        {t("common.showLess")}
                        <ChevronUp size={16} />
                      </>
                    ) : (
                      <>
                        {t("communityInfo.seeMore")} (
                        {activeScope.users.length - INITIAL_USERS_SHOWN}{" "}
                        {t("communityInfo.more")})
                        <ChevronDown size={16} />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Routes Section */}
            {activeScope.routes.length > 0 && (
              <div className={styles["community-info__section"]}>
                <div
                  className={`${styles["community-info__section-title"]} typography-desktop-body-medium`}
                >
                  {t("communityInfo.routes") || "Routes"}
                </div>
                <div className={styles["community-info__routes"]}>
                  {displayedRoutes.map((route: PeakCommunityRoute) => (
                    <div
                      key={route.id}
                      className={styles["community-info__route-item"]}
                      onClick={() => handleRouteClick(route.id)}
                    >
                      {/* Image on the left */}
                      <div className={styles["community-info__route-image"]}>
                        {route.image && !imgErrors.has(route.id) ? (
                          <img
                            src={route.image}
                            alt={route.name}
                            className={
                              styles["community-info__route-image-img"]
                            }
                            onError={() =>
                              setImgErrors(
                                (prev) =>
                                  new Set([...Array.from(prev), route.id])
                              )
                            }
                          />
                        ) : (
                          <div
                            className={
                              styles["community-info__route-image-placeholder"]
                            }
                            aria-hidden="true"
                          >
                            <Route size={48} />
                          </div>
                        )}
                      </div>
                      {/* Content on the right */}
                      <div className={styles["community-info__route-content"]}>
                        {/* Header row with name, date, and user */}
                        <div className={styles["community-info__route-header"]}>
                          <div
                            className={`${styles["community-info__route-name"]} typography-desktop-body-medium`}
                          >
                            {route.name}
                          </div>
                          <div
                            className={
                              styles["community-info__route-header-right"]
                            }
                          >
                            {route.date && (
                              <div
                                className={styles["community-info__route-date"]}
                              >
                                <span className="typography-desktop-label-small">
                                  {new Date(route.date).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {route.user && (
                              <div
                                className={styles["community-info__route-user"]}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUserClick(route.user!.id);
                                }}
                              >
                                <div
                                  className={`${styles["community-info__route-user-avatar"]} typography-button-small`}
                                >
                                  {route.user.image ? (
                                    <img
                                      src={route.user.image}
                                      alt={route.user.name}
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.style.display = "none";
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = route
                                            .user!.name.charAt(0)
                                            .toUpperCase();
                                        }
                                      }}
                                    />
                                  ) : (
                                    route.user.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <span
                                  className={`${styles["community-info__route-user-name"]} typography-desktop-label-small`}
                                >
                                  {route.user.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Stats with labels */}
                        <div className={styles["community-info__route-stats"]}>
                          <div className={styles["community-info__route-stat"]}>
                            <div
                              className={
                                styles["community-info__route-stat-label"]
                              }
                            >
                              <Route size={12} />
                              <span className="typography-desktop-label-small">
                                {t("userStats.metrics.distance")}
                              </span>
                            </div>
                            <span className="typography-desktop-body-small">
                              {formatDistance(route.distance)}
                            </span>
                          </div>
                          <div className={styles["community-info__route-stat"]}>
                            <div
                              className={
                                styles["community-info__route-stat-label"]
                              }
                            >
                              <TrendingUp size={12} />
                              <span className="typography-desktop-label-small">
                                {t("userStats.metrics.elevationGain")}
                              </span>
                            </div>
                            <span className="typography-desktop-body-small">
                              {route.elevation_gain != null
                                ? formatElevationGain(route.elevation_gain)
                                : "—"}
                            </span>
                          </div>
                          <div className={styles["community-info__route-stat"]}>
                            <div
                              className={
                                styles["community-info__route-stat-label"]
                              }
                            >
                              <Clock size={12} />
                              <span className="typography-desktop-label-small">
                                {t("userStats.metrics.totalTime")}
                              </span>
                            </div>
                            <span className="typography-desktop-body-small">
                              {formatTime(route.time)}
                            </span>
                          </div>
                          <div className={styles["community-info__route-stat"]}>
                            <div
                              className={
                                styles["community-info__route-stat-label"]
                              }
                            >
                              <MountainIcon size={12} />
                              <span className="typography-desktop-label-small">
                                {t("communityInfo.peaks")}
                              </span>
                            </div>
                            <span className="typography-desktop-body-small">
                              {route.number_of_peaks}
                            </span>
                          </div>
                        </div>
                        {route.peaks && route.peaks.length > 0 && (
                          <div
                            className={styles["community-info__route-peaks"]}
                          >
                            {route.peaks.slice(0, 5).map((peak, idx) => (
                              <span
                                key={idx}
                                className={`${styles["community-info__route-peak"]} typography-desktop-label-small`}
                              >
                                {peak.name}
                                {peak.elevation != null &&
                                  ` (${formatElevation(peak.elevation)})`}
                                {idx < Math.min(route.peaks.length, 5) - 1 && ", "}
                              </span>
                            ))}
                            {route.peaks.length > 5 && (
                              <span
                                className={`${styles["community-info__route-peak"]} typography-desktop-label-small`}
                              >
                                {" "}
                                and {route.peaks.length - 5} peaks more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {hasMoreRoutes && (
                  <button
                    className={`${styles["community-info__expand-button"]} typography-desktop-body-small`}
                    onClick={() => {
                      trackSectionEvent(
                        "interaction",
                        showAllRoutes ? "routes_collapse" : "routes_expand"
                      );
                      handleShowMoreRoutes();
                    }}
                  >
                    {showAllRoutes ? (
                      <>
                        {t("common.showLess")}
                        <ChevronUp size={16} />
                      </>
                    ) : (
                      <>
                        {t("communityInfo.seeMore")} (
                        {activeScope.routes.length - INITIAL_ROUTES_SHOWN}{" "}
                        {t("communityInfo.more")})
                        <ChevronDown size={16} />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Manual Peak Modals */}
        <AnimatePresence>
          {showRouteExistenceModal && (
            <DesktopRouteExistenceConfirmation
              peakName={communityInfo?.peak_name || ""}
              onHasRoute={() => handleRouteExistenceConfirmation(true)}
              onNoRoute={() => handleRouteExistenceConfirmation(false)}
              onClose={() => setShowRouteExistenceModal(false)}
              t={t}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRouteSelectionModal && peakId && (
            <DesktopRouteSelectionModal
              peakId={peakId}
              peakName={communityInfo?.peak_name || ""}
              onSelectRoute={handleRouteSelection}
              onClose={() => setShowRouteSelectionModal(false)}
            />
          )}
        </AnimatePresence>

        <DesktopConfirmationModal
          isOpen={showDeleteModal}
          title={t("userPeaks.deleteConfirmation.title")}
          message={t("userPeaks.deleteConfirmation.message", { peakName: communityInfo?.peak_name })}
          confirmLabel={t("userPeaks.deleteConfirmation.confirm")}
          cancelLabel={t("userPeaks.deleteConfirmation.cancel")}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDanger={true}
        />

      </div>
    </ShimmerWrapper>
  );
};

export default CommunityInfo;
