import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Calendar,
  Activity,
  
  ChevronUp,
  ChevronDown,
  Watch,
  Video,
} from "lucide-react";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import styles from "./UserRouteDetails.module.css";
import { getRouteDetails } from "../../../shared/api/endpoints/routes";
import type { RouteDetailsResponse } from "../../../shared/api/types";
import RouteMap from "./RouteMap";
import RouteMapControls from "../../components/Map/RouteMapControls";
import type { Map as MapboxMap } from "mapbox-gl";
import { useI18n } from "../../../shared/context/I18nContext";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import {
  formatCompactTime,
  formatDistance as formatDistanceUtils,
  formatElevationGain as formatElevationGainUtils,
} from "../../utils/numberFormatting";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import {
  generateGPX,
  generateFilename,
} from "../../utils/gpxGenerator";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
// import { useRouteAnimation } from "../../../shared/hooks/useRouteAnimation";
// import RouteAnimationModal from "../../../shared/components/RouteAnimationModal/RouteAnimationModal";
import { isVideoRecordingSupported } from "../../../shared/utils/routeAnimationService";
import { Capacitor } from "@capacitor/core";
import { RouteAnimationNative } from "../../../capacitor-plugins/route-animation-native";
import { MAPBOX_ACCESS_TOKEN } from "../../components/Map/MapUtils";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";



