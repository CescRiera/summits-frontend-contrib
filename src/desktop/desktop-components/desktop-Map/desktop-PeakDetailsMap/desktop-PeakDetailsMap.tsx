import React, { useState, useEffect, memo, useCallback } from "react";
import styles from "./desktop-PeakDetailsMap.module.css";
import {
  getPeakBasicName,
  getPeakBasic,
} from "../../../../shared/api/endpoints/peaks";
import { savePeak, unsavePeak } from "../../../../shared/api/endpoints/user";
import type { PeakBasicName, PeakDetails } from "../../../../shared/api/types";
import { useAuth } from "../../../../shared/context/AuthContext";
import { useI18n } from "../../../../shared/context/I18nContext";
import LoadingScreen from "../../desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import GalleryMap from "./desktop-GalleryMap/desktop-GalleryMap.tsx";
import DescriptionMap from "./desktop-DescriptionMap/desktop-DescriptionMap.tsx";
import WeatherMap from "./desktop-WeatherMap/desktop-WeatherMap.tsx";
import WikilocRouteMap from "./desktop-WikilocRouteMap/desktop-WikilocRouteMap.tsx";
import FloraFaunaMap from "./desktop-FloraFaunaMap/desktop-FloraFaunaMap.tsx";
import InfrastructureMap from "./desktop-InfrastructureMap/desktop-InfrastructureMap.tsx";
import NearbyPeaksMap from "./desktop-NearbyPeaksMap/desktop-NearbyPeaksMap.tsx";
import CommunityInfoMap from "./desktop-CommunityInfoMap/desktop-CommunityInfoMap.tsx";
import { useNavigate } from "react-router-dom";
import { Expand, Pencil } from "lucide-react";
import PeakChangeModal from "../../../../mobile/components/Map/PeakChangeModal/PeakChangeModal";
import { getRegionFromHierarchy, getCountryFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";

interface PeakDetailsMapProps {
  peakId: number;
  onClose?: () => void;
}

// Memoized SavedButton component to prevent unnecessary re-renders
const SavedButton = memo(
  ({
    isSaved,
    isSaving,
    onSavedClick,
  }: {
    isSaved: boolean;
    isSaving: boolean;
    onSavedClick: () => void;
  }) => (
    <button
      className={styles["savedBtn"]}
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
  )
);

// Memoized PeakContent component to prevent re-renders when heart state changes
const PeakContent = memo(
  ({
    peakId,
    peakBasicName,
  }: {
    peakId: number | null;
    peakBasicName: PeakBasicName | null;
  }) => {
    if (!peakId) return null;

    return (
      <>
        <GalleryMap peakId={peakId} />
        {peakBasicName?.wikidata_id === true && (
          <DescriptionMap peakId={peakId} />
        )}

        <WikilocRouteMap
          peakId={peakId}
          peakName={
            peakBasicName?.name_en || peakBasicName?.name || "Unknown Peak"
          }
          {...(peakBasicName?.coordinates
            ? { coordinates: peakBasicName.coordinates }
            : {})}
        />
        <CommunityInfoMap peakId={peakId} />
        <InfrastructureMap peakId={peakId} />
        <WeatherMap peakId={peakId} />

        <NearbyPeaksMap peakId={peakId} />
        <FloraFaunaMap peakId={peakId} />
      </>
    );
  }
);

const PeakDetailsMap: React.FC<PeakDetailsMapProps> = ({ peakId }) => {
  const { user, idToken } = useAuth();
  const { t } = useI18n();
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "desktop_map",
    "page",
    peakId
  );
  const [peakBasicName, setPeakBasicName] = useState<PeakBasicName | null>(
    null
  );
  const [peakDetails, setPeakDetails] = useState<PeakDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedState, setSavedState] = useState<{
    peakId: number | null;
    value: boolean | null;
  }>({ peakId: null, value: null });
  const isSaved =
    savedState.peakId === peakId ? savedState.value : null;
  const navigate = useNavigate();
  usePeakDetailsView("desktop_map", "page", Boolean(peakBasicName), peakId);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleSavedClick = useCallback(async () => {
    if (!peakId || !user || !idToken || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        trackSectionEvent("interaction", "unsave_attempt");
        // Unsave the peak
        const response = await unsavePeak(peakId);
        if (response.success) {
          setSavedState({ peakId, value: false });
          trackSectionEvent("interaction", "unsave_success");
        }
      } else {
        trackSectionEvent("interaction", "save_attempt");
        // Save the peak
        const response = await savePeak(peakId);
        if (response.success) {
          setSavedState({ peakId, value: true });
          trackSectionEvent("interaction", "save_success");
        }
      }
    } catch (error) {
      console.error("Error saving/unsaving peak:", error);
      trackSectionEvent("interaction", "save_toggle_failed");
    } finally {
      setIsSaving(false);
    }
  }, [idToken, isSaved, isSaving, peakId, trackSectionEvent, user]);

  // Fire API calls immediately when component mounts and id is available
  useEffect(() => {
    if (!peakId) return;

    let cancelled = false;

    const includeAuth = !!(user && idToken);

    getPeakBasicName(peakId, includeAuth)
      .then((data) => {
        if (cancelled) return;
        setPeakBasicName(data);
        setSavedState({ peakId, value: data.saved ?? false });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PeakDetailsMap] Error in getPeakBasicName", err);
        trackSectionEvent("interaction", "load_failed");
      });

    getPeakBasic(peakId)
      .then((data) => {
        if (cancelled) return;
        setPeakDetails(data);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[PeakDetailsMap] Error in getPeakBasic", err);
      });

    return () => {
      cancelled = true;
    };
  }, [peakId, user, idToken]);

  // Location display helpers
  const displayRegion =
    peakDetails?.reverse_geocoding?.region || getRegionFromHierarchy(peakDetails?.admin_hierarchy);
  const displayCountry =
    peakDetails?.reverse_geocoding?.country || getCountryFromHierarchy(peakDetails?.admin_hierarchy);
  const displayCity = peakDetails?.reverse_geocoding?.city;

  if (!peakId) {
    return (
      <div className={styles["peakDetailsMap"]}>
        <div className={styles["content"]}>
          <p className={`${styles["noData"]} typography-desktop-body-small`}>
            Invalid peak ID
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["peakDetailsMap"]}>
      <div className={styles["content"]}>
        {/* Location and Saved Button Section */}
        {peakBasicName && (
          <div className={styles["peakDetailsHeader"]}>
            {/* Location Block */}
            <div className={styles["locationBlock"]}>
              <div className={styles["locationText"]}>
                {displayCity && (
                  <span className={styles["locationCity"]}>
                    {displayCity}
                    {displayRegion || displayCountry ? "," : ""}
                  </span>
                )}
                {displayRegion && (
                  <span className={styles["locationRegion"]}>
                    {displayRegion}
                    {displayCountry ? "," : ""}
                  </span>
                )}
                {displayCountry && (
                  <span className={styles["locationCountry"]}>
                    {displayCountry}
                  </span>
                )}
              </div>
            </div>

            {/* Expand Button, Edit Button and Saved Button */}
            <div className={styles["peak-details-map__button-row"]}>
              {peakDetails && (
                <button
                  type="button"
                  className={styles["peak-details-map__edit-btn"]}
                  onClick={() => setShowEditModal(true)}
                  aria-label="Suggest edit"
                >
                  <Pencil size={16} />
                </button>
              )}
              <button
                type="button"
                className={`${styles["peak-details-map__expand-button"]} typography-desktop-body-small`}
                onClick={() => {
                  trackSectionEvent("navigation", "expand");
                  navigate("/peaks/" + peakId);
                }}
              >
                <Expand size={20} />
                {t("peakDetails.expand")}
              </button>
              {user && idToken && isSaved !== null && (
                <SavedButton
                  isSaved={isSaved}
                  isSaving={isSaving}
                  onSavedClick={handleSavedClick}
                />
              )}
            </div>
          </div>
        )}

        {/* Peak Content */}
        {peakBasicName ? (
          <PeakContent peakId={peakId} peakBasicName={peakBasicName} />
        ) : (
          <LoadingScreen />
        )}
      </div>

      {peakDetails && (
        <PeakChangeModal
          key={`edit-${peakDetails.id}-${showEditModal}`}
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          mode="edit"
          peakData={{
            id: peakDetails.id,
            name: peakDetails.name,
            name_en: peakDetails.name_en ?? null,
            elevation: peakDetails.elevation,
            wikipedia: peakDetails.wikipedia ?? null,
            min_zoom_web: null,
          }}
        />
      )}
    </div>
  );
};

export default PeakDetailsMap;
