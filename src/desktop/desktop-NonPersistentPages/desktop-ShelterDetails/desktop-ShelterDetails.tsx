import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import React from "react";
import { useParams } from "react-router-dom";
import styles from "./desktop-ShelterDetails.module.css";
import { useOptionalOverlayContext } from "../../desktop-components/desktop-Overlay/desktop-OverlayContext.tsx";
import ShelterHeader from "./desktop-ShelterHeader/desktop-ShelterHeader.tsx";
import ShelterGallery from "./desktop-ShelterGallery/desktop-ShelterGallery.tsx";
import ShelterDescription from "./desktop-ShelterDescription/desktop-ShelterDescription.tsx";
import ShelterWeather from "./desktop-ShelterWeather/desktop-ShelterWeather.tsx";
import ShelterWikilocRoute from "./desktop-ShelterWikilocRoute/desktop-ShelterWikilocRoute.tsx";
import ShelterNearbyPeaks from "./desktop-ShelterNearbyPeaks/desktop-ShelterNearbyPeaks.tsx";
import ShelterNearbyShelters from "./desktop-ShelterNearbyShelters/desktop-ShelterNearbyShelters.tsx";
import { getShelterBasic } from "../../../shared/api/endpoints/shelters";
import { saveShelter, unsaveShelter } from "../../../shared/api/endpoints/user";
import type { ShelterBasic } from "../../../shared/api/types";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";

const ConditionalCell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hasContent, setHasContent] = useState<boolean | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkContent = useCallback(() => {
    if (!contentRef.current) return false;
    const hasVisibleContent =
      contentRef.current.children.length > 0 ||
      (contentRef.current.textContent?.trim().length ?? 0) > 0 ||
      contentRef.current.querySelector("*") !== null;
    return hasVisibleContent;
  }, []);

  useLayoutEffect(() => {
    const hasVisibleContent = checkContent();
    if (hasContent !== hasVisibleContent) {
      setHasContent(hasVisibleContent);
    }
  }, [children, hasContent, checkContent]);

  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }
    checkTimeoutRef.current = setTimeout(() => {
      const hasVisibleContent = checkContent();
      setHasContent(hasVisibleContent);
    }, 100);
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [children, checkContent]);

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new MutationObserver(() => {
      const hasVisibleContent = checkContent();
      setHasContent(hasVisibleContent);
    });
    observer.observe(contentRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [checkContent]);

  if (hasContent === false) {
    return null;
  }

  return (
    <div className={styles["shelterDetails__cell"]} ref={contentRef}>
      {children}
    </div>
  );
};

export default function ShelterDetails() {
  const { id } = useParams<{ id: string }>();
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
  const shelterId = id ? parseInt(id) : null;
  const isSaved = savedState.shelterId === shelterId ? savedState.value : null;

  useEffect(() => {
    return () => {};
  }, [shelterId]);

  const handleSavedClick = useCallback(async () => {
    if (!shelterId || !user || !idToken || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        trackEvent("interaction", `shelter_desktop_unsave_attempt_${shelterId}`);
        const response = await unsaveShelter(shelterId);
        if (response.success) {
          setSavedState({ shelterId, value: false });
          trackEvent("interaction", `shelter_desktop_unsave_success_${shelterId}`);
        }
      } else {
        trackEvent("interaction", `shelter_desktop_save_attempt_${shelterId}`);
        const response = await saveShelter(shelterId);
        if (response.success) {
          setSavedState({ shelterId, value: true });
          trackEvent("interaction", `shelter_desktop_save_success_${shelterId}`);
        }
      }
    } catch (error) {
      console.error("Error saving/unsaving shelter:", error);
      trackEvent("interaction", `shelter_desktop_save_toggle_failed_${shelterId}`);
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
        trackEvent("interaction", `shelter_desktop_details_loaded_${shelterId}`);
      })
      .catch((err) => {
        try {
          console.timeEnd(timerLabel);
        } catch {}
        console.error("[ShelterDetails] Error in getShelterBasic", err);
        trackEvent("interaction", `shelter_desktop_details_load_failed_${shelterId}`);
      });
  }, [shelterId, trackEvent]);

  useEffect(() => {
    if (!shelterBasic || !overlayContext || !shelterId) return;
    const shelterName =
      shelterBasic.name_en || shelterBasic.name || t("shelterDetails.unknownShelter");
    const baseStorageKey = `shelter:${shelterId}`;
    const matchingOverlay = overlayContext.overlayStack.find(
      (overlay) => overlay.baseStorageKey === baseStorageKey
    );
    if (matchingOverlay && matchingOverlay.name !== shelterName) {
      overlayContext.updateOverlayNameByBaseKey(baseStorageKey, shelterName);
    }
  }, [shelterBasic, shelterId, overlayContext, t]);

  if (!shelterId) {
    return (
      <div className={styles["shelterDetails"]}>
        <div className={styles["content"]}>
          <p className={`${styles["noData"]} typography-desktop-body-small`}>
            {t("shelterDetails.invalidShelterId")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["shelterDetails"]}>
      <div className={styles["shelterDetails__container"]}>
        {shelterBasic ? (
          <>
            <div className={styles["shelterDetails__left-column"]}>
              <div className={styles["shelterDetails__cell"]}>
                <ShelterHeader
                  shelterId={shelterId}
                  shelterBasic={shelterBasic}
                  isSaved={isSaved}
                  isSaving={isSaving}
                  onSavedClick={handleSavedClick}
                  showSaveButton={!!(user && idToken && isSaved !== null)}
                />
              </div>

              <ConditionalCell>
                <ShelterGallery shelterId={shelterId} />
              </ConditionalCell>

              <ConditionalCell>
                <ShelterDescription shelterId={shelterId} />
              </ConditionalCell>

              <ShelterWikilocRoute
                shelterId={shelterId}
                shelterName={
                  shelterBasic.name_en ||
                  shelterBasic.name ||
                  t("shelterDetails.unknownShelter")
                }
                coordinates={shelterBasic.coordinates}
              />

              <ConditionalCell>
                <ShelterNearbyShelters shelterId={shelterId} />
              </ConditionalCell>
            </div>

            <div className={styles["shelterDetails__right-column"]}>
              <ConditionalCell>
                <ShelterWeather shelterId={shelterId} />
              </ConditionalCell>

              <ConditionalCell>
                <ShelterNearbyPeaks shelterId={shelterId} />
              </ConditionalCell>
            </div>
          </>
        ) : (
          <div className={styles["shelterDetails__left-column"]}>
            <div className={styles["shelterDetails__cell"]}>
              <div className="typography-desktop-body-small">{t("common.loading")}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
