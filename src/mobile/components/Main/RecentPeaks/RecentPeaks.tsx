import React, { useState, useEffect, useRef } from "react";
import { Users, MoreVertical } from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../../shared/context/AuthContext";
import {
  getRecentCommunityPeaks,
  getRecentFollowingPeaks,
  getRecentUserPeaks,
} from "../../../../shared/api/endpoints/user";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import type { 
  RecentCommunityPeak, 
  RecentFollowingPeak 
} from "../../../../shared/api/types/user";
import LoginRequiredPopup from "../../LoginRequiredPopup/LoginRequiredPopup";
import { getElevationColor, getElevationSoftColor } from "../../../../shared/constants/elevationColors";
import HomeHeader from "../HomeHeader/HomeHeader";
import ReportBlockPopup from "../../ReportBlockPopup/ReportBlockPopup";
import {
  getUserDisplayInfo,
  isUserBlocked,
} from "../../../../shared/utils/blockReportUtils";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";
import styles from "./RecentPeaks.module.css";



interface RecentPeaksProps {
  onPeakPress?: (peak: RecentCommunityPeak | RecentFollowingPeak) => void;
  refreshTrigger?: number;
}

const RecentPeaks: React.FC<RecentPeaksProps> = ({
  onPeakPress,
  refreshTrigger,
}) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatMeters } = useUnitFormat();
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [avatarErrors, setAvatarErrors] = useState<Set<number>>(new Set());
  const [filterMode, setFilterMode] = useState<
    "community" | "following" | "user"
  >(() => {
    const saved = localStorage.getItem("recentPeaks_filterMode") as any;
    if (!user && (saved === "following" || saved === "user")) {
      return "community";
    }
    return saved || "community";
  });
  const [peaks, setPeaks] = useState<
    (RecentCommunityPeak | RecentFollowingPeak)[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showReportBlockPopup, setShowReportBlockPopup] = useState(false);
  const [selectedPeak, setSelectedPeak] = useState<
    (RecentCommunityPeak | RecentFollowingPeak) | null
  >(null);
  const hasInitializedRefreshEffectRef = useRef(false);
  const latestRequestIdRef = useRef(0);

  // Fetch data based on current mode
  const fetchData = async () => {
    const requestId = ++latestRequestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      let fetchedPeaks: (RecentCommunityPeak | RecentFollowingPeak)[] = [];
      if (filterMode === "community") {
        const response = await getRecentCommunityPeaks();
        fetchedPeaks = response.peaks || [];
      } else if (filterMode === "following") {
        const response = await getRecentFollowingPeaks();
        fetchedPeaks = response.peaks || [];
      } else if (filterMode === "user") {
        const response = await getRecentUserPeaks();
        fetchedPeaks = response.peaks || [];
      }
      // Don't filter - show all peaks, but mark blocked users
      if (requestId === latestRequestIdRef.current) {
        setPeaks(fetchedPeaks);
      }
    } catch (err) {
      console.error("Error fetching peaks:", err);
      if (requestId === latestRequestIdRef.current) {
        setError("Failed to load peaks");
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Handle filter mode change
  const handleFilterChange = (mode: string) => {
    const typedMode = mode as "community" | "following" | "user";
    if (!user && (typedMode === "following" || typedMode === "user")) {
      // User is not authenticated and trying to switch to following/user mode
      setShowLoginPopup(true);
      return;
    }
    setFilterMode(typedMode);
    localStorage.setItem("recentPeaks_filterMode", typedMode);
  };

  // Get filter display name
  const getFilterDisplayName = (
    mode: "community" | "following" | "user"
  ): string => {
    switch (mode) {
      case "community":
        return t("recentPeaks.filter.community") || "Community";
      case "following":
        return t("recentPeaks.filter.following") || "Following";
      case "user":
        return t("recentPeaks.filter.user") || "You";
      default:
        return "Community";
    }
  };

  // Fetch data when mode changes
  useEffect(() => {
    fetchData();
  }, [filterMode]);

  // Fetch data when refresh trigger changes
  useEffect(() => {
    if (!hasInitializedRefreshEffectRef.current) {
      hasInitializedRefreshEffectRef.current = true;
      return;
    }
    if (refreshTrigger !== undefined) {
      void fetchData();
    }
  }, [refreshTrigger]);

  // Get mountain icon based on elevation (same logic as MapPopup)
  const getMountainIcon = (elevation: number): string => {
    if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
    if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
    if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
    if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
    if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
    if (elevation >= 1000) return "/icons/altitude/ic_mountain_green.png";
    return "/icons/altitude/ic_mountain_green.png";
  };

  const getPeakPlaceholderImage = (elevation: number): string => {
    if (elevation >= 8000) return "/images/peak_placeholder/black.jpg";
    if (elevation >= 6000) return "/images/peak_placeholder/burgundy.jpg";
    if (elevation >= 4000) return "/images/peak_placeholder/red.jpg";
    if (elevation >= 3000) return "/images/peak_placeholder/orange.jpg";
    if (elevation >= 2000) return "/images/peak_placeholder/yellow.jpg";
    return "/images/peak_placeholder/green.jpg";
  };

  // Handle user badge click navigation
  const handleUserBadgeClick = (userId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent peak card click
    // Check if user is trying to view their own profile
    if (user && user.internalUserId === userId) {
      navigate("/profile");
    } else {
      navigate(`/externalprofile/${userId}`);
    }
  };

  // Prepare dropdown options for HomeHeader
  const dropdownOptions = [
    { value: "community", label: getFilterDisplayName("community") },
    { value: "following", label: getFilterDisplayName("following") },
    { value: "user", label: getFilterDisplayName("user") },
  ];

  if (error) {
    return (
      <div className={styles["recent-peaks"]}>
        <HomeHeader
          title={t("recentPeaks.title")}
          subtitle={t("recentPeaks.subtitle")}
          rightContent={{
            type: "dropdown",
            dropdownOptions,
            selectedValue: filterMode,
            onDropdownChange: handleFilterChange,
          }}
        />
        <div
          className={`${styles["recent-peaks__error"]} typography-body-small`}
        >
          <MountainIcon size={24} color="rgb(71, 85, 105)" />
          <p className="typography-body-medium">{error}</p>
        </div>
      </div>
    );
  }

  const handlePeakClick = (peak: RecentCommunityPeak | RecentFollowingPeak) => {
    if (onPeakPress) {
      onPeakPress(peak);
    } else {
      // Navigate to the peak details page
      navigate(`/peaks/${peak.id}`);
    }
  };

  const handleReportBlockClick = (
    peak: RecentCommunityPeak | RecentFollowingPeak,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setSelectedPeak(peak);
    setShowReportBlockPopup(true);
  };

  const handleBlockChange = () => {
    // Refilter peaks after blocking/unblocking
    fetchData();
  };

  const showInitialSkeleton = loading && peaks.length === 0;
  const showRefreshOverlay = loading && peaks.length > 0;

  return (
    <div className={styles["recent-peaks"]}>
      <HomeHeader
        title={t("recentPeaks.title")}
        subtitle={t("recentPeaks.subtitle")}
        rightContent={{
          type: "dropdown",
          dropdownOptions,
          selectedValue: filterMode,
          onDropdownChange: handleFilterChange,
        }}
      />

      <div className={styles["recent-peaks__container"]}>
        <div className={styles["recent-peaks__scroll"]}>
          {showInitialSkeleton ? (
            [0, 1, 2].map((i) => (
              <div key={i} className={styles["recent-peaks__skeleton-card"]}>
                <div className={styles["recent-peaks__skeleton-image"]} />
                <div className={styles["recent-peaks__skeleton-info"]}>
                  <div className={styles["recent-peaks__skeleton-title"]} />
                  <div className={styles["recent-peaks__skeleton-subtitle"]} />
                </div>
              </div>
            ))
          ) : peaks.length === 0 ? (
            <div className={styles["recent-peaks__empty"]}>
              <div className={styles["recent-peaks__empty-icon"]}>
                <MountainIcon size={32} color="rgb(71, 85, 105)" />
                <Users
                  size={16}
                  className={styles["recent-peaks__floating-icon"]}
                  color="#c2cf94"
                />
              </div>
              <h3 className="typography-title-small">No Recent Activity</h3>
              <p className="typography-body-medium">
                Check back later for recent peak completions!
              </p>
            </div>
          ) : (
            <>
              {peaks.map((peak) => (
                <div
                  key={peak.id}
                  className={styles["recent-peaks__card"]}
                  onClick={() => handlePeakClick(peak)}
                >
                  {/* Peak Image */}
                  <div
                    className={`${styles["recent-peaks__image-section"]} ${
                      !peak.image || imgErrors.has(peak.id)
                        ? styles["recent-peaks__image-section--placeholder"]
                        : ""
                    }`}
                    style={
                      !peak.image || imgErrors.has(peak.id)
                        ? { backgroundColor: getElevationSoftColor(peak.elevation) }
                        : {}
                    }
                  >
                    {peak.image && !imgErrors.has(peak.id) ? (
                      <img
                        src={peak.image}
                        alt={peak.name}
                        className={styles["recent-peaks__image"]}
                        onError={() =>
                          setImgErrors(
                            (prev) => new Set([...Array.from(prev), peak.id])
                          )
                        }
                      />
                    ) : (
                      <img
                        src={getPeakPlaceholderImage(peak.elevation)}
                        alt={peak.name}
                        className={styles["recent-peaks__image--placeholder"]}
                      />
                    )}

                    {/* User Badge */}
                    <div
                      className={styles["recent-peaks__user-badge"]}
                      onClick={(e) => handleUserBadgeClick(peak.user.id, e)}
                    >
                      {(() => {
                        const userInfo = getUserDisplayInfo(
                          peak.user.id,
                          peak.user.name,
                          peak.user.image,
                          t
                        );
                        const isBlocked = isUserBlocked(peak.user.id);
                        return (
                          <>
                            {userInfo.image &&
                            !avatarErrors.has(peak.user.id) &&
                            !isBlocked ? (
                              <img
                                src={userInfo.image}
                                alt={userInfo.name}
                                className={
                                  styles["recent-peaks__user-avatar"]
                                }
                                onError={() =>
                                  setAvatarErrors(
                                    (prev) =>
                                      new Set([
                                        ...Array.from(prev),
                                        peak.user.id,
                                      ])
                                  )
                                }
                              />
                            ) : (
                              <div
                                className={
                                  styles[
                                    "recent-peaks__user-avatar-placeholder"
                                  ]
                                }
                              >
                                {isBlocked
                                  ? "?"
                                  : userInfo.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span
                              className={`${styles["recent-peaks__user-name"]} typography-title-small`}
                            >
                              {userInfo.name}
                            </span>
                          </>
                        );
                      })()}
                    </div>

                    {/* Date Badge and More Button */}
                    <div className={styles["recent-peaks__date-actions"]}>
                      <div className={styles["recent-peaks__date-badge"]}>
                        <span className="typography-label-medium">
                          {new Date(peak.most_recent_date).toLocaleDateString()}
                        </span>
                      </div>
                      {(!user || user.internalUserId !== peak.user.id) && (
                        <button
                          className={styles["recent-peaks__more-button"]}
                          onClick={(e) => handleReportBlockClick(peak, e)}
                          aria-label="Report or block"
                        >
                          <MoreVertical size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Peak Info */}
                  <div className={styles["recent-peaks__info"]}>
                    <div
                      className={`${styles["recent-peaks__name-section"]} typography-title-small`}
                    >
                      <h3
                        className={`${styles["recent-peaks__name"]} typography-title-small`}
                      >
                        {peak.name_en || peak.name}
                      </h3>
                      <div className={styles["recent-peaks__location"]}>
                        <div
                          className={
                            styles["recent-peaks__elevation-container"]
                          }
                        >
                          <img
                            src={getMountainIcon(peak.elevation)}
                            alt="Mountain icon"
                            className={styles["recent-peaks__elevation-icon"]}
                          />
                          <span
                            className={`${styles["recent-peaks__elevation-text"]} typography-title-small`}
                            style={{ color: getElevationColor(peak.elevation) }}
                          >
                            {formatMeters(peak.elevation)}
                          </span>
                        </div>
                        <span
                          className={`${styles["recent-peaks__location-text"]} typography-body-small`}
                        >
                          {getLocationFromHierarchy(peak.admin_hierarchy)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Shimmer skeleton loading */}
          {showRefreshOverlay && (
            <div className={styles["recent-peaks__loading-overlay"]}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles["recent-peaks__skeleton-card"]}>
                  <div className={styles["recent-peaks__skeleton-image"]} />
                  <div className={styles["recent-peaks__skeleton-info"]}>
                    <div className={styles["recent-peaks__skeleton-title"]} />
                    <div className={styles["recent-peaks__skeleton-subtitle"]} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLoginPopup && (
        <LoginRequiredPopup
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
          message="auth.loginRequired.followingMode"
        />
      )}

      {showReportBlockPopup && selectedPeak && (
        <ReportBlockPopup
          isOpen={showReportBlockPopup}
          onClose={() => {
            setShowReportBlockPopup(false);
            setSelectedPeak(null);
          }}
          userId={selectedPeak.user.id}
          userName={selectedPeak.user.name}
          contentType="user"
          contentId={selectedPeak.user.id}
          onBlockChange={handleBlockChange}
        />
      )}
    </div>
  );
};

export default RecentPeaks;
