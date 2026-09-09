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
import { X, Info, Lock, Plus, Search } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAuth } from "../../../../shared/context/AuthContext";
import {
  getPeakListsBasic,
  followPeakList,
  unfollowPeakList,
} from "../../../../shared/api/endpoints/peakLists";
import type { PeakListBasicItem } from "../../../../shared/api/types";
import styles from "./ChallengesModal.module.css";
import LoginRequiredPopup from "../../../components/LoginRequiredPopup/LoginRequiredPopup";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import AppModal from "../../../../shared/components/AppModal";
import {
  getChallengeDisplayName,
  getChallengeItemKey,
  matchesChallengeSearch,
} from "../../../../shared/utils/challengeSearch";
import {
  challengeBrowserItemTransition,
} from "../../../../shared/utils/challengeBrowserMotion";

interface ChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onSelect?: (challenge: PeakListBasicItem) => void;
}

const ChallengesModal: React.FC<ChallengesModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  onSelect,
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<PeakListBasicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const hasLoadedChallengesRef = useRef(false);
  const loadChallengesPromiseRef = useRef<Promise<void> | null>(null);

  const loadChallenges = useCallback(async (showLoader = true) => {
    if (loadChallengesPromiseRef.current) {
      return loadChallengesPromiseRef.current;
    }

    if (showLoader) {
      setLoading(true);
    }

    const request = (async () => {
      try {
        const response = await getPeakListsBasic();
        setChallenges(response.lists);
        console.log("challenges", response.lists);
        hasLoadedChallengesRef.current = true;
      } catch (error) {
        console.error("Failed to load challenges:", error);
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
      void loadChallenges();
    }
  }, [isOpen, loadChallenges]);

  useEffect(() => {
    if (isOpen || hasLoadedChallengesRef.current) {
      return;
    }

    const preloadTimeout = window.setTimeout(() => {
      if (!hasLoadedChallengesRef.current) {
        void loadChallenges(false);
      }
    }, 250);

    return () => window.clearTimeout(preloadTimeout);
  }, [isOpen, loadChallenges]);

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
      onUpdate?.();
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

  const handleSelect = (challenge: PeakListBasicItem) => {
    onSelect?.(challenge);
    onClose();
  };

  const handlePrimaryAction = (challenge: PeakListBasicItem) => {
    if (onSelect) {
      handleSelect(challenge);
      return;
    }

    handleMoreInfo(challenge.list_id);
  };

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

  const showEmptyState = !loading && filteredChallenges.length === 0;

  return (
    <>
      <AppModal
        open={isOpen}
        onClose={onClose}
        variant="fullscreen"
        contentClassName={styles["challenge-modal__content"]}
        ariaLabel={t("profile.challenges.browseTitle") || "Browse Challenges"}
      >
          <div className={styles["challenge-modal__header"]}>
            <div className={styles["challenge-modal__header-copy"]}>
              <h2 className="typography-title-large">
                {t("profile.challenges.browseTitle") || "Browse Challenges"}
              </h2>
              <p
                className={`${styles["challenge-modal__subtitle"]} typography-body-small`}
              >
                {loading
                  ? t("common.loading")
                  : `${filteredChallenges.length} ${
                      t("peakLists.available_challenges") || "available challenges"
                    }`}
              </p>
            </div>
            <button
              className={styles["challenge-modal__close"]}
              onClick={onClose}
              aria-label={t("common.close") || "Close"}
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles["challenge-modal__search"]}>
            <div className={styles["challenge-modal__search-input"]}>
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
                  className={styles["challenge-modal__search-clear"]}
                  onClick={() => setSearchQuery("")}
                  aria-label={t("common.clear") || "Clear"}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles["challenge-modal__body"]}>
            {loading ? (
              <div className={styles["challenge-modal__loading"]}>
                <div className={styles["challenge-modal__spinner"]} />
              </div>
            ) : showEmptyState ? (
              <div className={styles["challenge-modal__empty"]}>
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
                    className={`${styles["challenge-modal__empty-btn"]} typography-button-small`}
                    onClick={() => setSearchQuery("")}
                  >
                    {t("common.clear") || "Clear"}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className={styles["challenge-modal__list"]}>
                <AnimatePresence initial={false}>
                  {filteredChallenges.map((challenge, index) => {
                    const isProcessing = processingIds.has(challenge.list_id);
                    const isFollowing = challenge.is_following || false;
                    const challengeName = getChallengeDisplayName(challenge);
                    const challengePeakCount =
                      (challenge as any).num_peaks ??
                      (challenge as any).total_peaks ??
                      0;

                    return (
                      <motion.div
                        key={getChallengeItemKey(challenge, index)}
                        className={styles["challenge-modal__item"]}
                        role="button"
                        tabIndex={0}
                        onClick={() => handlePrimaryAction(challenge)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handlePrimaryAction(challenge);
                          }
                        }}
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={challengeBrowserItemTransition}
                      >
                        <div className={styles["challenge-modal__item-summary"]}>
                          <div
                            className={styles["challenge-modal__item-image"]}
                            style={{
                              backgroundImage: challenge.primary_image
                                ? `url(${challenge.primary_image})`
                                : undefined,
                            }}
                          />

                          <div className={styles["challenge-modal__item-content"]}>
                            <div className={styles["challenge-modal__item-main"]}>
                              <div className={styles["challenge-modal__item-title-row"]}>
                                <h3
                                  className={`${styles["challenge-modal__item-title"]} typography-title-large`}
                                >
                                  {challengeName}
                                </h3>
                                {challenge.is_private ? (
                                  <div
                                    className={
                                      styles["challenge-modal__item-private"]
                                    }
                                  >
                                    <Lock size={12} />
                                  </div>
                                ) : null}
                              </div>

                              <div
                                className={`${styles["challenge-modal__item-meta"]} typography-label-large`}
                              >
                                <MountainIcon size={14} />
                                <span>
                                  {challengePeakCount} {t("peaks.count")}
                                </span>
                                {challenge.creator_name && (
                                  <div
                                    className={styles["challenge-modal__creator"]}
                                  >
                                    {challenge.creator_image && (
                                      <img
                                        src={challenge.creator_image}
                                        alt={challenge.creator_name}
                                        className={
                                          styles["challenge-modal__creator-image"]
                                        }
                                      />
                                    )}
                                    <span
                                      className={`${styles["challenge-modal__creator-name"]} typography-label-medium`}
                                    >
                                      {challenge.creator_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className={styles["challenge-modal__item-actions"]}>
                          {onSelect ? (
                            <button
                              type="button"
                              className={`${styles["challenge-modal__item-btn"]} ${styles["challenge-modal__item-btn--info"]}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleSelect(challenge);
                              }}
                            >
                              <span className="typography-button-small">
                                {t("common.select") || "Select"}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={`${styles["challenge-modal__item-btn"]} ${styles["challenge-modal__item-btn--info"]}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleMoreInfo(challenge.list_id);
                              }}
                            >
                              <Info size={14} />
                              <span className="typography-button-small">
                                {t("common.moreInfo") || "More Info"}
                              </span>
                            </button>
                          )}

                          <button
                            type="button"
                            className={`${styles["challenge-modal__item-btn"]} ${
                              isFollowing
                                ? styles["challenge-modal__item-btn--following"]
                                : styles["challenge-modal__item-btn--follow"]
                            }`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleFollow(challenge.list_id, isFollowing);
                            }}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <div className={styles["challenge-modal__btn-spinner"]} />
                            ) : isFollowing ? (
                              <>
                                <X size={14} />
                                <span className="typography-button-small">
                                  {t("common.leave") || "Leave"}
                                </span>
                              </>
                            ) : (
                              <>
                                <Plus size={14} />
                                <span className="typography-button-small">
                                  {t("common.join") || "Join"}
                                </span>
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

      <LoginRequiredPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        message="auth.loginRequired.joinChallenge"
      />
    </>
  );
};

export default ChallengesModal;
