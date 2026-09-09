import React, { useState } from "react";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import { deleteAccount } from "../../../../../../shared/api/endpoints/user";
import { useAuth } from "../../../../../../shared/context/AuthContext";
import AppModal from "../../../../../../shared/components/AppModal";
import styles from "./desktop-DeleteAccountPopup.module.css";

interface DeleteAccountPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteAccountPopup: React.FC<DeleteAccountPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await deleteAccount();
      // Ensure the app fully signs out and clears user state
      await logout();
      onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete account:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["delete-popup__content"]}
      ariaLabel={t("profile.deleteAccount")}
    >
      <div>
        <div className={styles["delete-popup__header"]}>
          <h2
            className={`${styles["delete-popup__title"]} typography-desktop-body-small`}
          >
            {t("profile.deleteAccount")}
          </h2>
          <p
            className={`${styles["delete-popup__message"]} typography-desktop-body-small`}
          >
            {t("profile.deleteAccountConfirmation")}
          </p>
        </div>

        <div className={styles["delete-popup__actions"]}>
          <button
            className={`${styles["delete-popup__button"]} ${styles["delete-popup__button--cancel"]} typography-desktop-button-medium`}
            onClick={onClose}
            disabled={isLoading}
          >
            {t("common.cancel")}
          </button>
          <button
            className={`${styles["delete-popup__button"]} ${styles["delete-popup__button--confirm"]} typography-desktop-button-medium`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading && (
              <span className={styles["delete-popup__loading-spinner"]}></span>
            )}
            {t("profile.deleteAccount")}
          </button>
        </div>
      </div>
    </AppModal>
  );
};

export default DeleteAccountPopup;
