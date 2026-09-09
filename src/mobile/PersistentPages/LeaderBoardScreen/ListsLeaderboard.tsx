import React, { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useActivate } from "react-activation";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import styles from "./ListsLeaderboard.module.css";
import {
  Trophy,
  Users,
  Map as MapIcon,
  Plus,
  X ,
  ChevronRight,
  ArrowLeftRight,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
// @ts-ignore
import "swiper/css";
// @ts-ignore
import "swiper/css/pagination";
import { Pagination } from "swiper/modules";

import { 
  getPeakListsBasic, 
  followPeakList, 
  unfollowPeakList 
} from "../../../shared/api/endpoints/peakLists";
import { getHighestCommunityListUsers } from "../../../shared/api/endpoints/user";
import type {
  PeakListBasicItem,
  PeakListUser,
} from "../../../shared/api/types";
import {
  formatDateShort,
  formatDurationHours,
  formatDurationCompact,
  type DurationUnitLabels,
} from "../../../shared/utils/peakListFormatting";
import ChallengesModal from "../Profile/components/ChallengesModal";
import LoginRequiredPopup from "../../components/LoginRequiredPopup/LoginRequiredPopup";
import CreatorBadge from "../../../shared/components/CreatorBadge/CreatorBadge";

// =================================================================
// TYPES & INTERFACES
// =================================================================

interface UserRank {
  user_id: number;
  rank: number;
  user_completed: number;
  total_peaks_in_list?: number;
  percent_completed?: number;
  user_name?: string;
  user_image?: string;
  is_completed?: boolean;
  time_seconds?: number;
}

interface UserItemProps {
  user: PeakListUser | (UserRank & { user_name: string; user_image: string });
  rank: number;
  onUserClick: (userId: number) => void;
  isSticky?: boolean;
  statMode: "percent" | "time";
  timeLabels: DurationUnitLabels;
}



// =================================================================
// CONSTANTS
// =================================================================

const FALLBACK_LIST_IMAGE = "/placeholder.svg";
const INITIAL_LOAD_COUNT = 20;
const LOAD_MORE_COUNT = 20;

const parseListIdFromSearch = (search: string): number | null => {
  const params = new URLSearchParams(search);
  const rawListId = params.get("listId") ?? params.get("list_id");
  if (!rawListId) return null;

  const parsed = Number.parseInt(rawListId, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

// =================================================================
// UTILITY COMPONENTS
// =================================================================

const LoadingState = () => (
  <div className={styles["lists-leaderboard__loading"]}>
    <div className={styles["lists-leaderboard__spinner"]} />
  </div>
);

const UserItemSkeleton = () => (
  <div className={styles["lists-leaderboard__skeleton-list-item"]}>
    <div className={`${styles["lists-leaderboard__skeleton"]} ${styles["lists-leaderboard__skeleton-rank"]}`} />
    <div className={`${styles["lists-leaderboard__skeleton"]} ${styles["lists-leaderboard__skeleton-avatar"]}`} />
    <div className={styles["lists-leaderboard__user-info"]}>
      <div className={`${styles["lists-leaderboard__skeleton"]} ${styles["lists-leaderboard__skeleton-name"]}`} />
      <div className={styles["lists-leaderboard__user-stats-container"]}>
        <div className={`${styles["lists-leaderboard__skeleton"]} ${styles["lists-leaderboard__skeleton-stat"]}`} style={{ width: 70 }} />
        <div className={`${styles["lists-leaderboard__skeleton"]} ${styles["lists-leaderboard__skeleton-stat"]}`} style={{ width: 50 }} />
      </div>
    </div>
  </div>
);

const HeroSkeleton = () => (
  <div className={styles["lists-leaderboard__skeleton-hero"]}>
    <div className={`${styles["lists-leaderboard__skeleton"]} ${styles["lists-leaderboard__skeleton-hero-number"]}`} />
    <div className={styles["lists-leaderboard__skeleton-hero-buttons"]}>
      <div className={`${styles["lists-leaderboard__skeleton"]} ${styles["lists-leaderboard__skeleton-hero-button"]}`} />
      <div className={`${styles["lists-leaderboard__skeleton"]} ${styles["lists-leaderboard__skeleton-hero-button"]}`} />
    </div>
  </div>
);

const CardSkeleton = () => (
  <div className={`${styles["lists-leaderboard__skeleton"]} ${styles["lists-leaderboard__skeleton-card"]}`} />
);

const EmptyState = ({ message }: { message: string }) => (
  <div className={styles["lists-leaderboard__empty"]}>
    <Users size={48} strokeWidth={1} />
    <p className="typography-body-medium">{message}</p>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className={styles["lists-leaderboard__error-state"]}>
    <p className="typography-body-medium">{message}</p>
    <button className={styles["lists-leaderboard__retry-btn"]} onClick={onRetry}>
      Try Again
    </button>
  </div>
);

// =================================================================
// USER ITEM COMPONENT
// =================================================================

const UserItem: React.FC<UserItemProps> = ({
  user,
  rank,
  onUserClick,
  isSticky,
  statMode,
  timeLabels,
}) => {
  const handleClick = () => {
    onUserClick(user.user_id);
  };

  let rankClass: string = "";
  if (rank === 1) rankClass = styles["lists-leaderboard__rank-badge--top-1"] || "";
  else if (rank === 2) rankClass = styles["lists-leaderboard__rank-badge--top-2"] || "";
  else if (rank === 3) rankClass = styles["lists-leaderboard__rank-badge--top-3"] || "";

  const percent = user.percent_completed ?? (user.total_peaks_in_list ? (user.user_completed / user.total_peaks_in_list) * 100 : 0);
  const percentDisplay = percent.toFixed(1);
  const timeDisplay = formatDurationCompact(user.time_seconds, timeLabels) || "-";
  const secondaryDisplay = statMode === "time" ? timeDisplay : `${percentDisplay}%`;

  return (
    <div 
      className={`${styles["lists-leaderboard__user-item"]} ${isSticky ? styles["lists-leaderboard__auth-user-item"] : ""}`} 
      onClick={handleClick}
    >
      <div className={`${styles["lists-leaderboard__rank-badge"]} ${rankClass} typography-title-medium`}>
        {rank <= 3 ? <Trophy size={14} /> : rank}
      </div>

      <img
        className={styles["lists-leaderboard__avatar"]}
        src={user.user_image || "/placeholder.svg"}
        alt={user.user_name}
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/placeholder.svg";
        }}
      />

      <div className={styles["lists-leaderboard__user-info"]}>
        <div className={styles["lists-leaderboard__user-name-container"]}>
          <span className={`${styles["lists-leaderboard__user-name"]} typography-title-small`}>
            {user.user_name}
          </span>
        </div>
        
        <div className={styles["lists-leaderboard__user-stats-container"]}>
          <span className={`${styles["lists-leaderboard__user-stat-primary"]} typography-title-medium`}>
            {user.user_completed}
          </span>
          <span className={`${styles["lists-leaderboard__user-stat-secondary"]} typography-title-small`}>
            {secondaryDisplay}
          </span>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT
// =================================================================

export default function ListsLeaderboard() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const { trackEvent } = useAnalytics();

  console.log("[DEBUG-LISTSLEADERBOARD] render! location:", location.pathname, location.search);

  // State
  const [lists, setLists] = useState<PeakListBasicItem[]>([]);
  const [selectedList, setSelectedList] = useState<PeakListBasicItem | null>(null);
  const [swiperLists, setSwiperLists] = useState<PeakListBasicItem[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<PeakListUser[]>([]);
  const [authUserRank, setAuthUserRank] = useState<UserRank | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJoining, setIsJoining] = useState<number | null>(null);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [totalPeaksInList, setTotalPeaksInList] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<any>(null);
  const [statMode, setStatMode] = useState<"percent" | "time">("percent");

  const observerRef = useRef<HTMLDivElement>(null);
  const selectedListRef = useRef<PeakListBasicItem | null>(null);
  const isKeepAliveRestoringRef = useRef<boolean>(false);
  const pendingUrlListIdRef = useRef<number | null>(
    parseListIdFromSearch(location.search)
  );

  useEffect(() => {
    selectedListRef.current = selectedList;
  }, [selectedList]);

  useEffect(() => {
    console.log("[DEBUG-LISTSLEADERBOARD] MOUNTED.");
    return () => console.log("[DEBUG-LISTSLEADERBOARD] UNMOUNTED.");
  }, []);

  useActivate(() => {
    console.log("[DEBUG-LISTSLEADERBOARD] ACTIVATED. Ignoring Swiper events for 350ms.");
    isKeepAliveRestoringRef.current = true;
    setTimeout(() => {
      isKeepAliveRestoringRef.current = false;
      console.log("[DEBUG-LISTSLEADERBOARD] Swiper events re-enabled.");
    }, 350);
  });

  useEffect(() => {
    if (!location.pathname.startsWith("/leaderboard")) return;

    const urlListId = parseListIdFromSearch(location.search);
    if (!urlListId) return;

    pendingUrlListIdRef.current = urlListId;

    if (selectedListRef.current?.list_id === urlListId) {
      pendingUrlListIdRef.current = null;
      return;
    }

    if (lists.length === 0) return;

    const matchingList = lists.find((list) => list.list_id === urlListId);
    if (!matchingList) return;

    pendingUrlListIdRef.current = null;
    setSelectedList(matchingList);
    setSwiperLists((prev) =>
      prev.some((list) => list.list_id === matchingList.list_id)
        ? prev
        : [matchingList, ...prev]
    );
  }, [location.search, lists]);

  const getListName = (list: PeakListBasicItem) =>
    list.name || list.list_name || "";

  const buildConstraintMeta = (list: PeakListBasicItem) => {
    const items: string[] = [];
    const durationLabel = formatDurationHours(list.max_duration);
    if (durationLabel) {
      items.push(`${t("peakLists.timeLimit") || "Time limit"}: ${durationLabel}`);
    }
    const startLabel = formatDateShort(list.start_date, language);
    const endLabel = formatDateShort(list.end_date, language);
    if (startLabel && endLabel) {
      items.push(`${t("peakLists.dateRange") || "Valid"}: ${startLabel} - ${endLabel}`);
    } else if (startLabel) {
      items.push(`${t("peakLists.starts") || "Starts"}: ${startLabel}`);
    } else if (endLabel) {
      items.push(`${t("peakLists.ends") || "Ends"}: ${endLabel}`);
    }
    return items;
  };

  const fetchLists = useCallback(async () => {
    console.log("[DEBUG-LISTSLEADERBOARD] fetchLists called!");
    try {
      setLoading(true);
      const response = await getPeakListsBasic();
      const fetchedLists = response.lists || [];
      setLists(fetchedLists);
      
      const userFollowsAny = fetchedLists.some(l => l.is_following);
      const toDisplay = authUser && userFollowsAny ? fetchedLists.filter(l => l.is_following) : fetchedLists;

      // Sync selected list or pick default
      const requestedUrlListId = pendingUrlListIdRef.current;
      let currentSelected: PeakListBasicItem | null;
      if (requestedUrlListId !== null) {
        currentSelected =
          fetchedLists.find((list) => list.list_id === requestedUrlListId) ||
          toDisplay[0] ||
          fetchedLists[0] ||
          null;
        pendingUrlListIdRef.current = null;
      } else if (selectedListRef.current) {
        currentSelected =
          fetchedLists.find(
            (list) => list.list_id === selectedListRef.current?.list_id
          ) || selectedListRef.current;
      } else {
        currentSelected = toDisplay[0] || fetchedLists[0] || null;
      }
      
      setSelectedList(currentSelected);

      // Stable Swiper: If auth, show followings. If guest, show all.
      setSwiperLists(prev => {
        if (prev.length === 0) {
          // Initial load
          const initial = [...toDisplay];
          if (currentSelected && !initial.find(l => l.list_id === currentSelected?.list_id)) {
            initial.unshift(currentSelected);
          } else if (currentSelected) {
            // Ensure selected list is always at index 0 initially so we don't need buggy initialSlide in Swiper loop
            const selectedIdx = initial.findIndex(l => l.list_id === currentSelected.list_id);
            if (selectedIdx > 0) {
              const selectedItem = initial.splice(selectedIdx, 1)[0];
              if (selectedItem) initial.unshift(selectedItem);
            }
          }
          return initial;
        }

        // Subsequent updates (e.g. from modal or follow toggle): 
        // 1. Update existing items in swiper
        const updatedSwiper = prev.map(p => fetchedLists.find(f => f.list_id === p.list_id) || p);
        // 2. Add new items from the "toDisplay" set that aren't there yet
        const missing = toDisplay.filter(f => !updatedSwiper.some(u => u.list_id === f.list_id));
        return [...missing, ...updatedSwiper];
      });
    } catch (err) {
      setError(t("leaderboard.errorLoadingLists") || "Failed to load peak lists");
    } finally {
      setLoading(false);
    }
  }, [t, authUser]);

  // Fetch lists on mount and when auth state changes
  useEffect(() => {
    fetchLists();
  }, [authUser, fetchLists]);

  // Fetch users when selected list changes
  const loadInitialUsers = useCallback(async () => {
    console.log("[DEBUG-LISTSLEADERBOARD] loadInitialUsers called with selectedList:", selectedList?.list_id);
    if (!selectedList) return;
    
    setLoadingMore(true);
    setAuthUserRank(null);
    try {
      const res = await getHighestCommunityListUsers(
        selectedList.list_id,
        INITIAL_LOAD_COUNT,
        0
      );
      console.log("wehqwhieq", res);
      
      const total = res.total_peaks_in_list || 0;
      setTotalPeaksInList(total);

      const users = (res.users || []).map((u: any) => ({
        ...u,
        total_peaks_in_list: total,
        percent_completed: total > 0 ? (u.user_completed / total) * 100 : 0
      })) as PeakListUser[];
      
      setDisplayedUsers(users);
      setHasMore(res.has_more);
      setNextOffset(res.pagination?.next_offset ?? users.length);
      
      if (res.user_rank) {
        const percent = res.user_rank.percent_completed ?? (total > 0 ? (res.user_rank.user_completed / total) * 100 : 0);
        
        setAuthUserRank({
          ...res.user_rank,
          total_peaks_in_list: total,
          percent_completed: percent
        });
      }
    } catch (e) {
      setDisplayedUsers([]);
      setHasMore(false);
      setNextOffset(0);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedList]);

  useEffect(() => {
    console.log("[DEBUG-LISTSLEADERBOARD] Evaluating loadInitialUsers effect for selectedList:", selectedList?.list_id);
    if (selectedList) {
      console.log("[DEBUG-LISTSLEADERBOARD] Clearing displayed users and loading initial users");
      setDisplayedUsers([]);
      setHasMore(false);
      setNextOffset(0);
      loadInitialUsers();
    }
  }, [selectedList, loadInitialUsers]);

  // Load more users
  const loadMoreUsers = useCallback(async () => {
    if (!selectedList || !hasMore || loadingMore) return;

    trackEvent("pagination", `lists_leaderboard_load_more_${selectedList.list_id}`);
    setLoadingMore(true);
    try {
      const res = await getHighestCommunityListUsers(
        selectedList.list_id,
        LOAD_MORE_COUNT,
        nextOffset
      );
      const total = res.total_peaks_in_list || totalPeaksInList;
      const users = (res.users || []).map((u: any) => ({
        ...u,
        total_peaks_in_list: total,
        percent_completed: total > 0 ? (u.user_completed / total) * 100 : 0
      })) as PeakListUser[];
      
      setDisplayedUsers((prev) => [...prev, ...users]);
      setHasMore(res.has_more);
      setNextOffset(res.pagination?.next_offset ?? nextOffset + users.length);
    } catch (e) {
      console.error("Failed to load more users", e);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedList, hasMore, loadingMore, nextOffset, trackEvent]);

  // Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreUsers();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentRef = observerRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [loadMoreUsers]);

  // Handlers
  const handleUserClick = useCallback((userId: number) => {
    trackEvent("navigation", `lists_leaderboard_user_click_${userId}`);
    if (authUser && authUser.internalUserId === userId) {
      navigate("/profile");
    } else {
      navigate(`/externalprofile/${userId}`);
    }
  }, [navigate, authUser, trackEvent]);

  const handleSelectList = useCallback((list: PeakListBasicItem, fromModal = false) => {
    trackEvent(
      "interaction",
      `lists_leaderboard_select_list_${list.list_id}_${fromModal ? "modal" : "carousel"}`
    );
    setSelectedList(list);
    
    setSwiperLists(prev => {
      const existingIdx = prev.findIndex(p => p.list_id === list.list_id);
      
      if (existingIdx !== -1) {
        // If from modal, slide to it
        if (fromModal && swiperInstance) {
          swiperInstance.slideToLoop(existingIdx);
        }
        return prev;
      }

      // Not in swiper, insert at current position if from modal
      if (fromModal && swiperInstance) {
        const currentIdx = swiperInstance.realIndex;
        const newList = [...prev];
        newList.splice(currentIdx, 0, list);
        
        // We'll slide to it in a useEffect or next tick if needed, 
        // but often Swiper handles slide insertions OK if we are careful.
        return newList;
      }

      // Default (initial load or internal trigger)
      return [list, ...prev];
    });
  }, [swiperInstance, trackEvent]);

  const handleToggleFollow = async (listId: number, isFollowing: boolean) => {
    if (!authUser) {
      trackEvent("social", "lists_leaderboard_follow_requires_login");
      setIsLoginPopupOpen(true);
      return;
    }
    
    setIsJoining(listId);
    try {
      trackEvent(
        "social",
        `lists_leaderboard_${isFollowing ? "leave" : "join"}_${listId}`
      );
      if (isFollowing) {
        await unfollowPeakList(listId);
      } else {
        await followPeakList(listId);
      }
      
      // Update local states without removing items from Swiper
      const updatedLists = lists.map(l => 
        l.list_id === listId ? { ...l, is_following: !isFollowing } : l
      );
      setLists(updatedLists);
      setSwiperLists(prev => prev.map(l => 
        l.list_id === listId ? { ...l, is_following: !isFollowing } : l
      ));

      if (selectedList?.list_id === listId) {
        setSelectedList({ ...selectedList, is_following: !isFollowing });
      }
    } catch (err) {
      trackEvent("social", "lists_leaderboard_follow_toggle_failed");
      console.error("Failed to toggle follow", err);
    } finally {
      setIsJoining(null);
    }
  };

  const handleSeeMore = useCallback(() => {
    if (selectedList) {
      trackEvent("navigation", `lists_leaderboard_see_more_${selectedList.list_id}`);
      navigate(`/list-details/${selectedList.list_id}`);
    }
  }, [selectedList, navigate, trackEvent]);

  const handleSeeOnMap = useCallback(() => {
    if (selectedList) {
      trackEvent("navigation", `lists_leaderboard_see_on_map_${selectedList.list_id}`);
      navigate(`/map?listId=${selectedList.list_id}`);
    }
  }, [selectedList, navigate, trackEvent]);

  const handleRetry = useCallback(() => {
    trackEvent("interaction", "lists_leaderboard_retry");
    setError(null);
    setLoading(true);
    getPeakListsBasic().then(response => {
      const fetchedLists = response.lists || [];
      setLists(fetchedLists);
      const defaultList = fetchedLists[0] || null;
      setSelectedList(defaultList);
      setLoading(false);
    }).catch(() => {
      setError(t("leaderboard.errorLoadingLists") || "Failed to load peak lists");
      setLoading(false);
    });
  }, [t, trackEvent]);

  // Render
  const isListEmpty = selectedList && displayedUsers.length === 0 && !loadingMore && !loading;
  const totalPeaks = totalPeaksInList;
  const constraintMeta = selectedList ? buildConstraintMeta(selectedList) : [];
  const timeLabels: DurationUnitLabels = {
    year: t("common.timeUnits.yearShort") || "y",
    day: t("common.timeUnits.dayShort") || "d",
    hour: t("common.timeUnits.hourShort") || "h",
    minute: t("common.timeUnits.minuteShort") || "m",
    second: t("common.timeUnits.secondShort") || "s",
  };
  const toggleStatMode = () => {
    setStatMode((prev) => (prev === "percent" ? "time" : "percent"));
  };

  return (
    <div className={styles["lists-leaderboard"]}>
      {/* Filter Section */}
      <div className={styles["lists-leaderboard__filter-section"]}>
        <div className={styles["lists-leaderboard__filter-header"]}>
          <label className={`${styles["lists-leaderboard__filter-label"]} typography-title-medium`}>
            {t("leaderboard.selectList") || "Select Peak List"}
          </label>
          <button 
            className={`${styles["lists-leaderboard__see-all-link"]} typography-label-medium`}
            onClick={() => {
              trackEvent("interaction", "lists_leaderboard_open_challenges_modal");
              setIsModalOpen(true);
            }}
          >
            {t("leaderboard.seeAll") || "See all"}
            <ChevronRight size={16} />
          </button>
        </div>

        <div className={styles["lists-leaderboard__filter-row"]}>
          {loading ? (
            <Swiper
              spaceBetween={16}
              slidesPerView={1.2}
              centeredSlides={true}
              loop={false}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              modules={[Pagination]}
              className={styles["lists-leaderboard__swiper"]}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <SwiperSlide key={`skeleton-card-${i}`}>
                  <CardSkeleton />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : swiperLists.length === 1 ? (
            swiperLists.map(list => (
              <div key={list.list_id} style={{ paddingBottom: '32px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <div 
                  className={`${styles["lists-leaderboard__challenge-card"]} ${selectedList?.list_id === list.list_id ? styles["lists-leaderboard__challenge-card--selected"] : ""}`}
                  onClick={() => handleSelectList(list)}
                  style={{ backgroundImage: `url(${list.primary_image || FALLBACK_LIST_IMAGE})`, width: '83.33%', flexShrink: 0 }}
                >
                  <div className={styles["lists-leaderboard__challenge-card-overlay"]} />
                  <span className={`${styles["lists-leaderboard__challenge-card-name"]} typography-title-medium`}>
                    {getListName(list)}
                  </span>
           
                </div>
              </div>
            ))
          ) : swiperLists.length > 1 ? (
            <Swiper
              key={`swiper-${swiperLists.length}`}
              spaceBetween={16}
              slidesPerView={1.2}
              centeredSlides={true}
              loop={swiperLists.length > 3}

              observer={true}
              observeParents={true}
              pagination={{
                clickable: true,
                dynamicBullets: true,
              }}
              modules={[Pagination]}
              className={styles["lists-leaderboard__swiper"]}
              onSwiper={setSwiperInstance}
              onSlideChange={(swiper) => {
                if (isKeepAliveRestoringRef.current) {
                  console.log("[DEBUG-LISTSLEADERBOARD] Ignoring Swiper onSlideChange because KeepAlive is restoring!");
                  // Force swiper back to the actually selected list if needed
                  const correctIdx = swiperLists.findIndex(l => l.list_id === selectedList?.list_id);
                  if (correctIdx >= 0 && correctIdx !== swiper.realIndex) {
                     swiper.slideToLoop?.(correctIdx, 0, false);
                  }
                  return;
                }
                const list = swiperLists[swiper.realIndex];
                if (list) handleSelectList(list);
              }}
            >
              {swiperLists.map((list) => {
                const isSelected = selectedList?.list_id === list.list_id;
                return (
                  <SwiperSlide 
                    key={`list-${list.list_id}`}
                    className={`${styles["lists-leaderboard__challenge-card"]} ${isSelected ? styles["lists-leaderboard__challenge-card--selected"] : ""}`}
                    onClick={() => handleSelectList(list)}
                    style={{ backgroundImage: `url(${list.primary_image || FALLBACK_LIST_IMAGE})` }}
                  >
                    <div className={styles["lists-leaderboard__challenge-card-overlay"]} />
                    <span className={`${styles["lists-leaderboard__challenge-card-name"]} typography-title-medium`}>
                      {getListName(list)}
                    </span>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          ) : (
            <div className={styles["lists-leaderboard__empty-following"]}>
              <p className="typography-body-small">
                {t("leaderboard.noFollowing") || "You are not following any challenge yet."}
              </p>
              <button 
                className={styles["lists-leaderboard__explore-btn"]}
                onClick={() => {
                  trackEvent("interaction", "lists_leaderboard_explore_challenges");
                  setIsModalOpen(true);
                }}
              >
                {t("leaderboard.exploreChallenges") || "Explore Challenges"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Challenge Summary Hero */}
      {loading ? (
        <HeroSkeleton />
      ) : selectedList ? (
        <div className={styles["lists-leaderboard__challenge-summary"]}>
          <button 
            className={`${styles["lists-leaderboard__hero-follow-btn"]} ${selectedList.is_following ? styles["lists-leaderboard__hero-follow-btn--following"] : ""}`}
            onClick={() => handleToggleFollow(selectedList.list_id, !!selectedList.is_following)}
          >
            {isJoining === selectedList.list_id ? (
              <div className={styles["lists-leaderboard__spinner"]} style={{ width: 12, height: 12 }} />
            ) : selectedList.is_following ? (
              <X size={14} />
            ) : (
              <Plus size={14} />
            )}
            <span className="typography-label-small">
              {selectedList.is_following ? t("common.leave") || "Leave" : t("common.join") || "Join"}
            </span>
          </button>

          <div className={styles["lists-leaderboard__total-peaks-row"]}>
            <span className={`${styles["lists-leaderboard__total-peaks-number"]} typography-display-large`}>
              {totalPeaks}
            </span>
            <span className={`${styles["lists-leaderboard__total-peaks-label"]} typography-label-medium`}>{t("leaderboard.peaks")}</span>
          </div>

          {(selectedList.creator_name || selectedList.creator_image) && (
            <CreatorBadge
              name={selectedList.creator_name ?? null}
              imageUrl={selectedList.creator_image ?? null}
              className={styles["lists-leaderboard__creator-badge-summary"]}
              size="md"
              variant="light"
            />
          )}

          <div
            className={`${styles["lists-leaderboard__challenge-meta"]} ${
              constraintMeta.length === 0
                ? styles["lists-leaderboard__challenge-meta--empty"]
                : ""
            }`}
            aria-hidden={constraintMeta.length === 0}
          >
            {constraintMeta.map((item) => (
              <span
                key={item}
                className={`${styles["lists-leaderboard__meta-pill"]} typography-label-medium`}
              >
                {item}
              </span>
            ))}
          </div>
          
          <div className={styles["lists-leaderboard__challenge-actions"]}>
            <button
              className={`${styles["lists-leaderboard__action-btn"]} ${styles["lists-leaderboard__action-btn--secondary"]} typography-button-medium`}
              onClick={handleSeeMore}
            >
              {t("common.seeMore") || "See more"}
            </button>
            <button
              className={`${styles["lists-leaderboard__action-btn"]} ${styles["lists-leaderboard__action-btn--primary"]} typography-button-medium`}
              onClick={handleSeeOnMap}
            >
              <MapIcon size={18} style={{ marginRight: '8px' }} /> {t("common.seeOnMap") || "See on map"}
            </button>
          </div>
        </div>
      ) : null}



      <div className={styles["lists-leaderboard__content"]}>
        {loading || (loadingMore && displayedUsers.length === 0) ? (
            <div className={styles["lists-leaderboard__list"]}>
            <div className={`${styles["lists-leaderboard__list-header"]} typography-label-medium uppercase`}>
              <div className={styles["lists-leaderboard__header-rank"]}><strong>{t("leaderboard.rank")}</strong></div>
              <div className={styles["lists-leaderboard__header-user"]}>{t("leaderboard.user")}</div>
              <div className={styles["lists-leaderboard__header-completed"]}>{t("leaderboard.completed")}</div>
              <div className={styles["lists-leaderboard__header-percent"]}>
                <button
                  type="button"
                  className={`${styles["lists-leaderboard__header-toggle"]} typography-button-medium`}
                  onClick={toggleStatMode}
                >
                  <span>
                    {statMode === "percent" ? "%" : t("leaderboard.time") || "Time"}
                  </span>
                  <ArrowLeftRight
                    size={12}
                    strokeWidth={2}
                    className={styles["lists-leaderboard__header-toggle-icon"]}
                  />
                </button>
              </div>
            </div>
            {Array.from({ length: 10 }).map((_, i) => (
              <UserItemSkeleton key={`user-skeleton-${i}`} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : isListEmpty ? (
          <EmptyState
            message={
              t("leaderboard.noParticipants") ||
              "No participants in this list yet. Be the first to join!"
            }
          />
        ) : (
          <>
            <div className={`${styles["lists-leaderboard__list-header"]} typography-label-medium uppercase`}>
              <div className={styles["lists-leaderboard__header-rank"]}><strong>{t("leaderboard.rank")}</strong></div>
              <div className={styles["lists-leaderboard__header-user"]}>{t("leaderboard.user")}</div>
              <div className={styles["lists-leaderboard__header-completed"]}>{t("leaderboard.completed")}</div>
              <div className={styles["lists-leaderboard__header-percent"]}>
                <button
                  type="button"
                  className={`${styles["lists-leaderboard__header-toggle"]} typography-button-medium`}
                  onClick={toggleStatMode}
                >
                  <span>
                    {statMode === "percent" ? "%" : t("leaderboard.time") || "Time"}
                  </span>
                  <ArrowLeftRight
                    size={12}
                    strokeWidth={2}
                    className={styles["lists-leaderboard__header-toggle-icon"]}
                  />
                </button>
              </div>
            </div>

            {/* Sticky User Header */}
            {authUserRank && authUser && (
              <div className={styles["lists-leaderboard__sticky-user"]}>
                <UserItem
                  user={{
                    ...authUserRank,
                    user_name: (authUserRank.user_name || authUser.externalUsername || "Me") as string,
                    user_image: (authUserRank.user_image || "") as string
                  } as any}
                  rank={authUserRank.rank}
                  onUserClick={handleUserClick}
                  isSticky={true}
                  statMode={statMode}
                  timeLabels={timeLabels}
                />
              </div>
            )}

            <div className={styles["lists-leaderboard__list"]}>
              {displayedUsers.map((user, index) => (
                <UserItem
                  key={`${user.user_id}-${index}`}
                  user={user}
                  rank={index + 1}
                  onUserClick={handleUserClick}
                  statMode={statMode}
                  timeLabels={timeLabels}
                />
              ))}
            </div>

            {hasMore && (
              <div ref={observerRef} className={styles["lists-leaderboard__load-more"]}>
                {loadingMore && <LoadingState />}
              </div>
            )}
          </>
        )}
      </div>

      <ChallengesModal 
        isOpen={isModalOpen}
        onClose={() => {
          trackEvent("interaction", "lists_leaderboard_close_challenges_modal");
          setIsModalOpen(false);
        }}
        onUpdate={fetchLists}
        onSelect={(list) => {
          handleSelectList(list, true);
          trackEvent("interaction", `lists_leaderboard_modal_select_${list.list_id}`);
          setIsModalOpen(false);
        }}
      />

      <LoginRequiredPopup 
        isOpen={isLoginPopupOpen}
        onClose={() => {
          trackEvent("interaction", "lists_leaderboard_login_popup_close");
          setIsLoginPopupOpen(false);
        }}
        message="auth.loginRequired.joinChallenge"
      />
    </div>
  );
}
