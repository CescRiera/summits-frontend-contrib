import React from "react";
import { getElevationColor, getElevationIcon } from "../utils";
import type { UserRoute } from "../../../../shared/api/types";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import styles from "../UserRoutes.module.css";

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
    const location = React.useMemo(
      () => getLocationFromHierarchy(peak.admin_hierarchy),
      [peak.admin_hierarchy]
    );

    const handleClick = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(peak.id);
      },
      [onClick, peak.id]
    );

    return (
      <div
        className={styles["peak-card"]}
        onClick={handleClick}
        style={
          hasImage
            ? undefined
            : {
                background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
              }
        }
      >
        {hasImage && (
          <img
            src={peak.image}
            alt=""
            loading="lazy"
            decoding="async"
            className={styles["peak-card__image"]}
          />
        )}
        {!hasImage && (
          <img
            src={elevationIcon}
            alt=""
            className={styles["peak-card__elevation-icon-bg"]}
          />
        )}
        <div className={styles["peak-card__content"]}>
          <div
            className={`${styles["peak-card__name"]} typography-title-medium`}
          >
            {peak.name}
          </div>
          <div className={styles["peak-card__elevation"]}>
            <img
              src={elevationIcon}
              alt=""
              className={styles["peak-card__elevation-icon"]}
            />
            <span className="typography-title-small">
              {formatMeters(peak.elevation)}
            </span>
          </div>
          <div
            className={`${styles["peak-card__location"]} typography-body-small`}
          >
            {location}
          </div>
        </div>
        {peak.ascent_count > 0 && (
          <div
            className={`${styles["peak-card__ascent-count"]} typography-label-medium`}
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
