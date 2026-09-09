import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lock, Users } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useOptionalOverlayContext } from "../../desktop-components/desktop-Overlay/desktop-OverlayContext.tsx";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
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
import {
  getClubActionState,
} from "../../../shared/utils/clubState";
import {
  getPresetRange,
  mapMembersSortToApi,
  ALL_MEMBERS_SORT_MODES,
  formatDuration,
  type ClubTab,
  type OverviewPreset,
  type MembersFilterState,
  type MembersSortMode,
  type DatePreset,
} from "./types";
import { useLeaderboard } from "./useLeaderboard";
import type { ClubActivityFilter, ClubChallengeItem, ClubPeriodSummaryCategory } from "../../../shared/api/types/clubs";
import {
  formatDateShort,
  formatDurationHours,
} from "../../../shared/utils/peakListFormatting";
import { followPeakList, unfollowPeakList } from "../../../shared/api/endpoints/peakLists";

// New sub-components
import ClubProfileCard from "./components/ClubProfileCard/ClubProfileCard";
import ClubOverview from "./components/ClubOverview/ClubOverview";
import ClubTabs from "./components/ClubTabs/ClubTabs";
import ClubMembers from "./components/ClubMembers/ClubMembers";
import ClubActivity from "./components/ClubActivity/ClubActivity";
import ClubChallenges from "./components/ClubChallenges/ClubChallenges";

import styles from "./desktop-ClubDetails.module.css";

const ALLOWED_SUMMARY_CATEGORY_IDS = new Set([1, 2, 3, 4, 7]);

