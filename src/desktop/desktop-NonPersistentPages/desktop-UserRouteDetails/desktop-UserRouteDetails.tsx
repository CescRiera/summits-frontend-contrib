import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { useParams } from "react-router-dom";
import styles from "./desktop-UserRouteDetails.module.css";
import { getRouteDetails } from "../../../shared/api/endpoints/routes";
import type { RouteDetailsResponse } from "../../../shared/api/types";
import RouteMap from "./desktop-RouteMap.tsx";
import RouteDetailsControls from "../../desktop-components/desktop-Map/desktop-RouteDetailsControls/desktop-RouteDetailsControls.tsx";
import type { Map as MapboxMap } from "mapbox-gl";
import type { PeakData } from "../../desktop-context/desktop-MapNavigationContext.tsx";
import { useI18n } from "../../../shared/context/I18nContext";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import { useOptionalOverlayContext } from "../../desktop-components/desktop-Overlay/desktop-OverlayContext.tsx";
import {
  formatCompactTime,
} from "../../../mobile/utils/numberFormatting.ts";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import {
  generateGPX,
  downloadGPX,
  generateFilename,
} from "../../desktop-utils/desktop-gpxGenerator.ts";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";

const UserRouteDetails = memo(function UserRouteDetails() {
  const { routeId } = useParams<{ routeId: string }>();
  const overlayContext = useOptionalOverlayContext();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [routeDetails, setRouteDetails] = useState<RouteDetailsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeakId, setSelectedPeakId] = useState<number | null>(null);
  const [selectedPeakData, setSelectedPeakData] = useState<PeakData | null>(
    null
  );
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(true);
  const [mapInstance, setMapInstance] = useState<MapboxMap | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const { formatDistance: hookFormatDistance, formatElevationGain: hookFormatElevationGain } = useUnitFormat();
  const hasFetched = useRef(false);
  const mapRef = useRef<MapboxMap | null>(null);

  // Map style and projection state (same behavior as Map.tsx)
  const getInitialStyle = (): "outdoors" | "satellite" => {
    const savedStyle = localStorage.getItem("mapStyle") as
      | "outdoors"
      | "satellite"
      | null;
    return savedStyle === "outdoors" || savedStyle === "satellite"
      ? savedStyle
      : "satellite";
  };

  const getInitialGlobeEnabled = (): boolean => {
    const savedGlobeEnabled = localStorage.getItem("globeEnabled");
    return savedGlobeEnabled !== null ? savedGlobeEnabled === "true" : true;
  };

  const getInitialTerrainEnabled = (): boolean => {
    const savedTerrainEnabled = localStorage.getItem("terrainEnabled");
    return savedTerrainEnabled !== null ? savedTerrainEnabled === "true" : true;
  };

  const [currentStyle, setCurrentStyle] = useState<"outdoors" | "satellite">(
    () => getInitialStyle()
  );
  const [isGlobeEnabled, setIsGlobeEnabled] = useState<boolean>(
    () => getInitialGlobeEnabled()
  );
  const [isTerrainEnabled, setIsTerrainEnabled] = useState<boolean>(
    () => getInitialTerrainEnabled()
  );

  const fetchRouteDetails = useCallback(async () => {
    if (!routeId) {
      setError(t("common.error"));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getRouteDetails(routeId);

      setRouteDetails(response);
      trackEvent("interaction", `route_desktop_details_loaded_${routeId}`);
    } catch (err: unknown) {
      console.error("[UserRouteDetails] Error fetching route details:", err);
      trackEvent("interaction", `route_desktop_details_load_failed_${routeId || "unknown"}`);
      setError(
        (
          err as {
            response?: { data?: { message?: string } };
            message?: string;
          }
        )?.response?.data?.message ||
          (err as { message?: string })?.message ||
          "Failed to fetch route details"
      );
    } finally {
      setLoading(false);
    }
  }, [routeId, t, trackEvent]);

  // Update overlay name for breadcrumbs when route details load
  useEffect(() => {
    if (!routeDetails?.route?.name || !routeId || !overlayContext) return;

    const baseStorageKey = `route:${routeId}`;

    // Find the overlay in the stack that matches this route
    const matchingOverlay = overlayContext.overlayStack.find(
      (overlay) => overlay.baseStorageKey === baseStorageKey
    );

    // Only update if the name is different to avoid unnecessary updates
    if (matchingOverlay && matchingOverlay.name !== routeDetails.route.name) {
      overlayContext.updateOverlayNameByBaseKey(
        baseStorageKey,
        routeDetails.route.name
      );
    }
  }, [routeDetails?.route?.name, routeId, overlayContext]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchRouteDetails();
    }
  }, [routeId, fetchRouteDetails]);

  // Reset the flag when routeId changes
  useEffect(() => {
    hasFetched.current = false;
  }, [routeId]);

  const toggleStatsCollapse = () => {
    trackEvent("interaction", `route_desktop_stats_${isStatsCollapsed ? "expand" : "collapse"}`);
    setIsStatsCollapsed(!isStatsCollapsed);
  };

  const handleClosePeakDetails = useCallback(() => {
    trackEvent("interaction", "route_desktop_peak_details_close");
    setSelectedPeakId(null);
    setSelectedPeakData(null);
  }, [trackEvent]);

  // Handlers for LayerControl
  const handleStyleChange = (style: "outdoors" | "satellite") => {
    trackEvent("map_style_change", `route_desktop_${style}`);
    setIsMapReady(false);
    setCurrentStyle(style);
    localStorage.setItem("mapStyle", style);
  };

  const handleGlobeToggle = (enabled: boolean) => {
    trackEvent("map_layer_toggle", `route_desktop_globe_${enabled ? "on" : "off"}`);
    setIsGlobeEnabled(enabled);
    localStorage.setItem("globeEnabled", enabled.toString());
  };

  const handleTerrainToggle = (enabled: boolean) => {
    trackEvent("map_layer_toggle", `route_desktop_terrain_${enabled ? "on" : "off"}`);
    setIsTerrainEnabled(enabled);
    localStorage.setItem("terrainEnabled", enabled.toString());
  };

  /**
   * Handle GPX download
   */
  const handleDownloadGPX = useCallback(async () => {
    if (!routeDetails?.success || !routeDetails.route.coordinates.length) {
      console.error("No route data available for GPX download");
      trackEvent("interaction", "route_desktop_gpx_missing_data");
      return;
    }

    try {
      trackEvent("interaction", `route_desktop_gpx_download_attempt_${routeId || "unknown"}`);
      const gpxContent = generateGPX(
        routeDetails.route.coordinates,
        routeDetails.route.name,
        routeDetails.route.properties.date
      );

      const filename = generateFilename(routeDetails.route.name);
      await downloadGPX(gpxContent, filename);
      trackEvent("interaction", `route_desktop_gpx_download_success_${routeId || "unknown"}`);

    } catch (error) {
      console.error("Error generating GPX file:", error);
      trackEvent("interaction", `route_desktop_gpx_download_failed_${routeId || "unknown"}`);
    }
  }, [routeDetails, routeId, trackEvent]);

  /**
   * Memoize peaks for performance
   */
  const peaks = useMemo(() => {
    if (!routeDetails?.success) return [];
    return (
      routeDetails.route.properties.peaks ||
      routeDetails.route.completed_peaks ||
      []
    );
  }, [
    routeDetails?.success,
    routeDetails?.route.properties.peaks,
    routeDetails?.route.completed_peaks,
  ]);

  /**
   * Handle peak selection from map
   */
  const handlePeakSelect = useCallback(
    (peakId: number, peakData?: PeakData) => {
      trackEvent("peak_click", `route_desktop_peak_${peakId}`);
      // Always update peak ID and data to ensure fresh data
      setSelectedPeakId(peakId);

      // Use provided peak data if available, otherwise find from peaks array
      if (peakData) {
        setSelectedPeakData(peakData);
      } else {
        // Find peak data from peaks array
        const peak = peaks.find((p) => Number(p.id) === peakId);
        if (peak) {
          setSelectedPeakData({
            name: peak.name || peak.name_en || "Unknown Peak",
            name_en: peak.name_en || null,
            elevation: peak.elevation || 0,
          });
        } else {
          // Fallback if peak not found
          setSelectedPeakData({
            name: "Unknown Peak",
            name_en: null,
            elevation: 0,
          });
        }
      }
    },
    [peaks, trackEvent]
  );

  /**
   * Handle flyTo animation to a peak
   */
  const handleFlyToPeak = useCallback(
    (peak: { lng?: number; lat?: number; name?: string }) => {
      if (!mapRef.current || !peak.lng || !peak.lat) {
        return;
      }


      const map = mapRef.current;

      // Stop any ongoing animations
      map.stop();

      // Fly to the peak coordinates
      map.flyTo({
        center: [peak.lng, peak.lat],
        duration: 500, // 0.5 seconds animation
        essential: true,
        easing: (t) => t * t * (3 - 2 * t), // Smooth easing function
      });
    },
    []
  );

  /**
   * Set map reference from RouteMap
   */
  const setMapRef = useCallback((map: MapboxMap | null) => {
    mapRef.current = map;
    setMapInstance(map);

    if (!map) {
      setIsMapReady(false);
      return;
    }

    try {
      setIsMapReady(map.isStyleLoaded());
    } catch {
      setIsMapReady(false);
    }
  }, []);

  const formatDate = useMemo(() => {
    const dateCache = new Map<string, string>();

    return (dateString: string): string => {
      if (dateCache.has(dateString)) {
        return dateCache.get(dateString)!;
      }

      try {
        const formatted = new Date(dateString).toLocaleDateString();
        dateCache.set(dateString, formatted);
        return formatted;
      } catch {
        dateCache.set(dateString, dateString);
        return dateString;
      }
    };
  }, []);

  const formatDistance = useMemo(() => {
    const distanceCache = new Map<string, string>();

    return (distance: string | number | null | undefined): string => {
      // Handle null, undefined, or empty values
      if (distance === null || distance === undefined || distance === "") {
        return "N/A";
      }

      const key = String(distance);
      if (distanceCache.has(key)) {
        return distanceCache.get(key)!;
      }

      const numDistance =
        typeof distance === "string" ? parseFloat(distance) : distance;

      // Check if the parsed number is valid
      if (isNaN(numDistance) || numDistance < 0) {
        distanceCache.set(key, "N/A");
        return "N/A";
      }

      const formatted = hookFormatDistance(numDistance);
      distanceCache.set(key, formatted);
      return formatted;
    };
  }, [hookFormatDistance]);

  const formatElevationGain = useMemo(() => {
    const elevationCache = new Map<string, string>();

    return (elevation: number | null | undefined): string => {
      // Handle null, undefined, or invalid values
      if (
        elevation === null ||
        elevation === undefined ||
        isNaN(elevation) ||
        elevation < 0
      ) {
        return "N/A";
      }

      const key = String(elevation);
      if (elevationCache.has(key)) {
        return elevationCache.get(key)!;
      }

      const formatted = hookFormatElevationGain(elevation);
      elevationCache.set(key, formatted);
      return formatted;
    };
  }, [hookFormatElevationGain]);

  const formatTime = useMemo(() => {
    const timeCache = new Map<string, string>();

    return (time: string | null | undefined): string => {
      // Handle null, undefined, or empty values
      if (time === null || time === undefined || time === "") {
        return "N/A";
      }

      const key = String(time);
      if (timeCache.has(key)) {
        return timeCache.get(key)!;
      }

      try {
        const formatted = formatCompactTime(time);
        timeCache.set(key, formatted);
        return formatted;
      } catch {
        // If formatting fails, return N/A
        timeCache.set(key, "N/A");
        return "N/A";
      }
    };
  }, []);

  const formatActivityType = useMemo(() => {
    return (activityType: string | null | undefined): string => {
      // Handle null, undefined, or empty values
      if (
        activityType === null ||
        activityType === undefined ||
        activityType === ""
      ) {
        return "N/A";
      }
      return activityType;
    };
  }, []);

  if (!routeId) {
    return (
      <div className={styles["userRouteDetails"]}>
        <div
          className={`${styles["errorOverlay"]} typography-desktop-label-medium`}
        >
          <p
            className={`${styles["errorMessage"]} typography-desktop-label-medium`}
          >
            {t("common.error")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["userRouteDetails"]}>
      {/* Full Screen Map */}
      {routeDetails && routeDetails.success && (
        <div className={styles["mapContainer"]}>
          <RouteMap
            route={routeDetails.route}
            selectedPeakId={selectedPeakId}
            onPeakSelect={handlePeakSelect}
            onFlyToPeak={handleFlyToPeak}
            onMapRef={setMapRef}
            mapStyle={currentStyle}
            globeEnabled={isGlobeEnabled}
            terrainEnabled={isTerrainEnabled}
            onTerrainToggle={handleTerrainToggle}
            onClosePeakDetails={handleClosePeakDetails}
          />

          {/* Route Details Controls - inside map container */}
          <RouteDetailsControls
            onStyleChange={handleStyleChange}
            onGlobeToggle={handleGlobeToggle}
            onTerrainToggle={handleTerrainToggle}
            currentStyle={currentStyle}
            isGlobeEnabled={isGlobeEnabled}
            isTerrainEnabled={isTerrainEnabled}
            map={mapInstance}
            isMapReady={isMapReady}
            selectedPeakId={selectedPeakId}
            selectedPeakData={selectedPeakData}
            onClosePeakDetails={handleClosePeakDetails}
            onDownloadGPX={handleDownloadGPX}
            downloadButtonLabel={t("routeDetails.downloadRoute")}
            routeDetails={routeDetails}
            isStatsCollapsed={isStatsCollapsed}
            onToggleStatsCollapse={toggleStatsCollapse}
            formatDate={formatDate}
            formatDistance={formatDistance}
            formatElevationGain={formatElevationGain}
            formatTime={formatTime}
            formatActivityType={formatActivityType}
            peaks={peaks}
            t={t}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && <LoadingScreen message={t("common.loadingRouteData")} />}

      {/* Error State */}
      {error && (
        <div
          className={`${styles["errorOverlay"]} typography-desktop-label-medium`}
        >
          <p
            className={`${styles["errorMessage"]} typography-desktop-label-medium`}
          >
            {error}
          </p>
          <button
            onClick={() => {
              trackEvent("button_click", "route_desktop_retry");
              hasFetched.current = false;
              fetchRouteDetails();
            }}
            disabled={loading}
            className={styles["retryButton"]}
          >
            {loading ? t("common.loading") : t("common.retry")}
          </button>
        </div>
      )}
    </div>
  );
});

export default UserRouteDetails;

UserRouteDetails.displayName = "UserRouteDetails";
