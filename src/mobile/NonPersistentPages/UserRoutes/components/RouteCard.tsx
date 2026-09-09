import React, { startTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Map, Trash2 } from "lucide-react";
import type { UserRoute } from "../../../../shared/api/types";
import { useI18n } from "../../../../shared/context/I18nContext";
import {
  formatDistance,
  formatElevationGain,
  formatCompactTime,
} from "../../../utils/numberFormatting";
import { PeakCard } from "./PeakCard";
import styles from "../UserRoutes.module.css";

type RouteCardProps = {
  route: UserRoute;
  isExpanded: boolean;
  isSelectionMode?: boolean;
  onToggle: (routeId: string) => void;
  onPeakClick: (peakId: string) => void;
  onMapClick: (routeId: string) => void;
  onDeleteClick?: ((routeId: string) => void) | undefined;
  t: (key: string, params?: Record<string, unknown>) => string;
};

type RouteCardDetailsProps = Pick<
  RouteCardProps,
  "route" | "onPeakClick" | "onMapClick" | "onDeleteClick" | "t"
> & {
  showPeaks: boolean;
};

// Remove hardcoded ROUTE_DATE_FORMATTER as we use locale-aware one in component

const EXPAND_TRANSITION = {
  height: {
    duration: 0.22,
    ease: [0.22, 1, 0.36, 1] as const,
  },
  opacity: {
    duration: 0.14,
    ease: "easeOut" as const,
  },
};

const getPeaksLayoutClass = (count: number) => {
  if (count === 0) return styles["peaks-container--none"];
  if (count === 1) return styles["peaks-container--single"];
  if (count === 2) return styles["peaks-container--double"];
  return styles["peaks-container--scroll"];
};

const formatRouteDistance = (distance: string | null | undefined) => {
  if (!distance) return "-- km";
  const numericDistance = Number.parseFloat(distance);
  return Number.isFinite(numericDistance)
    ? formatDistance(numericDistance)
    : "-- km";
};

const formatRouteDate = (dateString: string, language: string) => {
  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
};