const DesktopClubDetails: React.FC = () => {
  const navigate = useNavigate();
  const { clubId } = useParams<{ clubId: string }>();
  const overlayContext = useOptionalOverlayContext();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const { formatMeters, formatStatDistance, formatStatElevationGain } =
    useUnitFormat();

  const numericClubId = Number(clubId);
  const detailQuery = useClubDetails(
    Number.isFinite(numericClubId) ? numericClubId : undefined
  );
  const club = detailQuery.data?.club;
  const stats = detailQuery.data?.stats;
  const challenges = detailQuery.data?.challenges ?? [];
  const mutations = useClubMutations();

  const [activeTab, setActiveTab] = useState<ClubTab>("members");
  const [overviewPreset, setOverviewPreset] = useState<OverviewPreset>("all_time");
  const [overviewCategoryId, setOverviewCategoryId] = useState<number | null>(null);
  const [membersFilter, setMembersFilter] = useState<MembersFilterState>({
    preset: "all_time",
    dateFrom: null,
    dateTo: null,
    sortMode: "most_peaks",
    onlyWithPeaks: false,
    categoryId: null,
  });
  const [activityFilter, setActivityFilter] = useState<ClubActivityFilter>("all_routes");
  const [selectedChallengeId, setSelectedChallengeId] = useState<number | null>(null);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());
  const [isJoining, setIsJoining] = useState<number | null>(null);

  const prevButtonRef = React.useRef<HTMLButtonElement>(null);
  const nextButtonRef = React.useRef<HTMLButtonElement>(null);
  const observerRef = React.useRef<HTMLDivElement>(null);

  const isAcceptedMember: boolean = !!club && (club.membership?.status === "accepted" || club.is_creator === true);
  const isPrivate = club?.visibility === "private";
  const canViewProtectedContent = Boolean(club && (!isPrivate || isAcceptedMember));

  const actionState = club ? getClubActionState(club, Boolean(user)) : null;

  const [overviewDateFrom, setOverviewDateFrom] = useState<string | null>(null);
  const [overviewDateTo, setOverviewDateTo] = useState<string | null>(null);
  const [overviewOnlyWithPeaks, setOverviewOnlyWithPeaks] = useState(false);

  const overviewRange = useMemo(() => {
    if (overviewPreset === "custom") {
      return { dateFrom: overviewDateFrom, dateTo: overviewDateTo };
    }
    return getPresetRange(overviewPreset);
  }, [overviewPreset, overviewDateFrom, overviewDateTo]);

  const summaryQuery = useClubPeriodSummary(
    {
      club_id: numericClubId,
      date_from: overviewRange.dateFrom,
      date_to: overviewRange.dateTo,
      sort_by: "distinct_peaks",
      limit: 8,
      offset: 0,
      ...(overviewCategoryId !== null ? { category_id: overviewCategoryId } : {}),
      ...(overviewOnlyWithPeaks ? { only_with_peaks: true } : {}),
    },
    Boolean(Number.isFinite(numericClubId))
  );

  const membersQuery = useClubPeriodSummary(
    {
      club_id: numericClubId,
      date_from: membersFilter.dateFrom,
      date_to: membersFilter.dateTo,
      sort_by: mapMembersSortToApi(membersFilter.sortMode),
      limit: 20,
      offset: 0,
      ...(typeof membersFilter.categoryId === "number"
        ? { category_id: membersFilter.categoryId }
        : {}),
      ...(membersFilter.onlyWithPeaks ? { only_with_peaks: true } : {}),
    },
    Boolean(
      Number.isFinite(numericClubId) &&
        canViewProtectedContent &&
        activeTab === "members" &&
        (membersFilter.preset === "all_time" || (membersFilter.dateFrom && membersFilter.dateTo))
    )
  );

  const activityQuery = useClubActivity(
    {
      club_id: numericClubId,
      filter: activityFilter,
      limit: 12,
      offset: 0,
    },
    Boolean(
      Number.isFinite(numericClubId) &&
        canViewProtectedContent &&
        activeTab === "activity"
    )
  );

  const summaryMetrics = summaryQuery.data?.pages?.[0]?.summary ?? null;
  const membersRows = useMemo(() => flattenClubPeriodSummaryPages(membersQuery.data?.pages), [membersQuery.data?.pages]);
  const activityItems = useMemo(() => flattenClubActivityPages(activityQuery.data?.pages), [activityQuery.data?.pages]);

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

  const {
    users: leaderboardUsers,
    loading: leaderboardLoading,
    authUserRank: leaderboardAuthUserRank,
    observerRef: leaderboardObserverRef,
  } = useLeaderboard({ activeTab, selectedChallengeId });

  const lastOverlayNameRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!club || !overlayContext) return;
    if (lastOverlayNameRef.current === club.name) return;
    overlayContext.updateOverlayNameByBaseKey(`club:${club.id}`, club.name);
    lastOverlayNameRef.current = club.name;
  }, [club?.id, club?.name, overlayContext]);

  useEffect(() => {
    if (swiperInstance && prevButtonRef.current && nextButtonRef.current) {
      const navigation = swiperInstance.params.navigation;
      if (navigation && typeof navigation === "object") {
        navigation.nextEl = nextButtonRef.current;
        navigation.prevEl = prevButtonRef.current;
        swiperInstance.navigation.init();
        swiperInstance.navigation.update();
      }
    }
  }, [swiperInstance, challenges]);

  useEffect(() => {
    if (challenges.length === 0) {
      setSelectedChallengeId(null);
      return;
    }
    setSelectedChallengeId((prev) => {
      if (prev && challenges.some((challenge) => challenge.list_id === prev)) return prev;
      return challenges[0]?.list_id ?? null;
    });
  }, [challenges]);

  // Infinite Scroll Observer logic
  useEffect(() => {
    if (activeTab === "challenges") return;
    const query = activeTab === "members" ? membersQuery : activityQuery;
    if (!query.hasNextPage || query.isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void query.fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    const currentRef = observerRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => { if (currentRef) observer.unobserve(currentRef); };
  }, [activeTab, membersQuery, activityQuery]);

  const handleToggleFollow = async (listId: number, currentlyFollowing: boolean) => {
    if (!user) { navigate("/profile"); return; }
    setIsJoining(listId);
    try {
      if (currentlyFollowing) await unfollowPeakList(listId);
      else await followPeakList(listId);
      detailQuery.refetch();
    } catch (err) {
      console.error("Failed to toggle follow status:", err);
    } finally { setIsJoining(null); }
  };

  const buildConstraintMeta = (list: ClubChallengeItem) => {
    const items: string[] = [];
    const durationLabel = formatDurationHours(list.max_duration);
    if (durationLabel) items.push(`${t("peakLists.timeLimit") || "Time limit"}: ${durationLabel}`);
    const startLabel = formatDateShort(list.start_date, language) || "";
    const endLabel = formatDateShort(list.end_date, language) || "";
    if (startLabel && endLabel) items.push(`${t("peakLists.dateRange") || "Valid"}: ${startLabel} - ${endLabel}`);
    else if (startLabel) items.push(`${t("peakLists.starts") || "Starts"}: ${startLabel}`);
    else if (endLabel) items.push(`${t("peakLists.ends") || "Ends"}: ${endLabel}`);
    return items;
  };

  const handleActionError = (error: unknown) => {
    setActionError(getClubApiErrorMessage(error, t("clubs.messages.actionFailed") || "Could not update the club."));
  };

  const handlePrimaryAction = async () => {
    if (!club || !actionState) return;
    if (actionState.primaryAction === "sign_in") { navigate("/profile"); return; }
    if (actionState.primaryAction === "edit") { navigate(`/clubs/${club.id}/edit`); return; }
    if (actionState.primaryAction === "join" || actionState.primaryAction === "request") {
      try {
        setActionError(null);
        await mutations.joinClub.mutateAsync(club.id);
      } catch (error) { handleActionError(error); }
      return;
    }
    if (actionState.primaryAction === "leave") setLeaveModalOpen(true);
  };

  const handleCancelRequest = async () => {
    if (!club) return;
    try {
      setActionError(null);
      await mutations.cancelJoinRequest.mutateAsync(club.id);
    } catch (error) { handleActionError(error); }
  };

  const handleLeaveConfirm = async () => {
    if (!club) return;
    try {
      setActionError(null);
      await mutations.leaveClub.mutateAsync(club.id);
      setLeaveModalOpen(false);
    } catch (error) { handleActionError(error); }
  };

  const applyMembersPreset = (preset: DatePreset) => {
    if (preset === "custom") { setMembersFilter((prev) => ({ ...prev, preset })); return; }
    const range = getPresetRange(preset);
    setMembersFilter((prev) => ({ ...prev, preset, dateFrom: range.dateFrom, dateTo: range.dateTo }));
  };

  const getMemberMetricLabel = (mode: MembersSortMode) => {
    if (mode === "most_peaks") return t("clubs.sort.mostPeaks") || "Most peaks";
    if (mode === "elevation_gain") return t("clubs.metrics.totalElevationGain") || "Elevation gain";
    if (mode === "distance") return t("clubs.metrics.distance") || "Distance";
    if (mode === "ascents") return t("main.totalAscents") || "Ascents";
    if (mode === "routes") return t("clubs.metrics.totalRoutes") || "Routes";
    if (mode === "moving_time") return t("clubs.metrics.totalTime") || "Moving time";
    return "";
  };

  const getMemberMetricValue = (mode: MembersSortMode, member: any) => {
    if (mode === "distance") return formatStatDistance(member.total_distance_km);
    if (mode === "elevation_gain") return formatStatElevationGain(member.total_elevation_gain);
    if (mode === "ascents") return Number(member.total_ascents).toLocaleString();
    if (mode === "routes") return Number(member.total_routes).toLocaleString();
    if (mode === "moving_time") return formatDuration(member.total_moving_time_seconds);
    return Number(member.distinct_peaks).toLocaleString();
  };

  const handleCreateChallenge = () => {
    trackEvent("interaction", "club_details_desktop_create_challenge");
    navigate(`/createlist?clubId=${club?.id}&clubName=${encodeURIComponent(club?.name || "")}`);
  };

  if (detailQuery.isLoading) {
    return (
      <div className={styles["club-details"]}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  if (detailQuery.isError || !club || !actionState) {
    return (
      <div className={styles["club-details"]}>
        <div className={styles["club-details__error"]}>
          <Users size={30} />
          <h2 className="typography-desktop-title-medium">
            {t("clubs.messages.loadFailed") || "Could not load this club."}
          </h2>
        </div>
      </div>
    );
  }

  const memberCount = stats?.member_count ?? club.member_count ?? 0;
  const distinctPeaks = stats?.distinct_peak_count ?? club.distinct_peak_count ?? 0;
  const totalRoutes = summaryMetrics?.total_routes ?? 0;
  const totalDistance = summaryMetrics?.total_distance_km ?? club.total_distance_km ?? 0;
  const totalElevationGain = summaryMetrics?.total_elevation_gain ?? club.total_elevation_gain ?? 0;
  const totalMovingTime = summaryMetrics?.total_moving_time_seconds ?? club.total_moving_time ?? 0;
  const totalAscents = summaryMetrics?.total_ascents ?? 0;

  const membersSortOptions = ALL_MEMBERS_SORT_MODES.map((mode) => ({ id: mode, name: getMemberMetricLabel(mode) }));
  const membersPeriodOptions = [
    { id: "this_year", name: t("clubs.period.thisYear") || "This year" },
    { id: "last_year", name: t("clubs.period.lastYear") || "Last year" },
    { id: "all_time", name: t("clubs.period.allTime") || "All time" },
    { id: "custom", name: t("clubs.period.custom") || "Custom" },
  ];

  const orderedMemberMetrics = [membersFilter.sortMode, ...ALL_MEMBERS_SORT_MODES.filter((mode) => mode !== membersFilter.sortMode)];
  const primaryMemberMetric = orderedMemberMetrics[0] ?? "most_peaks";
  const secondaryMemberMetric = orderedMemberMetrics[1] ?? "elevation_gain";
  const tertiaryMemberMetric = orderedMemberMetrics[2] ?? "distance";

  // Restricted view for non-members visiting a private club
  if (!canViewProtectedContent) {
    return (
      <div className={styles["club-details"]}>
        <div className={styles["club-details__container"]}>
          {actionError && <div className={styles["club-details__error-bar"]}>{actionError}</div>}
          <ClubProfileCard
            club={club}
            actionState={actionState}
            onPrimaryAction={handlePrimaryAction}
            onSecondaryAction={handleCancelRequest}
            actionBusy={mutations.joinClub.isPending || mutations.leaveClub.isPending || mutations.cancelJoinRequest.isPending}
            memberCount={memberCount}
            distinctPeaks={distinctPeaks}
            isPrivateView={true}
          />
          <section className={styles["club-details__locked-notice"]}>
            <div className={styles["club-details__locked-icon"]}><Lock size={34} /></div>
            <h2 className="typography-desktop-title-large">{t("clubs.details.restrictedTitle") || "Private club"}</h2>
            <p className="typography-desktop-body-medium">
              {t("clubs.details.restrictedMessage") || "Only accepted members can view members, activity, and challenges."}
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["club-details"]}>
      <div className={styles["club-details__container"]}>
        {actionError && <div className={styles["club-details__error-bar"]}>{actionError}</div>}

        <section className={styles["club-details__top-row"]}>
          <ClubProfileCard
            club={club}
            actionState={actionState}
            onPrimaryAction={handlePrimaryAction}
            onSecondaryAction={handleCancelRequest}
            actionBusy={mutations.joinClub.isPending || mutations.leaveClub.isPending || mutations.cancelJoinRequest.isPending}
            memberCount={memberCount}
            distinctPeaks={distinctPeaks}
          />

          <ClubOverview
            overviewPreset={overviewPreset}
            onPresetChange={setOverviewPreset}
            dateFrom={overviewDateFrom}
            dateTo={overviewDateTo}
            onDateChange={(from, to) => {
              setOverviewDateFrom(from);
              setOverviewDateTo(to);
            }}
            description={club.description}
            distinctPeaks={distinctPeaks}
            totalRoutes={totalRoutes}
            totalDistance={totalDistance}
            totalElevationGain={totalElevationGain}
            totalMovingTime={totalMovingTime}
            totalAscents={totalAscents}
            formatStatDistance={formatStatDistance}
            formatStatElevationGain={formatStatElevationGain}
            formatDuration={formatDuration}
            onlyWithPeaks={overviewOnlyWithPeaks}
            onOnlyWithPeaksChange={setOverviewOnlyWithPeaks}
            categoryId={overviewCategoryId}
            categoryOptions={categoryOptions}
            onCategoryChange={setOverviewCategoryId}
          />
        </section>

        <section className={styles["club-details__content-section"]}>
          <ClubTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className={styles["club-details__tab-content"]}>
            {activeTab === "members" && (
              <ClubMembers
                filter={membersFilter}
                onFilterChange={setMembersFilter}
                onApplyPreset={applyMembersPreset}
                rows={membersRows}
                isLoading={membersQuery.isLoading}
                isFetchingNextPage={membersQuery.isFetchingNextPage}
                onUserClick={(id) => {
                  if (user && user.internalUserId === id) navigate("/profile");
                  else navigate(`/externalprofile/${id}`);
                }}
                observerRef={observerRef}
                getMetricLabel={getMemberMetricLabel}
                getMetricValue={getMemberMetricValue}
                sortOptions={membersSortOptions}
                periodOptions={membersPeriodOptions}
                categoryOptions={categoryOptions}
                primaryMetric={primaryMemberMetric}
                secondaryMetric={secondaryMemberMetric}
                tertiaryMetric={tertiaryMemberMetric}
              />
            )}

            {activeTab === "activity" && (
              <ClubActivity
                items={activityItems}
                isLoading={activityQuery.isLoading}
                isFetchingNextPage={activityQuery.isFetchingNextPage}
                filter={activityFilter}
                onFilterChange={setActivityFilter}
                onItemClick={(id) => navigate(`/map?routeId=${id}`)}
                onUserClick={(id) => {
                  if (user && user.internalUserId === id) navigate("/profile");
                  else navigate(`/externalprofile/${id}`);
                }}
                formatDate={(d) => formatDateShort(d, language) || ""}
                formatStatDistance={formatStatDistance}
                formatStatElevationGain={formatStatElevationGain}
                formatDuration={formatDuration}
                formatMeters={formatMeters}
                observerRef={observerRef}
                imgErrors={imgErrors}
                onImgError={(id) => setImgErrors(prev => new Set(prev).add(id))}
                avatarErrors={avatarErrors}
                onAvatarError={(id) => setAvatarErrors(prev => new Set(prev).add(id))}
              />
            )}

            {activeTab === "challenges" && (
              <ClubChallenges
                challenges={challenges}
                canCreate={isAcceptedMember}
                onCreate={handleCreateChallenge}
                selectedChallengeId={selectedChallengeId}
                onSelectedChallengeChange={setSelectedChallengeId}
                leaderboardUsers={leaderboardUsers}
                leaderboardAuthUserRank={leaderboardAuthUserRank}
                leaderboardLoading={leaderboardLoading}
                leaderboardObserverRef={leaderboardObserverRef}
                onUserClick={(id) => {
                  if (user && user.internalUserId === id) navigate("/profile");
                  else navigate(`/externalprofile/${id}`);
                }}
                onToggleFollow={handleToggleFollow}
                isJoining={isJoining}
                buildConstraintMeta={buildConstraintMeta}
                navigate={navigate}
                setSwiperInstance={setSwiperInstance}
                prevButtonRef={prevButtonRef}
                nextButtonRef={nextButtonRef}
              />
            )}
          </div>
        </section>
      </div>

      <AppModal
        open={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        variant="dialog"
      >
        <div className={styles["club-details__modal"]}>
          <h3 className="typography-desktop-title-medium">{t("clubs.actions.leave") || "Leave club"}</h3>
          <p className="typography-desktop-body-medium">
            {t("clubs.messages.leaveConfirmation") || "Are you sure you want to leave this club?"}
          </p>
          <div className={styles["club-details__modal-actions"]}>
            <button
              className={`${styles["club-details__modal-button--secondary"]} typography-desktop-button-small`}
              onClick={() => setLeaveModalOpen(false)}
            >
              {t("common.cancel")}
            </button>
            <button
              className={`${styles["club-details__modal-button--danger"]} typography-desktop-button-small`}
              onClick={handleLeaveConfirm}
              disabled={mutations.leaveClub.isPending}
            >
              {mutations.leaveClub.isPending ? t("common.loading") : t("clubs.actions.leave")}
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  );
};

export default DesktopClubDetails;
