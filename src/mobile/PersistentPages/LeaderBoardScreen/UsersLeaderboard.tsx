"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import styles from "./UsersLeaderboard.module.css";
import { Trophy, User, MoreVertical } from "lucide-react";
import ReportBlockPopup from "../../components/ReportBlockPopup/ReportBlockPopup";
import { getUserDisplayInfo } from "../../../shared/utils/blockReportUtils";
import {
  getHighestCommunityUsers,
  getCategories,
} from "../../../shared/api/endpoints/user";
import type {
  CommunityUserStats,
  ActivityCategory,
} from "../../../shared/api/types";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";

// =================================================================
// COMPONENT INTERFACES
// =================================================================

interface PodiumItemProps {
  user: CommunityUserStats;
  position: 1 | 2 | 3;
  sortBy: string;
  onUserClick: (userId: number) => void;
  selectedCategoryId: number | null;
  categories: ActivityCategory[];
}

interface ListItemProps {
  user: CommunityUserStats;
  index: number;
  sortBy: string;
  onUserClick: (userId: number) => void;
  selectedCategoryId: number | null;
  categories: ActivityCategory[];
}

interface StatsProps {
  user: CommunityUserStats;
  sortBy: string;
  type: "podium" | "list";
}

// =================================================================
// UTILITY FUNCTIONS
// =================================================================

const getPositionClass = (position: 1 | 2 | 3): string => {
  return position === 1 ? "first" : position === 2 ? "second" : "third";
};

const getAllUserStats = (
  user: CommunityUserStats,
  sortBy: string,
  t: (key: string) => string,
  formatDistance: (km: number | null | undefined) => string,
  formatElevationGain: (m: number | null | undefined) => string
) => {
  const time = (() => {
    const totalSeconds = user.total_time_seconds ?? 0;
    const totalHours = Math.floor(totalSeconds / 3600);

    if (totalHours >= 24) {
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      return `${days}d ${hours}h`;
    }

    if (user.total_time_formatted) {
      const timeParts = user.total_time_formatted.split(":");
      return timeParts.length >= 2
        ? `${timeParts[0]}h ${timeParts[1]}m`
        : `${user.total_time_formatted}h`;
    }

    const hours = totalHours;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  })();

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const baseStats = [
    {
      label: t("userStats.metrics.distance"),
      value: formatDistance(user.total_distance_km),
      key: "total_distance_km",
      isHighlighted: sortBy === "total_distance_km",
    },
    {
      label: "E.Gain",
      value: `+${formatElevationGain(user.total_elevation_gain)}`,
      key: "total_elevation_gain",
      isHighlighted: sortBy === "total_elevation_gain",
    },
    {
      label: t("userStats.metrics.peaks"),
      value: formatNumber(user.total_peaks),
      key: "total_peaks",
      isHighlighted: sortBy === "total_peaks",
    },
    {
      label: t("userStats.metrics.time"),
      value: time,
      key: "total_time_seconds",
      isHighlighted: sortBy === "total_time_seconds",
    },
  ];

  if (sortBy === "total_routes") {
    const stats = baseStats.slice(0, 3);
    stats.push({
      label: t("userStats.metrics.routes"),
      value: formatNumber(user.total_routes),
      key: "total_routes",
      isHighlighted: true,
    });
    return stats;
  }
  return baseStats;
};

// =================================================================
// STATS COMPONENT
// =================================================================

