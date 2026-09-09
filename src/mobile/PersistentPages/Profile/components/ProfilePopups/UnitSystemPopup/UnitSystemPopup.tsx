import React, { useState, useEffect } from "react";
import { Check, Ruler, Map } from "lucide-react";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import { useUnitSystem } from "../../../../../../shared/context/UnitSystemContext";
import type { UnitSystem } from "../../../../../../shared/utils/unitConversions";
import AppModal from "../../../../../../shared/components/AppModal";
import styles from "./UnitSystemPopup.module.css";

interface UnitSystemPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UnitOption {
  value: UnitSystem;
  labelKey: string;
  icon: React.ReactNode;
}

const unitOptions: UnitOption[] = [
  {
    value: "metric",
    labelKey: "profile.metricSystem",
    icon: <Ruler size={20} />,
  },
  {
    value: "imperial",
    labelKey: "profile.imperialSystem",
    icon: <Map size={20} />,
  },
];

const UnitSystemPopup: React.FC<UnitSystemPopupProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();
  const { unitSystem, setUnitSystem } = useUnitSystem();
  const [selected, setSelected] = useState<UnitSystem>(unitSystem);

  useEffect(() => {
    if (isOpen) {
      setSelected(unitSystem);
    }
  }, [isOpen, unitSystem]);

  const handleConfirm = () => {
    setUnitSystem(selected);
    onClose();
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["unit-system-popup__content"]}
      ariaLabel={t("profile.unitSystem")}
    >
      <div className={styles["unit-system-popup__header"]}>
        <div className={styles["unit-system-popup__header-text"]}>
          <h2
            className={`${styles["unit-system-popup__title"]} typography-title-medium`}
          >
            {t("profile.unitSystem")}
          </h2>
          <p
            className={`${styles["unit-system-popup__message"]} typography-body-medium`}
          >
            {t("profile.unitSystemMessage")}
          </p>
        </div>
      </div>

      <div className={styles["unit-system-popup__list"]}>
        {unitOptions.map((option) => (
          <button
            key={option.value}
            className={`${styles["unit-system-popup__item"]} ${
              selected === option.value
                ? styles["unit-system-popup__item--selected"]
                : ""
            }`}
            onClick={() => setSelected(option.value)}
          >
            <div className={styles["unit-system-popup__item-info"]}>
              <div className={styles["unit-system-popup__item-icon"]}>
                {option.icon}
              </div>
              <p
                className={`${styles["unit-system-popup__item-name"]} typography-title-medium`}
              >
                {t(option.labelKey)}
              </p>
            </div>
            <Check
              size={20}
              className={styles["unit-system-popup__item-check"]}
            />
          </button>
        ))}
      </div>

      <div className={styles["unit-system-popup__actions"]}>
        <button
          className={`${styles["unit-system-popup__button"]} ${styles["unit-system-popup__button--cancel"]} typography-button-medium`}
          onClick={onClose}
        >
          {t("common.cancel")}
        </button>
        <button
          className={`${styles["unit-system-popup__button"]} ${styles["unit-system-popup__button--confirm"]} typography-button-medium`}
          onClick={handleConfirm}
          disabled={selected === unitSystem}
        >
          {t("common.save")}
        </button>
      </div>
    </AppModal>
  );
};

export default UnitSystemPopup;
