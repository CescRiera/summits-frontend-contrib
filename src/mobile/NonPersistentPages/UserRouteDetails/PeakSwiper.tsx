import React, { useRef, useEffect, useCallback, memo, useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";
// Swiper CSS imports are fine at runtime; add ts-expect-error to satisfy TS bundler typing
// @ts-expect-error - Swiper CSS imports are handled at runtime
import "swiper/css";
import styles from "./PeakSwiper.module.css";
import { MapPin, Info } from "lucide-react";
import type { CompletedPeak } from "../../../shared/api/types";
import { usePeakSynchronization } from "./usePeakSynchronization";
import { useNavigate } from "react-router-dom";
import { getElevationColor } from "../../../shared/constants/elevationColors";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";

interface PeakSwiperProps {
  peaks: CompletedPeak[];
  selectedPeakId?: number | null;
  onPeakSelect?: (peakId: number) => void;
  onFlyToPeak?: (peak: { lng?: number; lat?: number; name?: string }) => void;
}

const PeakSwiper: React.FC<PeakSwiperProps> = memo(
  ({ peaks, selectedPeakId, onPeakSelect, onFlyToPeak }) => {
    const swiperRef = useRef<SwiperType | null>(null);
    const navigate = useNavigate();
    const { formatMeters } = useUnitFormat();

    // Use the synchronization hook
    const { handleSwiperSlideChange, setSwiperRef } = usePeakSynchronization({
      selectedPeakId: selectedPeakId || null,
      onPeakSelect: onPeakSelect || (() => {}),
      peaks,
      onFlyToPeak: onFlyToPeak || (() => {}), // Pass the flyTo callback
    });

    /**
     * Handle peak card click - memoized to prevent unnecessary re-renders
     */
    const handlePeakClick = useCallback(
      (peakId: string) => {
        if (onPeakSelect) {
          onPeakSelect(Number(peakId));
        }
      },
      [onPeakSelect]
    );

    /**
     * Handle see more button click
     */
    const handleSeeMore = useCallback(
      (peakId: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent card click
        navigate(`/peaks/${peakId}`);
      },
      [navigate]
    );

    /**
     * Update swiper when peaks change (but not when selected peak changes)
     * Optimized to only update when peaks array reference changes
     */
    useEffect(() => {
      if (swiperRef.current && peaks.length > 0) {
        // Update the swiper when peaks data changes
        swiperRef.current.update();
      }
    }, [peaks.length]); // Only depend on length, not the entire array

    /**
     * Get mountain icon based on elevation (same logic as MapPopup)
     */
    const getMountainIcon = useMemo(() => {
      const iconCache = new Map<number, string>();

      return (elevation: number): string => {
        if (iconCache.has(elevation)) {
          return iconCache.get(elevation)!;
        }

        let icon: string;
        if (elevation >= 8000) icon = "/icons/altitude/ic_mountain_black.png";
        else if (elevation >= 6000)
          icon = "/icons/altitude/ic_mountain_burgundy.png";
        else if (elevation >= 4000)
          icon = "/icons/altitude/ic_mountain_red.png";
        else if (elevation >= 3000)
          icon = "/icons/altitude/ic_mountain_orange.png";
        else if (elevation >= 2000)
          icon = "/icons/altitude/ic_mountain_yellow.png";
        else if (elevation >= 1000)
          icon = "/icons/altitude/ic_mountain_green.png";
        else icon = "/icons/altitude/ic_mountain_green.png";

        iconCache.set(elevation, icon);
        return icon;
      };
    }, []);

    /**
     * Get elevation color based on elevation (using centralized system)
     */
    const getElevationColorCached = useMemo(() => {
      const colorCache = new Map<number, string>();

      return (elevation: number): string => {
        if (colorCache.has(elevation)) {
          return colorCache.get(elevation)!;
        }

        const color = getElevationColor(elevation);
        colorCache.set(elevation, color);
        return color;
      };
    }, []);

    /**
     * Get lighter version of elevation color for selected border
     */
    const getElevationColorLight = useMemo(() => {
      const lightColorCache = new Map<number, string>();

      return (elevation: number): string => {
        if (lightColorCache.has(elevation)) {
          return lightColorCache.get(elevation)!;
        }

        let lightColor: string;
        if (elevation >= 8000) lightColor = "rgb(71, 85, 105)"; // lighter black
        else if (elevation >= 6000) lightColor = "#A00040"; // lighter burgundy
        else if (elevation >= 4000) lightColor = "#FF4040"; // lighter red
        else if (elevation >= 3000) lightColor = "#FFA040"; // lighter orange
        else if (elevation >= 2000) lightColor = "#FFE040"; // lighter yellow
        else if (elevation >= 1000) lightColor = "#40A040"; // lighter green
        else lightColor = "#40A040"; // lighter green

        lightColorCache.set(elevation, lightColor);
        return lightColor;
      };
    }, []);

    // Early return for empty peaks - memoized check
    const hasPeaks = peaks.length > 0;

    if (!hasPeaks) {
      return null;
    }

    return (
      <div className={styles["swiperContainer"]}>
        <Swiper
          grabCursor={true}
          spaceBetween={12}
          slidesPerView={1}
          centeredSlides={true}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
            setSwiperRef(swiper);
          }}
          onSlideChange={handleSwiperSlideChange}
          className={styles["swiper"]}
        >
          {peaks.map((peak) => {
            const isSelected = Number(peak.id) === selectedPeakId;
            const hasImage = Boolean(peak.image);
            const locationText = getLocationFromHierarchy(peak.admin_hierarchy);
            const mountainIconSrc = getMountainIcon(peak.elevation);
            const elevationColor = getElevationColorCached(peak.elevation);
            const elevationColorLight = getElevationColorLight(peak.elevation);

            return (
              <SwiperSlide key={peak.id} className={styles["slide"]}>
                <div
                  className={`${styles["peakCard"]} ${
                    isSelected ? styles["peakCardSelected"] : ""
                  }`}
                  onClick={() => handlePeakClick(peak.id.toString())}
                  style={{
                    ...(hasImage
                      ? {
                          backgroundImage: `url(${peak.image})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
                        }),
                    ...(isSelected && {
                      borderColor: elevationColorLight,
                      boxShadow: `0 4px 16px ${elevationColorLight}40`,
                    }),
                  }}
                >
                  {/* Black overlay for better text visibility */}
                  <div className={styles["peakCardOverlay"]} />

                  {/* Elevation icon background when no image */}
                  {!hasImage && (
                    <img
                      src={mountainIconSrc}
                      alt="Elevation icon background"
                      className={styles["elevationIconBg"]}
                    />
                  )}

                  <div className={styles["peakContent"]}>
                    {/* Top Left: Peak Name */}
                    <div className={styles["peakInfo"]}>
                      <h4
                        className={`${styles["peakName"]} typography-title-medium`}
                      >
                        {peak.name_en || peak.name}
                      </h4>
                      {peak.name_en && peak.name !== peak.name_en && (
                        <p
                          className={`${styles["peakNameLocal"]} typography-title-medium`}
                        >
                          {peak.name}
                        </p>
                      )}
                    </div>

                    {/* Bottom Section: Elevation, Location, and See More Button */}
                    <div className={styles["peakBottomSection"]}>
                      <div className={styles["peakLeftColumn"]}>
                        {/* Elevation */}
                        <div className={styles["peakElevation"]}>
                          <img
                            src={mountainIconSrc}
                            alt="Mountain icon"
                            className={styles["elevationIcon"]}
                          />
                          <span className={styles["elevationText"]}>
                            {formatMeters(peak.elevation)}
                          </span>
                        </div>

                        {/* Location */}
                        {locationText && (
                          <div className={styles["peakLocationContainer"]}>
                            <div className={styles["peakLocation"]}>
                              <MapPin
                                size={16}
                                className={styles["locationIcon"]}
                              />
                              <span className={styles["locationText"]}>
                                {locationText}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* See More Button - centered with both elevation and location */}
                      <button
                        className={styles["seeMoreButton"]}
                        onClick={(e) => handleSeeMore(peak.id.toString(), e)}
                      >
                        <Info size={16} />
                        <span className="typography-button-medium">
                          See More
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            );
          })}
        </Swiper>
      </div>
    );
  }
);

export default PeakSwiper;

PeakSwiper.displayName = "PeakSwiper";
