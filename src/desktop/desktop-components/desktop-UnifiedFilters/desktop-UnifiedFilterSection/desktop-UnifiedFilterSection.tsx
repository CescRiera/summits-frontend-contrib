import React, { useCallback, useState, useEffect, useRef } from "react";
import Slider from "@mui/material/Slider";
import SimpleCalendar from "../desktop-SimpleCalendar/desktop-SimpleCalendar.tsx";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import styles from "./desktop-UnifiedFilterSection.module.css";

export type UnifiedFilterOption = {
  value: string;
  label: string;
};

type BaseFilters = {
  startDate: string | null;
  endDate: string | null;
  selectedCountry?: string | null;
  selectedRegion?: string | null;
  elevationRange?: [number, number];
};

type UnifiedFilterSectionProps = {
  scope: "userPeaks" | "userSavedPeaks" | "userRoutes" | "userSavedShelters";
  t: (key: string, params?: Record<string, unknown>) => string;
  localFilters: BaseFilters;
  onUpdateFilters: (filters: Partial<BaseFilters>) => void;
  availableCountries: UnifiedFilterOption[];
  availableRegions: UnifiedFilterOption[];
  includeElevation?: boolean;
};

const UnifiedFilterSection: React.FC<UnifiedFilterSectionProps> = ({
  scope,
  t,
  localFilters,
  onUpdateFilters,
  availableCountries,
  availableRegions,
  includeElevation = true,
}) => {
  const { formatMeters } = useUnitFormat();
  const { trackEvent } = useAnalytics();
  const startDateLabel = t(`${scope}.startDate`);
  const endDateLabel = t(`${scope}.endDate`);
  const elevationRangeLabel = t(`${scope}.elevationRange`);
  const countryLabel = t(`${scope}.country`);
  const allCountriesLabel = t(`${scope}.allCountries`);
  const regionLabel = t(`${scope}.region`);
  const allRegionsLabel = t(`${scope}.allRegions`);

  const handleStartDateChange = useCallback(
    (startDate: string | null) => {
      if (startDate && localFilters.endDate) {
        const start = new Date(startDate);
        const end = new Date(localFilters.endDate);
        if (start > end) {
          onUpdateFilters({ startDate, endDate: null });
          return;
        }
      }
      onUpdateFilters({ startDate });
    },
    [localFilters.endDate, onUpdateFilters]
  );

  const handleEndDateChange = useCallback(
    (endDate: string | null) => {
      if (endDate && localFilters.startDate) {
        const start = new Date(localFilters.startDate);
        const end = new Date(endDate);
        if (end < start) {
          onUpdateFilters({ startDate: null, endDate });
          return;
        }
      }
      onUpdateFilters({ endDate });
    },
    [localFilters.startDate, onUpdateFilters]
  );

  const handleCountryChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const countryValue = e.target.value || null;
      trackEvent("filter_change", `${scope}_country_${countryValue || "all"}`);
      onUpdateFilters({
        selectedCountry: countryValue,
        selectedRegion: null,
      });
    },
    [onUpdateFilters, scope, trackEvent]
  );

  const handleRegionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const regionValue = e.target.value || null;
      trackEvent("filter_change", `${scope}_region_${regionValue || "all"}`);
      onUpdateFilters({ selectedRegion: regionValue });
    },
    [onUpdateFilters, scope, trackEvent]
  );

  const elevationRange = localFilters.elevationRange ?? [0, 8849];

  // Local state to control slider smoothly during drag
  const [pendingRange, setPendingRange] =
    useState<[number, number]>(elevationRange);

  // Use ref to track previous values to avoid infinite loops
  const prevRangeRef = useRef<[number, number]>(elevationRange);

  // Extract values to avoid dependency on array reference
  const elevationMin = localFilters.elevationRange?.[0] ?? 0;
  const elevationMax = localFilters.elevationRange?.[1] ?? 8849;

  // Keep local state in sync if parent changes the range externally
  useEffect(() => {
    const prevMin = prevRangeRef.current[0];
    const prevMax = prevRangeRef.current[1];

    // Only update if the actual values changed, not just the reference
    if (elevationMin !== prevMin || elevationMax !== prevMax) {
      setPendingRange([elevationMin, elevationMax]);
      prevRangeRef.current = [elevationMin, elevationMax];
    }
  }, [elevationMin, elevationMax]);

  const sanitizeRange = (value: number | number[]): [number, number] | null => {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const min = Math.max(0, Math.min(8849, Math.round(value[0] || 0)));
    const max = Math.max(min, Math.min(8849, Math.round(value[1] || 0)));
    return [min, max];
  };

  const handleElevationChange = useCallback(
    (_event: Event, value: number | number[]) => {
      const sanitized = sanitizeRange(value);
      if (!sanitized) return;
      setPendingRange(sanitized);
    },
    []
  );

  const handleElevationCommitted = useCallback(
    (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
      const sanitized = sanitizeRange(newValue);
      if (!sanitized) return;
      setPendingRange(sanitized);
      trackEvent("filter_change", `${scope}_elevation_${sanitized[0]}_${sanitized[1]}`);
      onUpdateFilters({ elevationRange: sanitized });
    },
    [onUpdateFilters, scope, trackEvent]
  );

  return (
    <div className={styles["filters"]}>
      <div className={styles["filters__section"]}>
        <SimpleCalendar
          startDate={localFilters.startDate}
          endDate={localFilters.endDate}
          startDateLabel={startDateLabel}
          endDateLabel={endDateLabel}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
        />
      </div>

      {includeElevation && (
        <div className={styles["filters__section"]}>
          <label
            className={`${styles["filters__label"]} typography-desktop-label-medium`}
          >
            {elevationRangeLabel}
          </label>
          <div className={styles["filters__elevation"]}>
            <div
              className={`${styles["filters__elevationLabels"]} typography-desktop-label-medium`}
            >
              <span
                className={`${styles["filters__elevationLabel"]} typography-desktop-label-medium`}
              >
                {formatMeters(pendingRange[0])}
              </span>
              <span
                className={`${styles["filters__elevationLabel"]} typography-desktop-label-medium`}
              >
                {formatMeters(pendingRange[1])}
              </span>
            </div>
            <Slider
              value={pendingRange}
              min={0}
              max={8849}
              step={50}
              onChange={handleElevationChange}
              onChangeCommitted={handleElevationCommitted}
              valueLabelDisplay="off"
              size="small"
              sx={{
                color: "#0a2540",
                height: 4,
                "& .MuiSlider-thumb": {
                  width: 16,
                  height: 16,
                  background: "#e6f0ff",
                  border: "2px solid #0a2540",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                },
                "& .MuiSlider-rail": {
                  height: 4,
                  background:
                    "linear-gradient(90deg, #cfe1ff 0%, #a8c8ff 100%)",
                  borderRadius: 2,
                },
                "& .MuiSlider-track": {
                  height: 4,
                  background:
                    "linear-gradient(90deg, #0a2540 0%, #0a2540 100%)",
                  borderRadius: 2,
                },
              }}
            />
          </div>
        </div>
      )}

      <div className={styles["filters__sectionInline"]}>
        <div className={styles["filters__field"]}>
          <label
            className={`${styles["filters__label"]} typography-desktop-label-medium`}
          >
            {countryLabel}
          </label>
          <select
            value={localFilters.selectedCountry || ""}
            onChange={handleCountryChange}
            className={styles["filters__select"]}
          >
            <option value="" className="typography-desktop-body-small">
              {allCountriesLabel}
            </option>
            {availableCountries.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles["filters__field"]}>
          <label
            className={`${styles["filters__label"]} typography-desktop-label-medium`}
          >
            {regionLabel}
          </label>
          <select
            value={localFilters.selectedRegion || ""}
            onChange={handleRegionChange}
            disabled={!localFilters.selectedCountry}
            className={styles["filters__select"]}
          >
            <option value="" className="typography-desktop-body-small">
              {allRegionsLabel}
            </option>
            {availableRegions.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default React.memo(UnifiedFilterSection);
