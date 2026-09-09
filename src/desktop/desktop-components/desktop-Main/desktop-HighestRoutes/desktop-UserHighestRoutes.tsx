import React, { useCallback, useEffect, useRef, useState } from "react";
import { Trophy, Clock, MapPin, Route, Crown, TrendingUp } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import {
  formatCompactTime,
} from "../../../../mobile/utils/numberFormatting.ts";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import HomeHeader from "../desktop-HomeHeader/desktop-HomeHeader.tsx";
import styles from "./desktop-UserHighestRoutes.module.css";
import { getElevationIconMap } from "../../../../shared/constants/elevationColors";
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

interface HighestRoute {
  id: string;
  name: string;
  date: string;
  elevation_gain: number;
  time: string;
  time_seconds: number;
  distance: number;
  activity_type: string;
  device_model?: string;
  image: {
    url: string;
    order: number;
  };
  difficulty_score: number;
  distance_km: number;
  elevation_gain_m: number;
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

interface UserHighestRoutesProps {
  routes: HighestRoute[];
  loading?: boolean;
  error?: string | null;
  onRoutePress?: (route: HighestRoute) => void;
}

const UserHighestRoutes: React.FC<UserHighestRoutesProps> = ({
  routes,
  loading = false,
  error = null,
  onRoutePress,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { formatDistance, formatElevationGain } = useUnitFormat();
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div
        className={`${styles["user-highest-routes__section"]} ${styles["user-highest-routes__section--loading"]}`}
      >
        <div className={styles["user-highest-routes__skeleton-featured"]}>
          <div className={styles["user-highest-routes__skeleton-image"]} />
          <div className={styles["user-highest-routes__skeleton-content"]}>
            <div className={styles["user-highest-routes__skeleton-title"]} />
            <div className={styles["user-highest-routes__skeleton-stats"]}>
              <div className={styles["user-highest-routes__skeleton-stat"]} />
              <div className={styles["user-highest-routes__skeleton-stat"]} />
              <div className={styles["user-highest-routes__skeleton-stat"]} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["user-highest-routes__section"]}>
        <div
          className={`${styles["user-highest-routes__state"]} typography-desktop-label-medium`}
        >
          <Route size={24} color="rgb(71, 85, 105)" />
          <p className="typography-desktop-body-small">{error}</p>
        </div>
      </div>
    );
  }

  const handleRouteClick = (route: HighestRoute) => {
    if (onRoutePress) {
      onRoutePress(route);
    } else {
      // Navigate to the route details page
      navigate(`/routes/${route.id}`);
    }
  };

  if (routes.length === 0) {
    return (
      <div className={styles["user-highest-routes__section"]}>
        <div className={styles["user-highest-routes__state"]}>
          <div className={styles["user-highest-routes__empty-icon"]}>
            <Route size={32} color="rgb(71, 85, 105)" />
            <Trophy
              size={16}
              className={styles["user-highest-routes__empty-trophy"]}
              color="#c2cf94"
            />
          </div>
          <h3 className="typography-desktop-body-small">
            {t("highestRoutes.emptyTitle")}
          </h3>
          <p className="typography-desktop-body-small">
            {t("highestRoutes.emptySubtitle")}
          </p>
        </div>
      </div>
    );
  }

  const featuredRoute = routes[0];
  const otherRoutes = routes.slice(1);

  return (
    <div className={styles["user-highest-routes__section"]}>
      <HomeHeader
        title={t("highestRoutes.yourHardestRoutes")}
        subtitle={t("highestRoutes.mostDemandingChallenges")}
        rightContent={{
          type: "seeAll",
          onSeeAllClick: () => navigate("/userroutes"),
          seeAllText: t("highestRoutes.seeAll"),
        }}
      />

      {featuredRoute && (
        <div
          className={styles["user-highest-routes__featured"]}
          onClick={() => handleRouteClick(featuredRoute)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              handleRouteClick(featuredRoute);
          }}
        >
          <div className={styles["user-highest-routes__featured-image"]}>
            {featuredRoute.image?.url && !imgErrors.has(featuredRoute.id) ? (
              <img
                src={featuredRoute.image.url}
                alt={featuredRoute.name}
                onError={() =>
                  setImgErrors(
                    (prev) => new Set([...Array.from(prev), featuredRoute.id])
                  )
                }
              />
             ) : featuredRoute.coordinates &&
              featuredRoute.coordinates.coordinates &&
              featuredRoute.coordinates.coordinates.length > 0 ? (
              <div
                style={{ width: "100%", height: "100%" }}
                className={styles["user-highest-routes__featured-map"]}
              >
                <LeafletRouteMap coordinates={featuredRoute.coordinates} peaks={featuredRoute.peaks ?? []} />
              </div>
            ) : featuredRoute.peaks && featuredRoute.peaks.length > 0 && featuredRoute.peaks[0]?.lat != null ? (
              <div
                style={{ width: "100%", height: "100%" }}
                className={styles["user-highest-routes__featured-map"]}
              >
                <LeafletRouteMap peaks={featuredRoute.peaks ?? []} />
              </div>
            ) : (
              <div
                className={styles["user-highest-routes__featured-icon-bg"]}
                aria-hidden="true"
              >
                <Route size={50} />
              </div>
            )}
            <div
              className={styles["user-highest-routes__featured-overlay"]}
            ></div>
            <div
              className={`${styles["user-highest-routes__featured-badge"]} typography-desktop-label-medium`}
            >
              <Crown size={18} />
              <span className="typography-desktop-label-medium">
                {t("highestRoutes.hardestRoute")}
              </span>
            </div>
            <div
              className={`${styles["user-highest-routes__featured-activity"]} typography-desktop-label-medium`}
            >
              <span className="typography-desktop-label-medium">
                {featuredRoute.activity_type} {featuredRoute.date}
              </span>
              {featuredRoute.device_model && (
                <span className="typography-desktop-label-small">
                  GARMIN {featuredRoute.device_model}
                </span>
              )}
            </div>
          </div>

          <div className={styles["user-highest-routes__featured-meta"]}>
            <h3 className="typography-desktop-headline-small">
              {featuredRoute.name}
            </h3>
            <div className={styles["user-highest-routes__featured-stats"]}>
              <div className={styles["user-highest-routes__stat-item"]}>
                <div
                  className={`${styles["user-highest-routes__stat-icon"]} ${styles["user-highest-routes__stat-icon--featured"]}`}
                >
                  <TrendingUp size={24} />
                </div>
                <div className={styles["user-highest-routes__stat-content"]}>
                  <span className="typography-desktop-label-small">
                    {t("highestRoutes.elevationGain")}
                  </span>
                  <span className="typography-desktop-label-medium">
                    {formatElevationGain(featuredRoute.elevation_gain)}
                  </span>
                </div>
              </div>
              <div className={styles["user-highest-routes__stat-item"]}>
                <div
                  className={`${styles["user-highest-routes__stat-icon"]} ${styles["user-highest-routes__stat-icon--featured"]}`}
                >
                  <Clock size={24} />
                </div>
                <div className={styles["user-highest-routes__stat-content"]}>
                  <span className="typography-desktop-label-small">
                    {t("highestRoutes.time")}
                  </span>
                  <span className="typography-desktop-label-medium">
                    {formatCompactTime(featuredRoute.time)}
                  </span>
                </div>
              </div>
              <div className={styles["user-highest-routes__stat-item"]}>
                <div
                  className={`${styles["user-highest-routes__stat-icon"]} ${styles["user-highest-routes__stat-icon--featured"]}`}
                >
                  <MapPin size={24} />
                </div>
                <div className={styles["user-highest-routes__stat-content"]}>
                  <span className="typography-desktop-label-small">
                    {t("highestRoutes.distance")}
                  </span>
                  <span className="typography-desktop-label-medium">
                    {formatDistance(featuredRoute.distance)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {otherRoutes.length > 0 && (
        <div className={styles["user-highest-routes__list"]}>
          {otherRoutes.map((route) => (
            <div
              key={route.id}
              className={`${styles["user-highest-routes__card"]} ${styles["user-highest-routes__card--compact"]}`}
              onClick={() => handleRouteClick(route)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleRouteClick(route);
              }}
            >
              <div className={styles["user-highest-routes__card-image"]}>
                {route.image?.url && !imgErrors.has(route.id) ? (
                  <img
                    src={route.image.url}
                    alt={route.name}
                    onError={() =>
                      setImgErrors(
                        (prev) => new Set([...Array.from(prev), route.id])
                      )
                    }
                  />
                  ) : route.coordinates &&
                  route.coordinates.coordinates &&
                  route.coordinates.coordinates.length > 0 ? (
                  <div
                    style={{ width: "100%", height: "100%" }}
                    className={styles["user-highest-routes__card-map"]}
                  >
                    <LeafletRouteMap coordinates={route.coordinates} peaks={route.peaks ?? []} />
                  </div>
                ) : route.peaks && route.peaks.length > 0 && route.peaks[0]?.lat != null ? (
                  <div
                    style={{ width: "100%", height: "100%" }}
                    className={styles["user-highest-routes__card-map"]}
                  >
                    <LeafletRouteMap peaks={route.peaks ?? []} />
                  </div>
                ) : (
                  <div
                    className={styles["user-highest-routes__card-icon-bg"]}
                    aria-hidden="true"
                  >
                    <Route size={40} />
                  </div>
                )}
                <div
                  className={styles["user-highest-routes__card-overlay"]}
                ></div>
                {route.device_model && (
                  <div
                    className={styles["user-highest-routes__card-device-model"]}
                  >
                    <span className="typography-desktop-label-small">
                      GARMIN {route.device_model}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles["user-highest-routes__card-meta"]}>
                <h4
                  className="typography-desktop-body-medium"
                  style={{
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {route.name}
                </h4>
                <div className={styles["user-highest-routes__card-stats"]}>
                  <div className={styles["user-highest-routes__stat-item"]}>
                    <div className={styles["user-highest-routes__stat-icon"]}>
                      <TrendingUp size={20} />
                    </div>
                    <div
                      className={styles["user-highest-routes__stat-content"]}
                    >
                      <span className="typography-desktop-label-small">
                        {t("highestRoutes.elevationGain")}
                      </span>
                      <span className="typography-desktop-label-medium">
                        {formatElevationGain(route.elevation_gain)}
                      </span>
                    </div>
                  </div>
                  <div className={styles["user-highest-routes__stat-item"]}>
                    <div className={styles["user-highest-routes__stat-icon"]}>
                      <Clock size={20} />
                    </div>
                    <div
                      className={styles["user-highest-routes__stat-content"]}
                    >
                      <span className="typography-desktop-label-small">
                        {t("highestRoutes.time")}
                      </span>
                      <span className="typography-desktop-label-medium">
                        {formatCompactTime(route.time)}
                      </span>
                    </div>
                  </div>
                  <div className={styles["user-highest-routes__stat-item"]}>
                    <div className={styles["user-highest-routes__stat-icon"]}>
                      <MapPin size={20} />
                    </div>
                    <div
                      className={styles["user-highest-routes__stat-content"]}
                    >
                      <span className="typography-desktop-label-small">
                        {t("highestRoutes.distance")}
                      </span>
                      <span className="typography-desktop-label-medium">
                        {formatDistance(route.distance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserHighestRoutes;
