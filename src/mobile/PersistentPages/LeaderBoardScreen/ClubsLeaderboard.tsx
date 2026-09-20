import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Users,
  CalendarRange,
  X,
  Plus,
} from "lucide-react";

import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import LoginRequiredPopup from "../../components/LoginRequiredPopup/LoginRequiredPopup";
import {
  useClubsLeaderboard,
} from "../../../shared/hooks/clubs/useClubs";
import JoinClubsModal from "../Profile/components/JoinClubsModal";
import AppModal from "../../../shared/components/AppModal";
import SingleDatePicker from "../../NonPersistentPages/UserPeaks/SingleDatePicker";
import styles from "./ClubsLeaderboard.module.css";
import { flattenClubPages } from "../../../shared/utils/clubResponse";
import { formatDurationCompact } from "../../../shared/utils/peakListFormatting";
import type { DurationUnitLabels } from "../../../shared/utils/peakListFormatting";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import { formatStatInteger } from "../../../mobile/utils/numberFormatting";
import type { ClubSummary, ClubsLeaderboardSortBy } from "../../../shared/api/types/clubs";

type DatePreset = "this_year" | "last_year" | "all_time" | "custom";

interface DateFilter {
  preset: DatePreset;
  dateFrom: string | null;
  dateTo: string | null;
}

const getPresetRange = (preset: DatePreset): { dateFrom: string | null; dateTo: string | null } => {
  const now = new Date();
  const today = new Date().toISOString().slice(0, 10);

  if (preset === "last_year") {
    const year = now.getFullYear() - 1;
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }

  if (preset === "all_time") {
    return { dateFrom: null, dateTo: null };
  }

  // default to this_year
  const year = now.getFullYear();
  return { dateFrom: `${year}-01-01`, dateTo: today };
};

const getDateFilterLabel = (
  filter: DateFilter,
  t: (key: string, variables?: Record<string, string | number>) => string
): string => {
  const year = new Date().getFullYear();
  if (filter.preset === "all_time") return t("clubs.period.allTime") || "Of all time";
  if (filter.preset === "last_year") return t("leaderboard.inPastYear", { year: year - 1 }) || `in ${year - 1} (past year)`;
  if (filter.preset === "custom") return t("clubs.period.custom") || "Custom";
  return t("leaderboard.inYear", { year }) || `in ${year}`;
};

// =================================================================
// CONSTANTS & TYPES
// =================================================================

const FALLBACK_CLUB_IMAGE = "/placeholder.svg";

interface Category {
  id: ClubsLeaderboardSortBy;
  primaryMetric: keyof ClubSummary;
  secondaryMetric: keyof ClubSummary;
}

interface ClubItemProps {
  club: ClubSummary;
  rank: number;
  primaryMetric: keyof ClubSummary;
  secondaryMetric: keyof ClubSummary;
  onClubClick: (clubId: number) => void;
}

// =================================================================
// UTILITY COMPONENTS
// =================================================================

const LoadingState = () => (
  <div className={styles["clubs-leaderboard__loading"]}>
    <div className={styles["clubs-leaderboard__spinner"]} />
  </div>
);

const ClubItemSkeleton = () => (
  <div className={styles["clubs-leaderboard__skeleton-item"]}>
    <div className={`${styles["clubs-leaderboard__skeleton"]} ${styles["clubs-leaderboard__skeleton-rank"]}`} />
    <div className={`${styles["clubs-leaderboard__skeleton"]} ${styles["clubs-leaderboard__skeleton-image"]}`} />
    <div className={styles["clubs-leaderboard__info"]}>
      <div className={`${styles["clubs-leaderboard__skeleton"]} ${styles["clubs-leaderboard__skeleton-name"]}`} />
      <div className={styles["clubs-leaderboard__stats-container"]}>
        <div className={`${styles["clubs-leaderboard__skeleton"]} ${styles["clubs-leaderboard__skeleton-stat"]}`} />
        <div className={`${styles["clubs-leaderboard__skeleton"]} ${styles["clubs-leaderboard__skeleton-stat"]}`} />
      </div>
    </div>
  </div>
);


