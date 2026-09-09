import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import styles from "./desktop-ListsLeaderboard.module.css";
import {

  Users,
  Map as MapIcon,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Trophy,
} from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
// @ts-ignore
import "swiper/css";
// @ts-ignore
import "swiper/css/pagination";
import { Pagination, Navigation } from "swiper/modules";

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
  formatDurationLong,
  type DurationUnitLabels,
} from "../../../shared/utils/peakListFormatting";

// Import Desktop Components
import ChallengesModal from "../desktop-Profile/desktop-components/desktop-ChallengesModal";
import LoginRequiredPopup from "../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup";
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
  internalUserId?: number; // Add this if needed by shared types, though PeakListUser uses user_id
}

interface UserItemProps {
  user: PeakListUser | (UserRank & { user_name: string; user_image: string });
  rank: number;
  onUserClick: (userId: number) => void;
  isSticky?: boolean;
  timeLabels: DurationUnitLabels;
  locale?: string;
}

// =================================================================
// CONSTANTS
// =================================================================


const INITIAL_LOAD_COUNT = 20;
const LOAD_MORE_COUNT = 20;

// =================================================================
// UTILITY COMPONENTS
// =================================================================

const LoadingState = () => (
  <div className={styles["lists-leaderboard__loading"]}>
    <div className={styles["lists-leaderboard__spinner"]} />
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className={styles["lists-leaderboard__empty"]}>
    <Users size={48} strokeWidth={1} />
    <p className="typography-desktop-body-medium">{message}</p>
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className={styles["lists-leaderboard__error-state"]}>
    <p className="typography-desktop-body-medium">{message}</p>
    <button
      className={`${styles["lists-leaderboard__retry-btn"]} typography-desktop-button-small`}
      onClick={onRetry}
    >
      Try Again
    </button>
  </div>
);

const TableRowSkeleton = () => (
  <div className={styles["lists-leaderboard__skeleton-row"]}>
    <div className={`${styles["lists-leaderboard__skeleton-item"]} ${styles["lists-leaderboard__skeleton-rank"]}`} />
    <div className={styles["lists-leaderboard__skeleton-user"]}>
      <div className={`${styles["lists-leaderboard__skeleton-item"]} ${styles["lists-leaderboard__skeleton-avatar"]}`} />
      <div className={`${styles["lists-leaderboard__skeleton-item"]} ${styles["lists-leaderboard__skeleton-name"]}`} />
    </div>
    <div className={`${styles["lists-leaderboard__skeleton-item"]} ${styles["lists-leaderboard__skeleton-stat"]}`} />
    <div className={`${styles["lists-leaderboard__skeleton-item"]} ${styles["lists-leaderboard__skeleton-stat"]}`} />
    <div className={`${styles["lists-leaderboard__skeleton-item"]} ${styles["lists-leaderboard__skeleton-stat"]}`} />
  </div>
);

