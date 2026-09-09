import React, { memo, useState, useEffect, useCallback } from "react";
import styles from "./ShelterDetailsMap.module.css";
import { getShelterBasic } from "../../../../shared/api/endpoints/shelters";
import { saveShelter, unsaveShelter } from "../../../../shared/api/endpoints/user";
import type { ShelterBasic } from "../../../../shared/api/types";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import { useAuth } from "../../../../shared/context/AuthContext";
import ShelterGallery from "../../../NonPersistentPages/ShelterDetails/ShelterGallery/ShelterGallery";
import ShelterDescription from "../../../NonPersistentPages/ShelterDetails/ShelterDescription/ShelterDescription";
import ShelterWeather from "../../../NonPersistentPages/ShelterDetails/ShelterWeather/ShelterWeather";
import ShelterWikilocRoute from "../../../NonPersistentPages/ShelterDetails/ShelterWikilocRoute/ShelterWikilocRoute";
import ShelterNearbyPeaks from "../../../NonPersistentPages/ShelterDetails/ShelterNearbyPeaks/ShelterNearbyPeaks";
import ShelterNearbyShelters from "../../../NonPersistentPages/ShelterDetails/ShelterNearbyShelters/ShelterNearbyShelters";
import ShelterChangeModal from "../ShelterChangeModal/ShelterChangeModal";
import { useI18n } from "../../../../shared/context/I18nContext";
import { Pencil } from "lucide-react";

const shelterTypeColors: Record<string, string> = {
  alpine_hut: "#0C4A7B",
  wilderness_hut: "#2D6A4F",
  shelter: "#D92B2B",
};

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

interface ShelterDetailsMapProps {
  shelterId: number;
}

const ShelterDetailsMap: React.FC<ShelterDetailsMapProps> = ({
  shelterId,
}) => {
  const { t } = useI18n();
  const { user, idToken } = useAuth();
  const [shelterBasic, setShelterBasic] = useState<ShelterBasic | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedState, setSavedState] = useState<{
    shelterId: number | null;
    value: boolean | null;
  }>({ shelterId: null, value: null });
  const isSaved =
    savedState.shelterId === shelterId ? savedState.value : null;

  const handleSavedClick = useCallback(async () => {
    if (!shelterId || !user || !idToken || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        const response = await unsaveShelter(shelterId);
        if (response.success) {
          setSavedState({ shelterId, value: false });
        }
      } else {
        const response = await saveShelter(shelterId);
        if (response.success) {
          setSavedState({ shelterId, value: true });
        }
      }
    } catch (error) {
      console.error("Error saving/unsaving shelter:", error);
    } finally {
      setIsSaving(false);
    }
  }, [shelterId, user, idToken, isSaving, isSaved]);

  useEffect(() => {
    if (!shelterId) return;
    let cancelled = false;

    getShelterBasic(shelterId)
      .then((data) => {
        if (!cancelled) {
          setShelterBasic(data);
          setSavedState({ shelterId, value: data.saved ?? false });
        }
      })
      .catch((err) => {
        console.error("[ShelterDetailsMap] Error in getShelterBasic", err);
      });

    return () => {
      cancelled = true;
    };
  }, [shelterId]);

  const typeColor = shelterBasic
    ? shelterTypeColors[shelterBasic.type] || "#D92B2B"
    : "#D92B2B";
  const typeLabel = shelterBasic
    ? t(`shelterDetails.type.${shelterBasic.type}`) || shelterBasic.type
    : "";
  const location = shelterBasic
    ? getLocationFromHierarchy(shelterBasic.admin_hierarchy)
    : "";

  if (!shelterId) {
    return (
      <div className={styles["shelterDetailsMap"]}>
        <div className={styles["content"]}>
          <p className={`${styles["noData"]} typography-body-medium`}>
            {t("shelterDetails.invalidShelterId")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["shelterDetailsMap"]}>
      <div className={styles["content"]}>
        {shelterBasic && (
          <div className={styles["shelterDetailsHeader"]}>
            <div className={styles["locationBlock"]}>
              <div className={styles["locationText"]}>
                {location && (
                  <span className={styles["locationRegion"]}>
                    {location}
                  </span>
                )}
              </div>
            </div>

            <div className={styles["actionBtns"]}>
              <div className={styles["badges"]}>
                <span
                  className={`${styles["typeBadge"]} typography-title-small`}
                  style={{
                    backgroundColor: `${typeColor}18`,
                    color: typeColor,
                    borderColor: `${typeColor}40`,
                  }}
                >
                  {typeLabel}
                </span>
              </div>
              <button
                type="button"
                className={styles["editBtn"]}
                onClick={() => setShowEditModal(true)}
                aria-label={t("shelterDetails.suggestEdit")}
                title={t("shelterChange.editTitle")}
              >
                <Pencil size={16} />
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

        {shelterBasic && (
          <ShelterGallery shelterId={shelterId} />
        )}

        {shelterBasic && (
          <ShelterDescription shelterId={shelterId} />
        )}

        {shelterBasic && (
          <ShelterWikilocRoute
            shelterId={shelterId}
            shelterName={
              shelterBasic.name_en ||
              shelterBasic.name ||
              t("shelterDetails.unknownShelter")
            }
            coordinates={shelterBasic.coordinates}
          />
        )}

        <ShelterWeather shelterId={shelterId} />

        <ShelterNearbyPeaks shelterId={shelterId} />

        <ShelterNearbyShelters shelterId={shelterId} />
      </div>

      {shelterBasic && (
        <ShelterChangeModal
          key={`edit-${shelterBasic.id}-${showEditModal}`}
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          mode="edit"
          shelterData={{
            id: shelterBasic.id,
            name: shelterBasic.name ?? null,
            name_en: shelterBasic.name_en ?? null,
            shelter_type: shelterBasic.type,
            elevation: shelterBasic.elevation,
            lat: shelterBasic.coordinates.lat,
            lng: shelterBasic.coordinates.lng,
            wikipedia: shelterBasic.wikipedia ?? null,
          }}
        />
      )}
    </div>
  );
};

export default ShelterDetailsMap;
