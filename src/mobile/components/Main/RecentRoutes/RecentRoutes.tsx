import React, { useEffect, useRef, useState } from "react";
import {
  Route,
  Users,
  MoreVertical,
} from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../shared/context/AuthContext";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import {
  getRecentFollowingRoutes,
  getRecentUserRoutes,
} from "../../../../shared/api/endpoints/user";
import { getRecentCommunityRoutes } from "../../../../shared/api/endpoints/routes";
import LoginRequiredPopup from "../../LoginRequiredPopup/LoginRequiredPopup";
import HomeHeader from "../HomeHeader/HomeHeader";
import ReportBlockPopup from "../../ReportBlockPopup/ReportBlockPopup";
import {
  getUserDisplayInfo,
  isUserBlocked,
} from "../../../../shared/utils/blockReportUtils";
import styles from "./RecentRoutes.module.css";
import { LeafletRouteMap } from "../../../../shared/components/LeafletRouteMap";

interface RecentCommunityRoute {
  id: number;
  name: string;
  route_id: string;
  activity_type: string;
  distance: number;
  elevation_gain: number;
  time: string; // HH:MM:SS format
  moving_time: string; // HH:MM:SS format
  date: string;
  route_url: string;
  device_model?: string;
  user: {
    id: number;
    name: string;
    image: string;
  };
  images: Array<{
    url: string;
    order: number;
  }>;
  peaks_count: number;
  coordinates?: {
    type: "LineString";
    coordinates: [number, number][];
  };
  peaks?: Array<{
    id: number;
    name: string;
    name_en: string;
    elevation: number;
    image: string;
    lat: number;
    lng: number;
  }>;
}

interface RecentFollowingRoute {
  id: number;
  name: string;
  route_id: string;
  activity_type: string;
  distance: number;
  elevation_gain: number;
  time: string; // HH:MM:SS format
  moving_time: string; // HH:MM:SS format
  date: string;
  route_url: string;
  device_model?: string;
  user: {
    id: number;
    name: string;
    image: string;
  };
  images: Array<{
    url: string;
    order: number;
  }>;
  peaks_count: number;
  coordinates?: {
    type: "LineString";
    coordinates: [number, number][];
  };
  peaks?: Array<{
    id: number;
    name: string;
    name_en: string;
    elevation: number;
    image: string;
    lat: number;
    lng: number;
  }>;
}


interface RecentRoutesProps {
  onRoutePress?: (route: RecentCommunityRoute | RecentFollowingRoute) => void;
  refreshTrigger?: number;
}

