import React, { useState, useEffect, memo, useCallback } from "react";
import styles from "./PeakDetailsMap.module.css";
import {
  getPeakBasicName,
  getPeakBasic,
} from "../../../../shared/api/endpoints/peaks";
import { savePeak, unsavePeak } from "../../../../shared/api/endpoints/user";
import type { PeakBasicName, PeakDetails } from "../../../../shared/api/types";
import { useAuth } from "../../../../shared/context/AuthContext";
import { useOnlineStatus } from "../../../../shared/hooks/useOnlineStatus";
import { useI18n } from "../../../../shared/context/I18nContext";
import {
  cachePeakBasicName,
  getCachedPeakBasicName,
  cachePeakDetails,
  getCachedPeakDetails,
} from "../../../../shared/utils/offlineCache";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";
import Gallery from "../../../NonPersistentPages/PeakDetails/Gallery/Gallery";
import Description from "../../../NonPersistentPages/PeakDetails/Description/Description";
import Weather from "../../../NonPersistentPages/PeakDetails/Weather/Weather";
import WikilocRoute from "../../../NonPersistentPages/PeakDetails/WikilocRoute/WikilocRoute";
import FloraFauna from "../../../NonPersistentPages/PeakDetails/FloraFauna/FloraFauna";
import Infrastructure from "../../../NonPersistentPages/PeakDetails/Infrastructure/Infrastructure";
import NearbyPeaks from "../../../NonPersistentPages/PeakDetails/NearbyPeaks/NearbyPeaks";
import CommunityInfo from "../../../NonPersistentPages/PeakDetails/CommunityInfo/CommunityInfo";
import PeakChangeModal from "../PeakChangeModal/PeakChangeModal";
import { Pencil } from "lucide-react";
import { getRegionFromHierarchy, getCountryFromHierarchy } from "../../../../shared/utils/adminHierarchy";

interface PeakDetailsMapProps {
  peakId: number;
  onClose?: () => void;
  onRequestPickLocation?: () => void;
  pendingEditCoords?: { lat: number; lng: number } | null;
  onClearPendingEditCoords?: () => void;
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
        <Gallery peakId={peakId} />
        {peakBasicName?.wikidata_id === true && (
          <Description peakId={peakId} />
        )}

        <WikilocRoute
          peakId={peakId}
          peakName={
            peakBasicName?.name_en || peakBasicName?.name || "Unknown Peak"
          }
          {...(peakBasicName?.coordinates
            ? { coordinates: peakBasicName.coordinates }
            : {})}
        />
        <CommunityInfo peakId={peakId} />
        <Infrastructure peakId={peakId} />
        <Weather peakId={peakId} />

        <NearbyPeaks peakId={peakId} />
        <FloraFauna peakId={peakId} />
      </>
    );
  }
);

