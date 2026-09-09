import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PeakHeader.module.css";
import type { PeakDetails, PeakBasicName } from "../../../../shared/api/types";
import { getPeakBasic } from "../../../../shared/api/endpoints/peaks";
import { useMapNavigation } from "../../../context/MapNavigationContext";
import ShimmerWrapper from "../../../components/Shimmer/ShimmerWrapper";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import { useI18n } from "../../../../shared/context/I18nContext";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";
import PeakChangeModal from "../../../components/Map/PeakChangeModal/PeakChangeModal";
import { Pencil } from "lucide-react";

type PeakHeaderProps = {
  peakId: number;
  peakBasicName?: PeakBasicName;
  onLoaded?: () => void;
};

const PeakHeader: React.FC<PeakHeaderProps> = ({ peakId, onLoaded }) => {
  const [peak, setPeak] = useState<PeakDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { navigateToMapWithPeak } = useMapNavigation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { formatMeters } = useUnitFormat();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "mobile",
    "header",
    peakId
  );

  // Load full peak data internally
  useEffect(() => {
    if (!peakId) return;
    setLoading(true);
    const timerLabel = `getPeakBasic:${peakId}`;
    console.time(timerLabel);
    getPeakBasic(peakId)
      .then((data) => {
        console.timeEnd(timerLabel);
        setPeak(data);
        setLoading(false);
        if (onLoaded) onLoaded();
      })
      .catch((err) => {
        try {
          console.timeEnd(timerLabel);
        } catch {}
        console.error("[PeakHeader] Error in getPeakBasic", err);
        // Handle error silently
        setLoading(false);
        if (onLoaded) onLoaded(); // Still call to avoid blocking forever
      });
  }, [peakId, onLoaded]);

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

  const [showEditModal, setShowEditModal] = useState(false);

  const handleSeeOnMap = () => {
    if (peak?.coordinates) {
      trackSectionEvent("navigation", "open_map");
      // Extract coordinates from the object format
      const { lat, lng } = peak.coordinates;

      // Prepare peak data for the map
      const peakData = {
        name: peak.name || peak.name_en || "Unknown Peak",
        name_en: peak.name_en || null,
        elevation: peak.elevation || 0,
      };

      // Navigate to map with reset flag to clear any active filters
      navigateToMapWithPeak(peakId, { lat, lng }, peakData, true);
      // Ensure the map view is active
      navigate("/map");
    }
  };

  // Prioritize reverse geocoding info if available

  const elevationColor = peak?.elevation
    ? getElevationColor(peak.elevation)
    : "#00ae21";
  const elevationIcon = peak?.elevation
    ? getElevationIcon(peak.elevation)
    : "/icons/altitude/ic_mountain_green.png";


  const hasData = Boolean(peak);
  usePeakDetailsView("mobile", "header", hasData, peakId);

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      <div className={styles["peak-header"]}>
        <div className={styles["peak-header__details-section"]}>
          {/* First row: elevation box and map button */}

          {/* Second row: location info below, left-aligned */}
          <div className={styles["peak-header__location-block"]}>
            <div className={styles["peak-header__location-text"]}>
              <span className={`${styles["peak-header__location-region"]} typography-body-medium`}>
                {getLocationFromHierarchy(peak?.admin_hierarchy)}
              </span>
            </div>
          </div>
          <div className={styles["peak-header__top-row"]}>
            {peak?.elevation && (
              <div
                className={styles["peak-header__elevation-box"]}
                style={{ borderColor: elevationColor }}
              >
                <img
                  src={elevationIcon}
                  alt="Elevation"
                  className={styles["peak-header__elevation-icon-small"]}
                />
                <span
                  className={`${styles["peak-header__elevation-value-small"]} typography-title-medium`}
                >
                  {formatMeters(peak.elevation)}
                </span>
              </div>
            )}
            <div className={styles["peak-header__actions"]}>
              {peak && (
                <button
                  className={styles["peak-header__edit-btn"]}
                  onClick={() => setShowEditModal(true)}
                  aria-label="Suggest edit"
                >
                  <Pencil size={16} />
                </button>
              )}
              <button
                className={`${styles["peak-header__map-button"]} typography-button-medium`}
                onClick={handleSeeOnMap}
              >
                {t("common.seeOnMap")}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    marginLeft: 6,
                    display: "inline",
                    verticalAlign: "middle",
                  }}
                >
                  <path
                    d="M6 4l4 4-4 4"
                    stroke="rgb(15, 23, 42)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {peak && (
        <PeakChangeModal
          key={`edit-${peak.id}-${showEditModal}`}
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          mode="edit"
          peakData={{
            id: peak.id,
            name: peak.name,
            name_en: peak.name_en ?? null,
            elevation: peak.elevation,
            wikipedia: peak.wikipedia ?? null,
            min_zoom_web: null,
          }}
        />
      )}
    </ShimmerWrapper>
  );
};

export default PeakHeader;
