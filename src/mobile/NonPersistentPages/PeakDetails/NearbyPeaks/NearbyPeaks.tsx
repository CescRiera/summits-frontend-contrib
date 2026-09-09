import React, { useState, useEffect } from "react";
import styles from "./NearbyPeaks.module.css";
import { getPeakAdditionalInfo } from "../../../../shared/api/endpoints/peaks";
import type { PeakAdditionalInfo } from "../../../../shared/api/types";
import { Navigation } from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../../shared/context/I18nContext";
import ShimmerWrapper from "../../../components/Shimmer/ShimmerWrapper";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";

// Elevation color and icon logic (copied from PeakHeader)
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

type NearbyPeaksProps = {
  peakId: number;
};

type NearbyPeak = PeakAdditionalInfo["nearby_peaks"][number];

const NearbyPeaks: React.FC<NearbyPeaksProps> = ({ peakId }) => {
  const { t } = useI18n();
  const { formatDistance, formatMeters } = useUnitFormat();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "mobile",
    "nearby_peaks",
    peakId
  );
  const [additionalInfo, setAdditionalInfo] =
    useState<PeakAdditionalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!peakId) return;

    getPeakAdditionalInfo(peakId)
      .then((data) => {
        setAdditionalInfo(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [peakId]);

  const nearbyPeaks: NearbyPeak[] = additionalInfo?.nearby_peaks || [];
  const hasData = nearbyPeaks.length > 0;
  usePeakDetailsView("mobile", "nearby_peaks", hasData, peakId);

  const handleCardClick = (targetPeakId: number) => {
    trackSectionEvent("peak_click", "open", targetPeakId);
    navigate(`/peaks/${targetPeakId}`);
  };

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      <section className={styles["nearby-peaks"]}>
        <div className={styles["nearby-peaks__header-wrapper"]}>
          <h3
            className={`${styles["nearby-peaks__title"]} typography-title-medium`}
          >
            <MountainIcon className={styles["nearby-peaks__icon"]} />
            {t("nearbyPeaks.title")}
          </h3>
        </div>
        {nearbyPeaks.length > 0 ? (
          <div className={styles["nearby-peaks__scroll"]}>
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
                  {/* Top gradient overlay for text readability */}
                  <div className={styles["nearby-peaks__card-overlay-top"]} />
                  {/* Faded background elevation icon if no image */}
                  {!hasImage && (
                    <img
                      src={elevationIcon}
                      alt="Elevation icon background"
                      className={styles["nearby-peaks__card-elevation-icon-bg"]}
                    />
                  )}
                  <div className={styles["nearby-peaks__card-content"]}>
                    {/* Title at the top */}
                    <div
                      className={`${styles["nearby-peaks__card-name-row"]} typography-title-medium`}
                    >
                      <div
                        className={`${styles["nearby-peaks__card-name"]} typography-title-medium`}
                      >
                        {peak.name}
                      </div>
                    </div>
                    {/* Elevation row just below the title */}
                    <div className={styles["nearby-peaks__card-elevation-row"]}>
                      <img
                        src={elevationIcon}
                        alt="Elevation icon"
                        className={
                          styles["nearby-peaks__card-elevation-icon-inline"]
                        }
                      />
                      <span
                        className={`${styles["nearby-peaks__card-elevation-value"]} typography-title-small`}
                      >
                        {formatMeters(peak.elevation)}
                      </span>
                    </div>
                    {/* Distance at bottom right, no 'away' text */}
                    <div className={styles["nearby-peaks__card-distance-row"]}>
                      <span
                        className={styles["nearby-peaks__card-distance-icon"]}
                      >
                        <Navigation size={14} />
                      </span>
                      <span
                        className={`${styles["nearby-peaks__card-distance-value"]} typography-body-small`}
                      >
                        {formatDistance(peak.distance_km)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            className={`${styles["nearby-peaks__no-data"]} typography-body-medium`}
          >
            {t("nearbyPeaks.noData")}
          </div>
        )}
      </section>
    </ShimmerWrapper>
  );
};

export default NearbyPeaks;
