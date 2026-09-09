import React from "react";
import Shimmer from "../../desktop-components/desktop-Shimmer/desktop-Shimmer";
import membersStyles from "./components/ClubMembers/ClubMembers.module.css";
import activityStyles from "./components/ClubActivity/ClubActivity.module.css";
import leaderboardStyles from "./components/ChallengeLeaderboard/ChallengeLeaderboard.module.css";

export const LeaderboardSkeleton: React.FC = () => (
  <div className={leaderboardStyles["challenge-leaderboard__user-item"]}>
    <div className={leaderboardStyles["challenge-leaderboard__rank-cell"]}>
      <Shimmer style={{ width: 40, height: 40, borderRadius: 10, padding: 0 }} />
    </div>
    <div className={leaderboardStyles["challenge-leaderboard__user-info"]}>
      <Shimmer style={{ width: 48, height: 48, borderRadius: 24, padding: 0 }} />
      <Shimmer style={{ width: 120, height: 20, borderRadius: 4, padding: 0 }} />
    </div>
    <div className={leaderboardStyles["challenge-leaderboard__stats"]}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Shimmer style={{ width: 40, height: 20, borderRadius: 4, padding: 0 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Shimmer style={{ width: 40, height: 20, borderRadius: 4, padding: 0 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Shimmer style={{ width: 80, height: 20, borderRadius: 4, padding: 0 }} />
      </div>
    </div>
  </div>
);

export const MemberSkeleton: React.FC = () => (
  <div className={membersStyles["club-members__row"]}>
    <div className={membersStyles["club-members__cell--rank"]}>
      <Shimmer style={{ width: 40, height: 40, borderRadius: 10, padding: 0 }} />
    </div>
    <div className={membersStyles["club-members__cell--user"]}>
      <Shimmer style={{ width: 48, height: 48, borderRadius: 24, padding: 0 }} />
      <Shimmer style={{ width: 120, height: 20, borderRadius: 4, padding: 0 }} />
    </div>
    <div className={membersStyles["club-members__cell--metric"]}>
      <Shimmer style={{ width: 60, height: 20, borderRadius: 4, padding: 0 }} />
    </div>
    <div className={membersStyles["club-members__cell--metric"]}>
      <Shimmer style={{ width: 60, height: 20, borderRadius: 4, padding: 0 }} />
    </div>
    <div className={membersStyles["club-members__cell--metric"]}>
      <Shimmer style={{ width: 80, height: 20, borderRadius: 4, padding: 0 }} />
    </div>
  </div>
);

export const ActivitySkeleton: React.FC = () => (
  <div className={activityStyles["club-activity__card"]}>
    <div className={activityStyles["club-activity__header"]}>
       <div className={activityStyles["club-activity__user-link"]}>
         <Shimmer style={{ width: 40, height: 40, borderRadius: 20, padding: 0 }} />
         <Shimmer style={{ width: 120, height: 20, borderRadius: 4, padding: 0 }} />
       </div>
       <Shimmer style={{ width: 80, height: 16, borderRadius: 4, padding: 0 }} />
    </div>
    <Shimmer style={{ width: "60%", height: 24, borderRadius: 4, marginBottom: '4px', padding: 0 }} />
    <div className={activityStyles["club-activity__content"]}>
       <div className={activityStyles["club-activity__media"]}>
         <Shimmer style={{ width: "100%", height: "100%", borderRadius: 14, padding: 0 }} />
       </div>
       <div className={activityStyles["club-activity__info"]}>
          <div className={activityStyles["club-activity__stats"]}>
             <Shimmer style={{ width: "100%", height: 50, borderRadius: 12, padding: 0 }} />
             <Shimmer style={{ width: "100%", height: 50, borderRadius: 12, padding: 0 }} />
             <Shimmer style={{ width: "100%", height: 50, borderRadius: 12, padding: 0 }} />
          </div>
          <div className={activityStyles["club-activity__peaks"]} style={{ marginTop: 'auto' }}>
            <Shimmer style={{ width: "100%", height: 40, borderRadius: 12, padding: 0 }} />
          </div>
       </div>
    </div>
  </div>
);
