import React, { useState } from "react";
import { useI18n } from "../../../../../shared/context/I18nContext";
import { SlidersHorizontal } from "lucide-react";
import { formatStatInteger } from "../../../../../mobile/utils/numberFormatting";
import AppModal from "../../../../../shared/components/AppModal";
import styles from "./ClubOverview.module.css";
import type { OverviewPreset, ClubPeriodSummaryCategory } from "../../types";

interface ClubOverviewProps {
  overviewPreset: OverviewPreset;
  onPresetChange: (value: OverviewPreset) => void;
  dateFrom: string | null;
  dateTo: string | null;
  onDateChange: (from: string | null, to: string | null) => void;
  description: string;
  distinctPeaks: number;
  totalRoutes: number;
  totalDistance: number;
  totalElevationGain: number;
  totalMovingTime: number;
  totalAscents: number;
  formatStatDistance: (val: number) => string;
  formatStatElevationGain: (val: number) => string;
  formatDuration: (val: number) => string;
  onlyWithPeaks: boolean;
  onOnlyWithPeaksChange: (value: boolean) => void;
  categoryId: number | null;
  categoryOptions: ClubPeriodSummaryCategory[];
  onCategoryChange: (categoryId: number | null) => void;
}

const ClubOverview: React.FC<ClubOverviewProps> = ({
  overviewPreset,
  onPresetChange,
  dateFrom,
  dateTo,
  onDateChange,
  description,
  distinctPeaks,
  totalRoutes,
  totalDistance,
  totalElevationGain,
  totalMovingTime,
  totalAscents,
  formatStatDistance,
  formatStatElevationGain,
  formatDuration,
  onlyWithPeaks,
  onOnlyWithPeaksChange,
  categoryId,
  categoryOptions,
  onCategoryChange,
}) => {
  const { t } = useI18n();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempPreset, setTempPreset] = useState<OverviewPreset>(overviewPreset);
  const [tempDateFrom, setTempDateFrom] = useState<string | null>(dateFrom);
  const [tempDateTo, setTempDateTo] = useState<string | null>(dateTo);
  const [tempOnlyWithPeaks, setTempOnlyWithPeaks] = useState(onlyWithPeaks);
  const [tempCategoryId, setTempCategoryId] = useState<number | null>(categoryId);

  const overviewOptions = [
    { id: "this_year", name: t("clubs.period.thisYear") || "This year" },
    { id: "last_year", name: t("clubs.period.lastYear") || "Last year" },
    { id: "all_time", name: t("clubs.period.allTime") || "All time" },
    { id: "custom", name: t("clubs.period.custom") || "Custom" },
  ];

  const statsCells = [
    {
      label: t("clubs.metrics.distinctPeaks") || "Distinct peaks",
      value: formatStatInteger(distinctPeaks),
    },
    {
      label: t("clubs.metrics.totalAscents") || "Ascents",
      value: formatStatInteger(totalAscents),
    },
    {
      label: t("clubs.metrics.totalRoutes") || "Routes",
      value: formatStatInteger(totalRoutes),
    },
    {
      label: t("clubs.metrics.distance") || "Distance",
      value: formatStatDistance(totalDistance),
    },
    {
      label: t("clubs.metrics.totalElevationGain") || "Elevation gain",
      value: formatStatElevationGain(totalElevationGain),
    },
    {
      label: t("clubs.metrics.totalTime") || "Moving time",
      value: formatDuration(totalMovingTime),
    },
  ];

  const handleApply = () => {
    onPresetChange(tempPreset);
    onDateChange(tempDateFrom, tempDateTo);
    onOnlyWithPeaksChange(tempOnlyWithPeaks);
    onCategoryChange(tempCategoryId);
    setIsFilterModalOpen(false);
  };

  const handleCancel = () => {
    setIsFilterModalOpen(false);
  };

  return (
    <article className={styles["club-overview"]}>
      <div className={styles["club-overview__header"]}>
        <h2 className={`${styles["club-overview__title"]} typography-desktop-title-medium`}>
          {t("clubs.details.statistics") || "Statistics"}
        </h2>
        <button
          type="button"
          className={`${styles["club-overview__filter-btn"]} typography-desktop-button-small`}
          onClick={() => {
            setTempPreset(overviewPreset);
            setTempDateFrom(dateFrom);
            setTempDateTo(dateTo);
            setTempOnlyWithPeaks(onlyWithPeaks);
            setTempCategoryId(categoryId);
            setIsFilterModalOpen(true);
          }}
        >
          <SlidersHorizontal size={14} />
          {t("common.filters") || "Filters"}
        </button>
      </div>

      <AppModal
        open={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        variant="dialog"
      >
        <div className={styles["club-overview__modal"]}>
          <div className={styles["club-overview__modal-header"]}>
            <h3 className="typography-desktop-title-medium">{t("common.filters") || "Filters"}</h3>
          </div>
          <div className={styles["club-overview__modal-body"]}>
            <label className={`${styles["club-overview__filter-label"]} typography-desktop-label-medium`}>
              {t("clubs.filters.period") || "Period"}
            </label>
            <div className={styles["club-overview__preset-grid"]}>
              {overviewOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles["club-overview__preset-btn"]} ${
                    tempPreset === opt.id ? styles["club-overview__preset-btn--active"] : ""
                  } typography-desktop-button-small`}
                  onClick={() => setTempPreset(opt.id as OverviewPreset)}
                >
                  {opt.name}
                </button>
              ))}
            </div>

            {tempPreset === "custom" && (
              <div className={styles["club-overview__date-inputs"]}>
                <input
                  type="date"
                  value={tempDateFrom || ""}
                  onChange={(e) => setTempDateFrom(e.target.value || null)}
                  className={`${styles["club-overview__date-input"]} typography-body-medium`}
                />
                <input
                  type="date"
                  value={tempDateTo || ""}
                  onChange={(e) => setTempDateTo(e.target.value || null)}
                  className={`${styles["club-overview__date-input"]} typography-body-medium`}
                />
              </div>
            )}

            {categoryOptions?.length > 0 ? (
              <>
                <label className={`${styles["club-overview__filter-label"]} typography-desktop-label-medium`}>
                  {t("clubs.filters.activity") || "Activity"}
                </label>
                <div className={styles["club-overview__preset-grid"]}>
                  <button
                    type="button"
                    className={`${styles["club-overview__preset-btn"]} ${
                      !tempCategoryId ? styles["club-overview__preset-btn--active"] : ""
                    } typography-desktop-button-small`}
                    onClick={() => setTempCategoryId(null)}
                  >
                    {t("clubs.filters.allCategories") || "All categories"}
                  </button>
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`${styles["club-overview__preset-btn"]} ${
                        tempCategoryId === cat.id ? styles["club-overview__preset-btn--active"] : ""
                      } typography-desktop-button-small`}
                      onClick={() => setTempCategoryId(cat.id)}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            <label className={`${styles["club-overview__filter-label"]} typography-desktop-label-medium`}>
              {t("clubs.filters.routes") || "Routes"}
            </label>
            <div className={styles["club-overview__preset-grid"]}>
              <button
                type="button"
                className={`${styles["club-overview__preset-btn"]} ${
                  !tempOnlyWithPeaks ? styles["club-overview__preset-btn--active"] : ""
                } typography-desktop-button-small`}
                onClick={() => setTempOnlyWithPeaks(false)}
              >
                {t("clubs.activity.allRoutes") || "All routes"}
              </button>
              <button
                type="button"
                className={`${styles["club-overview__preset-btn"]} ${
                  tempOnlyWithPeaks ? styles["club-overview__preset-btn--active"] : ""
                } typography-desktop-button-small`}
                onClick={() => setTempOnlyWithPeaks(true)}
              >
                {t("clubs.activity.withPeaks") || "With peaks"}
              </button>
            </div>
          </div>
          <div className={styles["club-overview__modal-footer"]}>
            <button
              type="button"
              className={`${styles["club-overview__modal-cancel"]} typography-desktop-button-small`}
              onClick={handleCancel}
            >
              {t("common.cancel") || "Cancel"}
            </button>
            <button
              type="button"
              className={`${styles["club-overview__modal-apply"]} typography-desktop-button-small`}
              onClick={handleApply}
            >
              {t("common.apply") || "Apply"}
            </button>
          </div>
        </div>
      </AppModal>

      {description && (
        <p className={`${styles["club-overview__description"]} typography-desktop-body-medium`}>
          {description}
        </p>
      )}

      <div className={styles["club-overview__stats-grid"]}>
        {statsCells.map((cell) => (
          <article key={cell.label} className={styles["club-overview__stat-cell"]}>
            <span className={`${styles["club-overview__stat-label"]} typography-desktop-label-medium`}>
              {cell.label}
            </span>
            <strong className={`${styles["club-overview__stat-value"]} typography-desktop-title-medium`}>
              {cell.value}
            </strong>
          </article>
        ))}
      </div>
    </article>
  );
};

export default ClubOverview;
