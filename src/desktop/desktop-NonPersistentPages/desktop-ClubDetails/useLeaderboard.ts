import { useState, useCallback, useEffect, useRef } from "react";
import { getHighestCommunityListUsers } from "../../../shared/api/endpoints/user";

interface UseLeaderboardOptions {
  activeTab: string;
  selectedChallengeId: number | null;
}

export const useLeaderboard = ({
  activeTab,
  selectedChallengeId,
}: UseLeaderboardOptions) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [authUserRank, setAuthUserRank] = useState<any | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadLeaderboard = useCallback(
    async (challengeId: number, offset = 0) => {
      if (offset === 0) {
        setLoading(true);
        setUsers([]);
        setAuthUserRank(null);
      }
      try {
        const res = await getHighestCommunityListUsers(challengeId, 20, offset);
        const total = res.total_peaks_in_list || 0;

        const newUsers = (res.users || []).map((u: any) => ({
          ...u,
          total_peaks_in_list: total,
          percent_completed:
            total > 0 ? (u.user_completed / total) * 100 : 0,
        }));

        if (offset === 0) {
          setUsers(newUsers);
          if (res.user_rank) {
            const uPercent =
              res.user_rank.percent_completed ??
              (total > 0
                ? (res.user_rank.user_completed / total) * 100
                : 0);
            setAuthUserRank({
              ...res.user_rank,
              total_peaks_in_list: total,
              percent_completed: uPercent,
            });
          }
        } else {
          setUsers((prev) => [...prev, ...newUsers]);
        }
        setHasMore(res.has_more);
        setNextOffset(
          res.pagination?.next_offset ?? offset + newUsers.length
        );
      } catch (err) {
        console.error("Failed to load leaderboard", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Load leaderboard when tab or challenge changes
  useEffect(() => {
    if (activeTab === "challenges" && selectedChallengeId) {
      loadLeaderboard(selectedChallengeId, 0);
    }
  }, [activeTab, selectedChallengeId, loadLeaderboard]);

  // Infinite scroll for leaderboard
  useEffect(() => {
    if (activeTab !== "challenges" || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && selectedChallengeId) {
          loadLeaderboard(selectedChallengeId, nextOffset);
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentRef = observerRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [activeTab, hasMore, loading, nextOffset, selectedChallengeId, loadLeaderboard]);

  return {
    users,
    loading,
    hasMore,
    authUserRank,
    observerRef,
  };
};
