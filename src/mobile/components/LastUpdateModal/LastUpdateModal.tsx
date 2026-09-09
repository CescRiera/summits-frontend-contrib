import React, { useEffect, useState } from "react";
import { Search, Plus, Heart, X } from "lucide-react";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import ShelterIcon from "../../../shared/components/ShelterIcon/ShelterIcon";
import AppModal from "../../../shared/components/AppModal";
import styles from "./LastUpdateModal.module.css";
import { useI18n } from "../../../shared/context/I18nContext";

const LANDING_COMPLETED_KEY = "cimloc_landing_completed";
const LAST_UPDATE_SEEN_KEY = "cimloc_last_update_seen_offline_wikiloc_release_2_5";

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
        <h2 className={`${styles["last-update-modal__title"]} typography-headline-small`}>
          {t("lastUpdate.title")}
        </h2>
      </div>

      <div className={styles["last-update-modal__hero"]}>
        <ShelterIcon size={40} />
        <div className={styles["last-update-modal__hero-content"]}>
          <h3 className={`${styles["last-update-modal__hero-title"]} typography-title-medium`}>
            {t("lastUpdate.refugios.headline")}
          </h3>
          <p className={`${styles["last-update-modal__hero-subtitle"]} typography-label-medium`}>
            {t("lastUpdate.refugios.subtitle")}
          </p>
        </div>
      </div>

      <div className={styles["last-update-modal__highlights"]}>
        <div className={styles["last-update-modal__highlight"]}>
          <span className={styles["last-update-modal__highlight-icon"]}>
            <Search size={16} />
          </span>
          <span className={`${styles["last-update-modal__highlight-text"]} typography-label-medium`}>
            {t("lastUpdate.refugios.findOnMap")}
          </span>
        </div>
        <div className={styles["last-update-modal__highlight"]}>
          <span className={styles["last-update-modal__highlight-icon"]}>
            <Plus size={16} />
          </span>
          <span className={`${styles["last-update-modal__highlight-text"]} typography-label-medium`}>
            {t("lastUpdate.refugios.addManually")}
          </span>
        </div>
        <div className={styles["last-update-modal__highlight"]}>
          <span className={styles["last-update-modal__highlight-icon"]}>
            <Heart size={16} />
          </span>
          <span className={`${styles["last-update-modal__highlight-text"]} typography-label-medium`}>
            {t("lastUpdate.refugios.saveFavorites")}
          </span>
        </div>
      </div>

      <p className={`${styles["last-update-modal__community"]} typography-label-medium`}>
        {t("lastUpdate.refugios.community")}
      </p>

      <button className={`${styles["last-update-modal__cta-button"]} typography-button-small`} onClick={handleClose}>
        {t("lastUpdate.close")}
      </button>
    </AppModal>
  );
};

export default LastUpdateModal;