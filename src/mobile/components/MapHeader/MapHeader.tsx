"use client";

import React, { useMemo, useCallback } from "react";
import { Users, Trophy } from "lucide-react";
import SearchMap from "../SearchMap/SearchMap";
import styles from "./MapHeader.module.css";
import type {
  PeakSearchResult,
  ShelterSearchResult,
  AdminSearchResult,
  MountainRangeSearchResult,
} from "../../../shared/api/types";
import { useMapNavigation } from "../../context/MapNavigationContext";
import { useMap } from "../../context/MapContext";
import type { MapFilterType } from "../../context/MapContext";
import Slider from "@mui/material/Slider";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";

interface MapHeaderProps {
  className?: string;
  isUIHidden?: boolean;
  onAreaSelect?: (result: AdminSearchResult | MountainRangeSearchResult) => void;
}

// Helper to compare filter states for matching
const filtersMatch = (a: MapFilterType, b: MapFilterType): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === 'list-detail' && b.type === 'list-detail') {
    return a.listId === b.listId;
  }
  return true;
};

const MapHeader: React.FC<MapHeaderProps> = ({
  className = "",
  isUIHidden = false,
  onAreaSelect,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { formatMeters } = useUnitFormat();
  const { navigateToMapWithPeak, navigateToMapWithShelter } = useMapNavigation();
  const {
    mapFilters,
    handleMapElevationChange,
    handleToggleUserPeaks,
    handleSelectList,
    toggleChallengesModal,
    // Simplified filter state
    activeFilter,
    isApplyingFilter,
  } = useMap();

  // Use activeFilter for button styling
  const isFilterApplying = isApplyingFilter;

  const handleElevationChange = useCallback(
    (min: number, max: number) => {
      handleMapElevationChange(min, max);
    },
    [handleMapElevationChange]
  );

  // Handle peak selection for map navigation
  const handleMapPeakSelect = useCallback(
    (peak: PeakSearchResult) => {
      // Ensure map is in tiles mode (no user peaks, no selected list)
      handleSelectList(null);
      if (peak.lat && peak.lng) {
        // Prepare peak data for the map
        const peakData = {
          name: peak.name || peak.name_en || "Unknown Peak",
          name_en: peak.name_en || null,
          elevation: peak.elevation || 0,
        };

        navigateToMapWithPeak(
          peak.id,
          { lat: peak.lat, lng: peak.lng },
          peakData
        );
      }
    },
    [navigateToMapWithPeak, handleSelectList]
  );

  const handleMapShelterSelect = useCallback(
    (shelter: ShelterSearchResult) => {
      handleSelectList(null);
      if (shelter.lat && shelter.lng) {
        const shelterData = {
          name: shelter.name || shelter.name_en || "Unknown Shelter",
          name_en: shelter.name_en || null,
          elevation: shelter.elevation || 0,
          shelter_type: shelter.shelter_type,
        };

        navigateToMapWithShelter(
          shelter.id,
          { lat: shelter.lat, lng: shelter.lng },
          shelterData
        );
      }
    },
    [navigateToMapWithShelter, handleSelectList]
  );

  const handleMapAreaSelect = useCallback(
    (result: AdminSearchResult | MountainRangeSearchResult) => {
      onAreaSelect?.(result);
    },
    [onAreaSelect]
  );

  const mapElevationRange = useMemo(
    () => mapFilters.elevationRange as [number, number],
    [mapFilters.elevationRange[0], mapFilters.elevationRange[1]]
  );

  const onElevationRangeChange = useCallback(
    ([min, max]: [number, number]) => handleElevationChange(min, max),
    [handleElevationChange]
  );

  // Local state to control slider smoothly during drag
  const [pendingRange, setPendingRange] =
    React.useState<[number, number]>(mapElevationRange);

  // Keep local state in sync if parent changes the range externally
  React.useEffect(() => {
    setPendingRange(mapElevationRange);
  }, [mapElevationRange]);

  const sanitizeRange = (value: number | number[]): [number, number] | null => {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const min = Math.max(0, Math.min(8849, Math.round(value[0] || 0)));
    const max = Math.max(min, Math.min(8849, Math.round(value[1] || 0)));
    return [min, max];
  };

  const handleSliderChange = (_: Event, value: number | number[]) => {
    const sanitized = sanitizeRange(value);
    if (!sanitized) return;
    setPendingRange(sanitized);
  };

  const handleSliderChangeCommitted = (
    _: Event | React.SyntheticEvent,
    value: number | number[]
  ) => {
    const sanitized = sanitizeRange(value);
    if (!sanitized) return;
    setPendingRange(sanitized);
    trackEvent("filter_change", `elevation_${sanitized[0]}_${sanitized[1]}`);
    onElevationRangeChange(sanitized);
  };

  // Helper to determine if a filter is active
  const isFilterActive = (filterType: MapFilterType) => {
    return filtersMatch(activeFilter, filterType);
  };

  // User peaks button active state
  const isUserPeaksActive = isFilterActive({ type: 'user-peaks' });

  return (
    <div
      className={`${styles["map-header"]} ${
        isUIHidden ? styles["map-header--hidden"] : ""
      } ${className}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        userSelect: "none",
      }}
    >
      {/* Top Row: Search + Elevation Filter */}
      <div className={styles["header-row"]}>
        {/* SearchMap component - absolutely positioned overlay */}
        <SearchMap
          onPeakSelect={handleMapPeakSelect}
          onShelterSelect={handleMapShelterSelect}
          onAreaSelect={handleMapAreaSelect}
        />

        {/* Elevation Filter Slider */}
        <div className={styles["elevation-slider"]}>
          {/* Custom elevation range display */}
          <div className={styles["elevation-range-display"]}>
            <span className="typography-label-medium">
              {t("filters.filterByElevation")}
            </span>
            <span className="typography-label-medium">
              {formatMeters(pendingRange[0])} - {formatMeters(pendingRange[1])}
            </span>
          </div>
          <Slider
            value={pendingRange}
            min={0}
            max={8849}
            onChange={handleSliderChange}
            onChangeCommitted={handleSliderChangeCommitted}
            valueLabelDisplay="off"
            size="small"
            sx={{
              color: "#c2cf94",
              height: 4,
              padding: "0px !important",
              margin: "0 4px !important",
              width: "auto",
              "& .MuiSlider-thumb": {
                width: 14,
                height: 14,
                background: "#c2cf94",
                border: "2px solid #5f7440",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              },
              "& .MuiSlider-rail": {
                height: 4,
                background: "rgba(0, 0, 0, 0.1)",
                borderRadius: 2,
                width: "auto !important",
              },
              "& .MuiSlider-track": {
                height: 4,
                background: "#c2cf94",
                border: "none",
                borderRadius: 2,
              },
            }}
          />
        </div>
      </div>

      {/* Bottom Row: Horizontal Scrollable Filter Cards */}
      <div className={styles["filter-buttons-row"]}>
        <div className={styles["filter-buttons-container"]}>
          {/* User Peaks Button */}
          <button
            type="button"
            className={`${styles["filter-button"]} ${
              isUserPeaksActive ? styles["filter-button--active"] : ""
            }`}
            onClick={() => {
              trackEvent(
                "map_layer_toggle",
                `user_peaks_${!isUserPeaksActive ? "on" : "off"}`
              );
              handleToggleUserPeaks();
            }}
            disabled={isFilterApplying}
          >
            <Users
              size={18}
              color={isUserPeaksActive ? "rgb(0, 0, 0)" : "rgb(0, 0, 0)"}
            />
            <span className="typography-button-medium">
              {t("filters.yourPeaks")}
            </span>
          </button>

          {/* Challenges Button */}
          <button
            type="button"
            className={`${styles["filter-button"]} ${
              activeFilter.type === "list-detail" ? styles["filter-button--active"] : ""
            }`}
            onClick={() => {
              trackEvent("map_ui_interaction", "open_challenges_modal");
              toggleChallengesModal();
            }}
            disabled={isFilterApplying}
          >
            <Trophy
              size={18}
              color={activeFilter.type === "list-detail" ? "rgb(0, 0, 0)" : "rgb(0, 0, 0)"}
            />
            <span className="typography-button-medium">
              {t("peakLists.challenges")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MapHeader);
