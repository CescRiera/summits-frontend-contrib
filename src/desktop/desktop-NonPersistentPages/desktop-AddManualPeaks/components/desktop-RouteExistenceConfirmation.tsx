import React from "react";
import AppModal from "../../../../shared/components/AppModal";
import styles from "./desktop-RouteExistenceConfirmation.module.css";
import { X } from "lucide-react";

interface DesktopRouteExistenceConfirmationProps {
  peakName: string;
  onHasRoute: () => void;
  onNoRoute: () => void;
  onClose: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
}

/**
 * Desktop version of route existence confirmation dialog
 * Shows modal with two action buttons: "Has Route" and "No Route"
 */
export const DesktopRouteExistenceConfirmation: React.FC<
  DesktopRouteExistenceConfirmationProps
> = ({ peakName, onHasRoute, onNoRoute, onClose, t }) => {
  return (
    <AppModal
      open
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["desktop-route-existence-confirmation__modal"]}
      ariaLabel={t("addManualPeaks.routeExistence.question")}
    >
      <div>
        <div
          className={styles["desktop-route-existence-confirmation__content"]}
        >
          <div className={styles["desktop-route-existence-confirmation__header"]}>
            <h2
              className={`${styles["desktop-route-existence-confirmation__title"]} typography-desktop-title-large`}
            >
              {t("addManualPeaks.routeExistence.question")}
            </h2>
            <button
              className={styles["desktop-route-existence-confirmation__close-btn"]}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <p
            className={`${styles["desktop-route-existence-confirmation__peak-name"]} typography-desktop-body-small`}
          >
            {peakName}
          </p>

          <p
            className={`${styles["desktop-route-existence-confirmation__subtitle"]} typography-label-medium`}
          >
            {t("addManualPeaks.routeExistence.subtitle")}
          </p>

          <div
            className={styles["desktop-route-existence-confirmation__actions"]}
          >
            <button
              className={`${styles["desktop-route-existence-confirmation__button"]} ${styles["desktop-route-existence-confirmation__button--secondary"]} typography-button-medium`}
              onClick={onNoRoute}
            >
              {t("addManualPeaks.routeExistence.noRoute")}
            </button>

            <button
              className={`${styles["desktop-route-existence-confirmation__button"]} ${styles["desktop-route-existence-confirmation__button--primary"]} typography-button-medium`}
              onClick={onHasRoute}
            >
              {t("addManualPeaks.routeExistence.hasRoute")}
            </button>
          </div>
        </div>
      </div>
    </AppModal>
  );
};
