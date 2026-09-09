"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  MapPin,
  Calendar,
  Activity,
  TrendingUp,
  Clock,
  ChevronUp,
  ChevronDown,
  Video,
} from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import styles from "./desktop-RouteDetailsControls.module.css";
import { lazy, Suspense } from "react";
import type { PeakData } from "../../../desktop-context/desktop-MapNavigationContext.tsx";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import MapLayersDropdown from "../../desktop-MapControls/desktop-MapLayersDropdown.tsx";
import LoadingScreen from "../../desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import { getElevationColor } from "../../../../shared/constants/elevationColors";
import OverlayHeader from "../../desktop-Overlay/desktop-OverlayHeader/desktop-OverlayHeader.tsx";
import type { RouteDetailsResponse } from "../../../../shared/api/types";
import { useRouteAnimation } from "../../../../shared/hooks/useRouteAnimation";
import RouteAnimationModal from "../../../../shared/components/RouteAnimationModal/RouteAnimationModal";
import {
  isVideoRecordingSupported,
} from "../../../../shared/utils/routeAnimationService";

const PeakDetailsMap = lazy(async () => {
  console.log("[Chunk] desktop-PeakDetailsMap (RouteDetails) import start");
  const mod = await import("../desktop-PeakDetailsMap/desktop-PeakDetailsMap.tsx");
  console.log("[Chunk] desktop-PeakDetailsMap (RouteDetails) import done");
  return mod;
});

import type { Map as MapboxMap } from "mapbox-gl";

interface RouteDetailsControlsProps {
  onStyleChange: (style: "outdoors" | "satellite") => void;
  onGlobeToggle: (enabled: boolean) => void;
  onTerrainToggle?: (enabled: boolean) => void;
  currentStyle: "outdoors" | "satellite";
  isGlobeEnabled: boolean;
  isTerrainEnabled?: boolean;
  map: MapboxMap | null;
  isMapReady?: boolean;
  selectedPeakId: number | null;
  selectedPeakData: PeakData | null;
  onClosePeakDetails: () => void;
  onDownloadGPX?: () => void;
  downloadButtonLabel?: string;
  routeDetails?: RouteDetailsResponse | null;
  isStatsCollapsed?: boolean;
  onToggleStatsCollapse?: () => void;
  formatDate?: (dateString: string) => string;
  formatDistance?: (distance: string | number | null | undefined) => string;
  formatElevationGain?: (elevation: number | null | undefined) => string;
  formatTime?: (time: string | null | undefined) => string;
  formatActivityType?: (activityType: string | null | undefined) => string;
  peaks?: RouteDetailsControlPeak[];
  t?: (key: string) => string;
}

type RouteDetailsControlPeak = {
  id: number | string;
  name?: string;
  name_en?: string;
  elevation?: number;
};

const EMPTY_PEAKS: RouteDetailsControlPeak[] = [];

