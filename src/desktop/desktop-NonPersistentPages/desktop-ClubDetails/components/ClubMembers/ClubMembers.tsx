import React, { useState } from "react";
import { Users, Trophy, SlidersHorizontal } from "lucide-react";
import { useI18n } from "../../../../../shared/context/I18nContext";
import { MemberSkeleton } from "../../skeletons";
import AppModal from "../../../../../shared/components/AppModal";
import styles from "./ClubMembers.module.css";
import {
  isMembersSortMode,
  type MembersFilterState,
  type MembersSortMode,
  type DatePreset,
  type ClubPeriodSummaryCategory,
} from "../../types";

interface ClubMembersProps {
  filter: MembersFilterState;
  onFilterChange: (filter: MembersFilterState) => void;
  onApplyPreset: (preset: DatePreset) => void;
  rows: any[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  onUserClick: (userId: number) => void;
  observerRef: React.RefObject<HTMLDivElement | null>;
  getMetricLabel: (mode: MembersSortMode) => string;
  getMetricValue: (mode: MembersSortMode, row: any) => string;
  sortOptions: { id: string; name: string }[];
  periodOptions: { id: string; name: string }[];
  categoryOptions: ClubPeriodSummaryCategory[];
  primaryMetric: MembersSortMode;
  secondaryMetric: MembersSortMode;
  tertiaryMetric: MembersSortMode;
}

const ClubMembers: React.FC<ClubMembersProps> = ({
  filter,
  onFilterChange,
  onApplyPreset,
  rows,
  isLoading,
  isFetchingNextPage,
  onUserClick,
  observerRef,
  getMetricLabel,
  getMetricValue,
  sortOptions,
  periodOptions,
  categoryOptions,
  primaryMetric,
  secondaryMetric,
  tertiaryMetric,
}) => {
  const { t } = useI18n();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [tempFilter, setTempFilter] = useState<MembersFilterState>(filter);

  const handleOpenModal = () => {
    setTempFilter({ ...filter });
    setIsFilterModalOpen(true);
  };

  const handleApply = () => {
    onFilterChange(tempFilter);
    if (tempFilter.preset !== "custom") {
      onApplyPreset(tempFilter.preset);
    }
    setIsFilterModalOpen(false);
  };

  const handleCancel = () => {
    setIsFilterModalOpen(false);
  };

  return (
    <div className={styles["club-members"]}>
      <div className={styles["club-members__page-header"]}>
        <h3 className={`${styles["club-members__title"]} typography-desktop-title-medium`}>
          {t("clubs.tabs.members") || "Members"}
        </h3>
        <button
          type="button"
          className={`${styles["club-members__filter-btn"]} typography-desktop-button-small`}
          onClick={handleOpenModal}
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
        <div className={styles["club-members__modal"]}>
          <div className={styles["club-members__modal-header"]}>
            <h3 className="typography-desktop-title-medium">{t("common.filters") || "Filters"}</h3>
          </div>
          <div className={styles["club-members__modal-body"]}>
            <label className={`${styles["club-members__filter-label"]} typography-desktop-label-medium`}>
              {t("clubs.filters.period") || "Period"}
            </label>
            <div className={styles["club-members__preset-grid"]}>
              {periodOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles["club-members__preset-btn"]} ${
                    tempFilter.preset === opt.id ? styles["club-members__preset-btn--active"] : ""
                  } typography-desktop-button-small`}
                  onClick={() => setTempFilter({ ...tempFilter, preset: opt.id as DatePreset })}
                >
                  {opt.name}
                </button>
              ))}
            </div>

            {tempFilter.preset === "custom" ? (
              <div className={styles["club-members__date-inputs"]}>
                <input
                  type="date"
                  className={`${styles["club-members__date-input"]} typography-desktop-body-small`}
                  value={tempFilter.dateFrom ?? ""}
                  onChange={(e) => setTempFilter({ ...tempFilter, dateFrom: e.target.value || null })}
                />
                <input
                  type="date"
                  className={`${styles["club-members__date-input"]} typography-desktop-body-small`}
                  value={tempFilter.dateTo ?? ""}
                  onChange={(e) => setTempFilter({ ...tempFilter, dateTo: e.target.value || null })}
                />
              </div>
            ) : null}

            <label className={`${styles["club-members__filter-label"]} typography-desktop-label-medium`}>
              {t("clubs.filters.sort") || "Sort by"}
            </label>
            <div className={styles["club-members__preset-grid"]}>
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`${styles["club-members__preset-btn"]} ${
                    tempFilter.sortMode === opt.id ? styles["club-members__preset-btn--active"] : ""
                  } typography-desktop-button-small`}
                  onClick={() => {
                    if (isMembersSortMode(opt.id)) {
                      setTempFilter({ ...tempFilter, sortMode: opt.id as MembersSortMode });
                    }
                  }}
                >
                  {opt.name}
                </button>
              ))}
            </div>

            {categoryOptions?.length > 0 ? (
              <>
                <label className={`${styles["club-members__filter-label"]} typography-desktop-label-medium`}>
                  {t("clubs.filters.activity") || "Activity"}
                </label>
                <div className={styles["club-members__preset-grid"]}>
                  <button
                    type="button"
                    className={`${styles["club-members__preset-btn"]} ${
                      !tempFilter.categoryId ? styles["club-members__preset-btn--active"] : ""
                    } typography-desktop-button-small`}
                    onClick={() => setTempFilter({ ...tempFilter, categoryId: null })}
                  >
                    {t("clubs.filters.allCategories") || "All categories"}
                  </button>
                  {categoryOptions.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`${styles["club-members__preset-btn"]} ${
                        tempFilter.categoryId === cat.id ? styles["club-members__preset-btn--active"] : ""
                      } typography-desktop-button-small`}
                      onClick={() => setTempFilter({ ...tempFilter, categoryId: cat.id })}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            <label className={`${styles["club-members__filter-label"]} typography-desktop-label-medium`}>
              {t("clubs.filters.routes") || "Routes"}
            </label>
            <div className={styles["club-members__preset-grid"]}>
              <button
                type="button"
                className={`${styles["club-members__preset-btn"]} ${
                  !tempFilter.onlyWithPeaks ? styles["club-members__preset-btn--active"] : ""
                } typography-desktop-button-small`}
                onClick={() => setTempFilter({ ...tempFilter, onlyWithPeaks: false })}
              >
                {t("clubs.activity.allRoutes") || "All routes"}
              </button>
              <button
                type="button"
                className={`${styles["club-members__preset-btn"]} ${
                  tempFilter.onlyWithPeaks ? styles["club-members__preset-btn--active"] : ""
                } typography-desktop-button-small`}
                onClick={() => setTempFilter({ ...tempFilter, onlyWithPeaks: true })}
              >
                {t("clubs.activity.withPeaks") || "With peaks"}
              </button>
            </div>
          </div>
          <div className={styles["club-members__modal-footer"]}>
            <button
              type="button"
              className={`${styles["club-members__modal-cancel"]} typography-desktop-button-small`}
              onClick={handleCancel}
            >
              {t("common.cancel") || "Cancel"}
            </button>
            <button
              type="button"
              className={`${styles["club-members__modal-apply"]} typography-desktop-button-small`}
              onClick={handleApply}
            >
              {t("common.apply") || "Apply"}
            </button>
          </div>
        </div>
      </AppModal>

      <div className={styles["club-members__table-container"]}>
        <div className={`${styles["club-members__table-header"]} typography-desktop-label-medium`}>
          <div className={styles["club-members__header-cell--rank"]}>#</div>
          <div className={styles["club-members__header-cell--user"]}>
            {t("leaderboard.user") || "User"}
          </div>
          <div className={styles["club-members__header-cell--metric"]}>
            {getMetricLabel(primaryMetric)}
          </div>
          <div className={styles["club-members__header-cell--metric"]}>
            {getMetricLabel(secondaryMetric)}
          </div>
          <div className={styles["club-members__header-cell--metric"]}>
            {getMetricLabel(tertiaryMetric)}
          </div>
        </div>

        <div className={styles["club-members__body"]}>
          {isLoading ? (
            <div className={styles["club-members__skeleton-container"]}>
              <MemberSkeleton />
              <MemberSkeleton />
              <MemberSkeleton />
              <MemberSkeleton />
              <MemberSkeleton />
            </div>
          ) : rows.length === 0 ? (
            <div className={styles["club-members__empty"]}>
              <Users size={26} />
              <p className="typography-desktop-body-small">
                {t("clubs.members.empty") || "No members found for this period."}
              </p>
            </div>
          ) : (
            rows.map((member, index) => {
              const rank = index + 1;
              let rankClass = "";
              if (rank === 1) rankClass = styles["club-members__rank--top-1"] || "";
              else if (rank === 2) rankClass = styles["club-members__rank--top-2"] || "";
              else if (rank === 3) rankClass = styles["club-members__rank--top-3"] || "";

              return (
                <button
                  type="button"
                  key={member.user_id}
                  className={styles["club-members__row"]}
                  onClick={() => onUserClick(member.user_id)}
                >
                  <div className={styles["club-members__cell--rank"]}>
                    <div className={`${styles["club-members__rank-badge"]} ${rankClass}`}>
                      {rank <= 3 ? <Trophy size={16} /> : rank}
                    </div>
                  </div>

                  <div className={styles["club-members__cell--user"]}>
                    {member.user_image ? (
                      <img
                        src={member.user_image}
                        alt={member.user_name}
                        className={styles["club-members__avatar"]}
                      />
                    ) : (
                      <div className={styles["club-members__avatar-fallback"]}>
                        {member.user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`${styles["club-members__name"]} typography-desktop-label-large`}>
                      {member.user_name}
                    </span>
                  </div>

                  <div className={`${styles["club-members__cell--metric"]} ${styles["club-members__cell--primary"]} typography-desktop-body-medium`}>
                    {getMetricValue(primaryMetric, member)}
                  </div>

                  <div className={`${styles["club-members__cell--metric"]} typography-desktop-body-medium`}>
                    {getMetricValue(secondaryMetric, member)}
                  </div>

                  <div className={`${styles["club-members__cell--metric"]} typography-desktop-body-medium`}>
                    {getMetricValue(tertiaryMetric, member)}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {(isFetchingNextPage) && (
        <div className={styles["club-members__skeleton-container"]}>
          <MemberSkeleton />
          <MemberSkeleton />
        </div>
      )}
      <div ref={observerRef} style={{ height: 20 }} />
    </div>
  );
};

export default ClubMembers;
