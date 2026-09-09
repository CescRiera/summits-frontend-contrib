"use client";

import type React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { X, Trophy } from "lucide-react";
import AppModal from "../../../shared/components/AppModal";
import styles from "./PeaksLeaderboard.module.css";
import { getHighestCommunityPeaks } from "../../../shared/api/endpoints/user";
import type { CommunityPeak, User } from "../../../shared/api/types";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";

// =================================================================
// COMPONENT INTERFACES
// =================================================================

interface PodiumItemProps {
  peak: CommunityPeak;
  position: 1 | 2 | 3;
  onUserClick?: (peak: CommunityPeak) => void;
  onPeakClick?: (peak: CommunityPeak) => void;
  onUserNavigation?: (userId: number) => void;
}

interface ListItemProps {
  peak: CommunityPeak;
  index: number;
  onUserClick?: (peak: CommunityPeak) => void;
  onPeakClick?: (peak: CommunityPeak) => void;
  onUserNavigation?: (userId: number) => void;
}

interface UserModalProps {
  isOpen: boolean;
  peak: CommunityPeak | null;
  onClose: () => void;
  onUserClick: (userId: number) => void;
}

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

const getPositionClass = (position: 1 | 2 | 3): string => {
  return position === 1 ? "first" : position === 2 ? "second" : "third";
};

// Get mountain icon based on elevation
const getElevationIcon = (elevation: number): string => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  if (elevation >= 1000) return "/icons/altitude/ic_mountain_green.png";
  return "/icons/altitude/ic_mountain_green.png";
};

// Calculate total ascensions by summing all completion_count values
const getTotalAscensions = (peak: CommunityPeak): number => {
  if (!peak.users || peak.users.length === 0) return 0;
  return peak.users.reduce(
    (total, user) => total + (user.completion_count || 0),
    0
  );
};

