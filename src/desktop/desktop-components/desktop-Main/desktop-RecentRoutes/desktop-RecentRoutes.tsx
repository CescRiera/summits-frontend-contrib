import React, { useState, useEffect, useCallback, useRef } from "react";
import { Route, Users, ChevronLeft, ChevronRight } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../shared/context/AuthContext";
import {
  formatCompactTime,
} from "../../../../mobile/utils/numberFormatting.ts";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import {
  getRecentFollowingRoutes,
  getRecentUserRoutes,
} from "../../../../shared/api/endpoints/user";
import { getRecentCommunityRoutes } from "../../../../shared/api/endpoints/routes";
import styles from "./desktop-RecentRoutes.module.css";
import { smoothScrollHorizontal } from "../../../desktop-utils/desktop-smoothScroll";
import { removeImageSizeRestriction } from "../../../../shared/utils/imageUtils";
import { MoreVertical } from "lucide-react";
import ReportBlockPopup from "../../../../mobile/components/ReportBlockPopup/ReportBlockPopup";
import {
  getUserDisplayInfo,
  isUserBlocked,
} from "../../../../shared/utils/blockReportUtils";
import {
  getElevationColor,
  getElevationIcon,
  getElevationIconMap,
} from "../../../../shared/constants/elevationColors";
import {
  createLeafletPreviewInvalidator,
  getLeafletPreviewInitialView,
  hasLeafletPreviewSize,
  waitForLeafletPreviewContainer,
} from "../../../../shared/utils/leafletPreviewLifecycle";

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
  // Initialize map ONLY ONCE
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

    // Small delay to ensure container is fully rendered
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
  }, []); // Run only once to prevent blinking
  */

  // Update map content when coordinates or peaks change
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
  filterMode: "community" | "following" | "user";
  onRoutesCountChange?: (count: number) => void;
  onScrollRef?: (ref: HTMLDivElement | null) => void;
}

