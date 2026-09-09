import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./PeakDetails.module.css";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import PeakHeader from "./PeakHeader/PeakHeader";
import Gallery from "./Gallery/Gallery";
import Description from "./Description/Description";
import Weather from "./Weather/Weather";
import WikilocRoute from "./WikilocRoute/WikilocRoute";
import FloraFauna from "./FloraFauna/FloraFauna";
import Infrastructure from "./Infrastructure/Infrastructure";
import NearbyPeaks from "./NearbyPeaks/NearbyPeaks";
import CommunityInfo from "./CommunityInfo/CommunityInfo";
import { getPeakBasicName } from "../../../shared/api/endpoints/peaks";
import { savePeak, unsavePeak } from "../../../shared/api/endpoints/user";
import type { PeakBasicName } from "../../../shared/api/types";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";

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

export default function PeakDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const { user, idToken } = useAuth();
  const { trackEvent } = useAnalytics();
  const [peakBasicName, setPeakBasicName] = useState<PeakBasicName | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedState, setSavedState] = useState<{
    peakId: number | null;
    value: boolean | null;
  }>({ peakId: null, value: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const peakId = id ? parseInt(id) : null;
  const isSaved =
    savedState.peakId === peakId ? savedState.value : null;

  // --- SCROLL POSITION LOGIC ---
  // Save scroll position on unmount or id change, restore to top on new peak
  useEffect(() => {
    const currentContainer = containerRef.current;
    // Reset scroll for the PeakDetails container itself
    if (currentContainer) {
      currentContainer.scrollTop = 0;
    }
    // Also ensure window is at top as a fallback
    window.scrollTo({ top: 0, behavior: "auto" });
    return () => {
      if (peakId) {
        sessionStorage.setItem(
          `peak-scroll-${peakId}`,
          String(currentContainer?.scrollTop || window.scrollY)
        );
      }
    };
  }, [peakId]);

  const handleBack = useCallback(() => {
    trackEvent("button_click", "peak_details_back");
    if (overlayContext) {
      overlayContext.handleOverlayBack();
    } else {
      navigate(-1);
    }
  }, [navigate, overlayContext, trackEvent]);

  const handleSavedClick = useCallback(async () => {
    if (!peakId || !user || !idToken || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        trackEvent("interaction", `peak_unsave_attempt_${peakId}`);
        // Unsave the peak
        const response = await unsavePeak(peakId);
        if (response.success) {
          setSavedState({ peakId, value: false });
          trackEvent("interaction", `peak_unsave_success_${peakId}`);
        }
      } else {
        trackEvent("interaction", `peak_save_attempt_${peakId}`);
        // Save the peak
        const response = await savePeak(peakId);
        if (response.success) {
          setSavedState({ peakId, value: true });
          trackEvent("interaction", `peak_save_success_${peakId}`);
        }
      }
    } catch (error) {
      console.error("Error saving/unsaving peak:", error);
      trackEvent("interaction", `peak_save_toggle_failed_${peakId}`);
      // You might want to show a toast notification here
    } finally {
      setIsSaving(false);
    }
  }, [peakId, user, idToken, isSaving, isSaved, peakBasicName, trackEvent]);

  // Fire API call immediately when component mounts and id is available
  useEffect(() => {
    if (!peakId) return;
    const timerLabel = `getPeakBasicName:${peakId}`;
    console.time(timerLabel);
    // Include auth if user is logged in
    const includeAuth = !!(user && idToken);
    getPeakBasicName(peakId, includeAuth)
      .then((data) => {
        console.timeEnd(timerLabel);
        setPeakBasicName(data);
        // Initialize saved state from API response
        setSavedState({ peakId, value: data.saved ?? false });
        trackEvent("interaction", `peak_details_loaded_${peakId}`);

      })
      .catch((err) => {
        // Ensure timer is ended even on error
        try {
          console.timeEnd(timerLabel);
        } catch {
          // Ignore timer errors
        }
        console.error("[PeakDetails] Error in getPeakBasicName", err);
        trackEvent("interaction", `peak_details_load_failed_${peakId}`);
        // Handle error silently, header will show "Loading..."
      });
  }, [peakId, user, idToken, trackEvent]);

  if (!peakId) {
    return (
      <div className={styles["peakDetails"]} ref={containerRef}>
        <div className={styles["content"]}>
          <p className={`${styles["noData"]} typography-body-medium`}>
            Invalid peak ID
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["peakDetails"]} ref={containerRef}>
      <div className={styles["content"]}>
        {/* Header Section */}
        <OverlayHeader
          title={peakBasicName?.name || peakBasicName?.name_en || "Loading..."}
          subtitle={
            peakBasicName?.name_en &&
            peakBasicName.name !== peakBasicName.name_en
              ? peakBasicName.name_en
              : undefined
          }
          onBack={handleBack}
          rightContent={
            user && idToken && isSaved !== null ? (
              <SavedButton
                isSaved={isSaved}
                isSaving={isSaving}
                onSavedClick={handleSavedClick}
              />
            ) : undefined
          }
        />

        {/* PeakHeader now only handles details section */}
        {peakBasicName && (
          <PeakHeader
            peakId={peakId}
            peakBasicName={peakBasicName}
          />
        )}

        {/* PeakContent - Always render when peakBasicName is available */}
        {peakBasicName && (
          <PeakContent peakId={peakId} peakBasicName={peakBasicName} />
        )}
      </div>
    </div>
  );
}
