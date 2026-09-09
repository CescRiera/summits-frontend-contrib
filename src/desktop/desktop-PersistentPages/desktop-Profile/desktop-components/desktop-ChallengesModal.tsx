import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CalendarRange,
  Clock3,
  Lock,
  Plus,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAuth } from "../../../../shared/context/AuthContext";
import {
  getPeakListsBasic,
  followPeakList,
  unfollowPeakList,
} from "../../../../shared/api/endpoints/peakLists";
import type { PeakListBasicItem } from "../../../../shared/api/types/user";
import styles from "./desktop-ChallengesModal.module.css";
import CreatorBadge from "../../../../shared/components/CreatorBadge/CreatorBadge";
import LoginRequiredPopup from "../../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup";
import AppModal from "../../../../shared/components/AppModal";
import {
  getChallengeDisplayName,
  getChallengeItemKey,
  matchesChallengeSearch,
} from "../../../../shared/utils/challengeSearch";
import {
  formatDateShort,
  formatDurationHours,
} from "../../../../shared/utils/peakListFormatting";
import {
  challengeBrowserItemTransition,
} from "../../../../shared/utils/challengeBrowserMotion";

interface ChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onSelect?: (challenge: PeakListBasicItem) => void;
}

type ChallengeMetaItem = {
  id: string;
  label: string;
  kind: "time" | "date";
};

