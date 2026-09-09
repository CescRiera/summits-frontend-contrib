"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import Slider from "@mui/material/Slider";
import CustomDropdown from "../CustomDropdown/CustomDropdown";
import AppModal from "../../../shared/components/AppModal";
import { getAdminChildren } from "../../../shared/api/endpoints/peakLists";
import type { AdminLevel } from "../../context/ExploreContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useExplore } from "../../context/ExploreContext";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import styles from "./ExploreFiltersModal.module.css";

const SHELTER_TYPE_OPTIONS = ["alpine_hut", "wilderness_hut", "shelter"] as const;

const SHELTER_TYPE_COLORS: Record<string, string> = {
  alpine_hut: "#0C4A7B",
  wilderness_hut: "#2D6A4F",
  shelter: "#D92B2B",
};

const MODE_OPTIONS = [
  { id: "all" as const, name: "modeAll" },
  { id: "peaks" as const, name: "modePeaks" },
  { id: "shelters" as const, name: "modeShelters" },
];

interface ExploreFiltersModalProps {
  open: boolean;
  onClose: () => void;
}

const ExploreFiltersModal: React.FC<ExploreFiltersModalProps> = ({
  open,
  onClose,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { formatMeters } = useUnitFormat();
  const {
    exploreFilters,
    adminLevels,
    commitAdminSelection,
    handleExploreElevationChange,
    updateExploreFilter,
  } = useExplore();

  const [pendingRange, setPendingRange] = useState<[number, number]>([
    exploreFilters.min_elevation,
    exploreFilters.max_elevation,
  ]);
  const [pendingMode, setPendingMode] = useState<
    "all" | "peaks" | "shelters"
  >(exploreFilters.mode);
  const [pendingShelterTypes, setPendingShelterTypes] = useState<
    (typeof SHELTER_TYPE_OPTIONS)[number][]
  >(exploreFilters.shelter_types);
  const [pendingAdminLevels, setPendingAdminLevels] =
    useState<AdminLevel[]>(adminLevels);

  // Re-sync pending state from applied filters whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setPendingRange([
      exploreFilters.min_elevation,
      exploreFilters.max_elevation,
    ]);
    setPendingMode(exploreFilters.mode);
    setPendingShelterTypes(exploreFilters.shelter_types);
    setPendingAdminLevels(adminLevels);
  }, [
    open,
    exploreFilters.min_elevation,
    exploreFilters.max_elevation,
    exploreFilters.mode,
    exploreFilters.shelter_types,
    adminLevels,
  ]);

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

  const handleAdminLevelChange = useCallback(
    async (levelIndex: number, value: string | number | null) => {
      const id = value ? Number(value) : null;
      setPendingAdminLevels((prev) => {
        const updated = prev.slice(0, levelIndex + 1).map((level, i) => {
          if (i === levelIndex) {
            const selectedOption = id
              ? level.options.find((o) => o.osm_id === id) || null
              : null;
            return {
              ...level,
              selectedId: id,
              selectedName: selectedOption ? selectedOption.name : null,
            };
          }
          return { ...level };
        });
        if (id !== null) {
          updated.push({
            options: [],
            selectedId: null,
            loading: true,
            selectedName: null,
          });
        }
        return updated;
      });

      if (id !== null) {
        try {
          const children = await getAdminChildren(id);
          setPendingAdminLevels((prev) => {
            const childLevelIndex = levelIndex + 1;
            if (childLevelIndex >= prev.length) return prev;
            if (children.length === 0) return prev.slice(0, childLevelIndex);
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
          setPendingAdminLevels((prev) => prev.slice(0, levelIndex + 1));
        }
      }
    },
    []
  );

  const handleModeChange = useCallback((mode: "all" | "peaks" | "shelters") => {
    setPendingMode(mode);
  }, []);

  const handleShelterTypeToggle = useCallback(
    (type: (typeof SHELTER_TYPE_OPTIONS)[number] | null) => {
      setPendingShelterTypes((current) => {
        if (type === null) return [];
        return current.includes(type)
          ? current.filter((item) => item !== type)
          : [...current, type];
      });
    },
    []
  );

  const handleClearAll = useCallback(() => {
    setPendingRange([0, 8849]);
    setPendingMode("all");
    setPendingShelterTypes([]);
    void handleAdminLevelChange(0, null);
  }, [handleAdminLevelChange]);

  const handleApply = useCallback(() => {
    trackEvent("filter_change", "explore_filters_apply");
    handleExploreElevationChange(pendingRange[0], pendingRange[1]);
    updateExploreFilter("mode", pendingMode);
    updateExploreFilter("shelter_types", pendingShelterTypes);
    commitAdminSelection(pendingAdminLevels);
    onClose();
  }, [
    commitAdminSelection,
    handleExploreElevationChange,
    onClose,
    pendingAdminLevels,
    pendingMode,
    pendingRange,
    pendingShelterTypes,
    trackEvent,
    updateExploreFilter,
  ]);

  return (
    <AppModal
      open={open}
      onClose={onClose}
      variant="dialog"
      closeOnBackdrop
      closeOnEscape
      lockScroll
      ariaLabel={t("filters.filters")}
      contentClassName={styles["explore-filters-modal__content"]}
    >
      <div className={styles["explore-filters-modal__header"]}>
        <div className="typography-title-medium">{t("filters.filters")}</div>
        <button
          type="button"
          className={styles["explore-filters-modal__close"]}
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X size={18} />
        </button>
      </div>

      <div className={styles["explore-filters-modal__body"]}>
        {/* Location */}
        <div className={styles["explore-filters-modal__section"]}>
          <div className={styles["explore-filters-modal__section-title"]}>
            <span className="typography-body-medium">
              {t("filters.location")}
            </span>
          </div>
          <div className={styles["explore-filters-modal__cascade"]}>
            {pendingAdminLevels.map((level, index) => {
              if (level.loading) {
                return (
                  <div
                    key={`level-${index}`}
                    className={styles["explore-filters-modal__cascade-item"]}
                  >
                    <CustomDropdown
                      options={[]}
                      value={null}
                      onChange={() => undefined}
                      placeholder="..."
                      disabled={true}
                    />
                  </div>
                );
              }
              if (level.options.length === 0) return null;
              const placeholder =
                index === 0
                  ? t("common.allCountries")
                  : t("common.allRegions");
              const dropdownOptions = level.options.map((area) => {
                const nameEn = (area as { name_en?: string }).name_en;
                return {
                  id: area.osm_id,
                  name: area.name,
                  ...(nameEn ? { name_en: nameEn } : {}),
                };
              });
              return (
                <div
                  key={`level-${index}`}
                  className={styles["explore-filters-modal__cascade-item"]}
                >
                  <CustomDropdown
                    options={dropdownOptions}
                    value={level.selectedId}
                    onChange={(val) => handleAdminLevelChange(index, val)}
                    placeholder={placeholder}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Elevation */}
        <div className={styles["explore-filters-modal__section"]}>
          <div className={styles["explore-filters-modal__section-title"]}>
            <span className="typography-body-medium">
              {t("filters.altitude")}
            </span>
          </div>
          <div className={styles["explore-filters-modal__elevation-card"]}>
            <div className={styles["explore-filters-modal__elevation-values"]}>
              <span className="typography-label-medium">
                {formatMeters(pendingRange[0])}
              </span>
              <span className="typography-label-medium">
                {formatMeters(pendingRange[1])}
              </span>
            </div>
            <Slider
              value={pendingRange}
              min={0}
              max={8849}
              onChange={handleSliderChange}
              valueLabelDisplay="off"
              size="small"
              sx={{
                color: "#5f7440",
                height: 4,
                padding: "0px !important",
                margin: "8px 0 !important",
                width: "100%",
                "& .MuiSlider-thumb": {
                  width: 18,
                  height: 18,
                  background: "#5f7440",
                  border: "2px solid #ffffff",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
                },
                "& .MuiSlider-rail": {
                  height: 4,
                  background: "rgba(0, 0, 0, 0.08)",
                  borderRadius: 2,
                  width: "100% !important",
                },
                "& .MuiSlider-track": {
                  height: 4,
                  background: "#5f7440",
                  borderRadius: 2,
                },
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className={styles["explore-filters-modal__section"]}>
          <div className={styles["explore-filters-modal__section-title"]}>
            <span className="typography-body-medium">
              {t("filters.content")}
            </span>
          </div>
          <div className={styles["explore-filters-modal__chip-row"]}>
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles["explore-filters-modal__chip"]} typography-label-medium ${
                  pendingMode === option.id
                    ? styles["explore-filters-modal__chip--active"]
                    : ""
                }`}
                onClick={() => handleModeChange(option.id)}
              >
                {t(`filters.${option.name}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Shelter types */}
        <div className={styles["explore-filters-modal__section"]}>
          <div className={styles["explore-filters-modal__section-title"]}>
            <span className="typography-body-medium">
              {t("filters.shelterType")}
            </span>
          </div>
          <div className={styles["explore-filters-modal__chip-row"]}>
            <button
              type="button"
              className={`${styles["explore-filters-modal__chip"]} typography-label-medium ${
                pendingShelterTypes.length === 0
                  ? styles["explore-filters-modal__chip--active"]
                  : ""
              }`}
              onClick={() => handleShelterTypeToggle(null)}
            >
              {t("filters.all")}
            </button>
            {SHELTER_TYPE_OPTIONS.map((type) => {
              const isActive = pendingShelterTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  className={`${styles["explore-filters-modal__chip"]} typography-label-medium ${
                    isActive
                      ? styles["explore-filters-modal__chip--active"]
                      : ""
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: SHELTER_TYPE_COLORS[type],
                          borderColor: SHELTER_TYPE_COLORS[type],
                        }
                      : undefined
                  }
                  onClick={() => handleShelterTypeToggle(type)}
                >
                  {t(`shelterDetails.type.${type}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles["explore-filters-modal__footer"]}>
        <button
          type="button"
          className={`${styles["explore-filters-modal__clear"]} typography-title-small`}
          onClick={handleClearAll}
        >
          {t("filters.clear")}
        </button>
        <button
          type="button"
          className={`${styles["explore-filters-modal__apply"]} typography-title-small`}
          onClick={handleApply}
        >
          {t("common.apply")}
        </button>
      </div>
    </AppModal>
  );
};

export default React.memo(ExploreFiltersModal);