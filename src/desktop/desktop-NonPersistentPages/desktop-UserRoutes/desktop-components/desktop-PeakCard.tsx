import React from "react";
import { getElevationColor, getElevationIcon } from "../desktop-utils.ts";
import type { UserRoute } from "../../../../shared/api/types";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import styles from "../desktop-UserRoutes.module.css";

type PeakCardProps = {
  peak: UserRoute["peaks"][number];
  onClick: (peakId: string) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
};

export const PeakCard: React.FC<PeakCardProps> = React.memo(
  ({ peak, onClick, t }) => {
    const { formatMeters } = useUnitFormat();
    const hasImage = Boolean(peak.image);
    const elevationColor = getElevationColor(peak.elevation);
    const elevationIcon = getElevationIcon(peak.elevation);

    const handleClick = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(peak.id);
      },
      [onClick, peak.id, peak.name]
    );

    return (
      <div
        className={styles["peak-card"]}
        onClick={handleClick}
        style={
          hasImage
            ? {
                backgroundImage: `url(${peak.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
              }
        }
      >
        {!hasImage && (
          <img
            src={elevationIcon}
            alt=""
            className={styles["peak-card__elevation-icon-bg"]}
          />
        )}
        <div className={styles["peak-card__content"]}>
          <div
            className={`${styles["peak-card__name"]} typography-desktop-body-small`}
          >
            {peak.name}
          </div>
          <div className={styles["peak-card__elevation"]}>
            <img
              src={elevationIcon}
              alt=""
              className={styles["peak-card__elevation-icon"]}
            />
            <span className="typography-desktop-label-medium">
              {formatMeters(peak.elevation)}
            </span>
          </div>
          <div
            className={`${styles["peak-card__location"]} typography-desktop-label-medium`}
          >
            {getLocationFromHierarchy(peak.admin_hierarchy)}
          </div>
        </div>
        {peak.ascent_count > 0 && (
          <div
            className={`${styles["peak-card__ascent-count"]} typography-desktop-label-medium`}
          >
            {peak.ascent_count}{" "}
            {peak.ascent_count > 1
              ? t("userRoutes.ascents")
              : t("userRoutes.ascent")}
          </div>
        )}
      </div>
    );
  }
);
