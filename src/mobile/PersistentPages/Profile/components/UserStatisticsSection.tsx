import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  TrendingUp,
  X,
  Calendar,
  ChevronRight,
  Plus,
  Edit,
  Pencil,
  Users,
} from "lucide-react";
import { useAuth } from "../../../../shared/context/AuthContext";
import { useI18n } from "../../../../shared/context/I18nContext";
import LoadingScreen from "../../../components/LoadingScreen/LoadingScreen";
import StatsChart from "./StatsChart";
import type { TimeAggregation } from "./StatsChart";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import SingleDatePicker from "../../../NonPersistentPages/UserPeaks/SingleDatePicker";
import styles from "./UserStatisticsSection.module.css";
import HomeHeader from "../../../components/Main/HomeHeader/HomeHeader";
import {
  getUserStats,
  getStatsGraph,
} from "../../../../shared/api/endpoints/user";
import type {
  UserStatsResponse,
  StatsGraphResponse,
} from "../../../../shared/api/types";
import {
  formatStatDuration,
  formatStatInteger,
} from "../../../utils/numberFormatting";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import ChallengesModal from "./ChallengesModal";
import EditChallengesModal from "./EditChallengesModal";
import CreatorBadge from "../../../../shared/components/CreatorBadge/CreatorBadge";
import JoinClubsModal from "./JoinClubsModal";
import ManageClubsModal from "./ManageClubsModal";
import { useMyClubs, useUserClubs } from "../../../../shared/hooks/clubs/useClubs";
import { normalizeMyClubsResponse } from "../../../../shared/utils/clubResponse";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";

type ActivityFilter = "all" | string;
type MetricKey =
  | "distance"
  | "elevation_gain"
  | "time"
  | "moving_time"
  | "peaks"
  | "routes";

interface UserStatisticsSectionProps {
  userId?: string; // If provided, fetch stats for this user
  totalSavedPeaks?: number | undefined;
  totalSavedShelters?: number | undefined;
  initialStats?: UserStatsResponse | null;
  initialGraph?: StatsGraphResponse | null;
}

