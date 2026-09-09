import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../shared/context/AuthContext";
import { useI18n } from "../../shared/context/I18nContext";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import styles from "./desktop-Profile.module.css";
import LoginRegister from "../desktop-components/desktop-LoginRegister/desktop-LoginRegister.tsx";
import ProfileMenu from "./desktop-Profile/desktop-components/desktop-ProfileMenu.tsx";
import ChallengesModal from "./desktop-Profile/desktop-components/desktop-ChallengesModal.tsx";
import EditChallengesModal from "./desktop-Profile/desktop-components/desktop-EditChallengesModal.tsx";
import JoinClubsModal from "./desktop-Profile/desktop-components/desktop-JoinClubsModal.tsx";
import ManageClubsModal from "./desktop-Profile/desktop-components/desktop-ManageClubsModal.tsx";
import {
  Mail,
  Check,
  X,
  ChevronRight,
  Plus,
  Pencil,
  Edit,
  Users,
  ChevronDown,
} from "lucide-react";
import {
  getUserDetails,
  getUserStats,
  getStatsGraph,
  updateProfileImage,
  updateUserName,
} from "../../shared/api/endpoints/user";
import { fixImageOrientation } from "../../shared/utils/imageUtils";
import {
  getFollowCounts,
  getPendingFollowRequests,
  getFollowers,
  getFollowing,
  acceptFollowRequest,
  rejectFollowRequest,
  unfollowUser,
} from "../../shared/api/endpoints/follows";
import type {
  UserDetails,
  GetFollowCountsResponse,
  GetPendingFollowRequestsResponse,
  GetFollowersResponse,
  GetFollowingResponse,
  UserStatsResponse,
  StatsGraphResponse,
} from "../../shared/api/types";
import { useActivate } from "react-activation";
import LoadingScreen from "../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import StatsChart from "./desktop-Profile/desktop-components/desktop-StatsChart.tsx";
import {
  formatStatDuration,
  formatStatInteger,
} from "../../mobile/utils/numberFormatting.ts";
import { useUnitFormat } from "../../shared/hooks/useUnitFormat";
import { useSearchParams } from "react-router-dom";
import CreatorBadge from "../../shared/components/CreatorBadge/CreatorBadge";
import ContactDeveloperPopup from "./desktop-Profile/desktop-components/desktop-ProfilePopups/desktop-ContactDeveloperPopup/desktop-ContactDeveloperPopup.tsx";
import DonatePopup from "./desktop-Profile/desktop-components/desktop-ProfilePopups/desktop-DonatePopup/desktop-DonatePopup.tsx";
import { useMyClubs } from "../../shared/hooks/clubs/useClubs";
import { normalizeMyClubsResponse } from "../../shared/utils/clubResponse";
import { getLocationFromHierarchy } from "../../shared/utils/adminHierarchy";
import MountainIcon from "../../shared/components/MountainIcon/MountainIcon";

