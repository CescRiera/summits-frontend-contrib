import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import React from "react";
import { useParams } from "react-router-dom";
import styles from "./desktop-PeakDetails.module.css";
import { useOptionalOverlayContext } from "../../desktop-components/desktop-Overlay/desktop-OverlayContext.tsx";
import PeakHeader from "./desktop-PeakHeader/desktop-PeakHeader.tsx";
import Gallery from "./desktop-Gallery/desktop-Gallery.tsx";
import Description from "./desktop-Description/desktop-Description.tsx";
import Weather from "./desktop-Weather/desktop-Weather.tsx";
import WikilocRoute from "./desktop-WikilocRoute/desktop-WikilocRoute.tsx";
import Infrastructure from "./desktop-Infrastructure/desktop-Infrastructure.tsx";
import NearbyPeaks from "./desktop-NearbyPeaks/desktop-NearbyPeaks.tsx";
import CommunityInfo from "./desktop-CommunityInfo/desktop-CommunityInfo.tsx";
import FloraFauna from "./desktop-FloraFauna/desktop-FloraFauna.tsx";
import { getPeakBasicName } from "../../../shared/api/endpoints/peaks";
import { savePeak, unsavePeak } from "../../../shared/api/endpoints/user";
import type { PeakBasicName } from "../../../shared/api/types";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";

// Component tracker to detect if a component has data
const ComponentTracker: React.FC<{
  component: React.ReactNode;
  onHasDataChange: (hasData: boolean) => void;
}> = ({ component, onHasDataChange }) => {
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

  useEffect(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      const hasVisibleContent = checkContent();
      setHasContent(hasVisibleContent);
      onHasDataChange(hasVisibleContent);
    }, 200);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [component, checkContent, onHasDataChange]);

  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new MutationObserver(() => {
      const hasVisibleContent = checkContent();
      setHasContent(hasVisibleContent);
      onHasDataChange(hasVisibleContent);
    });

    observer.observe(contentRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [checkContent, onHasDataChange]);

  // Don't render anything if we've determined there's no content
  if (hasContent === false) {
    return null;
  }

  return <div ref={contentRef}>{component}</div>;
};

// Wrapper component that only renders the cell if the child component has content
const ConditionalCell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hasContent, setHasContent] = useState<boolean | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkContent = useCallback(() => {
    if (!contentRef.current) return false;

    // Check if there are any actual DOM nodes
    const hasVisibleContent =
      contentRef.current.children.length > 0 ||
      (contentRef.current.textContent?.trim().length ?? 0) > 0 ||
      contentRef.current.querySelector("*") !== null;

    return hasVisibleContent;
  }, []);

  // Check synchronously after layout
  useLayoutEffect(() => {
    const hasVisibleContent = checkContent();
    if (hasContent !== hasVisibleContent) {
      setHasContent(hasVisibleContent);
    }
  }, [children, hasContent, checkContent]);

  // Also check after a short delay to catch async updates (e.g., when ShimmerWrapper resolves)
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

  // Use a MutationObserver to detect when content changes (e.g., ShimmerWrapper returns null)
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

  // Don't render anything if we've determined there's no content
  if (hasContent === false) {
    return null;
  }

  return (
    <div className={styles["peakDetails__cell"]} ref={contentRef}>
      {children}
    </div>
  );
};

