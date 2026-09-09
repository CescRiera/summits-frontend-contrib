import React, { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Lock, Users, Info, Plus, Check } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAuth } from "../../../../shared/context/AuthContext";
import {
  useClubsBrowse,
  useClubMutations,
} from "../../../../shared/hooks/clubs/useClubs";
import { flattenClubPages } from "../../../../shared/utils/clubResponse";
import { getClubMembershipBadgeKey } from "../../../../shared/utils/clubState";
import { getLocationFromHierarchy } from "../../../../shared/utils/adminHierarchy";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";
import LoginRequiredPopup from "../../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup";
import styles from "./desktop-JoinClubsModal.module.css";
import AppModal from "../../../../shared/components/AppModal";

interface JoinClubsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

const JoinClubsModal: React.FC<JoinClubsModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);

  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: "join" | "leave";
    clubId: number | null;
    clubName: string;
  }>({
    isOpen: false,
    type: "join",
    clubId: null,
    clubName: "",
  });

  const clubsQuery = useClubsBrowse({
    search: deferredSearchQuery,
    sort_by: "most_users",
  });

  const mutations = useClubMutations();

  const clubs = useMemo(
    () => flattenClubPages(clubsQuery.data?.pages),
    [clubsQuery.data?.pages]
  );

  const handleJoin = async (clubId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!user) {
      setIsLoginPopupOpen(true);
      return;
    }

    try {
      trackEvent("interaction", "club_join_modal_join");
      await mutations.joinClub.mutateAsync(clubId);
      onUpdate?.();
    } catch (error) {
      console.error(error);
    }
  };

  const handleNavigate = (clubId: number) => {
    trackEvent("club_click", `join_clubs_modal_${clubId}`);
    onClose();
    navigate(`/clubs/${clubId}`);
  };

  const handleCancel = async (clubId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      trackEvent("interaction", "club_join_modal_cancel_request");
      await mutations.cancelJoinRequest.mutateAsync(clubId);
      onUpdate?.();
    } catch (error) {
      console.error(error);
    }
  };

  const handleLeaveTrigger = (
    clubId: number,
    clubName: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setConfirmationModal({
      isOpen: true,
      type: "leave",
      clubId,
      clubName,
    });
  };

  const handleLeaveConfirm = async () => {
    if (!confirmationModal.clubId) return;
    try {
      trackEvent("interaction", "club_join_modal_leave_confirm");
      await mutations.leaveClub.mutateAsync(confirmationModal.clubId);
      setConfirmationModal((prev) => ({ ...prev, isOpen: false }));
      onUpdate?.();
    } catch (error) {
      console.error(error);
    }
  };

  const showEmptyState = !clubsQuery.isLoading && clubs.length === 0;

  return (
    <>
      <AppModal
        open={isOpen}
        onClose={onClose}
        variant="dialog"
        contentClassName={styles["club-modal__content"]}
        ariaLabel={t("profile.clubs.browseTitle") || "Browse Clubs"}
      >
        <div className={styles["club-modal__header"]}>
          <div className={styles["club-modal__header-copy"]}>
            <h2 className="typography-desktop-title-large">
              {t("profile.clubs.browseTitle") || "Browse Clubs"}
            </h2>
            <p
              className={`${styles["club-modal__subtitle"]} typography-desktop-body-small`}
            >
              {clubsQuery.isLoading
                ? t("common.loading")
                : `${clubs.length} ${t("clubs.availableClubs") || "clubs found"}`}
            </p>
          </div>
          <button
            className={styles["club-modal__close"]}
            onClick={onClose}
            aria-label={t("common.close") || "Close"}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles["club-modal__search"]}>
          <div className={styles["club-modal__search-input-group"]}>
            <div className={styles["club-modal__search-field"]}>
              <Search size={18} />
              <input
                type="text"
                className="typography-desktop-body-small"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={
                  t("clubs.browse.searchPlaceholderUnified") ||
                  "Search clubs or regions..."
                }
                aria-label={
                  t("clubs.browse.searchPlaceholderUnified") ||
                  "Search clubs or regions..."
                }
              />
              {searchQuery ? (
                <button
                  type="button"
                  className={styles["club-modal__search-clear"]}
                  onClick={() => setSearchQuery("")}
                  aria-label={t("common.clear") || "Clear"}
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles["club-modal__body"]}>
          {clubsQuery.isLoading && clubs.length === 0 ? (
            <div className={styles["club-modal__loading"]}>
              <div className={styles["club-modal__spinner"]} />
            </div>
          ) : showEmptyState ? (
            <div className={styles["club-modal__empty"]}>
              <h3 className="typography-desktop-title-medium">
                {t("clubs.browse.emptySearchTitle") || "No clubs found"}
              </h3>
              <p className="typography-desktop-body-small">
                {t("clubs.browse.emptySearchMessage") || "Try a broader search."}
              </p>
              {searchQuery ? (
                <button
                  type="button"
                  className={`${styles["club-modal__empty-btn"]} typography-desktop-button-small`}
                  onClick={() => setSearchQuery("")}
                >
                  {t("common.clear") || "Clear"}
                </button>
              ) : null}
            </div>
          ) : (
            <div className={styles["club-modal__list"]}>
              <AnimatePresence initial={false}>
                {clubs.map((club) => {
                  const isProcessing =
                    (mutations.joinClub.isPending &&
                      mutations.joinClub.variables === club.id) ||
                    (mutations.cancelJoinRequest.isPending &&
                      mutations.cancelJoinRequest.variables === club.id) ||
                    (mutations.leaveClub.isPending &&
                      mutations.leaveClub.variables === club.id);

                  const isPending = club.membership?.status === "pending";
                  const isMember = club.membership?.status === "accepted";
                  const membershipBadgeKey = getClubMembershipBadgeKey(club);

                  return (
                    <motion.div
                      key={club.id}
                      className={styles["club-modal__item"]}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNavigate(club.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleNavigate(club.id);
                        }
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <div className={styles["club-modal__item-summary"]}>
                        <div
                          className={styles["club-modal__item-image"]}
                          style={{
                            backgroundImage: club.image
                              ? `url(${club.image})`
                              : undefined,
                            backgroundColor: club.image
                              ? undefined
                              : "rgba(15, 23, 42, 0.04)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {!club.image ? (
                            <Users size={24} style={{ color: "rgba(15, 23, 42, 0.3)" }} />
                          ) : null}
                        </div>

                        <div className={styles["club-modal__item-content"]}>
                          <div className={styles["club-modal__item-main"]}>
                            <div className={styles["club-modal__item-title-row"]}>
                              <h3
                                className={`${styles["club-modal__item-title"]} typography-desktop-title-large`}
                              >
                                {club.name}
                              </h3>
                              {club.visibility === "private" ? (
                                <div className={styles["club-modal__item-private"]}>
                                  <Lock size={12} />
                                </div>
                              ) : null}
                            </div>

                            <div
                              className={`${styles["club-modal__item-meta"]} typography-desktop-label-large`}
                            >
                              <div className={styles["club-modal__item-meta-item"]}>
                                <Users size={14} />
                                <span>
                                  {club.member_count.toLocaleString()}{" "}
                                  {t("clubs.metrics.members") || "members"}
                                </span>
                              </div>
                              <div className={styles["club-modal__item-meta-item"]}>
                                <MountainIcon size={14} />
                                <span>
                                  {club.distinct_peak_count?.toLocaleString() || 0}{" "}
                                  {t("clubs.metrics.distinctPeaks") || "peaks"}
                                </span>
                              </div>
                              {club.admin_hierarchy ? (
                                <div className={styles["club-modal__item-meta-item"]}>
                                  <span>
                                    {getLocationFromHierarchy(club.admin_hierarchy)}
                                  </span>
                                </div>
                              ) : null}
                              {membershipBadgeKey ? (
                                <div className={styles["club-modal__creator"]}>
                                  <span
                                    className={`${styles["club-modal__creator-name"]} typography-desktop-body-small`}
                                    style={{
                                      color: isPending ? "#F59E0B" : "#10B981",
                                    }}
                                  >
                                    {t(membershipBadgeKey)}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className={styles["club-modal__item-actions"]}>
                        <button
                          type="button"
                          className={`${styles["club-modal__item-btn"]} ${styles["club-modal__item-btn--info"]}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleNavigate(club.id);
                          }}
                        >
                          <Info size={14} />
                          <span className="typography-desktop-button-small">
                            {t("common.moreInfo") || "More Info"}
                          </span>
                        </button>

                        <button
                          type="button"
                          className={`${styles["club-modal__item-btn"]} ${
                            isMember
                              ? styles["club-modal__item-btn--joined"]
                              : isPending
                              ? styles["club-modal__item-btn--following"]
                              : styles["club-modal__item-btn--follow"]
                          }`}
                          onClick={(event) => {
                            if (isMember) {
                              handleLeaveTrigger(club.id, club.name, event);
                            } else if (isPending) {
                              void handleCancel(club.id, event);
                            } else {
                              void handleJoin(club.id, event);
                            }
                          }}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <div className={styles["club-modal__btn-spinner"]} />
                          ) : isMember ? (
                            <>
                              <Check size={14} />
                              <span className="typography-desktop-button-small">
                                {t("clubs.status.joined") || "Joined"}
                              </span>
                            </>
                          ) : isPending ? (
                            <>
                              <X size={14} />
                              <span className="typography-desktop-button-small">
                                {t("clubs.actions.cancelRequest") || "Cancel"}
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
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {clubsQuery.hasNextPage ? (
                <button
                  type="button"
                  className={`${styles["club-modal__empty-btn"]} typography-desktop-button-small`}
                  onClick={() => void clubsQuery.fetchNextPage()}
                  disabled={clubsQuery.isFetchingNextPage}
                  style={{
                    width: "100%",
                    marginTop: "16px",
                    padding: "12px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  {clubsQuery.isFetchingNextPage
                    ? t("common.loading")
                    : t("clubs.actions.loadMore") || "Load more"}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </AppModal>

      <LoginRequiredPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        message="auth.loginRequired.joinClub"
      />

      <AppModal
        open={confirmationModal.isOpen}
        onClose={() => setConfirmationModal((prev) => ({ ...prev, isOpen: false }))}
        variant="dialog"
      >
        <div className={styles["club-modal__confirm"]}>
          <div className={styles["club-modal__confirm-header"]}>
            <h3 className="typography-desktop-title-large">
              {t("clubs.actions.leaveConfirmTitle")}
            </h3>
          </div>
          <div className={styles["club-modal__confirm-body"]}>
            <p className="typography-desktop-body-medium">
              {t("clubs.actions.leaveConfirmMessage", {
                name: confirmationModal.clubName,
              })}
            </p>
          </div>
          <div className={styles["club-modal__confirm-footer"]}>
            <button
              type="button"
              className={`${styles["club-modal__confirm-btn"]} ${styles["club-modal__confirm-btn--secondary"]} typography-desktop-button-medium`}
              onClick={() =>
                setConfirmationModal((prev) => ({ ...prev, isOpen: false }))
              }
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className={`${styles["club-modal__confirm-btn"]} ${styles["club-modal__confirm-btn--danger"]} typography-desktop-button-medium`}
              onClick={handleLeaveConfirm}
              disabled={mutations.leaveClub.isPending}
            >
              {mutations.leaveClub.isPending
                ? t("common.loading")
                : t("common.leave")}
            </button>
          </div>
        </div>
      </AppModal>
    </>
  );
};

export default JoinClubsModal;
