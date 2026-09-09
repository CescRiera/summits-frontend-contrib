import React from "react";
import styles from "../../desktop-NonPersistentPages/desktop-AddManualPeaks/components/desktop-RouteExistenceConfirmation.module.css";
import AppModal from "../../../shared/components/AppModal";

interface DesktopConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export const DesktopConfirmationModal: React.FC<DesktopConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isDanger = false,
}) => {
  return (
    <AppModal
      open={isOpen}
      onClose={onCancel}
      variant="dialog"
      contentClassName={styles["desktop-route-existence-confirmation__modal"]}
      ariaLabel={title}
    >
      <div className={styles["desktop-route-existence-confirmation__content"]}>
        <h2
          className={`${styles["desktop-route-existence-confirmation__title"]} typography-desktop-title-large`}
          style={{ marginBottom: "12px" }}
        >
          {title}
        </h2>
        <p
          className={`${styles["desktop-route-existence-confirmation__subtitle"]} typography-desktop-body-small`}
          style={{ marginBottom: "24px", color: "rgb(71, 85, 105)" }}
        >
          {message}
        </p>
        <div className={styles["desktop-route-existence-confirmation__actions"]}>
          <button
            className={`${styles["desktop-route-existence-confirmation__button"]} ${styles["desktop-route-existence-confirmation__button--secondary"]} typography-desktop-label-medium`}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`${styles["desktop-route-existence-confirmation__button"]} ${
              isDanger
                ? styles["desktop-route-existence-confirmation__button--danger"]
                : styles["desktop-route-existence-confirmation__button--primary"]
            } typography-desktop-label-medium`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </AppModal>
  );
};
