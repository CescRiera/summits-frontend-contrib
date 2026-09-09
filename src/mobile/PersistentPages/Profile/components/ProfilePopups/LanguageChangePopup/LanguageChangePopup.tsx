import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { useAuth } from "../../../../../../shared/context/AuthContext";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import { APP_LANGUAGE_OPTIONS } from "../../../../../../shared/i18n/languages";
import { setLanguage } from "../../../../../../shared/api/endpoints/user";
import AppModal from "../../../../../../shared/components/AppModal";
import styles from "./LanguageChangePopup.module.css";

interface LanguageChangePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const LanguageChangePopup: React.FC<LanguageChangePopupProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { t, language, setLanguage: setI18nLanguage } = useI18n();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedLanguage(language);
    }
  }, [isOpen, language]);

  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  const handleConfirm = async () => {
    if (selectedLanguage === language) {
      onClose();
      return;
    }

    // If not logged in, just update locally
    if (!user) {
      setI18nLanguage(selectedLanguage);
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      // Call the API to update language (only for authenticated users)
      await setLanguage(selectedLanguage);

      // Update the language in the context
      setI18nLanguage(selectedLanguage);
      onClose();
    } catch (error) {
      console.error("Failed to update language:", error);
      // Fallback: update locally anyway if API fails but we want to allow it
      setI18nLanguage(selectedLanguage);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["language-popup__content"]}
      ariaLabel={t("profile.changeLanguage")}
    >

        <div className={styles["language-popup__header"]}>
          <div className={styles["language-popup__header-text"]}>
            <h2
              className={`${styles["language-popup__title"]} typography-title-medium`}
            >
              {t("profile.changeLanguage")}
            </h2>
            <p
              className={`${styles["language-popup__message"]} typography-body-medium`}
            >
              {t("profile.languageChangeMessage")}
            </p>
          </div>
        </div>

        <div className={styles["language-popup__list"]}>
          {APP_LANGUAGE_OPTIONS.map((language) => (
            <button
              key={language.code}
              className={`${styles["language-popup__item"]} ${
                selectedLanguage === language.code
                  ? styles["language-popup__item--selected"]
                  : ""
              }`}
              onClick={() => handleLanguageSelect(language.code)}
            >
              <div className={styles["language-popup__item-info"]}>
                <img
                  src={language.flag}
                  alt={`${language.nativeName} flag`}
                  className={styles["language-popup__item-flag"]}
                />
                <p
                  className={`${styles["language-popup__item-name"]} typography-title-medium`}
                >
                  {language.nativeName}
                </p>
              </div>
              <Check
                size={20}
                className={styles["language-popup__item-check"]}
              />
            </button>
          ))}
        </div>

        <div className={styles["language-popup__actions"]}>
          <button
            className={`${styles["language-popup__button"]} ${styles["language-popup__button--cancel"]} typography-button-medium`}
            onClick={onClose}
            disabled={isLoading}
          >
            {t("common.cancel")}
          </button>
          <button
            className={`${styles["language-popup__button"]} ${styles["language-popup__button--confirm"]} typography-button-medium`}
            onClick={handleConfirm}
            disabled={isLoading || selectedLanguage === language}
          >
            {isLoading && (
              <span
                className={styles["language-popup__loading-spinner"]}
              ></span>
            )}
            {t("common.save")}
          </button>
        </div>

    </AppModal>
  );
};

export default LanguageChangePopup;
