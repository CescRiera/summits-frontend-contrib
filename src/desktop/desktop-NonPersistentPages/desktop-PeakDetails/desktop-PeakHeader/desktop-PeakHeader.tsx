import React, { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./desktop-PeakHeader.module.css";
import type { PeakDetails, PeakBasicName } from "../../../../shared/api/types";
import { getPeakBasic } from "../../../../shared/api/endpoints/peaks";
import { ChevronRight, Pencil } from "lucide-react";
import { useMapNavigation } from "../../../desktop-context/desktop-MapNavigationContext.tsx";
import ShimmerWrapper from "../../../desktop-components/desktop-Shimmer/desktop-ShimmerWrapper.tsx";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import { useI18n } from "../../../../shared/context/I18nContext";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";
import PeakChangeModal from "../../../../mobile/components/Map/PeakChangeModal/PeakChangeModal";

type PeakHeaderProps = {
  peakId: number;
  peakBasicName?: PeakBasicName;
  onLoaded?: () => void;
  isSaved?: boolean | null;
  isSaving?: boolean;
  onSavedClick?: () => void;
  showSaveButton?: boolean;
};

const PeakHeader: React.FC<PeakHeaderProps> = ({
  peakId,
  peakBasicName,
  onLoaded,
  isSaved,
  isSaving,
  onSavedClick,
  showSaveButton,
}) => {
  const [peak, setPeak] = useState<PeakDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { navigateToMapWithPeak } = useMapNavigation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { formatMeters } = useUnitFormat();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop",
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
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, [peakId]);

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

  // Prioritize admin_hierarchy, then reverse geocoding, then deprecated fields
  const locationString = getLocationFromHierarchy(peak?.admin_hierarchy);
  const elevationColor = peak?.elevation
    ? getElevationColor(peak.elevation)
    : "#00ae21";
  const elevationIcon = peak?.elevation
    ? getElevationIcon(peak.elevation)
    : "/icons/altitude/ic_mountain_green.png";

  const [showEditModal, setShowEditModal] = useState(false);

  const hasData = Boolean(peak);
  usePeakDetailsView("desktop", "header", hasData, peakId);
  const peakName = peakBasicName?.name || peak?.name || "Loading...";
  const peakNameEn =
    peakBasicName?.name_en && peakBasicName.name_en !== peakBasicName.name
      ? peakBasicName.name_en
      : peak?.name_en && peak.name_en !== peak.name
      ? peak.name_en
      : null;

  return (
    <ShimmerWrapper isLoading={loading} hasData={hasData}>
      <div className={styles["peak-header"]}>
        {/* Top Row: Name and Name_en */}
        <div className={styles["peak-header__name-row"]}>
          <h1 className={`${styles["peak-header__name"]} typography-desktop-title-large`}>
            {peakName}
          </h1>
          {peakNameEn && (
            <h2 className={`${styles["peak-header__name-en"]} typography-desktop-title-medium`}>
              {peakNameEn}
            </h2>
          )}
        </div>

        {/* Second Row: Elevation, Location, Action Buttons */}
        <div className={styles["peak-header__details-row"]}>
          <div className={styles["peak-header__details-left"]}>
            {/* Elevation Box */}
            {peak?.elevation && (
              <div
                className={styles["peak-header__elevation-box"]}
                style={{ borderColor: elevationColor }}
              >
                <img
                  src={elevationIcon}
                  alt="Elevation"
                  className={styles["peak-header__elevation-icon"]}
                />
                <span
                  className={`${styles["peak-header__elevation-value"]} typography-desktop-body-medium`}
                >
                  {formatMeters(peak.elevation)}
                </span>
              </div>
            )}

            {/* Location */}
            {/* Location */}
            {locationString && (
              <div className={styles["peak-header__location-block"]}>
                <div className={styles["peak-header__location-text"]}>
                  <span
                    className={`${styles["peak-header__location-country"]} typography-desktop-body-medium`}
                  >
                    {locationString}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Right Aligned */}
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
              className={`${styles["peak-header__map-button"]} typography-desktop-button-medium`}
              onClick={handleSeeOnMap}
            >
              {t("common.seeOnMap")}
              <ChevronRight size={16} />
            </button>
            {showSaveButton && onSavedClick && (
              <button
                className={styles["peak-header__save-button"]}
                onClick={onSavedClick}
                disabled={isSaving}
                aria-label={isSaved ? "Unsave peak" : "Save peak"}
              >
                <img
                  src={
                    isSaved
                      ? "/icons/common/ic_saved_filled.png"
                      : "/icons/common/ic_saved.png"
                  }
                  alt={isSaved ? "Saved" : "Save"}
                  width={24}
                  height={24}
                />
              </button>
            )}
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

export default memo(PeakHeader);
