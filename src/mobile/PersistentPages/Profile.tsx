import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../shared/context/AuthContext";
import { useI18n } from "../../shared/context/I18nContext";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import styles from "./Profile.module.css";
import LoginRegister from "../components/LoginRegister/LoginRegister";
import ProfileMenu from "./Profile/components/ProfileMenu";
import { Mail, Check, X, Plus, Pencil, Globe, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getUserDetails,
  updateProfileImage,
  updateUserName,
  getUserStats,
  getStatsGraph,
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
import LoadingScreen from "../components/LoadingScreen/LoadingScreen";
import { useSearchParams } from "react-router-dom";
import UserStatisticsSection from "./Profile/components/UserStatisticsSection";
import HelpPopup from "./Profile/components/ProfilePopups/HelpPopup/HelpPopup";
import ContributePopup from "./Profile/components/ProfilePopups/ContributePopup/ContributePopup";
import LanguageChangePopup from "./Profile/components/ProfilePopups/LanguageChangePopup/LanguageChangePopup";
import UnitSystemPopup from "./Profile/components/ProfilePopups/UnitSystemPopup/UnitSystemPopup";
import { formatStatInteger } from "../utils/numberFormatting";
import AppModal from "../../shared/components/AppModal";

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
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
  const [searchParams] = useSearchParams();
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editedNameInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [graph, setGraph] = useState<StatsGraphResponse | null>(null);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showContributePopup, setShowContributePopup] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [showUnitSystemPopup, setShowUnitSystemPopup] = useState(false);

  useEffect(() => {
    if (!isEditingName) return;

    const timeoutId = window.setTimeout(() => {
      editedNameInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isEditingName]);

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
        trackEvent("interaction", "profile_avatar_upload_success");
        const imageUrl = result.image_url;
        setUserDetails((prev) => (prev ? { ...prev, image: imageUrl } : null));
      } else {
        trackEvent("interaction", "profile_avatar_upload_failed");
        alert(result.error || "Failed to update profile image");
      }
    } catch (error) {
      trackEvent("interaction", "profile_avatar_upload_failed");
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
      trackEvent("button_click", "profile_avatar_click");
      fileInputRef.current.click();
    }
  };

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
        const [details, counts, pending, userStats, statsGraph] = await Promise.all([
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
        const [latest, counts, pending, userStats, statsGraph] = await Promise.all([
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

  // Close all modals when navigating away from the Profile page
  useEffect(() => {
    // Only close modals if we're leaving the profile page
    if (location.pathname !== "/profile") {
      setShowFollowersBox(false);
      setShowFollowingBox(false);
      setShowPendingBox(false);
      setShowHelpPopup(false);
      setShowContributePopup(false);
      setShowLanguagePopup(false);
      setShowUnitSystemPopup(false);
    }
  }, [location.pathname]);

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

    setShowHelpPopup(true);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("help");
    const nextQueryString = nextSearchParams.toString();

    navigate(nextQueryString ? `/profile?${nextQueryString}` : "/profile", {
      replace: true,
    });
  }, [searchParams, navigate]);

  if (!user) {
    return (
      <div className={styles["profile__auth-container"]}>
        {/* Top Actions for Guest Users */}
        <div className={styles["profile__guest-top-actions"]}>
          <button
            className={styles["profile__guest-action-button"]}
            onClick={() => setShowLanguagePopup(true)}
          >
            <Globe size={18} />
            <span className={`${styles["profile__guest-action-label"]} typography-label-medium`}>
              {t("profile.language")}
            </span>
          </button>
          <button
            className={styles["profile__guest-action-button"]}
            onClick={() => setShowUnitSystemPopup(true)}
          >
            <Ruler size={18} />
            <span className={`${styles["profile__guest-action-label"]} typography-label-medium`}>
              {t("profile.unitSystem")}
            </span>
          </button>
        </div>

        <LoginRegister />

        {/* Help Button - Fixed bottom right (only when not authenticated) */}
        <div className={styles["profile__help-actions"]}>
          <button
            className={`${styles["profile__help-link"]} typography-body-medium`}
            onClick={() => {
              trackEvent("button_click", "profile_contribute_open");
              setShowContributePopup(true);
            }}
          >
            {t("profile.donateQuestion")}
          </button>
          <button
            className={`${styles["profile__help-link"]} typography-body-medium`}
            onClick={() => {
              trackEvent("navigation", "profile_help_open");
              setShowHelpPopup(true);
            }}
          >
            {t("profile.needHelp")}
          </button>
        </div>
        <ContributePopup
          isOpen={showContributePopup}
          onClose={() => setShowContributePopup(false)}
        />
        <HelpPopup
          isOpen={showHelpPopup}
          onClose={() => setShowHelpPopup(false)}
        />
        <LanguageChangePopup
          isOpen={showLanguagePopup}
          onClose={() => setShowLanguagePopup(false)}
        />
        <UnitSystemPopup
          isOpen={showUnitSystemPopup}
          onClose={() => setShowUnitSystemPopup(false)}
        />
      </div>
    );
  }

  const handleDeleteAccount = () => {
    // TODO: Implement delete account functionality
  };



  const handleAcceptRequest = async (followerId: number) => {
    try {
      trackEvent("social", `profile_follow_request_accept_${followerId}`);
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
      trackEvent("social", "profile_follow_request_accept_failed");
      console.error("Failed to accept follow request:", error);
    } finally {
      setFollowsLoading(false);
    }
  };

  const handleRejectRequest = async (followerId: number) => {
    try {
      trackEvent("social", `profile_follow_request_reject_${followerId}`);
      setFollowsLoading(true);
      await rejectFollowRequest({ follower_id: followerId });
      // Refresh pending requests
      const updatedPending = await getPendingFollowRequests();
      setPendingRequests(updatedPending);
    } catch (error) {
      trackEvent("social", "profile_follow_request_reject_failed");
      console.error("Failed to reject follow request:", error);
    } finally {
      setFollowsLoading(false);
    }
  };

  const handleUnfollow = async (followingId: number) => {
    try {
      trackEvent("social", `profile_unfollow_${followingId}`);
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
      trackEvent("social", "profile_unfollow_failed");
      console.error("Failed to unfollow user:", error);
    } finally {
      setFollowsLoading(false);
    }
  };

  const handleUserClick = (externalUserId: string) => {
    trackEvent("navigation", `profile_open_external_profile_${externalUserId}`);
    // Close all modals before navigating away
    setShowFollowersBox(false);
    setShowFollowingBox(false);
    navigate(`/externalprofile/${externalUserId}`);
  };

  const togglePendingBox = () => {
    trackEvent(
      "interaction",
      `profile_pending_box_${showPendingBox ? "close" : "open"}`
    );
    setShowPendingBox(!showPendingBox);
  };

  const handleFollowersClick = async () => {
    trackEvent("button_click", "profile_followers_click");
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
    trackEvent("button_click", "profile_following_click");
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
    trackEvent("interaction", `profile_privacy_${isPrivate ? "private" : "public"}`);
    setUserDetails((prev) => {
      if (!prev) return prev;
      return { ...prev, is_private: isPrivate };
    });
  };

  const handleRefreshUserDetails = async () => {
    trackEvent("interaction", "profile_refresh_user_details");
    if (!user) return;
    try {
      const details = await getUserDetails();
      setUserDetails(details);
    } catch (error) {
      console.error("Failed to refresh user details:", error);
    }
  };

  const handleEditNameClick = () => {
    trackEvent("interaction", "profile_name_edit_open");
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
        trackEvent("interaction", "profile_name_update_success");
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
    trackEvent("interaction", "profile_name_edit_cancel");
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
    <div className={styles["profile"]}>
        {/* Header Section - New Layout */}
        <div className={styles["profile__header"]}>
          {/* Top Right Inbox Button - Always Visible */}
          <div className={styles["profile__inbox-container"]}>
            <button
              className={styles["profile__inbox-button"]}
              onClick={togglePendingBox}
            >
              <Mail size={18} />
              {pendingRequests && pendingRequests.count > 0 && (
                <span className={styles["profile__inbox-indicator"]}></span>
              )}
            </button>
          </div>

          {/* Main Profile Section */}
          <div className={styles["profile__main-section"]}>
            {/* Avatar with Account Type */}
            <div className={styles["profile__avatar-container"]}>
              <div
                className={`${styles["profile__avatar"]} ${
                  user ? styles["profile__avatar--clickable"] : ""
                }`}
                onClick={handleAvatarClick}
              >
                {userDetails?.image ? (
                  <img
                    src={userDetails.image}
                    alt="Profile"
                    className={styles["profile__avatar-image"]}
                    onError={(e) => {
                      // Fallback to initials if image fails to load
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
                  <div className={styles["profile__avatar-edit-button"]}>
                    <Plus size={16} />
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
                disabled={uploadingImage}
              />
            </div>

            {/* User Name and Stats */}
            <div
              className={`${styles["profile__name-section"]} typography-title-medium`}
            >
              <AnimatePresence mode="wait">
                {isEditingName ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className={styles["profile__name-edit"]}
                  >
                    <input
                      ref={editedNameInputRef}
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className={`${styles["profile__name-input"]} typography-title-medium`}
                      maxLength={100}
                      disabled={updatingName}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") handleCancelEditName();
                      }}
                    />
                    <div className={styles["profile__name-edit-actions"]}>
                      <button
                        onClick={handleSaveName}
                        disabled={updatingName}
                        className={styles["profile__name-save-btn"]}
                        aria-label="Save name"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={handleCancelEditName}
                        disabled={updatingName}
                        className={styles["profile__name-cancel-btn"]}
                        aria-label="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className={styles["profile__name-container"]}
                  >
                    <h1
                      className={`${styles["profile__name"]} typography-title-medium`}
                      onClick={handleEditNameClick}
                    >
                      {userDetails?.externalUsername || "Unnamed User"}
                    </h1>
                    <button
                      onClick={handleEditNameClick}
                      className={styles["profile__name-edit-icon"]}
                      aria-label="Edit name"
                    >
                      <Pencil size={14} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stats Row - Right under the name */}
              <div className={styles["profile__stats-row"]}>
                <div className={styles["profile__stat-item"]}>
                  <span
                    className={`${styles["profile__stat-number"]} typography-title-large`}
                  >
                    {formatStatInteger(userDetails?.total_user_peaks ?? 0)}
                  </span>
                  <span
                    className={`${styles["profile__stat-label"]} typography-label-medium`}
                  >
                    {t("profile.follows.peaks")}
                  </span>
                </div>
                <div
                  className={styles["profile__stat-item"]}
                  onClick={handleFollowersClick}
                >
                  <span
                    className={`${styles["profile__stat-number"]} typography-title-large`}
                  >
                    {formatStatInteger(followCounts?.followers_count ?? 0)}
                  </span>
                  <span
                    className={`${styles["profile__stat-label"]} typography-label-medium`}
                  >
                    {t("profile.follows.followers")}
                  </span>
                </div>
                <div
                  className={styles["profile__stat-item"]}
                  onClick={handleFollowingClick}
                >
                  <span
                    className={`${styles["profile__stat-number"]} typography-title-large`}
                  >
                    {formatStatInteger(followCounts?.following_count ?? 0)}
                  </span>
                  <span
                    className={`${styles["profile__stat-label"]} typography-label-medium`}
                  >
                    {t("profile.follows.following")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Requests Popup with Overlay */}
          <AppModal
            open={showPendingBox}
            onClose={() => {
              trackEvent("interaction", "profile_pending_box_close_overlay");
              setShowPendingBox(false);
            }}
            variant="dialog"
            contentClassName={styles["profile__requests-popup"]}
            ariaLabel={t("profile.follows.followRequests")}
          >
            <div className={styles["profile__requests-header"]}>
              <h3 className="typography-title-medium">
                {t("profile.follows.followRequests")}
              </h3>
              <button
                className={styles["profile__requests-close"]}
                onClick={() => {
                  trackEvent("interaction", "profile_pending_box_close_button");
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
                      <div className={styles["profile__request-avatar"]}>
                        {request.image ? (
                          <img
                            src={request.image}
                            alt={request.name}
                            className={
                              styles["profile__request-avatar-image"]
                            }
                          />
                        ) : (
                          request.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={styles["profile__request-info"]}>
                        <span
                          className={`${styles["profile__request-name"]} typography-title-medium`}
                        >
                          {request.name}
                        </span>
                        <span
                          className={`${styles["profile__request-type"]} typography-label-small`}
                        >
                          {request.type}
                        </span>
                      </div>
                    </div>
                    <div className={styles["profile__request-actions"]}>
                      <button
                        className={styles["profile__request-accept"]}
                        onClick={() =>
                          handleAcceptRequest(request.follower_id)
                        }
                        disabled={followsLoading}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className={styles["profile__request-reject"]}
                        onClick={() =>
                          handleRejectRequest(request.follower_id)
                        }
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
                  <h3 className="typography-title-medium">
                    {t("profile.follows.noPendingRequests")}
                  </h3>
                  <p className="typography-body-medium">
                    {t("profile.follows.noPendingRequestsMessage")}
                  </p>
                </div>
              )}
            </div>
          </AppModal>

          {/* Followers Popup with Overlay */}
          <AppModal
            open={showFollowersBox}
            onClose={() => {
              trackEvent("interaction", "profile_followers_close_overlay");
              setShowFollowersBox(false);
            }}
            variant="dialog"
            contentClassName={styles["profile__requests-popup"]}
            ariaLabel={t("profile.follows.followers")}
          >
            <div className={styles["profile__requests-header"]}>
              <h3 className="typography-title-medium">
                {t("profile.follows.followers")}
              </h3>
              <button
                className={styles["profile__requests-close"]}
                onClick={() => {
                  trackEvent("interaction", "profile_followers_close_button");
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
                      <div className={styles["profile__request-avatar"]}>
                        {follower.image ? (
                          <img
                            src={follower.image}
                            alt={follower.name}
                            className={
                              styles["profile__request-avatar-image"]
                            }
                          />
                        ) : (
                          follower.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={styles["profile__request-info"]}>
                        <span
                          className={`${styles["profile__request-name"]} typography-title-medium`}
                        >
                          {follower.name}
                        </span>
                        <span
                          className={`${styles["profile__request-type"]} typography-label-small`}
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
                  <h3 className="typography-title-medium">
                    {t("profile.follows.noFollowers")}
                  </h3>
                  <p className="typography-body-medium">
                    {t("profile.follows.noFollowersMessage")}
                  </p>
                </div>
              )}
            </div>
          </AppModal>

          {/* Following Popup with Overlay */}
          <AppModal
            open={showFollowingBox}
            onClose={() => {
              trackEvent("interaction", "profile_following_close_overlay");
              setShowFollowingBox(false);
            }}
            variant="dialog"
            contentClassName={styles["profile__requests-popup"]}
            ariaLabel={t("profile.follows.following")}
          >
            <div className={styles["profile__requests-header"]}>
              <h3 className="typography-title-medium">
                {t("profile.follows.following")}
              </h3>
              <button
                className={styles["profile__requests-close"]}
                onClick={() => {
                  trackEvent("interaction", "profile_following_close_button");
                  setShowFollowingBox(false);
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div className={styles["profile__requests-list"]}>
              {following && following.count > 0 ? (
                following.following.map((followed) => (
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
                      <div className={styles["profile__request-avatar"]}>
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
                          className={`${styles["profile__request-name"]} typography-title-medium`}
                        >
                          {followed.name}
                        </span>
                        <span
                          className={`${styles["profile__request-type"]} typography-label-small`}
                        >
                          {followed.type}
                        </span>
                      </div>
                    </div>
                    <div className={styles["profile__request-actions"]}>
                      <button
                        className={`${styles["profile__request-unfollow"]} typography-button-small`}
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
                ))
              ) : (
                <div className={styles["profile__no-requests"]}>
                  <Mail size={48} color="rgba(15, 23, 42, 0.3)" />
                  <h3 className="typography-title-medium">
                    {t("profile.follows.notFollowingAnyone")}
                  </h3>
                  <p className="typography-body-medium">
                    {t("profile.follows.notFollowingAnyoneMessage")}
                  </p>
                </div>
              )}
            </div>
          </AppModal>
        </div>

        <div className={styles["profile__content"]}>
          <UserStatisticsSection
            totalSavedPeaks={userDetails?.total_saved_peaks}
            totalSavedShelters={userDetails?.total_saved_shelters}
            initialStats={stats}
            initialGraph={graph}
          />
          <div className={styles["profile__menu"]}>
            <ProfileMenu
              onLogout={() => {
                trackEvent("auth", "profile_logout");
                logout();
              }}
              onDeleteAccount={handleDeleteAccount}
              isPrivate={userDetails?.is_private || false}
              onPrivacyChange={handlePrivacyChange}
              userDetails={userDetails}
              onRefreshUserDetails={handleRefreshUserDetails}
            />
          </div>
        </div>
        <HelpPopup
          isOpen={showHelpPopup}
          onClose={() => setShowHelpPopup(false)}
        />
    </div>
  );
};

export default Profile;