const UserRouteDetails = memo(function UserRouteDetails() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { unitSystem } = useUnitFormat();
  const [routeDetails, setRouteDetails] = useState<RouteDetailsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeakId, setSelectedPeakId] = useState<number | null>(null);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(true);
  const [isNearbyPeakPopupOpen, setIsNearbyPeakPopupOpen] = useState(false);
  const [isUIHidden, setIsUIHidden] = useState<boolean>(false);
  const [isAnimationLoading, setIsAnimationLoading] = useState<boolean>(false);

  const isAnimating = false;
  const hasFetched = useRef(false);
  const mapRef = useRef<MapboxMap | null>(null);

  // Check if we're on native platform
  const isNativePlatform = Capacitor.isNativePlatform();
  console.log("🎬 [UserRouteDetails] Platform check - isNativePlatform:", isNativePlatform, "platform:", Capacitor.getPlatform());

  // Check if animation is supported
  const canCreateAnimation =
    (isNativePlatform || isVideoRecordingSupported()) &&
    routeDetails?.route?.coordinates?.length;

  // Route animation hook - Temporarily commented out for debugging
  // const {
  //   startAnimation,
  //   cancelAnimation,
  //   isAnimating: isAnimatingFromHook,
  //   isPaused,
  //   isComplete,
  //   videoBlob,
  //   currentSpeed,
  //   stats,
  //   handleShare,
  //   handleCancel,
  //   handleWatchAgain,
  //   handlePause,
  //   handleResume,
  //   handleSpeedIncrease,
  //   handleSpeedDecrease,
  // } = useRouteAnimation({
  //   map: () => mapRef.current,
  //   coordinates: () => routeDetails?.route?.coordinates || [],
  //   routeName: () => routeDetails?.route?.name,
  //   totalDistance: () => {
  //     const distanceStr = routeDetails?.route?.properties?.distance;
  //     if (!distanceStr) return undefined;
  //     // Parse distance string (e.g., "12.5 km" or "12.5") to number
  //     const match = distanceStr.match(/[\d.]+/);
  //     return match ? parseFloat(match[0]) : undefined;
  //   },
  //   totalElevation: () => routeDetails?.route?.properties?.elevation_gain,
  //   isDesktop: false,
  //   onAnimationStateChange: setIsAnimating,
  //   t: t,
  // });

  // Temporary stubs for debugging
  const isAnimatingFromHook = false;
  const isComplete = false;

  // Use hook's animation state (combine with local state for UI hiding)
  // Keep UI hidden during animation AND completion screen (until user clicks X)
  const isAnimatingCombined = isAnimatingFromHook || isAnimating || isComplete;

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
      trackEvent("interaction", `route_details_loaded_${routeId}`);
    } catch (err: unknown) {
      console.error("[UserRouteDetails] Error fetching route details:", err);
      trackEvent("interaction", `route_details_load_failed_${routeId || "unknown"}`);
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

  const handleBack = () => {
    trackEvent("button_click", "route_details_back");
    if (overlayContext) {
      overlayContext.handleOverlayBack();
    } else {
      navigate(-1);
    }
  };

  const toggleStatsCollapse = () => {
    trackEvent("interaction", `route_details_stats_${isStatsCollapsed ? "expand" : "collapse"}`);
    setIsStatsCollapsed(!isStatsCollapsed);
  };

  const handlePopupChange = (isOpen: boolean) => {
    setIsNearbyPeakPopupOpen(isOpen);
  };

  // Handlers for LayerControl
  const handleStyleChange = (style: "outdoors" | "satellite") => {
    trackEvent("map_style_change", `route_${style}`);
    setCurrentStyle(style);
    localStorage.setItem("mapStyle", style);
  };

  const handleGlobeToggle = (enabled: boolean) => {
    trackEvent("map_layer_toggle", `route_globe_${enabled ? "on" : "off"}`);
    setIsGlobeEnabled(enabled);
    localStorage.setItem("globeEnabled", enabled.toString());
  };

  const handleTerrainToggle = (enabled: boolean) => {
    trackEvent("map_layer_toggle", `route_terrain_${enabled ? "on" : "off"}`);
    setIsTerrainEnabled(enabled);
    localStorage.setItem("terrainEnabled", enabled.toString());
  };

  /**
   * Handle native route animation
   */
  const handleNativeAnimation = useCallback(async () => {
    if (!routeDetails?.success || !routeDetails.route.coordinates.length) {
      console.error("No route data available for animation");
      trackEvent("interaction", "route_animation_missing_data");
      return;
    }

    // Set loading state immediately
    setIsAnimationLoading(true);

    // GUARANTEE loading state is cleared after 10 seconds, regardless of what happens
    const loadingTimeout = setTimeout(() => {
      console.log("⏰ [UserRouteDetails] Force clearing animation loading state after 10 seconds");
      setIsAnimationLoading(false);
    }, 10000);

    try {
      console.log("🎬 [UserRouteDetails] Starting native route animation...");
      trackEvent("interaction", `route_animation_start_${routeId || "unknown"}`);

      // Prepare coordinates data
      const coordinates = routeDetails.route.coordinates.map(coord => ({
        lat: coord.lat,
        lng: coord.lng,
        elevation: coord.elevation || 0
      }));

      // Prepare peaks data
      const peaks = (routeDetails.route.properties.peaks ||
                    routeDetails.route.completed_peaks ||
                    []).map((peak: any) => ({
        name: peak.name,
        lat: peak.lat,
        lng: peak.lng,
        elevation: peak.elevation
      }));

      // Call the native route animation plugin with direct data
      // The native side handles JSON serialization and file writing to avoid bundle size limits
      const animationConfig: {
        coordinates: any[];
        peaks?: any[];
        routeName: string;
        totalDistance: number;
        totalElevation: number;
        mapboxAccessToken: string;
        baseSpeed: number;
        elevationLabel: string;
        distanceLabel: string;
      } = {
        coordinates: coordinates, // Pass array directly - native handles serialization
        routeName: routeDetails.route.name || "Route",
        totalDistance: Number(routeDetails.route.properties.distance) || 0,
        totalElevation: Number(routeDetails.route.properties.elevation_gain) || 0,
        mapboxAccessToken: MAPBOX_ACCESS_TOKEN,
        baseSpeed: 150.0, // Default speed, can be made configurable
        elevationLabel: t("userStats.metrics.elevationGain"),
        distanceLabel: t("userStats.metrics.distance")
      };

      // Only include peaks if there are any
      if (peaks.length > 0) {
        animationConfig.peaks = peaks;
      }

      console.log("🎬 [UserRouteDetails] Calling RouteAnimationNative.startAnimation with direct data");
      console.log("📊 [UserRouteDetails] Coordinates data length:", coordinates.length);
      if (peaks.length > 0) {
        console.log("🏔️ [UserRouteDetails] Peaks data length:", peaks.length);
      }

      await RouteAnimationNative.startAnimation(animationConfig);

      console.log("✅ [UserRouteDetails] Native route animation started successfully!");

    } catch (error) {
      console.error("❌ [UserRouteDetails] Error starting native animation:", error);
      trackEvent("interaction", `route_animation_failed_${routeId || "unknown"}`);
      alert("Failed to start route animation. Check console for details.");
      // Clear the guaranteed timeout since we're handling the error immediately
      clearTimeout(loadingTimeout);
      // Reset loading state on error or cancellation
      setIsAnimationLoading(false);
    }
  }, [routeDetails, routeId, trackEvent]);

  /**
   * Handle animation button click - route to native or web based on platform
   */
  const handleAnimationClick = useCallback(() => {
    console.log("🎬 [UserRouteDetails] handleAnimationClick - isNativePlatform:", isNativePlatform, "Capacitor.isNativePlatform():", Capacitor.isNativePlatform());
    // Force native animation for testing
    console.log("🎬 [UserRouteDetails] Calling native animation (forced for testing)");
    trackEvent("button_click", "route_animation_click");
    handleNativeAnimation();
  }, [isNativePlatform, handleNativeAnimation, trackEvent]);

  /**
   * Handle sharing the route GPX file directly via native share sheet
   */
  const handleShareRoute = useCallback(async () => {
    if (!routeDetails?.success || !routeDetails.route.coordinates.length) {
      console.error("No route data available for GPX share");
      trackEvent("interaction", "route_gpx_missing_data");
      return;
    }

    try {
      trackEvent("interaction", `route_gpx_share_attempt_${routeId || "unknown"}`);
      const gpxContent = generateGPX(
        routeDetails.route.coordinates,
        routeDetails.route.name,
        routeDetails.route.properties.date
      );

      const filename = generateFilename(routeDetails.route.name);
      const gpxFileName = `${filename}.gpx`;

      if (Capacitor.isNativePlatform()) {
        // Save GPX to a temp/cache location, then share the file
        const tempPath = `temp/${gpxFileName}`;

        await Filesystem.writeFile({
          path: tempPath,
          data: gpxContent,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
          recursive: true,
        });

        const fileInfo = await Filesystem.getUri({
          path: tempPath,
          directory: Directory.Cache,
        });

        await Share.share({
          title: routeDetails.route.name || 'Route GPX',
          files: [fileInfo.uri],
          dialogTitle: t('routeDetails.sendToDevice'),
        });
      } else {
        // Web fallback: download the file directly
        const blob = new Blob([gpxContent], { type: "application/gpx+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = gpxFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      trackEvent("interaction", `route_gpx_share_success_${routeId || "unknown"}`);
    } catch (error) {
      console.error("Error sharing GPX file:", error);
      trackEvent("interaction", `route_gpx_share_failed_${routeId || "unknown"}`);
      // User may have cancelled the share sheet — don't show an alert for that
    }
  }, [routeDetails, routeId, trackEvent, t]);

  /**
   * Handle peak selection from map or swiper
   */
  const handlePeakSelect = useCallback((peakId: number) => {
    trackEvent("peak_click", `route_details_peak_${peakId}`);
    // Only update if the peak actually changed to prevent unnecessary re-renders
    setSelectedPeakId((prevId) => {
      if (prevId === peakId) {
        return prevId;
      }
      return peakId;
    });
  }, [trackEvent]);

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

      const formatted = formatDistanceUtils(numDistance, unitSystem);
      distanceCache.set(key, formatted);
      return formatted;
    };
  }, [unitSystem]);

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

      const formatted = formatElevationGainUtils(elevation, unitSystem);
      elevationCache.set(key, formatted);
      return formatted;
    };
  }, [unitSystem]);

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
        <div className={`${styles["errorOverlay"]} typography-body-small`}>
          <p className={`${styles["errorMessage"]} typography-body-small`}>
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
            onPopupChange={handlePopupChange}
            mapStyle={currentStyle}
            globeEnabled={isGlobeEnabled}
            terrainEnabled={isTerrainEnabled}
            onTerrainToggle={handleTerrainToggle}
            isUIHidden={isUIHidden}
            setIsUIHidden={setIsUIHidden}
          />

          {/* Layer and Location Controls - inside map container */}
          {!isAnimatingCombined && (
            <RouteMapControls
              onStyleChange={handleStyleChange}
              onGlobeToggle={handleGlobeToggle}
              onTerrainToggle={handleTerrainToggle}
              currentStyle={currentStyle}
              isGlobeEnabled={isGlobeEnabled}
              isTerrainEnabled={isTerrainEnabled}
              map={mapRef.current}
              isUIHidden={isUIHidden || !!isNearbyPeakPopupOpen}
            />
          )}

          {/* Action Buttons - inside map container */}
          {!isAnimatingCombined && (
            <div
              className={`${styles["actionButtons"]} ${
                isUIHidden || isNearbyPeakPopupOpen ? styles["hidden"] : ""
              }`}
            >
              {/* Create Animation Button */}
              {canCreateAnimation && (
                <button
                  className={styles["animationButton"]}
                  onClick={handleAnimationClick}
                  disabled={isAnimationLoading}
                  aria-label={isAnimationLoading ? t("common.loading") : t("routeAnimation.createAnimation")}
                  title={isAnimationLoading ? t("common.loading") : t("routeAnimation.createAnimation")}
                >
                  <Video size={16} />
                  <span className="typography-button-small">
                    {isAnimationLoading ? t("common.loading") : t("routeAnimation.createAnimation")}
                  </span>
                </button>
              )}

              {/* Send to Device Button */}
              <button
                className={styles["downloadRouteButton"]}
                onClick={handleShareRoute}
                aria-label={t("routeDetails.sendToDevice")}
                title={t("routeDetails.sendToDevice")}
              >
                <Watch size={16} />
                <span className="typography-button-small">
                  {t("routeDetails.sendToDevice")}
                </span>
              </button>

              {/* Share Route Screenshot Button */}

            </div>
          )}
        </div>
      )}

      {/* Top Overlay - Back Button, Title, and Route Stats */}
      {!isAnimatingCombined && (
        <div className={styles["topOverlay"]}>
          <OverlayHeader
            title={routeDetails?.route.name || "Route Details"}
            onBack={handleBack}
            variant="transparent"
            rightContent={
              routeDetails && routeDetails.success ? (
                <div className={styles["headerDate"]}>
                  <Calendar size={16} />
                  <span className="typography-body-small">
                    {formatDate(routeDetails.route.properties.date)}
                  </span>
                </div>
              ) : undefined
            }
          />

          {/* Route Stats Card */}
          {routeDetails && routeDetails.success && (
            <div
              className={`${styles["routeStatsCard"]} ${
                isUIHidden || isNearbyPeakPopupOpen ? styles["hidden"] : ""
              }`}
              onClick={toggleStatsCollapse}
            >
              {/* Collapsible Stats Section */}
              <div
                className={`${styles["routeStats"]} ${
                  isStatsCollapsed ? styles["collapsed"] : ""
                }`}
              >
                <div className={styles["statItem"]}>
          
                  <div className={styles["statContent"]}>
                    <span
                      className={`${styles["statLabel"]} typography-label-medium`}
                    >
                      {t("highestRoutes.distance")}
                    </span>
                    <span
                      className={`${styles["statValue"]} typography-body-small`}
                    >
                      {formatDistance(routeDetails.route.properties.distance)}
                    </span>
                  </div>
                </div>
                <div className={styles["statItem"]}>
             
                  <div className={styles["statContent"]}>
                    <span
                      className={`${styles["statLabel"]} typography-label-medium`}
                    >
                      {t("highestRoutes.elevationGain")}
                    </span>
                    <span
                      className={`${styles["statValue"]} typography-body-small`}
                    >
                      {formatElevationGain(
                        routeDetails.route.properties.elevation_gain
                      )}
                    </span>
                  </div>
                </div>
                <div className={styles["statItem"]}>
               
                  <div className={styles["statContent"]}>
                    <span
                      className={`${styles["statLabel"]} typography-label-medium`}
                    >
                      {t("highestRoutes.time")}
                    </span>
                    <span
                      className={`${styles["statValue"]} typography-body-small`}
                    >
                      {formatTime(routeDetails.route.properties.time)}
                    </span>
                  </div>
                </div>
                <div className={styles["statItem"]}>
           
                  <div className={styles["statContent"]}>
                    <span
                      className={`${styles["statLabel"]} typography-label-medium`}
                    >
                      {t("highestRoutes.movingTime")}
                    </span>
                    <span
                      className={`${styles["statValue"]} typography-body-small`}
                    >
                      {formatTime(routeDetails.route.properties.moving_time)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Info Row with Collapse Button */}
              <div
                className={`${styles["additionalInfo"]} ${
                  isStatsCollapsed ? styles["collapsed"] : ""
                }`}
              >
                <div className={styles["additionalInfoLeft"]}>
                  <div className={styles["peaksInfo"]}>
                    <MountainIcon size={12} />
                    <span className="typography-body-small">
                      {
                        (
                          routeDetails.route.properties.peaks ||
                          routeDetails.route.completed_peaks ||
                          []
                        ).length
                      }{" "}
                      {t("userPeaks.peaks")}
                    </span>
                  </div>
                  <div className={styles["activityInfo"]}>
                    <Activity size={12} />
                    <span className="typography-body-small">
                      {formatActivityType(
                        routeDetails.route.properties.activity_type
                      )}
                    </span>
                  </div>
                </div>
                <button
                  className={styles["collapseButton"]}
                  aria-label={
                    isStatsCollapsed
                      ? t("routeDetails.showStats")
                      : t("routeDetails.hideStats")
                  }
                >
                  {isStatsCollapsed ? (
                    <>
               
                      <ChevronDown size={16} />
                    </>
                  ) : (
                    <>
                      <ChevronUp size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && <LoadingScreen message={t("common.loadingRouteData")} />}

      {/* Error State */}
      {error && (
        <div className={`${styles["errorOverlay"]} typography-body-small`}>
          <p className={`${styles["errorMessage"]} typography-body-small`}>
            {error}
          </p>
          <button
            onClick={() => {
              trackEvent("button_click", "route_details_retry");
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



      {/* Route Animation Overlay - Temporarily commented out for debugging */}
      {/* {routeDetails && (
        <RouteAnimationModal
          isAnimating={isAnimatingFromHook}
          isPaused={isPaused}
          isComplete={isComplete}
          currentSpeed={currentSpeed}
          stats={stats}
          routeName={routeDetails.route?.name || "Route"}
          videoBlob={videoBlob}
          onCancel={cancelAnimation}
          onPause={handlePause}
          onResume={handleResume}
          onSpeedIncrease={handleSpeedIncrease}
          onSpeedDecrease={handleSpeedDecrease}
          onShare={handleShare}
          onCompletionCancel={handleCancel}
          onWatchAgain={handleWatchAgain}
          t={t}
        />
      )} */}
    </div>
  );
});

export default UserRouteDetails;

UserRouteDetails.displayName = "UserRouteDetails";