const ClubItem: React.FC<ClubItemProps> = ({
  club,
  rank,
  primaryMetric,
  secondaryMetric,
  onClubClick,
}) => {
  const { t } = useI18n();
  const { formatStatDistance, formatStatElevationGain } = useUnitFormat();
  const handleClick = () => onClubClick(club.id);

  let rankClass = "";
  if (rank === 1) rankClass = styles["clubs-leaderboard__rank-badge--top-1"] || "";
  else if (rank === 2) rankClass = styles["clubs-leaderboard__rank-badge--top-2"] || "";
  else if (rank === 3) rankClass = styles["clubs-leaderboard__rank-badge--top-3"] || "";

  const timeLabels: DurationUnitLabels = useMemo(() => ({
    year: t("common.timeUnits.yearShort") || "y",
    day: t("common.timeUnits.dayShort") || "d",
    hour: t("common.timeUnits.hourShort") || "h",
    minute: t("common.timeUnits.minuteShort") || "m",
    second: t("common.timeUnits.secondShort") || "s",
  }), [t]);

  const renderValue = (key: keyof ClubSummary, value: any) => {
    if (typeof value === "number") {
      if (key === "total_moving_time") {
        return formatDurationCompact(value, timeLabels) || "-";
      }
      if (key === "total_distance_km") {
        return formatStatDistance(value);
      }
      if (key === "total_elevation_gain") {
        return formatStatElevationGain(value);
      }
      // For all other numeric metrics (member_count, distinct_peak_count, etc.)
      // we show the full value with digit grouping
      return formatStatInteger(value);
    }
    return value || "-";
  };

  return (
    <div className={styles["clubs-leaderboard__item"]} onClick={handleClick}>
      <div className={`${styles["clubs-leaderboard__rank-badge"]} ${rankClass} typography-title-medium`}>
        {rank <= 3 ? <Trophy size={14} /> : rank}
      </div>

      <img
        className={styles["clubs-leaderboard__image"]}
        src={club.image || FALLBACK_CLUB_IMAGE}
        alt={club.name}
        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_CLUB_IMAGE; }}
      />

      <div className={styles["clubs-leaderboard__info"]}>
        <div className={styles["clubs-leaderboard__name-container"]}>
          <span className={`${styles["clubs-leaderboard__name"]} typography-title-small`}>
            {club.name}
          </span>
        </div>
        
        <div className={styles["clubs-leaderboard__stats-container"]}>
          <span className={`${styles["clubs-leaderboard__stat-primary"]} typography-title-medium`}>
            {renderValue(primaryMetric, club[primaryMetric])}
          </span>
          <span className={`${styles["clubs-leaderboard__stat-secondary"]} typography-title-small`}>
            {renderValue(secondaryMetric, club[secondaryMetric])}
          </span>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

const ClubsLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();

  const [selectedCategoryId, setSelectedCategoryId] = useState<ClubsLeaderboardSortBy>("most_users");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const defaultDateRange = getPresetRange("this_year");
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    preset: "this_year",
    dateFrom: defaultDateRange.dateFrom,
    dateTo: defaultDateRange.dateTo,
  });
  const [dateFilterDraft, setDateFilterDraft] = useState<DateFilter>(dateFilter);

  const CLUB_CATEGORIES: Category[] = useMemo(() => [
    { 
      id: "most_users", 
      primaryMetric: "member_count",
      secondaryMetric: "distinct_peak_count"
    },
    { 
      id: "most_peaks", 
      primaryMetric: "distinct_peak_count",
      secondaryMetric: "member_count"
    },
    { 
      id: "most_distance", 
      primaryMetric: "total_distance_km",
      secondaryMetric: "member_count"
    },
    { 
      id: "most_elevation", 
      primaryMetric: "total_elevation_gain",
      secondaryMetric: "member_count"
    },
    { 
      id: "most_time", 
      primaryMetric: "total_moving_time",
      secondaryMetric: "member_count"
    },
  ], []);

  // Persistent totals to avoid flickering on filter change
  const [persistentTotals, setPersistentTotals] = useState({ count: 0, countries: 0 });

  const selectedCategory = useMemo(() => 
    CLUB_CATEGORIES.find(c => c.id === selectedCategoryId) || CLUB_CATEGORIES[0], 
  [selectedCategoryId, CLUB_CATEGORIES]) as Category;

  // Data Fetching
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
    refetch
  } = useClubsLeaderboard({
    sort_by: selectedCategoryId,
    limit: 20,
    date_from: dateFilter.dateFrom,
    date_to: dateFilter.dateTo,
  });

  const clubs = useMemo(
    () => flattenClubPages(data?.pages),
    [data?.pages]
  );

  // Sync persistent totals
  useEffect(() => {
    const firstPage = (data as any)?.pages?.[0];
    if (firstPage) {
      setPersistentTotals({
        count: firstPage.total_count ?? persistentTotals.count,
        countries: firstPage.total_countries ?? persistentTotals.countries
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries?.[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleClubClick = (clubId: number) => {
    trackEvent("club_click", `leaderboard_${clubId}`);
    navigate(`/clubs/${clubId}`);
  };

  const handleCategorySelect = (id: ClubsLeaderboardSortBy) => {
    trackEvent("interaction", `clubs_leaderboard_category_${id}`);
    setSelectedCategoryId(id);
  };

  const openDateFilterModal = () => {
    setDateFilterDraft(dateFilter);
    setIsDateFilterModalOpen(true);
  };

  const applyDateFilter = () => {
    setDateFilter(dateFilterDraft);
    setIsDateFilterModalOpen(false);
  };

  const setDraftPreset = (preset: DatePreset) => {
    const range = getPresetRange(preset);
    setDateFilterDraft({
      preset,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    });
  };

  const handleCreateClub = () => {
    if (user) {
      trackEvent("button_click", "clubs_leaderboard_create_club");
      navigate("/clubs/create");
    } else {
      trackEvent("interaction", "clubs_leaderboard_create_club_login_required");
      setIsLoginPopupOpen(true);
    }
  };

  return (
    <div className={styles["clubs-leaderboard"]}>
      <div className={styles["clubs-leaderboard__challenge-summary"]}>
        <div className={styles["clubs-leaderboard__total-peaks-row"]}>
          <div className={styles["clubs-leaderboard__total-peaks-item"]}>
             <span className={`${styles["clubs-leaderboard__total-peaks-label"]} typography-label-medium`}>
              {t("leaderboard.totalClubs") || "CLUBS"}
            </span>
            <span className={`${styles["clubs-leaderboard__total-peaks-number"]} typography-display-small`}>
              {persistentTotals.count || (data as any)?.pages?.[0]?.total_count || 0}
            </span>
           
          </div>

          <div className={styles["clubs-leaderboard__total-peaks-item"]}>
            <span className={`${styles["clubs-leaderboard__total-peaks-label"]} typography-label-medium`}>
              {t("leaderboard.totalCountries") || "COUNTRIES"}
            </span>
            <span className={`${styles["clubs-leaderboard__total-peaks-number"]} typography-display-small`}>
              {persistentTotals.countries || (data as any)?.pages?.[0]?.total_countries || 0}
            </span>
            
          </div>
        </div>
        
        <div className={styles["clubs-leaderboard__challenge-actions"]}>
          <button
            className={`${styles["clubs-leaderboard__action-btn"]} ${styles["clubs-leaderboard__action-btn--primary"]} typography-button-medium`}
            onClick={() => {
              trackEvent("button_click", "clubs_leaderboard_explore");
              setIsModalOpen(true);
            }}
          >
            {t("leaderboard.exploreClubs") || "Explore Clubs"}
          </button>
          <button
            className={`${styles["clubs-leaderboard__action-btn"]} ${styles["clubs-leaderboard__action-btn--secondary"]} typography-button-medium`}
            onClick={handleCreateClub}
          >
            <Plus size={16} style={{ marginRight: "8px" }} />{" "}
            {t("clubs.create.title") || "Create club"}
          </button>
        </div>
      </div>

       <div className={styles["clubs-leaderboard__filter-section"]}>
        <div className={styles["clubs-leaderboard__filter-header"]}>
          <label className={`${styles["clubs-leaderboard__filter-label"]} typography-title-medium`}>
            {t("leaderboard.clubsFilterPrefix") || "The clubs with..."}
          </label>
          <button
            type="button"
            className={`${styles["clubs-leaderboard__date-filter-btn"]} typography-button-small`}
            onClick={openDateFilterModal}
          >
            <CalendarRange size={14} />
            {getDateFilterLabel(dateFilter, t)}
          </button>
        </div>

        <div className={styles["clubs-leaderboard__filter-scroll"]}>
          {CLUB_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles["clubs-leaderboard__filter-btn"]} ${selectedCategoryId === cat.id ? styles["clubs-leaderboard__filter-btn--active"] : ""} typography-button-small`}
              onClick={() => handleCategorySelect(cat.id)}
            >
              {t(`leaderboard.clubsFilters.${cat.id}`) || cat.id.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      <div className={styles["clubs-leaderboard__content"]}>
        {status === ("loading" as any) || status === "pending" ? (
          <div className={styles["clubs-leaderboard__list"]}>
            <div className={`${styles["clubs-leaderboard__list-header"]} typography-label-medium uppercase`}>
              <div className={styles["clubs-leaderboard__header-rank"]}><strong>{t("leaderboard.rank")}</strong></div>
              <div className={styles["clubs-leaderboard__header-name"]}>{t("leaderboard.club")}</div>
              <div className={styles["clubs-leaderboard__header-metric"]}>{t(`leaderboard.metrics.${selectedCategory.primaryMetric}`)}</div>
              <div className={styles["clubs-leaderboard__header-secondary"]}>{t(`leaderboard.metrics.${selectedCategory.secondaryMetric}`)}</div>
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <ClubItemSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : error ? (
          <div className={styles["clubs-leaderboard__error-state"]}>
            <p className="typography-body-medium">{t("leaderboard.errorLoadingClubs") || "Failed to load clubs leaderboard."}</p>
            <button className={styles["clubs-leaderboard__retry-btn"]} onClick={() => refetch()}>
              {t("common.retry") || "Retry"}
            </button>
          </div>
        ) : clubs.length === 0 ? (
          <div className={styles["clubs-leaderboard__empty"]}>
             <Users size={48} strokeWidth={1} />
             <p className="typography-body-medium">{t("leaderboard.noClubsFound") || "No clubs found in this category."}</p>
          </div>
        ) : (
          <>
            <div className={`${styles["clubs-leaderboard__list-header"]} typography-label-medium uppercase`}>
              <div className={styles["clubs-leaderboard__header-rank"]}><strong>{t("leaderboard.rank")}</strong></div>
              <div className={styles["clubs-leaderboard__header-name"]}>{t("leaderboard.club") || "Club"}</div>
              <div className={styles["clubs-leaderboard__header-metric"]}>
                 {t(`leaderboard.metrics.${selectedCategory.primaryMetric}`) || selectedCategory.primaryMetric}
              </div>
              <div className={styles["clubs-leaderboard__header-secondary"]}>
                 {t(`leaderboard.metrics.${selectedCategory.secondaryMetric}`) || selectedCategory.secondaryMetric}
              </div>
            </div>

            <div className={styles["clubs-leaderboard__list"]}>
              {clubs.map((club, index) => (
                <ClubItem
                  key={club.id}
                  club={club}
                  rank={index + 1}
                  primaryMetric={selectedCategory.primaryMetric}
                  secondaryMetric={selectedCategory.secondaryMetric}
                  onClubClick={handleClubClick}
                />
              ))}
            </div>

            {hasNextPage && (
              <div ref={observerRef} className={styles["clubs-leaderboard__load-more"]}>
                <LoadingState />
              </div>
            )}
            {isFetchingNextPage && !hasNextPage && <LoadingState />}
          </>
        )}
      </div>

      <JoinClubsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <LoginRequiredPopup
        isOpen={isLoginPopupOpen}
        onClose={() => {
          trackEvent("interaction", "clubs_leaderboard_login_popup_close");
          setIsLoginPopupOpen(false);
        }}
        message="auth.loginRequired.createClub"
      />

      <AppModal
        open={isDateFilterModalOpen}
        onClose={() => setIsDateFilterModalOpen(false)}
        variant="dialog"
        contentClassName={styles["clubs-leaderboard__filter-modal"]}
        ariaLabel={t("common.filters") || "Filters"}
      >
        <div className={styles["clubs-leaderboard__filter-modal-header"]}>
          <h3 className="typography-title-medium">{t("common.filters") || "Filters"}</h3>
          <button
            type="button"
            className={styles["clubs-leaderboard__filter-modal-close"]}
            onClick={() => setIsDateFilterModalOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles["clubs-leaderboard__filter-modal-body"]}>
          <label className={`${styles["clubs-leaderboard__filter-label"]} typography-label-medium`}>
            {t("clubs.filters.period") || "Period"}
          </label>
          <div className={styles["clubs-leaderboard__preset-grid"]}>
            <button
              type="button"
              className={`${styles["clubs-leaderboard__preset-button"]} ${
                dateFilterDraft.preset === "this_year"
                  ? styles["clubs-leaderboard__preset-button--active"]
                  : ""
              } typography-button-small`}
              onClick={() => setDraftPreset("this_year")}
            >
              {t("clubs.period.thisYear") || `in ${new Date().getFullYear()}`}
            </button>
            <button
              type="button"
              className={`${styles["clubs-leaderboard__preset-button"]} ${
                dateFilterDraft.preset === "last_year"
                  ? styles["clubs-leaderboard__preset-button--active"]
                  : ""
              } typography-button-small`}
              onClick={() => setDraftPreset("last_year")}
            >
              {t("clubs.period.lastYear") || `in ${new Date().getFullYear() - 1} (past year)`}
            </button>
            <button
              type="button"
              className={`${styles["clubs-leaderboard__preset-button"]} ${
                dateFilterDraft.preset === "all_time"
                  ? styles["clubs-leaderboard__preset-button--active"]
                  : ""
              } typography-button-small`}
              onClick={() => setDraftPreset("all_time")}
            >
              {t("clubs.period.allTime") || "Of all time"}
            </button>
            <button
              type="button"
              className={`${styles["clubs-leaderboard__preset-button"]} ${
                dateFilterDraft.preset === "custom"
                  ? styles["clubs-leaderboard__preset-button--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setDateFilterDraft((prev) => ({ ...prev, preset: "custom" }))
              }
            >
              {t("clubs.period.custom") || "Custom"}
            </button>
          </div>

          {dateFilterDraft.preset === "custom" ? (
            <div className={styles["clubs-leaderboard__date-inputs"]}>
              <SingleDatePicker
                buttonLabel={t("clubs.period.dateFrom") || "From"}
                initialDate={dateFilterDraft.dateFrom || ""}
                isActive={!!dateFilterDraft.dateFrom}
                onDateChange={(date) =>
                  setDateFilterDraft((prev) => ({ ...prev, dateFrom: date || null }))
                }
              />
              <SingleDatePicker
                buttonLabel={t("clubs.period.dateTo") || "To"}
                initialDate={dateFilterDraft.dateTo || ""}
                isActive={!!dateFilterDraft.dateTo}
                onDateChange={(date) =>
                  setDateFilterDraft((prev) => ({ ...prev, dateTo: date || null }))
                }
              />
            </div>
          ) : null}

          <button
            type="button"
            className={`${styles["clubs-leaderboard__apply-button"]} typography-button-small`}
            onClick={applyDateFilter}
          >
            {t("common.apply") || "Apply"}
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default ClubsLeaderboard;
