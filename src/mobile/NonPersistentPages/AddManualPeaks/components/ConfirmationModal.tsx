import React from "react";
import styles from "./RouteExistenceConfirmation.module.css"; // Reuse styling for consistency
import AppModal from "../../../../shared/components/AppModal";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
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
      contentClassName={styles["route-existence-confirmation__modal"]}
      ariaLabel={title}
    >
      <div className={styles["route-existence-confirmation__content"]}>
        <h2 className="typography-title-large">{title}</h2>
        <p className="typography-body-medium">{message}</p>
        <div className={styles["route-existence-confirmation__actions"]}>
          <button
            className={`${styles["route-existence-confirmation__button"]} ${styles["route-existence-confirmation__button--secondary"]} typography-label-medium`}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`${styles["route-existence-confirmation__button"]} ${
              isDanger
                ? styles["route-existence-confirmation__button--danger"]
                : styles["route-existence-confirmation__button--primary"]
            } typography-label-medium`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </AppModal>
  );
};
