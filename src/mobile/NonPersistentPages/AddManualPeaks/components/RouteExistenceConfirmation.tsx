import React from "react";
import styles from "./RouteExistenceConfirmation.module.css";
import AppModal from "../../../../shared/components/AppModal";
import { X } from "lucide-react";

interface RouteExistenceConfirmationProps {
  isOpen: boolean;
  peakName: string;
  onHasRoute: () => void;
  onNoRoute: () => void;
  onAddWithDate?: () => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

/**
 * Simple confirmation dialog asking if peak belongs to an existing route
 * Shows modal with two action buttons: "Has Route" and "No Route"
 */

export const RouteExistenceConfirmation: React.FC<
  RouteExistenceConfirmationProps
> = ({ isOpen, peakName, onHasRoute, onNoRoute, onAddWithDate, onClose, t }) => {
  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["route-existence-confirmation__modal"]}
      ariaLabel={t("addManualPeaks.routeExistence.question")}
    >

        <div className={styles["route-existence-confirmation__content"]}>
          <div className={styles["route-existence-confirmation__header"]}>
            <h2
              className={`${styles["route-existence-confirmation__title"]} typography-title-medium`}
            >
              {t("addManualPeaks.routeExistence.question")}
            </h2>
            <button
              className={styles["route-existence-confirmation__close-btn"]}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <p
            className={`${styles["route-existence-confirmation__peak-name"]} typography-body-large`}
          >
            {peakName}
          </p>

          {/* Actions */}
          <div className={styles["route-existence-confirmation__actions"]}>
            <button
              className={`${styles["route-existence-confirmation__button"]} ${styles["route-existence-confirmation__button--secondary"]} typography-label-medium`}
              onClick={onNoRoute}
            >
              {t("addManualPeaks.routeExistence.noRoute")}
            </button>

            {onAddWithDate && (
              <button
                className={`${styles["route-existence-confirmation__button"]} ${styles["route-existence-confirmation__button--secondary"]} typography-label-medium`}
                onClick={onAddWithDate}
              >
                {t("addManualPeaks.routeExistence.addWithDate")}
              </button>
            )}
          </div>

          {onAddWithDate && (
            <div className={styles["route-existence-confirmation__actions"]}>
              <button
                className={`${styles["route-existence-confirmation__button"]} ${styles["route-existence-confirmation__button--primary"]} typography-label-medium`}
                onClick={onHasRoute}
              >
                {t("addManualPeaks.routeExistence.hasRoute")}
              </button>
            </div>
          )}

          {!onAddWithDate && (
            <div className={styles["route-existence-confirmation__actions"]}>
              <button
                className={`${styles["route-existence-confirmation__button"]} ${styles["route-existence-confirmation__button--primary"]} typography-label-medium`}
                onClick={onHasRoute}
              >
                {t("addManualPeaks.routeExistence.hasRoute")}
              </button>
            </div>
          )}
        </div>

    </AppModal>
  );
};