const Stats: React.FC<StatsProps> = ({ user, sortBy, type }) => {
  const { t } = useI18n();
  const { formatDistance, formatElevationGain } = useUnitFormat();
  const stats = getAllUserStats(user, sortBy, t, formatDistance, formatElevationGain);

  if (type === "list") {
    // For list items, show stats in a single row with labels on top
    return (
      <div className={styles["listStatsRow"]}>
        {stats.map((stat) => (
          <div key={`${stat.key}-${sortBy}`} className={styles["statWrapper"]}>
            <div
              className={`${styles["userStatLabel"]} typography-label-medium`}
            >
              {stat.label}
            </div>
            <div
              className={`${styles["userStat"]} ${
                stat.isHighlighted ? styles["userStatHighlighted"] : ""
              }`}
            >
              <span className="typography-label-medium">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // For podium items, show stats in a 2x2 grid with labels
  return (
    <div className={styles["userStatsGrid"]}>
      {stats.map((stat) => (
        <div key={`${stat.key}-${sortBy}`} className={styles["statWrapper"]}>
          <div className={`${styles["userStatLabel"]} typography-label-medium`}>
            {stat.label}
          </div>
          <div
            className={`${styles["userStat"]} ${
              stat.isHighlighted ? styles["userStatHighlighted"] : ""
            }`}
          >
            <span className="typography-label-large">{stat.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// =================================================================
// PODIUM ITEM COMPONENT
// =================================================================

const PodiumItem: React.FC<PodiumItemProps> = ({
  user,
  position,
  sortBy,
  onUserClick,
  selectedCategoryId,
  categories,
}) => {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const positionClass = getPositionClass(position);
  const [showReportBlockPopup, setShowReportBlockPopup] = useState(false);

  const handleClick = () => {
    onUserClick(user.user_id);
  };

  const handleReportBlockClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowReportBlockPopup(true);
  };

  const displayInfo = getUserDisplayInfo(
    user.user_id,
    user.user_name,
    user.user_image,
    t
  );

  // Get the selected category name
  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId
  );
  const activityLabel = selectedCategory
    ? selectedCategory.name
    : t("leaderboard.allActivities");

  return (
    <div
      className={`${styles["podiumItem"]} ${
        styles[`podiumItem--${positionClass}`]
      }`}
      onClick={handleClick}
    >
      <div
        className={`${styles["trophy"]} ${styles[`trophy--${positionClass}`]}`}
      >
        <Trophy size={22} />
      </div>
      <div className={styles["podiumContent"]}>
        <div className={styles["podiumLeft"]}>
          <div className={styles["podiumUserRow"]}>
            {displayInfo.image ? (
              <img
                className={styles["userAvatar"]}
                src={displayInfo.image || "/placeholder.svg"}
                alt={displayInfo.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className={styles["userAvatarPlaceholder"]}>
                <User size={24} />
              </div>
            )}
            <div className={styles["userDetails"]}>
              <div className={`${styles["userName"]} typography-title-medium`}>
                {displayInfo.name}
              </div>
              <div
                className={styles["userActivity"] + " typography-body-small"}
              >
                {activityLabel}
              </div>
            </div>
          </div>
          {(!currentUser ||
            currentUser.internalUserId !== user.user_id) && (
              <button
                className={styles["podium-more-button"]}
                onClick={handleReportBlockClick}
                aria-label="Report or block"
              >
                <MoreVertical size={18} />
              </button>
            )}
        </div>
        {showReportBlockPopup && (
          <ReportBlockPopup
            isOpen={showReportBlockPopup}
            onClose={() => setShowReportBlockPopup(false)}
            userId={user.user_id}
            userName={user.user_name}
            contentType="user"
            contentId={user.user_id}
          />
        )}
        <div className={styles["podiumRight"]}>
          <Stats
            key={`${user.user_id}-${sortBy}`}
            user={user}
            sortBy={sortBy}
            type="podium"
          />
        </div>
      </div>
    </div>
  );
};

// =================================================================
// LIST ITEM COMPONENT
// =================================================================

const ListItem: React.FC<ListItemProps> = ({
  user,
  index,
  sortBy,
  onUserClick,
}) => {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const [showReportBlockPopup, setShowReportBlockPopup] = useState(false);

  const handleClick = () => {
    onUserClick(user.user_id);
  };

  const handleReportBlockClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowReportBlockPopup(true);
  };

  const displayInfo = getUserDisplayInfo(
    user.user_id,
    user.user_name,
    user.user_image,
    t
  );

  return (
    <div className={styles["listItem"]} onClick={handleClick}>
      <div className={styles["listImageWrap"]}>
        <div className={`${styles["rank"]} typography-title-medium`}>
          {index + 4}
        </div>
      </div>
      <div className={styles["listContent"]}>
        <div className={styles["listLeft"]}>
          <div className={styles["listUserRow"]}>
            {displayInfo.image ? (
              <img
                className={styles["userAvatar"]}
                src={displayInfo.image || "/placeholder.svg"}
                alt={displayInfo.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className={styles["userAvatarPlaceholder"]}>
                <User size={20} />
              </div>
            )}
            <div className={styles["userDetails"]}>
              <div className={`${styles["userName"]} typography-title-medium`}>
                {displayInfo.name}
              </div>
            </div>
          </div>
          {(!currentUser ||
            currentUser.internalUserId !== user.user_id) && (
              <button
                className={styles["list-more-button"]}
                onClick={handleReportBlockClick}
                aria-label="Report or block"
              >
                <MoreVertical size={18} />
              </button>
            )}
        </div>
        {showReportBlockPopup && (
          <ReportBlockPopup
            isOpen={showReportBlockPopup}
            onClose={() => setShowReportBlockPopup(false)}
            userId={user.user_id}
            userName={user.user_name}
            contentType="user"
            contentId={user.user_id}
          />
        )}
        <div className={styles["listRight"]}>
          <Stats
            key={`${user.user_id}-${sortBy}`}
            user={user}
            sortBy={sortBy}
            type="list"
          />
        </div>
      </div>
    </div>
  );
};

// =================================================================
// SHIMMER LOADER
// =================================================================

const ShimmerLoader = () => (
  <div className={styles["loadingContainer"]}>
    {[...Array(5)].map((_, i) => (
      <div key={`shimmer-${i}`} className={styles["shimmerItem"]}>
        <div className={styles["shimmerAvatar"]}></div>
        <div className={styles["shimmerText"]}></div>
        <div
          className={`${styles["shimmerText"]} ${styles["shimmerTextShort"]}`}
        ></div>
        <div className={styles["shimmerStats"]}>
          <div className={styles["shimmerStat"]}></div>
          <div className={styles["shimmerStat"]}></div>
          <div className={styles["shimmerStat"]}></div>
        </div>
      </div>
    ))}
  </div>
);

// =================================================================
// EMPTY & ERROR STATES
// =================================================================

const EmptyState = ({
  message,
  icon,
}: {
  message: string;
  icon?: React.ReactNode;
}) => (
  <div className={styles["emptyState"]}>
    <div className={styles["emptyIcon"]}>
      {icon || <User size={48} strokeWidth={1} />}
    </div>
    <p className={`${styles["emptyMessage"]} typography-body-medium`}>
      {message}
    </p>
  </div>
);

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className={`${styles["errorState"]} typography-body-small`}>
    <div className={`${styles["errorIcon"]} typography-body-small`}>⚠️</div>
    <p className={`${styles["errorMessage"]} typography-body-small`}>
      {message}
    </p>
    <button className={styles["retryButton"]} onClick={onRetry}>
      Try Again
    </button>
  </div>
);

// =================================================================
// MAIN COMPONENT
// =================================================================

export default function UsersLeaderboard() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const [users, setUsers] = useState<CommunityUserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState("total_peaks");
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );

  // Initialize filters from query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sortParam = params.get("sort_by");
    if (sortParam) {
      setSortBy(sortParam);
    }
  }, [location.search]);
  const observerRef = useRef<HTMLDivElement>(null);

  // =================================================================
  // DATA FETCHING
  // =================================================================

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    trackEvent("pagination", `users_leaderboard_load_more_${sortBy}`);
    setLoadingMore(true);
    try {
      const res = await getHighestCommunityUsers({
        limit: 20,
        offset,
        sort_by: sortBy,
        category_id: selectedCategoryId,
      });
      console.log("Respone ewqeqw ", res)
      setUsers((prev) => [...prev, ...res.users]);
      setHasMore(res.has_more);
      setOffset(res.pagination.next_offset || 0);
      setError(null);
    } catch (err) {
      setError(
        t("leaderboard.errorLoadingUsers") || "Failed to load more users"
      );
      console.error("Error loading more users:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, offset, sortBy, selectedCategoryId, t, trackEvent]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getHighestCommunityUsers({
          limit: 20,
          offset: 0,
          sort_by: sortBy,
          category_id: selectedCategoryId,
        });
        setUsers(res.users || []);
        setHasMore(res.has_more);
        setOffset(res.pagination.next_offset || 0);
      } catch (err) {
        setError(t("leaderboard.errorLoadingUsers") || "Failed to load users");
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [sortBy, selectedCategoryId, t]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Use the current language from I18nContext
        // If user is authenticated, it will use their language preference
        // If not authenticated, it will use browser language
        const response = await getCategories();
        setCategories(response.categories || []);
      } catch (error) {
        console.warn("Failed to fetch categories:", error);
        setCategories([]);
      }
    };
    fetchCategories();
  }, [language]);

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

  const handleUserClick = useCallback(
    (userId: number) => {
      trackEvent("navigation", `users_leaderboard_user_click_${userId}`);
      // Check if user is trying to view their own profile
      if (user && user.internalUserId === userId) {
        navigate("/profile");
      } else {
        navigate(`/externalprofile/${userId}`);
      }
    },
    [navigate, user, trackEvent]
  );

  const handleRetry = useCallback(() => {
    trackEvent("interaction", "users_leaderboard_retry");
    setError(null);
    setOffset(0);
    setUsers([]);
    setHasMore(false);
    // Trigger re-fetch by updating a dependency
    setSortBy((prev) => prev);
  }, [trackEvent]);

  // =================================================================
  // RENDER HELPERS
  // =================================================================

  const topThree = users.slice(0, 3);
  const others = users.slice(3);
  const hasUsers = users.length > 0;

  // =================================================================
  // LOADING STATE
  // =================================================================

  if (loading && users.length === 0) {
    return (
      <div className={styles["wrapper"]}>
        <div className={styles["loading"]}>
          <div className={styles["loadingSpinner"]}></div>
          <p className="typography-body-medium">{t("leaderboard.loading")}</p>
        </div>
      </div>
    );
  }

  // =================================================================
  // ERROR STATE
  // =================================================================

  if (error) {
    return (
      <div className={styles["wrapper"]}>
        <ErrorState message={error} onRetry={handleRetry} />
      </div>
    );
  }

  // =================================================================
  // MAIN RENDER
  // =================================================================

  return (
    <div className={styles["wrapper"]}>
      {/* Filters */}
      <div className={styles["filters"]}>
        <div className={styles["filterGroup"]}>
          <label className={`${styles["filterLabel"]} typography-label-medium`}>
            {t("leaderboard.filters.sortBy")}:
          </label>
          <select
            className={styles["filterSelect"] + " typography-body-small"}
            value={sortBy}
            onChange={(e) => {
              trackEvent("filter_change", `users_leaderboard_sort_${e.target.value}`);
              setSortBy(e.target.value);
            }}
          >
            <option value="total_distance_km" className="typography-body-small">
              {t("leaderboard.distance")}
            </option>
            <option
              value="total_elevation_gain"
              className="typography-body-small"
            >
              {t("leaderboard.elevation")}
            </option>
            <option value="total_routes" className="typography-body-small">
              {t("leaderboard.routes")}
            </option>
            <option value="total_peaks" className="typography-body-small">
              {t("leaderboard.peaks")}
            </option>
            <option
              value="total_time_seconds"
              className="typography-body-small"
            >
              {t("leaderboard.time")}
            </option>
          </select>
        </div>
        <div className={styles["filterGroup"]}>
          <label className={`${styles["filterLabel"]} typography-label-medium`}>
            {t("leaderboard.filters.activity")}:
          </label>
          <select
            className={styles["filterSelect"] + " typography-body-small"}
            value={selectedCategoryId || ""}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null;
              trackEvent(
                "filter_change",
                `users_leaderboard_category_${value ?? "all"}`
              );
              setSelectedCategoryId(value);
            }}
          >
            <option value="" className="typography-body-small">
              {t("leaderboard.allActivities")}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {hasUsers ? (
        <>
          {/* Podium */}
          {topThree.length > 0 && (
            <div className={styles["podium"]}>
              {topThree.map((user, index) => (
                <PodiumItem
                  key={`podium-${user.user_id || user.user_name || index}`}
                  user={user}
                  position={(index + 1) as 1 | 2 | 3}
                  sortBy={sortBy}
                  onUserClick={handleUserClick}
                  selectedCategoryId={selectedCategoryId}
                  categories={categories}
                />
              ))}
            </div>
          )}

          {/* List */}
          {others.length > 0 && (
            <div className={styles["list"]}>
              {others.map((user, index) => (
                <ListItem
                  key={`list-${user.user_id || user.user_name || index}`}
                  user={user}
                  index={index}
                  sortBy={sortBy}
                  onUserClick={handleUserClick}
                  selectedCategoryId={selectedCategoryId}
                  categories={categories}
                />
              ))}
            </div>
          )}

          {/* Load More Trigger */}
          {hasMore && (
            <div ref={observerRef} className={styles["loadMore"]}>
              {loadingMore && <ShimmerLoader />}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          message={
            t("leaderboard.noUsersFound") ||
            "No users found. Try adjusting your filters or check back later."
          }
        />
      )}
    </div>
  );
}
