import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, WifiOff, Settings } from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import ShelterIcon from "../../../../shared/components/ShelterIcon/ShelterIcon";
import styles from "./MapConfigControl.module.css";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";

interface MapConfigControlProps {
  visible: boolean;
  peaksVisible: boolean;
  sheltersVisible: boolean;
  onTogglePeaks: () => void;
  onToggleShelters: () => void;
  onOpenOffline: () => void;
  onOpenCreate: () => void;
}

const MapConfigControl: React.FC<MapConfigControlProps> = ({
  visible,
  peaksVisible,
  sheltersVisible,
  onTogglePeaks,
  onToggleShelters,
  onOpenOffline,
  onOpenCreate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (!visible && isOpen) {
      setIsOpen(false);
    }
  }, [visible, isOpen]);

  if (!visible) return null;

  return (
    <div className={styles["config"]}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="map-config-menu"
            className={styles["config__menu"]}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.button
              type="button"
              className={`${styles["config__menu-btn"]} ${
                peaksVisible ? "" : styles["config__menu-btn--off"]
              }`}
              onClick={onTogglePeaks}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.2 }}
              aria-label={
                peaksVisible ? t("map.controls.hidePeaks") : t("map.controls.showPeaks")
              }
              aria-pressed={peaksVisible}
            >
              <MountainIcon
                size={20}
                color={peaksVisible ? "#1f2937" : "#9ca3af"}
              />
            </motion.button>
            <motion.button
              type="button"
              className={`${styles["config__menu-btn"]} ${
                sheltersVisible ? "" : styles["config__menu-btn--off"]
              }`}
              onClick={onToggleShelters}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.2 }}
              aria-label={
                sheltersVisible ? t("map.controls.hideShelters") : t("map.controls.showShelters")
              }
              aria-pressed={sheltersVisible}
            >
              <ShelterIcon
                size={20}
                color={sheltersVisible ? "#1f2937" : "#9ca3af"}
              />
            </motion.button>
            <motion.button
              type="button"
              className={`${styles["config__menu-btn"]} ${styles["config__menu-btn--create"]}`}
              onClick={onOpenCreate}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.2 }}
              aria-label={t("peakChange.mapButtonLabel")}
            >
              <Plus size={20} color="#5f7440" />
            </motion.button>
            <motion.button
              type="button"
              className={`${styles["config__menu-btn"]} ${styles["config__menu-btn--offline"]}`}
              onClick={onOpenOffline}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24, duration: 0.2 }}
              aria-label={t("offline.title")}
            >
              <WifiOff size={20} color="#1f2937" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className={`${styles["config__toggle"]} ${
          isOpen ? styles["config__toggle--active"] : ""
        }`}
        onClick={() => {
          trackEvent("button_click", "map_config_open");
          setIsOpen((o) => !o);
        }}
        aria-expanded={isOpen}
        aria-label={t("map.controls.config")}
      >
        <Settings size={20} color="#1f2937" />
      </button>
    </div>
  );
};

export default MapConfigControl;