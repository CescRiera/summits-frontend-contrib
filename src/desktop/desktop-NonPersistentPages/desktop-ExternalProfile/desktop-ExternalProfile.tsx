import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Lock,
  UserPlus,
  UserCheck,
  Trophy,
  ChevronRight,
  X,
  Mail,
  Clock,
} from "lucide-react";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import LoginRequiredPopup from "../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup.tsx";
import styles from "./desktop-ExternalProfile.module.css";
import { useOptionalOverlayContext } from "../../desktop-components/desktop-Overlay/desktop-OverlayContext.tsx";
import {
  getUserStats,
  getStatsGraph,
} from "../../../shared/api/endpoints/user";
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowCounts,
  getFollowers,
  getFollowing,
} from "../../../shared/api/endpoints/follows";
import type {
  UserStatsResponse,
  GetFollowCountsResponse,
  StatsGraphResponse,
  GetFollowersResponse,
  GetFollowingResponse,
} from "../../../shared/api/types";
import StatsChart, { type TimeAggregation } from "../../desktop-PersistentPages/desktop-Profile/desktop-components/desktop-StatsChart.tsx";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  formatStatDuration,
  formatStatInteger,
} from "../../../mobile/utils/numberFormatting.ts";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import CreatorBadge from "../../../shared/components/CreatorBadge/CreatorBadge";
import AppModal from "../../../shared/components/AppModal";

type ActivityFilter = "all" | string;
type MetricKey =
  | "distance"
  | "elevation_gain"
  | "time"
  | "moving_time"
  | "peaks"
  | "routes";

const renderStrongText = (text: string) =>
  text
    .split(/(<strong>.*?<\/strong>)/g)
    .filter(Boolean)
    .map((part, index) => {
      const match = part.match(/^<strong>(.*)<\/strong>$/);
      if (match) {
        return <strong key={`strong-${index}`}>{match[1]}</strong>;
      }
      return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
    });

const ExternalProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { id } = useParams<{ id: string }>();
  const overlayContext = useOptionalOverlayContext();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [graph, setGraph] = useState<StatsGraphResponse | null>(null);
  const [followCounts, setFollowCounts] =
    useState<GetFollowCountsResponse | null>(null);
  const { formatStatDistance, formatStatElevationGain } = useUnitFormat();

  const [followStatus, setFollowStatus] = useState<
    "none" | "pending" | "following"
  >("none");
  const [followLoading, setFollowLoading] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [metric, setMetric] = useState<MetricKey>("peaks");
  const [timeAggregation, setTimeAggregation] =
    useState<TimeAggregation>("daily");
  const [customStartDate] = useState<string | null>(null);
  const [customEndDate] = useState<string | null>(null);
  const [showFollowersBox, setShowFollowersBox] = useState(false);
  const [showFollowingBox, setShowFollowingBox] = useState(false);
  const [followers, setFollowers] = useState<GetFollowersResponse | null>(null);
  const [following, setFollowing] = useState<GetFollowingResponse | null>(null);
  const [followsLoading, setFollowsLoading] = useState(false);

  type UserStatsWithTotals = UserStatsResponse & { rank_total_users?: number };
  const statsWith: UserStatsWithTotals | null =
    (stats as UserStatsWithTotals) || null;



  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    // Check if user is trying to view their own profile
    if (user && user.internalUserId === parseInt(id)) {
      // Use replace instead of navigate to prevent back button issues
      navigate("/profile", { replace: true });
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const [s, g, counts, following] = await Promise.all([
          getUserStats(id),
          getStatsGraph(id),
          getFollowCounts({ user_id: parseInt(id) }),
          user
            ? isFollowing({ user_id: parseInt(id) })
            : Promise.resolve({
                is_following: false,
                is_pending: false,
                status: null,
              }),
        ]);
        setStats(s);
        setGraph(g);
        setFollowCounts(counts);
        setFollowStatus(
          following.is_following
            ? "following"
            : following.is_pending
            ? "pending"
            : "none"
        );
      } catch (e) {
        console.error("Failed to load external profile", e);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, user, navigate]);

  // Update overlay name for breadcrumbs when stats load
  useEffect(() => {
    if (!stats?.user_name || !id || !overlayContext) return;

    const baseStorageKey = `externalprofile:${id}`;

    // Find the overlay in the stack that matches this external profile
    const matchingOverlay = overlayContext.overlayStack.find(
      (overlay) => overlay.baseStorageKey === baseStorageKey
    );

    // Only update if the name is different to avoid unnecessary updates
    if (matchingOverlay && matchingOverlay.name !== stats.user_name) {
      overlayContext.updateOverlayNameByBaseKey(
        baseStorageKey,
        stats.user_name
      );
    }
  }, [stats?.user_name, id, overlayContext]);

  const activities = useMemo(() => {
    const rawActivities =
      stats?.totals.by_activity?.map((a) => a.activity_type ?? "unknown") || [];
    const uniqueActivities = Array.from(new Set(rawActivities));
    return ["all", ...uniqueActivities] as ActivityFilter[];
  }, [stats]);

  const getActivityDisplayName = (activity: ActivityFilter): string => {
    if (activity === "all") {
      return t("userStats.activityFilter.all");
    }
    if (!activity || activity === "unknown") {
      return t("userStats.activityFilter.unknown") || "Unknown";
    }
    return activity;
  };

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

  const handleFollowToggle = async () => {
    if (!user) {
      trackEvent("social", "external_profile_desktop_follow_requires_login");
      setShowLoginPopup(true);
      return;
    }

    if (!id) return;

    try {
      setFollowLoading(true);
      if (followStatus !== "none") {
        trackEvent("social", "external_profile_desktop_unfollow_attempt");
        await unfollowUser({ following_id: parseInt(id) });
        setFollowStatus("none");
        // Refresh follow counts
        const updatedCounts = await getFollowCounts({ user_id: parseInt(id) });
        setFollowCounts(updatedCounts);
      } else {
        trackEvent("social", "external_profile_desktop_follow_attempt");
        const resp = await followUser({ following_id: parseInt(id) });
        const pendingStatus = (resp as any)?.status;
        if (resp && pendingStatus === "pending") {
          setFollowStatus("pending");
          trackEvent("social", "external_profile_desktop_follow_pending");
          // For pending requests, counts typically do not change
        } else {
          setFollowStatus("following");
          trackEvent("social", "external_profile_desktop_follow_success");
          // Refresh follow counts only when actually following
          const updatedCounts = await getFollowCounts({
            user_id: parseInt(id),
          });
          setFollowCounts(updatedCounts);
        }
      }
    } catch (error) {
      trackEvent("social", "external_profile_desktop_follow_toggle_failed");
      console.error("Failed to toggle follow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const canViewStats = () => {
    if (!stats) return false;
    return !stats.is_private || followStatus === "following";
  };

  const handleFollowersClick = async () => {
    trackEvent("social", "external_profile_desktop_followers_open");
    if (!followers) {
      try {
        setFollowsLoading(true);
        const followersData = await getFollowers({ user_id: parseInt(id!) });
        setFollowers(followersData);
      } catch (error) {
        console.error("Failed to fetch followers:", error);
      } finally {
        setFollowsLoading(false);
      }
    }
    setShowFollowersBox(true);
  };

  const handleFollowingClick = async () => {
    trackEvent("social", "external_profile_desktop_following_open");
    if (!following) {
      try {
        setFollowsLoading(true);
        const followingData = await getFollowing({ user_id: parseInt(id!) });
        setFollowing(followingData);
      } catch (error) {
        console.error("Failed to fetch following:", error);
      } finally {
        setFollowsLoading(false);
      }
    }
    setShowFollowingBox(true);
  };

  const handleUserClick = (userId: number) => {
    trackEvent("navigation", `external_profile_desktop_user_click_${userId}`);
    // Check if it's the current user
    if (
      user &&
      parseInt(user.internalUserId as any, 10) === parseInt(userId as any, 10)
    ) {
      navigate("/profile");
    } else {
      navigate(`/externalprofile/${userId}`);
    }
  };

  if (loading) {
    return (
      <div className={styles["externalProfile"]}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={styles["externalProfile"]}>
        <div
          className={`${styles["externalProfile__error"]} typography-desktop-label-medium`}
        >
          <h2 className="typography-desktop-body-medium">
            {t("externalProfile.userNotFound")}
          </h2>
          <p className="typography-desktop-body-small">
            {t("externalProfile.userNotFoundMessage")}
          </p>
          <button
            className={`${styles["externalProfile__go-back-button"]} typography-desktop-label-large`}
            onClick={() => {
              trackEvent("navigation", "external_profile_desktop_error_root");
              navigate("/");
            }}
          >
            {t("common.goBack")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["externalProfile"]}>
      {/* Grid Container */}
      <div className={styles["externalProfile__container"]}>
        {/* Left Column */}
        <div className={styles["externalProfile__left-column"]}>
          {/* User Info Cell */}
          <div className={styles["externalProfile__cell"]}>
            <div className={styles["externalProfile__user-info"]}>
              <div
                className={`${styles["externalProfile__avatar"]} typography-desktop-display-xxl`}
              >
                {stats.user_image ? (
                  <img
                    src={stats.user_image}
                    alt="Profile"
                    className={styles["externalProfile__avatar-image"]}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML =
                          stats.user_name?.charAt(0)?.toUpperCase() || "U";
                      }
                    }}
                  />
                ) : (
                  stats.user_name?.charAt(0)?.toUpperCase() || "U"
                )}
              </div>
              <h1
                className={`${styles["externalProfile__username"]} typography-desktop-title-large`}
              >
                {stats.user_name || t("externalProfile.unknownUser")}
              </h1>

              <div className={styles["externalProfile__stats-row"]}>
                <div className={styles["externalProfile__stat-item"]}>
                  <span
                    className={`${styles["externalProfile__stat-number"]} typography-desktop-title-large`}
                  >
                    {formatStatInteger(stats.totals.global.total_peaks ?? 0)}
                  </span>
                  <span
                    className={`${styles["externalProfile__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("profile.follows.peaks")}
                  </span>
                </div>
                <div
                  className={styles["externalProfile__stat-item"]}
                  onClick={handleFollowersClick}
                >
                  <span
                    className={`${styles["externalProfile__stat-number"]} typography-desktop-title-large`}
                  >
                    {formatStatInteger(followCounts?.followers_count ?? 0)}
                  </span>
                  <span
                    className={`${styles["externalProfile__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("profile.follows.followers")}
                  </span>
                </div>
                <div
                  className={styles["externalProfile__stat-item"]}
                  onClick={handleFollowingClick}
                >
                  <span
                    className={`${styles["externalProfile__stat-number"]} typography-desktop-title-large`}
                  >
                    {formatStatInteger(followCounts?.following_count ?? 0)}
                  </span>
                  <span
                    className={`${styles["externalProfile__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("profile.follows.following")}
                  </span>
                </div>
              </div>

              <button
                className={`${styles["externalProfile__follow-button"]} typography-label-large ${
                  followStatus === "following"
                    ? styles["externalProfile__follow-button--following"]
                    : followStatus === "pending"
                    ? styles["externalProfile__follow-button--pending"]
                    : ""
                }`}
                onClick={handleFollowToggle}
                disabled={followLoading}
              >
                {followStatus === "following" ? (
                  <>
                    <UserCheck size={16} />
                    {t("externalProfile.following")}
                  </>
                ) : followStatus === "pending" ? (
                  <>
                    <Clock size={16} />
                    {t("externalProfile.requestPending") || "Requested"}
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    {t("externalProfile.follow")}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Achievement Badge - Rank */}
          {canViewStats() && typeof stats.rank !== "undefined" && (
            <div className={styles["externalProfile__cell"]}>
              <div
                className={styles["externalProfile__achievement"]}
                onClick={() =>
                  {
                    trackEvent("navigation", "external_profile_desktop_rank_open_leaderboard");
                    navigate("/leaderboard?tab=world&sort_mode=contributors");
                  }
                }
              >
                <div className={styles["externalProfile__achievement-icon"]}>
                  <Trophy size={20} />
                </div>
                <div className={styles["externalProfile__achievement-content"]}>
                  <div
                    className={`${styles["externalProfile__achievement-title"]} typography-desktop-label-medium`}
                  >
                    <strong className="typography-desktop-body-small">
                      #{formatStatInteger(stats.rank ?? 0)}
                    </strong>{" "}
                    {t("externalProfile.rankTitle", {
                      userName: stats.user_name,
                    })}
                  </div>
                  <div
                    className={`${styles["externalProfile__achievement-subtitle"]} typography-desktop-label-medium`}
                  >
                    {renderStrongText(
                      t("externalProfile.rankDescription", {
                        rank: formatStatInteger(stats.rank ?? 0),
                        totalUsers: formatStatInteger(
                          statsWith?.rank_total_users ?? 0
                        ),
                      })
                    )}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className={styles["externalProfile__achievement-arrow"]}
                />
              </div>
            </div>
          )}

          {/* Peak Lists */}
          {canViewStats() &&
            stats.peaks_per_list &&
            stats.peaks_per_list.length > 0 && (
              <div className={styles["externalProfile__cell"]}>
                <div
                  className={`${styles["externalProfile__cell-title"]} typography-desktop-title-small`}
                >
                  {t("externalProfile.userPeakLists", {
                    userName: stats.user_name,
                  })}
                </div>
                <div className={styles["externalProfile__lists"]}>
                  {stats.peaks_per_list.map((item) => {
                    const percent = Math.max(
                      0,
                      Math.min(100, item.percent_completed)
                    );
                      const bgUrl = item.primary_image || undefined;
                      return (
                        <button
                          key={item.list_id}
                          className={styles["externalProfile__list-tile"]}
                          onClick={() =>
                            navigate(`/list-details/${item.list_id}/${id}`)
                          }
                          aria-label={`Open ${item.list_name}`}
                        >
                          <div
                            className={
                              styles["externalProfile__list-tile-content"]
                            }
                          >
                            <div
                              className={
                                styles["externalProfile__list-tile-image"]
                              }
                              style={{ backgroundImage: bgUrl ? `url(${bgUrl})` : undefined }}
                            />
                          <div
                            className={
                              styles["externalProfile__list-tile-text"]
                            }
                          >
                          <div
                            className={`${styles["externalProfile__list-tile-name"]} typography-desktop-title-medium`}
                          >
                            {item.list_name}
                          </div>
                          {(item.creator_name || item.creator_image) && (
                            <CreatorBadge
                              name={item.creator_name ?? null}
                              imageUrl={item.creator_image ?? null}
                              className={styles["externalProfile__list-tile-creator"]}
                              size="md"
                              variant="light"
                            />
                          )}
                          <div
                            className={`${styles["externalProfile__list-tile-desc"]} typography-desktop-body-small`}
                          >
                              {t("externalProfile.peakListProgress", {
                                completed: formatStatInteger(item.user_completed),
                                total: formatStatInteger(item.total_peaks),
                              })}
                            </div>
                          </div>
                          <div
                            className={styles["externalProfile__ring-wrapper"]}
                          >
                            <CircularProgressbar
                              value={percent}
                              text={`${percent}%`}
                              strokeWidth={8}
                              styles={buildStyles({
                                pathColor: "rgb(30, 41, 59)",
                                trailColor: "rgba(30, 41, 59, 0.18)",
                                textColor: "#0f172a",
                                textSize: "22px",
                              })}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
        </div>

        {/* Right Column */}
        <div className={styles["externalProfile__right-column"]}>
          {/* Content based on privacy and follow status */}
          {!canViewStats() ? (
            <div className={styles["externalProfile__cell"]}>
              <div className={styles["externalProfile__private-content"]}>
                <div className={styles["externalProfile__lock-icon"]}>
                  <Lock size={48} color="rgba(15, 23, 42, 0.3)" />
                </div>
                <h3 className="typography-desktop-body-small">
                  {t("externalProfile.privateProfile")}
                </h3>
                <p className="typography-desktop-body-small">
                  {t("externalProfile.privateProfileMessage")}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Total Peaks and Routes */}
              <div className={styles["externalProfile__cell"]}>
                <div className={styles["externalProfile__unified-stats"]}>
                  {/* User Peaks Section */}
                  <div
                    className={styles["externalProfile__unified-stat"]}
                    onClick={() => {
                      trackEvent("navigation", "external_profile_desktop_open_user_peaks");
                      navigate(`/userpeaks/${id}`);
                    }}
                  >
                    <span
                      className={`${styles["externalProfile__unified-stat-text"]} typography-desktop-body-medium`}
                    >
                      {t("externalProfile.userPeaksWithCount", {
                        userName: stats.user_name,
                        count: formatStatInteger(
                          stats?.totals.global.total_peaks ?? 0
                        ),
                      })}
                    </span>
                    <ChevronRight
                      size={16}
                      className={styles["externalProfile__unified-stat-arrow"]}
                    />
                  </div>

                  {/* User Routes Section */}
                  <div
                    className={styles["externalProfile__unified-stat"]}
                    onClick={() => {
                      trackEvent("navigation", "external_profile_desktop_open_user_routes");
                      navigate(`/userroutes/${id}`);
                    }}
                  >
                    <span
                      className={`${styles["externalProfile__unified-stat-text"]} typography-desktop-body-medium`}
                    >
                      {t("externalProfile.userRoutesWithCount", {
                        userName: stats.user_name,
                        count: formatStatInteger(
                          stats?.totals.global.total_routes ?? 0
                        ),
                      })}
                    </span>
                    <ChevronRight
                      size={16}
                      className={styles["externalProfile__unified-stat-arrow"]}
                    />
                  </div>
                </div>
              </div>

              {/* Performance Overview */}
              <div className={styles["externalProfile__cell"]}>
                <div className={styles["externalProfile__cell-header"]}>
                  <div
                    className={`${styles["externalProfile__cell-title"]} typography-desktop-title-small`}
                  >
                    {t("externalProfile.performanceOverview")}
                  </div>
                  {stats && activities.length > 0 && (
                    <select
                      className={`${styles["externalProfile__activity-filter"]} typography-desktop-label-medium`}
                      value={activityFilter}
                      onChange={(e) => {
                        trackEvent(
                          "filter_change",
                          `external_profile_desktop_activity_${e.target.value}`
                        );
                        setActivityFilter(e.target.value as ActivityFilter);
                      }}
                    >
                      {activities.map((activity) => (
                        <option key={activity} value={activity}>
                          {getActivityDisplayName(activity)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={styles["externalProfile__performance-metrics"]}>
                  <div className={styles["externalProfile__metric-circle"]}>
                    <div
                      className={`${styles["externalProfile__metric-value"]} typography-desktop-headline-small`}
                    >
                      {formatStatDistance(currentStats?.total_distance_km ?? 0)}
                    </div>
                    <div
                      className={`${styles["externalProfile__metric-label"]} typography-desktop-label-medium`}
                    >
                      {t("userStats.metrics.distance")}
                    </div>
                  </div>

                  <div className={styles["externalProfile__metric-circle"]}>
                    <div
                      className={`${styles["externalProfile__metric-value"]} typography-desktop-headline-small`}
                    >
                      {formatStatElevationGain(
                        currentStats?.total_elevation_gain ?? 0
                      )}
                    </div>
                    <div
                      className={`${styles["externalProfile__metric-label"]} typography-desktop-label-medium`}
                    >
                      {t("userStats.metrics.elevationGain")}
                    </div>
                  </div>

                  <div className={styles["externalProfile__metric-circle"]}>
                    <div
                      className={`${styles["externalProfile__metric-value"]} typography-desktop-headline-small`}
                    >
                      {formatStatDuration(
                        currentStats?.total_time_seconds ?? 0
                      )}
                    </div>
                    <div
                      className={`${styles["externalProfile__metric-label"]} typography-desktop-label-medium`}
                    >
                      {t("userStats.metrics.totalTime")}
                    </div>
                  </div>

                  <div className={styles["externalProfile__achievement-card"]}>
                    <div
                      className={`${styles["externalProfile__achievement-number"]} typography-desktop-headline-small`}
                    >
                      {formatStatInteger(currentStats?.total_peaks ?? 0)}
                    </div>
                    <div
                      className={`${styles["externalProfile__achievement-text"]} typography-desktop-label-medium`}
                    >
                      {t("userStats.metrics.peaks")}
                    </div>
                  </div>

                  <div className={styles["externalProfile__achievement-card"]}>
                    <div
                      className={`${styles["externalProfile__achievement-number"]} typography-desktop-headline-small`}
                    >
                      {formatStatInteger(currentStats?.total_routes ?? 0)}
                    </div>
                    <div
                      className={`${styles["externalProfile__achievement-text"]} typography-desktop-label-medium`}
                    >
                      {t("userStats.metrics.routes")}
                    </div>
                  </div>

                  <div className={styles["externalProfile__achievement-card"]}>
                    <div
                      className={`${styles["externalProfile__achievement-number"]} typography-desktop-headline-small`}
                    >
                      {formatStatDuration(
                        currentStats?.total_moving_time_seconds ?? 0
                      )}
                    </div>
                    <div
                      className={`${styles["externalProfile__achievement-text"]} typography-desktop-label-medium`}
                    >
                      {t("userStats.metrics.movingTime")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Graph */}
              {graph && (
                <div className={styles["externalProfile__cell"]}>
                  <div
                    className={`${styles["externalProfile__cell-title"]} typography-desktop-title-small`}
                  >
                    {t("userStats.graph")}
                  </div>

                  {/* Graph Controls */}
                  <div className={styles["externalProfile__graph-controls"]}>
                    {/* Metric Tabs */}
                    <div className={styles["externalProfile__metric-tabs"]}>
                      {[
                        {
                          key: "peaks" as const,
                          label: t("userStats.metrics.peaks"),
                        },
                        {
                          key: "distance" as const,
                          label: t("userStats.metrics.distance"),
                        },
                        {
                          key: "elevation_gain" as const,
                          label: t("userStats.metrics.elevationGain"),
                        },
                        {
                          key: "time" as const,
                          label: t("userStats.metrics.totalTime"),
                        },
                        {
                          key: "moving_time" as const,
                          label: t("userStats.metrics.movingTime"),
                        },
                        {
                          key: "routes" as const,
                          label: t("userStats.metrics.routes"),
                        },
                      ].map((m) => (
                        <button
                          key={m.key}
                          className={`${
                            styles["externalProfile__metric-tab"]
                          } typography-label-large ${
                            metric === m.key
                              ? styles["externalProfile__metric-tab--active"]
                              : ""
                          }`}
                          onClick={() => {
                            trackEvent(
                              "filter_change",
                              `external_profile_desktop_metric_${m.key}`
                            );
                            setMetric(m.key);
                          }}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Filters */}
                    <div className={styles["externalProfile__graph-filters"]}>
                      {/* Time Aggregation */}
                      <select
                        className={`${styles["externalProfile__graph-select"]} typography-desktop-label-medium`}
                        value={timeAggregation}
                        onChange={(e) => {
                          trackEvent(
                            "filter_change",
                            `external_profile_desktop_group_by_${e.target.value}`
                          );
                          setTimeAggregation(e.target.value as TimeAggregation);
                        }}
                      >
                        <option value="daily">
                          {t("userStats.timeAggregation.daily")}
                        </option>
                        <option value="weekly">
                          {t("userStats.timeAggregation.weekly")}
                        </option>
                        <option value="monthly">
                          {t("userStats.timeAggregation.monthly")}
                        </option>
                        <option value="yearly">
                          {t("userStats.timeAggregation.yearly")}
                        </option>
                      </select>

                      {/* Activity Filter */}
                      {activities.length > 0 && (
                        <select
                          className={`${styles["externalProfile__graph-select"]} typography-desktop-label-medium`}
                          value={activityFilter}
                          onChange={(e) => {
                            trackEvent(
                              "filter_change",
                              `external_profile_desktop_graph_activity_${e.target.value}`
                            );
                            setActivityFilter(e.target.value as ActivityFilter);
                          }}
                        >
                          {activities.map((activity) => (
                            <option key={activity} value={activity}>
                              {getActivityDisplayName(activity)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className={styles["externalProfile__graph-container"]}>
                    <StatsChart
                      data={graph}
                      metric={metric}
                      activityFilter={activityFilter}
                      timeAggregation={timeAggregation}
                      customStartDate={customStartDate}
                      customEndDate={customEndDate}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Login Required Popup */}
      <LoginRequiredPopup
        isOpen={showLoginPopup}
        onClose={() => {
          trackEvent("interaction", "external_profile_desktop_login_popup_close");
          setShowLoginPopup(false);
        }}
        message="auth.loginRequired.followUser"
      />

      {/* Followers Popup with Overlay */}
      {showFollowersBox && (
        <AppModal
          open={showFollowersBox}
          onClose={() => {
            trackEvent("interaction", "external_profile_desktop_followers_close_overlay");
            setShowFollowersBox(false);
          }}
          variant="dialog"
          contentClassName={styles["externalProfile__requests-popup"]}
          ariaLabel={t("profile.follows.followers")}
        >
          <div>
            <div className={styles["externalProfile__requests-header"]}>
              <h3 className="typography-desktop-body-small">
                {t("profile.follows.followers")}
              </h3>
              <button
                className={styles["externalProfile__requests-close"]}
                onClick={() => {
                  trackEvent("interaction", "external_profile_desktop_followers_close_button");
                  setShowFollowersBox(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles["externalProfile__requests-list"]}>
              {followsLoading ? (
                <div className={styles["externalProfile__no-requests"]}>
                  <div
                    className={styles["externalProfile__loading-spinner"]}
                  ></div>
                  <p className="typography-desktop-body-small">
                    {t("common.loading")}
                  </p>
                </div>
              ) : followers && followers.count > 0 ? (
                followers.followers.map((follower) => (
                  <div
                    key={follower.follower_id}
                    className={`${styles["externalProfile__request-item"]} ${
                      user && user.internalUserId === follower.follower_id
                        ? styles["externalProfile__request-item--current-user"]
                        : ""
                    }`}
                    onClick={() => handleUserClick(follower.follower_id)}
                  >
                    <div className={styles["externalProfile__request-user"]}>
                      <div
                        className={`${styles["externalProfile__request-avatar"]} typography-desktop-label-small`}
                      >
                        {follower.image ? (
                          <img
                            src={follower.image}
                            alt={follower.name}
                            className={
                              styles["externalProfile__request-avatar-image"]
                            }
                          />
                        ) : (
                          follower.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={styles["externalProfile__request-info"]}>
                        <span
                          className={`${styles["externalProfile__request-name"]} typography-desktop-body-small`}
                        >
                          {follower.name}
                        </span>
                        <span
                          className={`${styles["externalProfile__request-type"]} typography-desktop-label-medium`}
                        >
                          {follower.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles["externalProfile__no-requests"]}>
                  <Mail size={48} color="rgba(15, 23, 42, 0.3)" />
                  <h3 className="typography-desktop-body-small">
                    {t("profile.follows.noFollowers")}
                  </h3>
                  <p className="typography-desktop-body-small">
                    {t("profile.follows.noFollowersMessage")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </AppModal>
      )}

      {/* Following Popup with Overlay */}
      {showFollowingBox && (
        <AppModal
          open={showFollowingBox}
          onClose={() => {
            trackEvent("interaction", "external_profile_desktop_following_close_overlay");
            setShowFollowingBox(false);
          }}
          variant="dialog"
          contentClassName={styles["externalProfile__requests-popup"]}
          ariaLabel={t("profile.follows.following")}
        >
          <div>
            <div className={styles["externalProfile__requests-header"]}>
              <h3 className="typography-desktop-body-small">
                {t("profile.follows.following")}
              </h3>
              <button
                className={styles["externalProfile__requests-close"]}
                onClick={() => {
                  trackEvent("interaction", "external_profile_desktop_following_close_button");
                  setShowFollowingBox(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles["externalProfile__requests-list"]}>
              {followsLoading ? (
                <div className={styles["externalProfile__no-requests"]}>
                  <div
                    className={styles["externalProfile__loading-spinner"]}
                  ></div>
                  <p className="typography-desktop-body-small">
                    {t("common.loading")}
                  </p>
                </div>
              ) : following && following.count > 0 ? (
                following.following.map((followed) => (
                  <div
                    key={followed.following_id}
                    className={`${styles["externalProfile__request-item"]} ${
                      user && user.internalUserId === followed.following_id
                        ? styles["externalProfile__request-item--current-user"]
                        : ""
                    }`}
                    onClick={() => handleUserClick(followed.following_id)}
                  >
                    <div className={styles["externalProfile__request-user"]}>
                      <div
                        className={`${styles["externalProfile__request-avatar"]} typography-desktop-label-small`}
                      >
                        {followed.image ? (
                          <img
                            src={followed.image}
                            alt={followed.name}
                            className={
                              styles["externalProfile__request-avatar-image"]
                            }
                          />
                        ) : (
                          followed.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={styles["externalProfile__request-info"]}>
                        <span
                          className={`${styles["externalProfile__request-name"]} typography-desktop-body-small`}
                        >
                          {followed.name}
                        </span>
                        <span
                          className={`${styles["externalProfile__request-type"]} typography-desktop-label-medium`}
                        >
                          {followed.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles["externalProfile__no-requests"]}>
                  <Mail size={48} color="rgba(15, 23, 42, 0.3)" />
                  <h3 className="typography-desktop-body-small">
                    {t("profile.follows.notFollowingAnyone")}
                  </h3>
                  <p className="typography-desktop-body-small">
                    {t("profile.follows.notFollowingAnyoneMessage")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
};

export default ExternalProfile;
