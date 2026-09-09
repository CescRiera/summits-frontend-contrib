import React, { useState, useEffect, useCallback } from "react";
import Slider from "@mui/material/Slider";
import type { ManualPeakFilters } from "../../../../shared/hooks/useManualPeakSelection";
import { getCountries, getAdminChildren } from "../../../../shared/api/endpoints/peakLists";
import type { AdminArea } from "../../../../shared/api/types/common";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import CustomDropdown from "../../../../mobile/components/CustomDropdown/CustomDropdown";
import styles from "./desktop-PeakFilters.module.css";

interface AdminLevel {
  options: AdminArea[];
  selectedId: number | null;
  loading: boolean;
  selectedName: string | null;
}

interface DesktopPeakFiltersProps {
  filters: ManualPeakFilters;
  onFilterChange: (
    key: keyof ManualPeakFilters,
    value: string | number | null | string[] | number[],
  ) => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

/**
 * Desktop filter panel - integrated into sidebar
 * Matches mobile version's logic and capabilities with cascading hierarchy
 */
export const DesktopPeakFilters: React.FC<DesktopPeakFiltersProps> = ({
  filters,
  onFilterChange,
  t,
}) => {
  const { formatMeters } = useUnitFormat();
  const [adminLevels, setAdminLevels] = useState<AdminLevel[]>([
    { options: [], selectedId: null, loading: true, selectedName: null },
  ]);
  const [pendingRange, setPendingRange] = useState<[number, number]>([
    filters.min_elevation ?? 0,
    filters.max_elevation ?? 8849,
  ]);

  // Sync pending range with filters prop
  useEffect(() => {
    setPendingRange([
      filters.min_elevation ?? 0,
      filters.max_elevation ?? 8849,
    ]);
  }, [filters.min_elevation, filters.max_elevation]);

  // Load countries on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getCountries();
        if (cancelled) return;
        setAdminLevels([
          { options: data, selectedId: null, loading: false, selectedName: null },
        ]);
      } catch (err) {
        console.error("Failed to load countries:", err);
        if (!cancelled) {
          setAdminLevels([
            { options: [], selectedId: null, loading: false, selectedName: null },
          ]);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleAdminLevelChange = useCallback(
    (levelIndex: number, osmId: number | null) => {
      setAdminLevels((prev) => {
        const updated = prev.slice(0, levelIndex + 1).map((level, i) => {
          if (i === levelIndex) {
            const selectedOption = osmId
              ? level.options.find((o) => o.osm_id === osmId) || null
              : null;
            return {
              ...level,
              selectedId: osmId,
              selectedName: selectedOption ? selectedOption.name : null,
            };
          }
          return { ...level };
        });

        if (osmId !== null) {
          updated.push({
            options: [],
            selectedId: null,
            loading: true,
            selectedName: null,
          });
        }

        return updated;
      });

      if (osmId !== null) {
        onFilterChange("admin_osm_ids", [osmId]);

        const loadChildren = async () => {
          try {
            const children = await getAdminChildren(osmId);
            setAdminLevels((prev) => {
              const childLevelIndex = levelIndex + 1;
              if (childLevelIndex >= prev.length) return prev;
              if (children.length === 0) {
                return prev.slice(0, childLevelIndex);
              }
              const updated = [...prev];
              updated[childLevelIndex] = {
                options: children,
                selectedId: null,
                loading: false,
                selectedName: null,
              };
              return updated;
            });
          } catch (error) {
            console.error("Failed to load admin children:", error);
            setAdminLevels((prev) => prev.slice(0, levelIndex + 1));
          }
        };
        loadChildren();
      } else {
        setAdminLevels((prev) => {
          const deepestSelected = prev
            .slice(0, levelIndex)
            .reverse()
            .find((l) => l.selectedId !== null);
          const newOsmIds = deepestSelected?.selectedId
            ? [deepestSelected.selectedId]
            : [];
          onFilterChange("admin_osm_ids", newOsmIds);
          return prev;
        });
      }
    },
    [onFilterChange]
  );

  const handleSliderChange = (_: Event, value: number | number[]) => {
    if (Array.isArray(value)) {
      setPendingRange([value[0] as number, value[1] as number]);
    }
  };

  const handleSliderChangeCommitted = (_: Event | React.SyntheticEvent, value: number | number[]) => {
    if (Array.isArray(value)) {
      onFilterChange("min_elevation", value[0] as number);
      onFilterChange("max_elevation", value[1] as number);
    }
  };

  return (
    <div className={styles["desktop-peak-filters"]}>
      {/* Search */}
      <div className={styles["desktop-peak-filters__group"]}>
        <input
          type="text"
          className={`${styles["desktop-peak-filters__input"]} typography-body-small`}
          placeholder={t("addManualPeaks.searchPlaceholder")}
          value={filters.query}
          onChange={(e) => onFilterChange("query", e.target.value)}
          minLength={2}
        />
      </div>

      {/* Elevation Range Slider */}
      <div className={styles["desktop-peak-filters__group"]}>
        <div className={styles["desktop-peak-filters__elevation-header"]}>
          <div className={`${styles["desktop-peak-filters__elevation-values"]} typography-desktop-label-small`}>
            {formatMeters(pendingRange[0])} — {formatMeters(pendingRange[1])}
          </div>
        </div>
        <div style={{ padding: "0 8px", marginTop: "4px" }}>
          <Slider
            value={pendingRange}
            min={0}
            max={8849}
            onChange={handleSliderChange}
            onChangeCommitted={handleSliderChangeCommitted}
            valueLabelDisplay="off"
            size="small"
            sx={{
              color: "#2d2d2d",
              height: 4,
              "& .MuiSlider-thumb": {
                width: 16,
                height: 16,
                backgroundColor: "rgb(255, 255, 255)",
                border: "2px solid currentColor",
                "&:hover": {
                  boxShadow: "0 0 0 8px rgba(0, 0, 0, 0.04)",
                },
              },
              "& .MuiSlider-rail": {
                opacity: 0.3,
                backgroundColor: "var(--color-text-disabled)",
              },
            }}
          />
        </div>
      </div>

      {/* Cascading Admin Level Selects */}
      <div className={styles["desktop-peak-filters__admin-column"]}>
        {adminLevels.map((level, index) => {
          if (level.loading) {
            return (
              <div key={`level-${index}`} className={styles["desktop-peak-filters__group"]}>
                  <CustomDropdown
                    options={[]}
                    value={null}
                    onChange={() => {}}
                    placeholder="..."
                    disabled={true}
                  />
              </div>
            );
          }
          if (level.options.length === 0) return null;
          const placeholder = index === 0 ? t("addManualPeaks.allCountries") : t("addManualPeaks.allRegions");
          return (
            <div key={`level-${index}`} className={styles["desktop-peak-filters__group"]}>
              <CustomDropdown
                options={level.options.map(area => ({ id: area.osm_id, name: area.name }))}
                value={level.selectedId}
                onChange={(val) => handleAdminLevelChange(index, val ? Number(val) : null)}
                placeholder={placeholder}
                searchPlaceholder={t("addManualPeaks.searchPlaceholder")}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