const ChallengesModal: React.FC<ChallengesModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  onSelect,
}) => {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<PeakListBasicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasLoadedChallengesRef = useRef(false);
  const loadChallengesPromiseRef = useRef<Promise<void> | null>(null);

  const fetchChallenges = useCallback(async (showLoader = true) => {
    if (loadChallengesPromiseRef.current) {
      return loadChallengesPromiseRef.current;
    }

    if (showLoader) {
      setLoading(true);
    }

    const request = (async () => {
      try {
        const data = await getPeakListsBasic();
        setChallenges(data.lists || []);
        hasLoadedChallengesRef.current = true;
      } catch (error) {
        console.error("Failed to fetch challenges:", error);
      } finally {
        setLoading(false);
        loadChallengesPromiseRef.current = null;
      }
    })();

    loadChallengesPromiseRef.current = request;

    return request;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setSearchQuery("");
    if (!hasLoadedChallengesRef.current) {
      setLoading(true);
      void fetchChallenges();
    }
  }, [isOpen, fetchChallenges]);

  useEffect(() => {
    if (isOpen || hasLoadedChallengesRef.current) {
      return;
    }

    const preloadTimeout = window.setTimeout(() => {
      if (!hasLoadedChallengesRef.current) {
        void fetchChallenges(false);
      }
    }, 250);

    return () => window.clearTimeout(preloadTimeout);
  }, [isOpen, fetchChallenges]);

  const handleToggleFollow = async (listId: number, isFollowing: boolean) => {
    if (!user) {
      setIsLoginPopupOpen(true);
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(listId));
    try {
      if (isFollowing) {
        await unfollowPeakList(listId);
      } else {
        await followPeakList(listId);
      }

      setChallenges((prev) =>
        prev.map((challenge) =>
          challenge.list_id === listId
            ? { ...challenge, is_following: !isFollowing }
            : challenge
        )
      );
      onUpdate();
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(listId);
        return next;
      });
    }
  };

  const handleMoreInfo = (listId: number) => {
    navigate(`/list-details/${listId}`);
    onClose();
  };

  const handlePrimaryAction = (challenge: PeakListBasicItem) => {
    if (onSelect) {
      onSelect(challenge);
      onClose();
      return;
    }

    handleMoreInfo(challenge.list_id);
  };

  const buildConstraintMeta = useCallback(
    (challenge: PeakListBasicItem): ChallengeMetaItem[] => {
      const items: ChallengeMetaItem[] = [];
      const durationLabel = formatDurationHours(challenge.max_duration);

      if (durationLabel) {
        items.push({
          id: "time-limit",
          kind: "time",
          label: `${t("peakLists.timeLimit") || "Time limit"}: ${durationLabel}`,
        });
      }

      const startLabel = formatDateShort(challenge.start_date, language);
      const endLabel = formatDateShort(challenge.end_date, language);

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

  const filteredChallenges = useMemo(
    () =>
      challenges.filter((challenge) =>
        matchesChallengeSearch(
          {
            name: challenge.name,
            list_name: challenge.list_name,
            creator_name: challenge.creator_name,
          },
          deferredSearchQuery
        )
      ),
    [challenges, deferredSearchQuery]
  );

  const totalAvailableLabel = useMemo(
    () =>
      `${filteredChallenges.length} ${
        t("peakLists.available_challenges") || "available challenges"
      }`,
    [filteredChallenges.length, t]
  );

  const heroDescription = onSelect
    ? t("leaderboard.peakListsDescription") ||
      "Click any of the challenges below to access its details"
    : t("home.challenges.subtitle") ||
      "View and complete the biggest world challenges";

  return (
    <>
      <AppModal
        open={isOpen}
        onClose={onClose}
        variant="dialog"
        contentClassName={styles["desktop-challenge-modal__content"]}
        ariaLabel={t("profile.challenges.browseTitle") || "Browse Challenges"}
      >
        <div className={styles["desktop-challenge-modal__shell"]}>
          <div className={styles["desktop-challenge-modal__hero"]}>
            <div className={styles["desktop-challenge-modal__hero-copy"]}>
              <div className={styles["desktop-challenge-modal__header"]}>
                <div className={styles["desktop-challenge-modal__header-copy"]}>
                  <h2 className="typography-desktop-title-medium">
                    {t("profile.challenges.browseTitle") || "Browse Challenges"}
                  </h2>
                  <p
                    className={`${styles["desktop-challenge-modal__subtitle"]} typography-desktop-body-small`}
                  >
                    {heroDescription}
                  </p>
                </div>

                <button
                  className={styles["desktop-challenge-modal__close"]}
                  onClick={onClose}
                  aria-label={t("common.close") || "Close"}
                >
                  <X size={22} />
                </button>
              </div>
            </div>
          </div>

          <div className={styles["desktop-challenge-modal__toolbar"]}>
            <div className={styles["desktop-challenge-modal__search"]}>
              <div className={styles["desktop-challenge-modal__search-input"]}>
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
                    className={styles["desktop-challenge-modal__search-clear"]}
                    onClick={() => setSearchQuery("")}
                    aria-label={t("common.clear") || "Clear"}
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>
            </div>

            {!loading ? (
              <div
                className={`${styles["desktop-challenge-modal__toolbar-summary"]} typography-desktop-label-medium`}
              >
                <Trophy size={16} />
                {totalAvailableLabel}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles["desktop-challenge-modal__body"]}>
          {loading ? (
            <div className={styles["desktop-challenge-modal__loading"]}>
              <div className={styles["desktop-challenge-modal__spinner"]} />
              <p className="typography-desktop-body-medium">
                {t("common.loading") || "Loading..."}
              </p>
            </div>
          ) : filteredChallenges.length === 0 ? (
            <div className={styles["desktop-challenge-modal__empty"]}>
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
                  className={`${styles["desktop-challenge-modal__empty-btn"]} typography-desktop-button-small`}
                  onClick={() => setSearchQuery("")}
                >
                  {t("common.clear") || "Clear"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className={styles["desktop-challenge-modal__list"]}>
              <AnimatePresence initial={false}>
                {filteredChallenges.map((challenge, index) => {
                  const isFollowing = challenge.is_following || false;
                  const isProcessing = processingIds.has(challenge.list_id);
                  const isPrivate = challenge.is_private || false;
                  const challengeName = getChallengeDisplayName(challenge);
                  const hasCreator =
                    !!challenge.creator_name || !!challenge.creator_image;
                  const challengePeakCount =
                    (
                      challenge as PeakListBasicItem & {
                        num_peaks?: number;
                        total_peaks?: number;
                      }
                    ).num_peaks ??
                    (
                      challenge as PeakListBasicItem & {
                        num_peaks?: number;
                        total_peaks?: number;
                      }
                    ).total_peaks ??
                    0;
                  const constraintMeta = buildConstraintMeta(challenge);

                  return (
                    <motion.article
                      layout
                      key={getChallengeItemKey(
                        challenge,
                        index,
                        "desktop-challenge"
                      )}
                      className={`${styles["desktop-challenge-modal__item"]} ${
                        isFollowing
                          ? styles["desktop-challenge-modal__item--following"]
                          : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handlePrimaryAction(challenge)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handlePrimaryAction(challenge);
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
                        className={styles["desktop-challenge-modal__item-image"]}
                        style={{
                          backgroundImage: challenge.primary_image
                            ? `linear-gradient(180deg, rgba(15, 23, 42, 0.02) 0%, rgba(15, 23, 42, 0.72) 100%), url(${challenge.primary_image})`
                            : undefined,
                        }}
                      >
                        <div
                          className={styles["desktop-challenge-modal__item-topbar"]}
                        >
                          {isPrivate ? (
                            <div
                              className={styles["desktop-challenge-modal__item-private"]}
                            >
                              <Lock size={12} />
                            </div>
                          ) : <span />}

                          <div
                            className={styles["desktop-challenge-modal__item-peak-chip"]}
                          >
                            <Trophy size={14} />
                            <span className="typography-desktop-label-medium">
                              {challengePeakCount} {t("peaks.count")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={styles["desktop-challenge-modal__item-content"]}
                      >
                        <div className={styles["desktop-challenge-modal__item-main"]}>
                          <div
                            className={
                              styles["desktop-challenge-modal__item-title-row"]
                            }
                          >
                            <h3
                              className={`${styles["desktop-challenge-modal__item-title"]} typography-desktop-body-medium`}
                            >
                              {challengeName}
                            </h3>
                          </div>

                          {hasCreator ? (
                            <div
                              className={
                                styles["desktop-challenge-modal__creator-row"]
                              }
                            >
                              <CreatorBadge
                                name={challenge.creator_name ?? null}
                                imageUrl={challenge.creator_image ?? null}
                                className={
                                  styles["desktop-challenge-modal__creator-badge"]
                                }
                                size="md"
                                variant="light"
                                showLabel={false}
                              />
                              {challenge.creator_name ? (
                                <span
                                  className={`${styles["desktop-challenge-modal__creator-name"]} typography-desktop-label-medium`}
                                >
                                  {challenge.creator_name}
                                </span>
                              ) : null}
                            </div>
                          ) : null}

                        </div>

                        {constraintMeta.length > 0 ? (
                          <div className={styles["desktop-challenge-modal__meta-list"]}>
                            {constraintMeta.map((item) => {
                              const Icon =
                                item.kind === "time" ? Clock3 : CalendarRange;

                              return (
                                <div
                                  key={`${challenge.list_id}-${item.id}`}
                                  className={styles["desktop-challenge-modal__meta-item"]}
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
                          className={styles["desktop-challenge-modal__item-actions"]}
                        >
                          {onSelect ? (
                            <button
                              type="button"
                              className={`${styles["desktop-challenge-modal__item-btn"]} ${styles["desktop-challenge-modal__item-btn--info"]}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onSelect(challenge);
                                onClose();
                              }}
                            >
                              <span className="typography-desktop-button-small">
                                {t("common.select") || "Select"}
                              </span>
                              <ArrowRight size={16} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`${styles["desktop-challenge-modal__item-btn"]} ${styles["desktop-challenge-modal__item-btn--info"]}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleMoreInfo(challenge.list_id);
                              }}
                            >
                              <span className="typography-desktop-button-small">
                                {t("common.moreInfo") || "More Info"}
                              </span>
                              <ArrowRight size={16} />
                            </button>
                          )}

                          <button
                            type="button"
                            className={`${styles["desktop-challenge-modal__item-btn"]} ${
                              isFollowing
                                ? styles["desktop-challenge-modal__item-btn--following"]
                                : styles["desktop-challenge-modal__item-btn--follow"]
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleFollow(challenge.list_id, isFollowing);
                            }}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <>
                                <div
                                  className={
                                    styles["desktop-challenge-modal__btn-spinner"]
                                  }
                                />
                                <span className="typography-desktop-button-small">
                                  {t("common.loading") || "Loading..."}
                                </span>
                              </>
                            ) : isFollowing ? (
                              <>
                                <X size={14} />
                                <span className="typography-desktop-button-small">
                                  {t("common.leave") || "Leave"}
                                </span>
                              </>
                            ) : (
                              <>
                                <Plus size={14} />
                                <span className="typography-desktop-button-small">
                                  {t("common.join") || "Join"}
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

      <LoginRequiredPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        message="auth.loginRequired.joinChallenge"
      />
    </>
  );
};

export default ChallengesModal;
