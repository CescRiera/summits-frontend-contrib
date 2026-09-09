"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import styles from "./desktop-UsersLeaderboard.module.css";
import { User } from "lucide-react";
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
  formatDistance: (val: number | undefined | null) => string,
  formatElevationGain: (val: number | undefined | null) => string
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
      label: t("leaderboard.elevationGain"),
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
      label: t("userStats.metrics.routes"),
      value: formatNumber(user.total_routes),
      key: "total_routes",
      isHighlighted: sortBy === "total_routes",
    },
    {
      label: t("userStats.metrics.time"),
      value: time,
      key: "total_time_seconds",
      isHighlighted: sortBy === "total_time_seconds",
    },
  ];

  return baseStats;
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
  const { formatDistance, formatElevationGain } = useUnitFormat();
  const positionClass = getPositionClass(position);

  const handleClick = () => {
    onUserClick(user.user_id);
  };

  // Get the selected category name
  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId
  );
  const activityLabel = selectedCategory
    ? selectedCategory.name
    : t("leaderboard.allActivities");

  // Get top 2 highlighted stats based on sortBy
  const stats = getAllUserStats(user, sortBy, t, formatDistance, formatElevationGain);
  const topTwoStats = stats.filter((s) => s.isHighlighted).slice(0, 2);
  if (topTwoStats.length < 2) {
    topTwoStats.push(
      ...stats.filter((s) => !s.isHighlighted).slice(0, 2 - topTwoStats.length)
    );
  }

  return (
    <div
      className={`${styles["podiumItem"]} ${
        styles[`podiumItem--${positionClass}`]
      }`}
      onClick={handleClick}
    >
      {/* Avatar - Positioned to overlap top */}
      <img
        className={styles["userAvatar"]}
        src={user.user_image || "/placeholder.svg"}
        alt={user.user_name}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      <div className={styles["podiumContent"]}>
        {/* User Info */}
        <div className={styles["userInfo"]}>
          <h3 className={`${styles["userName"]} typography-desktop-title-medium`}>
            {user.user_name}
          </h3>
          <div
            className={`${styles["userActivity"]} typography-desktop-label-small`}
          >
            {activityLabel}
          </div>
        </div>

        {/* Top Stats Row */}
        <div className={styles["topStatsRow"]}>
          {topTwoStats.map((stat) => (
            <div key={stat.key} className={styles["topStat"]}>
              <div
                className={`${styles["topStatLabel"]} typography-desktop-label-small`}
              >
                {stat.label}
              </div>
              <div
                className={`${styles["topStatValue"]} typography-desktop-button-small`}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Details Grid */}
        <div className={styles["detailsGrid"]}>
          {stats.slice(2).map((stat) => (
            <div key={stat.key} className={styles["detailRow"]}>
              <span
                className={`${styles["detailLabel"]} typography-desktop-body-small`}
              >
                {stat.label}
              </span>
              <span
                className={`${styles["detailValue"]} typography-desktop-label-small`}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =================================================================
// TABLE ROW COMPONENT
// =================================================================

const TableRow: React.FC<ListItemProps> = ({
  user,
  index,
  sortBy,
  onUserClick,
  selectedCategoryId,
  categories,
}) => {
  const { t } = useI18n();
  const { formatDistance, formatElevationGain } = useUnitFormat();

  const handleClick = () => {
    onUserClick(user.user_id);
  };

  // Get the selected category name
  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId
  );
  const activityLabel = selectedCategory
    ? selectedCategory.name
    : t("leaderboard.allActivities");

  // Get all stats
  const stats = getAllUserStats(user, sortBy, t, formatDistance, formatElevationGain);

  return (
    <div className={styles["table__row"]} onClick={handleClick}>
      <div
        className={`${styles["table__cell"]} ${styles["table__cell--rank"]} typography-desktop-label-small`}
      >
        {index + 4}
      </div>
      <div
        className={`${styles["table__cell"]} ${styles["table__cell--user"]}`}
      >
        <img
          className={styles["table__cell-avatar"]}
          src={user.user_image || "/placeholder.svg"}
          alt={user.user_name}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <div className={styles["table__cell-name"]}>
          <div
            className={`${styles["table__cell-username"]} typography-desktop-body-small`}
          >
            {user.user_name}
          </div>
        </div>
      </div>
      <div
        className={`${styles["table__cell"]} ${styles["table__cell--stat"]} typography-desktop-body-small`}
      >
        {activityLabel}
      </div>
      {stats.map((stat) => (
        <div
          key={stat.key}
          className={`${styles["table__cell"]} ${styles["table__cell--stat"]} ${
            stat.isHighlighted
              ? `${styles["table__cell--stat-highlighted"]} typography-desktop-label-small`
              : "typography-desktop-body-small"
          }`}
        >
          {stat.value}
        </div>
      ))}
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
    <p className={`${styles["emptyMessage"]} typography-desktop-body-small`}>
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
}) => {
  const { t } = useI18n();
  return (
    <div className={`${styles["errorState"]} typography-desktop-label-medium`}>
      <div className={`${styles["errorIcon"]} typography-desktop-label-medium`}>
        ⚠️
      </div>
      <p
        className={`${styles["errorMessage"]} typography-desktop-label-medium`}
      >
        {message}
      </p>
      <button className={styles["retryButton"]} onClick={onRetry}>
        {t("leaderboard.tryAgain")}
      </button>
    </div>
  );
};

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
    trackEvent("pagination", `users_leaderboard_desktop_load_more_${sortBy}`);
    setLoadingMore(true);
    try {
      const res = await getHighestCommunityUsers({
        limit: 20,
        offset,
        sort_by: sortBy,
        category_id: selectedCategoryId,
      });
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
      trackEvent("navigation", `users_leaderboard_desktop_user_click_${userId}`);
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
    trackEvent("interaction", "users_leaderboard_desktop_retry");
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
          <p className="typography-desktop-body-small">
            {t("leaderboard.loading")}
          </p>
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
          <label
            className={`${styles["filterLabel"]} typography-desktop-label-medium`}
          >
            {t("leaderboard.filters.sortBy")}:
          </label>
          <select
            className={
              styles["filterSelect"] + " typography-desktop-label-medium"
            }
            value={sortBy}
            onChange={(e) => {
              trackEvent(
                "filter_change",
                `users_leaderboard_desktop_sort_${e.target.value}`
              );
              setSortBy(e.target.value);
            }}
          >
            <option
              value="total_distance_km"
              className="typography-desktop-label-medium"
            >
              {t("leaderboard.distance")}
            </option>
            <option
              value="total_elevation_gain"
              className="typography-desktop-label-medium"
            >
              {t("leaderboard.elevation")}
            </option>
            <option
              value="total_routes"
              className="typography-desktop-label-medium"
            >
              {t("leaderboard.routes")}
            </option>
            <option
              value="total_peaks"
              className="typography-desktop-label-medium"
            >
              {t("leaderboard.peaks")}
            </option>
            <option
              value="total_time_seconds"
              className="typography-desktop-label-medium"
            >
              {t("leaderboard.time")}
            </option>
          </select>
        </div>
        <div className={styles["filterGroup"]}>
          <label
            className={`${styles["filterLabel"]} typography-desktop-label-medium`}
          >
            {t("leaderboard.filters.activity")}:
          </label>
          <select
            className={
              styles["filterSelect"] + " typography-desktop-label-medium"
            }
            value={selectedCategoryId || ""}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null;
              trackEvent(
                "filter_change",
                `users_leaderboard_desktop_category_${value ?? "all"}`
              );
              setSelectedCategoryId(value);
            }}
          >
            <option value="" className="typography-desktop-label-medium">
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
          {/* Podium - Reordered: Silver (left), Gold (middle), Bronze (right) */}
          {topThree.length > 0 && (
            <div className={styles["podium"]}>
              {[
                { user: topThree[1], position: 2 as const },
                { user: topThree[0], position: 1 as const },
                { user: topThree[2], position: 3 as const },
              ]
                .filter(
                  (
                    item
                  ): item is {
                    user: CommunityUserStats;
                    position: 1 | 2 | 3;
                  } => !!item.user
                )
                .map(({ user, position }) => (
                  <PodiumItem
                    key={`podium-${user.user_id || user.user_name || position}`}
                    user={user}
                    position={position}
                    sortBy={sortBy}
                    onUserClick={handleUserClick}
                    selectedCategoryId={selectedCategoryId}
                    categories={categories}
                  />
                ))}
            </div>
          )}

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
                  {t("leaderboard.user")}
                </div>
                <div
                  className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
                >
                  {t("leaderboard.activity")}
                </div>
                <div
                  className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
                >
                  {t("leaderboard.distance")}
                </div>
                <div
                  className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
                >
                  {t("leaderboard.elevationGain")}
                </div>
                <div
                  className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
                >
                  {t("leaderboard.peaks")}
                </div>
                <div
                  className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
                >
                  {t("leaderboard.routes")}
                </div>
                <div
                  className={`${styles["table__header-cell"]} ${styles["table__header-cell--center"]}`}
                >
                  {t("leaderboard.time")}
                </div>
              </div>
              <div className={styles["table__body"]}>
                {others.map((user, index) => (
                  <TableRow
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
        <EmptyState message={t("leaderboard.noUsersFound")} />
      )}
    </div>
  );
}