const RecentRoutes: React.FC<RecentRoutesProps> = ({
  onRoutePress,
  refreshTrigger,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatDistance, formatElevationGain } = useUnitFormat();
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<
    "community" | "following" | "user"
  >(() => {
    const saved = localStorage.getItem("recentRoutes_filterMode") as any;
    if (!user && (saved === "following" || saved === "user")) {
      return "community";
    }
    return saved || "community";
  });
  const [routes, setRoutes] = useState<
    (RecentCommunityRoute | RecentFollowingRoute)[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showReportBlockPopup, setShowReportBlockPopup] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<
    (RecentCommunityRoute | RecentFollowingRoute) | null
  >(null);
  const hasInitializedRefreshEffectRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  // Fetch data based on current mode
  const fetchData = async () => {
    const requestId = ++latestRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      let fetchedRoutes: (RecentCommunityRoute | RecentFollowingRoute)[] = [];
      if (filterMode === "community") {
        const response = await getRecentCommunityRoutes();
        fetchedRoutes = response.routes || [];
        console.log("ewqeqwewqe qeq12312", fetchedRoutes)
      } else if (filterMode === "following") {
        const response = await getRecentFollowingRoutes();
        fetchedRoutes = response.routes || [];
      } else if (filterMode === "user") {
        const response = await getRecentUserRoutes();
        fetchedRoutes = response.routes || [];
      }
      // Don't filter - show all routes, but mark blocked users
      if (requestId === latestRequestIdRef.current) {
        setRoutes(fetchedRoutes);
      }
    } catch (err) {
      console.error("Error fetching routes:", err);
      if (requestId === latestRequestIdRef.current) {
        setError("Failed to load routes");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Handle filter mode change
  const handleFilterChange = (mode: string) => {
    const typedMode = mode as "community" | "following" | "user";
    if (!user && (typedMode === "following" || typedMode === "user")) {
      // User is not authenticated and trying to switch to following/user mode
      setShowLoginPopup(true);
      return;
    }
    setFilterMode(typedMode);
    localStorage.setItem("recentRoutes_filterMode", typedMode);
  };

  // Get filter display name
  const getFilterDisplayName = (
    mode: "community" | "following" | "user"
  ): string => {
    switch (mode) {
      case "community":
        return t("recentRoutes.filter.community") || "Community";
      case "following":
        return t("recentRoutes.filter.following") || "Following";
      case "user":
        return t("recentRoutes.filter.user") || "You";
      default:
        return "Community";
    }
  };

  // Prepare dropdown options for HomeHeader
  const dropdownOptions = [
    { value: "community", label: getFilterDisplayName("community") },
    { value: "following", label: getFilterDisplayName("following") },
    { value: "user", label: getFilterDisplayName("user") },
  ];

  // Fetch data when mode changes
  useEffect(() => {
    fetchData();
  }, [filterMode]);

  // Fetch data when refresh trigger changes
  useEffect(() => {
    if (!hasInitializedRefreshEffectRef.current) {
      hasInitializedRefreshEffectRef.current = true;
      return;
    }
    if (refreshTrigger !== undefined) {
      void fetchData();
    }
  }, [refreshTrigger]);

  // Handle user info click navigation
  const handleUserInfoClick = (userId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent route card click
    // Check if user is trying to view their own profile
    if (user && user.internalUserId === userId) {
      navigate("/profile");
    } else {
      navigate(`/externalprofile/${userId}`);
    }
  };

  const handleRouteClick = (
    route: RecentCommunityRoute | RecentFollowingRoute
  ) => {
    if (onRoutePress) {
      onRoutePress(route);
    } else {
      // Navigate to the route details page
      navigate(`/routes/${route.id}`);
    }
  };

  const handleReportBlockClick = (
    route: RecentCommunityRoute | RecentFollowingRoute,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setSelectedRoute(route);
    setShowReportBlockPopup(true);
  };

  const handleBlockChange = () => {
    // Refilter routes after blocking/unblocking
    fetchData();
  };


  if (error) {
    return (
      <div className={styles["recent-routes"]}>
        <HomeHeader
          title={t("recentRoutes.title")}
          subtitle={t("recentRoutes.subtitle")}
          rightContent={{
            type: "dropdown",
            dropdownOptions,
            selectedValue: filterMode,
            onDropdownChange: handleFilterChange,
          }}
        />
        <div
          className={`${styles["recent-routes__error"]} typography-body-small`}
        >
          <Route size={24} color="rgb(71, 85, 105)" />
          <p className="typography-body-medium">{error}</p>
        </div>
      </div>
    );
  }

  const showInitialSkeleton = loading && routes.length === 0;
  const showRefreshOverlay = loading && routes.length > 0;

  return (
    <div className={styles["recent-routes"]}>
      <HomeHeader
        title={t("recentRoutes.title")}
        subtitle={t("recentRoutes.subtitle")}
        rightContent={{
          type: "dropdown",
          dropdownOptions,
          selectedValue: filterMode,
          onDropdownChange: handleFilterChange,
        }}
      />

      <div className={styles["recent-routes__container"]}>
        <div className={styles["recent-routes__scroll"]}>
          {showInitialSkeleton ? (
            [0, 1, 2].map((i) => (
              <div key={i} className={styles["recent-routes__skeleton-card"]}>
                <div className={styles["recent-routes__skeleton-header"]}>
                  <div className={styles["recent-routes__skeleton-avatar"]} />
                  <div className={styles["recent-routes__skeleton-user-lines"]}>
                    <div className={styles["recent-routes__skeleton-user-name"]} />
                    <div className={styles["recent-routes__skeleton-activity"]} />
                  </div>
                </div>
                <div className={styles["recent-routes__skeleton-title"]} />
                <div className={styles["recent-routes__skeleton-image"]} />
              </div>
            ))
          ) : routes.length === 0 ? (
            <div className={styles["recent-routes__empty"]}>
              <div className={styles["recent-routes__empty-icon"]}>
                <Route size={32} color="rgb(71, 85, 105)" />
                <Users
                  size={16}
                  className={styles["recent-routes__floating-icon"]}
                  color="#c2cf94"
                />
              </div>
              <h3 className="typography-title-medium">No Recent Activity</h3>
              <p className="typography-body-medium">
                Check back later for recent route completions!
              </p>
            </div>
          ) : (
            <>
              {routes.map((route) => (
                <div
                  key={route.id}
                  className={styles["recent-routes__card"]}
                  onClick={() => handleRouteClick(route)}
                >
                  {/* Route content */}
                  <div className={styles["recent-routes__content"]}>
                    {/* Header with user and date */}
                    <div className={styles["recent-routes__header-row"]}>
                      <div
                        className={styles["recent-routes__user-info"]}
                        onClick={(e) => handleUserInfoClick(route.user.id, e)}
                      >
                        {(() => {
                          const userInfo = getUserDisplayInfo(
                            route.user.id,
                            route.user.name,
                            route.user.image,
                            t
                          );
                          const isBlocked = isUserBlocked(route.user.id);
                          return (
                            <>
                              {userInfo.image &&
                              !avatarErrors.has(route.user.id) &&
                              !isBlocked ? (
                                <img
                                  src={userInfo.image}
                                  alt={userInfo.name}
                                  className={
                                    styles["recent-routes__user-avatar"]
                                  }
                                  onError={() =>
                                    setAvatarErrors(
                                      (prev) =>
                                        new Set([
                                          ...Array.from(prev),
                                          route.user.id,
                                        ])
                                    )
                                  }
                                />
                              ) : (
                                <div
                                  className={
                                    styles[
                                      isBlocked
                                        ? "recent-routes__user-avatar-placeholder"
                                        : "recent-routes__user-avatar-placeholder"
                                    ]
                                  }
                                >
                                  {isBlocked
                                    ? "?"
                                    : userInfo.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div
                                className={styles["recent-routes__user-details"]}
                              >
                                <span
                                  className={`${styles["recent-routes__user-name"]} typography-title-small`}
                                >
                                  {userInfo.name}
                                </span>
                                <span
                                  className={`${styles["recent-routes__activity-type"]} typography-body-small`}
                                >
                                    {route.activity_type}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className={styles["recent-routes__header-actions"]}>
                        <div className={styles["recent-routes__date"]}>
                          <span className="typography-label-medium">
                            {new Date(route.date).toLocaleDateString()}
                          </span>
                        </div>
                        {(!user || user.internalUserId !== route.user.id) && (
                          <button
                            className={styles["recent-routes__more-button"]}
                            onClick={(e) => handleReportBlockClick(route, e)}
                            aria-label="Report or block"
                          >
                            <MoreVertical size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Route name */}
                    <h3
                      className={`${styles["recent-routes__name"]} typography-title-medium`}
                    >
                      {isUserBlocked(route.user.id)
                        ? t("reportBlock.blockedRoute")
                        : route.name}
                    </h3>
                    <div className={styles["recent-routes__secondsection"]}>
                      {/* Route image */}
                      <div className={styles["recent-routes__image-section"]}>
                        {route.images &&
                        route.images.length > 0 &&
                        route.images[0]?.url &&
                        !imgErrors.has(route.id) ? (
                          <img
                            src={route.images[0].url}
                            alt={route.name}
                            className={styles["recent-routes__image"]}
                            onError={() =>
                              setImgErrors(
                                (prev) =>
                                  new Set([...Array.from(prev), route.id])
                              )
                            }
                          />
                        ) : route.coordinates &&
                          route.coordinates.coordinates &&
                          route.coordinates.coordinates.length > 0 ? (
                          <div className={styles["recent-routes__image"]}>
                            <LeafletRouteMap coordinates={route.coordinates} peaks={route.peaks ?? []} />
                          </div>
                        ) : route.peaks && route.peaks.length > 0 && route.peaks[0]?.lat != null ? (
                          <div className={styles["recent-routes__image"]}>
                            <LeafletRouteMap peaks={route.peaks ?? []} />
                          </div>
                        ) : (
                          <div
                            className={
                              styles["recent-routes__image-placeholder"]
                            }
                          >
                            <Route
                              size={32}
                              color="rgb(71, 85, 105)"
                            />
                          </div>
                        )}

                        {/* Stats Overlay on Image */}
                        {!isUserBlocked(route.user.id) && (
                          <div className={styles["recent-routes__stats-overlay"]}>
                            <div className={styles["recent-routes__stat-item"]}>
                              <span className={`${styles["recent-routes__stat-label"]} typography-button-small`}>
                                {t("recentRoutes.distance")}
                              </span>
                              <span className={`${styles["recent-routes__stat-value"]} typography-title-small`}>
                                {formatDistance(Number(route.distance))}
                              </span>
                            </div>
                            <div className={styles["recent-routes__stat-divider"]} />
                            <div className={styles["recent-routes__stat-item"]}>
                              <span className={`${styles["recent-routes__stat-label"]} typography-button-small`}>
                                {t("recentRoutes.elevationGain")}
                              </span>
                              <span className={`${styles["recent-routes__stat-value"]} typography-title-small`}>
                                {route.elevation_gain != null
                                  ? formatElevationGain(route.elevation_gain)
                                  : "—"}
                              </span>
                            </div>
                            <div className={styles["recent-routes__stat-divider"]} />
                            <div className={styles["recent-routes__stat-item"]}>
                              <span className={`${styles["recent-routes__stat-label"]} typography-button-small`}>
                                {t("recentRoutes.peaks")}
                              </span>
                              <span className={`${styles["recent-routes__stat-value"]} typography-title-small`}>
                                {route.peaks_count || 0}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Shimmer skeleton loading */}
          {showRefreshOverlay && (
            <div className={styles["recent-routes__loading-overlay"]}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles["recent-routes__skeleton-card"]}>
                  <div className={styles["recent-routes__skeleton-header"]}>
                    <div className={styles["recent-routes__skeleton-avatar"]} />
                    <div className={styles["recent-routes__skeleton-user-lines"]}>
                      <div className={styles["recent-routes__skeleton-user-name"]} />
                      <div className={styles["recent-routes__skeleton-activity"]} />
                    </div>
                  </div>
                  <div className={styles["recent-routes__skeleton-title"]} />
                  <div className={styles["recent-routes__skeleton-image"]} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLoginPopup && (
        <LoginRequiredPopup
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
          message="auth.loginRequired.followingMode"
        />
      )}

      {showReportBlockPopup && selectedRoute && (
        <ReportBlockPopup
          isOpen={showReportBlockPopup}
          onClose={() => {
            setShowReportBlockPopup(false);
            setSelectedRoute(null);
          }}
          userId={selectedRoute.user.id}
          userName={selectedRoute.user.name}
          contentType="route"
          contentId={selectedRoute.id}
          onBlockChange={handleBlockChange}
        />
      )}
    </div>
  );
};

export default RecentRoutes;
