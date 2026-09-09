import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Route, Map, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { UserRoute } from "../../../../shared/api/types";
import { PeakCard } from "./desktop-PeakCard.tsx";
import {
  formatDistance,
  formatElevationGain,
  formatCompactTime,
} from "../../../desktop-utils/desktop-numberFormatting.ts";
import { smoothScrollHorizontal } from "../../../desktop-utils/desktop-smoothScroll.ts";
import styles from "../desktop-UserRoutes.module.css";

type RouteCardProps = {
  route: UserRoute;
  isExpanded: boolean;
  isSelectionMode?: boolean;
  onToggle: () => void;
  onPeakClick: (peakId: string) => void;
  onMapClick: (routeId: string) => void;
  onDeleteClick?: ((routeId: string) => void) | undefined;
  t: (key: string, params?: Record<string, unknown>) => string;
};

export const RouteCard: React.FC<RouteCardProps> = React.memo(
  ({ route, isExpanded, isSelectionMode, onToggle, onPeakClick, onMapClick, onDeleteClick, t }) => {
    const peaksScrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const hideArrowTimeoutRef = useRef<{
      left: NodeJS.Timeout | null;
      right: NodeJS.Timeout | null;
    }>({ left: null, right: null });

    const formatRouteDistance = React.useCallback(
      (distance: string | null | undefined) => {
        if (!distance) return "-- km";
        const num = parseFloat(distance);
        return formatDistance(num);
      },
      []
    );

    const formatTime = React.useCallback((time: string | null | undefined) => {
      return formatCompactTime(time || "");
    }, []);

    const formatDate = React.useCallback((dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }, []);

    const getPeaksLayoutClass = React.useCallback((count: number) => {
      if (count === 0) return styles["peaks-container--none"];
      if (count === 1) return styles["peaks-container--single"];
      if (count === 2) return styles["peaks-container--double"];
      return styles["peaks-container--scroll"];
    }, []);

    const handleMainClick = React.useCallback(() => {
      if (isSelectionMode) {
        onMapClick(route.id);
      } else {
        onToggle();
      }
    }, [isSelectionMode, onMapClick, onToggle, route.id]);

    // Check scroll position for peaks scroll
    const checkScrollPosition = React.useCallback(() => {
      if (!peaksScrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = peaksScrollRef.current;
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
    }, []);

    useEffect(() => {
      if (!peaksScrollRef.current || route.peaks.length <= 2) return;
      checkScrollPosition();
      const scrollElement = peaksScrollRef.current;
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
    }, [route.peaks.length, checkScrollPosition, isExpanded]);

    const scrollPeaks = React.useCallback((direction: "left" | "right") => {
      smoothScrollHorizontal(peaksScrollRef.current, direction);
    }, []);

    return (
      <div
        className={`${styles["route-card"]} ${
          isExpanded && !isSelectionMode ? styles["route-card--expanded"] : ""
        } ${isSelectionMode ? styles["route-card--selection"] : ""}`}
      >
        <div className={styles["route-card__main"]} onClick={handleMainClick}>
          <div className={styles["route-card__content"]}>
            <div className={styles["route-card__row"]}>
              <h3
                className={`${styles["route-card__name"]} typography-desktop-body-small`}
              >
                {route.name}
              </h3>
            </div>
            <div className={styles["route-card__row"]}>
              <div className={styles["route-card__meta"]}>
                <div className={styles["route-card__type"]}>
                  <Route size={14} />
                  <span className="typography-desktop-label-medium">
                    {route.activity_type}
                  </span>
                </div>
                <div
                  className={`${styles["route-card__date"]} typography-desktop-label-medium`}
                >
                  {formatDate(route.date)}
                </div>
                {route.device_model && (
                  <div
                    className={`${styles["route-card__device-model"]} typography-desktop-label-small`}
                  >
                    GARMIN {route.device_model}
                  </div>
                )}
                <div
                  className={`${styles["route-card__peaks-count"]} typography-desktop-label-medium`}
                >
                  {route.peaks_count} {t("userRoutes.peaksCount")}
                </div>
              </div>
            </div>
          </div>
          {!isSelectionMode && (
            <div className={styles["route-card__chevron"]}>
              <ChevronDown
                size={20}
                className={`${isExpanded ? styles["chevron--rotated"] : ""}`}
              />
            </div>
          )}
        </div>

        {!isSelectionMode && (
          <div className={styles["route-card__expanded"]}>
          <div className={styles["route-card__expanded-content"]}>
            <div className={styles["route-card__expanded-header"]}>
              <div className={styles["route-card__stats-grid"]}>
                <div className={styles["route-card__stat"]}>
                  <span
                    className={`${styles["route-card__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("highestRoutes.distance")}
                  </span>
                  <span
                    className="typography-desktop-label-medium"
                    style={{ minWidth: 50 }}
                  >
                    {formatRouteDistance(route.distance)}
                  </span>
                </div>
                <div className={styles["route-card__stat"]}>
                  <span
                    className={`${styles["route-card__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("highestRoutes.elevationGain")}
                  </span>
                  <span
                    className="typography-desktop-label-medium"
                    style={{ minWidth: 50 }}
                  >
                    +{formatElevationGain(route.elevation_gain)}
                  </span>
                </div>
                <div className={styles["route-card__stat"]}>
                  <span
                    className={`${styles["route-card__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("highestRoutes.time")}
                  </span>
                  <span
                    className="typography-desktop-label-medium"
                    style={{ minWidth: 50 }}
                  >
                    {formatTime(route.time)}
                  </span>
                </div>
                <div className={styles["route-card__stat"]}>
                  <span
                    className={`${styles["route-card__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("highestRoutes.movingTime")}
                  </span>
                  <span
                    className="typography-desktop-label-medium"
                    style={{ minWidth: 50 }}
                  >
                    {formatCompactTime(route.moving_time || "")}
                  </span>
                </div>
              </div>
               <div className={styles["route-card__actions-container"]}>
                 <button
                   className={styles["route-card__map-button"]}
                   onClick={(e) => {
                     e.stopPropagation();
                     onMapClick(route.id);
                   }}
                 >
                   <Map size={16} />
                   <span className="typography-desktop-button-medium">
                     {t("userRoutes.seeOnMap")}
                   </span>
                 </button>
                 {onDeleteClick && (
                   <button
                     className={styles["route-card__delete-button"]}
                     onClick={(e) => {
                       e.stopPropagation();
                       onDeleteClick(route.id);
                     }}
                   >
                     <Trash2 size={16} />
                     <span className="typography-desktop-button-medium">
                       {t("userRoutes.deleteRoute")}
                     </span>
                   </button>
                 )}
               </div>
            </div>
            <div className={styles["route-card__peaks-section"]}>
              <div className={styles["peaks-container--scroll-wrapper"]}>
                {route.peaks.length > 2 && canScrollLeft && (
                  <button
                    className={`${styles["peaks-container--scroll-arrow"]} ${styles["peaks-container--scroll-arrow--left"]} ${styles["peaks-container--scroll-arrow--visible"]}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollPeaks("left");
                    }}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                {route.peaks.length > 2 && canScrollRight && (
                  <button
                    className={`${styles["peaks-container--scroll-arrow"]} ${styles["peaks-container--scroll-arrow--right"]} ${styles["peaks-container--scroll-arrow--visible"]}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollPeaks("right");
                    }}
                    aria-label="Scroll right"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
                <div
                  ref={peaksScrollRef}
                  className={`${styles["peaks-container"]} ${getPeaksLayoutClass(
                    route.peaks.length
                  )}`}
                >
                  {route.peaks.length === 0 ? (
                    <div
                      className={`${styles["no-peaks-card"]} typography-desktop-body-small`}
                    >
                      {t("userRoutes.noPeaksOnRoute")}
                    </div>
                  ) : (
                    route.peaks.map((peak) => (
                      <PeakCard
                        key={peak.id}
                        peak={peak}
                        onClick={onPeakClick}
                        t={t}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
