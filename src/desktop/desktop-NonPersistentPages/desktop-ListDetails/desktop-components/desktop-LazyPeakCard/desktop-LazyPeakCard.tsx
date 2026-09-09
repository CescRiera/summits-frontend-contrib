import React, { useState, useCallback, useEffect } from "react";
import { type PeakListDetailsPeak } from "../../../../../shared/api/types";
import { useIntersectionObserver } from "../../../../desktop-hooks/desktop-useIntersectionObserver.ts";
import { useI18n } from "../../../../../shared/context/I18nContext";
import { getElevationColor, getElevationIcon } from "../../desktop-utils.ts";
import { useUnitFormat } from "../../../../../shared/hooks/useUnitFormat";
import { removeImageSizeRestriction } from "../../../../../shared/utils/imageUtils";
import { getLocationFromHierarchy } from "../../../../../shared/utils/adminHierarchy";
import styles from "./desktop-LazyPeakCard.module.css";

interface LazyPeakCardProps {
  peak: PeakListDetailsPeak;
  index: number;
  isSimpleGrid: boolean;
  onPeakClick: (peakId: number) => void;
}

const LazyPeakCard: React.FC<LazyPeakCardProps> = ({
  peak,
  index,
  isSimpleGrid,
  onPeakClick,
}) => {
  const { formatMeters } = useUnitFormat();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { ref, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "100px",
    freezeOnceVisible: true,
  });

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  const handleCardClick = useCallback(() => {
    onPeakClick(peak.id);
  }, [peak.id, peak.name, onPeakClick]);

  // Preload image when intersection occurs
  useEffect(() => {
    if (hasIntersected && !imageLoaded && !imageError) {
      const img = new Image();
      img.onload = handleImageLoad;
      img.onerror = handleImageError;
      img.src = removeImageSizeRestriction(peak.image) || "";
    }
  }, [
    hasIntersected,
    imageLoaded,
    imageError,
    peak.image,
    handleImageLoad,
    handleImageError,
  ]);

  const itemClass = isSimpleGrid
    ? `${styles["lazyPeakCard__item"]} ${styles["lazyPeakCard__item--singleGrid"]}`
    : `${styles["lazyPeakCard__item"]} ${
        styles[`lazyPeakCard__item--${index + 1}`]
      }`;

  const completionCount = peak.user?.count || 0;
  const isCompleted = peak.user?.completed || false;

  const hasImage = Boolean(peak.image) && !imageError;
  const elevationColor = getElevationColor(peak.elevation);
  const elevationIcon = getElevationIcon(peak.elevation);

  const { t } = useI18n();

  return (
    <div
      ref={ref}
      key={`peak-${peak.id}`}
      className={`${itemClass} ${styles["lazyPeakCard__gridItemOptimized"]} ${
        isCompleted ? styles["lazyPeakCard__item--completed"] : ""
      }`}
      onClick={handleCardClick}
      style={
        hasIntersected && imageLoaded && hasImage
          ? {
              backgroundImage: `url(${removeImageSizeRestriction(peak.image) || ""})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : {
              background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
              position: "relative",
            }
      }
    >
      {/* Faded background elevation icon if no image */}
      {(!hasIntersected || !imageLoaded || !hasImage) && (
        <img
          src={elevationIcon}
          alt="Elevation icon background"
          className={styles["lazyPeakCard__elevationIconBg"]}
        />
      )}

      {hasIntersected && imageLoaded ? (
        <div className={styles["lazyPeakCard__content"]}>
          {/* Top section: Always show main content */}
          <div className={styles["lazyPeakCard__mainContent"]}>
            {/* First row: Title (max 1 line with ellipsis) */}
            <div
              className={`${styles["lazyPeakCard__titleRow"]} typography-desktop-body-small`}
            >
              <h3
                className={`${styles["lazyPeakCard__title"]} typography-desktop-body-small`}
              >
                {peak.name}
              </h3>
            </div>

            {/* Second row: Elevation icon + elevation + Region + Country flowing together */}
            <div className={styles["lazyPeakCard__infoRow"]}>
              <div
                className={`${styles["lazyPeakCard__elevationAndLocation"]} typography-desktop-label-medium`}
              >
                <img
                  src={elevationIcon}
                  alt="Elevation icon"
                  className={styles["lazyPeakCard__elevationIconInline"]}
                />
                <span className={styles["lazyPeakCard__elevation"]}>
                  {formatMeters(peak.elevation)}
                </span>
                <span className={styles["lazyPeakCard__location"]}>
                  {getLocationFromHierarchy(peak.admin_hierarchy)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom section: User data (always at bottom, show if exists) */}
          {isCompleted && peak.user?.routes && peak.user.routes.length > 0 && (
            <div className={styles["lazyPeakCard__userData"]}>
              {/* Ascents count */}
              <div className={styles["lazyPeakCard__ascentsSection"]}>
                <span
                  className={`${styles["lazyPeakCard__ascentsCount"]} typography-desktop-label-medium`}
                >
                  {completionCount} {t("highestPeaks.ascents")}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`${styles["lazyPeakCard__content"]} ${styles["lazyPeakCard__imagePlaceholder"]}`}
        >
          <div className={styles["lazyPeakCard__imageLoader"]}></div>
        </div>
      )}
    </div>
  );
};

export default React.memo(LazyPeakCard);
