import React from "react";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import styles from "./LeaveChallengePopup.module.css";

interface LeaveChallengePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  challengeName: string;
  isLeaving?: boolean;
}

const LeaveChallengePopup: React.FC<LeaveChallengePopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  challengeName,
  isLeaving = false,
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLeaving) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <div className={styles["leave-challenge-popup"]} onClick={handleOverlayClick}>
      <div className={styles["leave-challenge-popup__content"]}>
        <div className={styles["leave-challenge-popup__header"]}>
          <h2
            className={`${styles["leave-challenge-popup__title"]} typography-title-medium`}
          >
            {t("profile.challenges.leaveConfirmTitle") || "Leave Challenge"}
          </h2>
          <p
            className={`${styles["leave-challenge-popup__message"]} typography-body-medium`}
          >
            {t("profile.challenges.leaveConfirmMessage", { name: challengeName }) || 
              `Do you want to leave the challenge '${challengeName}'? Your progress won't be lost and you can rejoin any time you want.`}
          </p>
        </div>

        <div className={styles["leave-challenge-popup__actions"]}>
          <button
            className={`${styles["leave-challenge-popup__button"]} ${styles["leave-challenge-popup__button--cancel"]} typography-button-medium`}
            onClick={onClose}
            disabled={isLeaving}
          >
            {t("common.cancel") || "Cancel"}
          </button>
          <button
            className={`${styles["leave-challenge-popup__button"]} ${styles["leave-challenge-popup__button--confirm"]} typography-button-medium`}
            onClick={handleConfirm}
            disabled={isLeaving}
          >
            {isLeaving ? (
              <div className={styles["leave-challenge-popup__spinner"]} />
            ) : (
              t("profile.challenges.leaveConfirmTitle") || "Leave Challenge"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveChallengePopup;
