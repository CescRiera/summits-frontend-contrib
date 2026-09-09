import React from "react";
import { ChevronLeft } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import styles from "./desktop-OverlayInfoSection.module.css";

export interface StatItem {
  label: string;
  value: string | number;
  variant: "primary" | "completed";
}

export interface OverlayInfoSectionProps {
  description: string;
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
      <p className={styles["overlay-info-section__description"]}>
        {description}
      </p>
      <div className={styles["overlay-info-section__stats"]}>
        {stats &&
          stats.map((stat, index) => (
            <React.Fragment key={index}>
              <div
                className={`${styles["overlay-info-section__stat-card"]} ${
                  styles[`overlay-info-section__stat-card--${stat.variant}`]
                }`}
              >
                <span className={`${styles["overlay-info-section__stat-label"]} typography-desktop-label-medium`}>
                  {stat.label}
                </span>
                <span className={`${styles["overlay-info-section__stat-value"]} typography-desktop-headline-small`}>
                  {stat.value}
                </span>
              </div>
             
            </React.Fragment>
          ))}
        {showMapButton && onMapClick && (
          <button
            className={styles["overlay-info-section__map-button"]}
            onClick={onMapClick}
            aria-label={mapButtonLabel || t("common.seeOnMap")}
            type="button"
          >
            <span className="typography-desktop-button-small">
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
