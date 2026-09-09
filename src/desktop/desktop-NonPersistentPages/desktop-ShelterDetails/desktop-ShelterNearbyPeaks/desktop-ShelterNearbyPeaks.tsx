import React, { useState, useEffect } from "react";
import styles from "./desktop-ShelterNearbyPeaks.module.css";
import { getShelterNearbyPeaks } from "../../../../shared/api/endpoints/shelters";
import type { ShelterNearbyPeak } from "../../../../shared/api/types";
import { Navigation } from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useNavigate } from "react-router-dom";
import ShimmerWrapper from "../../../desktop-components/desktop-Shimmer/desktop-ShimmerWrapper";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import { useI18n } from "../../../../shared/context/I18nContext";

const getElevationColor = (elevation: number) => {
  if (elevation >= 8000) return "#000000";
  if (elevation >= 6000) return "#480001";
  if (elevation >= 4000) return "#ff0000";
  if (elevation >= 3000) return "#ff7300";
  if (elevation >= 2000) return "#ffbb00";
  return "#00ae21";
};

const getElevationIcon = (elevation: number) => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

type ShelterNearbyPeaksProps = {
  shelterId: number;
};

const ShelterNearbyPeaks: React.FC<ShelterNearbyPeaksProps> = ({
  shelterId,
}) => {
  const { formatDistance, formatMeters } = useUnitFormat();
  const { t } = useI18n();
  const [nearbyPeaks, setNearbyPeaks] = useState<ShelterNearbyPeak[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!shelterId) return;
    getShelterNearbyPeaks(shelterId, 10000, 10)
      .then((data) => {
        setNearbyPeaks(data.nearby_peaks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [shelterId]);

  const hasData = nearbyPeaks.length > 0;

  const handleCardClick = (targetPeakId: number) => {
    navigate(`/peaks/${targetPeakId}`);
  };

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      <section className={styles["nearby-peaks"]}>
        <div className={styles["nearby-peaks__header"]}>
          <h3
            className={`${styles["nearby-peaks__title"]} typography-desktop-title-small`}
          >
            <MountainIcon className={styles["nearby-peaks__icon"]} />
            {t("nearbyPeaks.title")}
          </h3>
        </div>
        {nearbyPeaks.length > 0 ? (
          <div className={styles["nearby-peaks__list"]}>
            {nearbyPeaks.map((peak) => {
              const hasImage = Boolean(peak.image);
              const elevationColor = getElevationColor(peak.elevation);
              const elevationIcon = getElevationIcon(peak.elevation);
              return (
                <div
                  key={peak.id}
                  className={styles["nearby-peaks__card"]}
                  onClick={() => handleCardClick(peak.id)}
                  style={
                    hasImage
                      ? { backgroundImage: `url(${peak.image})` }
                      : {
                          background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
                          position: "relative",
                        }
                  }
                >
                  <div className={styles["nearby-peaks__card-overlay"]} />
                  {!hasImage && (
                    <img
                      src={elevationIcon}
                      alt={t("search.elevationIcon")}
                      className={
                        styles["nearby-peaks__card-elevation-icon-bg"]
                      }
                    />
                  )}
                  <div className={styles["nearby-peaks__card-content"]}>
                    <div className={styles["nearby-peaks__card-info-row"]}>
                      <div className={`${styles["nearby-peaks__card-name"]} typography-desktop-body-small`}>
                        {peak.name}
                      </div>
                      <div className={styles["nearby-peaks__card-elevation"]}>
                        <img
                          src={elevationIcon}
                          alt={t("search.elevationIcon")}
                          className={
                            styles["nearby-peaks__card-elevation-icon"]
                          }
                        />
                        <span>{formatMeters(peak.elevation)}</span>
                      </div>
                      <div className={styles["nearby-peaks__card-distance"]}>
                        <Navigation size={14} />
                        <span>{formatDistance(peak.distance_km)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`${styles["nearby-peaks__no-data"]} typography-desktop-body-small`}
          >
            {t("nearbyPeaks.noData")}
          </div>
        )}
      </section>
    </ShimmerWrapper>
  );
};

export default ShelterNearbyPeaks;