const RouteDetailsControls: React.FC<RouteDetailsControlsProps> = ({
  onStyleChange,
  onGlobeToggle,
  onTerrainToggle,
  currentStyle,
  isGlobeEnabled,
  isTerrainEnabled = false,
  map,
  isMapReady = false,
  selectedPeakId,
  selectedPeakData,
  onClosePeakDetails,
  onDownloadGPX,
  downloadButtonLabel,
  routeDetails,
  isStatsCollapsed = true,
  onToggleStatsCollapse,
  formatDate,
  formatDistance,
  formatElevationGain,
  formatTime,
  formatActivityType,
  peaks = EMPTY_PEAKS,
  t = (key: string) => key,
}) => {
  const topOverlayRef = useRef<HTMLDivElement | null>(null);
  const { formatMeters: formatElevation } = useUnitFormat();
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if animation is supported
  const canCreateAnimation =
    isVideoRecordingSupported() && routeDetails?.route?.coordinates?.length;

  // Route animation hook
  const {
    startAnimation,
    cancelAnimation,
    isAnimating: isAnimatingFromHook,
    isPaused,
    isComplete,
    videoBlob,
    currentSpeed,
    stats,
    handleShare,
    handleCancel,
    handleWatchAgain,
    handlePause,
    handleResume,
    handleSpeedIncrease,
    handleSpeedDecrease,
  } = useRouteAnimation({
    map: () => map,
    coordinates: () => routeDetails?.route?.coordinates || [],
    routeName: () => routeDetails?.route?.name,
    totalDistance: () => {
      const distanceStr = routeDetails?.route?.properties?.distance;
      if (!distanceStr) return undefined;
      // Parse distance string (e.g., "12.5 km" or "12.5") to number
      const match = distanceStr.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : undefined;
    },
    totalElevation: () => routeDetails?.route?.properties?.elevation_gain,
    isDesktop: true,
    onAnimationStateChange: setIsAnimating,
    t: t,
  });

  // Track topOverlay height and set CSS variable for peak details positioning
  useEffect(() => {
    const topOverlay = topOverlayRef.current;
    if (!topOverlay) return;

    const updateTopOverlayHeight = () => {
      const height = topOverlay.offsetHeight;
      document.documentElement.style.setProperty(
        "--top-overlay-height",
        `${height}px`
      );
    };

    // Initial measurement
    updateTopOverlayHeight();

    // Use ResizeObserver to track height changes
    const resizeObserver = new ResizeObserver(() => {
      updateTopOverlayHeight();
    });

    resizeObserver.observe(topOverlay);

    return () => {
      resizeObserver.disconnect();
    };
  }, [routeDetails, isStatsCollapsed]);

  // Helper function to get elevation icon for peak details header
  const getElevationIconForHeader = (elevation: number) => {
    if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
    if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
    if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
    if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
    if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
    return "/icons/altitude/ic_mountain_green.png";
  };

  return (
    <div className={styles["route-details-controls"]}>
      {/* Top Overlay - Back Button, Title, and Route Stats */}
      {routeDetails && !isAnimating && !isComplete && (
        <div
          ref={topOverlayRef}
          className={styles["route-details-controls__top-overlay"]}
        >
          <div
            className={styles["route-details-controls__top-overlay-container"]}
          >
            {/* Header Row - Title (left) and Date (right) */}
            <div
              className={styles["route-details-controls__top-overlay-header"]}
            >
              <div
                className={styles["route-details-controls__top-overlay-title"]}
              >
                <OverlayHeader
                  title={routeDetails?.route.name || "Route Details"}
                  variant="transparent"
                />
              </div>
              {routeDetails && routeDetails.success && formatDate && (
                <div className={styles["route-details-controls__header-date"]}>
                  <Calendar size={16} />
                  <span className="typography-desktop-label-medium">
                    {formatDate(routeDetails.route.properties.date)}
                  </span>
                </div>
              )}
            </div>

            {/* Route Stats Card - Below Title */}
            {routeDetails && routeDetails.success && (
              <div
                className={styles["route-details-controls__route-stats-card"]}
              >
                {/* Collapsible Stats Section */}
                <div
                  className={`${
                    styles["route-details-controls__route-stats"]
                  } ${
                    isStatsCollapsed
                      ? styles["route-details-controls__route-stats--collapsed"]
                      : ""
                  }`}
                >
                  {formatDistance && (
                    <div
                      className={styles["route-details-controls__stat-item"]}
                    >
                      <div
                        className={styles["route-details-controls__stat-icon"]}
                      >
                        <MapPin size={10} />
                      </div>
                      <div
                        className={
                          styles["route-details-controls__stat-content"]
                        }
                      >
                        <span
                          className={`${styles["route-details-controls__stat-label"]} typography-desktop-label-medium`}
                        >
                          {t("highestRoutes.distance")}
                        </span>
                        <span
                          className={`${styles["route-details-controls__stat-value"]} typography-desktop-label-medium`}
                        >
                          {formatDistance(
                            routeDetails.route.properties.distance
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {formatElevationGain && (
                    <div
                      className={styles["route-details-controls__stat-item"]}
                    >
                      <div
                        className={styles["route-details-controls__stat-icon"]}
                      >
                        <TrendingUp size={10} />
                      </div>
                      <div
                        className={
                          styles["route-details-controls__stat-content"]
                        }
                      >
                        <span
                          className={`${styles["route-details-controls__stat-label"]} typography-desktop-label-medium`}
                        >
                          {t("highestRoutes.elevationGain")}
                        </span>
                        <span
                          className={`${styles["route-details-controls__stat-value"]} typography-desktop-label-medium`}
                        >
                          {formatElevationGain(
                            routeDetails.route.properties.elevation_gain
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {formatTime && (
                    <>
                      <div
                        className={styles["route-details-controls__stat-item"]}
                      >
                        <div
                          className={
                            styles["route-details-controls__stat-icon"]
                          }
                        >
                          <Clock size={10} />
                        </div>
                        <div
                          className={
                            styles["route-details-controls__stat-content"]
                          }
                        >
                          <span
                            className={`${styles["route-details-controls__stat-label"]} typography-desktop-label-medium`}
                          >
                            {t("highestRoutes.time")}
                          </span>
                          <span
                            className={`${styles["route-details-controls__stat-value"]} typography-desktop-label-medium`}
                          >
                            {formatTime(routeDetails.route.properties.time)}
                          </span>
                        </div>
                      </div>
                      <div
                        className={styles["route-details-controls__stat-item"]}
                      >
                        <div
                          className={
                            styles["route-details-controls__stat-icon"]
                          }
                        >
                          <Clock size={10} />
                        </div>
                        <div
                          className={
                            styles["route-details-controls__stat-content"]
                          }
                        >
                          <span
                            className={`${styles["route-details-controls__stat-label"]} typography-desktop-label-medium`}
                          >
                            {t("highestRoutes.movingTime")}
                          </span>
                          <span
                            className={`${styles["route-details-controls__stat-value"]} typography-desktop-label-medium`}
                          >
                            {formatTime(
                              routeDetails.route.properties.moving_time
                            )}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Additional Info Row with Collapse Button */}
                <div
                  className={`${
                    styles["route-details-controls__additional-info"]
                  } ${
                    isStatsCollapsed
                      ? styles[
                          "route-details-controls__additional-info--collapsed"
                        ]
                      : ""
                  }`}
                >
                  <div
                    className={
                      styles["route-details-controls__additional-info-left"]
                    }
                  >
                    <div
                      className={styles["route-details-controls__peaks-info"]}
                    >
                      <MountainIcon size={12} />
                      <span className="typography-desktop-label-medium">
                        {peaks.length} {t("userPeaks.peaks")}
                      </span>
                    </div>
                    {formatActivityType && (
                      <div
                        className={
                          styles["route-details-controls__activity-info"]
                        }
                      >
                        <Activity size={12} />
                        <span className="typography-desktop-label-medium">
                          {formatActivityType(
                            routeDetails.route.properties.activity_type
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {onToggleStatsCollapse && (
                    <button
                      className={
                        styles["route-details-controls__collapse-button"]
                      }
                      onClick={onToggleStatsCollapse}
                      aria-label={
                        isStatsCollapsed
                          ? t("routeDetails.showStats")
                          : t("routeDetails.hideStats")
                      }
                    >
                      {isStatsCollapsed ? (
                        <>
                          <span className="typography-desktop-button-small">
                            {t("routeDetails.showStats")}
                          </span>
                          <ChevronDown size={16} />
                        </>
                      ) : (
                        <>
                          <span className="typography-desktop-button-small">
                            {t("routeDetails.hideStats")}
                          </span>
                          <ChevronUp size={16} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Peak Details - Left Side */}
      <AnimatePresence mode="wait">
        {selectedPeakId && (
          <motion.div
            key={selectedPeakId}
            className={styles["route-details-controls__peak-details"]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Peak Details Header */}
            {selectedPeakData && (
              <div
                className={
                  styles["route-details-controls__peak-details-header"]
                }
              >
                <div className={styles["route-details-controls__peak-info"]}>
                  <div className={styles["route-details-controls__peak-names"]}>
                    <div
                      className={
                        styles["route-details-controls__peak-name-row"]
                      }
                    >
                      <h1
                        className={`${styles["route-details-controls__peak-name"]} typography-body-medium`}
                      >
                        {selectedPeakData.name || selectedPeakData.name_en}
                      </h1>
                      <div
                        className={
                          styles["route-details-controls__elevation-info"]
                        }
                      >
                        <img
                          src={getElevationIconForHeader(
                            selectedPeakData.elevation
                          )}
                          alt="Elevation icon"
                          className={
                            styles["route-details-controls__elevation-icon"]
                          }
                        />
                        <span
                          className={`${styles["route-details-controls__elevation-value"]} typography-desktop-label-small`}
                          style={{
                            color: getElevationColor(
                              selectedPeakData.elevation
                            ),
                          }}
                        >
                          {formatElevation(selectedPeakData.elevation)}
                        </span>
                      </div>
                    </div>
                    {selectedPeakData.name_en &&
                      selectedPeakData.name !== selectedPeakData.name_en && (
                        <span
                          className={
                            styles["route-details-controls__peak-name-en"]
                          }
                        >
                          {selectedPeakData.name_en}
                        </span>
                      )}
                  </div>
                </div>
                <button
                  className={
                    styles["route-details-controls__peak-details-close"]
                  }
                  onClick={onClosePeakDetails}
                  aria-label="Close peak details"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Peak Details Content */}
            <div
              key={selectedPeakId}
              className={styles["route-details-controls__peak-details-content"]}
            >
              <Suspense fallback={<LoadingScreen />}>
                <PeakDetailsMap
                  peakId={selectedPeakId}
                  onClose={onClosePeakDetails}
                />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons Container - Download and Animation */}
      {!isAnimating && !isComplete && (
        <div className={styles["route-details-controls__action-buttons"]}>
          {/* Create Animation Button */}
          {canCreateAnimation && (
            <button
              className={styles["route-details-controls__animation-button"]}
              onClick={startAnimation}
              disabled={!map || !isMapReady}
              aria-label={t("routeAnimation.createAnimation")}
              title={t("routeAnimation.createAnimation")}
            >
              <Video size={16} />
              <span className="typography-desktop-button-small">
                {t("routeAnimation.createAnimation")}
              </span>
            </button>
          )}

          {/* Download Route Button */}
          {onDownloadGPX && (
            <button
              className={styles["route-details-controls__download-button"]}
              onClick={onDownloadGPX}
              aria-label={downloadButtonLabel || "Download route"}
              title={downloadButtonLabel || "Download route"}
            >
              <Download size={16} />
              {downloadButtonLabel && (
                <span className="typography-desktop-button-small">
                  {downloadButtonLabel}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Bottom Left: MapLayers Icon */}
      {!isAnimating && !isComplete && (
        <div className={styles["route-details-controls__layers-container"]}>
          <MapLayersDropdown
            onStyleChange={onStyleChange}
            onGlobeToggle={onGlobeToggle}
            onTerrainToggle={onTerrainToggle || (() => {})}
            currentStyle={currentStyle}
            isGlobeEnabled={isGlobeEnabled}
            isTerrainEnabled={isTerrainEnabled}
            map={map}
          />
        </div>
      )}

      {/* Route Animation Overlay */}
      {routeDetails && (
        <RouteAnimationModal
          isAnimating={isAnimatingFromHook}
          isPaused={isPaused}
          isComplete={isComplete}
          currentSpeed={currentSpeed}
          stats={stats}
          routeName={routeDetails.route?.name || "Route"}
          videoBlob={videoBlob}
          isDesktop={true}
          onCancel={cancelAnimation}
          onPause={handlePause}
          onResume={handleResume}
          onSpeedIncrease={handleSpeedIncrease}
          onSpeedDecrease={handleSpeedDecrease}
          onShare={handleShare}
          onCompletionCancel={handleCancel}
          onWatchAgain={handleWatchAgain}
          usePortal={false}
          t={t}
        />
      )}
    </div>
  );
};

export default React.memo(RouteDetailsControls);
