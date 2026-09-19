import React, { useEffect, useState } from "react";
import { Heart, Settings, WifiOff, X } from "lucide-react";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import AppModal from "../../../shared/components/AppModal";
import styles from "./desktop-LastUpdateModal.module.css";
import { useI18n } from "../../../shared/context/I18nContext";

const LANDING_COMPLETED_KEY = "cimloc_landing_completed";
const LAST_UPDATE_SEEN_KEY = "cimloc_last_update_seen_release_2_6";

const DesktopLastUpdateModal: React.FC = () => {
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
      contentClassName={styles["modal"]}
    >
      <button className={styles["closeButton"]} onClick={handleClose} aria-label={t("lastUpdate.close")}>
        <X size={24} />
      </button>

      <div className={styles["header"]}>
        <div className={styles["brandIcon"]}>
          <MountainIcon size={48} />
        </div>
        <div className={styles["headerText"]}>
          <h2 className={`${styles["title"]} typography-desktop-title-large`}>{t("lastUpdate.title")}</h2>
        </div>
      </div>

      <div className={styles["highlights"]}>
        <div className={styles["highlight"]}>
          <WifiOff size={18} />
          <span className={`${styles["highlightText"]} typography-desktop-body-medium`}>{t("lastUpdate.offline")}</span>
        </div>
        <div className={styles["highlight"]}>
          <Settings size={18} />
          <span className={`${styles["highlightText"]} typography-desktop-body-medium`}>{t("lastUpdate.map")}</span>
        </div>
        <div className={styles["highlight"]}>
          <Heart size={18} />
          <span className={`${styles["highlightText"]} typography-desktop-body-medium`}>{t("lastUpdate.contribute")}</span>
        </div>
      </div>

      <div className={styles["footer"]}>
        <button className={`${styles["ctaButton"]} typography-desktop-button-medium`} onClick={handleClose}>
          {t("lastUpdate.close")}
        </button>
      </div>
    </AppModal>
  );
};

export default DesktopLastUpdateModal;