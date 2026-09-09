import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Plus } from "lucide-react";
import { useMap } from "../../context/MapContext";
import styles from "./MapChallengesModal.module.css";
import {
  followPeakList,
  unfollowPeakList,
} from "../../../shared/api/endpoints/peakLists";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import {
  getChallengeItemKey,
  matchesChallengeSearch,
} from "../../../shared/utils/challengeSearch";
import AppModal from "../../../shared/components/AppModal";
import {
  challengeBrowserItemTransition,
} from "../../../shared/utils/challengeBrowserMotion";

const MapChallengesModal: React.FC = () => {
  const {
    isChallengesModalOpen,
    toggleChallengesModal,
    peakLists,
    isLoadingLists,
    handleSelectList,
    activeFilter,
    setShowLoginPopup,
    setLoginPopupMessage,
  } = useMap();

  const { user } = useAuth();
  const { t } = useI18n();

  const [followedListIds, setFollowedListIds] = useState<Set<number>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const worldPeaksLabel = t("peakLists.worldPeaks");
  const worldPeaksMetaLabel = t("main.allPeaks");

  useEffect(() => {
    if (!isChallengesModalOpen) return;

    setSearchQuery("");

    const followed = new Set<number>();
    peakLists.forEach((list) => {
      if (
        list.is_following ||
        list.user_authenticated ||
        (list.user_completed && list.user_completed > 0)
      ) {
        followed.add(list.list_id);
      }
    });
    setFollowedListIds(followed);
  }, [isChallengesModalOpen, peakLists]);

  const handleFollowToggle = async (e: React.MouseEvent, listId: number) => {
    e.stopPropagation();

    if (!user) {
      setLoginPopupMessage("auth.loginRequired.joinChallenge");
      setShowLoginPopup(true);
      return;
    }

    if (processingIds.has(listId)) {
      return;
    }

    const isFollowing = followedListIds.has(listId);
    const previousFollowed = new Set(followedListIds);
    const optimisticFollowed = new Set(previousFollowed);

    if (isFollowing) {
      optimisticFollowed.delete(listId);
    } else {
      optimisticFollowed.add(listId);
    }

    setProcessingIds((prev) => new Set(prev).add(listId));
    setFollowedListIds(optimisticFollowed);

    try {
      if (isFollowing) {
        await unfollowPeakList(listId);
      } else {
        await followPeakList(listId);
      }
    } catch (error) {
      console.error("Failed to toggle follow status:", error);
      setFollowedListIds(previousFollowed);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
    }
  };

  const handleCardClick = (listId: number | null) => {
    handleSelectList(listId);
    toggleChallengesModal();
  };

  const showWorldPeaks = useMemo(
    () =>
      matchesChallengeSearch(
        {
          list_name: worldPeaksLabel,
          creator_name: "",
        },
        deferredSearchQuery
      ),
    [deferredSearchQuery, worldPeaksLabel]
  );

  const filteredLists = useMemo(
    () =>
      peakLists.filter((list) =>
        matchesChallengeSearch(
          {
            list_name: list.list_name,
            creator_name: list.creator_name,
          },
          deferredSearchQuery
        )
      ),
    [peakLists, deferredSearchQuery]
  );

  const visibleChallengesCount = useMemo(
    () => filteredLists.length + (showWorldPeaks ? 1 : 0),
    [filteredLists.length, showWorldPeaks]
  );

  return (
    <AppModal
      open={isChallengesModalOpen}
      onClose={toggleChallengesModal}
      variant="sheet"
      contentClassName={styles["modal-challenges__content"]}
      ariaLabel={t("peakLists.challenges")}
    >
      <div className={styles["modal-challenges__header"]}>
        <div className={styles["modal-challenges__title-container"]}>
          <h2
            className={`${styles["modal-challenges__title"]} typography-headline-small`}
          >
            {t("peakLists.challenges")}
          </h2>
          <span
            className={`${styles["modal-challenges__subtitle"]} typography-body-small`}
          >
            {isLoadingLists
              ? t("common.loading")
              : `${visibleChallengesCount} ${
                  t("peakLists.available_challenges") || "available challenges"
                }`}
          </span>
        </div>
        <button
          className={styles["modal-challenges__close-button"]}
          onClick={toggleChallengesModal}
          aria-label={t("common.close") || "Close"}
        >
          <X size={20} />
        </button>
      </div>

      <div className={styles["modal-challenges__search"]}>
        <div className={styles["modal-challenges__search-input"]}>
          <Search size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              t("peakLists.searchPlaceholder") || "Search by title or creator"
            }
            aria-label={
              t("peakLists.searchPlaceholder") || "Search by title or creator"
            }
          />
          {searchQuery ? (
            <button
              type="button"
              className={styles["modal-challenges__search-clear"]}
              onClick={() => setSearchQuery("")}
              aria-label={t("common.clear") || "Clear"}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles["modal-challenges__body"]}>
        {isLoadingLists ? (
          <div className={styles["modal-challenges__loading-container"]}>
            <div className={styles["modal-challenges__loading-spinner"]} />
            <span
              className={`${styles["modal-challenges__loading-text"]} typography-body-medium`}
            >
              {t("common.loading")}
            </span>
          </div>
        ) : visibleChallengesCount === 0 ? (
          <div className={styles["modal-challenges__empty"]}>
            <h3 className="typography-title-medium">
              {t("peakLists.emptySearchTitle") || "No challenges found"}
            </h3>
            <p className="typography-body-small">
              {t("peakLists.emptySearchMessage") ||
                "Try another title or creator name."}
            </p>
            {searchQuery ? (
              <button
                type="button"
                className={`${styles["modal-challenges__empty-btn"]} typography-button-small`}
                onClick={() => setSearchQuery("")}
              >
                {t("common.clear") || "Clear"}
              </button>
            ) : null}
          </div>
        ) : (
          <div className={styles["modal-challenges__list"]}>
            <AnimatePresence initial={false}>
              {showWorldPeaks ? (
                <motion.div
                  key="world-peaks"
                  className={`${styles["modal-challenges-card"]} ${
                    activeFilter.type === "tile"
                      ? styles["modal-challenges-card--active"]
                      : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleCardClick(null);
                    }
                  }}
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={challengeBrowserItemTransition}
                >
                  <div className={styles["modal-challenges-card__summary"]}>
                    <div className={styles["modal-challenges-card__image-wrap"]}>
                      <img
                        src="/icons/peaklist/tot.jpg"
                        alt={t("peakLists.worldPeaks")}
                        className={styles["modal-challenges-card__image"]}
                      />
                    </div>

                    <div className={styles["modal-challenges-card__content"]}>
                      <div className={styles["modal-challenges-card__header"]}>
                        <h3
                          className={`${styles["modal-challenges-card__title"]} typography-title-large`}
                        >
                          {worldPeaksLabel}
                        </h3>
                        <div
                          className={`${styles["modal-challenges-card__meta-row"]} typography-label-large`}
                        >
                          <MountainIcon size={14} />
                          <span>{worldPeaksMetaLabel}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={styles["modal-challenges-card__footer"]}>
                    <button
                      type="button"
                      className={`${styles["modal-challenges-card__action-button"]} ${styles["modal-challenges-card__action-button--select"]} ${
                        activeFilter.type === "tile"
                          ? styles["modal-challenges-card__action-button--selected"]
                          : ""
                      } typography-button-small`}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCardClick(null);
                      }}
                    >
                      {activeFilter.type === "tile"
                        ? t("peakLists.joined")
                        : t("common.select")}
                    </button>
                  </div>
                </motion.div>
              ) : null}

              {filteredLists.map((list, index) => {
                const isActive =
                  activeFilter.type === "list-detail" &&
                  activeFilter.listId === list.list_id;
                const isFollowing = followedListIds.has(list.list_id);
                const isProcessing = processingIds.has(list.list_id);
                const progressText = isFollowing
                  ? `${list.user_completed} / ${list.num_peaks} ${
                      t("peaks.count")
                    }`
                  : `${list.num_peaks} ${t("peaks.count")}`;

                return (
                  <motion.div
                    key={getChallengeItemKey(list, index, "map-challenge")}
                    className={`${styles["modal-challenges-card"]} ${
                      isActive ? styles["modal-challenges-card--active"] : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCardClick(list.list_id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleCardClick(list.list_id);
                      }
                    }}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={challengeBrowserItemTransition}
                  >
                    <div className={styles["modal-challenges-card__summary"]}>
                      <div className={styles["modal-challenges-card__image-wrap"]}>
                        {list.primary_image ? (
                          <img
                            src={list.primary_image}
                            alt={list.list_name}
                            className={styles["modal-challenges-card__image"]}
                          />
                        ) : (
                          <div
                            className={
                              styles["modal-challenges-card__image-fallback"]
                            }
                          />
                        )}
                      </div>

                      <div className={styles["modal-challenges-card__content"]}>
                        <div className={styles["modal-challenges-card__header"]}>
                          <h3
                            className={`${styles["modal-challenges-card__title"]} typography-title-large`}
                          >
                            {list.list_name}
                          </h3>

                          <div
                            className={`${styles["modal-challenges-card__meta-row"]} typography-label-large`}
                          >
                            <MountainIcon size={14} />
                            <span>{progressText}</span>
                            {list.creator_name && (
                              <div
                                className={styles["modal-challenges-card__creator"]}
                              >
                                {list.creator_image && (
                                  <img
                                    src={list.creator_image}
                                    alt={list.creator_name}
                                    className={
                                      styles["modal-challenges-card__creator-image"]
                                    }
                                  />
                                )}
                                <span
                                  className={`${styles["modal-challenges-card__creator-name"]} typography-label-medium`}
                                >
                                  {list.creator_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles["modal-challenges-card__footer"]}>
                      <button
                        type="button"
                        className={`${styles["modal-challenges-card__action-button"]} ${styles["modal-challenges-card__action-button--select"]} ${
                          isActive
                            ? styles["modal-challenges-card__action-button--selected"]
                            : ""
                        } typography-button-small`}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCardClick(list.list_id);
                        }}
                      >
                        {isActive ? t("peakLists.joined") : t("common.select")}
                      </button>

                      <button
                        type="button"
                        className={`${styles["modal-challenges-card__action-button"]} ${
                          isFollowing
                            ? styles["modal-challenges-card__action-button--joined"]
                            : ""
                        } typography-button-small`}
                        onClick={(event) =>
                          handleFollowToggle(event, list.list_id)
                        }
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <div
                            className={
                              styles["modal-challenges-card__button-spinner"]
                            }
                          />
                        ) : isFollowing ? (
                          <>
                            <X size={14} />
                            {t("peakLists.leave")}
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            {t("peakLists.join")}
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppModal>
  );
};

export default MapChallengesModal;
