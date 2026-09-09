import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./ShelterDetails.module.css";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import ShelterHeader from "./ShelterHeader/ShelterHeader";
import ShelterGallery from "./ShelterGallery/ShelterGallery";
import ShelterDescription from "./ShelterDescription/ShelterDescription";
import ShelterWeather from "./ShelterWeather/ShelterWeather";
import ShelterWikilocRoute from "./ShelterWikilocRoute/ShelterWikilocRoute";
import ShelterNearbyPeaks from "./ShelterNearbyPeaks/ShelterNearbyPeaks";
import ShelterNearbyShelters from "./ShelterNearbyShelters/ShelterNearbyShelters";
import { getShelterBasic } from "../../../shared/api/endpoints/shelters";
import { saveShelter, unsaveShelter } from "../../../shared/api/endpoints/user";
import type { ShelterBasic } from "../../../shared/api/types";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";

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
      aria-label={isSaved ? "Unsave shelter" : "Save shelter"}
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

export default function ShelterDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const { user, idToken } = useAuth();
  const { trackEvent } = useAnalytics();
  const { t } = useI18n();
  const [shelterBasic, setShelterBasic] = useState<ShelterBasic | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedState, setSavedState] = useState<{
    shelterId: number | null;
    value: boolean | null;
  }>({ shelterId: null, value: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const shelterId = id ? parseInt(id) : null;
  const isSaved = savedState.shelterId === shelterId ? savedState.value : null;

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (currentContainer) {
      currentContainer.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    return () => {
      if (shelterId) {
        sessionStorage.setItem(
          `shelter-scroll-${shelterId}`,
          String(currentContainer?.scrollTop || window.scrollY)
        );
      }
    };
  }, [shelterId]);

  const handleBack = useCallback(() => {
    trackEvent("button_click", "shelter_details_back");
    if (overlayContext) {
      overlayContext.handleOverlayBack();
    } else {
      navigate(-1);
    }
  }, [navigate, overlayContext, trackEvent]);

  const handleSavedClick = useCallback(async () => {
    if (!shelterId || !user || !idToken || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        trackEvent("interaction", `shelter_unsave_attempt_${shelterId}`);
        const response = await unsaveShelter(shelterId);
        if (response.success) {
          setSavedState({ shelterId, value: false });
          trackEvent("interaction", `shelter_unsave_success_${shelterId}`);
        }
      } else {
        trackEvent("interaction", `shelter_save_attempt_${shelterId}`);
        const response = await saveShelter(shelterId);
        if (response.success) {
          setSavedState({ shelterId, value: true });
          trackEvent("interaction", `shelter_save_success_${shelterId}`);
        }
      }
    } catch (error) {
      console.error("Error saving/unsaving shelter:", error);
      trackEvent("interaction", `shelter_save_toggle_failed_${shelterId}`);
    } finally {
      setIsSaving(false);
    }
  }, [shelterId, user, idToken, isSaving, isSaved, trackEvent]);

  useEffect(() => {
    if (!shelterId) return;
    const timerLabel = `getShelterBasic:${shelterId}`;
    console.time(timerLabel);
    getShelterBasic(shelterId)
      .then((data) => {
        console.timeEnd(timerLabel);
        setShelterBasic(data);
        setSavedState({ shelterId, value: data.saved ?? false });
        trackEvent("interaction", `shelter_details_loaded_${shelterId}`);
      })
      .catch((err) => {
        try {
          console.timeEnd(timerLabel);
        } catch {}
        console.error("[ShelterDetails] Error in getShelterBasic", err);
        trackEvent("interaction", `shelter_details_load_failed_${shelterId}`);
      });
  }, [shelterId, trackEvent]);

  if (!shelterId) {
    return (
      <div className={styles["shelterDetails"]} ref={containerRef}>
        <div className={styles["content"]}>
          <p className={`${styles["noData"]} typography-body-medium`}>
            {t("shelterDetails.invalidShelterId")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["shelterDetails"]} ref={containerRef}>
      <div className={styles["content"]}>
        <OverlayHeader
          title={
            shelterBasic?.name ||
            shelterBasic?.name_en ||
            t("common.loading")
          }
          subtitle={
            shelterBasic?.name_en &&
            shelterBasic.name !== shelterBasic.name_en
              ? shelterBasic.name_en
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

        {shelterBasic && (
          <ShelterHeader shelterId={shelterId} shelterBasic={shelterBasic} />
        )}

        {shelterBasic && (
          <>
            <ShelterGallery shelterId={shelterId} />
            <ShelterDescription shelterId={shelterId} />
            <ShelterWikilocRoute
              shelterId={shelterId}
              shelterName={
                shelterBasic.name_en ||
                shelterBasic.name ||
                t("shelterDetails.unknownShelter")
              }
              coordinates={shelterBasic.coordinates}
            />
            <ShelterWeather shelterId={shelterId} />
            <ShelterNearbyPeaks shelterId={shelterId} />
            <ShelterNearbyShelters shelterId={shelterId} />
          </>
        )}
      </div>
    </div>
  );
}