const Profile: React.FC<{ registerMode?: boolean }> = ({ registerMode }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { formatStatDistance, formatStatElevationGain } = useUnitFormat();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [followCounts, setFollowCounts] =
    useState<GetFollowCountsResponse | null>(null);
  const [pendingRequests, setPendingRequests] =
    useState<GetPendingFollowRequestsResponse | null>(null);
  const [followers, setFollowers] = useState<GetFollowersResponse | null>(null);
  const [following, setFollowing] = useState<GetFollowingResponse | null>(null);
  const [showPendingBox, setShowPendingBox] = useState(false);
  const [showFollowersBox, setShowFollowersBox] = useState(false);
  const [showFollowingBox, setShowFollowingBox] = useState(false);
  const [followsLoading, setFollowsLoading] = useState(false);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [graph, setGraph] = useState<StatsGraphResponse | null>(null);
  const [searchParams] = useSearchParams();
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editedNameInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [challengesModalOpen, setChallengesModalOpen] = useState(false);
  const [editChallengesModalOpen, setEditChallengesModalOpen] = useState(false);
  const [joinClubsModalOpen, setJoinClubsModalOpen] = useState(false);
  const [manageClubsModalOpen, setManageClubsModalOpen] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [showDonatePopup, setShowDonatePopup] = useState(false);

  const [isChallengesCollapsed, setIsChallengesCollapsed] = useState(() => {
    const stored = localStorage.getItem("profile_challenges_collapsed");
    return stored === "true";
  });
  const [isClubsCollapsed, setIsClubsCollapsed] = useState(() => {
    const stored = localStorage.getItem("profile_clubs_collapsed");
    return stored === "true";
  });

  const toggleChallenges = () => {
    const newState = !isChallengesCollapsed;
    setIsChallengesCollapsed(newState);
    localStorage.setItem("profile_challenges_collapsed", String(newState));
    trackEvent("interaction", `profile_desktop_challenges_${newState ? "collapse" : "expand"}`);
  };

  const toggleClubs = () => {
    const newState = !isClubsCollapsed;
    setIsClubsCollapsed(newState);
    localStorage.setItem("profile_clubs_collapsed", String(newState));
    trackEvent("interaction", `profile_desktop_clubs_${newState ? "collapse" : "expand"}`);
  };



  // Club data fetching
  const myClubsQuery = useMyClubs(Boolean(user));

  const clubSections = useMemo(
    () => normalizeMyClubsResponse(myClubsQuery.data),
    [myClubsQuery.data]
  );
  
  const userClubs = useMemo(() => {
    return [
      ...clubSections.createdClubs,
      ...clubSections.joinedClubs
    ];
  }, [clubSections]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      // Fix iOS image orientation by redrawing on canvas
      // This also resizes the image to 1200px max for better upload performance
      const fixedFile = await fixImageOrientation(file);
      const result = await updateProfileImage(fixedFile);
      if (result.success && result.image_url) {
        trackEvent("interaction", "profile_desktop_avatar_upload_success");
        const imageUrl = result.image_url;
        setUserDetails((prev) => (prev ? { ...prev, image: imageUrl } : null));
      } else {
        trackEvent("interaction", "profile_desktop_avatar_upload_failed");
        alert(result.error || "Failed to update profile image");
      }
    } catch (error) {
      trackEvent("interaction", "profile_desktop_avatar_upload_failed");
      console.error("Failed to update profile image:", error);
      alert("Failed to update profile image");
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current && user) {
      trackEvent("button_click", "profile_desktop_avatar_click");
      fileInputRef.current.click();
    }
  };

  type UserStatsWithTotals = UserStatsResponse & { rank_total_users?: number };
  const statsWith: UserStatsWithTotals | null =
    (stats as UserStatsWithTotals) || null;

  // Stats filtering state
  const [activityFilter, setActivityFilter] = useState<string>("all");

  // Graph filtering state
  const [graphMetric, setGraphMetric] = useState<
    "distance" | "elevation_gain" | "time" | "moving_time" | "peaks" | "routes"
  >("peaks");
  const [graphActivityFilter, setGraphActivityFilter] = useState<string>("all");
  const [timeAggregation, setTimeAggregation] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("daily");

  useEffect(() => {
    if (!isEditingName) return;

    const timeoutId = window.setTimeout(() => {
      editedNameInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isEditingName]);

  // Get activities list
  const activities = React.useMemo(() => {
    const rawActivities =
      stats?.totals.by_activity?.map((a) => a.activity_type ?? "unknown") || [];
    const uniqueActivities = Array.from(new Set(rawActivities));
    return ["all", ...uniqueActivities];
  }, [stats]);

  // Get activity display name
  const getActivityDisplayName = (activity: string): string => {
    if (activity === "all") {
      return t("userStats.activityFilter.all");
    }
    if (!activity || activity === "unknown") {
      return t("userStats.activityFilter.unknown") || "Unknown";
    }
    return activity;
  };

  // Get current stats based on activity filter
  const currentStats = React.useMemo(() => {
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

  const createdChallenges = React.useMemo(() => {
    if (!stats?.peaks_per_list || !currentUserId) return [];
    return stats.peaks_per_list.filter((item) => {
      const creatorId = item.creator_id ?? item.created_by;
      if (!creatorId) return false;
      return Number(creatorId) === Number(currentUserId);
    });
  }, [stats, currentUserId]);

  useEffect(() => {
    const fetchInitialUserDetails = async () => {
      if (!user) {
        setUserDetails(null);
        setFollowCounts(null);
        setPendingRequests(null);
        setLoading(false);
        return;
      }
      // Only show the loading state on the very first data fetch
      const shouldShowInitialLoading = userDetails === null;
      try {
        if (shouldShowInitialLoading) setLoading(true);
        const [details, counts, pending, userStats, statsGraph] =
          await Promise.all([
            getUserDetails(),
            getFollowCounts({ user_id: user.internalUserId! }),
            getPendingFollowRequests(),
            getUserStats(),
            getStatsGraph(),
          ]);
        setUserDetails(details);
        setFollowCounts(counts);
        setPendingRequests(pending);
        setStats(userStats);
        setGraph(statsGraph);
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      } finally {
        if (shouldShowInitialLoading) setLoading(false);
      }
    };

    void fetchInitialUserDetails();
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Refresh in the background when the kept-alive page becomes active again
  useActivate(() => {
    const refreshUserDetails = async () => {
      if (!user) return;

      try {
        const [latest, counts, pending, userStats, statsGraph] =
          await Promise.all([
            getUserDetails(),
            getFollowCounts({ user_id: user.internalUserId! }),
            getPendingFollowRequests(),
            getUserStats(),
            getStatsGraph(),
          ]);

        // Update user details
        setUserDetails((prev) => {
          if (!prev) return latest;
          const updated: UserDetails = { ...prev };
          if (typeof latest.rank !== "undefined" && latest.rank !== prev.rank) {
            updated.rank = latest.rank;
          }
          if (
            typeof latest.total_saved_peaks !== "undefined" &&
            latest.total_saved_peaks !== prev.total_saved_peaks
          ) {
            updated.total_saved_peaks = latest.total_saved_peaks;
          }
          if (
            typeof latest.total_saved_shelters !== "undefined" &&
            latest.total_saved_shelters !== prev.total_saved_shelters
          ) {
            updated.total_saved_shelters = latest.total_saved_shelters;
          }
          if (
            typeof latest.total_user_peaks !== "undefined" &&
            latest.total_user_peaks !== prev.total_user_peaks
          ) {
            updated.total_user_peaks = latest.total_user_peaks;
          }
          return updated;
        });

        // Update follow counts
        setFollowCounts(counts);

        // Update pending requests
        setPendingRequests(pending);

        // Update stats and graph
        setStats(userStats);
        setGraph(statsGraph);
      } catch (error) {
        console.error("Failed to refresh user details:", error);
      }
    };

    void refreshUserDetails();
  });

  // Handle Strava OAuth callback errors (only when NOT logged in)
  useEffect(() => {
    // Only handle when user is NOT logged in
    if (user) {
      return;
    }

    const stravaError = searchParams.get("strava");
    const errorMessage = searchParams.get("message");

    if (stravaError === "error") {
      // Clear query params to avoid showing error again on refresh
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("strava");
      newSearchParams.delete("message");
      navigate(`/profile?${newSearchParams.toString()}`, { replace: true });

      // Set error message based on the message parameter
      let errorText = t("auth.strava.error.generic");
      if (errorMessage === "strava_account_already_linked") {
        errorText = t("auth.strava.error.accountAlreadyLinked");
      } else if (errorMessage === "registration_failed") {
        errorText = t("auth.strava.error.registrationFailed");
      } else if (errorMessage === "email_check_failed") {
        errorText = t("auth.strava.error.emailCheckFailed");
      } else if (errorMessage === "internal_error") {
        errorText = t("auth.strava.error.internalError");
      }

      // Store error in sessionStorage to display in LoginRegister component
      sessionStorage.setItem("stravaError", errorText);
    }
  }, [searchParams, user, navigate, t]);

  // Handle Garmin OAuth callback errors (only when NOT logged in)
  useEffect(() => {
    // Only handle when user is NOT logged in
    if (user) {
      return;
    }

    const garminError = searchParams.get("garmin");
    const errorMessage = searchParams.get("message");

    if (garminError === "error") {
      // Clear query params to avoid showing error again on refresh
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("garmin");
      newSearchParams.delete("message");
      navigate(`/profile?${newSearchParams.toString()}`, { replace: true });

      // Set error message based on the message parameter
      let errorText = t("auth.garmin.error.generic");
      if (errorMessage === "garmin_account_already_linked") {
        errorText = t("auth.garmin.error.accountAlreadyLinked");
      } else if (errorMessage === "registration_failed") {
        errorText = t("auth.garmin.error.registrationFailed");
      } else if (errorMessage === "email_check_failed") {
        errorText = t("auth.garmin.error.emailCheckFailed");
      } else if (errorMessage === "internal_error") {
        errorText = t("auth.garmin.error.internalError");
      }

      // Store error in sessionStorage to display in LoginRegister component
      sessionStorage.setItem("garminError", errorText);
    }
  }, [searchParams, user, navigate, t]);

  useEffect(() => {
    const shouldOpenContactPopup = searchParams.get("help") === "contact";
    const hasAuthError =
      searchParams.get("strava") === "error" ||
      searchParams.get("garmin") === "error";

    if (!shouldOpenContactPopup || hasAuthError) {
      return;
    }

    setShowContactPopup(true);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("help");
    const nextQueryString = nextSearchParams.toString();

    navigate(nextQueryString ? `/profile?${nextQueryString}` : "/profile", {
      replace: true,
    });
  }, [searchParams, navigate]);

  if (!user) {
    return (
      <>
        <LoginRegister
          mode={registerMode ? "register" : "login"}
          footer={(
            <div className={styles["profile__help-actions"]}>
              <button
                className={`${styles["profile__help-link"]} typography-desktop-body-small`}
                onClick={() => {
                  trackEvent("button_click", "profile_desktop_donate_open");
                  setShowDonatePopup(true);
                }}
              >
                {t("profile.donateQuestion")}
              </button>
              <button
                className={`${styles["profile__help-link"]} typography-desktop-body-small`}
                onClick={() => {
                  trackEvent("navigation", "profile_desktop_help_open");
                  setShowContactPopup(true);
                }}
              >
                {t("profile.needHelp")}
              </button>
            </div>
          )}
        />
        <DonatePopup
          isOpen={showDonatePopup}
          onClose={() => setShowDonatePopup(false)}
        />
        <ContactDeveloperPopup
          isOpen={showContactPopup}
          onClose={() => setShowContactPopup(false)}
        />
      </>
    );
  }

  const handleDeleteAccount = () => {
    // TODO: Implement delete account functionality
  };

  const handleSavedPeaks = () => {
    trackEvent("navigation", "profile_desktop_open_saved_peaks");
    navigate("/saved-peaks");
  };

  const handleSavedShelters = () => {
    trackEvent("navigation", "profile_desktop_open_saved_shelters");
    navigate("/saved-shelters");
  };

  const handleAcceptRequest = async (followerId: number) => {
    try {
      trackEvent("social", `profile_desktop_follow_request_accept_${followerId}`);
      setFollowsLoading(true);
      await acceptFollowRequest({ follower_id: followerId });
      // Refresh pending requests
      const updatedPending = await getPendingFollowRequests();
      setPendingRequests(updatedPending);
      // Refresh follow counts
      const updatedCounts = await getFollowCounts({
        user_id: user.internalUserId!,
      });
      setFollowCounts(updatedCounts);
    } catch (error) {
      trackEvent("social", "profile_desktop_follow_request_accept_failed");
      console.error("Failed to accept follow request:", error);
    } finally {
      setFollowsLoading(false);
    }
  };

  const handleRejectRequest = async (followerId: number) => {
    try {
      trackEvent("social", `profile_desktop_follow_request_reject_${followerId}`);
      setFollowsLoading(true);
      await rejectFollowRequest({ follower_id: followerId });
      // Refresh pending requests
      const updatedPending = await getPendingFollowRequests();
      setPendingRequests(updatedPending);
    } catch (error) {
      trackEvent("social", "profile_desktop_follow_request_reject_failed");
      console.error("Failed to reject follow request:", error);
    } finally {
      setFollowsLoading(false);
    }
  };

  const handleUnfollow = async (followingId: number) => {
    try {
      trackEvent("social", `profile_desktop_unfollow_${followingId}`);
      setFollowsLoading(true);
      await unfollowUser({ following_id: followingId });
      // Refresh following list
      const updatedFollowing = await getFollowing();
      setFollowing(updatedFollowing);
      // Refresh follow counts
      const updatedCounts = await getFollowCounts({
        user_id: user.internalUserId!,
      });
      setFollowCounts(updatedCounts);
    } catch (error) {
      trackEvent("social", "profile_desktop_unfollow_failed");
      console.error("Failed to unfollow user:", error);
    } finally {
      setFollowsLoading(false);
    }
  };

  const handleUserClick = (externalUserId: string) => {
    trackEvent("navigation", `profile_desktop_open_external_profile_${externalUserId}`);
    navigate(`/externalprofile/${externalUserId}`);
  };

  const togglePendingBox = () => {
    trackEvent(
      "interaction",
      `profile_desktop_pending_box_${showPendingBox ? "close" : "open"}`
    );
    setShowPendingBox(!showPendingBox);
  };

  const handleFollowersClick = async () => {
    trackEvent("button_click", "profile_desktop_followers_click");
    if (!followers) {
      try {
        setFollowsLoading(true);
        const followersData = await getFollowers();
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
    trackEvent("button_click", "profile_desktop_following_click");
    if (!following) {
      try {
        setFollowsLoading(true);
        const followingData = await getFollowing();
        setFollowing(followingData);
      } catch (error) {
        console.error("Failed to fetch following:", error);
      } finally {
        setFollowsLoading(false);
      }
    }
    setShowFollowingBox(true);
  };

  const handlePrivacyChange = (isPrivate: boolean) => {
    trackEvent("interaction", `profile_desktop_privacy_${isPrivate ? "private" : "public"}`);
    setUserDetails((prev) => {
      if (!prev) return prev;
      return { ...prev, is_private: isPrivate };
    });
  };

  const handleEditNameClick = () => {
    trackEvent("interaction", "profile_desktop_name_edit_open");
    setEditedName(userDetails?.externalUsername || "");
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      alert(t("profile.nameRequired") || "Name is required");
      return;
    }

    if (editedName.length > 100) {
      alert(t("profile.nameTooLong") || "Name must be 100 characters or less");
      return;
    }

    setUpdatingName(true);
    try {
      const result = await updateUserName(editedName.trim());
      if (result.success) {
        trackEvent("interaction", "profile_desktop_name_update_success");
        setUserDetails((prev) => prev ? { ...prev, externalUsername: result.name } : null);
        setIsEditingName(false);
      }
    } catch (error: any) {
      console.error("Failed to update name:", error);
      alert(error.response?.data?.error || t("profile.nameUpdateFailed") || "Failed to update name");
    } finally {
      setUpdatingName(false);
    }
  };

  const handleCancelEditName = () => {
    trackEvent("interaction", "profile_desktop_name_edit_cancel");
    setIsEditingName(false);
    setEditedName("");
  };

  if (loading) {
    return (
      <div className={styles["profile"]}>
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className={styles["profile-grid"]}>
      {/* Grid Container */}
      <div className={styles["profile-grid__container"]}>
        {/* Left Column */}
        <div className={styles["profile-grid__left-column"]}>
          {/* Cell 1: User Info */}
          <div className={styles["profile-grid__cell"]}>
            <div className={styles["profile-grid__user-info"]}>
              <div
                className={`${styles["profile-grid__avatar"]} typography-desktop-display-xxl ${user ? styles["profile-grid__avatar--clickable"] : ""}`}
                onClick={handleAvatarClick}
                style={{ cursor: user ? "pointer" : "default" }}
              >
                {userDetails?.image ? (
                  <img
                    src={userDetails.image}
                    alt="Profile"
                    className={styles["profile-grid__avatar-image"]}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML =
                          userDetails?.externalUsername
                            ?.charAt(0)
                            ?.toUpperCase() ||
                          userDetails?.email?.charAt(0)?.toUpperCase() ||
                          "U";
                      }
                    }}
                  />
                ) : (
                  userDetails?.externalUsername?.charAt(0)?.toUpperCase() ||
                  userDetails?.email?.charAt(0)?.toUpperCase() ||
                  user.email?.charAt(0)?.toUpperCase() ||
                  "U"
                )}
                {user && (
                  <div className={styles["profile-grid__avatar-edit-button"]}>
                    <Plus size={18} />
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                  disabled={uploadingImage}
                />
              </div>
              {isEditingName ? (
                <div className={styles["profile-grid__name-edit"]}>
                  <input
                    ref={editedNameInputRef}
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className={`${styles["profile-grid__name-input"]} typography-desktop-title-large`}
                    maxLength={100}
                    disabled={updatingName}
                  />
                  <div className={styles["profile-grid__name-edit-actions"]}>
                    <button
                      onClick={handleSaveName}
                      disabled={updatingName}
                      className={styles["profile-grid__name-save-btn"]}
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={handleCancelEditName}
                      disabled={updatingName}
                      className={styles["profile-grid__name-cancel-btn"]}
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles["profile-grid__name-container"]}>
                  <h1
                    className={`${styles["profile-grid__username"]} typography-desktop-title-large`}
                  >
                    {userDetails?.externalUsername || "Unnamed User"}
                  </h1>
                  <button
                    onClick={handleEditNameClick}
                    className={styles["profile-grid__name-edit-icon"]}
                    aria-label="Edit name"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              )}

              <div className={styles["profile-grid__stats-row"]}>
                <div className={styles["profile-grid__stat-item"]}>
                  <span
                    className={`${styles["profile-grid__stat-number"]} typography-desktop-title-large`}
                  >
                    {formatStatInteger(userDetails?.total_user_peaks ?? 0)}
                  </span>
                  <span
                    className={`${styles["profile-grid__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("profile.follows.peaks")}
                  </span>
                </div>
                <div
                  className={styles["profile-grid__stat-item"]}
                  onClick={handleFollowersClick}
                >
                  <span
                    className={`${styles["profile-grid__stat-number"]} typography-desktop-title-large`}
                  >
                    {formatStatInteger(followCounts?.followers_count ?? 0)}
                  </span>
                  <span
                    className={`${styles["profile-grid__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("profile.follows.followers")}
                  </span>
                </div>
                <div
                  className={styles["profile-grid__stat-item"]}
                  onClick={handleFollowingClick}
                >
                  <span
                    className={`${styles["profile-grid__stat-number"]} typography-desktop-title-large`}
                  >
                    {formatStatInteger(followCounts?.following_count ?? 0)}
                  </span>
                  <span
                    className={`${styles["profile-grid__stat-label"]} typography-desktop-label-medium`}
                  >
                    {t("profile.follows.following")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cell 2: Inbox / Follow Requests - Only show if there are pending requests */}
          {pendingRequests && pendingRequests.count > 0 && (
            <div className={styles["profile-grid__cell"]}>
              <div
                className={`${styles["profile-grid__cell-title"]} typography-desktop-title-small`}
              >
                {t("profile.follows.followRequests")}
              </div>
              <button
                className={`${styles["profile-grid__inbox-button"]} typography-button-medium`}
                onClick={togglePendingBox}
              >
                <Mail size={20} />
                <span className="typography-desktop-label-large">
                  {`${pendingRequests.count} ${t(
                    "profile.follows.pendingRequests"
                  )}`}
                </span>
                <span className={`${styles["profile-grid__inbox-badge"]} typography-desktop-label-small`}>
                  {pendingRequests.count}
                </span>
              </button>
            </div>
          )}

          {/* Cell 3: Achievement Badge - Rank */}
          {typeof stats?.rank !== "undefined" && (
            <div className={styles["profile-grid__cell"]}>
              <div
                className={styles["profile-grid__achievement"]}
                onClick={() =>
                  navigate("/leaderboard?tab=world&sort_mode=contributors")
                }
              >
              
                <div className={styles["profile-grid__achievement-content"]}>
                  <div
                    className={`${styles["profile-grid__achievement-title"]} typography-desktop-body-medium`}
                  >
                    <p>
                      #
                      <strong className="typography-desktop-headline-small">
                        {formatStatInteger(stats.rank ?? 0)}
                      </strong>
                    </p>

                    {t("userStats.rank.yourRank")}
                  </div>
                  <div
                    className={`${styles["profile-grid__achievement-subtitle"]} typography-desktop-body-small`}
                  >
                    {t("userStats.rank.rankDescription", {
                      rank: formatStatInteger(stats.rank ?? 0),
                      totalUsers: formatStatInteger(
                        statsWith?.rank_total_users ||
                          stats?.totals?.global?.rank_total_users ||
                          0
                      ),
                    })}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className={styles["profile-grid__achievement-arrow"]}
                />
              </div>
            </div>
          )}

          {/* Cell 4: Your Routes, Your Peaks & Saved Peaks Combined */}
          <div className={styles["profile-grid__cell"]}>
            <div className={styles["profile-grid__unified-stats"]}>
              {/* Your Routes Section */}
              <div
                className={styles["profile-grid__unified-stat"]}
                onClick={() => {
                  trackEvent("navigation", "profile_desktop_open_user_routes");
                  navigate("/userroutes");
                }}
              >
                <span
                  className={`${styles["profile-grid__unified-stat-text"]} typography-desktop-body-medium`}
                >
                  {t("profile.yourRoutesWithCount", {
                    count: formatStatInteger(currentStats?.total_routes ?? 0),
                  })}
                </span>
                <ChevronRight
                  size={16}
                  className={styles["profile-grid__unified-stat-arrow"]}
                />
              </div>

              {/* Your Peaks Section */}
              <div
                className={styles["profile-grid__unified-stat"]}
                onClick={() => {
                  trackEvent("navigation", "profile_desktop_open_user_peaks");
                  navigate("/userpeaks");
                }}
              >
                <span
                  className={`${styles["profile-grid__unified-stat-text"]} typography-desktop-body-medium`}
                >
                  {t("profile.yourPeaksWithCount", {
                    count: formatStatInteger(currentStats?.total_peaks ?? 0),
                  })}
                </span>
                <ChevronRight
                  size={16}
                  className={styles["profile-grid__unified-stat-arrow"]}
                />
              </div>

              {/* Saved Peaks Section */}
              <div
                className={styles["profile-grid__unified-stat"]}
                onClick={handleSavedPeaks}
              >
                <span
                  className={`${styles["profile-grid__unified-stat-text"]} typography-desktop-body-medium`}
                >
                  {t("profile.savedPeaksWithCount", {
                    count: formatStatInteger(userDetails?.total_saved_peaks ?? 0),
                  })}
                </span>
                <ChevronRight
                  size={16}
                  className={styles["profile-grid__unified-stat-arrow"]}
                />
              </div>

              {/* Saved Shelters Section */}
              <div
                className={styles["profile-grid__unified-stat"]}
                onClick={handleSavedShelters}
              >
                <span
                  className={`${styles["profile-grid__unified-stat-text"]} typography-desktop-body-medium`}
                >
                  {t("profile.savedSheltersWithCount", {
                    count: formatStatInteger(userDetails?.total_saved_shelters ?? 0),
                  })}
                </span>
                <ChevronRight
                  size={16}
                  className={styles["profile-grid__unified-stat-arrow"]}
                />
              </div>
            </div>
          </div>

          {/* Cell 5: Settings Menu */}
          <div className={styles["profile-grid__cell"]}>
            <div
              className={`${styles["profile-grid__cell-title"]} typography-desktop-title-small`}
            >
              {t("profile.settings") || "Settings"}
            </div>
            <div className={styles["profile-grid__settings"]}>
              <ProfileMenu
                onLogout={() => {
                  trackEvent("auth", "profile_desktop_logout");
                  logout();
                }}
                onDeleteAccount={handleDeleteAccount}
                isPrivate={userDetails?.is_private || false}
                onPrivacyChange={handlePrivacyChange}
              />
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className={styles["profile-grid__right-column"]}>
          {/* Cell 1: Statistics */}
          <div className={styles["profile-grid__cell"]}>
            <div className={styles["profile-grid__cell-header"]}>
              <div
                className={`${styles["profile-grid__cell-title"]} typography-desktop-title-small`}
              >
                {t("userStats.statistics") || "Statistics"}
              </div>
              {stats && activities.length > 0 && (
                <select
                  className={`${styles["profile-grid__activity-filter"]} typography-body-small`}
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                >
                  {activities.map((activity) => (
                    <option key={activity} value={activity}>
                      {getActivityDisplayName(activity)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className={styles["profile-grid__stats-grid"]}>
              <div className={styles["profile-grid__stat-card"]}>
                <div className={styles["profile-grid__stat-card-header"]}>
                  <span
                    className={`${styles["profile-grid__stat-card-label"]} typography-desktop-label-medium`}
                  >
                    {t("userStats.metrics.distance")}
                  </span>
                </div>
                <div
                  className={`${styles["profile-grid__stat-card-value"]} typography-desktop-title-medium`}
                >
                  {formatStatDistance(currentStats?.total_distance_km ?? 0)}
                </div>
              </div>
              <div className={styles["profile-grid__stat-card"]}>
                <div className={styles["profile-grid__stat-card-header"]}>
                  <span
                    className={`${styles["profile-grid__stat-card-label"]} typography-desktop-label-medium`}
                  >
                    {t("userStats.metrics.elevationGain")}
                  </span>
                </div>
                <div
                  className={`${styles["profile-grid__stat-card-value"]} typography-desktop-title-medium`}
                >
                  {formatStatElevationGain(
                    currentStats?.total_elevation_gain ?? 0
                  )}
                </div>
              </div>
              <div className={styles["profile-grid__stat-card"]}>
                <div className={styles["profile-grid__stat-card-header"]}>
                  <span
                    className={`${styles["profile-grid__stat-card-label"]} typography-desktop-label-medium`}
                  >
                    {t("userStats.metrics.totalTime")}
                  </span>
                </div>
                <div
                  className={`${styles["profile-grid__stat-card-value"]} typography-desktop-title-medium`}
                >
                  {formatStatDuration(currentStats?.total_time_seconds ?? 0)}
                </div>
              </div>
              <div className={styles["profile-grid__stat-card"]}>
                <div className={styles["profile-grid__stat-card-header"]}>
                  <span
                    className={`${styles["profile-grid__stat-card-label"]} typography-desktop-label-medium`}
                  >
                    {t("userStats.metrics.movingTime")}
                  </span>
                </div>
                <div
                  className={`${styles["profile-grid__stat-card-value"]} typography-desktop-title-medium`}
                >
                  {formatStatDuration(
                    currentStats?.total_moving_time_seconds ?? 0
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles["profile-grid__cell"]}>
              <div
                className={`${styles["profile-grid__cell-title"]} ${styles["profile-grid__cell-title--collapsible"]} typography-desktop-title-small`}
                onClick={toggleChallenges}
              >
                {t("userStats.peakLists.title")}
                <ChevronDown 
                  className={`${styles["profile-grid__collapse-icon"]} ${isChallengesCollapsed ? styles["profile-grid__collapse-icon--collapsed"] : ""}`} 
                  size={20} 
                />
              </div>
              
              <div className={`${styles["profile-grid__collapsible-content"]} ${isChallengesCollapsed ? styles["profile-grid__collapsible-content--collapsed"] : ""}`}>
              
              {/* Challenge Action Buttons */}
              <div className={styles["profile-grid__challenge-buttons"]}>
                <div className={styles["profile-grid__challenge-buttons-row"]}>
                  <button
                    className={styles["profile-grid__challenge-button"]}
                    onClick={() => {
                      trackEvent(
                        "interaction",
                        "profile_desktop_challenges_modal_open"
                      );
                      setChallengesModalOpen(true);
                    }}
                  >
                    <Plus size={18} />
                    <span className="typography-desktop-button-small">
                      {t("profile.challenges.joinChallenge") || "Join Challenge"}
                    </span>
                  </button>
                  <button
                    className={styles["profile-grid__challenge-button"]}
                    onClick={() => {
                      trackEvent(
                        "navigation",
                        "profile_desktop_create_list_open"
                      );
                      navigate("/createlist");
                    }}
                  >
                    <Edit size={18} />
                    <span className="typography-desktop-button-small">
                      {t("profile.challenges.createChallenge") ||
                        "Create Challenge"}
                    </span>
                  </button>
                </div>
                {createdChallenges.length > 0 && (
                  <button
                    className={`${styles["profile-grid__challenge-button"]} ${styles["profile-grid__challenge-button--secondary"]}`}
                    onClick={() => {
                      trackEvent(
                        "interaction",
                        "profile_desktop_edit_challenges_open"
                      );
                      setEditChallengesModalOpen(true);
                    }}
                  >
                    <Pencil size={18} />
                    <span className="typography-desktop-button-small">
                      {t("profile.challenges.editMyChallenges") ||
                        "Edit my challenges"}
                    </span>
                  </button>
                )}
              </div>
              
              {stats?.peaks_per_list && stats.peaks_per_list.length > 0 && (
              <div className={styles["profile-grid__lists"]}>
                {stats.peaks_per_list.map((item) => {
                  const percent = Math.max(
                    0,
                    Math.min(100, item.percent_completed)
                  );
                  const bgUrl = item.primary_image || undefined;

                  return (
                    <div key={item.list_id} className={styles["profile-grid__list-tile-wrapper"]}>
                      <button
                        className={styles["profile-grid__list-tile"]}
                        onClick={() => {
                          trackEvent("navigation", `profile_desktop_open_list_${item.list_id}`);
                          navigate(`/list-details/${item.list_id}`);
                        }}
                        aria-label={`Open ${item.list_name}`}
                      >
                            <div
                              className={styles["profile-grid__list-tile-content"]}
                            >
                              <div
                                className={styles["profile-grid__list-tile-image"]}
                                style={{ backgroundImage: bgUrl ? `url(${bgUrl})` : undefined }}
                              />
                        <div className={styles["profile-grid__list-tile-text"]}>
                          <div
                            className={`${styles["profile-grid__list-tile-name"]} typography-desktop-title-medium`}
                          >
                            {item.list_name}
                          </div>
                          {(item.creator_name || item.creator_image) && (
                            <CreatorBadge
                              name={item.creator_name ?? null}
                              imageUrl={item.creator_image ?? null}
                              className={styles["profile-grid__list-tile-creator"]}
                              size="md"
                              variant="light"
                            />
                          )}
                          <div
                            className={`${styles["profile-grid__list-tile-desc"]} typography-desktop-body-small`}
                          >
                            {t("userStats.peakLists.completedDescription", {
                              completed: formatStatInteger(item.user_completed),
                              total: formatStatInteger(item.total_peaks),
                            })}
                          </div>
                        </div>
                        <div className={styles["profile-grid__ring-wrapper"]}>
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

          <div className={styles["profile-grid__cell"]}>
            <div
              className={`${styles["profile-grid__cell-title"]} ${styles["profile-grid__cell-title--collapsible"]} typography-desktop-title-small`}
              onClick={toggleClubs}
            >
              {t("profile.clubs.myClubs") || "My clubs"}
              <ChevronDown 
                className={`${styles["profile-grid__collapse-icon"]} ${isClubsCollapsed ? styles["profile-grid__collapse-icon--collapsed"] : ""}`} 
                size={20} 
              />
            </div>

            <div className={`${styles["profile-grid__collapsible-content"]} ${isClubsCollapsed ? styles["profile-grid__collapsible-content--collapsed"] : ""}`}>

            <div className={styles["profile-grid__challenge-buttons"]}>
              <div className={styles["profile-grid__challenge-buttons-row"]}>
                <button
                  className={styles["profile-grid__challenge-button"]}
                  onClick={() => {
                    trackEvent("interaction", "profile_desktop_join_clubs_modal_open");
                    setJoinClubsModalOpen(true);
                  }}
                >
                  <Plus size={18} />
                  <span className="typography-desktop-button-small">
                    {t("profile.clubs.joinClub") || "Join clubs"}
                  </span>
                </button>
                <button
                  className={styles["profile-grid__challenge-button"]}
                  onClick={() => {
                    trackEvent("navigation", "profile_desktop_create_club_open");
                    navigate("/clubs/create");
                  }}
                >
                  <Edit size={18} />
                  <span className="typography-desktop-button-small">
                    {t("profile.clubs.createClub") || "Create club"}
                  </span>
                </button>
              </div>
              {clubSections.createdClubs.length > 0 && (
                <button
                  className={`${styles["profile-grid__challenge-button"]} ${styles["profile-grid__challenge-button--secondary"]}`}
                  onClick={() => {
                    trackEvent("interaction", "profile_desktop_manage_clubs_modal_open");
                    setManageClubsModalOpen(true);
                  }}
                >
                  <Users size={18} />
                  <span className="typography-desktop-button-small">
                    {t("clubs.actions.manageMyClubs") || "Manage my clubs"}
                  </span>
                </button>
              )}
            </div>

            {userClubs.length > 0 && (
              <div className={styles["profile-grid__lists"]}>
                {userClubs.map((club) => (
                  <div key={club.id} className={styles["profile-grid__list-tile-wrapper"]}>
                    <button
                      className={styles["profile-grid__list-tile"]}
                      onClick={() => {
                        trackEvent("navigation", `profile_desktop_open_club_${club.id}`);
                        navigate(`/clubs/${club.id}`);
                      }}
                      aria-label={`Open ${club.name}`}
                    >
                      <div className={styles["profile-grid__list-tile-content"]}>
                        <div
                          className={styles["profile-grid__list-tile-image"]}
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

                        <div className={styles["profile-grid__list-tile-text"]}>
                          <div className={`${styles["profile-grid__list-tile-name"]} typography-desktop-title-medium`}>
                            {club.name}
                          </div>
                          <div className={`${styles["profile-grid__club-tile-meta"]} typography-desktop-body-small`}>
                            <div className={styles["profile-grid__club-tile-meta-item"]}>
                              <Users size={14} style={{ opacity: 0.6 }} />
                              <span>{club.member_count.toLocaleString()}</span>
                            </div>
                            <div className={styles["profile-grid__club-tile-meta-item"]}>
                              <MountainIcon size={14} />
                              <span>{club.distinct_peak_count?.toLocaleString() || 0}</span>
                            </div>
                            {club.admin_hierarchy && (
                              <div className={`${styles["profile-grid__club-tile-meta-item"]} ${styles["profile-grid__club-tile-meta-item--location"]}`}>
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

          {/* Cell 3: Activity Graph */}
          {graph && (
            <div className={styles["profile-grid__cell"]}>
              <div
                className={`${styles["profile-grid__cell-title"]} typography-desktop-title-small`}
              >
                {t("userStats.graph")}
              </div>

              {/* Graph Controls */}
              <div className={styles["profile-grid__graph-controls"]}>
                {/* Metric Tabs */}
                <div className={styles["profile-grid__metric-tabs"]}>
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
                  ].map((metric) => (
                    <button
                      key={metric.key}
                      className={`${styles["profile-grid__metric-tab"]} typography-label-large ${
                        graphMetric === metric.key
                          ? styles["profile-grid__metric-tab--active"]
                          : ""
                      }`}
                      onClick={() => setGraphMetric(metric.key)}
                    >
                      {metric.label}
                    </button>
                  ))}
                </div>

                {/* Filters */}
                <div className={styles["profile-grid__graph-filters"]}>
                  {/* Time Aggregation */}
                  <select
                    className={`${styles["profile-grid__graph-select"]} typography-body-small`}
                    value={timeAggregation}
                    onChange={(e) =>
                      setTimeAggregation(
                        e.target.value as
                          | "daily"
                          | "weekly"
                          | "monthly"
                          | "yearly"
                      )
                    }
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
                      className={`${styles["profile-grid__graph-select"]} typography-body-small`}
                      value={graphActivityFilter}
                      onChange={(e) => setGraphActivityFilter(e.target.value)}
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

              <div className={styles["profile-grid__graph-container"]}>
                <StatsChart
                  data={graph}
                  metric={graphMetric}
                  activityFilter={graphActivityFilter}
                  timeAggregation={timeAggregation}
                  customStartDate={null}
                  customEndDate={null}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Challenges Modal */}
      <ChallengesModal
        isOpen={challengesModalOpen}
        onClose={() => {
          trackEvent("interaction", "profile_desktop_challenges_modal_close");
          setChallengesModalOpen(false);
        }}
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
        onClose={() => {
          trackEvent("interaction", "profile_desktop_edit_challenges_close");
          setEditChallengesModalOpen(false);
        }}
        challenges={createdChallenges}
      />

      <JoinClubsModal
        isOpen={joinClubsModalOpen}
        onClose={() => {
          trackEvent("interaction", "profile_desktop_join_clubs_modal_close");
          setJoinClubsModalOpen(false);
        }}
        onUpdate={() => myClubsQuery.refetch()}
      />

      <ManageClubsModal
        isOpen={manageClubsModalOpen}
        onClose={() => {
          trackEvent("interaction", "profile_desktop_manage_clubs_modal_close");
          setManageClubsModalOpen(false);
        }}
        createdClubs={clubSections.createdClubs}
      />

      {/* Pending Requests Popup with Overlay */}
      {showPendingBox && (
        <div
          className={styles["profile__popup-overlay"]}
          onClick={() => {
            trackEvent("interaction", "profile_desktop_pending_box_close_overlay");
            setShowPendingBox(false);
          }}
        >
          <div
            className={styles["profile__requests-popup"]}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["profile__requests-header"]}>
              <h3 className="typography-desktop-body-small">
                {t("profile.follows.followRequests")}
              </h3>
              <button
                className={styles["profile__requests-close"]}
                onClick={() => {
                  trackEvent("interaction", "profile_desktop_pending_box_close_button");
                  setShowPendingBox(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles["profile__requests-list"]}>
              {pendingRequests && pendingRequests.count > 0 ? (
                pendingRequests.pending_requests.map((request) => (
                  <div
                    key={request.follower_id}
                    className={styles["profile__request-item"]}
                  >
                    <div className={styles["profile__request-user"]}>
                      <div className={`${styles["profile__request-avatar"]} typography-desktop-label-small`}>
                        {request.image ? (
                          <img
                            src={request.image}
                            alt={request.name}
                            className={styles["profile__request-avatar-image"]}
                          />
                        ) : (
                          request.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={styles["profile__request-info"]}>
                        <span
                          className={`${styles["profile__request-name"]} typography-desktop-body-small`}
                        >
                          {request.name}
                        </span>
                        <span
                          className={`${styles["profile__request-type"]} typography-desktop-label-small`}
                        >
                          {request.type}
                        </span>
                      </div>
                    </div>
                    <div className={styles["profile__request-actions"]}>
                      <button
                        className={styles["profile__request-accept"]}
                        onClick={() => handleAcceptRequest(request.follower_id)}
                        disabled={followsLoading}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className={styles["profile__request-reject"]}
                        onClick={() => handleRejectRequest(request.follower_id)}
                        disabled={followsLoading}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles["profile__no-requests"]}>
                  <Mail size={48} color="rgba(15, 23, 42, 0.3)" />
                  <h3 className="typography-desktop-body-small">
                    {t("profile.follows.noPendingRequests")}
                  </h3>
                  <p className="typography-desktop-body-small">
                    {t("profile.follows.noPendingRequestsMessage")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Followers Popup with Overlay */}
      {showFollowersBox && (
        <div
          className={styles["profile__popup-overlay"]}
          onClick={() => {
            trackEvent("interaction", "profile_desktop_followers_close_overlay");
            setShowFollowersBox(false);
          }}
        >
          <div
            className={styles["profile__requests-popup"]}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["profile__requests-header"]}>
              <h3 className="typography-desktop-body-small">
                {t("profile.follows.followers")}
              </h3>
              <button
                className={styles["profile__requests-close"]}
                onClick={() => {
                  trackEvent("interaction", "profile_desktop_followers_close_button");
                  setShowFollowersBox(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles["profile__requests-list"]}>
              {followers && followers.count > 0 ? (
                followers.followers.map((follower) => (
                  <div
                    key={follower.follower_id}
                    className={styles["profile__request-item"]}
                    onClick={() =>
                      handleUserClick(follower.follower_id.toString())
                    }
                  >
                    <div className={styles["profile__request-user"]}>
                      <div className={`${styles["profile__request-avatar"]} typography-desktop-label-small`}>
                        {follower.image ? (
                          <img
                            src={follower.image}
                            alt={follower.name}
                            className={styles["profile__request-avatar-image"]}
                          />
                        ) : (
                          follower.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={styles["profile__request-info"]}>
                        <span
                          className={`${styles["profile__request-name"]} typography-desktop-body-small`}
                        >
                          {follower.name}
                        </span>
                        <span
                          className={`${styles["profile__request-type"]} typography-desktop-label-small`}
                        >
                          {follower.type}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles["profile__no-requests"]}>
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
        </div>
      )}

      {/* Following Popup with Overlay */}
      {showFollowingBox && (
        <div
          className={styles["profile__popup-overlay"]}
          onClick={() => {
            trackEvent("interaction", "profile_desktop_following_close_overlay");
            setShowFollowingBox(false);
          }}
        >
          <div
            className={styles["profile__requests-popup"]}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles["profile__requests-header"]}>
              <h3 className="typography-desktop-body-small">
                {t("profile.follows.following")}
              </h3>
              <button
                className={styles["profile__requests-close"]}
                onClick={() => {
                  trackEvent("interaction", "profile_desktop_following_close_button");
                  setShowFollowingBox(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles["profile__requests-list"]}>
              {following && following.count > 0 ? (
                following.following.map(
                  (followed) => (
                    (
                      <div
                        key={followed.following_id}
                        className={styles["profile__request-item"]}
                      >
                        <div
                          className={styles["profile__request-user"]}
                          onClick={() =>
                            handleUserClick(followed.following_id.toString())
                          }
                        >
                          <div className={`${styles["profile__request-avatar"]} typography-desktop-label-small`}>
                            {followed.image ? (
                              <img
                                src={followed.image}
                                alt={followed.name}
                                className={
                                  styles["profile__request-avatar-image"]
                                }
                              />
                            ) : (
                              followed.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className={styles["profile__request-info"]}>
                            <span
                              className={`${styles["profile__request-name"]} typography-desktop-body-small`}
                            >
                              {followed.name}
                            </span>
                            <span
                              className={`${styles["profile__request-type"]} typography-desktop-label-small`}
                            >
                              {followed.type}
                            </span>
                          </div>
                        </div>
                        <div className={styles["profile__request-actions"]}>
                          <button
                            className={`${styles["profile__request-unfollow"]} typography-desktop-button-small`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnfollow(followed.following_id);
                            }}
                            disabled={followsLoading}
                          >
                            {t("profile.follows.unfollow")}
                          </button>
                        </div>
                      </div>
                    )
                  )
                )
              ) : (
                <div className={styles["profile__no-requests"]}>
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
        </div>
      )}

      <ContactDeveloperPopup
        isOpen={showContactPopup}
        onClose={() => setShowContactPopup(false)}
      />
    </div>
  );
};

export default Profile;
