import React, { useCallback, useEffect, useRef, useState } from "react";
import { Trophy, Route, Crown } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import {
  formatCompactTime,
} from "../../../utils/numberFormatting";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import HomeHeader from "../HomeHeader/HomeHeader";
import styles from "./UserHighestRoutes.module.css";
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
  } | null;
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
  console.log("Routes", routes)

  if (loading) {
    return (
      <div className={styles["userRoutesSection"]}>
        <div className={styles["highest-routes__skeleton-scroll"]}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles["highest-routes__skeleton-card"]}>
              <div className={styles["highest-routes__skeleton-image"]} />
              <div className={styles["highest-routes__skeleton-content"]}>
                <div className={styles["highest-routes__skeleton-title"]} />
                <div className={styles["highest-routes__skeleton-stats"]}>
                  <div className={styles["highest-routes__skeleton-stat"]} />
                  <div className={styles["highest-routes__skeleton-stat"]} />
                  <div className={styles["highest-routes__skeleton-stat"]} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["userRoutesSection"]}>
        <div className={`${styles["errorContainer"]} typography-body-small`}>
          <Route size={24} color="rgb(71, 85, 105)" />
          <p className="typography-body-medium">{error}</p>
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
      <div className={styles["userRoutesSection"]}>
        <div className={styles["emptyContainer"]}>
          <div className={styles["emptyIcon"]}>
            <Route size={32} color="rgb(71, 85, 105)" />
            <Trophy
              size={16}
              className={styles["floatingTrophy"]}
              color="#c2cf94"
            />
          </div>
          <h3 className="typography-title-medium">
            {t("highestRoutes.emptyTitle")}
          </h3>
          <p className="typography-body-medium">
            {t("highestRoutes.emptySubtitle")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["userRoutesSection"]}>
      <HomeHeader
        title={t("highestRoutes.yourHardestRoutes")}
        subtitle={t("highestRoutes.mostDemandingChallenges")}
        rightContent={{
          type: "seeAll",
          onSeeAllClick: () => navigate("/userroutes"),
          seeAllText: t("highestRoutes.seeAll"),
        }}
      />

      <div className={styles["routesContainer"]}>
        <div className={styles["routesScroll"]}>
          {routes.map((route, index) => (
            <div
              key={route.id}
              className={styles["routeCard"]}
              onClick={() => handleRouteClick(route)}
            >
              <div className={styles["routeImageContainer"]}>
                {route.image && route.image.url && !imgErrors.has(route.id) ? (
                  <img
                    src={route.image.url}
                    alt={route.name}
                    className={styles["routeImage"]}
                    onError={() =>
                      setImgErrors(
                        (prev) => new Set([...Array.from(prev), route.id])
                      )
                    }
                  />
                ) : route.coordinates &&
                  route.coordinates.coordinates &&
                  route.coordinates.coordinates.length > 0 ? (
                  <div className={styles["routeImage"]}>
                    <LeafletRouteMap coordinates={route.coordinates} peaks={route.peaks ?? []} />
                  </div>
                ) : route.peaks && route.peaks.length > 0 && route.peaks[0]?.lat != null ? (
                  <div className={styles["routeImage"]}>
                    <LeafletRouteMap peaks={route.peaks ?? []} />
                  </div>
                ) : (
                  <div className={styles["routeIconBg"]} aria-hidden="true">
                    <Route size={32} />
                  </div>
                )}
                <div className={styles["routeOverlay"]}></div>

                {/* Most Extreme Badge for first route */}
                {index === 0 && (
                  <div className={styles["hardestRouteBadge"]}>
                    <Crown size={16} />
                    <span className="typography-label-medium">
                      {t("highestRoutes.hardestRoute")}
                    </span>
                  </div>
                )}

                {/* Activity Type Badge - white text without background */}
                <div className={styles["activityTypeBadge"]}>
                  <span className="typography-label-medium">
                    {route.activity_type} {route.date}
                  </span>
                </div>

                {/* Garmin Device Model - bottom right */}
                {route.device_model && (
                  <div className={styles["deviceModelBadge"]}>
                    <span className="typography-label-small">
                      GARMIN {route.device_model}
                    </span>
                  </div>
                )}
              </div>

              <div className={styles["routeContent"]}>
                <h3
                  className={`${styles["routeName"]} typography-title-medium`}
                >
                  {route.name}
                </h3>

                <div className={styles["routeStats"]}>
                  <div className={styles["statItem"]}>
                  
                    <div className={styles["statContent"]}>
                      <span
                        className={`${styles["statLabel"]} typography-label-small`}
                      >
                        {t("highestRoutes.elevationGain")}
                      </span>
                      <span
                        className={`${styles["statValue"]} typography-body-small`}
                      >
                        {formatElevationGain(route.elevation_gain)}
                      </span>
                    </div>
                  </div>
                  <div className={styles["statItem"]}>
                  
                    <div className={styles["statContent"]}>
                      <span
                        className={`${styles["statLabel"]} typography-label-small`}
                      >
                        {t("highestRoutes.time")}
                      </span>
                      <span
                        className={`${styles["statValue"]} typography-body-small`}
                      >
                        {formatCompactTime(route.time)}
                      </span>
                    </div>
                  </div>
                  <div className={styles["statItem"]}>
                
                    <div className={styles["statContent"]}>
                      <span
                        className={`${styles["statLabel"]} typography-label-small`}
                      >
                        {t("highestRoutes.distance")}
                      </span>
                      <span
                        className={`${styles["statValue"]} typography-body-small`}
                      >
                        {formatDistance(route.distance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No ReportBlockPopup here as this component shows the current user's own hardest routes */}
    </div>
  );
};

export default UserHighestRoutes;
