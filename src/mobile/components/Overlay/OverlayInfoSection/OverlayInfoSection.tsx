import React from "react";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import styles from "./OverlayInfoSection.module.css";

export interface StatItem {
  label: string;
  value: string | number;
  variant: "primary" | "completed";
}

export interface OverlayInfoSectionProps {
  description?: string;
  stats?: StatItem[] | undefined;
  showMapButton?: boolean;
  onMapClick?: () => void;
  mapButtonLabel?: string;
}

const OverlayInfoSection: React.FC<OverlayInfoSectionProps> = ({
  description,
  stats,
  showMapButton = false,
  onMapClick,
  mapButtonLabel,
}) => {
  const { t } = useI18n();

  return (
    <div className={styles["overlay-info-section"]}>
      {description && (
        <p className={`${styles["overlay-info-section__description"]} typography-body-small`}>
          {description}
        </p>
      )}
      <div 
        className={`${styles["overlay-info-section__stats"]} ${
          stats && stats.length === 1 ? styles["overlay-info-section__stats--hero"] : ""
        }`}
      >
        {stats &&
          stats.map((stat, index) => (
            <React.Fragment key={index}>
              <div
                className={`${styles["overlay-info-section__stat-card"]} ${
                  styles[`overlay-info-section__stat-card--${stat.variant}`]
                } ${
                  stats.length === 1 ? styles["overlay-info-section__stat-card--hero"] : ""
                }`}
              >
                <span className={`${styles["overlay-info-section__stat-label"]} typography-label-medium`}>
                  {stat.label}
                </span>
                <span className={`${styles["overlay-info-section__stat-value"]} ${
                  stats.length === 1 
                    ? `${styles["overlay-info-section__stat-value--hero"]} typography-display-large` 
                    : "typography-display-medium"
                }`}>
                  {stat.value}
                </span>
              </div>
              {index < stats.length - 1 && (
                <div className={styles["overlay-info-section__stat-divider"]} />
              )}
            </React.Fragment>
          ))}

        {showMapButton && onMapClick && (
          <button
            className={`${styles["overlay-info-section__map-button"]} typography-button-medium`}
            onClick={onMapClick}
            aria-label={mapButtonLabel || t("common.seeOnMap")}
            type="button"
          >
            <span className="typography-button-small">
              {mapButtonLabel || t("common.seeOnMap")}
            </span>
            <ChevronLeft size={16} style={{ transform: "rotate(180deg)" }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default OverlayInfoSection;