const RecentRoutes: React.FC<RecentRoutesProps> = ({
  onRoutePress,
  refreshTrigger,
  filterMode,
  onRoutesCountChange,
  onScrollRef,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());
  const [routes, setRoutes] = useState<
    (RecentCommunityRoute | RecentFollowingRoute)[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const peaksScrollRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [scrollableRoutes, setScrollableRoutes] = useState<Set<number>>(
    new Set()
  );
  const [canScrollLeft, setCanScrollLeft] = useState<Map<number, boolean>>(
    new Map()
  );
  const [canScrollRight, setCanScrollRight] = useState<Map<number, boolean>>(
    new Map()
  );
  const hideArrowTimeoutRef = useRef<Map<number, { left: NodeJS.Timeout | null; right: NodeJS.Timeout | null }>>(
    new Map()
  );
  const [selectedRoute, setSelectedRoute] = useState<
    (RecentCommunityRoute | RecentFollowingRoute) | null
  >(null);
  const [showReportBlockPopup, setShowReportBlockPopup] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { formatDistance, formatElevationGain, formatMeters } = useUnitFormat();

  // Fetch data based on current mode
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (filterMode === "community") {
        const response = await getRecentCommunityRoutes();
        setRoutes(response.routes || []);
      } else if (filterMode === "following") {
        const response = await getRecentFollowingRoutes();
        setRoutes(response.routes || []);
      } else if (filterMode === "user") {
        const response = await getRecentUserRoutes();
        setRoutes(response.routes || []);
      }
    } catch (err) {
      console.error("Error fetching routes:", err);
      setError("Failed to load routes");
    } finally {
      setLoading(false);
    }
  }, [filterMode]);

  // Check scrollability function
  const checkScrollability = useCallback((routeId: number) => {
    const scrollContainer = peaksScrollRefs.current.get(routeId);
    if (scrollContainer) {
      const isScrollable =
        scrollContainer.scrollWidth > scrollContainer.clientWidth;
      setScrollableRoutes((prev) => {
        const next = new Set(prev);
        if (isScrollable) {
          next.add(routeId);
        } else {
          next.delete(routeId);
        }
        return next;
      });
    }
  }, []);

  // Check scroll position for nearby peaks scroll
  const checkScrollPosition = useCallback((routeId: number) => {
    const scrollContainer = peaksScrollRefs.current.get(routeId);
    if (!scrollContainer) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    const canScrollLeftNow = scrollLeft > 0;
    const canScrollRightNow = scrollLeft < scrollWidth - clientWidth - 1;

    // Clear existing timeouts
    const timeouts = hideArrowTimeoutRef.current.get(routeId) || { left: null, right: null };
    if (timeouts.left) {
      clearTimeout(timeouts.left);
      timeouts.left = null;
    }
    if (timeouts.right) {
      clearTimeout(timeouts.right);
      timeouts.right = null;
    }

    // If can scroll, show immediately
    if (canScrollLeftNow) {
      setCanScrollLeft((prev) => {
        const next = new Map(prev);
        next.set(routeId, true);
        return next;
      });
    } else {
      // If can't scroll, hide after 1 second
      timeouts.left = setTimeout(() => {
        setCanScrollLeft((prev) => {
          const next = new Map(prev);
          next.set(routeId, false);
          return next;
        });
      }, 1000);
    }

    if (canScrollRightNow) {
      setCanScrollRight((prev) => {
        const next = new Map(prev);
        next.set(routeId, true);
        return next;
      });
    } else {
      // If can't scroll, hide after 1 second
      timeouts.right = setTimeout(() => {
        setCanScrollRight((prev) => {
          const next = new Map(prev);
          next.set(routeId, false);
          return next;
        });
      }, 1000);
    }

    hideArrowTimeoutRef.current.set(routeId, timeouts);
  }, []);

  // Fetch data when mode changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch data when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      fetchData();
    }
  }, [refreshTrigger, fetchData]);

  // Notify parent of routes count when routes change
  useEffect(() => {
    if (onRoutesCountChange) {
      onRoutesCountChange(routes.length);
    }
  }, [routes, onRoutesCountChange]);

  // Check scrollability and scroll position after routes load and on resize
  useEffect(() => {
    const checkAllScrollability = () => {
      routes.forEach((route) => {
        if (route.peaks && route.peaks.length > 0) {
          checkScrollability(route.id);
          checkScrollPosition(route.id);
        }
      });
    };

    checkAllScrollability();

    const resizeObserver = new ResizeObserver(() => {
      checkAllScrollability();
    });

    peaksScrollRefs.current.forEach((el) => {
      resizeObserver.observe(el);
    });

    // Add scroll listeners for each route
    const scrollHandlers = new Map<number, () => void>();
    peaksScrollRefs.current.forEach((el, routeId) => {
      const handler = () => checkScrollPosition(routeId);
      el.addEventListener("scroll", handler);
      scrollHandlers.set(routeId, handler);
    });

    return () => {
      resizeObserver.disconnect();
      scrollHandlers.forEach((handler, routeId) => {
        const el = peaksScrollRefs.current.get(routeId);
        if (el) {
          el.removeEventListener("scroll", handler);
        }
      });
      // Clear all timeouts on cleanup
      hideArrowTimeoutRef.current.forEach((timeouts) => {
        if (timeouts.left) clearTimeout(timeouts.left);
        if (timeouts.right) clearTimeout(timeouts.right);
      });
      hideArrowTimeoutRef.current.clear();
    };
  }, [routes, checkScrollability, checkScrollPosition]);

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

  const formatTime = (timeString: string | null | undefined) => {
    return formatCompactTime(timeString);
  };

  const scrollPeaks = (routeId: number, direction: "left" | "right") => {
    const scrollContainer = peaksScrollRefs.current.get(routeId);
    smoothScrollHorizontal(scrollContainer ?? null, direction, 400);
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
    // Refresh routes after blocking/unblocking
    void fetchData();
  };

  if (error) {
    return (
      <div className={styles["recent-routes"]}>
        <div
          className={`${styles["recent-routes__error"]} typography-desktop-label-medium`}
        >
          <Route size={24} color="rgb(71, 85, 105)" />
          <p className="typography-desktop-body-small">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["recent-routes"]}>
      <div className={styles["recent-routes__container"]}>
        <div
          className={styles["recent-routes__scroll"]}
          ref={(ref) => {
            scrollContainerRef.current = ref;
            if (onScrollRef) {
              onScrollRef(ref);
            }
          }}
        >
          {routes.length === 0 && !loading ? (
            <div className={styles["recent-routes__empty"]}>
              <div className={styles["recent-routes__empty-icon"]}>
                <Route size={32} color="rgb(71, 85, 105)" />
                <Users
                  size={16}
                  className={styles["recent-routes__floating-icon"]}
                  color="#c2cf94"
                />
              </div>
              <h3 className="typography-desktop-body-small">
                No Recent Activity
              </h3>
              <p className="typography-desktop-body-small">
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
                                className={styles["recent-routes__user-avatar"]}
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
                                className={`${styles["recent-routes__user-avatar-placeholder"]} typography-desktop-label-large`}
                              >
                                {isBlocked
                                  ? "?"
                                  : userInfo.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className={styles["recent-routes__user-details"]}>
                              <span
                                className={`${styles["recent-routes__user-name"]} typography-desktop-title-small`}
                              >
                                {userInfo.name}
                              </span>
                              <span
                                className={`${styles["recent-routes__activity-type"]} typography-desktop-label-medium`}
                              >
                                {route.activity_type}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className={styles["recent-routes__header-right"]}>
                      <div className={styles["recent-routes__peaks-count"]}>
                        <MountainIcon
                          color="rgba(var(--rgb-black), 0.6)"
                          size={18}
                        />
                        <span className="typography-desktop-label-medium">
                          {route.peaks_count || 0}
                        </span>
                      </div>
                      <div className={styles["recent-routes__date"]}>
                        <span className="typography-desktop-label-medium">
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
                    className={`${styles["recent-routes__name"]} typography-desktop-body-small`}
                  >
                    {isUserBlocked(route.user.id)
                      ? t("reportBlock.blockedRoute")
                      : route.name}
                  </h3>

                    {/* Second section: Image on left, Stats + Peaks on right */}
                    <div
                      className={`${
                        styles["recent-routes__secondsection"]
                      } ${
                        route.peaks_count <= 1
                          ? styles["recent-routes__secondsection--compact"]
                          : ""
                      }`}
                    >
                      {/* Route image - stays on left */}
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
                      </div>

                      {/* Right section: Stats on top, Peaks on bottom */}
                      <div className={styles["recent-routes__right-section"]}>
                        {/* Stats grid - on top */}
                        {!isUserBlocked(route.user.id) ? (
                          <div className={styles["recent-routes__stats"]}>
                            <div className={styles["recent-routes__stat"]}>
                              <div
                                className={styles["recent-routes__stat-content"]}
                              >
                                <span
                                  className={`${styles["recent-routes__stat-label"]} typography-desktop-label-medium`}
                                >
                                  {t("recentRoutes.elevationGain")}
                                </span>
                                <span
                                  className={`${styles["recent-routes__stat-value"]} typography-desktop-label-medium`}
                                >
                                  {route.elevation_gain != null
                                    ? formatElevationGain(route.elevation_gain)
                                    : "—"}
                                </span>
                              </div>
                            </div>

                            <div className={styles["recent-routes__stat"]}>
                              <div
                                className={styles["recent-routes__stat-content"]}
                              >
                                <span
                                  className={`${styles["recent-routes__stat-label"]} typography-desktop-label-medium`}
                                >
                                  {t("recentRoutes.time")}
                                </span>
                                <span
                                  className={`${styles["recent-routes__stat-value"]} typography-desktop-label-medium`}
                                >
                                  {formatTime(route.time)}
                                </span>
                              </div>
                            </div>

                            <div className={styles["recent-routes__stat"]}>
                              <div
                                className={styles["recent-routes__stat-content"]}
                              >
                                <span
                                  className={`${styles["recent-routes__stat-label"]} typography-desktop-label-medium`}
                                >
                                  {t("recentRoutes.distance")}
                                </span>
                                <span
                                  className={`${styles["recent-routes__stat-value"]} typography-desktop-label-medium`}
                                >
                                  {formatDistance(Number(route.distance))}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={styles["recent-routes__blocked-placeholder"]}>
                            <span className="typography-desktop-body-small">
                              {t("reportBlock.blockedStatsMessage") || "Stats are hidden for blocked users"}
                            </span>
                          </div>
                        )}

                        {/* Peaks horizontal scroll section - on bottom */}
                        <div className={styles["recent-routes__peaks-section"]}>
                          {route.peaks && route.peaks.length > 0 ? (
                            <div className={styles["recent-routes__peaks-scroll-container"]}>
                              {scrollableRoutes.has(route.id) && canScrollLeft.get(route.id) === true && (
                                <button
                                  className={`${styles["recent-routes__peaks-nav-button"]} ${styles["recent-routes__peaks-nav-button--left"]}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    scrollPeaks(route.id, "left");
                                  }}
                                  aria-label="Scroll peaks left"
                                >
                                  <ChevronLeft size={20} />
                                </button>
                              )}
                              {scrollableRoutes.has(route.id) && canScrollRight.get(route.id) === true && (
                                <button
                                  className={`${styles["recent-routes__peaks-nav-button"]} ${styles["recent-routes__peaks-nav-button--right"]}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    scrollPeaks(route.id, "right");
                                  }}
                                  aria-label="Scroll peaks right"
                                >
                                  <ChevronRight size={20} />
                                </button>
                              )}
                              <div
                                className={`${styles["recent-routes__peaks-container"]} ${styles["recent-routes__peaks-container--scroll"]}`}
                                ref={(el) => {
                                  if (el) {
                                    peaksScrollRefs.current.set(route.id, el);
                                    // Check initial scroll position
                                    setTimeout(() => checkScrollPosition(route.id), 0);
                                  }
                                }}
                                style={{
                                  "--peaks-count": route.peaks.length,
                                } as React.CSSProperties}
                              >
                                {route.peaks.map((peak) => {
                                  const hasImage = Boolean(peak.image);
                                  const elevationIcon = getElevationIcon(
                                    peak.elevation
                                  );
                                  return (
                                    <div
                                      key={peak.id}
                                      className={
                                        styles["recent-routes__peak-card"]
                                      }
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/peaks/${peak.id}`);
                                      }}
                                      style={
                                        !hasImage
                                          ? {
                                              background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${getElevationColor(
                                                peak.elevation
                                              )}`,
                                            }
                                          : undefined
                                      }
                                    >
                                      {/* Peak image as background */}
                                      {hasImage ? (
                                        <img
                                          src={removeImageSizeRestriction(peak.image) || ""}
                                          alt={peak.name || peak.name_en}
                                          className={
                                            styles[
                                              "recent-routes__peak-card-image"
                                            ]
                                          }
                                        />
                                      ) : (
                                        <img
                                          src={elevationIcon}
                                          alt="Placeholder icon"
                                          className={
                                            styles[
                                              "recent-routes__peak-elevation-icon-bg"
                                            ]
                                          }
                                        />
                                      )}

                                      <div
                                        className={
                                          styles[
                                            "recent-routes__peak-card-content"
                                          ]
                                        }
                                      >
                                        {/* Peak name */}
                                        <div
                                          className={`${styles["recent-routes__peak-name"]} typography-desktop-body-small`}
                                        >
                                          {peak.name || peak.name_en}
                                        </div>
                                        {/* Elevation */}
                                        <div
                                          className={
                                            styles[
                                              "recent-routes__peak-elevation"
                                            ]
                                          }
                                        >
                                          <img
                                            src={elevationIcon}
                                            alt="Elevation icon"
                                            className={
                                              styles[
                                                "recent-routes__peak-elevation-icon"
                                              ]
                                            }
                                          />
                                          <span className="typography-desktop-label-medium">
                                            {peak.elevation != null
                                              ? formatMeters(peak.elevation)
                                              : "—"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`${styles["recent-routes__no-peaks-card"]} typography-desktop-body-small`}
                            >
                              {t("userRoutes.noPeaksOnRoute")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Shimmer skeleton loading */}
          {loading && (
            <div className={styles["recent-routes__loading-overlay"]}>
              {[0, 1].map((i) => (
                <div key={i} className={styles["recent-routes__skeleton-card"]}>
                  <div className={styles["recent-routes__skeleton-header"]}>
                    <div className={styles["recent-routes__skeleton-avatar"]} />
                    <div className={styles["recent-routes__skeleton-user-lines"]}>
                      <div className={styles["recent-routes__skeleton-user-name"]} />
                      <div className={styles["recent-routes__skeleton-activity"]} />
                    </div>
                  </div>
                  <div className={styles["recent-routes__skeleton-title"]} />
                  <div className={styles["recent-routes__skeleton-body"]}>
                    <div className={styles["recent-routes__skeleton-image"]} />
                    <div className={styles["recent-routes__right-section"]}>
                      <div className={styles["recent-routes__skeleton-stats"]}>
                        <div className={styles["recent-routes__skeleton-stat"]} />
                        <div className={styles["recent-routes__skeleton-stat"]} />
                        <div className={styles["recent-routes__skeleton-stat"]} />
                      </div>
                      <div className={styles["recent-routes__skeleton-peaks"]}>
                        <div className={styles["recent-routes__skeleton-peak"]} />
                        <div className={styles["recent-routes__skeleton-peak"]} />
                        <div className={styles["recent-routes__skeleton-peak"]} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
