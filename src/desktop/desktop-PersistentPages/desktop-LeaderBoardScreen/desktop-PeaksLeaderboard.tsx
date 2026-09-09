"use client";

import type React from "react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { X } from "lucide-react";
import AppModal from "../../../shared/components/AppModal";
import styles from "./desktop-PeaksLeaderboard.module.css";
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
        <h3 className={`${styles["modalTitle"]} typography-desktop-body-small`}>
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
              className={`${styles["modalStatLabel"]} typography-desktop-label-medium`}
            >
              {t("communityInfo.uniqueUsers")}
            </span>
          </div>
          <div className={styles["modalStat"]}>
            <span className={styles["modalStatValue"]}>
              {getTotalAscensions(peak)}
            </span>
            <span
              className={`${styles["modalStatLabel"]} typography-desktop-label-medium`}
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
                  className={`${styles["modalUserName"]} typography-desktop-body-small`}
                >
                  {user.name}
                </span>
                <div className={styles["modalUserDetails"]}>
                  <span className={styles["modalUserCompletions"]}>
                    <img
                      src={getElevationIcon(peak.elevation)}
                      alt={t("search.elevationIcon")}
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

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUserClick) {
      onUserClick(peak);
    }
  };

  const handleClimberClick = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    if (onUserNavigation) {
      onUserNavigation(userId);
    }
  };

  const coverImage =
    (peak as CommunityPeak & { image?: string }).image || peak.image_url;

  return (
    <div
      className={`${styles["podiumItem"]} ${
        styles[`podiumItem--${positionClass}`]
      }`}
      onClick={handleClick}
    >
      {/* Peak Image - Positioned to overlap top */}
      <img
        className={styles["peakImage"]}
        src={coverImage || getElevationIcon(peak.elevation)}
        alt={peak.name}
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          img.src = getElevationIcon(peak.elevation);
        }}
      />

      <div className={styles["podiumContent"]}>
        {/* Peak Info */}
        <div className={styles["peakInfo"]}>
          <h3
            className={`${styles["peakName"]} typography-desktop-title-medium`}
          >
            {peak.name_en || peak.name}
          </h3>
        </div>

        {/* Top Stats Row */}
        <div className={styles["topStatsRow"]}>
          <div className={styles["topStat"]}>
            <div
              className={`${styles["topStatLabel"]} typography-desktop-label-small`}
            >
              {t("leaderboard.elevation")}
            </div>
            <div
              className={`${styles["topStatValue"]} typography-desktop-button-small`}
            >
              {formatMeters(peak.elevation)}
            </div>
          </div>
          <div className={styles["topStat"]}>
            <div
              className={`${styles["topStatLabel"]} typography-desktop-label-small`}
            >
              {t("leaderboard.climbers")}
            </div>
            <div className={styles["podium__climbers"]}>
              {peak.users && peak.users.length > 0 ? (
                <>
                  <div
                    className={styles["podium__climber"]}
                    onClick={(e) =>
                      handleClimberClick(e, peak.users[0]?.id || 0)
                    }
                  >
                    <img
                      className={styles["podium__climber-avatar"]}
                      src={peak.users[0]?.image || "/placeholder.svg"}
                      alt={peak.users[0]?.name || t("leaderboard.user")}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span
                      className={`${styles["podium__climber-name"]} typography-desktop-label-small`}
                    >
                      {peak.users[0]?.name || t("leaderboard.user")}
                    </span>
                  </div>
                  {peak.users.length > 1 && (
                    <button
                      className={`${styles["podium__climber-more-btn"]} typography-desktop-button-small`}
                      onClick={handleMoreClick}
                    >
                      +{peak.unique_users - 1} {t("leaderboard.more")}
                    </button>
                  )}
                </>
              ) : (
                <div
                  className={`${styles["topStatValue"]} typography-desktop-button-small`}
                >
                  0
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className={styles["detailsGrid"]}>
          <div className={styles["detailRow"]}>
            <span
              className={`${styles["detailLabel"]} typography-desktop-body-small`}
            >
              {t("common.location")}
            </span>
            <span
              className={`${styles["detailValue"]} typography-desktop-label-small`}
            >
              {getLocationFromHierarchy(peak.admin_hierarchy)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// TABLE ROW COMPONENT
// =================================================================

const TableRow: React.FC<ListItemProps> = ({
  peak,
  index,
  onUserClick,
  onPeakClick,
  onUserNavigation,
}) => {
  const { t } = useI18n();
  const { formatMeters } = useUnitFormat();
  const handleClick = () => {
    if (onPeakClick) {
      onPeakClick(peak);
    }
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUserClick) {
      onUserClick(peak);
    }
  };

  const handleClimberClick = (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    if (onUserNavigation) {
      onUserNavigation(userId);
    }
  };

  const coverImage =
    (peak as CommunityPeak & { image?: string }).image || peak.image_url;

  return (
    <div className={styles["table__row"]} onClick={handleClick}>
      <div
        className={`${styles["table__cell"]} ${styles["table__cell--rank"]} typography-desktop-label-small`}
      >
        {index + 4}
      </div>
      <div
        className={`${styles["table__cell"]} ${styles["table__cell--peak"]}`}
      >
        <img
          className={styles["table__cell-image"]}
          src={coverImage || getElevationIcon(peak.elevation)}
          alt={peak.name}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = getElevationIcon(peak.elevation);
          }}
        />
        <div className={styles["table__cell-info"]}>
          <div
            className={`${styles["table__cell-name"]} typography-desktop-body-small`}
          >
            {peak.name_en || peak.name}
          </div>
          <div className={styles["table__cell-location"]}>
            {getLocationFromHierarchy(peak.admin_hierarchy)}
          </div>
        </div>
      </div>
      <div
        className={`${styles["table__cell"]} ${styles["table__cell--stat"]} typography-desktop-body-small`}
      >
        {formatMeters(peak.elevation)}
      </div>
      <div
        className={`${styles["table__cell"]} ${styles["table__cell--stat"]} typography-desktop-body-small`}
      >
        {peak.unique_users || 0}
      </div>
      <div
        className={`${styles["table__cell"]} ${styles["table__cell--climbers"]}`}
      >
        {peak.users && peak.users.length > 0 ? (
          <>
            <div
              className={styles["table__cell-climber"]}
              onClick={(e) => handleClimberClick(e, peak.users[0]?.id || 0)}
            >
              <img
                className={styles["table__cell-climber-avatar"]}
                src={peak.users[0]?.image || "/placeholder.svg"}
                alt={peak.users[0]?.name || t("leaderboard.user")}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className={styles["table__cell-climber-name"]}>
                {peak.users[0]?.name || t("leaderboard.user")}
              </span>
            </div>
            {peak.users.length > 1 && (
              <button
                className={`${styles["table__cell-more-btn"]} typography-desktop-button-small`}
                onClick={handleMoreClick}
              >
                +{peak.unique_users - 1} {t("leaderboard.more")}
              </button>
            )}
          </>
        ) : (
          t("leaderboard.notAvailable")
        )}
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
      trackEvent("pagination", "peaks_leaderboard_desktop_load_more");
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
    trackEvent("interaction", "peaks_leaderboard_desktop_user_popup_close");
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
          <p className="typography-desktop-body-small">
            {t("leaderboard.loading")}
          </p>
        </div>
      </div>
    );
  }

  // =================================================================
  // MAIN RENDER
  // =================================================================

  // Create podium items array with position mapping
  const podiumItems = [
    { peak: topThree[1], position: 2 as const },
    { peak: topThree[0], position: 1 as const },
    { peak: topThree[2], position: 3 as const },
  ].filter(
    (item): item is { peak: CommunityPeak; position: 1 | 2 | 3 } => !!item.peak
  );

  return (
    <div className={styles["wrapper"]}>
      {/* Podium - Reordered: Silver (left), Gold (middle), Bronze (right) */}
      <div className={styles["podium"]}>
        {podiumItems.map(({ peak, position }) => (
          <PodiumItem
            key={peak.id}
            peak={peak}
            position={position}
            onUserClick={handleUserClick}
            onPeakClick={handlePeakClick}
            onUserNavigation={handleUserNavigation}
          />
        ))}
      </div>

      {/* Table */}
      {others.length > 0 && (
        <div className={styles["table"]}>
          <div
            className={`${styles["table__header"]} typography-desktop-label-small`}
          >
            <div
              className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
            >
              {t("leaderboard.rank")}
            </div>
            <div className={styles["table__header-cell"]}>
              {t("leaderboard.peak")}
            </div>
            <div
              className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
            >
              {t("leaderboard.elevation")}
            </div>
            <div
              className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
            >
              {t("leaderboard.climbers")}
            </div>
            <div
              className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
            >
              {t("leaderboard.climbedBy")}
            </div>
          </div>
          <div className={styles["table__body"]}>
            {others.map((peak, index) => (
              <TableRow
                key={peak.id}
                peak={peak}
                index={index}
                onUserClick={handleUserClick}
                onPeakClick={handlePeakClick}
                onUserNavigation={handleUserNavigation}
              />
            ))}
          </div>
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
            <span className="typography-desktop-body-small">
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
