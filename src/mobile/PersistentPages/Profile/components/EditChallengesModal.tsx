import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Pencil } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import type { UserStatsResponse } from "../../../../shared/api/types";
import AppModal from "../../../../shared/components/AppModal";
import styles from "./EditChallengesModal.module.css";

type CreatedChallenge = UserStatsResponse["peaks_per_list"][number];

interface EditChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenges: CreatedChallenge[];
}

const EditChallengesModal: React.FC<EditChallengesModalProps> = ({
  isOpen,
  onClose,
  challenges,
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleEdit = (listId: number) => {
    navigate(`/editlist/${listId}`);
    onClose();
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="sheet"
      contentClassName={styles["edit-challenges-modal__content"]}
      ariaLabel={t("profile.challenges.editMyChallenges") || "Edit my challenges"}
    >
        <div className={styles["edit-challenges-modal__header"]}>
          <h2 className="typography-title-large">
            {t("profile.challenges.editMyChallenges") || "Edit my challenges"}
          </h2>
          <button
            className={styles["edit-challenges-modal__close"]}
            onClick={onClose}
            aria-label={t("common.close") || "Close"}
          >
            <X size={24} />
          </button>
        </div>

        <div className={styles["edit-challenges-modal__body"]}>
          {challenges.length === 0 ? (
            <div className={styles["edit-challenges-modal__empty"]}>
              <p className="typography-body-small">
                {t("profile.challenges.noCreatedChallenges") ||
                  "You haven't created any challenges yet."}
              </p>
            </div>
          ) : (
            <div className={styles["edit-challenges-modal__list"]}>
              {challenges.map((challenge) => (
                <button
                  key={challenge.list_id}
                  className={styles["edit-challenges-modal__item"]}
                  onClick={() => handleEdit(challenge.list_id)}
                  aria-label={`Edit ${challenge.list_name}`}
                >
                  <div
                    className={styles["edit-challenges-modal__item-image"]}
                    style={{
                      backgroundImage: challenge.primary_image
                        ? `url(${challenge.primary_image})`
                        : undefined,
                    }}
                  />
                  <div className={styles["edit-challenges-modal__item-text"]}>
                    <div
                      className={`${styles["edit-challenges-modal__item-title"]} typography-title-small`}
                    >
                      {challenge.list_name}
                    </div>
                    <div
                      className={`${styles["edit-challenges-modal__item-subtitle"]} typography-body-small`}
                    >
                      {t("userStats.peakLists.completedDescription", {
                        completed: challenge.user_completed,
                        total: challenge.total_peaks,
                      })}
                    </div>
                  </div>
                  <div className={styles["edit-challenges-modal__item-action"]}>
                    <Pencil size={16} />
                    <span className="typography-button-small">
                      {t("common.edit") || "Edit"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
    </AppModal>
  );
};

export default EditChallengesModal;