const UserStatisticsSection: React.FC<UserStatisticsSectionProps> = ({
  userId,
  totalSavedPeaks,
  totalSavedShelters,
  initialStats,
  initialGraph,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { formatStatDistance, formatStatElevationGain } = useUnitFormat();
  const { trackEvent } = useAnalytics();

  // If userId matches current user or is not provided, it's the current user's profile
  const isCurrentUser = !userId || (user && user.internalUserId === parseInt(userId));
  const effectiveUserId = userId || user?.internalUserId?.toString();

  // Translation functions for labels

  const getTimeAggregationLabel = (aggregation: TimeAggregation): string => {
    const labels: Record<TimeAggregation, string> = {
      daily: t("userStats.timeAggregation.daily"),
      weekly: t("userStats.timeAggregation.weekly"),
      monthly: t("userStats.timeAggregation.monthly"),
      yearly: t("userStats.timeAggregation.yearly"),
      custom: t("userStats.timeAggregation.custom"),
    };
    return labels[aggregation];
  };

  const [loading, setLoading] = useState(!initialStats || !initialGraph);
  const [stats, setStats] = useState<UserStatsResponse | null>(initialStats || null);
  const [graph, setGraph] = useState<StatsGraphResponse | null>(initialGraph || null);

  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [metric, setMetric] = useState<MetricKey>("peaks");
  const [graphOpen, setGraphOpen] = useState(false);
  const [timeAggregation, setTimeAggregation] =
    useState<TimeAggregation>("daily");
  const [customStartDate, setCustomStartDate] = useState<string | null>(null);
  const [customEndDate, setCustomEndDate] = useState<string | null>(null);
  const [groupByPopupOpen, setGroupByPopupOpen] = useState(false);
  const [activityPopupOpen, setActivityPopupOpen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [challengesModalOpen, setChallengesModalOpen] = useState(false);
  const [editChallengesModalOpen, setEditChallengesModalOpen] = useState(false);
  const [joinClubsModalOpen, setJoinClubsModalOpen] = useState(false);
  const [manageClubsModalOpen, setManageClubsModalOpen] = useState(false);

  // Expandable sections state
  const [challengesExpanded, setChallengesExpanded] = useState(() => {
    if (!isCurrentUser) return false;
    const saved = localStorage.getItem("profile_challenges_expanded");
    return saved === null ? false : saved === "true";
  });
  const [clubsExpanded, setClubsExpanded] = useState(() => {
    if (!isCurrentUser) return false;
    const saved = localStorage.getItem("profile_clubs_expanded");
    return saved === null ? false : saved === "true";
  });

  const toggleChallenges = () => {
    setChallengesExpanded((prev) => {
      const next = !prev;
      if (isCurrentUser) {
        localStorage.setItem("profile_challenges_expanded", String(next));
      }
      return next;
    });
  };

  const toggleClubs = () => {
    setClubsExpanded((prev) => {
      const next = !prev;
      if (isCurrentUser) {
        localStorage.setItem("profile_clubs_expanded", String(next));
      }
      return next;
    });
  };

  const myClubsQuery = useMyClubs(Boolean(isCurrentUser));
  const userClubsQuery = useUserClubs(effectiveUserId, Boolean(!isCurrentUser && effectiveUserId));
  const currentQuery = isCurrentUser ? myClubsQuery : userClubsQuery;

  const clubSections = useMemo(
    () => normalizeMyClubsResponse(currentQuery.data),
    [currentQuery.data]
  );
  
  const userClubs = useMemo(() => {
    return [
      ...clubSections.createdClubs,
      ...clubSections.joinedClubs
    ];
  }, [clubSections]);

  useEffect(() => {
    // If we have initial data and it's for the correct user, use it
    if (initialStats && initialGraph && (!userId || initialStats.user_id === parseInt(userId))) {
      setStats(initialStats);
      setGraph(initialGraph);
      setLoading(false);
      return;
    }

    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const [s, g] = await Promise.all([
          getUserStats(effectiveUserId),
          getStatsGraph(effectiveUserId)
        ]);
        setStats(s);
        setGraph(g);
      } catch (e) {
        console.error("Failed to load user stats", e);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [effectiveUserId, initialStats, initialGraph, userId]);

  // Orientation detection
  useEffect(() => {
    const checkOrientation = () => {
      // Check screen orientation API first (most reliable)
      if (screen.orientation) {
        const angle = screen.orientation.angle;
        const isLandscapeMode =
          screen.orientation.type.startsWith("landscape") ||
          angle === 90 ||
          angle === -90 ||
          angle === 270;
        setIsLandscape(isLandscapeMode);
        return;
      }

      // Fallback to window dimensions and orientation
      const isLandscapeMode =
        window.innerWidth > window.innerHeight ||
        ((window as any).orientation !== undefined &&
          ((window as any).orientation === 90 ||
            (window as any).orientation === -90));
      setIsLandscape(isLandscapeMode);
    };

    // Check on mount
    checkOrientation();

    // Listen to orientation changes
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    if (screen.orientation) {
      screen.orientation.addEventListener("change", checkOrientation);
    }

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
      if (screen.orientation) {
        screen.orientation.removeEventListener("change", checkOrientation);
      }
    };
  }, []);

  const activities = useMemo(() => {
    const rawActivities =
      stats?.totals.by_activity?.map((a) => a.activity_type ?? "unknown") || [];
    const uniqueActivities = Array.from(new Set(rawActivities));
    return ["all", ...uniqueActivities] as ActivityFilter[];
  }, [stats]);

  // Function to get translated activity name
  const getActivityDisplayName = (activity: ActivityFilter): string => {
    if (activity === "all") {
      return t("userStats.activityFilter.all");
    }
    if (!activity || activity === "unknown") {
      return t("userStats.activityFilter.unknown") || "Unknown";
    }
    return activity;
  };

  // Get current stats based on activity filter
  const currentStats = useMemo(() => {
    if (!stats) return null;

    if (activityFilter === "all") {
      return stats.totals.global;
    }

    const activity = stats.totals.by_activity.find(
      (a) => a.activity_type === activityFilter
    );

    return activity || null;
  }, [stats, activityFilter]);

  const currentUserId = user?.internalUserId ?? stats?.user_id;

  const createdChallenges = useMemo(() => {
    if (!stats?.peaks_per_list || !currentUserId) return [];
    return stats.peaks_per_list.filter((item) => {
      const creatorId = item.creator_id ?? item.created_by;
      if (!creatorId) return false;
      return Number(creatorId) === Number(currentUserId);
    });
  }, [stats, currentUserId]);

  if (loading) {
    return (
      <div className={styles["userStatsSection"]}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  return (
    <div className={styles["userStatsSection"]}>
      {/* Unified Stats Grid */}
      <div className={`${styles["userStats__headerGrid"]} ${!isCurrentUser ? styles["userStats__headerGrid--external"] : ""}`}>
        {/* Rank Card */}
        <div
          className={`${styles["userStats__totalCard"]} ${styles["userStats__totalCard--wide"]}`}
          onClick={() => navigate("/leaderboard?tab=world&sort_mode=contributors")}
        >
          <div className={styles["userStats__totalCardContent"]}>
            <span className={`${styles["userStats__rankValue"]} typography-headline-medium`}>
              {stats?.rank && stats.rank > 0 ? (
                <>
                  <span className={`${styles["userStats__rankHash"]} typography-title-medium`}>#</span>{formatStatInteger(stats.rank)}
                </>
              ) : (
                t("userStats.rank.noRank")
              )}
            </span>
            {stats?.rank && stats.rank > 0 ? (
              <span className={`${styles["userStats__totalCardSuffix"]} typography-label-medium`}>
                {t("userStats.rank.yourRank")}
              </span>
            ) : (
              ""
            )}
          </div>
          <div className={styles["userStats__totalCardChevron"]}>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Saved Peaks Card - Only for current user */}
        {isCurrentUser && (
          <div
            className={styles["userStats__totalCard"]}
            onClick={() => navigate("/saved-peaks")}
          >
            <div className={styles["userStats__totalCardContent"]}>
              <span className={`${styles["userStats__totalCardValue"]} typography-headline-medium`}>
                {formatStatInteger(totalSavedPeaks ?? 0)}
              </span>
              <span className={`${styles["userStats__totalCardSuffix"]} typography-label-medium`}>
                {t("profile.savedPeaks") || "Saved"}
              </span>
            </div>
            <div className={styles["userStats__totalCardChevron"]}>
              <ChevronRight size={14} />
            </div>
          </div>
        )}

        {/* Saved Shelters Card - Only for current user */}
        {isCurrentUser && (
          <div
            className={styles["userStats__totalCard"]}
            onClick={() => navigate("/saved-shelters")}
          >
            <div className={styles["userStats__totalCardContent"]}>
              <span className={`${styles["userStats__totalCardValue"]} typography-headline-medium`}>
                {formatStatInteger(totalSavedShelters ?? 0)}
              </span>
              <span className={`${styles["userStats__totalCardSuffix"]} typography-label-medium`}>
                {t("profile.savedShelters") || "Saved"}
              </span>
            </div>
            <div className={styles["userStats__totalCardChevron"]}>
              <ChevronRight size={14} />
            </div>
          </div>
        )}

        {/* Total Peaks Card */}
        <div
          className={styles["userStats__totalCard"]}
          onClick={() => navigate(isCurrentUser ? "/userpeaks" : `/userpeaks/${effectiveUserId}`)}
        >
          <div className={styles["userStats__totalCardContent"]}>
            <span className={`${styles["userStats__totalCardValue"]} typography-headline-medium`}>
              {stats?.totals.global.total_peaks !== undefined
                ? formatStatInteger(stats.totals.global.total_peaks)
                : "-"}
            </span>
            <span className={`${styles["userStats__totalCardSuffix"]} typography-label-medium`}>
              {t("userStats.metrics.peaks")}
            </span>
          </div>
          <div className={styles["userStats__totalCardChevron"]}>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Total Routes Card */}
        <div
          className={styles["userStats__totalCard"]}
          onClick={() => navigate(isCurrentUser ? "/userroutes" : `/userroutes/${effectiveUserId}`)}
        >
          <div className={styles["userStats__totalCardContent"]}>
            <span className={`${styles["userStats__totalCardValue"]} typography-headline-medium`}>
              {stats?.totals.global.total_routes !== undefined
                ? formatStatInteger(stats.totals.global.total_routes)
                : "-"}
            </span>
            <span className={`${styles["userStats__totalCardSuffix"]} typography-label-medium`}>
              {t("userStats.metrics.routes")}
            </span>
          </div>
          <div className={styles["userStats__totalCardChevron"]}>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>

      <div className={styles["userStats__listsSection"]}>
        <HomeHeader
          title={isCurrentUser ? t("userStats.peakLists.title") : t("externalProfile.userPeakLists", { userName: stats?.user_name })}
          subtitle={isCurrentUser ? t("userStats.peakListsDescription") : ""}
          isExpanded={challengesExpanded}
          onToggleExpand={toggleChallenges}
        />
        
        <div className={`${styles["userStats__collapsible"]} ${!challengesExpanded ? styles["userStats__collapsible--collapsed"] : ""}`}>
          {/* Challenge Action Buttons - Only for current user */}
          {isCurrentUser && (
            <div className={styles["userStats__challengeButtons"]}>
              <div className={styles["userStats__challengeButtonsRow"]}>
                <button
                  className={styles["userStats__challengeButton"]}
                  onClick={() => setChallengesModalOpen(true)}
                >
                  <Plus size={18} />
                  <span className="typography-button-small">
                    {t("profile.challenges.joinChallenge") || "Join Challenge"}
                  </span>
                </button>
                <button
                  className={styles["userStats__challengeButton"]}
                  onClick={() => navigate("/createlist")}
                >
                  <Edit size={18} />
                  <span className="typography-button-small">
                    {t("profile.challenges.createChallenge") || "Create Challenge"}
                  </span>
                </button>
              </div>
              {createdChallenges.length > 0 && (
                <button
                  className={`${styles["userStats__challengeButton"]} ${styles["userStats__challengeButtonSecondary"]}`}
                  style={{ marginTop: 8 }}
                  onClick={() => setEditChallengesModalOpen(true)}
                >
                  <Pencil size={18} />
                  <span className="typography-button-small">
                    {t("profile.challenges.editMyChallenges") ||
                      "Edit my challenges"}
                  </span>
                </button>
              )}
            </div>
          )}

          {stats?.peaks_per_list && stats.peaks_per_list.length > 0 && (
            <div className={styles["userStats__listsTiles"]}>
              {stats.peaks_per_list.map((item) => {
                const percent = Math.max(
                  0,
                  Math.min(100, item.percent_completed)
                );
                const bgUrl = item.primary_image || undefined;

                return (
                  <div key={item.list_id} className={styles["userStats__listTileWrapper"]}>
                    <button
                      className={styles["userStats__listTile"]}
                      onClick={() => navigate(isCurrentUser ? `/list-details/${item.list_id}` : `/list-details/${item.list_id}/${effectiveUserId}`)}
                      aria-label={`Open ${item.list_name}`}
                    >
                      <div className={styles["userStats__listTileContent"]}>
                      <div
                        className={styles["userStats__listTileImage"]}
                        style={{
                          backgroundImage: bgUrl ? `url(${bgUrl})` : undefined,
                        }}
                      />

                      <div className={styles["userStats__listTileText"]}>
                        <div
                          className={`${styles["userStats__listTileName"]} typography-title-medium`}
                        >
                          {item.list_name}
                        </div>
                        {(item.creator_name || item.creator_image) && (
                          <CreatorBadge
                            name={item.creator_name ?? null}
                            imageUrl={item.creator_image ?? null}
                            className={styles["userStats__listTileCreatorBadge"]}
                            size="md"
                            variant="light"
                          />
                        )}
                        <div
                          className={`${styles["userStats__listTileDesc"]} typography-body-small`}
                        >
                          {isCurrentUser ? t("userStats.peakLists.completedDescription", {
                            completed: formatStatInteger(item.user_completed),
                            total: formatStatInteger(item.total_peaks),
                          }) : t("externalProfile.peakListProgress", {
                            completed: formatStatInteger(item.user_completed),
                            total: formatStatInteger(item.total_peaks),
                          })}
                        </div>
                      </div>

                      <div className={styles["userStats__ringWrapper"]}>
                        <CircularProgressbar
                          value={percent}
                          text={`${percent}%`}
                          strokeWidth={8}
                          styles={buildStyles({
                            pathColor: "#0f172a",
                            trailColor: "rgba(15,23,42,0.18)",
                            textColor: "#0f172a",
                            textSize: "22px",
                          })}
                        />
                      </div>
                    </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {(isCurrentUser || userClubs.length > 0) && (
        <div className={styles["userStats__listsSection"]}>
          <HomeHeader
            title={isCurrentUser ? t("profile.clubs.myClubs") || "My clubs" : t("externalProfile.userClubs", { userName: stats?.user_name }) || "Clubs"}
            subtitle={isCurrentUser ? t("profile.clubs.myClubsDescription") || "Clubs you created or joined." : ""}
            isExpanded={clubsExpanded}
            onToggleExpand={toggleClubs}
          />
          
          <div className={`${styles["userStats__collapsible"]} ${!clubsExpanded ? styles["userStats__collapsible--collapsed"] : ""}`}>
            {isCurrentUser && (
              <div className={styles["userStats__challengeButtons"]}>
                <div className={styles["userStats__challengeButtonsRow"]}>
                  <button
                    className={styles["userStats__challengeButton"]}
                    onClick={() => {
                      trackEvent("interaction", "profile_mobile_join_clubs_modal_open");
                      setJoinClubsModalOpen(true);
                    }}
                  >
                    <Plus size={18} />
                    <span className="typography-button-small">
                      {t("profile.clubs.joinClub") || "Join clubs"}
                    </span>
                  </button>
                  <button
                    className={styles["userStats__challengeButton"]}
                    onClick={() => {
                      trackEvent("navigation", "profile_mobile_create_club_open");
                      navigate("/clubs/create");
                    }}
                  >
                    <Edit size={18} />
                    <span className="typography-button-small">
                      {t("profile.clubs.createClub") || "Create club"}
                    </span>
                  </button>
                </div>
                
                {clubSections.createdClubs.length > 0 && (
                  <button
                    className={`${styles["userStats__challengeButton"]} ${styles["userStats__challengeButtonSecondary"]}`}
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      trackEvent("interaction", "profile_mobile_manage_clubs_modal_open");
                      setManageClubsModalOpen(true);
                    }}
                  >
                    <Users size={18} />
                    <span className="typography-button-small">
                      {t("clubs.actions.manageMyClubs") || "Manage my clubs"}
                    </span>
                  </button>
                )}
              </div>
            )}

            {userClubs.length > 0 && (
              <div className={styles["userStats__listsTiles"]}>
                {userClubs.map((club) => (
                  <div key={club.id} className={styles["userStats__listTileWrapper"]}>
                    <button
                      className={styles["userStats__listTile"]}
                      onClick={() => {
                        trackEvent("navigation", `profile_mobile_open_club_${club.id}`);
                        navigate(`/clubs/${club.id}`);
                      }}
                      aria-label={`Open ${club.name}`}
                    >
                      <div className={styles["userStats__listTileContent"]}>
                        <div
                          className={styles["userStats__listTileImage"]}
                          style={{
                            backgroundImage: club.image ? `url(${club.image})` : undefined,
                            backgroundColor: club.image ? undefined : "rgba(15, 23, 42, 0.04)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {!club.image && <Users size={18} style={{ color: "rgba(15, 23, 42, 0.3)" }} />}
                        </div>

                        <div className={styles["userStats__listTileText"]}>
                          <div className={`${styles["userStats__listTileName"]} typography-title-medium`}>
                            {club.name}
                          </div>
                          <div className={`${styles["user-stats__tile-meta"]} typography-body-small`}>
                            <div className={styles["user-stats__tile-meta-item"]}>
                              <Users size={14} style={{ opacity: 0.6 }} />
                              <span>{club.member_count.toLocaleString()}</span>
                            </div>
                            <div className={styles["user-stats__tile-meta-item"]}>
                              <MountainIcon size={14} />
                              <span>{club.distinct_peak_count?.toLocaleString() || 0}</span>
                            </div>
                            {club.admin_hierarchy && (
                              <div className={`${styles["user-stats__tile-meta-item"]} ${styles["user-stats__tile-meta-item--location"]}`}>
                                <span>{getLocationFromHierarchy(club.admin_hierarchy)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid - Affected by activity filter */}
      <div className={styles["userStats__cardFull"]}>
        <HomeHeader
          title={isCurrentUser ? (t("userStats.statistics") || "Statistics") : t("externalProfile.performanceOverview")}
          subtitle={isCurrentUser ? t("userStats.statisticsDescription") : ""}
          rightContent={{
            type: "dropdown",
            dropdownOptions: activities.map((activity) => ({
              value: activity,
              label: getActivityDisplayName(activity),
            })),
            selectedValue: activityFilter,
            onDropdownChange: (value) => {
              setActivityFilter(value as ActivityFilter);
            },
          }}
        />
        <div className={styles["userStats__grid"]}>
          <div className={styles["userStats__statItem"]}>
            <div className={styles["userStats__statHeader"]}>
              <div
                className={`${styles["userStats__statLabel"]} typography-label-medium`}
              >
                {t("userStats.metrics.distance")}
              </div>
            </div>
            <div
              className={`${styles["userStats__statValue"]} typography-title-medium`}
            >
              {formatStatDistance(currentStats?.total_distance_km ?? 0)}
            </div>
          </div>
          <div className={styles["userStats__statItem"]}>
            <div className={styles["userStats__statHeader"]}>
              <div
                className={`${styles["userStats__statLabel"]} typography-label-medium`}
              >
                {t("userStats.metrics.elevationGain")}
              </div>
            </div>
            <div
              className={`${styles["userStats__statValue"]} typography-title-medium`}
            >
              {formatStatElevationGain(currentStats?.total_elevation_gain ?? 0)}
            </div>
          </div>
          <div className={styles["userStats__statItem"]}>
            <div className={styles["userStats__statHeader"]}>
              <div
                className={`${styles["userStats__statLabel"]} typography-label-medium`}
              >
                {t("userStats.metrics.totalTime")}
              </div>
            </div>
            <div
              className={`${styles["userStats__statValue"]} typography-title-medium`}
            >
              {formatStatDuration(currentStats?.total_time_seconds ?? 0)}
            </div>
          </div>
          <div className={styles["userStats__statItem"]}>
            <div className={styles["userStats__statHeader"]}>
              <div
                className={`${styles["userStats__statLabel"]} typography-label-medium`}
              >
                {t("userStats.metrics.movingTime")}
              </div>
            </div>
            <div
              className={`${styles["userStats__statValue"]} typography-title-medium`}
            >
              {formatStatDuration(currentStats?.total_moving_time_seconds ?? 0)}
            </div>
          </div>
        </div>

        {/* View in charts button */}
        {graph && (
          <button
            className={styles["userStats__viewChartsButton"]}
            onClick={() => setGraphOpen(true)}
          >
            <TrendingUp size={18} />
            <span className="typography-button-small">
              {t("userStats.viewInCharts") || "Ver en gráficas"}
            </span>
          </button>
        )}
      </div>

      {/* Fullscreen modal graph - Optimized for landscape (rotated phone) */}
      {graphOpen && graph && (
        <div
          className={styles["userStats__modalBackdrop"]}
          onClick={() => setGraphOpen(false)}
        >
          <div
            className={styles["userStats__modal"]}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - top right */}
            <div className={styles["userStats__modalHeader"]}>
              <button
                onClick={() => setGraphOpen(false)}
                aria-label="Close"
                className={styles["userStats__closeButton"]}
              >
                <X size={24} />
              </button>
            </div>

            {/* Rotation overlay - shown when device is not in landscape */}
            {!isLandscape && (
              <div className={styles["userStats__rotateOverlay"]}>
                <X size={24} style={{position:"absolute", top:"10px", right:"10px"}} onClick={() => setGraphOpen(false)}/>
                <div className={styles["userStats__rotateContent"]}>
                  <span className="typography-title-medium">
                    {t("userStats.rotatePhone")}
                  </span>
                </div>
              </div>
            )}

            {/* Chart takes maximum space */}
            <div className={styles["userStats__modalBody"]}>
              <StatsChart
                data={graph}
                metric={metric}
                activityFilter={activityFilter}
                timeAggregation={timeAggregation}
                customStartDate={customStartDate}
                customEndDate={customEndDate}
              />
            </div>

            {/* Compact controls sidebar */}
            <div className={styles["userStats__modalControls"]}>
              {/* Metric Selection - Always visible */}
              <div className={styles["userStats__metricButtons"]}>
                {(
                  [
                    "peaks",
                    "distance",
                    "elevation_gain",
                    "time",
                    "moving_time",
                  ] as MetricKey[]
                ).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetric(m)}
                    className={`${styles["userStats__metricButton"]} ${
                      m === metric ? styles["userStats__metricButtonActive"] : ""
                    }`}
                  >
                    <span className="typography-button-small">
                      {t(
                        `userStats.metrics.${
                          m === "elevation_gain"
                            ? "elevationGain"
                            : m === "moving_time"
                            ? "movingTime"
                            : m
                        }`
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {/* Trigger buttons at bottom */}
              <div className={styles["userStats__triggerButtonsContainer"]}>
                {/* Group By Button */}
                <button
                  onClick={() => setGroupByPopupOpen(true)}
                  className={styles["userStats__popupTriggerButton"]}
                >
                  <Calendar size={16} />
                  <div className={styles["userStats__popupTriggerContent"]}>
                    <span
                      className={`${styles["userStats__popupTriggerLabel"]} typography-label-small`}
                    >
                      {t("userStats.controls.groupBy")}
                    </span>
                    <span
                      className={`${styles["userStats__popupTriggerValue"]} typography-body-small`}
                    >
                      {getTimeAggregationLabel(timeAggregation)}
                    </span>
                  </div>
                </button>

                {/* Activity Type Button */}
                <button
                  onClick={() => setActivityPopupOpen(true)}
                  className={styles["userStats__popupTriggerButton"]}
                >
                  <Activity size={16} />
                  <div className={styles["userStats__popupTriggerContent"]}>
                    <span
                      className={`${styles["userStats__popupTriggerLabel"]} typography-label-small`}
                    >
                      {t("userStats.controls.activityType")}
                    </span>
                    <span
                      className={`${styles["userStats__popupTriggerValue"]} typography-body-small`}
                    >
                      {getActivityDisplayName(activityFilter)}
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Group By Popup */}
            {groupByPopupOpen && (
              <div
                className={styles["userStats__popupOverlay"]}
                onClick={() => setGroupByPopupOpen(false)}
              >
                <div
                  className={styles["userStats__popupContent"]}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles["userStats__popupHeader"]}>
                    <h3
                      className={`${styles["userStats__popupTitle"]} typography-title-small`}
                    >
                      <Calendar size={20} />
                      {t("userStats.controls.groupBy")}
                    </h3>
                    <button
                      onClick={() => setGroupByPopupOpen(false)}
                      className={styles["userStats__popupClose"]}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className={styles["userStats__popupBody"]}>
                    <div className={styles["userStats__popupOptions"]}>
                      {(
                        [
                          "daily",
                          "weekly",
                          "monthly",
                          "yearly",
                          "custom",
                        ] as TimeAggregation[]
                      ).map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setTimeAggregation(t);
                            if (t !== "custom") {
                              setGroupByPopupOpen(false);
                            }
                          }}
                          className={`${styles["userStats__popupOption"]} ${
                            t === timeAggregation
                              ? styles["userStats__popupOptionActive"]
                              : ""
                          }`}
                        >
                          <span className="typography-body-small">
                            {getTimeAggregationLabel(t)}
                          </span>
                        </button>
                      ))}
                    </div>
                    {timeAggregation === "custom" && (
                      <div className={styles["userStats__popupCustomDates"]}>
                        <SingleDatePicker
                          buttonLabel={t("userStats.controls.startDate")}
                          initialDate={customStartDate}
                          onDateChange={setCustomStartDate}
                          isActive={!!customStartDate}
                        />
                        <SingleDatePicker
                          buttonLabel={t("userStats.controls.endDate")}
                          initialDate={customEndDate}
                          onDateChange={setCustomEndDate}
                          isActive={!!customEndDate}
                        />
                        <button
                          onClick={() => setGroupByPopupOpen(false)}
                          className={styles["userStats__popupApplyButton"]}
                        >
                          <span className="typography-button-small">
                            {t("userStats.controls.apply")}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Activity Type Popup */}
            {activityPopupOpen && (
              <div
                className={styles["userStats__popupOverlay"]}
                onClick={() => setActivityPopupOpen(false)}
              >
                <div
                  className={styles["userStats__popupContent"]}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles["userStats__popupHeader"]}>
                    <h3
                      className={`${styles["userStats__popupTitle"]} typography-title-small`}
                    >
                      <Activity size={20} />
                      {t("userStats.controls.activityType")}
                    </h3>
                    <button
                      onClick={() => setActivityPopupOpen(false)}
                      className={styles["userStats__popupClose"]}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className={styles["userStats__popupBody"]}>
                    <div className={styles["userStats__popupOptions"]}>
                      {activities.map((a, idx) => (
                        <button
                          key={`activity-${String(a)}-${idx}`}
                          onClick={() => {
                            setActivityFilter(a);
                            setActivityPopupOpen(false);
                          }}
                          className={`${styles["userStats__popupOption"]} ${
                            a === activityFilter
                              ? styles["userStats__popupOptionActive"]
                              : ""
                          }`}
                        >
                          <span className="typography-body-small">
                            {getActivityDisplayName(a)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Challenges Modal - Only for current user */}
      <ChallengesModal
        isOpen={challengesModalOpen}
        onClose={() => setChallengesModalOpen(false)}
        onUpdate={async () => {
          // Refresh stats when challenges are updated
          try {
            const updatedStats = await getUserStats();
            setStats(updatedStats);
          } catch (error) {
            console.error("Failed to refresh stats:", error);
          }
        }}
      />

      <EditChallengesModal
        isOpen={editChallengesModalOpen}
        onClose={() => setEditChallengesModalOpen(false)}
        challenges={createdChallenges}
      />

      {isCurrentUser && (
        <>
          <JoinClubsModal
            isOpen={joinClubsModalOpen}
            onClose={() => setJoinClubsModalOpen(false)}
            onUpdate={() => myClubsQuery.refetch()}
          />
          
          <ManageClubsModal
            isOpen={manageClubsModalOpen}
            onClose={() => setManageClubsModalOpen(false)}
            createdClubs={clubSections.createdClubs}
          />
        </>
      )}
    </div>
  );
};

export default UserStatisticsSection;
