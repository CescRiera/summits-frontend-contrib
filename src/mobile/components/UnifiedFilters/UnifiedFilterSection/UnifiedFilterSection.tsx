import React, { useCallback, useState, useEffect } from "react";
import Slider from "@mui/material/Slider";
import SingleDatePicker from "../../../NonPersistentPages/UserPeaks/SingleDatePicker";
import type { AdminArea } from "../../../../shared/api/types/common";
import styles from "./UnifiedFilterSection.module.css";

export type UnifiedFilterOption = {
  value: string;
  label: string;
};

type BaseFilters = {
  startDate: string | null;
  endDate: string | null;
  admin_osm_ids?: number[];
  elevationRange?: [number, number];
};

export type AdminLevel = {
  options: AdminArea[];
  selectedId: number | null;
  loading: boolean;
};

type UnifiedFilterSectionProps = {
  scope: "userPeaks" | "userSavedPeaks" | "userRoutes" | "userSavedShelters";
  t: (key: string, params?: Record<string, unknown>) => string;
  localFilters: BaseFilters;
  onUpdateFilters: (filters: Partial<BaseFilters>) => void;
  adminLevels: AdminLevel[];
  onAdminLevelChange: (index: number, id: number | null) => void;
  includeElevation?: boolean;
};

const UnifiedFilterSection: React.FC<UnifiedFilterSectionProps> = ({
  scope,
  t,
  localFilters,
  onUpdateFilters,
  adminLevels,
  onAdminLevelChange,
  includeElevation = true,
}) => {
  const startDateLabel = t(`${scope}.startDate`);
  const endDateLabel = t(`${scope}.endDate`);
  const dateRangeLabel = t(`${scope}.dateRange`);
  const elevationRangeLabel = t(`${scope}.elevationRange`);
  
  const [tempRange, setTempRange] = useState<[number, number]>(
    localFilters.elevationRange ?? [0, 8849]
  );

  // Sync with prop when it changes (e.g. on Clear/Reset)
  useEffect(() => {
    setTempRange(localFilters.elevationRange ?? [0, 8849]);
  }, [localFilters.elevationRange]);

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
  );  const handleAdminChange = useCallback(
    (index: number, e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      onAdminLevelChange(index, val ? Number(val) : null);
    },
    [onAdminLevelChange]
  );

   const handleElevationChange = useCallback(
    (_event: Event, value: number | number[]) => {
      setTempRange(value as [number, number]);
    },
    []
  );

  const handleElevationCommitted = useCallback(
    (_event: React.SyntheticEvent | Event, newValue: number | number[]) => {
      const range = newValue as [number, number];
      onUpdateFilters({ elevationRange: range });
    },
    [onUpdateFilters]
  );

  return (
    <div className={styles["filters"]}>
      <div className={styles["filters__section"]}>
        <label
          className={`${styles["filters__label"]} typography-label-medium`}
        >
          {dateRangeLabel}
        </label>
        <div className={styles["filters__dateRange"]}>
          <SingleDatePicker
            buttonLabel={startDateLabel}
            initialDate={localFilters.startDate}
            isActive={!!localFilters.startDate}
            onDateChange={handleStartDateChange}
          />
          <SingleDatePicker
            buttonLabel={endDateLabel}
            initialDate={localFilters.endDate}
            isActive={!!localFilters.endDate}
            onDateChange={handleEndDateChange}
          />
        </div>
      </div>

      {includeElevation && (
        <div className={styles["filters__section"]}>
          <label
            className={`${styles["filters__label"]} typography-label-medium`}
          >
            {elevationRangeLabel}
          </label>
          <div className={styles["filters__elevation"]}>
            <div
              className={`${styles["filters__elevationLabels"]} typography-label-medium`}
            >
              <span
                className={`${styles["filters__elevationLabel"]} typography-label-medium`}
              >
                {tempRange[0]}m
              </span>
              <span
                className={`${styles["filters__elevationLabel"]} typography-label-medium`}
              >
                {tempRange[1]}m
              </span>
            </div>
            <Slider
              value={tempRange}
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
        {adminLevels.map((level, index) => {
          if (level.loading) {
            return (
              <div key={`level-${index}`} className={styles["filters__field"]}>
                <label className={`${styles["filters__label"]} typography-label-medium`}>
                  {index === 0 ? t(`${scope}.country`) : t(`${scope}.region`)}
                </label>
                <select className={styles["filters__select"]} disabled>
                  <option value="">...</option>
                </select>
              </div>
            );
          }
          if (level.options.length === 0 && index > 0) return null;
          const placeholder = index === 0 ? t("common.allCountries") : t("common.allRegions");
          return (
            <div key={`level-${index}`} className={styles["filters__field"]}>
              <label className={`${styles["filters__label"]} typography-label-medium`}>
                {index === 0 ? t(`${scope}.country`) : t(`${scope}.region`)}
              </label>
              <select
                className={`${styles["filters__select"]} ${
                  level.selectedId ? styles["filters__select--selected"] : ""
                }`}
                value={level.selectedId ?? ""}
                onChange={(e) => handleAdminChange(index, e)}
              >
                <option value="" className="typography-body-medium">
                  {placeholder}
                </option>
                {level.options.map((area) => (
                  <option key={area.osm_id} value={area.osm_id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(UnifiedFilterSection);
