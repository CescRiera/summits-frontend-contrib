import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { PeakListDetailsPeak } from "../../../../../shared/api/types";
import { useMapNavigation } from "../../../../desktop-context/desktop-MapNavigationContext.tsx";
import { useIntersectionObserver } from "../../../../desktop-hooks/desktop-useIntersectionObserver.ts";
import { getElevationColor } from "../../../../../shared/constants/elevationColors";
import { removeImageSizeRestriction } from "../../../../../shared/utils/imageUtils";
import { getFullLocationFromHierarchy } from "../../../../../shared/utils/adminHierarchy";
import { useUnitFormat } from "../../../../../shared/hooks/useUnitFormat";
import styles from "./desktop-PeakList.module.css";

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

interface PeakListItemProps {
  peak: PeakListDetailsPeak;
  onPeakClick: (peakId: number) => void;
  showDate?: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
}

const PeakListItem: React.FC<PeakListItemProps> = React.memo(
  ({ peak, onPeakClick, showDate, t }) => {
    const { formatMeters } = useUnitFormat();
    const navigate = useNavigate();
    const { navigateToMapWithPeak } = useMapNavigation();
    
    const { ref } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: "100px",
      freezeOnceVisible: true,
    });

    const handleCardClick = useCallback(() => {
      onPeakClick(peak.id);
    }, [peak.id, onPeakClick]);

    const isCompleted = peak.user?.completed || false;
    const hasImage = Boolean(peak.image);
    const elevationColor = getElevationColorWithVar(peak.elevation);
    const elevationIcon = getElevationIcon(peak.elevation);

    return (
      <motion.div
        ref={ref}
        className={`${styles["peakRow"]} ${showDate ? styles["peakRow--withDate"] : ""} ${isCompleted ? styles["peakRow--completed"] : ""}`}
        onClick={handleCardClick}
        whileHover={{ backgroundColor: isCompleted ? "rgba(34, 197, 94, 0.15)" : "rgba(241, 245, 249, 0.5)" }}
        transition={{ duration: 0.2 }}
      >
        {/* Col 1: Image + Name */}
        <div className={styles["peakRow__nameCol"]}>
          {hasImage ? (
            <img
              src={removeImageSizeRestriction(peak.image) || ""}
              alt={peak.name}
              className={styles["peakRow__image"]}
            />
          ) : (
            <div
              className={styles["peakRow__imagePlaceholder"]}
              style={{
                background: `linear-gradient(rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.4)), ${elevationColor}`,
              }}
            >
              <img
                src={elevationIcon}
                alt="Elevation icon"
                className={styles["peakRow__placeholderIcon"]}
              />
            </div>
          )}
          <div className={styles["peakRow__nameContainer"]}>
            <span className={`${styles["peakRow__name"]} typography-desktop-title-small`}>
              {peak.name}
            </span>
          </div>
        </div>

        {/* Col 2: Elevation */}
        <div className={styles["peakRow__elevationCol"]}>
          <img src={elevationIcon} alt="" className={styles["peakRow__elevationIcon"]} />
          <span className="typography-desktop-body-medium">{formatMeters(peak.elevation)}</span>
        </div>

        {/* Col 3: Location */}
        <div className={`${styles["peakRow__locationCol"]} typography-desktop-body-medium`}>
          {getFullLocationFromHierarchy(peak.admin_hierarchy)}
        </div>

        {/* Col 4 (Optional): Date */}
        {showDate && (
          <div className={`${styles["peakRow__dateCol"]} typography-desktop-body-medium`}>
            {peak.user?.routes?.[0]?.date 
              ? new Date(peak.user.routes[0].date).toLocaleDateString()
              : "-"}
          </div>
        )}

        {/* Col 5/4: Actions */}
        <div className={styles["peakRow__actionsCol"]}>
          <button 
            className={`${styles["peakRow__actionBtn"]} typography-desktop-button-medium`}
            onClick={(e) => {
              e.stopPropagation();
              const peakData = {
                name: peak.name || "Unknown Peak",
                name_en: peak.name_en || null,
                elevation: peak.elevation || 0,
              };
              const coords = peak.lat && peak.lng ? { lat: peak.lat, lng: peak.lng } : undefined;
              if (coords) {
                navigateToMapWithPeak(peak.id, coords, peakData, true);
                navigate("/map");
              }
            }}
          >
            {t("common.map") || "Map"}
          </button>
        </div>
      </motion.div>
    );
  }
);

PeakListItem.displayName = "PeakListItem";

export default PeakListItem;