export default function PeakDetails() {
  const { id } = useParams<{ id: string }>();
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
  const peakId = id ? parseInt(id) : null;
  const isSaved =
    savedState.peakId === peakId ? savedState.value : null;

  // Track which optional components have data
  const [hasGallery, setHasGallery] = useState<boolean | null>(null);
  const [hasCommunityInfo, setHasCommunityInfo] = useState<boolean | null>(
    null
  );
  const [hasFloraFauna, setHasFloraFauna] = useState<boolean | null>(null);
  const [hasInfrastructure, setHasInfrastructure] = useState<boolean | null>(
    null
  );

  // Calculate if we should move components to left column
  // Count only components that we know exist (true), not null (unknown) or false (missing)
  const optionalComponentsCount = [
    hasGallery === true,
    hasCommunityInfo === true,
    hasFloraFauna === true,
  ].filter(Boolean).length;

  // Count how many are missing (false)
  const missingCount = [
    hasGallery === false,
    hasCommunityInfo === false,
    hasFloraFauna === false,
  ].filter(Boolean).length;

  // Only move if we know at least one is missing (hasGallery/CommunityInfo/FloraFauna is false)
  // If any are null (still loading), assume they exist and don't move yet
  const hasAnyMissing =
    hasGallery === false ||
    hasCommunityInfo === false ||
    hasFloraFauna === false;

  // Move Infrastructure to left if any optional component is missing
  const shouldMoveInfrastructureToLeft =
    hasAnyMissing && optionalComponentsCount < 3;

  // Move NearbyPeaks to left only if 2+ optional components are missing AND Infrastructure is also missing
  const shouldMoveNearbyPeaksToLeft =
    missingCount >= 2 && hasInfrastructure === false;

  // --- SCROLL POSITION LOGIC ---
  // Note: Scrolling is handled by the DetailOverlay container, not this component
  // The containerRef is kept for potential future use but doesn't control scrolling
  useEffect(() => {
    // Scroll is handled by the overlay container, so we don't need to manage it here
    return () => {
      // Cleanup if needed
    };
  }, [peakId]);

  const handleSavedClick = useCallback(async () => {
    if (!peakId || !user || !idToken || isSaving) return;

    setIsSaving(true);
    try {
      if (isSaved) {
        trackEvent("interaction", `peak_desktop_unsave_attempt_${peakId}`);
        // Unsave the peak
        const response = await unsavePeak(peakId);
        if (response.success) {
          setSavedState({ peakId, value: false });
          trackEvent("interaction", `peak_desktop_unsave_success_${peakId}`);
        }
      } else {
        trackEvent("interaction", `peak_desktop_save_attempt_${peakId}`);
        // Save the peak
        const response = await savePeak(peakId);
        if (response.success) {
          setSavedState({ peakId, value: true });
          trackEvent("interaction", `peak_desktop_save_success_${peakId}`);
        }
      }
    } catch (error) {
      console.error("Error saving/unsaving peak:", error);
      trackEvent("interaction", `peak_desktop_save_toggle_failed_${peakId}`);
      // You might want to show a toast notification here
    } finally {
      setIsSaving(false);
    }
  }, [peakId, user, idToken, isSaving, isSaved, peakBasicName, trackEvent]);

  // Memoize the onLoaded callback to prevent unnecessary re-renders
  const handleLoaded = useCallback(() => {
    // Empty callback - no action needed
  }, []);

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

        // Track peak view
        trackEvent("interaction", `peak_desktop_details_loaded_${peakId}`);
      })
      .catch((err) => {
        // Ensure timer is ended even on error
        try {
          console.timeEnd(timerLabel);
        } catch {
          // Ignore timer errors
        }
        console.error("[PeakDetails] Error in getPeakBasicName", err);
        trackEvent("interaction", `peak_desktop_details_load_failed_${peakId}`);
        // Handle error silently, header will show "Loading..."
      });
  }, [peakId, user, idToken, trackEvent]);

  // Update overlay name for breadcrumbs when peak data loads
  useEffect(() => {
    if (!peakBasicName || !overlayContext || !peakId) return;

    const peakName =
      peakBasicName.name_en || peakBasicName.name || "Unknown Peak";
    const baseStorageKey = `peak:${peakId}`;

    // Find the overlay in the stack that matches this peak
    const matchingOverlay = overlayContext.overlayStack.find(
      (overlay) => overlay.baseStorageKey === baseStorageKey
    );

    // Only update if the name is different to avoid unnecessary updates
    if (matchingOverlay && matchingOverlay.name !== peakName) {
      overlayContext.updateOverlayNameByBaseKey(baseStorageKey, peakName);
    }
  }, [peakBasicName, peakId, overlayContext]);

  if (!peakId) {
    return (
      <div className={styles["peakDetails"]}>
        <div className={styles["content"]}>
          <p className={`${styles["noData"]} typography-desktop-body-small`}>
            Invalid peak ID
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["peakDetails"]}>
      <div className={styles["peakDetails__container"]}>
        {/* Content Grid - Two Columns */}
        {peakBasicName ? (
          <>
            {/* Left Column (65%) */}
            <div className={styles["peakDetails__left-column"]}>
              {/* Header Cell */}
              <div className={styles["peakDetails__cell"]}>
                <PeakHeader
                  peakId={peakId}
                  peakBasicName={peakBasicName}
                  onLoaded={handleLoaded}
                  isSaved={isSaved}
                  isSaving={isSaving}
                  onSavedClick={handleSavedClick}
                  showSaveButton={!!(user && idToken && isSaved !== null)}
                />
              </div>

              <ComponentTracker
                component={<Gallery peakId={peakId} />}
                onHasDataChange={setHasGallery}
              />
              {peakBasicName?.wikidata_id === true && (
                <ConditionalCell>
                  <Description peakId={peakId} />
                </ConditionalCell>
              )}

              <WikilocRoute
                peakId={peakId}
                peakName={
                  peakBasicName?.name_en ||
                  peakBasicName?.name ||
                  "Unknown Peak"
                }
                {...(peakBasicName?.coordinates
                  ? { coordinates: peakBasicName.coordinates }
                  : {})}
              />

              <ComponentTracker
                component={
                  <ConditionalCell>
                    <CommunityInfo peakId={peakId} />
                  </ConditionalCell>
                }
                onHasDataChange={setHasCommunityInfo}
              />

              <ComponentTracker
                component={
                  <ConditionalCell>
                    <FloraFauna peakId={peakId} />
                  </ConditionalCell>
                }
                onHasDataChange={setHasFloraFauna}
              />

              {/* Move Infrastructure to left if optional components are missing */}
              {shouldMoveInfrastructureToLeft && (
                <ComponentTracker
                  component={
                    <ConditionalCell>
                      <Infrastructure peakId={peakId} />
                    </ConditionalCell>
                  }
                  onHasDataChange={setHasInfrastructure}
                />
              )}

              {/* Move NearbyPeaks to left if Infrastructure is also missing */}
              {shouldMoveNearbyPeaksToLeft && (
                <ConditionalCell>
                  <NearbyPeaks peakId={peakId} />
                </ConditionalCell>
              )}
            </div>

            {/* Right Column (35%) */}
            <div className={styles["peakDetails__right-column"]}>
              <ConditionalCell>
                <Weather peakId={peakId} />
              </ConditionalCell>

              {/* Keep Infrastructure in right if optional components exist */}
              {!shouldMoveInfrastructureToLeft && (
                <ComponentTracker
                  component={
                    <ConditionalCell>
                      <Infrastructure peakId={peakId} />
                    </ConditionalCell>
                  }
                  onHasDataChange={setHasInfrastructure}
                />
              )}

              {/* Keep NearbyPeaks in right if Infrastructure exists or optional components exist */}
              {!shouldMoveNearbyPeaksToLeft && (
                <ConditionalCell>
                  <NearbyPeaks peakId={peakId} />
                </ConditionalCell>
              )}
            </div>
          </>
        ) : (
          <div className={styles["peakDetails__left-column"]}>
            <div className={styles["peakDetails__cell"]}>
              <div className="typography-desktop-body-small">Loading...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
