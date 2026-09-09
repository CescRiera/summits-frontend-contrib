import React from "react";
import { Trophy, User, ArrowUpRight } from "lucide-react";
import { useI18n } from "../../../../../shared/context/I18nContext";
import { formatDurationLong } from "../../../../../shared/utils/peakListFormatting";
import { LeaderboardSkeleton } from "../../skeletons";
import styles from "./ChallengeLeaderboard.module.css";
import type { PeakListUser } from "../../../../../shared/api/types";

interface ChallengeLeaderboardProps {
  users: PeakListUser[];
  authUserRank: any | null;
  loading: boolean;
  onUserClick: (userId: number) => void;
  observerRef: React.RefObject<HTMLDivElement | null>;
  selectedChallengeId: number | null;
}

const ChallengeLeaderboard: React.FC<ChallengeLeaderboardProps> = ({
  users,
  authUserRank,
  loading,
  onUserClick,
  observerRef,
}) => {
  const { t } = useI18n();

  const formatTime = (seconds: number) => {
    return formatDurationLong(
      seconds,
      undefined,
      {
        year: t("common.timeUnits.yearShort") || "y",
        day: t("common.timeUnits.dayShort") || "d",
        hour: t("common.timeUnits.hourShort") || "h",
        minute: t("common.timeUnits.minuteShort") || "m",
        second: t("common.timeUnits.secondShort") || "s",
      },
      2
    ) || "-";
  };

  const renderUserItem = (user: any, rank: number, isSticky = false) => {
    const percent = user.percent_completed?.toFixed(1) || "0.0";
    const timeDisplay = formatTime(user.time_seconds);

    let rankClass = "";
    if (rank === 1) rankClass = styles["challenge-leaderboard__rank-badge--top-1"] || "";
    else if (rank === 2) rankClass = styles["challenge-leaderboard__rank-badge--top-2"] || "";
    else if (rank === 3) rankClass = styles["challenge-leaderboard__rank-badge--top-3"] || "";

    return (
      <button
        type="button"
        key={user.user_id + (isSticky ? "-sticky" : "")}
        className={`${styles["challenge-leaderboard__user-item"]} ${isSticky ? styles["challenge-leaderboard__user-item--sticky"] : ""}`}
        onClick={() => onUserClick(user.user_id)}
      >
        <div className={styles["challenge-leaderboard__rank-cell"]}>
          <div className={`${styles["challenge-leaderboard__rank-badge"]} ${rankClass}`}>
            {rank <= 3 ? <Trophy size={16} /> : rank}
          </div>
        </div>

        <div className={styles["challenge-leaderboard__user-info"]}>
          {user.user_image ? (
            <img src={user.user_image} alt={user.user_name} className={styles["challenge-leaderboard__avatar"]} />
          ) : (
            <div className={styles["challenge-leaderboard__avatar-fallback"]}>
              <User size={20} />
            </div>
          )}
          <div className={styles["challenge-leaderboard__user-details"]}>
            <span className={`${styles["challenge-leaderboard__user-name"]} typography-desktop-label-large`}>
              {user.user_name}
            </span>
            {isSticky && (
              <span className={`${styles["challenge-leaderboard__you-label"]} typography-desktop-label-small`}>
                {t("leaderboard.you") || "You"}
              </span>
            )}
          </div>
        </div>

        <div className={styles["challenge-leaderboard__stats"]}>
          <div className={`${styles["challenge-leaderboard__stat-cell"]} ${styles["challenge-leaderboard__stat-cell--primary"]} typography-desktop-body-medium`}>
             {user.user_completed}
          </div>
          <div className={`${styles["challenge-leaderboard__stat-cell"]} typography-desktop-body-medium`}>
             {percent}%
          </div>
          <div className={`${styles["challenge-leaderboard__stat-cell"]} typography-desktop-body-medium`}>
             {timeDisplay}
             <ArrowUpRight size={16} className={styles["challenge-leaderboard__row-arrow"]} />
          </div>
        </div>
      </button>
    );
  };

  const isUserInTopList = authUserRank && users.some(u => u.user_id === authUserRank.user_id);

  return (
    <div className={styles["challenge-leaderboard"]}>
      <div className={`${styles["challenge-leaderboard__header"]} typography-desktop-label-medium`}>
        <div className={styles["challenge-leaderboard__header-cell--rank"]}>#</div>
        <div className={styles["challenge-leaderboard__header-cell--user"]}>
          {t("leaderboard.user") || "User"}
        </div>
        <div className={styles["challenge-leaderboard__header-cell--peaks"]}>
          {t("leaderboard.peaks") || "Peaks"}
        </div>
        <div className={styles["challenge-leaderboard__header-cell--percent"]}>
          %
        </div>
        <div className={styles["challenge-leaderboard__header-cell--time"]}>
          {t("leaderboard.time") || "Time"}
        </div>
      </div>

      <div className={styles["challenge-leaderboard__body"]}>
        {loading && users.length === 0 ? (
          <div className={styles["challenge-leaderboard__skeleton-container"]}>
            <LeaderboardSkeleton />
            <LeaderboardSkeleton />
            <LeaderboardSkeleton />
            <LeaderboardSkeleton />
            <LeaderboardSkeleton />
          </div>
        ) : (
          <>
            {authUserRank && !isUserInTopList && renderUserItem(authUserRank, authUserRank.rank, true)}
            
            {users.map((user, idx) => renderUserItem(user, idx + 1))}

            <div ref={observerRef} style={{ height: 20 }} />
            
            {loading && users.length > 0 && (
              <div className={styles["challenge-leaderboard__skeleton-container"]}>
                <LeaderboardSkeleton />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChallengeLeaderboard;
