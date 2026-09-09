import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CalendarRange,
  Clock3,
  Plus,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { useMap } from "../../desktop-context/desktop-MapContext.tsx";
import styles from "./desktop-MapChallengesModal.module.css";
import {
  followPeakList,
  unfollowPeakList,
} from "../../../shared/api/endpoints/peakLists";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import type { PeakListWithPeaks } from "../../../shared/api/types";
import CreatorBadge from "../../../shared/components/CreatorBadge/CreatorBadge";
import {
  getChallengeItemKey,
  matchesChallengeSearch,
} from "../../../shared/utils/challengeSearch";
import AppModal from "../../../shared/components/AppModal";
import {
  formatDateShort,
  formatDurationHours,
} from "../../../shared/utils/peakListFormatting";
import {
  challengeBrowserItemTransition,
} from "../../../shared/utils/challengeBrowserMotion";

type ChallengeMetaItem = {
  id: string;
  label: string;
  kind: "time" | "date";
};

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
  const { t, language } = useI18n();

  const [followedListIds, setFollowedListIds] = useState<Set<number>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const worldPeaksLabel = t("peakLists.worldPeaks");

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

  const buildConstraintMeta = useMemo(
    () =>
      (list: PeakListWithPeaks): ChallengeMetaItem[] => {
        const items: ChallengeMetaItem[] = [];
        const durationLabel = formatDurationHours(list.max_duration);

        if (durationLabel) {
          items.push({
            id: "time-limit",
            kind: "time",
            label: `${t("peakLists.timeLimit") || "Time limit"}: ${durationLabel}`,
          });
        }

        const startLabel = formatDateShort(list.start_date, language);
        const endLabel = formatDateShort(list.end_date, language);

        if (startLabel && endLabel) {
          items.push({
            id: "date-range",
            kind: "date",
            label: `${t("peakLists.dateRange") || "Valid"}: ${startLabel} - ${endLabel}`,
          });
        } else if (startLabel) {
          items.push({
            id: "date-start",
            kind: "date",
            label: `${t("peakLists.starts") || "Starts"}: ${startLabel}`,
          });
        } else if (endLabel) {
          items.push({
            id: "date-end",
            kind: "date",
            label: `${t("peakLists.ends") || "Ends"}: ${endLabel}`,
          });
        }

        return items;
      },
    [language, t]
  );

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

  const totalAvailableLabel = useMemo(
    () =>
      `${visibleChallengesCount} ${
        t("peakLists.available_challenges") || "available challenges"
      }`,
    [t, visibleChallengesCount]
  );

  return (
    <AppModal
      open={isChallengesModalOpen}
      onClose={toggleChallengesModal}
      variant="dialog"
      contentClassName={styles["desktop-map-challenge-modal__content"]}
      ariaLabel={t("peakLists.challenges")}
    >
      <div className={styles["desktop-map-challenge-modal__shell"]}>
        <div className={styles["desktop-map-challenge-modal__hero"]}>
          <div className={styles["desktop-map-challenge-modal__hero-copy"]}>
            <div className={styles["desktop-map-challenge-modal__header"]}>
              <div className={styles["desktop-map-challenge-modal__header-copy"]}>
                <h2 className="typography-desktop-title-medium">
                  {t("peakLists.challenges")}
                </h2>
                <p
                  className={`${styles["desktop-map-challenge-modal__subtitle"]} typography-desktop-body-small`}
                >
                  {t("home.challenges.subtitle") ||
                    "View and complete the biggest world challenges"}
                </p>
              </div>

              <button
                className={styles["desktop-map-challenge-modal__close"]}
                onClick={toggleChallengesModal}
                aria-label={t("common.close") || "Close"}
              >
                <X size={22} />
              </button>
            </div>
          </div>
        </div>

        <div className={styles["desktop-map-challenge-modal__toolbar"]}>
          <div className={styles["desktop-map-challenge-modal__search"]}>
            <div className={styles["desktop-map-challenge-modal__search-input"]}>
              <Search size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={
                  t("peakLists.searchPlaceholder") ||
                  "Search by title or creator"
                }
                aria-label={
                  t("peakLists.searchPlaceholder") ||
                  "Search by title or creator"
                }
              />
              {searchQuery ? (
                <button
                  type="button"
                  className={styles["desktop-map-challenge-modal__search-clear"]}
                  onClick={() => setSearchQuery("")}
                  aria-label={t("common.clear") || "Clear"}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          {!isLoadingLists ? (
            <div
              className={`${styles["desktop-map-challenge-modal__toolbar-summary"]} typography-desktop-label-medium`}
            >
              <Trophy size={16} />
              {totalAvailableLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles["desktop-map-challenge-modal__body"]}>
        {isLoadingLists ? (
          <div className={styles["desktop-map-challenge-modal__loading"]}>
            <div className={styles["desktop-map-challenge-modal__spinner"]} />
            <p className="typography-desktop-body-medium">
              {t("common.loading") || "Loading..."}
            </p>
          </div>
        ) : visibleChallengesCount === 0 ? (
          <div className={styles["desktop-map-challenge-modal__empty"]}>
            <h3 className="typography-desktop-title-medium">
              {t("peakLists.emptySearchTitle") || "No challenges found"}
            </h3>
            <p className="typography-desktop-body-small">
              {t("peakLists.emptySearchMessage") ||
                "Try another title or creator name."}
            </p>
            {searchQuery ? (
              <button
                type="button"
                className={`${styles["desktop-map-challenge-modal__empty-btn"]} typography-desktop-button-small`}
                onClick={() => setSearchQuery("")}
              >
                {t("common.clear") || "Clear"}
              </button>
            ) : null}
          </div>
        ) : (
          <div className={styles["desktop-map-challenge-modal__list"]}>
            <AnimatePresence initial={false}>
              {showWorldPeaks ? (
                <motion.article
                  layout
                  key="world-peaks"
                  className={`${styles["desktop-map-challenge-modal__item"]} ${
                    styles["desktop-map-challenge-modal__item--featured"]
                  } ${
                    activeFilter.type === "tile"
                      ? styles["desktop-map-challenge-modal__item--active"]
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
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{
                    ...challengeBrowserItemTransition,
                    layout: { duration: 0.5, type: "spring", bounce: 0.15 }
                  }}
                >
                  <div
                    className={`${styles["desktop-map-challenge-modal__item-image"]} ${styles["desktop-map-challenge-modal__item-image--featured"]}`}
                    style={{
                      backgroundImage:
                        "linear-gradient(180deg, rgba(15, 23, 42, 0.02) 0%, rgba(15, 23, 42, 0.72) 100%), url(/icons/peaklist/tot.jpg)",
                    }}
                  >
                    <div className={styles["desktop-map-challenge-modal__item-overlay"]}>
                      <div className={styles["desktop-map-challenge-modal__item-main"]}>
                        <div className={styles["desktop-map-challenge-modal__item-title-row"]}>
                          <h3
                            className={`${styles["desktop-map-challenge-modal__item-title"]} typography-desktop-body-medium`}
                          >
                            {worldPeaksLabel}
                          </h3>
                          <span
                            className={`${styles["desktop-map-challenge-modal__item-title-inline"]} typography-desktop-label-medium`}
                          >
                            {t("peakLists.worldPeaksDescription")}
                          </span>
                        </div>
                      </div>

                      <div
                        className={styles["desktop-map-challenge-modal__item-actions"]}
                      >
                        <button
                          type="button"
                          className={`${styles["desktop-map-challenge-modal__item-btn"]} ${styles["desktop-map-challenge-modal__item-btn--select"]} ${
                            activeFilter.type === "tile"
                              ? styles["desktop-map-challenge-modal__item-btn--selected"]
                              : ""
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCardClick(null);
                          }}
                        >
                          <span className="typography-desktop-button-small">
                            {activeFilter.type === "tile"
                              ? t("peakLists.joined")
                              : t("common.select")}
                          </span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ) : null}

              {filteredLists.map((list, index) => {
                const isActive =
                  activeFilter.type === "list-detail" &&
                  activeFilter.listId === list.list_id;
                const isFollowing = followedListIds.has(list.list_id);
                const isProcessing = processingIds.has(list.list_id);
                const hasCreator = !!list.creator_name || !!list.creator_image;
                const constraintMeta = buildConstraintMeta(list);

                return (
                  <motion.article
                    layout
                    key={getChallengeItemKey(list, index, "desktop-map-challenge")}
                    className={`${styles["desktop-map-challenge-modal__item"]} ${
                      isFollowing
                        ? styles["desktop-map-challenge-modal__item--following"]
                        : ""
                    } ${
                      isActive ? styles["desktop-map-challenge-modal__item--active"] : ""
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
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{
                      ...challengeBrowserItemTransition,
                      layout: { duration: 0.5, type: "spring", bounce: 0.15 }
                    }}
                  >
                    <div
                      className={styles["desktop-map-challenge-modal__item-image"]}
                      style={{
                        backgroundImage: list.primary_image
                          ? `linear-gradient(180deg, rgba(15, 23, 42, 0.02) 0%, rgba(15, 23, 42, 0.72) 100%), url(${list.primary_image})`
                          : undefined,
                      }}
                    >
                      <div
                        className={styles["desktop-map-challenge-modal__item-topbar"]}
                      >
                        <div
                          className={styles["desktop-map-challenge-modal__item-peak-chip"]}
                        >
                          <Trophy size={14} />
                          <span className="typography-desktop-label-medium">
                            {list.num_peaks} {t("peaks.count")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={styles["desktop-map-challenge-modal__item-content"]}
                    >
                      <div className={styles["desktop-map-challenge-modal__item-main"]}>
                        <h3
                          className={`${styles["desktop-map-challenge-modal__item-title"]} typography-desktop-body-medium`}
                        >
                          {list.list_name}
                        </h3>

                        {hasCreator ? (
                          <div className={styles["desktop-map-challenge-modal__creator-row"]}>
                            <CreatorBadge
                              name={list.creator_name ?? null}
                              imageUrl={list.creator_image ?? null}
                              className={styles["desktop-map-challenge-modal__creator-badge"]}
                              size="md"
                              variant="light"
                              showLabel={false}
                            />
                            {list.creator_name ? (
                              <span
                                className={`${styles["desktop-map-challenge-modal__creator-name"]} typography-desktop-label-medium`}
                              >
                                {list.creator_name}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                      </div>

                      {constraintMeta.length > 0 ? (
                        <div className={styles["desktop-map-challenge-modal__meta-list"]}>
                          {constraintMeta.map((item) => {
                            const Icon =
                              item.kind === "time" ? Clock3 : CalendarRange;

                            return (
                              <div
                                key={`${list.list_id}-${item.id}`}
                                className={styles["desktop-map-challenge-modal__meta-item"]}
                              >
                                <Icon size={14} />
                                <span className="typography-desktop-label-medium">
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      <div
                        className={styles["desktop-map-challenge-modal__item-actions"]}
                      >
                        <button
                          type="button"
                          className={`${styles["desktop-map-challenge-modal__item-btn"]} ${styles["desktop-map-challenge-modal__item-btn--select"]} ${
                            isActive
                              ? styles["desktop-map-challenge-modal__item-btn--selected"]
                              : ""
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCardClick(list.list_id);
                          }}
                        >
                          <span className="typography-desktop-button-small">
                            {isActive ? t("peakLists.joined") : t("common.select")}
                          </span>
                          <ArrowRight size={16} />
                        </button>
                        <button
                          type="button"
                          className={`${styles["desktop-map-challenge-modal__item-btn"]} ${
                            isFollowing
                              ? styles["desktop-map-challenge-modal__item-btn--following"]
                              : styles["desktop-map-challenge-modal__item-btn--follow"]
                          }`}
                          onClick={(event) => handleFollowToggle(event, list.list_id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <div
                              className={styles["desktop-map-challenge-modal__btn-spinner"]}
                            />
                          ) : isFollowing ? (
                            <>
                              <X size={14} />
                              <span className="typography-desktop-button-small">
                                {t("peakLists.leave")}
                              </span>
                            </>
                          ) : (
                            <>
                              <Plus size={14} />
                              <span className="typography-desktop-button-small">
                                {t("peakLists.join")}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.article>
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
