import React, { useEffect, useState } from "react";
import { Heart, Settings, WifiOff, X } from "lucide-react";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import AppModal from "../../../shared/components/AppModal";
import styles from "./LastUpdateModal.module.css";
import { useI18n } from "../../../shared/context/I18nContext";

const LANDING_COMPLETED_KEY = "cimloc_landing_completed";
const LAST_UPDATE_SEEN_KEY = "cimloc_last_update_seen_release_2_6";

const LastUpdateModal: React.FC = () => {
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const landingCompleted = localStorage.getItem(LANDING_COMPLETED_KEY);
    const lastUpdateSeen = localStorage.getItem(LAST_UPDATE_SEEN_KEY);

    if (landingCompleted === "true" && !lastUpdateSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(LAST_UPDATE_SEEN_KEY, "true");
    setIsVisible(false);
  };

  return (
    <AppModal
      open={isVisible}
      onClose={handleClose}
      variant="dialog"
      ariaLabel={t("lastUpdate.title")}
      contentClassName={styles["last-update-modal__container"]}
    >
      <button
        className={styles["last-update-modal__close-button"]}
        onClick={handleClose}
        aria-label={t("lastUpdate.close")}
      >
        <X size={20} />
      </button>

      <div className={styles["last-update-modal__header"]}>
        <div className={styles["last-update-modal__brand-icon"]}>
          <MountainIcon size={40} />
        </div>
        <h2 className={`${styles["last-update-modal__title"]} typography-title-large`}>
          {t("lastUpdate.title")}
        </h2>
      </div>

      <div className={styles["last-update-modal__highlights"]}>
        <div className={styles["last-update-modal__highlight"]}>
          <WifiOff size={16} />
          <span className={`${styles["last-update-modal__highlight-text"]} typography-body-medium`}>
            {t("lastUpdate.offline")}
          </span>
        </div>
        <div className={styles["last-update-modal__highlight"]}>
          <Settings size={16} />
          <span className={`${styles["last-update-modal__highlight-text"]} typography-body-medium`}>
            {t("lastUpdate.map")}
          </span>
        </div>
        <div className={styles["last-update-modal__highlight"]}>
          <Heart size={16} />
          <span className={`${styles["last-update-modal__highlight-text"]} typography-body-medium`}>
            {t("lastUpdate.contribute")}
          </span>
        </div>
      </div>

      <button className={`${styles["last-update-modal__cta-button"]} typography-button-medium`} onClick={handleClose}>
        {t("lastUpdate.close")}
      </button>
    </AppModal>
  );
};

export default LastUpdateModal;