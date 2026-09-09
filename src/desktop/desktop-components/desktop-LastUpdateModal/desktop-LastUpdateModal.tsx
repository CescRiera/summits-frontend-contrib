import React, { useEffect, useState } from "react";
import { Search, Plus, Heart, X } from "lucide-react";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import ShelterIcon from "../../../shared/components/ShelterIcon/ShelterIcon";
import AppModal from "../../../shared/components/AppModal";
import styles from "./desktop-LastUpdateModal.module.css";
import { useI18n } from "../../../shared/context/I18nContext";

const LANDING_COMPLETED_KEY = "cimloc_landing_completed";
const LAST_UPDATE_SEEN_KEY = "cimloc_last_update_seen_offline_wikiloc_release_2_5";

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
          <h2 className={`${styles["title"]} typography-desktop-title-medium`}>{t("lastUpdate.title")}</h2>
        </div>
      </div>

      <div className={styles["hero"]}>
        <ShelterIcon size={64} />
        <h3 className={`${styles["heroTitle"]} typography-desktop-title-medium`}>{t("lastUpdate.refugios.headline")}</h3>
        <p className={`${styles["heroSubtitle"]} typography-desktop-label-medium`}>{t("lastUpdate.refugios.subtitle")}</p>
      </div>

      <div className={styles["highlights"]}>
        <div className={styles["highlight"]}>
          <Search size={18} />
          <span>{t("lastUpdate.refugios.findOnMap")}</span>
        </div>
        <div className={styles["highlight"]}>
          <Plus size={18} />
          <span>{t("lastUpdate.refugios.addManually")}</span>
        </div>
        <div className={styles["highlight"]}>
          <Heart size={18} />
          <span>{t("lastUpdate.refugios.saveFavorites")}</span>
        </div>
      </div>

      <p className={`${styles["community"]} typography-desktop-label-medium`}>{t("lastUpdate.refugios.community")}</p>

      <div className={styles["footer"]}>
        <div className={`${styles["navbarHint"]} typography-desktop-label-small`}></div>

        <button className={`${styles["ctaButton"]} typography-desktop-button-small`} onClick={handleClose}>
          {t("lastUpdate.close")}
        </button>
      </div>
    </AppModal>
  );
};

export default DesktopLastUpdateModal;