import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { SelectedManualPeak } from "../../../../shared/hooks/useManualPeakSelection";
import { getElevationColor } from "../../../../shared/constants/elevationColors";
import { type AdminHierarchy } from "../../../../shared/api/types";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import styles from "./desktop-AddManualPeaksList.module.css";

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

interface DesktopAddManualPeaksListProps {
  peaks: unknown[];
  selectedPeaks: SelectedManualPeak[];
  onPeakSelect: (peakId: number, peakName: string) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  children?: React.ReactNode;
}

interface PeakData {
  id: number;
  name: string;
  name_en?: string | null;
  elevation: number;
  image?: string | null;
  admin_hierarchy?: AdminHierarchy;
}

export const DesktopAddManualPeaksList: React.FC<
  DesktopAddManualPeaksListProps
> = ({ 
  peaks, 
  selectedPeaks, 
  onPeakSelect, 
  t, 
  onLoadMore,
  hasMore,
  isLoadingMore,
  children 
}) => {
  const { formatMeters } = useUnitFormat();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  const isSelected = (peakId: number): boolean => {
    return selectedPeaks.some((p) => p.peak_id === peakId);
  };

  // Internal IntersectionObserver
  React.useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
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
      className={styles["desktop-add-manual-peaks-list"]}
    >
      {(peaks as PeakData[]).map((peak) => {
        const selected = isSelected(peak.id);
        const route = selectedPeaks.find((p) => p.peak_id === peak.id);
        const hasValidImage = isValidImage(peak.image);
        const elevationColor = getElevationColor(peak.elevation);


        const locationText = getLocationFromHierarchy(peak.admin_hierarchy);

        return (
          <div
            key={peak.id}
            className={`${styles["desktop-add-manual-peaks-list__item"]} ${
              selected
                ? styles["desktop-add-manual-peaks-list__item--selected"]
                : ""
            }`}
            onClick={() => onPeakSelect(peak.id, peak.name_en || peak.name)}
          >
            {/* Checkbox */}
            <div className={styles["desktop-add-manual-peaks-list__checkbox"]}>
              {selected ? (
                <CheckCircle2
                  size={20}
                  className={
                    styles["desktop-add-manual-peaks-list__icon--checked"]
                  }
                />
              ) : (
                <Circle
                  size={20}
                  className={styles["desktop-add-manual-peaks-list__icon"]}
                />
              )}
            </div>

            {/* Peak Image */}
            <div className={styles["desktop-add-manual-peaks-list__image"]}>
              {hasValidImage ? (
                <img
                  src={peak.image || defaultPeak}
                  alt={peak.name}
                  className={styles["desktop-add-manual-peaks-list__image-img"]}
                />
              ) : (
                <div
                  className={
                    styles["desktop-add-manual-peaks-list__image-placeholder"]
                  }
                >
                  <div
                    className={
                      styles["desktop-add-manual-peaks-list__image-placeholder-bg"]
                    }
                    style={{
                      backgroundColor: elevationColor,
                    }}
                  />
                  <img
                    src={getElevationIcon(peak.elevation)}
                    alt="Elevation icon"
                    className={styles["desktop-add-manual-peaks-list__image-icon"]}
                  />
                </div>
              )}
            </div>

            {/* Peak Info */}
            <div className={styles["desktop-add-manual-peaks-list__info"]}>
              <h4
                className={`${styles["desktop-add-manual-peaks-list__name"]} typography-desktop-body-medium`}
              >
                {peak.name_en || peak.name}
              </h4>
              <div className={`${styles["desktop-add-manual-peaks-list__meta"]} typography-body-small`}>
                <img
                  src={getElevationIcon(peak.elevation)}
                  alt="Elevation icon"
                  className={styles["desktop-add-manual-peaks-list__meta-icon"]}
                />
                <span className="typography-desktop-body-small">
                  {formatMeters(peak.elevation)}
                </span>
                {locationText && (
                  <>
                    <span
                      className={styles["desktop-add-manual-peaks-list__dot"]}
                    >
                      •
                    </span>
                    <span className="typography-desktop-body-small">
                      {locationText}
                    </span>
                  </>
                )}
              </div>
              {selected && route?.route_id && (
                <div
                  className={styles["desktop-add-manual-peaks-list__route-tag"]}
                >
                  <span className="typography-desktop-body-small">
                    {t("addManualPeaks.associatedRoute")}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {hasMore && (
        <div ref={loadMoreRef} style={{ height: '20px', display: 'flex', justifyContent: 'center', padding: '16px' }}>
          {isLoadingMore && <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />}
        </div>
      )}
      {children}
    </div>
  );
};