const HeroSkeleton = () => (
    <div className={styles["lists-leaderboard__skeleton-hero"]}>
      <div className={`${styles["lists-leaderboard__skeleton-item"]} ${styles["lists-leaderboard__skeleton-hero-number"]}`} />
      <div className={styles["lists-leaderboard__skeleton-hero-buttons"]}>
        <div className={`${styles["lists-leaderboard__skeleton-item"]} ${styles["lists-leaderboard__skeleton-hero-button"]}`} />
        <div className={`${styles["lists-leaderboard__skeleton-item"]} ${styles["lists-leaderboard__skeleton-hero-button"]}`} />
      </div>
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
  timeLabels,
  locale,
}) => {
  const handleClick = () => {
    onUserClick(user.user_id);
  };



  const percent = user.percent_completed ?? (user.total_peaks_in_list ? (user.user_completed / user.total_peaks_in_list) * 100 : 0);
  const percentDisplay = percent.toFixed(1);
  const timeDisplay = formatDurationLong(user.time_seconds, locale, timeLabels, 2) || "-";

  let rankClass = "";
  if (rank === 1) rankClass = styles["lists-leaderboard__rank-badge--top-1"] || "";
  else if (rank === 2) rankClass = styles["lists-leaderboard__rank-badge--top-2"] || "";
  else if (rank === 3) rankClass = styles["lists-leaderboard__rank-badge--top-3"] || "";

  return (
    <div 
      className={`${styles["lists-leaderboard__user-item"]} ${isSticky ? styles["lists-leaderboard__auth-user-item"] : ""}`} 
      onClick={handleClick}
    >
      <div className={`${styles["lists-leaderboard__rank-cell"]} typography-desktop-body-medium`}>
        <div className={`${styles["lists-leaderboard__rank-badge"]} ${rankClass}`}>
          {rank <= 3 ? <Trophy size={24} /> : rank}
        </div>
      </div>

      <div className={styles["lists-leaderboard__user-info"]}>
        <img
          className={styles["lists-leaderboard__avatar"]}
          src={user.user_image || "/placeholder.svg"}
          alt={user.user_name}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg";
          }}
        />
        <div className={styles["lists-leaderboard__user-name-container"]}>
          <span className={`${styles["lists-leaderboard__user-name"]} typography-desktop-label-large`}>
            {user.user_name}
          </span>
        </div>
      </div>

      <div className={styles["lists-leaderboard__user-stats-container"]}>
        <span className={`${styles["lists-leaderboard__user-stat-primary"]} typography-desktop-body-medium`}>
          {user.user_completed}
        </span>
        <span className={`${styles["lists-leaderboard__user-stat-secondary"]} typography-desktop-body-medium`}>
          {percentDisplay}%
        </span>
        <span className={`${styles["lists-leaderboard__user-stat-time"]} typography-desktop-body-medium`}>
          {timeDisplay}
        </span>
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

  // Read listId from URL params for persistence
  const initialListIdRef = useRef<number | null>(
    (() => {
      const param = new URLSearchParams(location.search).get("listId");
      return param ? parseInt(param, 10) : null;
    })()
  );

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

  const observerRef = useRef<HTMLDivElement>(null);
  const selectedListRef = useRef<PeakListBasicItem | null>(null);
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedListRef.current = selectedList;
  }, [selectedList]);

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

  // Update URL params when selectedList changes
  useEffect(() => {
    if (!selectedList) return;
    // Only update if we're on the leaderboard page
    if (!location.pathname.startsWith('/leaderboard')) return;
    const params = new URLSearchParams(location.search);
    const currentListId = params.get("listId");
    if (currentListId !== String(selectedList.list_id)) {
      params.set("listId", String(selectedList.list_id));
      // Preserve existing params (like tab) and add/update listId
      navigate(`/leaderboard?${params.toString()}`, { replace: true });
    }
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, [selectedList]);

  // Update navigation buttons after component mounts
  useEffect(() => {
    if (swiperInstance && prevButtonRef.current && nextButtonRef.current) {
      const navigation = swiperInstance.params.navigation;
      if (navigation && typeof navigation === "object") {
        navigation.nextEl = nextButtonRef.current;
        navigation.prevEl = prevButtonRef.current;
        swiperInstance.navigation.init();
        swiperInstance.navigation.update();
      }
    }
  }, [swiperInstance, swiperLists]);



  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getPeakListsBasic();
      const fetchedLists = response.lists || [];
      setLists(fetchedLists);
      
      const userFollowsAny = fetchedLists.some(l => l.is_following);
      const toDisplay = authUser && userFollowsAny ? fetchedLists.filter(l => l.is_following) : fetchedLists;

      // Sync selected list or pick default
      // On first load, check URL param for listId
      const urlListId = initialListIdRef.current;
      
      let currentSelected: PeakListBasicItem | null;
      if (selectedListRef.current) {
        currentSelected = fetchedLists.find(l => l.list_id === selectedListRef.current?.list_id) || selectedListRef.current;
      } else if (urlListId) {
        currentSelected = fetchedLists.find(l => l.list_id === urlListId) || toDisplay[0] || fetchedLists[0] || null;
        // Clear the initial ref so subsequent fetches use normal logic
        initialListIdRef.current = null;
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
    if (!selectedList) return;
    
    setLoadingMore(true);
    setAuthUserRank(null);
    try {
      const res = await getHighestCommunityListUsers(
        selectedList.list_id,
        INITIAL_LOAD_COUNT,
        0
      );
      
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
    if (selectedList) {
      setDisplayedUsers([]);
      setHasMore(false);
      setNextOffset(0);
      loadInitialUsers();
    }
  }, [selectedList, loadInitialUsers]);

  // Load more users
  const loadMoreUsers = useCallback(async () => {
    if (!selectedList || !hasMore || loadingMore) return;

    trackEvent(
      "pagination",
      `lists_leaderboard_desktop_load_more_${selectedList.list_id}`
    );
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
  }, [selectedList, hasMore, loadingMore, nextOffset, totalPeaksInList, trackEvent]);

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
    trackEvent("navigation", `lists_leaderboard_desktop_user_click_${userId}`);
    if (authUser && authUser.internalUserId === userId) {
      navigate("/profile");
    } else {
      navigate(`/externalprofile/${userId}`);
    }
  }, [navigate, authUser, trackEvent]);

  const handleSelectList = useCallback((list: PeakListBasicItem, fromModal = false) => {
    trackEvent(
      "interaction",
      `lists_leaderboard_desktop_select_list_${list.list_id}_${fromModal ? "modal" : "carousel"}`
    );
    
    const idx = swiperLists.findIndex(p => p.list_id === list.list_id);
    if (idx !== -1 && swiperInstance) {
      swiperInstance.slideToLoop(idx);
    } else {
      // Logic for adding list to swiper if it comes from modal and isn't there
      setSelectedList(list);
      if (fromModal) {
        setSwiperLists(prev => {
          const exists = prev.some(p => p.list_id === list.list_id);
          if (exists) return prev;
          
          if (swiperInstance) {
            const currentIdx = swiperInstance.realIndex;
            const newList = [...prev];
            newList.splice(currentIdx, 0, list);
            return newList;
          }
          return [list, ...prev];
        });
      }
    }
  }, [swiperInstance, swiperLists, trackEvent]);

  const handleToggleFollow = async (listId: number, isFollowing: boolean) => {
    if (!authUser) {
      trackEvent("social", "lists_leaderboard_desktop_follow_requires_login");
      setIsLoginPopupOpen(true);
      return;
    }
    
    setIsJoining(listId);
    try {
      trackEvent(
        "social",
        `lists_leaderboard_desktop_${isFollowing ? "leave" : "join"}_${listId}`
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
      trackEvent("social", "lists_leaderboard_desktop_follow_toggle_failed");
      console.error("Failed to toggle follow", err);
    } finally {
      setIsJoining(null);
    }
  };

  const handleSeeMore = useCallback(() => {
    if (selectedList) {
      trackEvent(
        "navigation",
        `lists_leaderboard_desktop_see_more_${selectedList.list_id}`
      );
      navigate(`/list-details/${selectedList.list_id}`);
    }
  }, [selectedList, navigate, trackEvent]);

  const handleSeeOnMap = useCallback(() => {
    if (selectedList) {
      trackEvent(
        "navigation",
        `lists_leaderboard_desktop_see_on_map_${selectedList.list_id}`
      );
      navigate(`/map?listId=${selectedList.list_id}`);
    }
  }, [selectedList, navigate, trackEvent]);

  const handleRetry = useCallback(() => {
    trackEvent("interaction", "lists_leaderboard_desktop_retry");
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
  const timeLabels: DurationUnitLabels = {
    year: t("common.timeUnits.yearShort") || "y",
    day: t("common.timeUnits.dayShort") || "d",
    hour: t("common.timeUnits.hourShort") || "h",
    minute: t("common.timeUnits.minuteShort") || "m",
    second: t("common.timeUnits.secondShort") || "s",
  };

  return (
    <div className={styles["lists-leaderboard"]}>
      {/* Filter Header */}
      <div className={styles["lists-leaderboard__filter-header"]}>
        <label className={`${styles["lists-leaderboard__filter-label"]} typography-desktop-title-medium`}>
          {t("leaderboard.selectList") || "Select Peak List"}
        </label>
        <button 
          className={`${styles["lists-leaderboard__see-all-link"]} typography-desktop-label-medium`}
          onClick={() => {
            trackEvent("interaction", "lists_leaderboard_desktop_open_challenges_modal");
            setIsModalOpen(true);
          }}
        >
          {t("leaderboard.seeAll") || "See all"}
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Challenge Summary Hero Swiper */}
      {loading ? (
        <HeroSkeleton />
      ) : swiperLists.length === 1 ? (
        swiperLists.map(list => {
          const meta = buildConstraintMeta(list);
          return (
            <div key={list.list_id} className={styles["lists-leaderboard__hero-swiper-wrapper"]}>
              <div 
                className={styles["lists-leaderboard__challenge-summary"]}
                style={{ backgroundImage: list.primary_image ? `url(${list.primary_image})` : undefined }}
              >
                <div className={styles["lists-leaderboard__challenge-summary-overlay"]} />
                <div className={styles["lists-leaderboard__challenge-summary-content"]}>
                {/* Join / Leave - top right */}
                <button 
                  className={`${styles["lists-leaderboard__hero-follow-btn"]} ${list.is_following ? styles["lists-leaderboard__hero-follow-btn--following"] : ""}`}
                  onClick={(e) => { e.stopPropagation(); handleToggleFollow(list.list_id, !!list.is_following); }}
                >
                  {isJoining === list.list_id ? (
                    <div className={styles["lists-leaderboard__spinner"]} style={{ width: 12, height: 12 }} />
                  ) : list.is_following ? (
                    <X size={14} />
                  ) : (
                    <Plus size={14} />
                  )}
                  <span className="typography-desktop-label-small">
                    {list.is_following ? t("common.leave") || "Leave" : t("common.join") || "Join"}
                  </span>
                </button>

                <span className={`${styles["lists-leaderboard__challenge-summary-name"]} typography-desktop-headline-medium`}>
                  {getListName(list)}
                </span>
                {(list.creator_name || list.creator_image) && (
                  <CreatorBadge
                    name={list.creator_name ?? null}
                    imageUrl={list.creator_image ?? null}
                    className={styles["lists-leaderboard__creator-badge"]}
                    size="lg"
                    variant="dark"
                  />
                )}

                <div className={styles["lists-leaderboard__total-peaks-row"]}>
                  <span className={`${styles["lists-leaderboard__total-peaks-number"]} typography-desktop-display-xxl`}>
                    {totalPeaks}
                  </span>
                  <span className={`${styles["lists-leaderboard__total-peaks-label"]} typography-desktop-label-large`}>{t("leaderboard.peaks")}</span>
                </div>

                <div
                  className={`${styles["lists-leaderboard__challenge-meta"]} ${
                    meta.length === 0 ? styles["lists-leaderboard__challenge-meta--empty"] : ""
                  }`}
                  aria-hidden={meta.length === 0}
                >
                  {meta.map((item) => (
                    <span key={item} className={`${styles["lists-leaderboard__meta-pill"]} typography-desktop-label-small`}>
                      {item}
                    </span>
                  ))}
                </div>
                
                <div className={styles["lists-leaderboard__challenge-actions"]}>
                  <button
                    className={`${styles["lists-leaderboard__action-btn"]} ${styles["lists-leaderboard__action-btn--secondary"]} typography-desktop-button-medium`}
                    onClick={(e) => { e.stopPropagation(); handleSeeMore(); }}
                  >
                    {t("common.seeMore") || "See more"}
                  </button>
                  <button
                    className={`${styles["lists-leaderboard__action-btn"]} ${styles["lists-leaderboard__action-btn--primary"]} typography-desktop-button-medium`}
                    onClick={(e) => { e.stopPropagation(); handleSeeOnMap(); }}
                  >
                    <MapIcon size={18} style={{ marginRight: '8px' }} /> {t("common.seeOnMap") || "See on map"}
                  </button>
                </div>
                </div>
              </div>
            </div>
          );
        })
      ) : swiperLists.length > 1 ? (
        <div className={styles["lists-leaderboard__hero-swiper-wrapper"]}>
          <Swiper
            key="desktop-swiper"
            spaceBetween={0}
            slidesPerView={1}
            loop={swiperLists.length > 3}
            centeredSlides
            allowTouchMove={false}
            observer={true}
            observeParents={true}
            pagination={{
              clickable: true,
              dynamicBullets: true,
            }}
            modules={[Pagination, Navigation]}
            className={styles["lists-leaderboard__hero-swiper"]}
            onSwiper={setSwiperInstance}
            navigation={{
              enabled: true,
              prevEl: prevButtonRef.current,
              nextEl: nextButtonRef.current,
            }}
            onSlideChange={(swiper) => {
              const list = swiperLists[swiper.realIndex];
              if (list && list.list_id !== selectedListRef.current?.list_id) {
                setSelectedList(list);
              }
            }}
            initialSlide={Math.max(0, swiperLists.findIndex(l => l.list_id === selectedList?.list_id))}
          >
            {swiperLists.map((list) => {
              const meta = buildConstraintMeta(list);
              return (
                <SwiperSlide key={list.list_id}>
                  <div 
                    className={styles["lists-leaderboard__challenge-summary"]}
                    style={{ backgroundImage: list.primary_image ? `url(${list.primary_image})` : undefined }}
                  >
                    <div className={styles["lists-leaderboard__challenge-summary-overlay"]} />
                    <div className={styles["lists-leaderboard__challenge-summary-content"]}>
                    {/* Join / Leave - top right */}
                    <button 
                      className={`${styles["lists-leaderboard__hero-follow-btn"]} ${list.is_following ? styles["lists-leaderboard__hero-follow-btn--following"] : ""}`}
                      onClick={(e) => { e.stopPropagation(); handleToggleFollow(list.list_id, !!list.is_following); }}
                    >
                      {isJoining === list.list_id ? (
                        <div className={styles["lists-leaderboard__spinner"]} style={{ width: 12, height: 12 }} />
                      ) : list.is_following ? (
                        <X size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                      <span className="typography-desktop-label-small">
                        {list.is_following ? t("common.leave") || "Leave" : t("common.join") || "Join"}
                      </span>
                    </button>

                    <span className={`${styles["lists-leaderboard__challenge-summary-name"]} typography-desktop-headline-medium`}>
                      {getListName(list)}
                    </span>
                    {(list.creator_name || list.creator_image) && (
                      <CreatorBadge
                        name={list.creator_name ?? null}
                        imageUrl={list.creator_image ?? null}
                        className={styles["lists-leaderboard__creator-badge"]}
                        size="lg"
                        variant="dark"
                      />
                    )}

                    <div className={styles["lists-leaderboard__total-peaks-row"]}>
                      <span className={`${styles["lists-leaderboard__total-peaks-number"]} typography-desktop-display-xxl`}>
                        {totalPeaks}
                      </span>
                      <span className={`${styles["lists-leaderboard__total-peaks-label"]} typography-desktop-label-large`}>{t("leaderboard.peaks")}</span>
                    </div>

                    <div
                      className={`${styles["lists-leaderboard__challenge-meta"]} ${
                        meta.length === 0 ? styles["lists-leaderboard__challenge-meta--empty"] : ""
                      }`}
                      aria-hidden={meta.length === 0}
                    >
                      {meta.map((item) => (
                        <span key={item} className={`${styles["lists-leaderboard__meta-pill"]} typography-desktop-label-small`}>
                          {item}
                        </span>
                      ))}
                    </div>
                    
                    <div className={styles["lists-leaderboard__challenge-actions"]}>
                      <button
                        className={`${styles["lists-leaderboard__action-btn"]} ${styles["lists-leaderboard__action-btn--secondary"]} typography-desktop-button-medium`}
                        onClick={(e) => { e.stopPropagation(); handleSeeMore(); }}
                      >
                        {t("common.seeMore") || "See more"}
                      </button>
                      <button
                        className={`${styles["lists-leaderboard__action-btn"]} ${styles["lists-leaderboard__action-btn--primary"]} typography-desktop-button-medium`}
                        onClick={(e) => { e.stopPropagation(); handleSeeOnMap(); }}
                      >
                        <MapIcon size={18} style={{ marginRight: '8px' }} /> {t("common.seeOnMap") || "See on map"}
                      </button>
                    </div>
                    </div>
                  </div>
                </SwiperSlide>
              );
            })}
          </Swiper>

          {/* Navigation Arrows */}
          <button
            ref={prevButtonRef}
            className={`${styles["lists-leaderboard__nav-button"]} ${styles["lists-leaderboard__nav-button--prev"]}`}
            aria-label="Previous challenge"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            ref={nextButtonRef}
            className={`${styles["lists-leaderboard__nav-button"]} ${styles["lists-leaderboard__nav-button--next"]}`}
            aria-label="Next challenge"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      ) : (
        <div className={styles["lists-leaderboard__empty-following"]}>
          <p className="typography-desktop-body-small">
            {t("leaderboard.noFollowing") || "You are not following any challenge yet."}
          </p>
          <button 
            className={`${styles["lists-leaderboard__explore-btn"]} typography-desktop-label-medium`}
            onClick={() => {
              trackEvent("interaction", "lists_leaderboard_desktop_explore_challenges");
              setIsModalOpen(true);
            }}
          >
            {t("leaderboard.exploreChallenges") || "Explore Challenges"}
          </button>
        </div>
      )}

      {/* Content Section */}
      <div className={styles["lists-leaderboard__content"]}>
        {loading ? (
          <LoadingState />
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
            <div className={styles["lists-leaderboard__tabel-wrapper"]}>
              <div className={`${styles["lists-leaderboard__list-header"]} typography-desktop-label-medium uppercase`}>
                <div className={styles["lists-leaderboard__header-rank"]}><strong>{t("leaderboard.rank")}</strong></div>
                <div className={styles["lists-leaderboard__header-user"]}>{t("leaderboard.user")}</div>
                <div className={styles["lists-leaderboard__header-completed"]}>{t("leaderboard.completed")}</div>
                <div className={styles["lists-leaderboard__header-percent"]}>%</div>
                <div className={styles["lists-leaderboard__header-time"]}>{t("leaderboard.time") || "Time"}</div>
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
                    timeLabels={timeLabels}
                    locale={language}
                  />
                </div>
              )}
              
              <div className={styles["lists-leaderboard__list"]}>
                {loading || (loadingMore && displayedUsers.length === 0) ? (
                  <div className={styles["lists-leaderboard__skeleton-wrapper"]}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <TableRowSkeleton key={i} />
                    ))}
                  </div>
                ) : displayedUsers.length > 0 ? (
                  displayedUsers.map((user, index) => (
                    <UserItem
                      key={`${user.user_id}-${index}`}
                      user={user}
                      rank={index + 1}
                      onUserClick={handleUserClick}
                      timeLabels={timeLabels}
                      locale={language}
                    />
                  ))
                ) : null}
              </div>
            </div>

            {hasMore && (
              <div ref={observerRef} className={styles["lists-leaderboard__load-more"]}>
                {loadingMore && displayedUsers.length > 0 && <LoadingState />}
              </div>
            )}
          </>
        )}
      </div>

      <ChallengesModal 
        isOpen={isModalOpen}
        onClose={() => {
          trackEvent("interaction", "lists_leaderboard_desktop_close_challenges_modal");
          setIsModalOpen(false);
        }}
        onUpdate={fetchLists}
        onSelect={(list) => {
          handleSelectList(list, true);
          trackEvent("interaction", `lists_leaderboard_desktop_modal_select_${list.list_id}`);
          setIsModalOpen(false);
        }}
      />

      <LoginRequiredPopup 
        isOpen={isLoginPopupOpen}
        onClose={() => {
          trackEvent("interaction", "lists_leaderboard_desktop_login_popup_close");
          setIsLoginPopupOpen(false);
        }}
        message="auth.loginRequired.joinChallenge"
      />
    </div>
  );
}