// =================================================================
// USER MODAL COMPONENT
// =================================================================

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  peak,
  onClose,
  onUserClick,
}) => {
  const { t } = useI18n();

  if (!peak) return null;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      ariaLabel={t("leaderboard.climbedBy")}
      contentClassName={styles["modalContent"]}
    >
      <div className={styles["modalHeader"]}>
        <h3 className={`${styles["modalTitle"]} typography-title-medium`}>
          {t("leaderboard.climbedBy")} {peak.name_en || peak.name}
        </h3>
        <button className={styles["modalClose"]} onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className={styles["modalBody"]}>
        <div className={styles["modalStats"]}>
          <div className={styles["modalStat"]}>
            <span className={styles["modalStatValue"]}>{peak.unique_users}</span>
            <span
              className={`${styles["modalStatLabel"]} typography-label-medium`}
            >
              {t("communityInfo.uniqueUsers")}
            </span>
          </div>
          <div className={styles["modalStat"]}>
            <span className={styles["modalStatValue"]}>
              {getTotalAscensions(peak)}
            </span>
            <span
              className={`${styles["modalStatLabel"]} typography-label-medium`}
            >
              {t("communityInfo.totalCompletions")}
            </span>
          </div>
        </div>
        <div className={styles["modalUserList"]}>
          {peak.users?.map((user: User, index: number) => (
            <div
              key={`${user.id}-${index}`}
              className={styles["modalUserItem"]}
              onClick={() => onUserClick(user.id)}
            >
              <img
                className={styles["modalUserAvatar"]}
                src={user.image || "/placeholder.svg"}
                alt={user.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className={styles["modalUserInfo"]}>
                <span
                  className={`${styles["modalUserName"]} typography-title-medium`}
                >
                  {user.name}
                </span>
                <div className={styles["modalUserDetails"]}>
                  <span className={styles["modalUserCompletions"]}>
                    <img
                      src={getElevationIcon(peak.elevation)}
                      alt="Elevation icon"
                      style={{ width: 12, height: 12 }}
                    />
                    {user.completion_count}{" "}
                    {user.completion_count === 1
                      ? t("communityInfo.timeSingle")
                      : t("communityInfo.timePlural")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppModal>
  );
};

// =================================================================
// PODIUM ITEM COMPONENT
// =================================================================

const PodiumItem: React.FC<PodiumItemProps> = ({
  peak,
  position,
  onUserClick,
  onPeakClick,
  onUserNavigation,
}) => {
  const { t } = useI18n();
  const { formatMeters } = useUnitFormat();
  const positionClass = getPositionClass(position);

  const handleClick = () => {
    if (onPeakClick) {
      onPeakClick(peak);
    }
  };

  const coverImage =
    (peak as CommunityPeak & { image?: string }).image || peak.image_url;
  const hasImage = Boolean(coverImage);

  return (
    <div
      className={`${styles["podiumItem"]} ${
        styles[`podiumItem--${positionClass}`]
      }`}
      onClick={handleClick}
    >
      {hasImage ? (
        <img
          className={styles["podiumBackground"]}
          src={coverImage || "/placeholder.svg"}
          alt={peak.name}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className={styles["placeholderBg"]} aria-hidden="true">
          <img
            src={getElevationIcon(peak.elevation)}
            alt="Elevation icon"
            style={{ width: 80, height: 80, opacity: 0.7 }}
          />
        </div>
      )}
      <div
        className={`${styles["trophy"]} ${styles[`trophy--${positionClass}`]}`}
      >
        <Trophy size={22} />
      </div>
      <div className={styles["podiumOverlay"]}></div>
      <div className={styles["podiumContent"]}>
        <div className={`${styles["podiumName"]} typography-title-large`}>
          {peak.name_en || peak.name}
        </div>
        <div className={styles["podiumBottomRow"]}>
          <div className={styles["podiumLeft"]}>
            <div
              className={styles["podiumLocation"] + " typography-body-medium"}
            >
              {getLocationFromHierarchy(peak.admin_hierarchy)}
            </div>
            <div
              className={styles["podiumElevation"] + " typography-body-medium"}
            >
              <img
                src={getElevationIcon(peak.elevation)}
                alt="Elevation icon"
                style={{ width: 16, height: 16 }}
              />
              {formatMeters(peak.elevation)}
            </div>
          </div>
          <div className={styles["podiumRight"]}>
            <div className={styles["podiumUserRow"]}>
              <span
                className={`${styles["podiumUserLabel"]} typography-label-medium`}
              >
                {t("leaderboard.climbedBy")}
              </span>
              {peak.users && peak.users.length > 1 ? (
                <div className={styles["podiumUserRow22"]}>
                  <div
                    className={styles["userChip"]}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUserNavigation && peak.users?.[0]) {
                        onUserNavigation(peak.users[0].id);
                      }
                    }}
                  >
                    <img
                      className={styles["userAvatar"]}
                      src={peak.users?.[0]?.image || "/placeholder.svg"}
                      alt={peak.users?.[0]?.name || "User"}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span
                      className={`${styles["userName"]} typography-title-small`}
                    >
                      {peak.users?.[0]?.name || "User"}
                    </span>
                  </div>
                  <button
                    className={styles["seeAllBtn"]}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUserClick) onUserClick(peak);
                    }}
                  >
                    More
                  </button>
                </div>
              ) : (
                <div
                  className={styles["userChip"]}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUserNavigation && peak.users?.[0]) {
                      onUserNavigation(peak.users[0].id);
                    }
                  }}
                >
                  <img
                    className={styles["userAvatar"]}
                    src={peak.users?.[0]?.image || "/placeholder.svg"}
                    alt={peak.users?.[0]?.name || "User"}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span
                    className={`${styles["userName"]} typography-title-medium`}
                  >
                    {peak.users?.[0]?.name || "User"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// LIST ITEM COMPONENT
// =================================================================

const ListItem: React.FC<ListItemProps> = ({
  peak,
  index,
  onUserClick,
  onPeakClick,
  onUserNavigation,
}) => {
  const { formatMeters } = useUnitFormat();

  const handleClick = () => {
    if (onPeakClick) {
      onPeakClick(peak);
    }
  };

  const coverImage =
    (peak as CommunityPeak & { image?: string }).image || peak.image_url;
  const hasImage = Boolean(coverImage);

  return (
    <div className={styles["listItem"]} onClick={handleClick}>
      <div className={styles["listImageWrap"]}>
        {hasImage ? (
          <img
            className={styles["listImage"]}
            src={coverImage || "/placeholder.svg"}
            alt={peak.name}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className={styles["listPlaceholderBg"]} aria-hidden="true">
            <img
              src={getElevationIcon(peak.elevation)}
              alt="Elevation icon"
              style={{ width: 50, height: 50, opacity: 0.7 }}
            />
          </div>
        )}
        <div className={styles["listOverlay"]}></div>
        <div className={`${styles["rank"]} typography-title-medium`}>
          {index + 4}
        </div>
      </div>
      <div className={styles["listContent"]}>
        <div className={`${styles["listTitle"]} typography-title-medium`}>
          {peak.name_en || peak.name}
        </div>
        <div className={styles["listBottomRow"]}>
          <div className={styles["listLeft"]}>
            <div className={styles["listMeta"]}>
              <div
                className={styles["listElevation"] + " typography-body-small"}
              >
                <img
                  src={getElevationIcon(peak.elevation)}
                  alt="Elevation icon"
                  style={{ width: 12, height: 12 }}
                />
                {formatMeters(peak.elevation)}
              </div>
              <div
                className={styles["listLocation"] + " typography-body-small"}
              >
                {getLocationFromHierarchy(peak.admin_hierarchy)}
              </div>
            </div>
          </div>
          <div className={styles["listRight"]}>
            {peak.users && peak.users.length > 1 ? (
              <>
                <div
                  className={styles["userChip"]}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUserNavigation && peak.users?.[0]) {
                      onUserNavigation(peak.users[0].id);
                    }
                  }}
                >
                  <img
                    className={styles["userAvatar"]}
                    src={peak.users?.[0]?.image || "/placeholder.svg"}
                    alt={peak.users?.[0]?.name || "User"}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span
                    className={`${styles["userName"]} typography-title-small`}
                  >
                    {peak.users?.[0]?.name || "User"}
                  </span>
                </div>
                <button
                  className={styles["seeAllBtn"]}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUserClick) onUserClick(peak);
                  }}
                >
                  More
                </button>
              </>
            ) : (
              <div
                className={styles["userChip"]}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUserNavigation && peak.users?.[0]) {
                    onUserNavigation(peak.users[0].id);
                  }
                }}
              >
                <img
                  className={styles["userAvatar"]}
                  src={peak.users?.[0]?.image || "/placeholder.svg"}
                  alt={peak.users?.[0]?.name || "User"}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span
                  className={`${styles["userName"]} typography-title-small`}
                >
                  {peak.users?.[0]?.name || "User"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

export default function PeaksLeaderboard() {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [peaks, setPeaks] = useState<CommunityPeak[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [selectedPeak, setSelectedPeak] = useState<CommunityPeak | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  // =================================================================
  // DATA FETCHING
  // =================================================================

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const res = await getHighestCommunityPeaks(20, 0);
        console.log("respm¡n", res)
        setPeaks(res.peaks || []);
        setHasMore(res.has_more);
        setOffset(res.pagination.next_offset || 0);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Fetch current user's ID for comparison

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    try {
      trackEvent("pagination", "peaks_leaderboard_load_more");
      setLoadingMore(true);
      const res = await getHighestCommunityPeaks(20, offset);
      setPeaks((prev) => [...prev, ...res.peaks]);
      setHasMore(res.has_more);
      setOffset(res.pagination.next_offset || 0);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, trackEvent]);

  // =================================================================
  // INFINITE SCROLL
  // =================================================================

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, loadingMore]);

  // =================================================================
  // EVENT HANDLERS
  // =================================================================

  const handlePeakClick = (peak: CommunityPeak) => {
    trackEvent("peak_click", `leaderboard_${peak.id}`);
    navigate(`/peaks/${peak.id}`);
  };

  const handleUserClick = (peak: CommunityPeak) => {
    if (peak.users && peak.users.length > 1) {
      trackEvent("button_click", `leaderboard_user_popup_${peak.id}`);
      setSelectedPeak(peak);
      setShowUserPopup(true);
    }
  };

  const handleUserNavigation = (userId: number) => {
    trackEvent("button_click", `leaderboard_user_navigate_${userId}`);
    // Close modal immediately and navigate
    setShowUserPopup(false);

    // Check if user is trying to view their own profile
    if (user && user.internalUserId === userId) {
      navigate("/profile");
    } else {
      navigate(`/externalprofile/${userId}`);
    }
  };

  const closeUserPopup = () => {
    trackEvent("interaction", "peaks_leaderboard_user_popup_close");
    setShowUserPopup(false);
  };

  // =================================================================
  // RENDER HELPERS
  // =================================================================

  const topThree = peaks.slice(0, 3);
  const others = peaks.slice(3);

  // Removed old shimmer for full-card placeholder; we now use shimmerListItem inline

  // =================================================================
  // LOADING STATE
  // =================================================================

  if (loading && peaks.length === 0) {
    return (
      <div className={styles["wrapper"]}>
        <div className={styles["loading"]}>
          <div className={styles["loadingSpinner"]}></div>
          <p className="typography-body-medium">{t("main.loading")}</p>
        </div>
      </div>
    );
  }

  // =================================================================
  // MAIN RENDER
  // =================================================================

  return (
    <div className={styles["wrapper"]}>
      {/* Podium */}
      <div className={styles["podium"]}>
        {topThree.map((peak, index) => (
          <PodiumItem
            key={peak.id}
            peak={peak}
            position={(index + 1) as 1 | 2 | 3}
            onUserClick={handleUserClick}
            onPeakClick={handlePeakClick}
            onUserNavigation={handleUserNavigation}
          />
        ))}
      </div>

      {/* List */}
      {others.length > 0 && (
        <div className={styles["list"]}>
          {others.map((peak, index) => (
            <ListItem
              key={peak.id}
              peak={peak}
              index={index}
              onUserClick={handleUserClick}
              onPeakClick={handlePeakClick}
              onUserNavigation={handleUserNavigation}
            />
          ))}
        </div>
      )}

      {/* Load More Trigger */}
      <div ref={observerRef} className={styles["loadMore"]}>
        {loadingMore && (
          <div className={styles["loadingMore"]}>
            <div className={styles["loadingSpinner"]}></div>
          </div>
        )}
        {!hasMore && !loadingMore && peaks.length > 0 && (
          <div className={styles["noMorePeaks"]}>
            <span className="typography-body-medium">
              {t("leaderboard.noMorePeaks")}
            </span>
          </div>
        )}
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={showUserPopup}
        peak={selectedPeak}
        onClose={closeUserPopup}
        onUserClick={handleUserNavigation}
      />
    </div>
  );
}
