import React, { useState, useEffect } from "react";
import styles from "./desktop-NearbyPeaks.module.css";
import { getPeakAdditionalInfo } from "../../../../shared/api/endpoints/peaks";
import type { PeakAdditionalInfo } from "../../../../shared/api/types";
import { Navigation, ChevronDown, ChevronUp } from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../../shared/context/I18nContext";
import { removeImageSizeRestriction } from "../../../../shared/utils/imageUtils";
import ShimmerWrapper from "../../../desktop-components/desktop-Shimmer/desktop-ShimmerWrapper.tsx";
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
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop",
    "nearby_peaks",
    peakId
  );
  const [additionalInfo, setAdditionalInfo] =
    useState<PeakAdditionalInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllPeaks, setShowAllPeaks] = useState(false);
  const { formatDistance, formatMeters: formatElevation } = useUnitFormat();
  const navigate = useNavigate();

  const INITIAL_PEAKS_SHOWN = 4;

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
  usePeakDetailsView("desktop", "nearby_peaks", hasData, peakId);

  const displayedPeaks = showAllPeaks
    ? nearbyPeaks
    : nearbyPeaks.slice(0, INITIAL_PEAKS_SHOWN);

  const hasMorePeaks = nearbyPeaks.length > INITIAL_PEAKS_SHOWN;

  const handleCardClick = (targetPeakId: number) => {
    trackSectionEvent("peak_click", "open", targetPeakId);
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
          <div className={styles["nearby-peaks__list-container"]}>
            <div className={styles["nearby-peaks__list"]}>
              {displayedPeaks.map((peak) => {
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
                        ? { backgroundImage: `url(${removeImageSizeRestriction(peak.image) || ""})` }
                        : {
                            background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
                            position: "relative",
                          }
                    }
                  >
                    {/* Gradient overlay darker on bottom */}
                    <div className={styles["nearby-peaks__card-overlay"]} />
                    {/* Faded background elevation icon if no image */}
                    {!hasImage && (
                      <img
                        src={elevationIcon}
                        alt="Elevation icon background"
                        className={
                          styles["nearby-peaks__card-elevation-icon-bg"]
                        }
                      />
                    )}
                    <div className={styles["nearby-peaks__card-content"]}>
                      {/* Single line: Name (50%), Elevation (25%), Distance (25%) */}
                      <div className={styles["nearby-peaks__card-info-row"]}>
                        <div
                          className={`${styles["nearby-peaks__card-name"]} typography-desktop-body-small`}
                        >
                          {peak.name}
                        </div>
                        <div className={styles["nearby-peaks__card-elevation"]}>
                          <img
                            src={elevationIcon}
                            alt="Elevation icon"
                            className={
                              styles["nearby-peaks__card-elevation-icon"]
                            }
                          />
                          <span>{formatElevation(peak.elevation)}</span>
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
            {hasMorePeaks && (
              <button
                className={`${styles["nearby-peaks__expand-button"]} typography-desktop-body-small`}
                onClick={() => {
                  trackSectionEvent(
                    "interaction",
                    showAllPeaks ? "collapse" : "expand"
                  );
                  setShowAllPeaks(!showAllPeaks);
                }}
              >
                {showAllPeaks ? (
                  <>
                    {t("common.showLess")}
                    <ChevronUp size={16} />
                  </>
                ) : (
                  <>
                    {t("communityInfo.seeMore")} (
                    {nearbyPeaks.length - INITIAL_PEAKS_SHOWN}{" "}
                    {t("communityInfo.more")})
                    <ChevronDown size={16} />
                  </>
                )}
              </button>
            )}
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

export default NearbyPeaks;