const RouteCardDetails: React.FC<RouteCardDetailsProps> = React.memo(
  ({ route, onPeakClick, onMapClick, onDeleteClick, showPeaks, t }) => {
    const handleMapClick = React.useCallback(() => {
      onMapClick(route.id);
    }, [onMapClick, route.id]);

    const handleDeleteClick = React.useCallback(() => {
      if (onDeleteClick) {
        onDeleteClick(route.id);
      }
    }, [onDeleteClick, route.id]);

    return (
      <>
        <div className={styles["route-card__expanded-header"]}>
          <div className={styles["route-card__stats-grid"]}>
            <div className={styles["route-card__stat"]}>
              <span
                className={`${styles["route-card__stat-label"]} typography-label-medium`}
              >
                {t("highestRoutes.distance")}
              </span>
              <strong className="typography-title-medium">
                {formatRouteDistance(route.distance)}
              </strong>
            </div>
            <div className={styles["route-card__stat"]}>
              <span
                className={`${styles["route-card__stat-label"]} typography-label-medium`}
              >
                {t("highestRoutes.elevationGain")}
              </span>
              <strong className="typography-title-medium">
                +{formatElevationGain(route.elevation_gain)}
              </strong>
            </div>
            <div className={styles["route-card__stat"]}>
              <span
                className={`${styles["route-card__stat-label"]} typography-label-medium`}
              >
                {t("highestRoutes.time")}
              </span>
              <strong className="typography-title-medium">
                {formatCompactTime(route.time || "")}
              </strong>
            </div>
            <div className={styles["route-card__stat"]}>
              <span
                className={`${styles["route-card__stat-label"]} typography-label-medium`}
              >
                {t("highestRoutes.movingTime")}
              </span>
              <strong className="typography-title-medium">
                {formatCompactTime(route.moving_time || "")}
              </strong>
            </div>
          </div>
          <div className={styles["route-card__actions"]}>
            <button
              type="button"
              className={styles["route-card__action-button"]}
              onClick={handleMapClick}
            >
              <Map size={16} />
              <span className="typography-button-small">
                {t("userRoutes.seeOnMap")}
              </span>
            </button>
            {onDeleteClick && (
              <button
                type="button"
                className={`${styles["route-card__action-button"]} ${styles["route-card__action-button--delete"]}`}
                onClick={handleDeleteClick}
              >
                <Trash2 size={16} />
                <span className="typography-button-small">
                  {t("userRoutes.deleteRoute")}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className={styles["route-card__peaks-section"]}>
          {route.peaks.length === 0 ? (
            <div
              className={`${styles["no-peaks-card"]} typography-body-medium`}
            >
              {t("userRoutes.noPeaksOnRoute")}
            </div>
          ) : showPeaks ? (
            <div
              className={`${styles["peaks-container"]} ${getPeaksLayoutClass(
                route.peaks.length
              )}`}
            >
              {route.peaks.map((peak) => (
                <PeakCard
                  key={peak.id}
                  peak={peak}
                  onClick={onPeakClick}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className={styles["route-card__peaks-placeholder"]} />
          )}
        </div>
      </>
    );
  }
);

RouteCardDetails.displayName = "RouteCardDetails";

export const RouteCard: React.FC<RouteCardProps> = React.memo(
  ({
    route,
    isExpanded,
    isSelectionMode,
    onToggle,
    onPeakClick,
    onMapClick,
    onDeleteClick,
    t,
  }) => {
    const { language } = useI18n();
    const shouldDeferPeaks = route.peaks.length > 8;
    const [showPeaks, setShowPeaks] = React.useState(
      isExpanded && !shouldDeferPeaks
    );

    React.useEffect(() => {
      if (!isExpanded) {
        setShowPeaks(false);
        return;
      }

      if (!shouldDeferPeaks) {
        setShowPeaks(true);
        return;
      }

      let isCancelled = false;
      const frameId = requestAnimationFrame(() => {
        startTransition(() => {
          if (!isCancelled) {
            setShowPeaks(true);
          }
        });
      });

      return () => {
        isCancelled = true;
        cancelAnimationFrame(frameId);
      };
    }, [isExpanded, shouldDeferPeaks]);

    const handleMainClick = React.useCallback(() => {
      if (isSelectionMode) {
        onMapClick(route.id);
        return;
      }

      onToggle(route.id);
    }, [isSelectionMode, onMapClick, onToggle, route.id]);

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
                className={`${styles["route-card__name"]} typography-title-medium`}
              >
                {route.name}
              </h3>
            </div>
            <div className={styles["route-card__row"]}>
              <div className={styles["route-card__meta"]}>
                <div className={styles["route-card__type"]}>
                  <span className="typography-label-medium">
                    {route.activity_type}
                  </span>
                </div>
                <div
                  className={`${styles["route-card__date"]} typography-label-medium`}
                >
                  {formatRouteDate(route.date, language)}
                </div>
                {!isSelectionMode && route.device_model && (
                  <div
                    className={`${styles["route-card__device-model"]} typography-label-small`}
                  >
                    GARMIN {route.device_model}
                  </div>
                )}
                {!isSelectionMode && (
                  <div
                    className={`${styles["route-card__peaks-count"]} typography-label-medium`}
                  >
                    {route.peaks_count} {t("userRoutes.peaksCount")}
                  </div>
                )}
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
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="route-card-expanded"
                className={styles["route-card__expanded"]}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={EXPAND_TRANSITION}
              >
                <motion.div
                  className={styles["route-card__expanded-content"]}
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -4, opacity: 0 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <RouteCardDetails
                    route={route}
                    onPeakClick={onPeakClick}
                    onMapClick={onMapClick}
                    onDeleteClick={onDeleteClick}
                    showPeaks={showPeaks}
                    t={t}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  }
);

RouteCard.displayName = "RouteCard";
