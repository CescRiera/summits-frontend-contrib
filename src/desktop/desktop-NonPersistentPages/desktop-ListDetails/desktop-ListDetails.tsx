import React, { useRef, useMemo, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useListDetailsData } from "./desktop-hooks/desktop-useListDetailsData.ts";
import { useListDetailsUI } from "./desktop-hooks/desktop-useListDetailsUI.ts";
import { SearchAndFilters } from "./desktop-components/desktop-SearchAndFilters/desktop-SearchAndFilters.tsx";
import { PeakGrid } from "./desktop-components/desktop-PeakGrid/desktop-PeakGrid.tsx";
import LoginRequiredPopup from "../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup.tsx";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import styles from "./desktop-ListDetails.module.css";
import { useOptionalOverlayContext } from "../../desktop-components/desktop-Overlay/desktop-OverlayContext.tsx";
import { useEffect } from "react";
import { followPeakList, unfollowPeakList } from "../../../shared/api/endpoints/peakLists";
import { Map, Trophy, Plus, X, Loader2 } from "lucide-react";
import type { SortOption, FilterMode } from "./desktop-types.ts";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import CreatorBadge from "../../../shared/components/CreatorBadge/CreatorBadge";

const ListDetails: React.FC = () => {
  const { id, userId } = useParams<{ id: string; userId?: string }>();
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const { t } = useI18n();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const containerRef = useRef<HTMLDivElement>(null);

  const { listData, loading, error, refetch } = useListDetailsData(id, userId);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);

  useEffect(() => {
    if (listData) {
      setIsFollowing(!!listData.is_following);
    }
  }, [listData]);

  const handleJoinLeave = useCallback(async () => {
    if (!id || followLoading) return;
    trackEvent("interaction", `list_desktop_follow_toggle_attempt_${isFollowing ? "leave" : "join"}`);
    setFollowLoading(true);
    const previousFollowing = isFollowing;
    setIsFollowing(!previousFollowing); // Optimistic update

    try {
      if (previousFollowing) {
        await unfollowPeakList(parseInt(id));
      } else {
        await followPeakList(parseInt(id));
      }
      trackEvent("interaction", `list_desktop_follow_toggle_success_${previousFollowing ? "leave" : "join"}`);
      await refetch();
    } catch (err) {
      console.error("Error following/unfollowing list:", err);
      trackEvent("interaction", `list_desktop_follow_toggle_failed_${previousFollowing ? "leave" : "join"}`);
      setIsFollowing(previousFollowing); // Revert on error
    } finally {
      setFollowLoading(false);
    }
  }, [id, followLoading, isFollowing, refetch, trackEvent]);

  // Initial state for filters
  const initialSortOption: SortOption = {
    field: "elevation",
    direction: "desc",
  };
  const initialFilterMode: FilterMode = "all";

  // Filter state management
  const {
    sortOption,
    filterMode,
    searchQuery,
    isTransitioning,
    isSortDropdownOpen,
    isFilterDropdownOpen,
    isLoading,
    showLoginPopup,
    loginPopupMessage,
    sortDropdownRef,
    filterDropdownRef,
    searchInputRef,
    handleSortChange,
    handleFilterChange,
    handleSearchChange,
    handleSearchClear,
    handleSortDropdownToggle,
    handleFilterDropdownToggle,
    handleCloseLoginPopup,
  } = useListDetailsUI(
    initialSortOption,
    initialFilterMode,
    user,
    listData?.user_authenticated
  );

  const handlePeakClick = useCallback(
    (peakId: number) => {
      trackEvent("peak_click", `listDetails_${peakId}`);
      navigate(`/peaks/${peakId}`);
    },
    [navigate, trackEvent]
  );

  // Check if user has completed any peaks in this list
  const hasCompletedPeaks = useMemo(() => {
    if (!listData?.user_authenticated || !listData?.peaks) return false;
    return listData.peaks.some((peak) => peak.user?.completed === true);
  }, [listData?.user_authenticated, listData?.peaks]);

  // Track list view when data is loaded
  useEffect(() => {
    if (listData && id) {
      trackEvent("interaction", `list_desktop_view_${id}`);
    }
  }, [listData, id, trackEvent]);

  // Update overlay name for breadcrumbs when list data loads
  useEffect(() => {
    if (!listData?.list_name || !id || !overlayContext) return;
    
    // Format: "Name (list name)" when accessed from a user, otherwise just "list name"
    const displayName = userId && listData.user_name
      ? `${listData.user_name} (${listData.list_name})`
      : listData.list_name;
    
    // Build baseStorageKey to match the overlay
    const baseStorageKey = userId
      ? `list:${id}:${userId}`
      : `list:${id}`;
    
    // Find the overlay in the stack that matches this list
    const matchingOverlay = overlayContext.overlayStack.find(
      (overlay) => overlay.baseStorageKey === baseStorageKey
    );
    
    // Only update if the name is different to avoid unnecessary updates
    if (matchingOverlay && matchingOverlay.name !== displayName) {
      overlayContext.updateOverlayNameByBaseKey(baseStorageKey, displayName);
    }
  }, [listData?.list_name, listData?.user_name, userId, id, overlayContext]);


  if (loading) {
    return (
      <div className={styles["listDetails"]} ref={containerRef}>
        <LoadingScreen message="Loading..." />
      </div>
    );
  }

  if (error || !listData) {
    return (
      <div className={styles["listDetails"]} ref={containerRef}>
        <div className={styles["listDetails__content"]}>
          <div className={styles["listDetails__loadingContainer"]}>
            <div
              className={`${styles["listDetails__loadingSpinner"]} typography-desktop-body-small`}
            >
              Error
            </div>
          </div>
          <div
            className={`${styles["listDetails__errorContainer"]} typography-desktop-label-medium`}
          >
            <p className="typography-desktop-body-small">
              {error || "List not found"}
            </p>
            <button
              className={`${styles["listDetails__retryButton"]} typography-desktop-button-medium`}
              onClick={() => {
                trackEvent("button_click", "list_desktop_retry");
                window.location.reload();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["listDetails"]} ref={containerRef}>
      <LoginRequiredPopup
        isOpen={showLoginPopup}
        onClose={handleCloseLoginPopup}
        message={loginPopupMessage}
      />

      <div className={styles["listDetails__heroWrapper"]}>
        <div 
          className={styles["listDetails__hero"]}
          style={{ backgroundImage: listData.primary_image ? `url(${listData.primary_image})` : undefined }}
        >
          <div className={styles["listDetails__heroOverlay"]} />

          <div className={styles["listDetails__heroContent"]}>
            {user && (
              <button
                className={`${styles["listDetails__heroFollowBtn"]} ${
                  isFollowing ? styles["listDetails__heroFollowBtn--following"] : ""
                }`}
                onClick={handleJoinLeave}
                disabled={followLoading}
              >
                {followLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isFollowing ? (
                  <X size={14} />
                ) : (
                  <Plus size={14} />
                )}
                <span className="typography-desktop-label-small">
                  {isFollowing ? t("peakLists.leave") : t("peakLists.join")}
                </span>
              </button>
            )}

            {(listData.creator_name || listData.creator_image) && (
              <div className={styles["listDetails__heroCreator"]}>
                <CreatorBadge
                  name={listData.creator_name ?? null}
                  imageUrl={listData.creator_image ?? null}
                  size="md"
                  variant="dark"
                />
              </div>
            )}

            <h1 className={`${styles["listDetails__heroTitle"]} typography-desktop-display-medium`}>
              {userId && listData?.user_name
                ? t("listDetails.userTitle", {
                    userName: listData.user_name,
                    listName: listData.list_name,
                  })
                : t("listDetails.title", { listName: listData.list_name })}
            </h1>

            <div className={styles["listDetails__totalPeaksRow"]}>
              <span className={`${styles["listDetails__totalPeaksLabel"]} typography-desktop-label-large`}>{t("main.totalPeaks") || "Peaks"}</span>
              <span className={`${styles["listDetails__totalPeaksNumber"]} typography-desktop-display-xxl`}>{listData.total_peaks}</span>
            </div>

            {listData.description && (
              <p className={`${styles["listDetails__heroDescription"]} typography-desktop-body-medium`}>
                {listData.description}
              </p>
            )}

            <div className={styles["listDetails__heroActions"]}>
              <button
                className={`${styles["listDetails__actionBtn"]} ${styles["listDetails__actionBtn--secondary"]} typography-desktop-button-medium`}
                onClick={() => {
                  trackEvent("button_click", `list_desktop_ranking_${listData.list_id}`);
                  navigate(`/leaderboard?listId=${listData.list_id}`);
                }}
              >
                <Trophy size={18} />
                {t("common.ranking") || "Ranking"}
              </button>
              <button
                className={`${styles["listDetails__actionBtn"]} ${styles["listDetails__actionBtn--primary"]} typography-desktop-button-medium`}
                onClick={() => {
                  trackEvent("button_click", `list_desktop_map_${listData.list_id}`);
                  navigate(`/map?listId=${listData.list_id}`);
                }}
              >
                <Map size={18} />
                {t("common.map") || "See on map"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles["listDetails__filtersContainer"]}>
        <SearchAndFilters
          searchQuery={searchQuery}
          sortOption={sortOption}
          filterMode={filterMode}
          isSortDropdownOpen={isSortDropdownOpen}
          isFilterDropdownOpen={isFilterDropdownOpen}
          isLoading={isLoading}
          sortDropdownRef={sortDropdownRef}
          filterDropdownRef={filterDropdownRef}
          searchInputRef={searchInputRef}
          onSearchChange={handleSearchChange}
          onSearchClear={handleSearchClear}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          onSortDropdownToggle={handleSortDropdownToggle}
          onFilterDropdownToggle={handleFilterDropdownToggle}
          t={t}
        />
      </div>

      <div className={styles["listDetails__peaksSection"]}>
        <PeakGrid
          listData={listData}
          sortOption={sortOption}
          filterMode={filterMode}
          searchQuery={searchQuery}
          isLoading={isLoading}
          isTransitioning={isTransitioning}
          onPeakClick={handlePeakClick}
          hasCompletedPeaks={hasCompletedPeaks}
          t={t}
        />
      </div>
    </div>
  );
};

export default ListDetails;
