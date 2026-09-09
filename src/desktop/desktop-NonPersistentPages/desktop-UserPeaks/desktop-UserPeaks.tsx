import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, Expand, ChevronRight, Plus } from "lucide-react";
import type { UserPeak } from "../../../shared/api/types";
import { useUserPeaksData } from "../../../shared/hooks/peaks/useUserPeaksData";
import type { FilterState, SortOption, SortField, SortDirection } from "../../../shared/hooks/peaks/types";
import { useIntersectionObserver } from "../../desktop-hooks/desktop-useIntersectionObserver.ts";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import LoginRequiredPopup from "../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen";
import { removeImageSizeRestriction } from "../../../shared/utils/imageUtils";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import { useAdminLevels } from "../../../shared/hooks/useAdminLevels";

import styles from "./desktop-UserPeaks.module.css";
import { UnifiedControls } from "../../desktop-components/desktop-UnifiedFilters";
import { useOptionalOverlayContext } from "../../desktop-components/desktop-Overlay/desktop-OverlayContext";
import OverlayHeader from "../../desktop-components/desktop-Overlay/desktop-OverlayHeader/desktop-OverlayHeader";
import DesktopPeakInfoModal from "./desktop-PeakInfoModal";
import { getElevationColor } from "../../../shared/constants/elevationColors";

// SingleDatePicker usage moved into UnifiedFilterSection



const getElevationIcon = (elevation: number) => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};



type DayData = {
  day: number;
  month: number;
  year: number;
  monthName: string;
  fullDate: string;
  peaks: UserPeak[];
};

