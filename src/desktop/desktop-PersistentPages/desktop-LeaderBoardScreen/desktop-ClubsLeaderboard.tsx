import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Users, CalendarRange, X, Plus } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import LoginRequiredPopup from "../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";

import {
  useClubsLeaderboard,
} from "../../../shared/hooks/clubs/useClubs";
import { flattenClubPages } from "../../../shared/utils/clubResponse";

import JoinClubsModal from "../desktop-Profile/desktop-components/desktop-JoinClubsModal";
import AppModal from "../../../shared/components/AppModal";
import SingleDatePicker from "../../../mobile/NonPersistentPages/UserPeaks/SingleDatePicker";
import { formatDurationCompact } from "../../../shared/utils/peakListFormatting";
import type { DurationUnitLabels } from "../../../shared/utils/peakListFormatting";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import { formatStatInteger } from "../../../mobile/utils/numberFormatting";
import type {
  ClubsLeaderboardSortBy,
} from "../../../shared/api/types/clubs";
import styles from "./desktop-ClubsLeaderboard.module.css";

type DatePreset = "this_year" | "last_year" | "all_time" | "custom";

interface DateFilter {
  preset: DatePreset;
  dateFrom: string | null;
  dateTo: string | null;
}

const getPresetRange = (preset: DatePreset): { dateFrom: string | null; dateTo: string | null } => {
  const now = new Date();

  if (preset === "last_year") {
    const year = now.getFullYear() - 1;
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }

  if (preset === "all_time") {
    return { dateFrom: null, dateTo: null };
  }

  // default to this_year
  const year = now.getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  return { dateFrom: `${year}-01-01`, dateTo: today };
};

const getDateFilterLabel = (filter: DateFilter, t: (key: string) => string): string => {
  if (filter.preset === "all_time") return t("clubs.period.allTime") || "Of all time";
  if (filter.preset === "last_year") {
    const year = new Date().getFullYear() - 1;
    return t("leaderboard.inPastYear")?.replace("{year}", String(year)) || `in ${year} (past year)`;
  }
  if (filter.preset === "custom") return t("clubs.period.custom") || "Custom";
  const year = new Date().getFullYear();
  return t("leaderboard.inYear")?.replace("{year}", String(year)) || `in ${year}`;
};

const FALLBACK_CLUB_IMAGE = "/placeholder.svg";

type MetricKey =
  | "member_count"
  | "distinct_peak_count"
  | "total_distance_km"
  | "total_elevation_gain"
  | "total_moving_time";

interface Category {
  id: ClubsLeaderboardSortBy;
  labelKey: string;
  fallbackLabel: string;
  primaryMetric: MetricKey;
  secondaryMetric: MetricKey;
}

const CLUB_CATEGORIES: Category[] = [
  {
    id: "most_users",
    labelKey: "leaderboard.clubsFilters.most_users",
    fallbackLabel: "Most members",
    primaryMetric: "member_count",
    secondaryMetric: "distinct_peak_count",
  },
  {
    id: "most_peaks",
    labelKey: "leaderboard.clubsFilters.most_peaks",
    fallbackLabel: "Most peaks",
    primaryMetric: "distinct_peak_count",
    secondaryMetric: "member_count",
  },
  {
    id: "most_distance",
    labelKey: "leaderboard.clubsFilters.most_distance",
    fallbackLabel: "Most distance",
    primaryMetric: "total_distance_km",
    secondaryMetric: "member_count",
  },
  {
    id: "most_elevation",
    labelKey: "leaderboard.clubsFilters.most_elevation",
    fallbackLabel: "Most elevation",
    primaryMetric: "total_elevation_gain",
    secondaryMetric: "member_count",
  },
  {
    id: "most_time",
    labelKey: "leaderboard.clubsFilters.most_time",
    fallbackLabel: "Most time",
    primaryMetric: "total_moving_time",
    secondaryMetric: "member_count",
  },
];



