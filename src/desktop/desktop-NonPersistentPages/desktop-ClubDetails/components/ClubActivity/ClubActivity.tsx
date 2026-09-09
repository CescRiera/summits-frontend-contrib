import React, { useRef, useState, useEffect, useCallback } from "react";
import { Route as RouteIcon, ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../../../../../shared/context/I18nContext";
import { LeafletRouteMap } from "../../../../../shared/components/LeafletRouteMap";
import { getElevationIcon, getElevationSoftColor } from "../../../../../shared/constants/elevationColors";
import { ActivitySkeleton } from "../../skeletons";
import { smoothScrollHorizontal } from "../../../../desktop-utils/desktop-smoothScroll";
import styles from "./ClubActivity.module.css";
import type { ClubActivityFilter } from "../../../../../shared/api/types/clubs";

interface ClubActivityProps {
  items: any[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  filter: ClubActivityFilter;
  onFilterChange: (filter: ClubActivityFilter) => void;
  onItemClick: (id: number) => void;
  onUserClick: (id: number) => void;
  formatDate: (date: string) => string;
  formatStatDistance: (val: number) => string;
  formatStatElevationGain: (val: number) => string;
  formatDuration: (val: number) => string;
  formatMeters: (val: number) => string;
  observerRef: React.RefObject<HTMLDivElement | null>;
  imgErrors: Set<number>;
  onImgError: (id: number) => void;
  avatarErrors: Set<number>;
  onAvatarError: (id: number) => void;
}

const ClubActivity: React.FC<ClubActivityProps> = ({
  items,
  isLoading,
  isFetchingNextPage,
  filter,
  onFilterChange,
  onItemClick,
  onUserClick,
  formatDate,
  formatStatDistance,
  formatStatElevationGain,
  formatDuration,
  formatMeters,
  observerRef,
  imgErrors,
  onImgError,
  avatarErrors,
  onAvatarError,
}) => {
  const { t } = useI18n();

  // Scroll logic states
  const peaksScrollRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState<Map<string, boolean>>(new Map());
  const [canScrollRight, setCanScrollRight] = useState<Map<string, boolean>>(new Map());
  const hideArrowTimeoutRef = useRef<Map<string, { left: NodeJS.Timeout | null; right: NodeJS.Timeout | null }>>(new Map());

  const checkScrollPosition = useCallback((itemId: string) => {
    const scrollContainer = peaksScrollRefs.current.get(itemId);
    if (!scrollContainer) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
    const canScrollLeftNow = scrollLeft > 0;
    const canScrollRightNow = scrollLeft < scrollWidth - clientWidth - 1;

    const timeouts = hideArrowTimeoutRef.current.get(itemId) || { left: null, right: null };
    if (timeouts.left) { clearTimeout(timeouts.left); timeouts.left = null; }
    if (timeouts.right) { clearTimeout(timeouts.right); timeouts.right = null; }

    if (canScrollLeftNow) {
      setCanScrollLeft(prev => new Map(prev).set(itemId, true));
    } else {
      timeouts.left = setTimeout(() => {
        setCanScrollLeft(prev => new Map(prev).set(itemId, false));
      }, 1000);
    }

    if (canScrollRightNow) {
      setCanScrollRight(prev => new Map(prev).set(itemId, true));
    } else {
      timeouts.right = setTimeout(() => {
        setCanScrollRight(prev => new Map(prev).set(itemId, false));
      }, 1000);
    }

    hideArrowTimeoutRef.current.set(itemId, timeouts);
  }, []);

  const handleScrollPeaks = (itemId: string, direction: "left" | "right") => {
    const scrollContainer = peaksScrollRefs.current.get(itemId);
    smoothScrollHorizontal(scrollContainer ?? null, direction, 400);
  };

  useEffect(() => {
    const checkAllScroll = () => {
      items.forEach(item => {
        const id = `${item.route_id}-${item.activity_date}-${item.user.id}`;
        if (item.peaks?.length > 0) checkScrollPosition(id);
      });
    };

    checkAllScroll();
    
    const resizeObserver = new ResizeObserver(() => checkAllScroll());
    peaksScrollRefs.current.forEach(el => resizeObserver.observe(el));

    const scrollHandlers = new Map<string, () => void>();
    peaksScrollRefs.current.forEach((el, itemId) => {
      const handler = () => checkScrollPosition(itemId);
      el.addEventListener("scroll", handler);
      scrollHandlers.set(itemId, handler);
    });

    return () => {
      resizeObserver.disconnect();
      scrollHandlers.forEach((handler, itemId) => {
        const el = peaksScrollRefs.current.get(itemId);
        if (el) el.removeEventListener("scroll", handler);
      });
      hideArrowTimeoutRef.current.forEach(t => {
        if (t.left) clearTimeout(t.left);
        if (t.right) clearTimeout(t.right);
      });
    };
  }, [items, checkScrollPosition]);

  return (
    <div className={styles["club-activity"]}>
      <div className={styles["club-activity__header"]}>
        <span className={`${styles["club-activity__title"]} typography-desktop-title-medium`}>
          {t("clubs.activity.latestRoutes") || "Latest routes of the club"}
        </span>
        <div className={styles["club-activity__filters"]}>
          <div className={styles["club-activity__toggle-group"]}>
            <button
              type="button"
              className={`${styles["club-activity__toggle-button"]} ${
                filter === "all_routes" ? styles["club-activity__toggle-button--active"] : ""
              } typography-desktop-button-small`}
              onClick={() => onFilterChange("all_routes")}
            >
              {t("clubs.activity.allRoutes") || "All routes"}
            </button>
            <button
              type="button"
              className={`${styles["club-activity__toggle-button"]} ${
                filter === "with_peaks" ? styles["club-activity__toggle-button--active"] : ""
              } typography-desktop-button-small`}
              onClick={() => onFilterChange("with_peaks")}
            >
              {t("clubs.activity.withPeaks") || "With peaks"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles["club-activity__list"]}>
        {isLoading ? (
          <>
            <ActivitySkeleton />
            <ActivitySkeleton />
          </>
        ) : items.length === 0 ? (
          <div className={styles["club-activity__empty"]}>
            <RouteIcon size={26} />
            <p className="typography-desktop-body-small">
              {t("clubs.activity.empty") || "No activity yet."}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const itemId = `${item.route_id}-${item.activity_date}-${item.user.id}`;
            const peaksCount = item.peaks?.length || 0;
            const displayPeaksCount = Math.min(3, peaksCount);
            
            return (
              <article
                key={itemId}
                className={styles["club-activity__card"]}
                onClick={() => onItemClick(item.route_id)}
              >
                {/* Header Row */}
                <div className={styles["club-activity__header"]}>
                  <div
                    className={styles["club-activity__user-info"]}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUserClick(item.user.id);
                    }}
                  >
                    {item.user.image && !avatarErrors.has(item.user.id) ? (
                      <img
                        src={item.user.image}
                        alt={item.user.name}
                        className={styles["club-activity__user-avatar"]}
                        onError={() => onAvatarError(item.user.id)}
                      />
                    ) : (
                      <div className={`${styles["club-activity__user-avatar-fallback"]} typography-desktop-label-small`}>
                        {item.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={styles["club-activity__user-details"]}>
                      <span className={`${styles["club-activity__user-name"]} typography-desktop-title-small`}>
                        {item.user.name}
                      </span>
                      {item.activity_type && (
                         <span className={`${styles["club-activity__activity-type"]} typography-desktop-label-medium`}>
                           {item.activity_type}
                         </span>
                      )}
                    </div>
                  </div>

                  <div className={styles["club-activity__header-right"]}>
                    <span className={`${styles["club-activity__date"]} typography-desktop-label-small`}>
                      {formatDate(item.activity_date)}
                    </span>
                  </div>
                </div>

                {/* Route Name */}
                <h3 className={`${styles["club-activity__route-name"]} typography-desktop-body-small`}>
                  {item.route_name}
                </h3>

                {/* Second Section: Image + Info */}
                <div className={styles["club-activity__second-section"]}>
                  <div className={styles["club-activity__image-section"]}>
                    {item.route_image && !imgErrors.has(item.route_id) ? (
                      <img
                        src={item.route_image}
                        alt={item.route_name}
                        className={styles["club-activity__image"]}
                        onError={() => onImgError(item.route_id)}
                      />
                    ) : item.coordinates?.coordinates?.length ? (
                      <div className={styles["club-activity__map"]}>
                        <LeafletRouteMap coordinates={item.coordinates} peaks={item.peaks ?? []} />
                      </div>
                    ) : (
                      <div className={styles["club-activity__media-fallback"]}>
                        <ImageOff size={24} />
                      </div>
                    )}
                  </div>

                  <div className={styles["club-activity__right-section"]}>
                    {/* Stats */}
                    <div className={styles["club-activity__stats"]}>
                      <div className={styles["club-activity__stat"]}>
                        <span className={`${styles["club-activity__stat-label"]} typography-desktop-label-small`}>
                          {t("clubs.metrics.distance") || "Distance"}
                        </span>
                        <span className={`${styles["club-activity__stat-value"]} typography-desktop-label-medium`}>
                          {formatStatDistance(item.distance)}
                        </span>
                      </div>
                      <div className={styles["club-activity__stat"]}>
                        <span className={`${styles["club-activity__stat-label"]} typography-desktop-label-small`}>
                          {t("clubs.metrics.totalElevationGain") || "Gain"}
                        </span>
                        <span className={`${styles["club-activity__stat-value"]} typography-desktop-label-medium`}>
                          {formatStatElevationGain(item.elevation_gain)}
                        </span>
                      </div>
                      <div className={styles["club-activity__stat"]}>
                        <span className={`${styles["club-activity__stat-label"]} typography-desktop-label-small`}>
                          {t("clubs.metrics.totalTime") || "Time"}
                        </span>
                        <span className={`${styles["club-activity__stat-value"]} typography-desktop-label-medium`}>
                          {formatDuration(item.time_seconds)}
                        </span>
                      </div>
                    </div>

                    {/* Peaks Section with Scroll Buttons */}
                    <div className={styles["club-activity__peaks-wrapper"]}>
                      {item.peaks.length === 0 ? (
                        <div className={`${styles["club-activity__no-peaks"]} typography-desktop-body-small`}>
                          {t("userRoutes.noPeaksOnRoute") || "No peaks on route"}
                        </div>
                      ) : (
                        <div className={styles["club-activity__peaks-scroll-container"]}>
                          {canScrollLeft.get(itemId) && (
                            <button
                              type="button"
                              className={`${styles["club-activity__nav-btn"]} ${styles["club-activity__nav-btn--left"]}`}
                              onClick={(e) => { e.stopPropagation(); handleScrollPeaks(itemId, "left"); }}
                            >
                              <ChevronLeft size={20} />
                            </button>
                          )}
                          
                          <div
                            ref={el => { if (el) peaksScrollRefs.current.set(itemId, el); else peaksScrollRefs.current.delete(itemId); }}
                            className={styles["club-activity__peaks-scroll"]}
                            style={{ "--peaks-count": displayPeaksCount } as React.CSSProperties}
                          >
                            {item.peaks.map((peak: any) => (
                              <div
                                key={peak.id}
                                className={styles["club-activity__peak-card"]}
                                style={{ backgroundColor: !peak.image ? getElevationSoftColor(peak.elevation) : undefined }}
                              >
                                {peak.image ? (
                                  <img src={peak.image} alt={peak.name} className={styles["club-activity__peak-image"]} />
                                ) : (
                                  <img
                                    src={getElevationIcon(peak.elevation)}
                                    alt=""
                                    className={styles["club-activity__peak-elevation-icon-bg"]}
                                  />
                                )}
                                <div className={styles["club-activity__peak-overlay"]} />
                                <div className={styles["club-activity__peak-content"]}>
                                  <div className={styles["club-activity__peak-header"]}>
                                    <img
                                      src={getElevationIcon(peak.elevation)}
                                      alt=""
                                      className={styles["club-activity__peak-icon"]}
                                    />
                                    <span
                                      className="typography-desktop-label-small"
                                      style={{ color: "#fff", fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
                                    >
                                      {formatMeters(peak.elevation)}
                                    </span>
                                  </div>
                                  <span className={`${styles["club-activity__peak-name"]} typography-desktop-label-small`}>
                                    {peak.name_en || peak.name}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {canScrollRight.get(itemId) && (
                            <button
                              type="button"
                              className={`${styles["club-activity__nav-btn"]} ${styles["club-activity__nav-btn--right"]}`}
                              onClick={(e) => { e.stopPropagation(); handleScrollPeaks(itemId, "right"); }}
                            >
                              <ChevronRight size={20} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {(isFetchingNextPage) && (
        <div className={styles["club-activity__list"]} style={{ marginTop: "24px" }}>
          <ActivitySkeleton />
        </div>
      )}
      <div ref={observerRef} style={{ height: 20 }} />
    </div>
  );
};

export default ClubActivity;
