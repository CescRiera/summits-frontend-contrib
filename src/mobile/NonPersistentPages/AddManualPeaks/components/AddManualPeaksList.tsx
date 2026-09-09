import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { SelectedManualPeak } from "../../../../shared/hooks/useManualPeakSelection";
import { getElevationColor } from "../../../../shared/constants/elevationColors";
import { type AdminHierarchy } from "../../../../shared/api/types";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import styles from "./AddManualPeaksList.module.css";

const defaultPeak = "/icons/altitude/place.jpg";

const getElevationIcon = (elevation: number) => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

const isValidImage = (imageUrl: string | null | undefined): boolean => {
  if (!imageUrl || typeof imageUrl !== 'string') return false;
  return !imageUrl.toLowerCase().includes(".svg.");
};

interface AddManualPeaksListProps {
  peaks: unknown[];
  selectedPeaks: SelectedManualPeak[];
  onPeakSelect: (peakId: number, peakName: string) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

interface PeakData {
  id: number;
  name: string;
  name_en?: string | null;
  elevation: number;
  image?: string | null;
  admin_hierarchy?: AdminHierarchy;
}

/**
 * Scrollable list of peaks with selection checkboxes
 * Tap to select and initiate route association
 */
export const AddManualPeaksList: React.FC<AddManualPeaksListProps> = ({
  peaks,
  selectedPeaks,
  onPeakSelect,
  t,
  onLoadMore,
  hasMore,
  isLoadingMore,
}) => {
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const { formatMeters } = useUnitFormat();

  const isSelected = (peakId: number): boolean => {
    return selectedPeaks.some((p) => p.peak_id === peakId);
  };

  // Internal IntersectionObserver
  React.useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore) {
          onLoadMore();
        }
      },
      { 
        threshold: 0.1, 
        rootMargin: "200px" 
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoadingMore, peaks.length]);

  return (
    <div 
      ref={containerRef}
      className={styles["add-manual-peaks-list"]}
    >
      {(peaks as PeakData[]).map((peak) => {
        const selected = isSelected(peak.id);
        const route = selectedPeaks.find((p) => p.peak_id === peak.id);
        const hasValidImage = isValidImage(peak.image);
        const elevationColor = getElevationColor(peak.elevation);
        const elevationIcon = getElevationIcon(peak.elevation);
        const locationText = getLocationFromHierarchy(peak.admin_hierarchy);

        return (
          <div
            key={peak.id}
            className={`${styles["add-manual-peaks-list__item"]} ${
              selected ? styles["add-manual-peaks-list__item--selected"] : ""
            }`}
            onClick={() => onPeakSelect(peak.id, peak.name_en || peak.name)}
          >
            {/* Peak Image */}
            <div className={styles["add-manual-peaks-list__image"]}>
              {hasValidImage ? (
                <img
                  src={peak.image || defaultPeak}
                  alt={peak.name}
                  className={styles["add-manual-peaks-list__image-img"]}
                />
              ) : (
                <div
                  className={styles["add-manual-peaks-list__image-placeholder"]}
                  style={{
                    background: `linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)), ${elevationColor}`,
                  }}
                >
                  <img
                    src={elevationIcon}
                    alt="Elevation icon"
                    className={styles["add-manual-peaks-list__image-icon"]}
                  />
                </div>
              )}
            </div>

            {/* Peak Info */}
            <div className={styles["add-manual-peaks-list__info"]}>
              <h3
                className={`${styles["add-manual-peaks-list__name"]} typography-title-medium`}
              >
                {peak.name_en || peak.name}
              </h3>
              <div className={styles["add-manual-peaks-list__meta"]}>
                <img
                  src={elevationIcon}
                  alt="Elevation icon"
                  className={styles["add-manual-peaks-list__elevation-icon"]}
                />
                <span className="typography-body-small">
                  {formatMeters(peak.elevation)}
                </span>
                {locationText && (
                  <>
                  <span className="typography-body-small">
                    {" "}
                  </span>
              
                    <span 
                      className={`${styles["add-manual-peaks-list__location"]} typography-body-small`}
                    >
                    {locationText}
                    </span>
                  </>
                )}
              </div>
              {selected && route?.route_id && (
                <div className={styles["add-manual-peaks-list__route-tag"]}>
                  <span className="typography-label-medium">
                    {t("addManualPeaks.associatedRoute")}
                  </span>
                </div>
              )}
            </div>

            {/* Checkbox */}
            <div className={styles["add-manual-peaks-list__checkbox"]}>
              {selected ? (
                <CheckCircle2
                  size={24}
                  className={styles["add-manual-peaks-list__icon--checked"]}
                />
              ) : (
                <Circle
                  size={24}
                  className={styles["add-manual-peaks-list__icon"]}
                />
              )}
            </div>
          </div>
        );
      })}
      
      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className={styles["add-manual-peaks-list__load-more"]}
        >
          {isLoadingMore ? (
            <Loader2
              size={24}
              className={styles["add-manual-peaks-list__spinner"]}
            />
          ) : (
            <div style={{ height: "20px" }} /> // Anchor when not loading
          )}
        </div>
      )}
    </div>
  );
};
