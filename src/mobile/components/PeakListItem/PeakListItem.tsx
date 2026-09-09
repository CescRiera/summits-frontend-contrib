import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Expand, ChevronRight } from "lucide-react";
import { getElevationColor } from "../../../shared/constants/elevationColors";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import type { AdminHierarchy } from "../../../shared/api/types/common";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import styles from "./PeakListItem.module.css";

// Helper for elevation colors
const getElevationColorWithVar = (elevation: number) => {
  const color = getElevationColor(elevation);
  return `var(--color-elevation-${color.replace("#", "")}, ${color})`;
};

const getElevationIcon = (elevation: number) => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

interface Route {
  id: number;
  name: string;
  date: string;
}

interface GenericPeak {
  id: number;
  name: string;
  elevation: number;
  admin_hierarchy?: AdminHierarchy;
  image?: string | null;
  user?: {
    completed: boolean;
    count: number;
    routes?: Route[];
  };
}

interface PeakListItemProps {
  peak: GenericPeak;
  onPeakClick: (peakId: number) => void;
  onYourAscensionsClick?: (peak: any) => void;
  userName?: string;
  t: (key: string, params?: any) => string;
}

const PeakListItem: React.FC<PeakListItemProps> = ({
  peak,
  onPeakClick,
  onYourAscensionsClick,
  userName,
  t,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const navigate = useNavigate();
  const { formatMeters } = useUnitFormat();

  useEffect(() => {
    if (summaryRef.current) {
      setIsTruncated(
        summaryRef.current.scrollHeight > summaryRef.current.offsetHeight
      );
    }
  }, [peak, isExpanded]);

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
  const elevationColor = getElevationColorWithVar(peak.elevation);
  const elevationIcon = getElevationIcon(peak.elevation);

  // Format routes and dates for summary text
  const routeNames =
    peak.user?.routes?.map((route) => route.name).filter(Boolean) || [];
  const routeIds = peak.user?.routes?.map((route) => route.id) || [];
  const routeDates =
    peak.user?.routes?.map((route) =>
      new Date(route.date).toLocaleDateString(),
    ) || [];

  const formatRouteNamesWithDates = (
    names: string[],
    routeIds: number[],
    dates: string[],
  ) => {
    if (names.length === 0) return t("userPeaks.summary.oneRoute", { defaultValue: "1 route" });
    if (names.length === 1) {
      return (
        <a
          href={`/routes/${routeIds[0]}`}
          className={styles["peakListItem__summaryRouteLink"]}
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
            className={styles["peakListItem__summaryRouteLink"]}
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
            className={styles["peakListItem__summaryRouteLink"]}
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
              className={styles["peakListItem__summaryRouteLink"]}
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
          className={styles["peakListItem__summaryRouteLink"]}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigate(`/routes/${routeIds[routeIds.length - 1]}`);
          }}
        >
          {names[names.length - 1]} ({dates[dates.length - 1]})
        </a>
      </>
    );
  };

  const getSummaryText = () => {
    if (!peak.user?.completed) return "";
    if (routeNames.length === 0) return "";

    const count = peak.user?.count || 1;

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

    const getBaseText = () => {
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

  return (
    <div
      className={`${styles["peakListItem"]} ${
        isCompleted ? styles["peakListItem--completed"] : ""
      } ${isExpanded ? styles["peakListItem--expanded"] : ""}`}
    >
      <div
        className={styles["peakListItem__content"]}
        onClick={handleListItemClick}
      >
        <motion.div
          className={styles["peakListItem__image"]}
          animate={{
            width: isExpanded ? 0 : 80,
            opacity: isExpanded ? 0 : 1,
            marginRight: isExpanded ? -16 : 0, // Fully compensate the gap
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          {hasImage ? (
            <img
              src={peak.image || ""}
              alt={peak.name}
              className={styles["peakListItem__imageImg"]}
            />
          ) : (
            <div
              className={styles["peakListItem__imagePlaceholder"]}
              style={{
                background: `linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)), ${elevationColor}`,
              }}
            >
              <img
                src={elevationIcon}
                alt="Elevation icon"
                className={styles["peakListItem__elevationIcon"]}
              />
            </div>
          )}
        </motion.div>

        <div className={styles["peakListItem__infoWrapper"]}>
          <div className={styles["peakListItem__info"]}>
            <div
              className={`${styles["peakListItem__title"]} typography-title-medium`}
            >
              {peak.name}
            </div>

            <div className={styles["peakListItem__details"]}>
              <img
                src={elevationIcon}
                alt="Elevation icon"
                className={styles["peakListItem__detailsIcon"]}
              />
              <span
                className={`${styles["peakListItem__elevation"]} typography-label-large`}
              >
                {formatMeters(peak.elevation)}
              </span>
              <span
                className={`${styles["peakListItem__location"]} typography-label-large`}
              >
                {getLocationFromHierarchy(peak.admin_hierarchy)}
              </span>
            </div>
          </div>
        </div>

        <button
          className={`${styles["peakListItem__chevron"]} ${
            isExpanded ? styles["peakListItem__chevron--expanded"] : ""
          }`}
          onClick={handleChevronClick}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChevronRight size={20} />
          </motion.div>
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className={styles["peakListItem__expanded"]}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className={styles["peakListItem__expandedInner"]}>
              <motion.div
                className={styles["peakListItem__expandedImage"]}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
                onClick={handleImageClick}
              >
                {hasImage ? (
                  <img
                    src={peak.image || ""}
                    alt={peak.name}
                    className={styles["peakListItem__expandedImageImg"]}
                  />
                ) : (
                  <div
                    className={styles["peakListItem__expandedImagePlaceholder"]}
                    style={{
                      background: `linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)), ${elevationColor}`,
                    }}
                  >
                    <img
                      src={elevationIcon}
                      alt="Elevation icon"
                      className={styles["peakListItem__expandedElevationIcon"]}
                    />
                  </div>
                )}

                {/* Open peak button (other users' peaks) */}
                {!onYourAscensionsClick && (
                  <button
                    className={styles["peakListItem__openButton"]}
                    onClick={handleCardClick}
                  >
                    <Expand size={14} />
                    {t("userPeaks.openPeak")}
                  </button>
                )}
              </motion.div>

              {/* Action buttons below image (own peaks only) */}
              {onYourAscensionsClick && (
                <div className={styles["peakListItem__actionRow"]}>
                  <button
                    className={`${styles["peakListItem__actionBtn"]} typography-label-medium`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onYourAscensionsClick(peak);
                    }}
                  >
                    {t("userPeaks.yourAscensions")}
                  </button>
                  <button
                    className={`${styles["peakListItem__actionBtn"]} typography-label-medium`}
                    onClick={handleCardClick}
                  >
                    {t("userPeaks.peakDetails")}
                  </button>
                </div>
              )}

              {peak.user?.completed && routeNames.length > 0 && (
                <div className={styles["peakListItem__summary"]}>
                  <motion.div
                    className={
                      styles["peakListItem__summaryTextWrapper"] +
                      " typography-label-large"
                    }
                    initial={false}
                    animate={{ height: summaryExpanded ? "auto" : 60 }} // 60 is roughly 3 lines
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <p
                      ref={summaryRef}
                      className={styles["peakListItem__summaryText"]}
                      style={{
                        display: summaryExpanded ? "block" : "-webkit-box",
                        WebkitLineClamp: summaryExpanded ? "unset" : 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {getSummaryText()}
                    </p>
                  </motion.div>
                  {isTruncated && (
                    <button
                      className={styles["peakListItem__summarySeeMoreBtn"]}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSummaryExpanded(!summaryExpanded);
                      }}
                      type="button"
                    >
                      {summaryExpanded ? t("userPeaks.summary.seeLess") : t("userPeaks.summary.seeMore")}
                      <ChevronRight
                        size={16}
                        className={
                          styles["peakListItem__summarySeeMoreChevron"] +
                          (summaryExpanded ? " " + styles["rotated"] : "")
                        }
                      />
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(PeakListItem);

