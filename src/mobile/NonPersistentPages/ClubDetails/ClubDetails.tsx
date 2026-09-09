import React, { useMemo, useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarRange,
  Lock,
  Plus,
  Route,
  SlidersHorizontal,
  Trophy,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import SingleDatePicker from "../UserPeaks/SingleDatePicker";
import AppModal from "../../../shared/components/AppModal";
import {
  useClubActivity,
  useClubDetails,
  useClubMutations,
  useClubPeriodSummary,
} from "../../../shared/hooks/clubs/useClubs";
import {
  flattenClubActivityPages,
  flattenClubPeriodSummaryPages,
} from "../../../shared/utils/clubResponse";
import { getClubApiErrorMessage } from "../../../shared/utils/clubForm";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import { formatStatInteger } from "../../../mobile/utils/numberFormatting";
import { getClubActionLabelKey, getClubActionState } from "../../../shared/utils/clubState";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import type {
  ClubActivityFilter,
  ClubChallengeItem,
  ClubPeriodSummaryCategory,
  ClubPeriodSummarySortBy,
} from "../../../shared/api/types/clubs";
import { LeafletRouteMap } from "../../../shared/components/LeafletRouteMap";
import rawStyles from "./ClubDetails.module.css";

const styles = rawStyles as any;

type ClubTab = "summary" | "members" | "activity";
type DatePreset = "this_year" | "last_year" | "all_time" | "custom";
type MembersSortMode =
  | "most_peaks"
  | "highest_climb"
  | "elevation_gain"
  | "routes"
  | "ascents"
  | "distance";

interface DateFilter {
  preset: DatePreset;
  dateFrom: string | null;
  dateTo: string | null;
}

interface SummaryFilter extends DateFilter {
  categoryId: number | null;
  onlyWithPeaks: boolean;
}

interface MembersFilter extends DateFilter {
  sortMode: MembersSortMode;
  onlyWithPeaks: boolean;
  categoryId: number | null;
}

const ALLOWED_SUMMARY_CATEGORY_IDS = new Set([1, 2, 3, 4, 7]);

const todayIso = () => new Date().toISOString().slice(0, 10);

const getPresetRange = (preset: DatePreset): { dateFrom: string | null; dateTo: string | null } => {
  const now = new Date();
  const today = todayIso();

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

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours === 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
};

const mapMembersSortToApi = (sortMode: MembersSortMode): ClubPeriodSummarySortBy => {
  switch (sortMode) {
    case "elevation_gain":
      return "total_elevation_gain";
    case "routes":
      return "total_routes";
    case "ascents":
      return "total_ascents";
    case "distance":
      return "total_distance_km";
    case "most_peaks":
    case "highest_climb":
    default:
      return "distinct_peaks";
  }
};

const ClubDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const { clubId } = useParams<{ clubId: string }>();
  const { t } = useI18n();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const { formatStatDistance, formatStatElevationGain } = useUnitFormat();

  const numericClubId = Number(clubId);
  const detailQuery = useClubDetails(
    Number.isFinite(numericClubId) ? numericClubId : undefined
  );
  const club = detailQuery.data?.club;
  const stats = detailQuery.data?.stats;

  const defaultSummaryRange = getPresetRange("all_time");
  const [activeTab, setActiveTab] = useState<ClubTab>("summary");
  const [actionError, setActionError] = useState<string | null>(null);
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>({
    preset: "all_time",
    dateFrom: defaultSummaryRange.dateFrom,
    dateTo: defaultSummaryRange.dateTo,
    categoryId: null,
    onlyWithPeaks: false,
  });
  const [membersFilter, setMembersFilter] = useState<MembersFilter>({
    preset: "all_time",
    dateFrom: defaultSummaryRange.dateFrom,
    dateTo: defaultSummaryRange.dateTo,
    sortMode: "most_peaks",
    onlyWithPeaks: false,
    categoryId: null,
  });
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: "join" | "leave";
  }>({
    isOpen: false,
    type: "join",
  });
  const [membersFilterDraft, setMembersFilterDraft] =
    useState<MembersFilter>(membersFilter);
  const [summaryFilterDraft, setSummaryFilterDraft] =
    useState<SummaryFilter>(summaryFilter);
  const [isSummaryFilterModalOpen, setIsSummaryFilterModalOpen] = useState(false);
  const [isMembersFilterModalOpen, setIsMembersFilterModalOpen] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ClubActivityFilter>("all_routes");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [imgErrors, setImgErrors] = useState<Set<number | string>>(new Set());
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());

  const mutations = useClubMutations();
  const canViewProtectedContent = Boolean(club && !club.restricted);

  const summaryQuery = useClubPeriodSummary(
    {
      club_id: numericClubId,
      date_from: summaryFilter.dateFrom,
      date_to: summaryFilter.dateTo,
      sort_by: "total_elevation_gain",
      ...(typeof summaryFilter.categoryId === "number" &&
      ALLOWED_SUMMARY_CATEGORY_IDS.has(summaryFilter.categoryId)
        ? { category_id: summaryFilter.categoryId }
        : {}),
      ...(summaryFilter.onlyWithPeaks ? { only_with_peaks: true } : {}),
      limit: 20,
      offset: 0,
    },
    Boolean(
      Number.isFinite(numericClubId) &&
        activeTab === "summary" &&
        canViewProtectedContent &&
        (summaryFilter.preset === "all_time" || (summaryFilter.dateFrom && summaryFilter.dateTo))
    )
  );

  const membersQuery = useClubPeriodSummary(
    {
      club_id: numericClubId,
      date_from: membersFilter.dateFrom,
      date_to: membersFilter.dateTo,
      sort_by: mapMembersSortToApi(membersFilter.sortMode),
      ...(typeof membersFilter.categoryId === "number" &&
      ALLOWED_SUMMARY_CATEGORY_IDS.has(membersFilter.categoryId)
        ? { category_id: membersFilter.categoryId }
        : {}),
      ...(membersFilter.onlyWithPeaks ? { only_with_peaks: true } : {}),
      limit: 20,
      offset: 0,
    },
    Boolean(
      Number.isFinite(numericClubId) &&
        activeTab === "members" &&
        canViewProtectedContent &&
        (membersFilter.preset === "all_time" || (membersFilter.dateFrom && membersFilter.dateTo))
    )
  );

  const activityQuery = useClubActivity(
    { club_id: numericClubId, filter: activityFilter },
    Boolean(
      Number.isFinite(numericClubId) &&
        activeTab === "activity" &&
        canViewProtectedContent
    )
  );

  const summaryMetrics = summaryQuery.data?.pages?.[0]?.summary ?? null;
  const categoryOptions = useMemo<ClubPeriodSummaryCategory[]>(() => {
    const summaryCategories = summaryQuery.data?.pages?.[0]?.categories ?? [];
    const membersCategories = membersQuery.data?.pages?.[0]?.categories ?? [];
    const deduped = new Map<number, ClubPeriodSummaryCategory>();
    [...summaryCategories, ...membersCategories].forEach((category) => {
      if (!ALLOWED_SUMMARY_CATEGORY_IDS.has(category.id)) return;
      if (!deduped.has(category.id)) {
        deduped.set(category.id, category);
      }
    });
    return Array.from(deduped.values());
  }, [summaryQuery.data?.pages, membersQuery.data?.pages]);

  const membersBaseRows = useMemo(
    () => flattenClubPeriodSummaryPages(membersQuery.data?.pages),
    [membersQuery.data?.pages]
  );
  const membersRows = useMemo(() => {
    if (membersFilter.sortMode !== "highest_climb") return membersBaseRows;
    return [...membersBaseRows].sort((a, b) => {
      const diff =
        (b.highest_peak_elevation ?? 0) - (a.highest_peak_elevation ?? 0);
      if (diff !== 0) return diff;
      return b.distinct_peaks - a.distinct_peaks;
    });
  }, [membersBaseRows, membersFilter.sortMode]);
  const activityItems = useMemo(
    () => flattenClubActivityPages(activityQuery.data?.pages),
    [activityQuery.data?.pages]
  );

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (
            activeTab === "members" &&
            membersQuery.hasNextPage &&
            !membersQuery.isFetchingNextPage
          ) {
            void membersQuery.fetchNextPage();
          } else if (
            activeTab === "activity" &&
            activityQuery.hasNextPage &&
            !activityQuery.isFetchingNextPage
          ) {
            void activityQuery.fetchNextPage();
          }
        }
      },
      { threshold: 0.1, rootMargin: "400px" }
    );

    const currentRef = sentinelRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [
    activeTab,
    membersQuery.hasNextPage,
    membersQuery.isFetchingNextPage,
    activityQuery.hasNextPage,
    activityQuery.isFetchingNextPage,
    membersQuery,
    activityQuery,
  ]);

  const handleBack = () => {
    if (overlayContext) {
      overlayContext.handleOverlayBack();
      return;
    }
    navigate(-1);
  };

  const handleActionError = (error: unknown) => {
    setActionError(
      getClubApiErrorMessage(
        error,
        t("clubs.messages.actionFailed") || "Could not update the club."
      )
    );
  };

  const handleJoinConfirm = async () => {
    if (!club) return;
    try {
      setActionError(null);
      await mutations.joinClub.mutateAsync(club.id);
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    } catch (error) {
      handleActionError(error);
    }
  };

  const handleLeaveConfirm = async () => {
    if (!club) return;
    try {
      setActionError(null);
      await mutations.leaveClub.mutateAsync(club.id);
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
    } catch (error) {
      handleActionError(error);
    }
  };

  const getDateFilterLabel = (filter: DateFilter) =>
    filter.preset === "all_time"
      ? t("clubs.period.allTime") || "All time"
      : `${formatDate(filter.dateFrom)} - ${formatDate(filter.dateTo)}`;

  const openSummaryFilterModal = () => {
    setSummaryFilterDraft(summaryFilter);
    setIsSummaryFilterModalOpen(true);
  };

  const openMembersFilterModal = () => {
    setMembersFilterDraft(membersFilter);
    setIsMembersFilterModalOpen(true);
  };

  const applySummaryFilter = () => {
    setSummaryFilter(summaryFilterDraft);
    setIsSummaryFilterModalOpen(false);
  };

  const applyMembersFilter = () => {
    setMembersFilter(membersFilterDraft);
    setIsMembersFilterModalOpen(false);
  };

  const setMembersDraftPreset = (preset: DatePreset) => {
    const range = getPresetRange(preset);
    setMembersFilterDraft((prev) => ({
      ...prev,
      preset,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }));
  };

  const setSummaryDraftPreset = (preset: DatePreset) => {
    const range = getPresetRange(preset);
    setSummaryFilterDraft((prev) => ({
      ...prev,
      preset,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }));
  };


  if (detailQuery.isLoading) {
    return (
      <div className={styles["clubDetails"]}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  if (detailQuery.isError || !club) {
    return (
      <div className={styles["clubDetails"]}>
        <OverlayHeader title="Club" onBack={handleBack} />
        <div className={styles["clubDetails__content"]}>
          <div className={`${styles["clubDetails__error"]} typography-body-small`}>
            {t("clubs.messages.loadFailed") || "Could not load this club."}
          </div>
        </div>
      </div>
    );
  }

  const memberCount = stats?.member_count ?? club.member_count ?? 0;
  const distinctPeaks = stats?.distinct_peak_count ?? club.distinct_peak_count ?? 0;
  const heroActionState = getClubActionState(club, Boolean(user));
  const challenges = detailQuery.data?.challenges ?? [];
  const isAcceptedMember = Boolean(
    club.is_creator || club.membership?.status === "accepted"
  );
  const canCreateChallenge = Boolean(user && isAcceptedMember);

  const handleHeroAction = () => {
    if (heroActionState.primaryAction === "sign_in") {
      navigate("/profile");
      return;
    }
    if (
      heroActionState.primaryAction === "join" ||
      heroActionState.primaryAction === "request"
    ) {
      void handleJoinConfirm();
      return;
    }
    if (heroActionState.primaryAction === "leave") {
      setConfirmationModal({ isOpen: true, type: "leave" });
    }
  };

  const openChallenge = (challenge: ClubChallengeItem) => {
    trackEvent("challenge_click", `club_challenge_${challenge.list_id}`);
    navigate(`/list-details/${challenge.list_id}`);
  };

  const handleCreateChallenge = () => {
    trackEvent("button_click", "club_create_challenge");
    navigate(
      `/createlist?clubId=${club.id}&clubName=${encodeURIComponent(club.name)}`
    );
  };

  const renderChallengesSection = () => {
    return (
      <section className={styles["clubDetails__challengesSection"]}>
        <div className={styles["clubDetails__challengesHeader"]}>
          <div className={styles["clubDetails__challengesHeaderCopy"]}>
            <h3 className={`${styles["clubDetails__challengesTitle"]} typography-title-medium`}>
              {t("clubs.challenges.title") || "Club challenges"}
            </h3>
          </div>
          {canCreateChallenge ? (
            <button
              type="button"
              className={`${styles["clubDetails__buttonSecondary"]} typography-button-small`}
              onClick={handleCreateChallenge}
            >
              <Plus size={14} />
              {t("clubs.challenges.create") || "Create challenge"}
            </button>
          ) : null}
        </div>

        {challenges.length === 0 ? (
          <div className={`${styles["clubDetails__empty"]} typography-body-small`}>
            {isAcceptedMember
              ? t("clubs.challenges.empty") || "No club challenges yet."
              : t("clubs.challenges.emptyRestricted") ||
                "No visible challenges. Join the club to unlock member challenges."}
          </div>
        ) : (
          <div className={styles["clubDetails__challengeList"]}>
            {challenges.map((challenge) => {
              const challengeName =
                challenge.name ||
                challenge.list_name ||
                `${t("clubs.challenges.itemFallback") || "Challenge"} #${challenge.list_id}`;
              const completedCount =
                typeof challenge.user_completed === "number"
                  ? challenge.user_completed
                  : 0;
              const totalCount =
                typeof challenge.total_peaks === "number"
                  ? challenge.total_peaks
                  : 0;

              return (
                <article
                  key={challenge.list_id}
                  className={styles["clubDetails__challengeCard"]}
                  role="button"
                  tabIndex={0}
                  aria-label={challengeName}
                  style={
                    challenge.primary_image
                      ? { backgroundImage: `url(${challenge.primary_image})` }
                      : undefined
                  }
                  onClick={() => openChallenge(challenge)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    openChallenge(challenge);
                  }}
                >
                  <div className={styles["clubDetails__challengeOverlay"]} />
                  <div className={styles["clubDetails__challengeContent"]}>
                    <strong className={`${styles["clubDetails__challengeTitle"]} typography-title-small`}>
                      {challengeName}
                    </strong>

                    <div className={styles["clubDetails__challengeMeta"]}>
                      <div className={styles["clubDetails__challengeStat"]}>
                        <span className={`${styles["clubDetails__challengeStatLabel"]} typography-label-medium`}>
                          {t("clubs.challenges.total") || "Total"}
                        </span>
                        <span className={`${styles["clubDetails__challengeStatValue"]} typography-title-small`}>
                          {formatStatInteger(totalCount)}
                        </span>
                      </div>
                      <div className={styles["clubDetails__challengeStatDivider"]} />
                      <div className={styles["clubDetails__challengeStat"]}>
                        <span className={`${styles["clubDetails__challengeStatLabel"]} typography-label-medium`}>
                          {t("clubs.challenges.completed") || "Completed"}
                        </span>
                        <span className={`${styles["clubDetails__challengeStatValue"]} typography-title-small`}>
                          {formatStatInteger(completedCount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderSummaryTab = () => {
    return (
      <div className={styles["clubDetails__summary"]}>
        <div className={styles["clubDetails__membersToolbar"]}>
          <div className={`${styles["clubDetails__toolbarSummary"]} typography-title-medium`}>
            {t("clubs.details.statistics") || "Statistics"}
          </div>
          <button
            type="button"
            className={`${styles["clubDetails__filterButton"]} typography-button-small`}
            onClick={openSummaryFilterModal}
          >
            <SlidersHorizontal size={14} />
            {t("common.filters") || "Filters"}
          </button>
        </div>

        {!summaryMetrics ? (
          <div className={`${styles["clubDetails__empty"]} typography-body-small`}>
            {t("common.loading") || "Loading..."}
          </div>
        ) : (
          <>
            <div className={styles["clubDetails__summaryCardsWrapper"]}>
              <div className={styles["clubDetails__summaryCards"]}>
                <article className={styles["clubDetails__summaryCard"]}>
                  <span className={`${styles["clubDetails__summaryLabel"]} typography-label-medium`}>
                    {t("clubs.metrics.peaks") || "Peaks"}
                  </span>
                  <strong className="typography-title-medium">
                    {formatStatInteger(summaryMetrics.distinct_peaks)}
                  </strong>
                </article>
                <article className={styles["clubDetails__summaryCard"]}>
                  <span className={`${styles["clubDetails__summaryLabel"]} typography-label-medium`}>
                    {t("clubs.metrics.totalRoutes") || "Routes"}
                  </span>
                  <strong className="typography-title-medium">
                    {formatStatInteger(summaryMetrics.total_routes)}
                  </strong>
                </article>
                <article className={styles["clubDetails__summaryCard"]}>
                  <span className={`${styles["clubDetails__summaryLabel"]} typography-label-medium`}>
                    {t("clubs.metrics.totalAscents") || "Ascents"}
                  </span>
                  <strong className="typography-title-medium">
                    {formatStatInteger(summaryMetrics.total_ascents)}
                  </strong>
                </article>
                <article className={styles["clubDetails__summaryCard"]}>
                  <span className={`${styles["clubDetails__summaryLabel"]} typography-label-medium`}>
                    {t("clubs.metrics.totalElevationGain") || "Elevation gain"}
                  </span>
                  <strong className="typography-title-medium">
                    {formatStatElevationGain(summaryMetrics.total_elevation_gain)}
                  </strong>
                </article>
                <article className={styles["clubDetails__summaryCard"]}>
                  <span className={`${styles["clubDetails__summaryLabel"]} typography-label-medium`}>
                    {t("clubs.metrics.distance") || "Distance"}
                  </span>
                  <strong className="typography-title-medium">
                    {formatStatDistance(summaryMetrics.total_distance_km)}
                  </strong>
                </article>
                <article className={styles["clubDetails__summaryCard"]}>
                  <span className={`${styles["clubDetails__summaryLabel"]} typography-label-medium`}>
                    {t("clubs.metrics.totalTime") || "Total time"}
                  </span>
                  <strong className="typography-title-medium">
                    {formatDuration(summaryMetrics.total_time_seconds)}
                  </strong>
                </article>
              </div>
            </div>

            {renderChallengesSection()}

            {summaryMetrics.top_member && (
              <div className={styles["clubDetails__topMemberCard"]}>
                <div className={styles["clubDetails__topMemberCardHeader"]}>
                  <div className={styles["clubDetails__topMemberAvatarWrap"]}>
                    <div className={`${styles["clubDetails__topMemberCardAvatar"]} typography-title-large`}>
                      {summaryMetrics.top_member.user_image ? (
                        <img
                          src={summaryMetrics.top_member.user_image}
                          alt={summaryMetrics.top_member.user_name}
                        />
                      ) : (
                        summaryMetrics.top_member.user_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className={styles["clubDetails__topMemberChampionIcon"]}>
                      <Trophy size={14}  />
                    </div>
                  </div>
                  <div className={styles["clubDetails__topMemberCardInfo"]}>
                    <span className={`${styles["clubDetails__topMemberCardLabel"]} typography-label-medium`}>
                      {t("clubs.metrics.topMember") || "Top member"}
                    </span>
                    <h3 className={`${styles["clubDetails__topMemberCardName"]} typography-title-medium`}>
                      {summaryMetrics.top_member.user_name}
                    </h3>
                  </div>
                </div>

                <div className={styles["clubDetails__topMemberCardStats"]}>
                  <div className={styles["clubDetails__topMemberCardStat"]}>
                    <span className={`${styles["clubDetails__topMemberCardStatValue"]} typography-title-small`}>
                      {formatStatInteger(summaryMetrics.top_member.distinct_peaks)}
                    </span>
                    <span className={`${styles["clubDetails__topMemberCardStatLabel"]} typography-label-medium`}>
                      {t("clubs.metrics.peaks") || "peaks"}
                    </span>
                  </div>
                  <div className={styles["clubDetails__topMemberCardStat"]}>
                    <span className={`${styles["clubDetails__topMemberCardStatValue"]} typography-title-small`}>
                      {formatStatElevationGain(summaryMetrics.top_member.total_elevation_gain)}
                    </span>
                    <span className={`${styles["clubDetails__topMemberCardStatLabel"]} typography-label-medium`}>
                      {t("clubs.metrics.totalElevationGain") || "gain"}
                    </span>
                  </div>
                  <div className={styles["clubDetails__topMemberCardStat"]}>
                    <span className={`${styles["clubDetails__topMemberCardStatValue"]} typography-title-small`}>
                      {(() => {
                        const topMemberInList = summaryQuery.data?.pages?.[0]?.members?.find(
                          (m: any) => m.user_id === summaryMetrics.top_member?.user_id
                        );
                        return formatStatDistance(topMemberInList?.total_distance_km || 0);
                      })()}
                    </span>
                    <span className={`${styles["clubDetails__topMemberCardStatLabel"]} typography-label-medium`}>
                      {t("clubs.metrics.distance") || "distance"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderMembersTab = () => {
    const getSortLabel = (mode: MembersSortMode) => {
      switch (mode) {
        case "elevation_gain":
          return t("clubs.metrics.totalElevationGain") || "Gain";
        case "routes":
          return t("clubs.metrics.totalRoutes") || "Routes";
        case "ascents":
          return t("clubs.metrics.totalAscents") || "Ascents";
        case "highest_climb":
          return t("clubs.metrics.highestPeak") || "Highest peak";
        case "distance":
          return t("clubs.metrics.distance") || "Distance";
        default:
          return t("clubs.metrics.totalElevationGain") || "Gain";
      }
    };

    return (
      <div className={styles["clubDetails__members"]}>
        <div className={styles["clubDetails__membersToolbar"]}>
          <div className={`${styles["clubDetails__toolbarSummary"]} ${styles["clubDetails__muted"]} typography-body-small`}>
            {getDateFilterLabel(membersFilter)}
          </div>
          <button
            type="button"
            className={`${styles["clubDetails__filterButton"]} typography-button-small`}
            onClick={openMembersFilterModal}
          >
            <SlidersHorizontal size={14} />
            {t("common.filters") || "Filters"}
          </button>
        </div>

        <div className={styles["clubDetails__listHeader"]}>
          <span className={`${styles["clubDetails__headerRank"]} typography-label-medium`}>#</span>
          <span className={`${styles["clubDetails__headerUser"]} typography-label-medium`}>
            {t("leaderboard.user") || "User"}
          </span>
          <span className={`${styles["clubDetails__headerCompleted"]} typography-label-medium`}>
            {t("clubs.metrics.peaks") || "Peaks"}
          </span>
          <span className={`${styles["clubDetails__headerPercent"]} typography-label-medium`}>
            {getSortLabel(membersFilter.sortMode)}
          </span>
        </div>

        <div className={styles["clubDetails__tableBody"]}>
          {membersRows.map((member, index) => {
            const rank = index + 1;
            let rankClass = "";
            if (rank === 1) rankClass = styles["clubDetails__rankBadge--top-1"];
            else if (rank === 2) rankClass = styles["clubDetails__rankBadge--top-2"];
            else if (rank === 3) rankClass = styles["clubDetails__rankBadge--top-3"];

            const valueDisplay =
              membersFilter.sortMode === "distance"
                ? formatStatDistance(member.total_distance_km)
                : membersFilter.sortMode === "routes"
                ? formatStatInteger(member.total_routes)
                : membersFilter.sortMode === "ascents"
                ? formatStatInteger(member.total_ascents)
                : membersFilter.sortMode === "highest_climb"
                ? formatStatElevationGain(member.highest_peak_elevation ?? 0)
                : formatStatElevationGain(member.total_elevation_gain);

            return (
              <article
                key={member.user_id}
                className={styles["clubDetails__userItem"]}
                onClick={() => {
                  trackEvent("profile_click", `club_member_${member.user_id}`);
                  navigate(`/externalprofile/${member.user_id}`);
                }}
              >
                <div
                  className={`${styles["clubDetails__rankBadge"]} ${rankClass} typography-title-medium`}
                >
                  {rank <= 3 ? <Trophy size={18} /> : rank}
                </div>

                {member.user_image ? (
                  <img
                    src={member.user_image}
                    alt={member.user_name}
                    className={styles["clubDetails__avatar"]}
                  />
                ) : (
                  <div
                    className={`${styles["clubDetails__avatar"]} typography-label-medium`}
                  >
                    {member.user_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={styles["clubDetails__userInfo"]}>
                  <div className={styles["clubDetails__userNameContainer"]}>
                    <span
                      className={`${styles["clubDetails__userName"]} typography-title-small`}
                    >
                      {member.user_name}
                    </span>
                  </div>

                  <div className={styles["clubDetails__userStatsContainer"]}>
                    <span
                      className={`${styles["clubDetails__userStatPrimary"]} typography-title-medium`}
                    >
                      {formatStatInteger(member.distinct_peaks)}
                    </span>
                    <span
                      className={`${styles["clubDetails__userStatSecondary"]} typography-title-small`}
                    >
                      {valueDisplay}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div ref={sentinelRef} style={{ height: 20 }} />
      </div>
    );
  };

  const renderActivityTab = () => {
    return (
      <div className={styles["clubDetails__activity"]}>
        <div className={styles["clubDetails__activityFilterRow"]}>
          <button
            type="button"
            className={`${styles["clubDetails__activityFilterButton"]} ${
              activityFilter === "all_routes"
                ? styles["clubDetails__activityFilterButton--active"]
                : ""
            } typography-button-small`}
            onClick={() => setActivityFilter("all_routes")}
          >
            {t("clubs.activity.allRoutes") || "All routes"}
          </button>
          <button
            type="button"
            className={`${styles["clubDetails__activityFilterButton"]} ${
              activityFilter === "with_peaks"
                ? styles["clubDetails__activityFilterButton--active"]
                : ""
            } typography-button-small`}
            onClick={() => setActivityFilter("with_peaks")}
          >
            {t("clubs.activity.withPeaks") || "With peaks"}
          </button>
        </div>

        <div className={styles["clubDetails__activityList"]}>
          {activityItems.map((item) => {
            const mainImageUrl = item.route_image || item.peaks.find(p => p.image)?.image;
            const hasMainImage = !!mainImageUrl;

            return (
              <article
                key={`${item.route_id}-${item.activity_date}-${item.user.id}`}
                className={styles["clubDetails__activityCard"]}
                onClick={() => navigate(`/routes/${item.route_id}`)}
              >
                {/* Header with user and date */}
                <div className={styles["clubDetails__activityHeaderRow"]}>
                  <div
                    className={styles["clubDetails__activityUserInfo"]}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/externalprofile/${item.user.id}`);
                    }}
                  >
                    {item.user.image && !avatarErrors.has(item.user.id) ? (
                      <img
                        src={item.user.image}
                        alt={item.user.name}
                        className={styles["clubDetails__activityUserAvatar"]}
                        onError={() =>
                          setAvatarErrors(
                            (prev) => new Set([...Array.from(prev), item.user.id])
                          )
                        }
                      />
                    ) : (
                      <div className={styles["clubDetails__activityUserAvatarPlaceholder"]}>
                        {item.user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={styles["clubDetails__activityUserDetails"]}>
                      <span className={`${styles["clubDetails__activityUserName"]} typography-title-small`}>
                        {item.user.name}
                      </span>
                 
                    </div>
                  </div>
                  <div className={`${styles["clubDetails__activityDate"]} typography-label-medium`}>
                    {formatDate(item.activity_date)}
                  </div>
                </div>

                {/* Route name */}
                <h3 className={`${styles["clubDetails__activityName"]} typography-title-medium`}>
                  {item.route_name}
                </h3>

                {/* Image / Stats Section */}
                <div className={styles["clubDetails__activityImageSection"]}>
                  {hasMainImage && !imgErrors.has(item.route_id) ? (
                    <img
                      src={mainImageUrl || undefined}
                      alt={item.route_name}
                      className={styles["clubDetails__activityImage"]}
                      onError={() =>
                        setImgErrors(
                          (prev) => new Set([...Array.from(prev), item.route_id])
                        )
                      }
                    />
                  ) : item.coordinates && item.coordinates.coordinates && item.coordinates.coordinates.length > 0 ? (
                    <div className={styles["clubDetails__activityImage"]}>
                      <LeafletRouteMap coordinates={item.coordinates} peaks={item.peaks ?? []} />
                    </div>
                  ) : item.peaks && item.peaks.length > 0 && item.peaks[0]?.lat != null ? (
                    <div className={styles["clubDetails__activityImage"]}>
                      <LeafletRouteMap peaks={item.peaks ?? []} />
                    </div>
                  ) : (
                    <div className={styles["clubDetails__activityImage"]}>
                      <div className={styles["clubDetails__heroPlaceholder"]} style={{ width: '100%', height: '100%', borderRadius: 0 }}>
                        <Route size={32} color="rgba(15, 23, 42, 0.4)" />
                      </div>
                    </div>
                  )}

                  <div className={styles["clubDetails__activityStatsOverlay"]}>
                    <div className={styles["clubDetails__activityStatItem"]}>
                      <span className={`${styles["clubDetails__activityStatLabel"]} typography-label-small`}>
                        {t("clubs.metrics.distance") || "Distance"}
                      </span>
                      <span className={`${styles["clubDetails__activityStatValue"]} typography-title-small`}>
                        {formatStatDistance(item.distance)}
                      </span>
                    </div>
                    <div className={styles["clubDetails__activityStatDivider"]} />
                    <div className={styles["clubDetails__activityStatItem"]}>
                      <span className={`${styles["clubDetails__activityStatLabel"]} typography-label-small`}>
                        {t("clubs.metrics.totalElevationGain") || "Gain"}
                      </span>
                      <span className={`${styles["clubDetails__activityStatValue"]} typography-title-small`}>
                        {formatStatElevationGain(item.elevation_gain)}
                      </span>
                    </div>
                    <div className={styles["clubDetails__activityStatDivider"]} />
                    <div className={styles["clubDetails__activityStatItem"]}>
                      <span className={`${styles["clubDetails__activityStatLabel"]} typography-label-small`}>
                        {t("clubs.metrics.totalTime") || "Time"}
                      </span>
                      <span className={`${styles["clubDetails__activityStatValue"]} typography-title-small`}>
                        {formatDuration(item.time_seconds)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Peaks Section at the bottom */}
                {item.peaks.length > 0 && (() => {
                  const maxVisible = 2;
                  const visiblePeaks = item.peaks.slice(0, maxVisible);
                  const remainingCount = item.peaks.length - maxVisible;

                  return (
                    <div className={styles["clubDetails__activityPeaksSection"]}>
                      <div className={styles["clubDetails__activityPeaksList"]}>
                        {visiblePeaks.map((peak) => (
                          <div
                            key={peak.id}
                            className={styles["clubDetails__activityPeakChip"]}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/peaks/${peak.id}`);
                            }}
                          >
                            <span className="typography-label-medium">
                              {peak.name_en || peak.name} {peak.elevation != null && `(${formatStatElevationGain(peak.elevation)})`}
                            </span>
                          </div>
                        ))}
                        {remainingCount > 0 && (
                          <div className={styles["clubDetails__activityPeakChip--more"]}>
                            <span className="typography-label-medium">
                              {`${remainingCount} ${t("clubs.activity.xMore") || "more"}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </article>
            );
          })}
        </div>
        <div ref={sentinelRef} style={{ height: 20 }} />
      </div>
    );
  };

  return (
    <div className={styles["clubDetails"]}>
      <OverlayHeader title={club.name} onBack={handleBack} />

      <div className={styles["clubDetails__content"]}>
        <section className={styles["clubDetails__hero"]}>
          {club.image ? (
            <img
              src={club.image}
              alt={club.name}
              className={styles["clubDetails__heroImage"]}
            />
          ) : (
            <div className={styles["clubDetails__heroPlaceholder"]}>
              <Users size={28} />
            </div>
          )}

          <div className={styles["clubDetails__heroContent"]}>
            <div className={styles["clubDetails__heroMetrics"]}>
              <div className={styles["clubDetails__heroMetric"]}>
                <span className={`${styles["clubDetails__heroMetricLabel"]} typography-label-medium`}>
                  {t("clubs.metrics.members") || "Members"}
                </span>
                <strong className={`${styles["clubDetails__heroMetricValue"]} typography-display-small`}>
                  {formatStatInteger(memberCount)}
                </strong>
              </div>
              <div className={styles["clubDetails__heroMetric"]}>
                <span className={`${styles["clubDetails__heroMetricLabel"]} typography-label-medium`}>
                  {t("clubs.metrics.distinctPeaks") || "Distinct peaks"}
                </span>
                <strong className={`${styles["clubDetails__heroMetricValue"]} typography-display-small`}>
                  {formatStatInteger(distinctPeaks)}
                </strong>
              </div>
            </div>

            {club.admin_hierarchy && (
              <div className={styles["clubDetails__heroRegion"]}>
                <span className="typography-label-medium">{getLocationFromHierarchy(club.admin_hierarchy)}</span>
              </div>
            )}

            {!club.is_creator ? (
              <button
                type="button"
                className={`${styles["clubDetails__heroAction"]} typography-button-small`}
                onClick={handleHeroAction}
                disabled={
                  mutations.joinClub.isPending ||
                  mutations.cancelJoinRequest.isPending ||
                  mutations.leaveClub.isPending ||
                  heroActionState.primaryAction === "pending"
                }
              >
                {t(getClubActionLabelKey(heroActionState.primaryAction))}
              </button>
            ) : null}
          </div>
        </section>

        {club.description ? (
          <p className={`${styles["clubDetails__description"]} typography-body-small`}>
            {club.description}
          </p>
        ) : null}

        {actionError ? (
          <div className={`${styles["clubDetails__error"]} typography-body-small`}>
            {actionError}
          </div>
        ) : null}

        {club.restricted ? (
          <section className={styles["clubDetails__privateContent"]}>
            <div className={styles["clubDetails__lockIcon"]}>
              <Lock size={48} color="rgba(15, 23, 42, 0.3)" />
            </div>
            <h3 className="typography-title-medium">
              {t("clubs.details.restrictedTitle") || "Private club"}
            </h3>
            <p className="typography-body-small">
              {t("clubs.details.restrictedMessage") ||
                "Only accepted members can view summary, members, and activity."}
            </p>
          </section>
        ) : (
          <>
            <div className={styles["clubDetails__tabs"]}>
              <button
                type="button"
                className={`${styles["clubDetails__tab"]} ${
                  activeTab === "summary" ? styles["clubDetails__tab--active"] : ""
                } typography-button-small`}
                onClick={() => {
                  trackEvent("interaction", "club_tab_summary");
                  setActiveTab("summary");
                }}
              >
                <CalendarRange size={14} />
                {t("clubs.tabs.summary") || "Summary"}
              </button>
              <button
                type="button"
                className={`${styles["clubDetails__tab"]} ${
                  activeTab === "members" ? styles["clubDetails__tab--active"] : ""
                } typography-button-small`}
                onClick={() => {
                  trackEvent("interaction", "club_tab_members");
                  setActiveTab("members");
                }}
              >
                <Users size={14} />
                {t("clubs.tabs.members") || "Members"}
              </button>
              <button
                type="button"
                className={`${styles["clubDetails__tab"]} ${
                  activeTab === "activity" ? styles["clubDetails__tab--active"] : ""
                } typography-button-small`}
                onClick={() => {
                  trackEvent("interaction", "club_tab_activity");
                  setActiveTab("activity");
                }}
              >
                <UserCheck size={14} />
                {t("clubs.tabs.activity") || "Activity"}
              </button>
            </div>

            <div className={styles["clubDetails__tabContent"]}>
              {activeTab === "summary" && renderSummaryTab()}
              {activeTab === "members" && renderMembersTab()}
              {activeTab === "activity" && renderActivityTab()}
            </div>
          </>
        )}
      </div>

      <AppModal
        open={isSummaryFilterModalOpen}
        onClose={() => setIsSummaryFilterModalOpen(false)}
        variant="dialog"
        contentClassName={styles["clubDetails__filterModal"]}
        ariaLabel={t("common.filters") || "Filters"}
      >
        <div className={styles["clubDetails__filterModalHeader"]}>
          <h3 className="typography-title-medium">{t("common.filters") || "Filters"}</h3>
          <button
            type="button"
            className={styles["clubDetails__filterModalClose"]}
            onClick={() => setIsSummaryFilterModalOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles["clubDetails__filterModalBody"]}>
          <label className={`${styles["clubDetails__filterLabel"]} typography-label-medium`}>
            {t("clubs.filters.period") || "Period"}
          </label>
          <div className={styles["clubDetails__presetGrid"]}>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                summaryFilterDraft.preset === "this_year"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() => setSummaryDraftPreset("this_year")}
            >
              {t("clubs.period.thisYear") || "This year"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                summaryFilterDraft.preset === "last_year"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() => setSummaryDraftPreset("last_year")}
            >
              {t("clubs.period.lastYear") || "Last year"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                summaryFilterDraft.preset === "all_time"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() => setSummaryDraftPreset("all_time")}
            >
              {t("clubs.period.allTime") || "All time"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                summaryFilterDraft.preset === "custom"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setSummaryFilterDraft((prev) => ({
                  ...prev,
                  preset: "custom",
                }))
              }
            >
              {t("clubs.period.custom") || "Custom"}
            </button>
          </div>

          {summaryFilterDraft.preset === "custom" ? (
            <div className={styles["clubDetails__dateInputs"]}>
              <SingleDatePicker
                buttonLabel={t("clubs.period.dateFrom") || "From"}
                initialDate={summaryFilterDraft.dateFrom || ""}
                isActive={!!summaryFilterDraft.dateFrom}
                onDateChange={(date) =>
                  setSummaryFilterDraft((prev) => ({
                    ...prev,
                    dateFrom: date || null,
                  }))
                }
              />
              <SingleDatePicker
                buttonLabel={t("clubs.period.dateTo") || "To"}
                initialDate={summaryFilterDraft.dateTo || ""}
                isActive={!!summaryFilterDraft.dateTo}
                onDateChange={(date) =>
                  setSummaryFilterDraft((prev) => ({
                    ...prev,
                    dateTo: date || null,
                  }))
                }
              />
            </div>
          ) : null}

          <label className={`${styles["clubDetails__filterLabel"]} typography-label-medium`}>
            {t("clubs.filters.routes") || "Routes"}
          </label>
          <div className={styles["clubDetails__presetGrid"]}>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                summaryFilterDraft.onlyWithPeaks
                  ? ""
                  : styles["clubDetails__presetButton--active"]
              } typography-button-small`}
              onClick={() =>
                setSummaryFilterDraft((prev) => ({ ...prev, onlyWithPeaks: false }))
              }
            >
              {t("clubs.activity.allRoutes") || "All routes"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                summaryFilterDraft.onlyWithPeaks
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setSummaryFilterDraft((prev) => ({ ...prev, onlyWithPeaks: true }))
              }
            >
              {t("clubs.activity.withPeaks") || "With peaks"}
            </button>
          </div>

          <label className={`${styles["clubDetails__filterLabel"]} typography-label-medium`}>
            {t("clubs.filters.activity") || "Activity"}
          </label>
          <div className={styles["clubDetails__presetGrid"]}>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                summaryFilterDraft.categoryId === null
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setSummaryFilterDraft((prev) => ({
                  ...prev,
                  categoryId: null,
                }))
              }
            >
              {t("clubs.filters.allCategories") || "All categories"}
            </button>
            {categoryOptions.map((category) => (
              <button
                key={`summary-category-${category.id}`}
                type="button"
                className={`${styles["clubDetails__presetButton"]} ${
                  summaryFilterDraft.categoryId === category.id
                    ? styles["clubDetails__presetButton--active"]
                    : ""
                } typography-button-small`}
                onClick={() =>
                  setSummaryFilterDraft((prev) => ({
                    ...prev,
                    categoryId: category.id,
                  }))
                }
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles["clubDetails__filterModalFooter"]}>
          <button
            type="button"
            className={`${styles["clubDetails__buttonSecondary"]} typography-button-small`}
            onClick={() => setIsSummaryFilterModalOpen(false)}
          >
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            type="button"
            className={`${styles["clubDetails__button"]} typography-button-small`}
            onClick={applySummaryFilter}
            disabled={summaryFilterDraft.preset !== "all_time" && (!summaryFilterDraft.dateFrom || !summaryFilterDraft.dateTo)}
          >
            {t("common.apply") || "Apply"}
          </button>
        </div>
      </AppModal>

      <AppModal
        open={isMembersFilterModalOpen}
        onClose={() => setIsMembersFilterModalOpen(false)}
        variant="dialog"
        contentClassName={styles["clubDetails__filterModal"]}
        ariaLabel={t("common.filters") || "Filters"}
      >
        <div className={styles["clubDetails__filterModalHeader"]}>
          <h3 className="typography-title-medium">{t("common.filters") || "Filters"}</h3>
          <button
            type="button"
            className={styles["clubDetails__filterModalClose"]}
            onClick={() => setIsMembersFilterModalOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles["clubDetails__filterModalBody"]}>
          <label className={`${styles["clubDetails__filterLabel"]} typography-label-medium`}>
            {t("clubs.filters.period") || "Period"}
          </label>
          <div className={styles["clubDetails__presetGrid"]}>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.preset === "this_year"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() => setMembersDraftPreset("this_year")}
            >
              {t("clubs.period.thisYear") || "This year"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.preset === "last_year"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() => setMembersDraftPreset("last_year")}
            >
              {t("clubs.period.lastYear") || "Last year"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.preset === "all_time"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() => setMembersDraftPreset("all_time")}
            >
              {t("clubs.period.allTime") || "All time"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.preset === "custom"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({
                  ...prev,
                  preset: "custom",
                }))
              }
            >
              {t("clubs.period.custom") || "Custom"}
            </button>
          </div>

          {membersFilterDraft.preset === "custom" ? (
            <div className={styles["clubDetails__dateInputs"]}>
              <SingleDatePicker
                buttonLabel={t("clubs.period.dateFrom") || "From"}
                initialDate={membersFilterDraft.dateFrom || ""}
                isActive={!!membersFilterDraft.dateFrom}
                onDateChange={(date) =>
                  setMembersFilterDraft((prev) => ({
                    ...prev,
                    dateFrom: date || null,
                  }))
                }
              />
              <SingleDatePicker
                buttonLabel={t("clubs.period.dateTo") || "To"}
                initialDate={membersFilterDraft.dateTo || ""}
                isActive={!!membersFilterDraft.dateTo}
                onDateChange={(date) =>
                  setMembersFilterDraft((prev) => ({
                    ...prev,
                    dateTo: date || null,
                  }))
                }
              />
            </div>
          ) : null}

          <label className={`${styles["clubDetails__filterLabel"]} typography-label-medium`}>
            {t("clubs.filters.sortBy") || "Sort by"}
          </label>
          <div className={styles["clubDetails__presetGrid"]}>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.sortMode === "most_peaks"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({ ...prev, sortMode: "most_peaks" }))
              }
            >
              {t("clubs.sort.mostPeaks") || "Most peaks"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.sortMode === "highest_climb"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({ ...prev, sortMode: "highest_climb" }))
              }
            >
              {t("clubs.filters.highestClimb") || "Highest climb"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.sortMode === "elevation_gain"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({ ...prev, sortMode: "elevation_gain" }))
              }
            >
              {t("clubs.metrics.totalElevationGain") || "Elevation gain"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.sortMode === "routes"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({ ...prev, sortMode: "routes" }))
              }
            >
              {t("clubs.metrics.totalRoutes") || "Routes"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.sortMode === "ascents"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({ ...prev, sortMode: "ascents" }))
              }
            >
              {t("clubs.metrics.totalAscents") || "Ascents"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.sortMode === "distance"
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({ ...prev, sortMode: "distance" }))
              }
            >
              {t("clubs.metrics.distance") || "Distance"}
            </button>
          </div>

          <label className={`${styles["clubDetails__filterLabel"]} typography-label-medium`}>
            {t("clubs.filters.routes") || "Routes"}
          </label>
          <div className={styles["clubDetails__presetGrid"]}>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.onlyWithPeaks
                  ? ""
                  : styles["clubDetails__presetButton--active"]
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({ ...prev, onlyWithPeaks: false }))
              }
            >
              {t("clubs.activity.allRoutes") || "All routes"}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.onlyWithPeaks
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({ ...prev, onlyWithPeaks: true }))
              }
            >
              {t("clubs.activity.withPeaks") || "With peaks"}
            </button>
          </div>

          <label className={`${styles["clubDetails__filterLabel"]} typography-label-medium`}>
            {t("clubs.filters.activity") || "Activity"}
          </label>
          <div className={styles["clubDetails__presetGrid"]}>
            <button
              type="button"
              className={`${styles["clubDetails__presetButton"]} ${
                membersFilterDraft.categoryId === null
                  ? styles["clubDetails__presetButton--active"]
                  : ""
              } typography-button-small`}
              onClick={() =>
                setMembersFilterDraft((prev) => ({
                  ...prev,
                  categoryId: null,
                }))
              }
            >
              {t("clubs.filters.allCategories") || "All categories"}
            </button>
            {categoryOptions.map((category) => (
              <button
                key={`members-category-${category.id}`}
                type="button"
                className={`${styles["clubDetails__presetButton"]} ${
                  membersFilterDraft.categoryId === category.id
                    ? styles["clubDetails__presetButton--active"]
                    : ""
                } typography-button-small`}
                onClick={() =>
                  setMembersFilterDraft((prev) => ({
                    ...prev,
                    categoryId: category.id,
                  }))
                }
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles["clubDetails__filterModalFooter"]}>
          <button
            type="button"
            className={`${styles["clubDetails__buttonSecondary"]} typography-button-small`}
            onClick={() => setIsMembersFilterModalOpen(false)}
          >
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            type="button"
            className={`${styles["clubDetails__button"]} typography-button-small`}
            onClick={applyMembersFilter}
            disabled={membersFilterDraft.preset !== "all_time" && (!membersFilterDraft.dateFrom || !membersFilterDraft.dateTo)}
          >
            {t("common.apply") || "Apply"}
          </button>
        </div>
      </AppModal>

      <AppModal
        open={confirmationModal.isOpen}
        onClose={() =>
          !(mutations.joinClub.isPending || mutations.leaveClub.isPending) &&
          setConfirmationModal((prev) => ({ ...prev, isOpen: false }))
        }
      >
        <div className={styles["clubDetails__confirm"]}>
          <div className={styles["clubDetails__confirmHeader"]}>
            <h3 className="typography-title-large">
              {t("clubs.actions.leaveConfirmTitle")}
            </h3>
          </div>
          <div className={styles["clubDetails__confirmBody"]}>
            <p className="typography-body-medium">
              {t("clubs.actions.leaveConfirmMessage", { name: club.name })}
            </p>
          </div>
          <div className={styles["clubDetails__confirmFooter"]}>
            <button
              type="button"
              className={`${styles["clubDetails__confirmBtn"]} ${styles["clubDetails__confirmBtn--secondary"]} typography-button-medium`}
              onClick={() => setConfirmationModal((prev) => ({ ...prev, isOpen: false }))}
              disabled={mutations.leaveClub.isPending}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className={`${styles["clubDetails__confirmBtn"]} ${styles["clubDetails__confirmBtn--danger"]} typography-button-medium`}
              onClick={handleLeaveConfirm}
              disabled={mutations.leaveClub.isPending}
            >
              {mutations.leaveClub.isPending
                ? t("common.loading")
                : t("common.leave")}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default ClubDetailsPage;