// List Peak Item Component for non-date sorting
const ListPeakItem = React.memo(
  ({
    peak,
    onPeakClick,
    onYourAscensionsClick,
    userName,
  }: {
    peak: UserPeak;
    onPeakClick: (peakId: number) => void;
    onYourAscensionsClick?: (peak: UserPeak) => void;
    userName?: string;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const navigate = useNavigate();
    const { t } = useI18n();
    const { formatMeters } = useUnitFormat();
    const { ref } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: "100px",
      freezeOnceVisible: true,
    });

    // Height animation refs for summary text
    const summaryWrapperRef = useRef<HTMLDivElement>(null);
    const summaryInnerRef = useRef<HTMLDivElement>(null);
    const [summaryMeasured, setSummaryMeasured] = useState({
      collapsed: 0,
      expanded: 0,
    });
    const [summaryCurrentHeight, setSummaryCurrentHeight] = useState<
      number | "auto"
    >(0);

    const handleCardClick = useCallback(() => {
      onPeakClick(peak.id);
    }, [peak.id, onPeakClick]);

    const handleListItemClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      },
      [isExpanded],
    );

    const handleImageClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onPeakClick(peak.id);
      },
      [peak.id, onPeakClick],
    );

    const handleChevronClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      },
      [isExpanded],
    );

    const isCompleted = peak.user?.completed || false;
    const hasImage = Boolean(peak.image);
    const elevationIcon = getElevationIcon(peak.elevation);
    const elevationColor = getElevationColor(peak.elevation);

    // Format routes and dates for summary text
    const routeNames =
      peak.user?.routes?.map((route) => route.name).filter(Boolean) || [];
    const routeIds = peak.user?.routes?.map((route) => route.id) || [];
    const routeDates =
      peak.user?.routes?.map((route) =>
        new Date(route.date).toLocaleDateString(),
      ) || [];

    // Format route names with dates in parentheses, making them clickable
    const formatRouteNamesWithDates = (
      names: string[],
      routeIds: number[],
      dates: string[],
    ) => {
      if (names.length === 0) return "1 route";
      if (names.length === 1) {
        return (
          <a
            href={`/routes/${routeIds[0]}`}
            className={styles["userPeaks__summary-route-link"]}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/routes/${routeIds[0]}`);
            }}
          >
            {names[0]} ({dates[0]})
          </a>
        );
      }
      if (names.length === 2) {
        return (
          <>
            <a
              href={`/routes/${routeIds[0]}`}
              className={styles["userPeaks__summary-route-link"]}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/routes/${routeIds[0]}`);
              }}
            >
              {names[0]} ({dates[0]})
            </a>{" "}
            {t("userPeaks.summary.and")}{" "}
            <a
              href={`/routes/${routeIds[1]}`}
              className={styles["userPeaks__summary-route-link"]}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/routes/${routeIds[1]}`);
              }}
            >
              {names[1]} ({dates[1]})
            </a>
          </>
        );
      }
      return (
        <>
          {names.slice(0, -1).map((name, index) => (
            <React.Fragment key={routeIds[index]}>
              <a
                href={`/routes/${routeIds[index]}`}
                className={styles["userPeaks__summary-route-link"]}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/routes/${routeIds[index]}`);
                }}
              >
                {name} ({dates[index]})
              </a>
              {index < names.length - 2 ? ", " : ""}
            </React.Fragment>
          ))}{" "}
          {t("userPeaks.summary.and")}{" "}
          <a
            href={`/routes/${routeIds[routeIds.length - 1]}`}
            className={styles["userPeaks__summary-route-link"]}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigate(`/routes/${routeIds[routeIds.length - 1]}`);
            }}
          >
            {names[names.length - 1]} ({dates[names.length - 1]})
          </a>
        </>
      );
    };

    // Get the appropriate summary text based on number of routes
    const getSummaryText = () => {
      if (routeNames.length === 0) return "";

      const count = peak.user?.count || 1;

      // Create count text with proper singular/plural for each language
      const getCountText = () => {
        if (count === 1) {
          return (
            <b>
              {count} {t("userPeaks.summary.timeSingular")}
            </b>
          );
        } else {
          return (
            <b>
              {count} {t("userPeaks.summary.timePlural")}
            </b>
          );
        }
      };

      // Get the base text for each language
      const getBaseText = () => {
        // Use the translation system to get the base text
        if (userName) {
          return t("userPeaks.summary.userBaseText", { userName });
        }
        return t("userPeaks.summary.baseText");
      };

      return (
        <>
          {getBaseText()} {peak.name} {getCountText()}{" "}
          {t("userPeaks.summary.in")}{" "}
          {formatRouteNamesWithDates(routeNames, routeIds, routeDates)}
        </>
      );
    };

    // Measure heights for smooth summary text animation
    useEffect(() => {
      const wrapper = summaryWrapperRef.current;
      const inner = summaryInnerRef.current;
      if (!wrapper || !inner) return;

      // Temporarily set to auto to measure expanded
      const prevHeight = wrapper.offsetHeight;
      wrapper.style.height = "auto";
      inner.style.display = "-webkit-box";
      (inner.style as CSSStyleDeclaration & { [key: string]: string })[
        "-webkit-box-orient"
      ] = "vertical";
      (inner.style as CSSStyleDeclaration & { [key: string]: string })[
        "-webkit-line-clamp"
      ] = "3";
      const collapsedH = inner.offsetHeight;

      inner.style.display = "block";
      (inner.style as CSSStyleDeclaration & { [key: string]: string })[
        "-webkit-line-clamp"
      ] = "unset";
      const expandedH = inner.offsetHeight;

      setSummaryMeasured({ collapsed: collapsedH, expanded: expandedH });
      // Restore previous height to prep for animation
      wrapper.style.height = prevHeight + "px";
      // Next frame, set target height
      requestAnimationFrame(() => {
        setSummaryCurrentHeight(summaryExpanded ? expandedH : collapsedH);
        wrapper.style.height =
          (summaryExpanded ? expandedH : collapsedH) + "px";
      });
    }, [summaryExpanded, isExpanded]);

    return (
      <motion.div
        ref={ref}
        className={`${styles["userPeaks__list-item"]} ${
          isCompleted ? styles["userPeaks__list-item--completed"] : ""
        } ${isExpanded ? styles["userPeaks__list-item--expanded"] : ""}`}
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Main list item content */}
        <div
          className={styles["userPeaks__list-item-content"]}
          onClick={handleListItemClick}
        >
          {/* Square image on the left */}
          <motion.div
            className={styles["userPeaks__list-item-image"]}
            animate={{ x: isExpanded ? -100 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {hasImage ? (
              <img
                src={removeImageSizeRestriction(peak.image) || ""}
                alt={peak.name}
                className={styles["userPeaks__list-item-image-img"]}
              />
            ) : (
              <div
                className={styles["userPeaks__list-item-image-placeholder"]}
                style={{
                  background: `linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)), ${elevationColor}`,
                }}
              >
                <img
                  src={elevationIcon}
                  alt="Elevation icon"
                  className={styles["userPeaks__list-item-elevation-icon"]}
                />
              </div>
            )}
          </motion.div>

          {/* Content on the right */}
          <div className={styles["userPeaks__list-item-info-wrapper"]}>
            <motion.div
              className={styles["userPeaks__list-item-info"]}
              animate={{
                x: isExpanded ? -100 : 0,
                width: isExpanded ? "calc(100% + 110px)" : "100%",
                marginLeft: isExpanded ? "6px" : "0",
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* First row: Title */}
              <div
                className={`${styles["userPeaks__list-item-title"]} typography-desktop-body-small`}
              >
                {peak.name}
              </div>

              {/* Second row: Elevation, region, country all in one line */}
              <div className={styles["userPeaks__list-item-details"]}>
                <img
                  src={elevationIcon}
                  alt="Elevation icon"
                  className={styles["userPeaks__list-item-details-icon"]}
                />
                <span className={styles["userPeaks__list-item-elevation"]}>
                  {formatMeters(peak.elevation)}
                </span>
                <span className={styles["userPeaks__list-item-location"]}>
                  {getLocationFromHierarchy(peak.admin_hierarchy)}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Chevron on the far right */}
          <motion.button
            className={`${styles["userPeaks__list-item-chevron"]} ${
              isExpanded ? styles["userPeaks__list-item-chevron--expanded"] : ""
            }`}
            onClick={handleChevronClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <ChevronDown size={20} />
            </motion.div>
          </motion.button>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className={styles["userPeaks__list-item-expanded"]}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              {/* Full-width image */}
              <motion.div
                className={styles["userPeaks__list-item-expanded-image"]}
                initial={{ opacity: 0, x: -100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, ease: "easeInOut", delay: 0.1 }}
                onClick={handleImageClick}
                style={{ cursor: "pointer" }}
              >
                {hasImage ? (
                  <img
                    src={removeImageSizeRestriction(peak.image) || ""}
                    alt={peak.name}
                    className={
                      styles["userPeaks__list-item-expanded-image-img"]
                    }
                  />
                ) : (
                  <div
                    className={
                      styles["userPeaks__list-item-expanded-image-placeholder"]
                    }
                    style={{
                      background: `linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)), ${elevationColor}`,
                    }}
                  >
                    <img
                      src={elevationIcon}
                      alt="Elevation icon"
                      className={
                        styles["userPeaks__list-item-expanded-elevation-icon"]
                      }
                    />
                  </div>
                )}

                {/* Open peak button (other users' peaks) */}
                {!onYourAscensionsClick && (
                  <button
                    className={styles["userPeaks__list-item-open-button"]}
                    onClick={handleCardClick}
                  >
                    <Expand size={14} />
                    {t("userPeaks.openPeak")}
                  </button>
                )}
              </motion.div>

              {/* Action buttons below image (own peaks only) */}
              {onYourAscensionsClick && (
                <div className={styles["userPeaks__list-item-action-row"]}>
                  <button
                    className={`${styles["userPeaks__list-item-action-btn"]} typography-desktop-label-medium`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onYourAscensionsClick(peak);
                    }}
                  >
                    {t("userPeaks.yourAscensions")}
                  </button>
                  <button
                    className={`${styles["userPeaks__list-item-action-btn"]} typography-desktop-label-medium`}
                    onClick={handleCardClick}
                  >
                    {t("userPeaks.peakDetails")}
                  </button>
                </div>
              )}

              {/* Summary text */}
              <motion.div
                className={styles["userPeaks__list-item-summary"]}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut", delay: 0.15 }}
              >
                <div
                  ref={summaryWrapperRef}
                  className={styles["userPeaks__summary-text-wrapper"]}
                  style={{
                    height:
                      typeof summaryCurrentHeight === "number"
                        ? summaryCurrentHeight
                        : undefined,
                  }}
                >
                  <div ref={summaryInnerRef}>
                    <p className={styles["userPeaks__summary-text"]}>
                      {getSummaryText()}
                    </p>
                  </div>
                </div>
                {summaryMeasured.expanded > summaryMeasured.collapsed && (
                  <button
                    className={styles["userPeaks__summary-see-more-btn"]}
                    onClick={() => setSummaryExpanded(!summaryExpanded)}
                    type="button"
                  >
                    {summaryExpanded ? "See Less" : "See More"}
                    <ChevronRight
                      size={16}
                      className={
                        styles["userPeaks__summary-see-more-chevron"] +
                        (summaryExpanded ? " " + styles["rotated"] : "")
                      }
                    />
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },
);

ListPeakItem.displayName = "ListPeakItem";

// Simple Lazy Peak Card Component (for grid view)
const LazyPeakCard = React.memo(
  ({
    peak,
    index,
    isSimpleGrid,
    onPeakClick,
    showAscentsCount,
  }: {
    peak: UserPeak;
    index: number;
    isSimpleGrid: boolean;
    onPeakClick: (peakId: number) => void;
    showAscentsCount?: boolean;
  }) => {
    const { t } = useI18n();
    const { formatMeters } = useUnitFormat();
    const { ref } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: "100px",
      freezeOnceVisible: true,
    });

    const handleCardClick = useCallback(() => {
      onPeakClick(peak.id);
    }, [peak.id, onPeakClick]);

    const itemClass = isSimpleGrid
      ? styles["userPeaks__peak-grid-item"]
      : `${styles["userPeaks__peak-grid-item"]} ${
          styles[`userPeaks__peak-grid-item--${index + 1}`]
        }`;

    const completionCount = peak.user?.count || 0;
    const isCompleted = peak.user?.completed || false;

    const hasImage = Boolean(peak.image);
    const elevationColor = getElevationColor(peak.elevation);
    const elevationIcon = getElevationIcon(peak.elevation);

    return (
      <div
        ref={ref}
        key={`peak-${peak.id}`}
        className={`${itemClass} ${styles["userPeaks__grid-item-optimized"]} ${
          isCompleted ? styles["userPeaks__peak-grid-item--completed"] : ""
        }`}
        onClick={handleCardClick}
        style={
          hasImage
            ? {
                backgroundImage: `url(${
                  removeImageSizeRestriction(peak.image) || ""
                })`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }
            : {
                background: `linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)), ${elevationColor}`,
              }
        }
      >
        {/* Faded background elevation icon if no image */}
        {!hasImage && (
          <img
            src={elevationIcon}
            alt="Elevation icon background"
            className={styles["userPeaks__peak-grid__card-elevation-icon-bg"]}
          />
        )}

        <div className={styles["userPeaks__peak-grid-content"]}>
          {/* Top section: Always show main content */}
          <div className={styles["userPeaks__peak-main-content"]}>
            {/* First row: Title (max 1 line with ellipsis) */}
            <div
              className={`${styles["userPeaks__peak-title-row"]} typography-desktop-body-small`}
            >
              <h3
                className={`${styles["userPeaks__peak-title"]} typography-desktop-body-small`}
              >
                {peak.name}
              </h3>
            </div>

            {/* Second row: Elevation icon + elevation + Region + Country flowing together */}
            <div className={styles["userPeaks__peak-info-row"]}>
              <div className={styles["userPeaks__peak-elevation-and-location"]}>
                <img
                  src={elevationIcon}
                  alt="Elevation icon"
                  className={
                    styles["userPeaks__peak-grid__card-elevation-icon-inline"]
                  }
                />
                <span className={styles["userPeaks__peak-elevation"]}>
                  {formatMeters(peak.elevation)}
                </span>
                <span className={styles["userPeaks__peak-location"]}>
                  {getLocationFromHierarchy(peak.admin_hierarchy)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom section: User data (always at bottom, show if exists) */}
          {isCompleted && peak.user?.routes && peak.user.routes.length > 0 && (
            <div className={styles["userPeaks__peak-user-data"]}>
              {/* Show all dates in one row */}
              <div className={styles["userPeaks__dates-section"]}>
                <span className={styles["userPeaks__route-date"]}>
                  {peak.user.routes.map((route, routeIndex) => (
                    <span key={routeIndex}>
                      {new Date(route.date).toLocaleDateString()}
                      {routeIndex < (peak.user?.routes?.length || 0) - 1 &&
                        ", "}
                    </span>
                  ))}
                </span>
              </div>

              {/* Ascents count below dates */}
              <div className={styles["userPeaks__ascents-section"]}>
                <span className={styles["userPeaks__ascents-count"]}>
                  {completionCount} ascents
                </span>
              </div>
            </div>
          )}

          {/* Ascents count badge for grid view (non-timeline) */}
          {showAscentsCount && (
            <div className={styles["userPeaks__ascents-badge"]}>
              <span className={styles["userPeaks__ascents-badge-text"]}>
                {completionCount} {t("highestPeaks.ascents")}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  },
);

LazyPeakCard.displayName = "LazyPeakCard";

// Memoized Peak Grid Component
const PeakGrid = memo(
  ({
    chunk,
    chunkIndex,
    isIncompleteGrid,
    isMirrored,
    getGridLayoutClass,
    onPeakClick,
    showAscentsCount,
  }: {
    chunk: UserPeak[];
    chunkIndex: number;
    isIncompleteGrid: boolean;
    isMirrored: boolean;
    getGridLayoutClass: (count: number) => string;
    onPeakClick: (peakId: number) => void;
    showAscentsCount?: boolean;
  }) => {
    let gridClasses = styles["userPeaks__peak-grid"];

    if (isIncompleteGrid) {
      gridClasses += ` ${getGridLayoutClass(chunk.length)}`;
    } else if (isMirrored) {
      gridClasses += ` ${styles["userPeaks__peak-grid--mirrored"]}`;
    }

    return (
      <div key={`grid-${chunkIndex}`} className={gridClasses}>
        {chunk.map((peak, index) => (
          <LazyPeakCard
            key={`grid-peak-${peak.id}-${chunkIndex}-${index}`}
            peak={peak}
            index={index}
            isSimpleGrid={isIncompleteGrid}
            onPeakClick={onPeakClick}
            showAscentsCount={showAscentsCount ?? false}
          />
        ))}
      </div>
    );
  },
);

PeakGrid.displayName = "PeakGrid";

// Memoized Timeline Day Component
const TimelineDay = memo(
  ({
    dayData,
    onPeakClick,
    onYourAscensionsClick,
    userName,
  }: {
    dayData: DayData;
    onPeakClick: (peakId: number) => void;
    onYourAscensionsClick?: (peak: UserPeak) => void;
    userName?: string;
  }) => {
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);
    const dateKey = `${dayData.year}-${dayData.month
      .toString()
      .padStart(2, "0")}-${dayData.day.toString().padStart(2, "0")}`;

    const hasMoreThan4 = dayData.peaks.length > 4;
    const displayedPeaks = isExpanded
      ? dayData.peaks
      : dayData.peaks.slice(0, 4);

    return (
      <div key={dateKey} className={styles["userPeaks__day-section"]}>
        {/* Day Header - Non-clickable */}
        <div className={styles["userPeaks__day-header"]}>
          <span
            className={`${styles["userPeaks__day-title"]} typography-desktop-body-small`}
          >
            {dayData.fullDate}
          </span>
        </div>

        {/* Day Peaks List - Show Max 4 Peaks by Default */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>
          {displayedPeaks.map((peak, index) => (
            <ListPeakItem
              key={`timeline-peak-${dateKey}-${peak.id}-${index}`}
              peak={peak}
              onPeakClick={onPeakClick}
              {...(onYourAscensionsClick && { onYourAscensionsClick })}
              {...(userName !== undefined && { userName })}
            />
          ))}
        </div>

        {/* See More / See Less Button */}
        {hasMoreThan4 && (
          <div className={styles["userPeaks__day-show-more-container"]}>
            <button
              className={styles["userPeaks__day-show-more-button"]}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <span className="typography-desktop-label-medium">
                {isExpanded ? t("main.seeLess") : t("main.seeMore")}
              </span>
              <ChevronDown
                size={16}
                className={`${styles["userPeaks__day-show-more-chevron"]} ${
                  isExpanded
                    ? styles["userPeaks__day-show-more-chevron--rotated"]
                    : ""
                }`}
              />
            </button>
          </div>
        )}
      </div>
    );
  },
);

TimelineDay.displayName = "TimelineDay";

const UserPeaks: React.FC = () => {
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const [searchParams] = useSearchParams();
  const { user, authReady } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { id } = useParams<{ id?: string }>();

  // Parse URL parameters for sorting
  const getInitialSortOption = useCallback((): SortOption => {
    const sortField = searchParams.get("sort") as SortField;
    const sortDirection = searchParams.get("direction") as SortDirection;

    // Validate and return default if invalid
    const validFields: SortField[] = ["name", "elevation", "date", "ascents"];
    const validDirections: SortDirection[] = ["asc", "desc"];

    if (
      validFields.includes(sortField) &&
      validDirections.includes(sortDirection)
    ) {
      return { field: sortField, direction: sortDirection };
    }

    return { field: "elevation", direction: "desc" };
  }, [searchParams]);

  // Initial values for state
  const initialFilters: FilterState = {
    startDate: null,
    endDate: null,
    elevationRange: [0, 8849],
    admin_osm_ids: [],
    admin_names: [],
    searchQuery: "",
    selectedCountry: null,
    selectedRegion: null,
  };

  const initialSort: SortOption = {
    field: "elevation",
    direction: "desc",
  };

  // State
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [sortOption, setSortOption] = useState<SortOption>(initialSort);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showPeakInfoModal, setShowPeakInfoModal] = useState(false);
  const [selectedPeakId, setSelectedPeakId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const hasTriggeredLoadMoreRef = useRef(false);
  const hasUserScrolledRef = useRef(false);

  // Admin hierarchy levels for location filtering
  const { adminLevels, handleAdminLevelChange, resetAdminLevels } = useAdminLevels();

  // Hook for data fetching
  const {
    peaksData,
    allPeaks,
    loading,
    isLoadingMore,
    isLoadingPeaks,
    hasMore,
    currentPage,
    error,
    fetchPeaks,
    setAllPeaks,
  } = useUserPeaksData(user, filters, sortOption, id);

  // Update sort option when URL parameters change
  useEffect(() => {
    const newSortOption = getInitialSortOption();
    setSortOption((prev) =>
      prev.field === newSortOption.field &&
      prev.direction === newSortOption.direction
        ? prev
        : newSortOption,
    );
  }, [getInitialSortOption]);

  // View mode based on sort field
  const viewMode = useMemo(() => {
    // If sorting by date, always show timeline view regardless of filters
    if (sortOption.field === "date") {
      return "date";
    }

    // For non-date sorting (name, elevation), always use grid view
    return "grid";
  }, [sortOption]);

  // Handle transition timeout
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isTransitioning]);

  const handleYourAscensionsClick = useCallback((peak: UserPeak) => {
    setSelectedPeakId(peak.id);
    setShowPeakInfoModal(true);
    trackEvent("interaction", `userPeaks_desktop_peak_info_open_${peak.id}`);
  }, [trackEvent]);

  const handlePeakDeleted = useCallback(() => {
    if (selectedPeakId) {
      setAllPeaks((prev) => prev.filter((p) => p.id !== selectedPeakId));
    }
  }, [selectedPeakId, setAllPeaks]);

  // Handle various events to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(target)
      ) {
        setIsSortDropdownOpen(false);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      const target = event.target as Node;

      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(target)
      ) {
        setIsSortDropdownOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      // Don't close dropdown when scrolling within dropdown menus
      const target = e.target as Element;
      if (
        target &&
        (target.closest("[data-dropdown]") ||
          target.closest(".orderby__menu") ||
          target.closest(".unified-filters-popup"))
      ) {
        return; // Don't close dropdown when scrolling within these elements
      }
      setIsSortDropdownOpen(false);
    };

    const handleResize = () => {
      setIsSortDropdownOpen(false);
    };

    // Prevent body scroll when any dropdown is open
    const preventScroll = (e: Event) => {
      // Allow scrolling within dropdown menus
      const target = e.target as Element;
      if (
        target &&
        (target.closest("[data-dropdown]") ||
          target.closest(".orderby__menu") ||
          target.closest(".unified-filters-popup"))
      ) {
        return; // Allow scrolling within these elements
      }
      e.preventDefault();
    };

    const isAnyDropdownOpen = isSortDropdownOpen;

    if (isAnyDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleTouchStart);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      // Prevent scrolling on body
      document.body.style.overflow = "hidden";
      document.addEventListener("wheel", preventScroll, { passive: false });
      document.addEventListener("touchmove", preventScroll, { passive: false });

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);

        // Restore scrolling
        document.body.style.overflow = "";
        document.removeEventListener("wheel", preventScroll);
        document.removeEventListener("touchmove", preventScroll);
      };
    }
    return undefined;
  }, [isSortDropdownOpen]);

  // Fetch user peaks data
  useEffect(() => {
  /* Old fetchUserPeaks replaced by hook */
  }, [user, id, trackEvent]);

  // Update overlay name for breadcrumbs when peaks data loads
  useEffect(() => {
    if (!peaksData?.user_name || !id || !overlayContext) return;

    const baseStorageKey = `userpeaks:${id}`;

    // Find the overlay in the stack that matches this user peaks
    const matchingOverlay = overlayContext.overlayStack.find(
      (overlay) => overlay.baseStorageKey === baseStorageKey,
    );

    // Only update if the name is different to avoid unnecessary updates
    if (matchingOverlay && matchingOverlay.name !== peaksData.user_name) {
      overlayContext.updateOverlayNameByBaseKey(
        baseStorageKey,
        peaksData.user_name,
      );
    }
  }, [peaksData?.user_name, id, overlayContext]);

  // Process peaks data into hierarchical structure for timeline view
  const processedData = useMemo(() => {
    if (!allPeaks.length) return { days: [], allPeaks: [] };

    // Group by date (year, month, day) - flat structure
    const dateMap = new Map<string, UserPeak[]>();

    allPeaks.forEach((peak) => {
      if (peak.user?.routes?.length) {
        peak.user.routes.forEach((route) => {
          const date = new Date(route.date);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const dateKey = `${year}-${month.toString().padStart(2, "0")}-${day
            .toString()
            .padStart(2, "0")}`;

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, []);
          }
          dateMap.get(dateKey)!.push(peak);
        });
      }
    });

    // Convert to array structure - flat list of days
    const days: DayData[] = Array.from(dateMap.entries())
      .map(([dateKey, dayPeaks]) => {
        const [year, month, day] = dateKey.split("-").map(Number);
        const date = new Date(year ?? 0, (month ?? 0) - 1, day ?? 0);

        return {
          day: day ?? 0,
          month: month ?? 0,
          year: year ?? 0,
          monthName: date.toLocaleString("default", { month: "short" }),
          fullDate: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          peaks: dayPeaks,
        };
      })
      .sort((a, b) => {
        // Sort days based on the current sort option
        if (sortOption.field === "date") {
          const aDate = new Date(a.year, a.month - 1, a.day).getTime();
          const bDate = new Date(b.year, b.month - 1, b.day).getTime();

          if (sortOption.direction === "asc") {
            return aDate - bDate; // Oldest first
          } else {
            return bDate - aDate; // Newest first
          }
        } else {
          // Maintaining consistency with mobile
          const aDate = new Date(a.year, a.month - 1, a.day).getTime();
          const bDate = new Date(b.year, b.month - 1, b.day).getTime();
          return bDate - aDate; // Most recent first
        }
      });

    return { days, allPeaks: allPeaks };
  }, [allPeaks, sortOption]);

  // availableCountries and availableRegions were unused and causing errors
  // They are calculated from peaksData which might be filtered, better to use adminLevels from useAdminLevels


  // Memoized event handlers
  const handleSortChange = useCallback(
    (field: SortField, direction: SortDirection) => {
      const newSortOption = { field, direction };
      if (
        newSortOption.field === sortOption.field &&
        newSortOption.direction === sortOption.direction
      )
        return;

      // Close dropdown immediately
      setIsSortDropdownOpen(false);

      // Track sort change
      trackEvent("sort_change", `userPeaks_${field}_${direction}`);

      // Then start loading and transition
      setIsLoading(true);
      setIsTransitioning(true);
      setSortOption(newSortOption);
    },
    [sortOption, trackEvent],
  );

  const handlePeakClick = useCallback(
    (peakId: number) => {
      trackEvent("peak_click", `userPeaks_${peakId}`);
      navigate(`/peaks/${peakId}`);
    },
    [navigate, trackEvent],
  );

  const handleLoadMore = useCallback(() => {
    trackEvent("pagination", "userPeaks_desktop_load_more");
    if (hasMore && !isLoadingMore && !isLoadingPeaks) {
      fetchPeaks(currentPage + 1);
    }
  }, [
    currentPage,
    fetchPeaks,
    hasMore,
    isLoadingMore,
    isLoadingPeaks,
    trackEvent,
  ]);

  const maybeTriggerLoadMore = useCallback(() => {
    if (
      !hasMore ||
      isLoadingMore ||
      isLoadingPeaks ||
      loading ||
      allPeaks.length === 0 ||
      !hasUserScrolledRef.current ||
      hasTriggeredLoadMoreRef.current
    ) {
      return;
    }

    hasTriggeredLoadMoreRef.current = true;
    handleLoadMore();
  }, [
    allPeaks.length,
    handleLoadMore,
    hasMore,
    isLoadingMore,
    isLoadingPeaks,
    loading,
  ]);

  const checkSentinelNearViewport = useCallback(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) {
      return;
    }

    const rect = sentinel.getBoundingClientRect();
    if (rect.top - window.innerHeight < 250) {
      maybeTriggerLoadMore();
    }
  }, [maybeTriggerLoadMore]);

  const handleSortDropdownToggle = useCallback(() => {
    if (!isLoading) {
      trackEvent("button_click", `userPeaks_desktop_sort_dropdown_${isSortDropdownOpen ? "close" : "open"}`);
      setIsSortDropdownOpen(!isSortDropdownOpen);
    }
  }, [isLoading, isSortDropdownOpen, trackEvent]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      const previous = searchQuery.trim();
      setSearchQuery(query);
      const trimmed = query.trim();
      if (trimmed !== previous && (trimmed.length === 0 || trimmed.length === 2 || trimmed.length % 5 === 0)) {
        trackEvent("search_query", `userPeaks_desktop_${trimmed.length}`);
      }

      // Trigger loading state for search
      if (query.trim() !== searchQuery.trim()) {
        setIsLoading(true);
        setIsTransitioning(true);
      }
    },
    [searchQuery, trackEvent],
  );

  const handleSearchClear = useCallback(() => {
    trackEvent("search_query", "userPeaks_desktop_clear");
    setSearchQuery("");
    setIsLoading(true);
    setIsTransitioning(true);
  }, [trackEvent]);

  // Filter update handler (applies immediately)
  const handleUpdateFilters = useCallback(
    (newFilters: Partial<FilterState>) => {
      if (newFilters.selectedCountry !== undefined) {
        trackEvent("filter_change", `userPeaks_desktop_country_${newFilters.selectedCountry || "all"}`);
        handleAdminLevelChange(0, newFilters.selectedCountry ? Number(newFilters.selectedCountry) : null);
      }
      if (newFilters.selectedRegion !== undefined) {
        trackEvent("filter_change", `userPeaks_desktop_region_${newFilters.selectedRegion || "all"}`);
        handleAdminLevelChange(1, newFilters.selectedRegion ? Number(newFilters.selectedRegion) : null);
      }
      if (newFilters.startDate !== undefined || newFilters.endDate !== undefined) {
        trackEvent("filter_change", `userPeaks_desktop_date_${newFilters.startDate || "null"}_${newFilters.endDate || "null"}`);
      }
      if (newFilters.elevationRange !== undefined) {
        trackEvent("filter_change", `userPeaks_desktop_elevation_${newFilters.elevationRange[0]}_${newFilters.elevationRange[1]}`);
      }

      setFilters((prev) => {
        const merged: FilterState = { ...prev, ...newFilters };

        if (
          newFilters.selectedCountry !== undefined ||
          newFilters.selectedRegion !== undefined
        ) {
          const selectedCountry = merged.selectedCountry ?? null;
          const selectedRegion = merged.selectedRegion ?? null;

          const mostSpecificOsmId = selectedRegion
            ? Number(selectedRegion)
            : selectedCountry
              ? Number(selectedCountry)
              : null;

          const mostSpecificName = selectedRegion
            ? adminLevels[1]?.options.find(
                (region) => String(region.osm_id) === selectedRegion,
              )?.name ?? null
            : selectedCountry
              ? adminLevels[0]?.options.find(
                  (country) => String(country.osm_id) === selectedCountry,
                )?.name ?? null
              : null;

          merged.admin_osm_ids = mostSpecificOsmId ? [mostSpecificOsmId] : [];
          merged.admin_names = mostSpecificName ? [mostSpecificName] : [];
        }

        return merged;
      });
      setIsLoading(true);
      setIsTransitioning(true);
    },
    [trackEvent, handleAdminLevelChange, adminLevels],
  );

  const clearAllFilters = useCallback(() => {
    trackEvent("filter_change", "userPeaks_desktop_clear_all");
    const clearedFilters: FilterState = {
      startDate: null,
      endDate: null,
      elevationRange: [0, 8849] as [number, number],
      admin_osm_ids: [],
      admin_names: [],
      selectedCountry: null,
      selectedRegion: null,
    };
    setFilters(clearedFilters);
    setSearchQuery("");
    resetAdminLevels();
    setIsLoading(true);
    setIsTransitioning(true);
  }, [trackEvent, resetAdminLevels]);

  useEffect(() => {
    if (isLoadingPeaks || isLoadingMore) {
      return;
    }
    hasTriggeredLoadMoreRef.current = false;
    if (hasUserScrolledRef.current) {
      checkSentinelNearViewport();
    }
  }, [allPeaks.length, checkSentinelNearViewport, isLoadingMore, isLoadingPeaks]);

  useEffect(() => {
    if (currentPage === 1) {
      hasUserScrolledRef.current = false;
    }
  }, [currentPage]);

  useEffect(() => {
    if (!hasMore || allPeaks.length === 0 || loading) {
      return;
    }

    const handleUserScroll = () => {
      hasUserScrolledRef.current = true;
      checkSentinelNearViewport();
    };

    document.addEventListener("scroll", handleUserScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", checkSentinelNearViewport);

    return () => {
      document.removeEventListener("scroll", handleUserScroll, true);
      window.removeEventListener("resize", checkSentinelNearViewport);
    };
  }, [
    allPeaks.length,
    hasMore,
    loading,
    checkSentinelNearViewport,
  ]);

  const waitingForAuth = !id && !authReady && !user;

  if (loading || waitingForAuth) {
    return (
      <div className={styles["userPeaks"]}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  if (error || (!peaksData && !waitingForAuth)) {
    return (
      <div className={styles["userPeaks"]}>
        <div className={styles["userPeaks__content"]}>
          <OverlayHeader title={t("main.myPeaks")} />
          <div
            className={`${styles["userPeaks__error-container"]} typography-desktop-label-medium`}
          >
            <p className="typography-desktop-body-small">
              {error || "Failed to load peaks"}
            </p>
            <button
              className={styles["userPeaks__retry-button"]}
              onClick={() => {
                trackEvent("button_click", "userPeaks_desktop_retry");
                window.location.reload();
              }}
            >
              {t("common.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!peaksData) {
    return null;
  }

  return (
    <>
      <div className={styles["userPeaks"]}>
        <div className={styles["userPeaks__content"]}>
          {/* Login Required Popup */}
          <LoginRequiredPopup
            isOpen={showLoginPopup}
            onClose={() => {
              trackEvent("interaction", "userPeaks_desktop_login_required_closed");
              setShowLoginPopup(false);
            }}
            message="auth.loginRequired.myPeaks"
          />

          {/* Controls with Header and Info Section */}
          <div className={styles["userPeaks__filters-wrapper"]}>
            <UnifiedControls
              headerTitle={
                id && peaksData?.user_name
                  ? t("userPeaks.userTitle", { userName: peaksData.user_name })
                  : t("userPeaks.title")
              }
              headerRightContent={undefined}
              infoDescription={
                id && peaksData?.user_name
                  ? t("userPeaks.userDescription", {
                      userName: peaksData.user_name,
                      count: peaksData.total_peaks,
                    })
                  : t("userPeaks.description", { count: peaksData.total_peaks })
              }
              infoStats={[
                {
                  label: t("main.totalPeaks"),
                  value: peaksData.total_peaks,
                  variant: "primary",
                },
              ]}
              showMapButton={!id}
              onMapClick={() => {
                trackEvent("button_click", `userPeaks_desktop_map_open_${id ? "external" : "self"}`);
                if (id) {
                  // For external user peaks, navigate to map with userId parameter
                  navigate(`/map?userId=${id}`);
                } else {
                  // For current user's peaks, navigate to map with userPeaks parameter
                  navigate(`/map?userPeaks=true`);
                }
              }}
              searchValue={searchQuery}
              searchPlaceholder={t("userPeaks.searchPlaceholder")}
              onSearchChange={handleSearchChange}
              onSearchClear={handleSearchClear}
              scope="userPeaks"
              t={t}
              localFilters={filters}
              onUpdateFilters={handleUpdateFilters}
              onClearFilters={clearAllFilters}
              availableCountries={
                adminLevels[0]?.options.map((c) => ({
                  value: String(c.osm_id),
                  label: c.name,
                })) || []
              }
              availableRegions={
                adminLevels[1]?.options.map((r) => ({
                  value: String(r.osm_id),
                  label: r.name,
                })) || []
              }
              includeElevation={true}
              orderLabel={
                sortOption.field === "name"
                  ? t("listDetails.sorting.name")
                  : sortOption.field === "elevation"
                  ? t("listDetails.sorting.elevation")
                  : sortOption.field === "ascents"
                  ? t("listDetails.sorting.ascents")
                  : t("listDetails.sorting.date")
              }
              orderValue={
                sortOption as {
                  field: "name" | "elevation" | "ascents" | "date";
                  direction: "asc" | "desc";
                }
              }
              orderSections={[
                {
                  title: t("listDetails.sorting.name"),
                  options: [
                    {
                      field: "name",
                      direction: "asc",
                      label: t("listDetails.sortingOptions.nameAsc"),
                    },
                    {
                      field: "name",
                      direction: "desc",
                      label: t("listDetails.sortingOptions.nameDesc"),
                    },
                  ],
                },
                {
                  title: t("listDetails.sorting.elevation"),
                  options: [
                    {
                      field: "elevation",
                      direction: "asc",
                      label: t("listDetails.sortingOptions.elevationAsc"),
                    },
                    {
                      field: "elevation",
                      direction: "desc",
                      label: t("listDetails.sortingOptions.elevationDesc"),
                    },
                  ],
                },
                {
                  title: t("listDetails.sorting.ascents"),
                  options: [
                    {
                      field: "ascents",
                      direction: "desc",
                      label: t("listDetails.sortingOptions.ascentsMost"),
                    },
                    {
                      field: "ascents",
                      direction: "asc",
                      label: t("listDetails.sortingOptions.ascentsLeast"),
                    },
                  ],
                },
                {
                  title: t("listDetails.sorting.date"),
                  options: [
                    {
                      field: "date",
                      direction: "desc",
                      label: t("listDetails.sortingOptions.dateNewest"),
                    },
                    {
                      field: "date",
                      direction: "asc",
                      label: t("listDetails.sortingOptions.dateOldest"),
                    },
                  ],
                },
              ]}
              isOrderOpen={isSortDropdownOpen}
              isOrderClosing={false}
              onOrderToggle={handleSortDropdownToggle}
              onOrderChange={(f, d) =>
                handleSortChange(
                  f as "name" | "elevation" | "ascents" | "date",
                  d,
                )
              }
              orderDisabled={loading || isLoadingPeaks}
            />
          </div>

          {/* Add Peaks Button - only for current user */}
          {!id && (
            <div className={styles["userPeaks__add-peaks-button"]}>
              <button
                className={`${styles["userPeaks__add-peaks-btn"]} typography-desktop-button-small`}
                onClick={() => {
                  trackEvent("button_click", "userPeaks_desktop_add_manual_open");
                  navigate("/addManualPeaks");
                }}
              >
                <Plus size={18} />
                {t("userPeaks.addPeaks")}
              </button>
            </div>
          )}

          {/* Content Area */}
          <div className={styles["userPeaks__content-area"]}>
            {/* Loading Spinner */}
            {(loading || isLoadingPeaks) && (
              <div className={styles["userPeaks__content-loading-spinner"]}>
                <Loader2
                  size={24}
                  className={styles["userPeaks__loading-spinner"]}
                />
                <p className={styles["userPeaks__loading-text"]}>
                  {t("listDetails.loading")}
                </p>
              </div>
            )}

            {/* Timeline View - Flat Daily List */}
            {!(loading || isLoadingPeaks) && viewMode === "date" && (
              <>
                <div className={styles["userPeaks__timeline-view"]}>
                  {!processedData.days || processedData.days.length === 0 ? (
                    <div className={styles["userPeaks__no-results"]}>
                      <p className="typography-desktop-body-small">
                        {t("userPeaks.noResults")}
                      </p>
                    </div>
                  ) : (
                    <div className={styles["userPeaks__timeline-container"]}>
                      <div className={styles["userPeaks__timeline-column"]}>
                        {processedData.days
                          .filter((_, index) => index % 2 === 0)
                          .map((dayData) => {
                            const userName = id && peaksData?.user_name ? peaksData.user_name : undefined;
                            return (
                              <TimelineDay
                                key={`${dayData.year}-${dayData.month}-${dayData.day}`}
                                dayData={dayData}
                                onPeakClick={handlePeakClick}
                                {...(!id && { onYourAscensionsClick: handleYourAscensionsClick })}
                                {...(userName !== undefined && { userName })}
                              />
                            );
                          })}
                      </div>
                      <div className={styles["userPeaks__timeline-column"]}>
                        {processedData.days
                          .filter((_, index) => index % 2 === 1)
                          .map((dayData) => {
                            const userName = id && peaksData?.user_name ? peaksData.user_name : undefined;
                            return (
                              <TimelineDay
                                key={`${dayData.year}-${dayData.month}-${dayData.day}`}
                                dayData={dayData}
                                onPeakClick={handlePeakClick}
                                {...(!id && { onYourAscensionsClick: handleYourAscensionsClick })}
                                {...(userName !== undefined && { userName })}
                              />
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* List View (for non-date sorting) */}
            {!(loading || isLoadingPeaks) && viewMode === "grid" && (
              <div
                className={`${styles["userPeaks__list-container"]} ${
                  isTransitioning
                    ? styles["userPeaks__list-container--transitioning"]
                    : styles["userPeaks__list-container--loaded"]
                }`}
              >
                {allPeaks.length === 0 ? (
                  <div className={styles["userPeaks__no-results"]}>
                    <p className="typography-desktop-body-small">
                      {t("userPeaks.noResults")}
                    </p>
                  </div>
                ) : (
                  <div className={styles["userPeaks__list--grid"]}>
                    <div className={styles["userPeaks__list-column"]}>
                      {allPeaks
                        .filter((_, index) => index % 2 === 0)
                        .map((peak, index) => {
                          const userName =
                            id && peaksData?.user_name
                              ? peaksData.user_name
                              : undefined;
                          return (
                            <ListPeakItem
                              key={`list-peak-${peak.id}-${index * 2}`}
                              peak={peak}
                              onPeakClick={handlePeakClick}
                              {...(!id && { onYourAscensionsClick: handleYourAscensionsClick })}
                              {...(userName !== undefined && { userName })}
                            />
                          );
                        })}
                    </div>
                    <div className={styles["userPeaks__list-column"]}>
                      {allPeaks
                        .filter((_, index) => index % 2 === 1)
                        .map((peak, index) => {
                          const userName =
                            id && peaksData?.user_name
                              ? peaksData.user_name
                              : undefined;
                          return (
                            <ListPeakItem
                              key={`list-peak-${peak.id}-${index * 2 + 1}`}
                              peak={peak}
                              onPeakClick={handlePeakClick}
                              {...(!id && { onYourAscensionsClick: handleYourAscensionsClick })}
                              {...(userName !== undefined && { userName })}
                            />
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!loading && !isLoadingPeaks && hasMore && allPeaks.length > 0 && (
              <div
                ref={loadMoreSentinelRef}
                className={`${styles["userPeaks__load-more-container"]} ${
                  !isLoadingMore ? styles["userPeaks__load-more-container--idle"] : ""
                }`}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2
                      className={styles["userPeaks__load-more-spinner"]}
                      size={20}
                    />
                    <span className="typography-desktop-label-medium">
                      {t("listDetails.loading")}
                    </span>
                  </>
                ) : (
                  <div style={{ height: "1px" }} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <DesktopPeakInfoModal
        isOpen={showPeakInfoModal}
        peakId={selectedPeakId}
        onClose={() => {
          setShowPeakInfoModal(false);
          setSelectedPeakId(null);
        }}
        onPeakDeleted={handlePeakDeleted}
      />
    </>
  );
};

export default UserPeaks;
