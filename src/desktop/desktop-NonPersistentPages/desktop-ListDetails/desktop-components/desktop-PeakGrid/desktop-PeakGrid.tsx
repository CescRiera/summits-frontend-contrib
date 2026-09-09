import React, { useMemo } from "react";
import { Loader2 } from "lucide-react";
import type {
  PeakListDetailsResponse,
} from "../../../../../shared/api/types";
import PeakListItem from "../desktop-PeakList/desktop-PeakList.tsx";
import { fuzzySearch } from "../../desktop-utils.ts";
import type { SortOption, FilterMode } from "../../desktop-types.ts";
import { getRegionFromHierarchy, getCountryFromHierarchy } from "../../../../../shared/utils/adminHierarchy";
import styles from "./desktop-PeakGrid.module.css";

type PeakGridProps = {
  listData: PeakListDetailsResponse;
  sortOption: SortOption;
  filterMode: FilterMode;
  searchQuery: string;
  isLoading: boolean;
  isTransitioning: boolean;
  onPeakClick: (peakId: number) => void;
  hasCompletedPeaks: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
};

export const PeakGrid: React.FC<PeakGridProps> = React.memo(
  ({
    listData,
    sortOption,
    filterMode,
    searchQuery,
    isLoading,
    isTransitioning,
    onPeakClick,
    hasCompletedPeaks,
    t,
  }) => {
    // Memoized filtered and sorted peaks
    const filteredAndSortedPeaks = useMemo(() => {
      if (!listData?.peaks) return [];

      let peaks = [...listData.peaks];

      // Apply search filter first
      if (searchQuery.trim()) {
        peaks = peaks.filter(
          (peak) =>
            fuzzySearch(searchQuery, peak.name) ||
            fuzzySearch(searchQuery, getRegionFromHierarchy(peak.admin_hierarchy)) ||
            fuzzySearch(searchQuery, getCountryFromHierarchy(peak.admin_hierarchy))
        );
      }

      // Apply completion filter
      if (filterMode === "completed") {
        peaks = peaks.filter((peak) => peak.user?.completed === true);
      } else if (filterMode === "missing") {
        peaks = peaks.filter((peak) => peak.user?.completed !== true);
      }
      // "all" shows all peaks

      // Then apply sorting
      const { field, direction } = sortOption;

      const sorted = peaks.sort((a, b) => {
        let comparison = 0;

        switch (field) {
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "elevation":
            comparison = a.elevation - b.elevation;
            break;
          case "date": {
            const aDate = a.user?.routes?.[0]?.date
              ? new Date(a.user.routes[0].date).getTime()
              : 0;
            const bDate = b.user?.routes?.[0]?.date
              ? new Date(b.user.routes[0].date).getTime()
              : 0;
            comparison = aDate - bDate;
            break;
          }
          case "ascents": {
            const aAscents = a.user?.count || 0;
            const bAscents = b.user?.count || 0;
            comparison = aAscents - bAscents;
            break;
          }
          default:
            return 0;
        }

        return direction === "desc" ? -comparison : comparison;
      });

      return sorted;
    }, [listData?.peaks, sortOption, filterMode, searchQuery]);

    // Show message when no completed peaks
    const shouldShowNoCompletedMessage = useMemo(() => {
      return filterMode === "completed" && !hasCompletedPeaks;
    }, [filterMode, hasCompletedPeaks]);

    // Show message when no peaks found for search
    const shouldShowNoSearchResults = useMemo(() => {
      return searchQuery.trim() && filteredAndSortedPeaks.length === 0;
    }, [searchQuery, filteredAndSortedPeaks.length]);

    return (
      <>
        {/* No Results Messages */}
        {!isLoading && shouldShowNoCompletedMessage && (
          <div className={styles["peakGrid__noCompletedMessage"]}>
            <p className="typography-desktop-body-small">
              {t("listDetails.noCompletedPeaks")}
            </p>
          </div>
        )}

        {!isLoading && shouldShowNoSearchResults && (
          <div className={styles["peakGrid__noSearchResultsMessage"]}>
            <p className="typography-desktop-body-small">
              {t("listDetails.noSearchResults", { query: searchQuery })}
            </p>
          </div>
        )}

        {/* Peaks List */}
        <div
          className={`${styles["peakGrid__listContainer"]} ${
            (isLoading || isTransitioning)
              ? styles["peakGrid__listContainer--loading"]
              : ""
          }`}
        >
          {/* Loading Overlay */}
          {isLoading && (
            <div className={styles["peakGrid__overlay"]}>
              <div className={styles["peakGrid__overlayContent"]}>
                <Loader2
                  size={40}
                  className={styles["peakGrid__loadingSpinner"]}
                />
                <p className={styles["peakGrid__loadingText"]}>
                  {t("listDetails.loading")}
                </p>
              </div>
            </div>
          )}

          {/* Table View */}
          {listData?.peaks && (
            <div className={`${styles["peakGrid__tableContainer"]} ${isTransitioning ? styles["peakGrid__tableContainer--transitioning"] : ""}`}>
              <div className={`${styles["peakGrid__tableHeader"]} ${sortOption.field === "date" ? styles["peakGrid__tableHeader--withDate"] : ""} typography-desktop-label-medium`}>
                <div className={styles["peakGrid__thName"]}>{t("listDetails.sorting.name")}</div>
                <div className={styles["peakGrid__thElevation"]}>{t("listDetails.sorting.elevation")}</div>
                <div className={styles["peakGrid__thLocation"]}>{t("leaderboard.location")}</div>
                {sortOption.field === "date" && (
                  <div className={styles["peakGrid__thDate"]}>{t("listDetails.sorting.date")}</div>
                )}
                <div className={styles["peakGrid__thAction"]}></div>
              </div>
              <div className={styles["peakGrid__tableBody"]}>
                {filteredAndSortedPeaks.map((peak) => (
                  <PeakListItem
                    key={`peak-${peak.id}`}
                    peak={peak}
                    onPeakClick={onPeakClick}
                    showDate={sortOption.field === "date"}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
);