const PeakDetailsMap: React.FC<PeakDetailsMapProps> = ({ peakId, onRequestPickLocation, pendingEditCoords, onClearPendingEditCoords }) => {
  const { user, idToken } = useAuth();
  const isOnline = useOnlineStatus();
  const { t } = useI18n();
  const [peakBasicName, setPeakBasicName] = useState<PeakBasicName | null>(
    null
  );
  const [peakDetails, setPeakDetails] = useState<PeakDetails | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedState, setSavedState] = useState<{
    peakId: number | null;
    value: boolean | null;
  }>({ peakId: null, value: null });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editInitialCoords, setEditInitialCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (pendingEditCoords) {
      setEditInitialCoords(pendingEditCoords);
      setShowEditModal(true);
      onClearPendingEditCoords?.();
    }
  }, [pendingEditCoords, onClearPendingEditCoords]);

  const handleEditRequestPickLocation = useCallback(() => {
    setShowEditModal(false);
    setEditInitialCoords(null);
    onRequestPickLocation?.();
  }, [onRequestPickLocation]);

  const isSaved =
    savedState.peakId === peakId ? savedState.value : null;


  const handleSavedClick = useCallback(async () => {
    if (!peakId || !user || !idToken || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        // Unsave the peak
        const response = await unsavePeak(peakId);
        if (response.success) {
          setSavedState({ peakId, value: false });
        }
      } else {
        // Save the peak
        const response = await savePeak(peakId);
        if (response.success) {
          setSavedState({ peakId, value: true });
        }
      }
    } catch (error) {
      console.error("Error saving/unsaving peak:", error);
    } finally {
      setIsSaving(false);
    }
  }, [peakId, user, idToken, isSaving, isSaved]);

  // Fire API calls immediately when component mounts and id is available
  useEffect(() => {
    if (!peakId) return;

    let cancelled = false;
    setLoadError(null);
    setIsFromCache(false);

    const fetches: Promise<void>[] = [];
    const includeAuth = !!(user && idToken);

    const fetchBasicName = async () => {
      if (!isOnline) {
        const cached = await getCachedPeakBasicName<PeakBasicName>(peakId);
        if (cancelled) return;
        if (cached) {
          setPeakBasicName(cached);
          setIsFromCache(true);
          return;
        }
        setLoadError(t("peakDetails.loadError"));
        return;
      }

      try {
        const data = await getPeakBasicName(peakId, includeAuth);
        if (cancelled) return;
        setPeakBasicName(data);
        setSavedState({ peakId, value: data.saved ?? false });
        cachePeakBasicName(peakId, data);
      } catch (err) {
        if (cancelled) return;
        const cached = await getCachedPeakBasicName<PeakBasicName>(peakId);
        if (cancelled) return;
        if (cached) {
          setPeakBasicName(cached);
          setIsFromCache(true);
          return;
        }
        console.error("[PeakDetailsMap] Error in getPeakBasicName", err);
        setLoadError(t("peakDetails.loadError"));
      }
    };

    const fetchBasic = async () => {
      if (!isOnline) {
        const cached = await getCachedPeakDetails<PeakDetails>(peakId);
        if (cancelled) return;
        if (cached) {
          setPeakDetails(cached);
          setIsFromCache(true);
          return;
        }
        return;
      }

      try {
        const data = await getPeakBasic(peakId);
        if (cancelled) return;
        setPeakDetails(data);
        cachePeakDetails(peakId, data);
      } catch (err) {
        if (cancelled) return;
        const cached = await getCachedPeakDetails<PeakDetails>(peakId);
        if (cancelled) return;
        if (cached) {
          setPeakDetails(cached);
          setIsFromCache(true);
          return;
        }
        console.error("[PeakDetailsMap] Error in getPeakBasic", err);
      }
    };

    fetches.push(fetchBasicName());
    fetches.push(fetchBasic());

    return () => {
      cancelled = true;
    };
  }, [peakId, user, idToken, isOnline]);

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
          <p className={`${styles["noData"]} typography-body-medium`}>
            Invalid peak ID
          </p>
        </div>
      </div>
    );
  }

  if (loadError && !peakBasicName) {
    return (
      <div className={styles["peakDetailsMap"]}>
        <div className={styles["content"]}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "30dvh",
              padding: "32px 16px",
              textAlign: "center",
            }}
          >
            <p className="typography-body-medium">{loadError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["peakDetailsMap"]}>
      <div className={styles["content"]}>
          {/* Location and Actions Section */}
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

              {/* Action Buttons */}
              <div className={styles["actionBtns"]}>
                {/* Edit Button */}
                {peakDetails && (
                  <button
                    className={styles["editBtn"]}
                    onClick={() => setShowEditModal(true)}
                    aria-label="Edit peak"
                  >
                    <Pencil size={18} />
                  </button>
                )}

                {/* Saved Button */}
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

          {/* Edit Peak Modal */}
          {peakDetails && (
            <PeakChangeModal
              key={`edit-${peakDetails.id}-${showEditModal}`}
              open={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                setEditInitialCoords(null);
              }}
              mode="edit"
              initialCoords={editInitialCoords}
              onRequestPickLocation={handleEditRequestPickLocation}
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

        {/* Offline badge */}
        {isFromCache && (
          <div
            style={{
              padding: "6px 16px",
              backgroundColor: "var(--c-warning-light, #fef3cd)",
              borderBottom: "1px solid var(--c-warning, #ffc107)",
            }}
          >
            <span
              className="typography-label-small"
              style={{ color: "var(--c-warning-dark, #856404)" }}
            >
              Offline — showing cached data
            </span>
          </div>
        )}

        {/* Peak Content */}
        {peakBasicName ? (
          <PeakContent peakId={peakId} peakBasicName={peakBasicName} />
        ) : (
          <LoadingScreen />
        )}
      </div>
    </div>
  );
};

export default PeakDetailsMap;
