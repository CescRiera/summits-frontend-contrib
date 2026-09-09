import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import AppModal from "../../../../shared/components/AppModal";
import {
  useClubMembers,
  useClubMutations,
  useClubPendingRequests,
} from "../../../../shared/hooks/clubs/useClubs";
import {
  flattenClubMembersPages,
  flattenClubPendingRequestsPages,
} from "../../../../shared/utils/clubResponse";
import { getClubApiErrorMessage } from "../../../../shared/utils/clubForm";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";
import styles from "./desktop-ManageClubsModal.module.css";
import type { ClubSummary } from "../../../../shared/api/types/clubs";

interface ManageClubsModalProps {
  isOpen: boolean;
  onClose: () => void;
  createdClubs: ClubSummary[];
}

const ManageClubsModal: React.FC<ManageClubsModalProps> = ({
  isOpen,
  onClose,
  createdClubs,
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const mutations = useClubMutations();
  const { trackEvent } = useAnalytics();

  const [actionError, setActionError] = useState<string | null>(null);
  const [managedClubId, setManagedClubId] = useState<number | null>(null);

  const managedClub = useMemo(
    () =>
      createdClubs.find((club) => club.id === managedClubId) ??
      createdClubs[0] ??
      null,
    [managedClubId, createdClubs]
  );

  // Sync state if initial changes
  React.useEffect(() => {
    if (isOpen && !managedClubId && createdClubs.length > 0) {
      setManagedClubId(createdClubs[0]?.id ?? null);
    }
  }, [isOpen, createdClubs, managedClubId]);

  const membersQuery = useClubMembers(
    {
      club_id: managedClub?.id ?? 0,
      sort_by: "most_peaks",
      limit: 20,
      offset: 0,
    },
    Boolean(isOpen && managedClub?.id)
  );

  const requestsQuery = useClubPendingRequests(
    {
      club_id: managedClub?.id ?? 0,
      limit: 20,
      offset: 0,
    },
    Boolean(isOpen && managedClub?.id)
  );

  const members = useMemo(
    () => flattenClubMembersPages(membersQuery.data?.pages),
    [membersQuery.data?.pages]
  );
  const pendingRequests = useMemo(
    () => flattenClubPendingRequestsPages(requestsQuery.data?.pages),
    [requestsQuery.data?.pages]
  );

  const handleActionError = (error: unknown) => {
    setActionError(
      getClubApiErrorMessage(
        error,
        t("clubs.messages.actionFailed") || "Could not update club membership."
      )
    );
  };

  const handleRemoveMember = async (clubId: number, userId: number) => {
    const confirmed = window.confirm(
      t("clubs.actions.removeMemberConfirm") || "Remove this member?"
    );
    if (!confirmed) return;
    try {
      trackEvent("interaction", "club_manage_remove_member");
      setActionError(null);
      await mutations.removeMember.mutateAsync({ clubId, userId });
      membersQuery.refetch();
    } catch (error) {
      handleActionError(error);
    }
  };

  const handleAcceptRequest = async (clubId: number, userId: number) => {
    try {
      trackEvent("interaction", "club_manage_accept_request");
      setActionError(null);
      await mutations.acceptJoinRequest.mutateAsync({ clubId, userId });
      requestsQuery.refetch();
      membersQuery.refetch();
    } catch (error) {
      handleActionError(error);
    }
  };

  const handleRejectRequest = async (clubId: number, userId: number) => {
    try {
      trackEvent("interaction", "club_manage_reject_request");
      setActionError(null);
      await mutations.rejectJoinRequest.mutateAsync({ clubId, userId });
      requestsQuery.refetch();
    } catch (error) {
      handleActionError(error);
    }
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["manage-clubs__manage-modal"]}
      ariaLabel={t("clubs.actions.manageClub") || "Manage club"}
    >
      <div className={styles["manage-clubs__manage-modal-header"]}>
        <h3 className={`${styles["manage-clubs__section-title"]} typography-desktop-title-medium`}>
          {t("clubs.actions.manageClub") || "Manage club"}
        </h3>
        <button
          type="button"
          className={styles["manage-clubs__modal-close"]}
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>

      <div className={styles["manage-clubs__manage-modal-body"]}>
        {actionError ? (
          <div className={`${styles["manage-clubs__error"]} typography-desktop-body-small`} style={{ marginBottom: 12 }}>
            {actionError}
          </div>
        ) : null}

        {createdClubs.length > 1 ? (
          <select
            className={`${styles["manage-clubs__select"]} typography-desktop-body-small`}
            value={managedClub?.id ?? ""}
            onChange={(event) => setManagedClubId(Number(event.target.value))}
          >
            {createdClubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        ) : null}

        {managedClub ? (
          <button
            type="button"
            className={`${styles["manage-clubs__button"]} typography-desktop-button-small`}
            onClick={() => {
              trackEvent("button_click", "club_manage_edit_club");
              onClose();
              navigate(`/clubs/${managedClub.id}/edit`);
            }}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {t("clubs.actions.editClub") || "Edit club details"}
          </button>
        ) : null}

        <div className={styles["manage-clubs__separator"]} />

        <div>
          <strong className="typography-desktop-title-small">
            {t("clubs.tabs.requests") || "Requests"}
          </strong>
          {pendingRequests.length === 0 ? (
            <p className={`${styles["manage-clubs__muted"]} typography-desktop-body-small`}>
              {t("clubs.requests.none") || "No pending requests"}
            </p>
          ) : (
            <div style={{ marginTop: 8 }}>
              {pendingRequests.map((request) => (
                <div key={request.user_id} className={styles["manage-clubs__list-item"]}>
                  {request.user_image ? (
                    <img
                      src={request.user_image}
                      alt={request.user_name}
                      className={styles["manage-clubs__avatar"]}
                    />
                  ) : (
                    <div className={`${styles["manage-clubs__avatar"]} typography-desktop-label-medium`}>
                      {request.user_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={styles["manage-clubs__list-body"]}>
                    <strong className="typography-desktop-body-small">{request.user_name}</strong>
                  </div>
                  <div className={styles["manage-clubs__list-actions"]}>
                    <button
                      type="button"
                      className={`${styles["manage-clubs__button"]} typography-desktop-button-small`}
                      onClick={() =>
                        managedClub &&
                        handleAcceptRequest(managedClub.id, request.user_id)
                      }
                    >
                      {t("clubs.actions.acceptRequest") || "Accept"}
                    </button>
                    <button
                      type="button"
                      className={`${styles["manage-clubs__button"]} ${styles["manage-clubs__button--secondary"]} typography-desktop-button-small`}
                      onClick={() =>
                        managedClub &&
                        handleRejectRequest(managedClub.id, request.user_id)
                      }
                    >
                      {t("clubs.actions.rejectRequest") || "Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles["manage-clubs__separator"]} />

        <div>
          <strong className="typography-desktop-title-small">
            {t("clubs.tabs.members") || "Members"}
          </strong>
          {members.length === 0 ? (
            <p className={`${styles["manage-clubs__muted"]} typography-desktop-body-small`}>
              {t("clubs.members.none") || "No members found"}
            </p>
          ) : (
            <div style={{ marginTop: 8 }}>
              {members
                .filter((member) => member.role !== "creator")
                .map((member) => (
                  <div key={member.user_id} className={styles["manage-clubs__list-item"]}>
                    {member.user_image ? (
                      <img
                        src={member.user_image}
                        alt={member.user_name}
                        className={styles["manage-clubs__avatar"]}
                      />
                    ) : (
                      <div className={`${styles["manage-clubs__avatar"]} typography-desktop-label-medium`}>
                        {member.user_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={styles["manage-clubs__list-body"]}>
                      <strong className="typography-desktop-body-small">{member.user_name}</strong>
                    </div>
                    <button
                      type="button"
                      className={`${styles["manage-clubs__button"]} ${styles["manage-clubs__button--danger"]} typography-desktop-button-small`}
                      onClick={() =>
                        managedClub &&
                        handleRemoveMember(managedClub.id, member.user_id)
                      }
                    >
                      {t("clubs.actions.removeMember") || "Remove"}
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </AppModal>
  );
};

export default ManageClubsModal;
