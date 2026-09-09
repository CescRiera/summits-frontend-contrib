import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Lock,
  Clock,
  UserPlus,
  UserCheck,
  MoreVertical,
  X,
  Mail,
} from "lucide-react";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import LoginRequiredPopup from "../../components/LoginRequiredPopup/LoginRequiredPopup";
import styles from "./ExternalProfile.module.css";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
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
import ReportBlockPopup from "../../components/ReportBlockPopup/ReportBlockPopup";
import {
  isUserBlocked,
  getUserDisplayInfo,
} from "../../../shared/utils/blockReportUtils";
import {
  formatStatInteger,
} from "../../utils/numberFormatting";
import UserStatisticsSection from "../../PersistentPages/Profile/components/UserStatisticsSection";
import AppModal from "../../../shared/components/AppModal";

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

  const [followStatus, setFollowStatus] = useState<
    "none" | "pending" | "following"
  >("none");
  const [followLoading, setFollowLoading] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showFollowersBox, setShowFollowersBox] = useState(false);
  const [showFollowingBox, setShowFollowingBox] = useState(false);
  const [followers, setFollowers] = useState<GetFollowersResponse | null>(null);
  const [following, setFollowing] = useState<GetFollowingResponse | null>(null);
  const [followsLoading, setFollowsLoading] = useState(false);
  const [showReportBlockPopup, setShowReportBlockPopup] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    if (user && user.internalUserId === parseInt(id)) {
      navigate("/profile", { replace: true });
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const [s, g, counts, followingStatus] = await Promise.all([
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
          followingStatus.is_following
            ? "following"
            : followingStatus.is_pending
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

  const handleFollowToggle = async () => {
    if (!user) {
      trackEvent("social", "external_profile_follow_requires_login");
      setShowLoginPopup(true);
      return;
    }

    if (!id) return;

    try {
      setFollowLoading(true);
      if (followStatus !== "none") {
        trackEvent("social", "external_profile_unfollow_attempt");
        await unfollowUser({ following_id: parseInt(id) });
        setFollowStatus("none");
        const updatedCounts = await getFollowCounts({ user_id: parseInt(id) });
        setFollowCounts(updatedCounts);
      } else {
        trackEvent("social", "external_profile_follow_attempt");
        const resp = await followUser({ following_id: parseInt(id) });
        const pendingStatus = (resp as any)?.status;
        if (resp && pendingStatus === "pending") {
          setFollowStatus("pending");
          trackEvent("social", "external_profile_follow_pending");
        } else {
          setFollowStatus("following");
          trackEvent("social", "external_profile_follow_success");
          const updatedCounts = await getFollowCounts({
            user_id: parseInt(id),
          });
          setFollowCounts(updatedCounts);
        }
      }
    } catch (error) {
      trackEvent("social", "external_profile_follow_toggle_failed");
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
    trackEvent("social", "external_profile_followers_open");
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
    trackEvent("social", "external_profile_following_open");
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
    trackEvent("navigation", `external_profile_user_click_${userId}`);
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
          className={`${styles["externalProfile__error"]} typography-body-small`}
        >
          <h2 className="typography-title-large">
            {t("externalProfile.userNotFound")}
          </h2>
          <p className="typography-body-medium">
            {t("externalProfile.userNotFoundMessage")}
          </p>
          <button
            className={`${styles["externalProfile__goBack"]} typography-button-medium`}
            onClick={() => {
              trackEvent("navigation", "external_profile_not_found_go_back");
              overlayContext ? overlayContext.handleOverlayBack() : navigate("/");
            }}
          >
            {t("common.goBack")}
          </button>
        </div>
      </div>
    );
  }

  const handleReportBlockClick = () => {
    trackEvent("interaction", "external_profile_report_block_open");
    setShowReportBlockPopup(true);
  };

  const handleBlockChange = () => {
    trackEvent("interaction", "external_profile_block_change");
    if (id && isUserBlocked(parseInt(id))) {
      navigate(-1);
    }
  };

  const userDisplayInfo = id && stats
    ? getUserDisplayInfo(
        parseInt(id),
        stats.user_name || t("externalProfile.unknownUser"),
        stats.user_image || null,
        t
      )
    : { name: stats?.user_name || t("externalProfile.unknownUser"), image: stats?.user_image || null };

  const isBlocked = id ? isUserBlocked(parseInt(id)) : false;

  return (
    <div className={styles["externalProfile"]}>
      <OverlayHeader
        title={userDisplayInfo.name}
        onBack={() => {
          trackEvent("navigation", "external_profile_back");
          overlayContext ? overlayContext.handleOverlayBack() : navigate(-1);
        }}
        rightContent={
          (!user || !id || user.internalUserId !== parseInt(id)) ? (
            <button
              className={styles["externalProfile__more-button"]}
              onClick={handleReportBlockClick}
              aria-label="Report or block"
            >
              <MoreVertical size={20} />
            </button>
          ) : null
        }
      />

      {isBlocked ? (
        <div className={styles["externalProfile__privateContent"]}>
          <div className={styles["externalProfile__lockIcon"]}>
            <Lock size={48} color="rgba(15, 23, 42, 0.3)" />
          </div>
          <h3 className="typography-title-medium">
            {t("reportBlock.blockedProfile")}
          </h3>
          <p className="typography-body-medium">
            {t("reportBlock.blockedProfileMessage")}
          </p>
        </div>
      ) : (
        <>
          <div className={styles["externalProfile__profileSection"]}>
            <div className={styles["externalProfile__avatar"]}>
              {userDisplayInfo.image ? (
                <img
                  src={userDisplayInfo.image}
                  alt="Profile"
                  className={styles["externalProfile__avatarImage"]}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML =
                        userDisplayInfo.name?.charAt(0)?.toUpperCase() || "?";
                    }
                  }}
                />
              ) : (
                userDisplayInfo.name?.charAt(0)?.toUpperCase() || "?"
              )}
            </div>

            <div className={styles["externalProfile__profileRight"]}>
              <div className={styles["externalProfile__statsRow"]}>
                <div className={styles["externalProfile__statItem"]}>
                  <span
                    className={`${styles["externalProfile__statNumber"]} typography-title-large`}
                  >
                    {formatStatInteger(stats?.totals.global.total_peaks ?? 0)}
                  </span>
                  <span
                    className={`${styles["externalProfile__statLabel"]} typography-label-medium`}
                  >
                    {t("profile.follows.peaks")}
                  </span>
                </div>
                <div
                  className={styles["externalProfile__statItem"]}
                  onClick={handleFollowersClick}
                >
                  <span
                    className={`${styles["externalProfile__statNumber"]} typography-title-large`}
                  >
                    {formatStatInteger(followCounts?.followers_count ?? 0)}
                  </span>
                  <span
                    className={`${styles["externalProfile__statLabel"]} typography-label-medium`}
                  >
                    {t("profile.follows.followers")}
                  </span>
                </div>
                <div
                  className={styles["externalProfile__statItem"]}
                  onClick={handleFollowingClick}
                >
                  <span
                    className={`${styles["externalProfile__statNumber"]} typography-title-large`}
                  >
                    {formatStatInteger(followCounts?.following_count ?? 0)}
                  </span>
                  <span
                    className={`${styles["externalProfile__statLabel"]} typography-label-medium`}
                  >
                    {t("profile.follows.following")}
                  </span>
                </div>
              </div>

              <button
                className={`${styles["externalProfile__followButton"]} typography-label-large ${
                  followStatus === "following"
                    ? styles["externalProfile__followButton--following"]
                    : followStatus === "pending"
                    ? styles["externalProfile__followButton--pending"]
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

          {!canViewStats() ? (
            <div className={styles["externalProfile__privateContent"]}>
              <div className={styles["externalProfile__lockIcon"]}>
                <Lock size={48} color="rgba(15, 23, 42, 0.3)" />
              </div>
              <h3 className="typography-title-medium">
                {t("externalProfile.privateProfile")}
              </h3>
              <p className="typography-body-medium">
                {t("externalProfile.privateProfileMessage")}
              </p>
            </div>
          ) : (
            <div className={styles["externalProfile__content"]}>
              <UserStatisticsSection 
                userId={id || ""} 
                initialStats={stats} 
                initialGraph={graph} 
              />
            </div>
          )}
        </>
      )}

      <LoginRequiredPopup 
        isOpen={showLoginPopup} 
        onClose={() => setShowLoginPopup(false)} 
        message="auth.loginRequired.followUser"
      />

      <ReportBlockPopup
        isOpen={showReportBlockPopup && !!id}
        onClose={() => setShowReportBlockPopup(false)}
        userId={id ? parseInt(id) : 0}
        userName={userDisplayInfo.name}
        contentType="user"
        contentId={id ? parseInt(id) : 0}
        onBlockChange={handleBlockChange}
      />

      {/* Followers Popup */}
      <AppModal
        open={showFollowersBox}
        onClose={() => setShowFollowersBox(false)}
        variant="dialog"
        contentClassName={styles["externalProfile__requestsPopup"]}
        ariaLabel={t("profile.follows.followers")}
      >
        <div className={styles["externalProfile__requestsHeader"]}>
          <h3 className="typography-title-medium">
            {t("profile.follows.followers")}
          </h3>
          <button
            className={styles["externalProfile__requestsClose"]}
            onClick={() => setShowFollowersBox(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles["externalProfile__requestsList"]}>
          {followsLoading ? (
            <div className={styles["externalProfile__noRequests"]}>
              <div className={styles["externalProfile__loadingSpinner"]}></div>
              <p className="typography-body-medium">{t("common.loading")}</p>
            </div>
          ) : followers && followers.count > 0 ? (
            followers.followers.map((follower) => (
              <div
                key={follower.follower_id}
                className={styles["externalProfile__requestItem"]}
                onClick={() => {
                    setShowFollowersBox(false);
                    handleUserClick(follower.follower_id);
                }}
              >
                <div className={styles["externalProfile__requestUser"]}>
                  <div className={styles["externalProfile__requestAvatar"]}>
                    {follower.image ? (
                      <img src={follower.image} alt={follower.name} className={styles["externalProfile__requestAvatarImage"]} />
                    ) : (
                      follower.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={styles["externalProfile__requestInfo"]}>
                    <span className={`${styles["externalProfile__requestName"]} typography-title-medium`}>{follower.name}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles["externalProfile__noRequests"]}>
              <Mail size={48} color="rgba(15, 23, 42, 0.3)" />
              <h3 className="typography-title-medium">{t("profile.follows.noFollowers")}</h3>
            </div>
          )}
        </div>
      </AppModal>

      {/* Following Popup */}
      <AppModal
        open={showFollowingBox}
        onClose={() => setShowFollowingBox(false)}
        variant="dialog"
        contentClassName={styles["externalProfile__requestsPopup"]}
        ariaLabel={t("profile.follows.following")}
      >
        <div className={styles["externalProfile__requestsHeader"]}>
          <h3 className="typography-title-medium">
            {t("profile.follows.following")}
          </h3>
          <button
            className={styles["externalProfile__requestsClose"]}
            onClick={() => setShowFollowingBox(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles["externalProfile__requestsList"]}>
          {followsLoading ? (
            <div className={styles["externalProfile__noRequests"]}>
              <div className={styles["externalProfile__loadingSpinner"]}></div>
              <p className="typography-body-medium">{t("common.loading")}</p>
            </div>
          ) : following && following.count > 0 ? (
            following.following.map((followed) => (
              <div
                key={followed.following_id}
                className={styles["externalProfile__requestItem"]}
                onClick={() => {
                    setShowFollowingBox(false);
                    handleUserClick(followed.following_id);
                }}
              >
                <div className={styles["externalProfile__requestUser"]}>
                  <div className={styles["externalProfile__requestAvatar"]}>
                    {followed.image ? (
                      <img src={followed.image} alt={followed.name} className={styles["externalProfile__requestAvatarImage"]} />
                    ) : (
                      followed.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={styles["externalProfile__requestInfo"]}>
                    <span className={`${styles["externalProfile__requestName"]} typography-title-medium`}>{followed.name}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles["externalProfile__noRequests"]}>
              <Mail size={48} color="rgba(15, 23, 42, 0.3)" />
              <h3 className="typography-title-medium">{t("profile.follows.notFollowingAnyone")}</h3>
            </div>
          )}
        </div>
      </AppModal>
    </div>
  );
};

export default ExternalProfile;
