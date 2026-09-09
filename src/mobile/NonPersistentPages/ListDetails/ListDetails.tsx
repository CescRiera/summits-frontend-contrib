import React, { useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { useListDetailsData } from "./hooks/useListDetailsData";
import ListDetailsGrid from "./components/ListDetailsGrid/ListDetailsGrid";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import styles from "./ListDetails.module.css";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import OverlayInfoSection from "../../components/Overlay/OverlayInfoSection/OverlayInfoSection";
import { useEffect, useState } from "react";
import { followPeakList, unfollowPeakList } from "../../../shared/api/endpoints/peakLists";
import { useAuth } from "../../../shared/context/AuthContext";
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
    trackEvent("interaction", `list_follow_toggle_attempt_${isFollowing ? "leave" : "join"}`);
    setFollowLoading(true);
    const previousFollowing = isFollowing;
    setIsFollowing(!previousFollowing); // Optimistic update

    try {
      if (previousFollowing) {
        await unfollowPeakList(parseInt(id));
      } else {
        await followPeakList(parseInt(id));
      }
      trackEvent("interaction", `list_follow_toggle_success_${previousFollowing ? "leave" : "join"}`);
      await refetch();
    } catch (err) {
      console.error("Error following/unfollowing list:", err);
      trackEvent("interaction", `list_follow_toggle_failed_${previousFollowing ? "leave" : "join"}`);
      setIsFollowing(previousFollowing); // Revert on error
    } finally {
      setFollowLoading(false);
    }
  }, [id, followLoading, isFollowing, refetch, trackEvent]);

  // Track list view when data is loaded
  useEffect(() => {
    if (listData && id) {
      trackEvent("interaction", `list_view_${id}`);
    }
  }, [listData, id, trackEvent]);

  const handleBack = () => {
    trackEvent("button_click", "list_details_back");
    if (overlayContext) {
      overlayContext.handleOverlayBack();
    } else {
      navigate(-1);
    }
  };

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
              className={`${styles["listDetails__loadingSpinner"]} typography-body-medium`}
            >
              Error
            </div>
          </div>
          <div
            className={`${styles["listDetails__errorContainer"]} typography-body-small`}
          >
            <p className="typography-body-medium">
              {error || "List not found"}
            </p>
            <button
              className={`${styles["listDetails__retryButton"]} typography-button-medium`}
              onClick={() => {
                trackEvent("button_click", "list_details_retry");
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
      <div className={styles["listDetails__content"]}>
        {/* Header Section */}
        <OverlayHeader
          title={
            userId && listData?.user_name
              ? t("listDetails.userTitle", {
                  userName: listData.user_name,
                  listName: listData.list_name,
                })
              : t("listDetails.title", { listName: listData.list_name })
          }
          onBack={handleBack}
          rightContent={
            <div className={styles["listDetails__headerRight"]}>
              {user && (
                <button
                  className={`${styles["listDetails__joinButton"]} ${
                    isFollowing ? styles["listDetails__joinButton--following"] : ""
                  } typography-button-small`}
                  onClick={handleJoinLeave}
                  disabled={followLoading}
                >
                  {followLoading
                    ? "..."
                    : isFollowing
                    ? t("peakLists.leave")
                    : t("peakLists.join")}
                </button>
              )}
            </div>
          }
        />

        {(listData.creator_name || listData.creator_image) && (
          <CreatorBadge
            name={listData.creator_name ?? null}
            imageUrl={listData.creator_image ?? null}
            className={styles["listDetails__creatorBadge"]}
            size="lg"
            variant="light"
          />
        )}

        {/* Description and Stats Section */}
        <OverlayInfoSection
          description={listData.description}
          stats={[
            {
              label: t("main.totalPeaks"),
              value: listData.total_peaks,
              variant: "primary",
            },
            ...(listData.user_authenticated &&
            listData.total_user_peaks !== undefined
              ? [
                  {
                    label: t("main.completed"),
                    value: listData.total_user_peaks,
                    variant: "completed" as const,
                  },
                ]
              : []),
          ]}
        />

        {/* Use the new ListDetailsGrid component */}
        <ListDetailsGrid
          listData={listData}
          onMapClick={() => {
            trackEvent("button_click", `list_details_map_${listData.list_id}`);
            navigate(`/map?listId=${listData.list_id}`);
          }}
          onRankingClick={() => {
            trackEvent("button_click", `list_details_ranking_${listData.list_id}`);
            navigate(`/leaderboard?listId=${listData.list_id}`);
          }}
        />
      </div>
    </div>
  );
};

export default ListDetails;