const TableRowSkeleton = () => (
  <div
    className={styles["clubs-leaderboard__skeleton-row"]}
    style={{ gridTemplateColumns: "80px 350px repeat(3, 1fr)" }}
  >
    <div className={styles["clubs-leaderboard__skeleton-rank"]} />
    <div className={styles["clubs-leaderboard__skeleton-club"]} />
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className={styles["clubs-leaderboard__skeleton-value"]} />
    ))}
  </div>
);

const DesktopClubsLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const { formatStatDistance, formatStatElevationGain } = useUnitFormat();

  const [selectedCategoryId, setSelectedCategoryId] =
    useState<ClubsLeaderboardSortBy>("most_users");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isDateFilterModalOpen, setIsDateFilterModalOpen] = useState(false);

  const defaultDateRange = getPresetRange("this_year");
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    preset: "this_year",
    dateFrom: defaultDateRange.dateFrom,
    dateTo: defaultDateRange.dateTo,
  });
  const [dateFilterDraft, setDateFilterDraft] = useState<DateFilter>(dateFilter);

  const [persistentTotals, setPersistentTotals] = useState({
    count: 0,
    countries: 0,
  });

  const selectedCategory = useMemo(
    () =>
      (CLUB_CATEGORIES.find((category) => category.id === selectedCategoryId) ??
      CLUB_CATEGORIES[0]) as Category,
    [selectedCategoryId]
  );

  const orderedMetrics = useMemo<MetricKey[]>(() => {
    const primary = selectedCategory.primaryMetric;
    const baseMetrics: MetricKey[] = [
      "member_count",
      "distinct_peak_count",
      "total_elevation_gain",
    ];
    
    // Always start with the primary, then add the rest of the base metrics
    // and take the first 3 results.
    const combined = [primary, ...baseMetrics.filter((m) => m !== primary)];
    return combined.slice(0, 3);
  }, [selectedCategory]);

  const gridColumns = "80px 350px repeat(3, 1fr)";

  const timeLabels: DurationUnitLabels = useMemo(
    () => ({
      year: t("common.timeUnits.yearShort") || "y",
      day: t("common.timeUnits.dayShort") || "d",
      hour: t("common.timeUnits.hourShort") || "h",
      minute: t("common.timeUnits.minuteShort") || "m",
      second: t("common.timeUnits.secondShort") || "s",
    }),
    [t]
  );

  const leaderboardQuery = useClubsLeaderboard({
    sort_by: selectedCategoryId,
    limit: 24,
    date_from: dateFilter.dateFrom,
    date_to: dateFilter.dateTo,
  });
  const clubs = useMemo(
    () => flattenClubPages(leaderboardQuery.data?.pages),
    [leaderboardQuery.data?.pages]
  );

  useEffect(() => {
    const firstPage = (leaderboardQuery.data as any)?.pages?.[0];
    if (!firstPage) return;
    setPersistentTotals((prev) => ({
      count: firstPage.total_count ?? prev.count,
      countries: firstPage.total_countries ?? prev.countries,
    }));
  }, [leaderboardQuery.data]);

  const handleOpenClub = (clubId: number) => {
    trackEvent("club_click", `desktop_clubs_leaderboard_${clubId}`);
    navigate(`/clubs/${clubId}`);
  };

  const handleCategorySelect = (id: ClubsLeaderboardSortBy) => {
    trackEvent("interaction", `desktop_clubs_leaderboard_select_${id}`);
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
      trackEvent("interaction", "desktop_clubs_leaderboard_create_club");
      navigate("/clubs/create");
    } else {
      trackEvent("interaction", "desktop_clubs_leaderboard_create_club_login_required");
      setIsLoginPopupOpen(true);
    }
  };

  const getMetricLabel = (metric: MetricKey) => {
    switch (metric) {
      case "member_count":
        return t("clubs.metrics.members") || "Members";
      case "distinct_peak_count":
        return t("clubs.metrics.distinctPeaks") || "Peaks";
      case "total_distance_km":
        return t("clubs.metrics.distance") || "Distance";
      case "total_elevation_gain":
        return t("clubs.metrics.totalElevationGain") || "Elevation";
      case "total_moving_time":
        return t("clubs.metrics.totalTime") || "Time";
      default:
        return metric;
    }
  };

  const formatMetricValue = (metric: MetricKey, value: unknown) => {
    if (typeof value !== "number") return "-";
    switch (metric) {
      case "total_moving_time":
        return formatDurationCompact(value, timeLabels) || "-";
      case "total_distance_km":
        return formatStatDistance(value);
      case "total_elevation_gain":
        return formatStatElevationGain(value);
      case "member_count":
      case "distinct_peak_count":
      default:
        return formatStatInteger(value);
    }
  };

  const isLoadingInitial =
    (leaderboardQuery.status === "pending" || leaderboardQuery.isLoading) &&
    clubs.length === 0;

  return (
    <div className={styles["clubs-leaderboard"]}>
      <header className={styles["clubs-leaderboard__header"]}>
        <div className={styles["clubs-leaderboard__header-left"]}>
          <div className={styles["clubs-leaderboard__title-row"]}>
            <h2 className={`${styles["clubs-leaderboard__filter-label"]} typography-desktop-title-medium`}>
              {t("leaderboard.clubsFilterPrefix") || "The clubs with..."}
            </h2>
            <button
              type="button"
              className={`${styles["clubs-leaderboard__date-filter-btn"]} typography-desktop-button-small`}
              onClick={openDateFilterModal}
            >
              <CalendarRange size={14} />
              {getDateFilterLabel(dateFilter, t)}
            </button>
          </div>
          <div className={styles["clubs-leaderboard__filter-list"]}>
            {CLUB_CATEGORIES.map((category) => {
              const isActive = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`${styles["clubs-leaderboard__filter-chip"]} ${
                    isActive ? styles["clubs-leaderboard__filter-chip--active"] : ""
                  } typography-desktop-button-small`}
                  onClick={() => handleCategorySelect(category.id)}
                >
                  {t(category.labelKey) || category.fallbackLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles["clubs-leaderboard__header-right"]}>
          <div className={styles["clubs-leaderboard__stats-grid"]}>
            <article className={styles["clubs-leaderboard__stat-item"]}>
              <span className={`${styles["clubs-leaderboard__stat-label"]} typography-desktop-label-large`}>
                {t("leaderboard.totalClubs") || "CLUBS"}
              </span>
              <strong className={`${styles["clubs-leaderboard__stat-value"]} typography-desktop-display-xl`}>
                {persistentTotals.count.toLocaleString()}
              </strong>
            </article>
            <article className={styles["clubs-leaderboard__stat-item"]}>
              <span className={`${styles["clubs-leaderboard__stat-label"]} typography-desktop-label-large`}>
                {t("leaderboard.totalCountries") || "COUNTRIES"}
              </span>
              <strong className={`${styles["clubs-leaderboard__stat-value"]} typography-desktop-display-xl`}>
                {persistentTotals.countries.toLocaleString()}
              </strong>
            </article>
          </div>
          <div className={styles["clubs-leaderboard__browse-actions"]}>
            <button
              type="button"
              className={`${styles["clubs-leaderboard__browse-button"]} typography-desktop-button-small`}
              onClick={() => {
                trackEvent("interaction", "desktop_clubs_leaderboard_open_browse_modal");
                setIsModalOpen(true);
              }}
            >
              {t("leaderboard.browseClubs") || "Browse clubs"}
            </button>
            <button
              type="button"
              className={`${styles["clubs-leaderboard__browse-button"]} ${styles["clubs-leaderboard__browse-button--secondary"]} typography-desktop-button-small`}
              onClick={handleCreateClub}
            >
              <Plus size={16} style={{ marginRight: "8px" }} />{" "}
              {t("clubs.create.title") || "Create club"}
            </button>
          </div>
        </div>
      </header>

      {leaderboardQuery.isError ? (
        <section className={styles["clubs-leaderboard__table"]}>
          <div className={styles["clubs-leaderboard__empty-state"]}>
            <p className="typography-desktop-body-medium">
              {t("leaderboard.errorLoadingClubs") ||
                "Failed to load clubs leaderboard."}
            </p>
            <button
              type="button"
              className={`${styles["clubs-leaderboard__button"]} ${styles["clubs-leaderboard__button--secondary"]} typography-desktop-button-small`}
              onClick={() => void leaderboardQuery.refetch()}
            >
              {t("common.retry") || "Retry"}
            </button>
          </div>
        </section>
      ) : null}

      {!leaderboardQuery.isError ? (
        <section className={styles["clubs-leaderboard__table"]}>
          <div
            className={`${styles["clubs-leaderboard__table-header"]} typography-desktop-label-small`}
            style={{ gridTemplateColumns: gridColumns }}
          >
            <span className={`${styles["clubs-leaderboard__header-rank"]} typography-desktop-label-small`}>
              {t("leaderboard.rank") || "Rank"}
            </span>
            <span className={`${styles["clubs-leaderboard__header-club"]} typography-desktop-label-small`}>
              {t("leaderboard.club") || "Club"}
            </span>
            {orderedMetrics.map((metric) => (
              <span
                key={metric}
                className={`${styles["clubs-leaderboard__header-metric"]} typography-desktop-label-small`}
              >
                {getMetricLabel(metric)}
              </span>
            ))}
          </div>

          <div className={styles["clubs-leaderboard__table-body"]}>
            {isLoadingInitial
              ? Array.from({ length: 8 }).map((_, index) => (
                  <TableRowSkeleton
                    key={`clubs-skeleton-${index}`}
                  />
                ))
              : null}

            {!isLoadingInitial && clubs.length === 0 ? (
              <div className={styles["clubs-leaderboard__empty-state"]}>
                <Users size={48} strokeWidth={1.25} />
                <p className="typography-desktop-body-medium">
                  {t("leaderboard.noClubsFound") ||
                    "No clubs found in this category."}
                </p>
              </div>
            ) : null}

            {!isLoadingInitial
              ? clubs.map((club, index) => {
                  const rank = index + 1;
                  const rankClass =
                    rank === 1
                      ? styles["clubs-leaderboard__rank-badge--top-1"]
                      : rank === 2
                      ? styles["clubs-leaderboard__rank-badge--top-2"]
                      : rank === 3
                      ? styles["clubs-leaderboard__rank-badge--top-3"]
                      : "";

                  return (
                    <article
                      key={club.id}
                      className={styles["clubs-leaderboard__row"]}
                      style={{ gridTemplateColumns: gridColumns }}
                      onClick={() => handleOpenClub(club.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        handleOpenClub(club.id);
                      }}
                    >
                      <div className={styles["clubs-leaderboard__rank-cell"]}>
                        <div
                          className={`${styles["clubs-leaderboard__rank-badge"]} ${rankClass} typography-desktop-title-small`}
                        >
                          {rank <= 3 ? <Trophy size={24} /> : rank}
                        </div>
                      </div>

                      <div className={styles["clubs-leaderboard__club-cell"]}>
                        <img
                          src={club.image || FALLBACK_CLUB_IMAGE}
                          alt={club.name}
                          className={styles["clubs-leaderboard__club-image"]}
                          onError={(event) => {
                            (event.target as HTMLImageElement).src = FALLBACK_CLUB_IMAGE;
                          }}
                        />

                        <div className={styles["clubs-leaderboard__club-copy"]}>
                          <strong
                            className={`${styles["clubs-leaderboard__club-name"]} typography-desktop-title-small`}
                          >
                            {club.name}
                          </strong>
                          <div className={styles["clubs-leaderboard__club-meta"]}>
                            <span
                              className={`${styles["clubs-leaderboard__visibility-badge"]} ${
                                club.visibility === "private"
                                  ? styles["clubs-leaderboard__visibility-badge--private"]
                                  : ""
                              } typography-desktop-label-small`}
                            >
                              {club.visibility === "private"
                                ? t("clubs.visibility.private") || "Private"
                                : t("clubs.visibility.public") || "Public"}
                            </span>
                            {club.admin_hierarchy ? (
                              <span
                                className={`${styles["clubs-leaderboard__location"]} typography-desktop-label-small`}
                              >
                                {getLocationFromHierarchy(club.admin_hierarchy)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {orderedMetrics.map((metric, idx) => (
                        <span
                          key={metric}
                          className={`${styles["clubs-leaderboard__metric-cell"]} ${
                            idx === 0
                              ? `${styles["clubs-leaderboard__metric-cell--active"]} typography-desktop-button-small`
                              : `${styles["clubs-leaderboard__metric-cell--secondary"]} typography-desktop-body-medium`
                          }`}
                        >
                          {formatMetricValue(metric, club[metric as keyof typeof club])}
                        </span>
                      ))}
                    </article>
                  );
                })
              : null}
          </div>

          {leaderboardQuery.hasNextPage ? (
            <div className={styles["clubs-leaderboard__load-more"]}>
              <button
                type="button"
                className={`${styles["clubs-leaderboard__button"]} ${styles["clubs-leaderboard__button--secondary"]} typography-desktop-button-small`}
                onClick={() => void leaderboardQuery.fetchNextPage()}
                disabled={leaderboardQuery.isFetchingNextPage}
              >
                {leaderboardQuery.isFetchingNextPage
                  ? t("common.loading")
                  : t("clubs.actions.loadMore") || "Load more"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isModalOpen ? (
        <JoinClubsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      ) : null}

      <LoginRequiredPopup
        isOpen={isLoginPopupOpen}
        onClose={() => {
          trackEvent("interaction", "desktop_clubs_leaderboard_login_popup_close");
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
          <h3 className="typography-desktop-title-small">{t("common.filters") || "Filters"}</h3>
          <button
            type="button"
            className={styles["clubs-leaderboard__filter-modal-close"]}
            onClick={() => setIsDateFilterModalOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles["clubs-leaderboard__filter-modal-body"]}>
          <label className={`${styles["clubs-leaderboard__filter-label"]} typography-desktop-label-medium`}>
            {t("clubs.filters.period") || "Period"}
          </label>
          <div className={styles["clubs-leaderboard__preset-grid"]}>
            <button
              type="button"
              className={`${styles["clubs-leaderboard__preset-button"]} ${
                dateFilterDraft.preset === "this_year"
                  ? styles["clubs-leaderboard__preset-button--active"]
                  : ""
              } typography-desktop-button-small`}
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
              } typography-desktop-button-small`}
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
              } typography-desktop-button-small`}
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
              } typography-desktop-button-small`}
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
                onDateChange={(date: string | null) =>
                  setDateFilterDraft((prev) => ({ ...prev, dateFrom: date }))
                }
              />
              <SingleDatePicker
                buttonLabel={t("clubs.period.dateTo") || "To"}
                initialDate={dateFilterDraft.dateTo || ""}
                isActive={!!dateFilterDraft.dateTo}
                onDateChange={(date: string | null) =>
                  setDateFilterDraft((prev) => ({ ...prev, dateTo: date }))
                }
              />
            </div>
          ) : null}

          <button
            type="button"
            className={`${styles["clubs-leaderboard__apply-button"]} typography-desktop-button-small`}
            onClick={applyDateFilter}
          >
            {t("common.apply") || "Apply"}
          </button>
        </div>
      </AppModal>
    </div>
  );
};

export default DesktopClubsLeaderboard;
