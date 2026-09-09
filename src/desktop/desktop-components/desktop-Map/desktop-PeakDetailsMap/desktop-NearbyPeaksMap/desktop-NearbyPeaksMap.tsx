import React, { useState, useEffect, useRef } from "react";
import styles from "./desktop-NearbyPeaksMap.module.css";
import { getPeakAdditionalInfo } from "../../../../../shared/api/endpoints/peaks";
import type { PeakAdditionalInfo } from "../../../../../shared/api/types";
import { Navigation, ChevronLeft, ChevronRight } from "lucide-react";
import MountainIcon from "../../../../../shared/components/MountainIcon/MountainIcon";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../../../shared/context/I18nContext";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../../shared/hooks/usePeakDetailsAnalytics";
import { useUnitFormat } from "../../../../../shared/hooks/useUnitFormat";

// Elevation color and icon logic (copied from PeakHeader)
const getElevationColor = (elevation: number) => {
  if (elevation >= 8000) return "#000000";
  if (elevation >= 6000) return "#480001";
  if (elevation >= 4000) return "#ff0000";
  if (elevation >= 3000) return "#ff7300";
  if (elevation >= 2000) return "#ffbb00";
  return "#00ae21";
};
const getElevationIcon = (elevation: number) => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

type NearbyPeaksProps = {
  peakId: number;
};

type NearbyPeak = PeakAdditionalInfo["nearby_peaks"][number];

const NearbyPeaksMap: React.FC<NearbyPeaksProps> = ({ peakId }) => {
  const { t } = useI18n();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop_map",
    "nearby_peaks",
    peakId
  );
  const [additionalInfo, setAdditionalInfo] =
    useState<PeakAdditionalInfo | null>(null);
  const { formatDistance, formatMeters: formatElevation } = useUnitFormat();
  const navigate = useNavigate();
  const nearbyPeaksScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const hideArrowTimeoutRef = useRef<{
    left: NodeJS.Timeout | null;
    right: NodeJS.Timeout | null;
  }>({ left: null, right: null });

  useEffect(() => {
    if (!peakId) return;

    getPeakAdditionalInfo(peakId)
      .then((data) => {
        setAdditionalInfo(data);
      })
      .catch(() => {});
  }, [peakId]);

  // Check scroll position for nearby peaks scroll
  const checkScrollPosition = () => {
    if (!nearbyPeaksScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } =
      nearbyPeaksScrollRef.current;
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
    }
  };

  useEffect(() => {
    if (!nearbyPeaksScrollRef.current) return;
    checkScrollPosition();
    const scrollElement = nearbyPeaksScrollRef.current;
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
  }, [additionalInfo?.nearby_peaks]);

  const scrollNearbyPeaks = (direction: "left" | "right") => {
    trackSectionEvent("button_click", `scroll_${direction}`);
    if (!nearbyPeaksScrollRef.current) return;
    const scrollAmount = 300;
    const startPosition = nearbyPeaksScrollRef.current.scrollLeft;
    const targetPosition =
      startPosition + (direction === "left" ? -scrollAmount : scrollAmount);
    const startTime = performance.now();
    const duration = 300; // 0.3 seconds

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Easing function for smooth animation
      const ease =
        progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

      if (nearbyPeaksScrollRef.current) {
        nearbyPeaksScrollRef.current.scrollLeft =
          startPosition + (targetPosition - startPosition) * ease;
      }

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  const nearbyPeaks: NearbyPeak[] = additionalInfo?.nearby_peaks || [];
  usePeakDetailsView(
    "desktop_map",
    "nearby_peaks",
    nearbyPeaks.length > 0,
    peakId
  );

  const handleCardClick = (targetPeakId: number) => {
    trackSectionEvent("peak_click", "open", targetPeakId);
    navigate(`/peaks/${targetPeakId}`);
  };

  return (
    <section className={styles["nearby-peaks"]}>
      <div className={styles["nearby-peaks__header-wrapper"]}>
        <h3
          className={`${styles["nearby-peaks__title"]} typography-desktop-body-small`}
        >
          <MountainIcon className={styles["nearby-peaks__icon"]} />
          {t("nearbyPeaks.title")}
        </h3>
      </div>
      {nearbyPeaks.length > 0 ? (
        <div className={styles["nearby-peaks__scroll-container"]}>
          {canScrollLeft && (
            <button
              className={`${styles["nearby-peaks__scroll-arrow"]} ${styles["nearby-peaks__scroll-arrow--left"]}`}
              onClick={() => scrollNearbyPeaks("left")}
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {canScrollRight && (
            <button
              className={`${styles["nearby-peaks__scroll-arrow"]} ${styles["nearby-peaks__scroll-arrow--right"]}`}
              onClick={() => scrollNearbyPeaks("right")}
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
          <div
            className={styles["nearby-peaks__scroll"]}
            ref={nearbyPeaksScrollRef}
          >
            {nearbyPeaks.map((peak) => {
              const hasImage = Boolean(peak.image);
              const elevationColor = getElevationColor(peak.elevation);
              const elevationIcon = getElevationIcon(peak.elevation);
              return (
                <div
                  key={peak.id}
                  className={styles["nearby-peaks__card"]}
                  onClick={() => handleCardClick(peak.id)}
                  style={
                    hasImage
                      ? { backgroundImage: `url(${peak.image})` }
                      : {
                          background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
                          position: "relative",
                        }
                  }
                >
                  {/* Top gradient overlay for text readability */}
                  <div className={styles["nearby-peaks__card-overlay-top"]} />
                  {/* Faded background elevation icon if no image */}
                  {!hasImage && (
                    <img
                      src={elevationIcon}
                      alt="Elevation icon background"
                      className={styles["nearby-peaks__card-elevation-icon-bg"]}
                    />
                  )}
                  <div className={styles["nearby-peaks__card-content"]}>
                    {/* Title at the top */}
                    <div
                      className={`${styles["nearby-peaks__card-name-row"]} typography-desktop-body-small`}
                    >
                      <div
                        className={`${styles["nearby-peaks__card-name"]} typography-desktop-body-small`}
                      >
                        {peak.name}
                      </div>
                    </div>
                    {/* Elevation row just below the title */}
                    <div className={styles["nearby-peaks__card-elevation-row"]}>
                      <img
                        src={elevationIcon}
                        alt="Elevation icon"
                        className={
                          styles["nearby-peaks__card-elevation-icon-inline"]
                        }
                      />
                      <span
                        className={`${styles["nearby-peaks__card-elevation-value"]} typography-desktop-label-medium`}
                      >
                        {formatElevation(peak.elevation)}
                      </span>
                    </div>
                    {/* Distance at bottom right, no 'away' text */}
                    <div className={styles["nearby-peaks__card-distance-row"]}>
                      <span
                        className={styles["nearby-peaks__card-distance-icon"]}
                      >
                        <Navigation size={14} />
                      </span>
                      <span
                        className={`${styles["nearby-peaks__card-distance-value"]} typography-desktop-label-medium`}
                      >
                        {formatDistance(peak.distance_km)}
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
          className={`${styles["nearby-peaks__no-data"]} typography-desktop-body-small`}
        >
          {t("nearbyPeaks.noData")}
        </div>
      )}
    </section>
  );
};

export default NearbyPeaksMap;
