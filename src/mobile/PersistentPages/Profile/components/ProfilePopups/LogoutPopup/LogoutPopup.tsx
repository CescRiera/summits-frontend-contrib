import React from "react";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import AppModal from "../../../../../../shared/components/AppModal";
import styles from "./LogoutPopup.module.css";

interface LogoutPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutPopup: React.FC<LogoutPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["logout-popup__content"]}
      ariaLabel={t("profile.logout")}
    >
        <div className={styles["logout-popup__header"]}>
          <h2
            className={`${styles["logout-popup__title"]} typography-title-medium`}
          >
            {t("profile.logout")}
          </h2>
          <p
            className={`${styles["logout-popup__message"]} typography-body-medium`}
          >
            {t("profile.logoutConfirmation")}
          </p>
        </div>

        <div className={styles["logout-popup__actions"]}>
          <button
            className={`${styles["logout-popup__button"]} ${styles["logout-popup__button--cancel"]} typography-button-medium`}
            onClick={onClose}
          >
            {t("common.cancel")}
          </button>
          <button
            className={`${styles["logout-popup__button"]} ${styles["logout-popup__button--confirm"]} typography-button-medium`}
            onClick={handleConfirm}
          >
            {t("profile.logout")}
          </button>
        </div>
    </AppModal>
  );
};

export default LogoutPopup;
