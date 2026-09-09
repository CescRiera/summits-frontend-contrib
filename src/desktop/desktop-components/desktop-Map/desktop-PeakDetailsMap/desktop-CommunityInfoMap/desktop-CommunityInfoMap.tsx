import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./desktop-CommunityInfoMap.module.css";
import { getPeakCommunityInfo } from "../../../../../shared/api/endpoints/peaks";
import type {
  PeakCommunityInfo,
  PeakCommunityUser,
  PeakCommunityRoute,
  PeakCommunityPagination,
} from "../../../../../shared/api/types";
import {
  Users,
  ChevronRight,
  X,
  Route,
  Clock,
  TrendingUp,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import MountainIcon from "../../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../../shared/context/I18nContext";
import AppModal from "../../../../../shared/components/AppModal";
import { useNavigate } from "react-router-dom";
import { useUnitFormat } from "../../../../../shared/hooks/useUnitFormat";
import { smoothScrollHorizontal } from "../../../../../desktop/desktop-utils/desktop-smoothScroll";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../../shared/hooks/usePeakDetailsAnalytics";
import {
  resolveCommunityInfoScope,
  type CommunityInfoScope,
} from "../../../../../shared/utils/communityInfoFilter";

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
        <h3 className={`${styles["modalTitle"]} typography-desktop-label-medium`}>
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
              className={`${styles["modalStatLabel"]} typography-desktop-label-large`}
            >
              {t("communityInfo.totalCompletions")}
            </span>
          </div>
          <div className={styles["modalStat"]}>
            <span className={styles["modalStatValue"]}>
              {scopeData.active.uniqueUsers}
            </span>
            <span
              className={`${styles["modalStatLabel"]} typography-desktop-label-large`}
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
                    className={`${styles["modalUserName"]} typography-desktop-label-medium`}
                  >
                    {user.name}
                  </span>
                  <div className={styles["modalUserDetails"]}>
                    <span
                      className={`${styles["modalUserCompletions"]} typography-desktop-label-medium`}
                    >
                      <MountainIcon size={12} />
                      {user.completion_count}{" "}
                      {user.completion_count === 1
                        ? t("communityInfo.timeSingle")
                        : t("communityInfo.timePlural")}
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

const CommunityInfoMap: React.FC<CommunityInfoProps> = ({ peakId }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop_map",
    "community_info",
    peakId
  );
  const [communityInfo, setCommunityInfo] = useState<PeakCommunityInfo | null>(
    null
  );
  const [showUserModal, setShowUserModal] = useState(false);
  const [scope, setScope] = useState<CommunityInfoScope>("all");
  const { formatDistance, formatElevationGain, formatMeters: formatElevation } = useUnitFormat();
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const routesScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [loadingMoreRoutes, setLoadingMoreRoutes] = useState(false);
  const [pagination, setPagination] = useState<PeakCommunityPagination | null>(null);
  const hideArrowTimeoutRef = useRef<{
    left: NodeJS.Timeout | null;
    right: NodeJS.Timeout | null;
  }>({ left: null, right: null });

  useEffect(() => {
    if (!peakId) return;

    getPeakCommunityInfo(peakId, 1, 20)
      .then((data) => {
        setCommunityInfo(data);
        setPagination(data.pagination ?? null);
      })
      .catch(() => {});
  }, [peakId]);

  const scopeData = resolveCommunityInfoScope(communityInfo, scope);
  const activeScope = scopeData.active;

  useEffect(() => {
    if (scope === "club" && !scopeData.hasClubScope) {
      setScope("all");
    }
  }, [scope, scopeData.hasClubScope]);

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

  // Check scroll position for routes scroll
  const checkScrollPosition = () => {
    if (!routesScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } =
      routesScrollRef.current;
    const canScrollLeftNow = scrollLeft > 0;
    const canScrollRightNow = scrollLeft < scrollWidth - clientWidth - 1;

    // Clear existing timeouts
    if (hideArrowTimeoutRef.current.left) {
      clearTimeout(hideArrowTimeoutRef.current.left);
      hideArrowTimeoutRef.current.left = null;
    }
    if (hideArrowTimeoutRef.current.right) {
      clearTimeout(hideArrowTimeoutRef.current.right);
      hideArrowTimeoutRef.current.right = null;
    }

    // If can scroll, show immediately
    if (canScrollLeftNow) {
      setCanScrollLeft(true);
    } else {
      // If can't scroll, hide after 1 second
      hideArrowTimeoutRef.current.left = setTimeout(() => {
        setCanScrollLeft(false);
      }, 1000);
    }

    if (canScrollRightNow) {
      setCanScrollRight(true);
    } else {
      // If can't scroll, hide after 1 second
      hideArrowTimeoutRef.current.right = setTimeout(() => {
        setCanScrollRight(false);
      }, 1000);
      // Trigger loading more routes when near the end
      if (pagination?.has_next && !loadingMoreRoutes) {
        loadMoreRoutes();
      }
    }
  };

  useEffect(() => {
    if (!routesScrollRef.current || activeScope.routes.length === 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    checkScrollPosition();
    const scrollElement = routesScrollRef.current;
    scrollElement.addEventListener("scroll", checkScrollPosition);
    window.addEventListener("resize", checkScrollPosition);
    return () => {
      scrollElement.removeEventListener("scroll", checkScrollPosition);
      window.removeEventListener("resize", checkScrollPosition);
      // Clear timeouts on cleanup
      if (hideArrowTimeoutRef.current.left) {
        clearTimeout(hideArrowTimeoutRef.current.left);
      }
      if (hideArrowTimeoutRef.current.right) {
        clearTimeout(hideArrowTimeoutRef.current.right);
      }
    };
  }, [activeScope.routes, pagination, loadingMoreRoutes, loadMoreRoutes]);

  const scrollRoutes = (direction: "left" | "right") => {
    trackSectionEvent("button_click", `scroll_${direction}`);
    smoothScrollHorizontal(routesScrollRef.current, direction);
  };

  usePeakDetailsView(
    "desktop_map",
    "community_info",
    Boolean(
      communityInfo &&
        (scopeData.all.users.length > 0 || scopeData.all.routes.length > 0)
    ),
    peakId
  );

  return (
    <section className={styles["communityInfo"]}>
      <h3
        className={`${styles["communityInfo__title"]} typography-desktop-body-small`}
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
                className={`${styles["communityInfo__statLabel"]} typography-desktop-label-large`}
              >
                {t("communityInfo.totalCompletions")}
              </span>
            </div>
            <div className={styles["communityInfo__stat"]}>
              <span className={styles["communityInfo__statValue"]}>
                {activeScope.uniqueUsers}
              </span>
              <span
                className={`${styles["communityInfo__statLabel"]} typography-desktop-label-large`}
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
            <div className={styles["communityInfo__currentUser"]}>
              <div className={styles["communityInfo__currentUserInfo"]}>
                <div className={styles["communityInfo__currentUserStatus"]}>
                  <span className="typography-desktop-label-medium">
                    {communityInfo.current_user.completed ? (
                      <>
                        {t("communityInfo.youHaveCompleted")}{" "}
                        <strong className="typography-desktop-label-medium">
                          {communityInfo.peak_name}
                        </strong>{" "}
                        <strong className="typography-desktop-label-medium">
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
              </div>
            </div>
          )}

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
                      className={`${styles["communityInfo__userName"]} typography-desktop-label-medium`}
                    >
                      {user.name}
                    </span>
                    <div className={styles["communityInfo__userDetails"]}>
                      <span
                        className={`${styles["communityInfo__userCompletions"]} typography-desktop-label-medium`}
                      >
                        <MountainIcon size={12} /> {user.completion_count}{" "}
                        {user.completion_count === 1
                          ? t("communityInfo.timeSingle")
                          : t("communityInfo.timePlural")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>

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
                className={`${styles["communityInfo__routes-title"]} typography-desktop-title-small`}
              >
                <Route size={18} />
                {t("communityInfo.routes") || "Routes"}
              </div>
              <div className={styles["communityInfo__routes-scroll-container"]}>
                {canScrollLeft && (
                  <button
                    className={`${styles["communityInfo__routes-scroll-arrow"]} ${styles["communityInfo__routes-scroll-arrow--left"]}`}
                    onClick={() => scrollRoutes("left")}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                {canScrollRight && (
                  <button
                    className={`${styles["communityInfo__routes-scroll-arrow"]} ${styles["communityInfo__routes-scroll-arrow--right"]}`}
                    onClick={() => scrollRoutes("right")}
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
                <div
                  className={styles["communityInfo__routes-scroll"]}
                  ref={routesScrollRef}
                >
                {activeScope.routes.map((route: PeakCommunityRoute) => (
                  <div
                    key={route.id}
                    className={styles["communityInfo__route-card"]}
                    onClick={() => handleRouteClick(route.id)}
                  >
                    <div className={styles["communityInfo__route-image"]}>
                      {route.image && !imgErrors.has(route.id) ? (
                        <img
                          src={route.image}
                          alt={route.name}
                          className={styles["communityInfo__route-image-img"]}
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
                            styles["communityInfo__route-image-placeholder"]
                          }
                          aria-hidden="true"
                        >
                          <Route size={48} />
                        </div>
                      )}
                      {/* User info - top left */}
                      {route.user && (
                        <div
                          className={styles["communityInfo__route-user"]}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserClick(route.user!.id);
                          }}
                        >
                          <div
                            className={`${styles["communityInfo__route-user-avatar"]} typography-button-small`}
                          >
                            {route.user.image ? (
                              <img
                                src={route.user.image}
                                alt={route.user.name}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
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
                            className={`${styles["communityInfo__route-user-name"]} typography-desktop-label-small`}
                          >
                            {route.user.name}
                          </span>
                        </div>
                      )}
                      {/* Date - top right */}
                      {route.date && (
                        <div className={styles["communityInfo__route-date"]}>
                          <span className="typography-desktop-label-small">
                            {new Date(route.date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={styles["communityInfo__route-content"]}>
                      <div className={styles["communityInfo__route-header"]}>
                        <div
                          className={`${styles["communityInfo__route-name"]} typography-desktop-body-small`}
                        >
                          {route.name}
                        </div>
                      </div>
                      <div className={styles["communityInfo__route-stats"]}>
                        <div className={styles["communityInfo__route-stat"]}>
                          <Route size={14} />
                          <span className="typography-desktop-label-small">
                            {formatDistance(route.distance)}
                          </span>
                        </div>
                        <div className={styles["communityInfo__route-stat"]}>
                          <TrendingUp size={14} />
                          <span className="typography-desktop-label-small">
                            {route.elevation_gain != null
                              ? formatElevationGain(route.elevation_gain)
                              : "—"}
                          </span>
                        </div>
                        <div className={styles["communityInfo__route-stat"]}>
                          <Clock size={14} />
                          <span className="typography-desktop-label-small">
                            {formatTime(route.time)}
                          </span>
                        </div>
                        <div className={styles["communityInfo__route-stat"]}>
                          <MountainIcon size={14} />
                          <span className="typography-desktop-label-small">
                            {route.number_of_peaks}
                          </span>
                        </div>
                      </div>
                      {route.peaks && route.peaks.length > 0 && (
                        <div
                          className={`${styles["communityInfo__route-peaks"]} typography-desktop-body-small`}
                        >
                          {route.peaks.slice(0, 5).map((peak, idx) => (
                            <span
                              key={idx}
                              className={`${styles["communityInfo__route-peak"]} typography-desktop-label-small`}
                            >
                              {peak.name}
                              {peak.elevation != null &&
                                ` (${formatElevation(peak.elevation)})`}
                              {idx < Math.min(route.peaks.length, 5) - 1 &&
                                ", "}
                            </span>
                          ))}
                          {route.peaks.length > 5 && (
                            <span
                              className={`${styles["communityInfo__route-peak"]} typography-desktop-label-small`}
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
                  {loadingMoreRoutes && (
                    <div className={styles["communityInfo__route-loading"]}>
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  )}
                </div>
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
    </section>
  );
};

export default CommunityInfoMap;
