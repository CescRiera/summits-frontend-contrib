import React, { useState } from "react";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import { useAuth } from "../../../../../../shared/context/AuthContext";
import { contactDeveloper } from "../../../../../../shared/api/endpoints/user";
import AppModal from "../../../../../../shared/components/AppModal";
import styles from "./SuggestionsPopup.module.css";

interface SuggestionsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const SuggestionsPopup: React.FC<SuggestionsPopupProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [email, setEmail] = useState(() => {
    if (user?.email && !user.email.endsWith("@summitstracker.com")) {
      return user.email;
    }
    return "";
  });
  const [suggestion, setSuggestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestion.trim() || !email.trim()) return;

    setIsLoading(true);
    try {
      await contactDeveloper({
        email: email.trim(),
        subject: "SUGGESTIONS",
        text: suggestion.trim(),
      });
      setSuggestion("");
      setEmail(() => {
        if (user?.email && !user.email.endsWith("@summitstracker.com")) {
          return user.email;
        }
        return "";
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Failed to send suggestion:", error);
      // You might want to show an error message to the user here
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSuggestion("");
    setEmail(() => {
      if (user?.email && !user.email.endsWith("@summitstracker.com")) {
        return user.email;
      }
      return "";
    });
    onClose();
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["suggestions-popup__content"]}
      ariaLabel={t("profile.sendSuggestionsReportErrors")}
    >
        <div className={styles["suggestions-popup__header"]}>
          <div className={styles["suggestions-popup__header-text"]}>
            <h2
              className={`${styles["suggestions-popup__title"]} typography-title-medium`}
            >
              {t("profile.sendSuggestionsReportErrors")}
            </h2>
          </div>
        </div>

        {showSuccess ? (
          <div className={styles["suggestions-popup__success"]}>
            <div
              className={`${styles["suggestions-popup__success-message"]} typography-body-medium`}
            >
              {t("profile.suggestionSentSuccessfully")}
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={styles["suggestions-popup__form"]}
          >
            <div className={styles["suggestions-popup__field"]}>
              <label
                className={`${styles["suggestions-popup__label"]} typography-label-medium`}
              >
                {t("contact.emailAddress") || "Email"}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles["suggestions-popup__input"]}
                placeholder={t("contact.emailPlaceholder") || "Email"}
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid rgb(226, 232, 240)",
                  backgroundColor: "rgb(248, 250, 252)",
                  fontSize: "14px",
                  outline: "none",
                  marginBottom: "8px"
                }} 
              />
            </div>
            <div className={styles["suggestions-popup__field"]}>
              <label
                className={`${styles["suggestions-popup__label"]} typography-label-medium`}
              >
                {t("profile.yourSuggestion")}
              </label>
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                className={styles["suggestions-popup__textarea"]}
                placeholder={t("profile.suggestionPlaceholder")}
                rows={5}
                required
              />
            </div>

            <div className={styles["suggestions-popup__actions"]}>
              <button
                type="button"
                className={`${styles["suggestions-popup__button"]} ${styles["suggestions-popup__button--cancel"]} typography-button-medium`}
                onClick={handleCancel}
                disabled={isLoading}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                className={`${styles["suggestions-popup__button"]} ${styles["suggestions-popup__button--submit"]} typography-button-medium`}
                disabled={isLoading || !suggestion.trim() || !email.trim()}
              >
                {isLoading && (
                  <span
                    className={styles["suggestions-popup__loading-spinner"]}
                  ></span>
                )}
                {t("profile.sendSuggestion")}
              </button>
            </div>
          </form>
        )}
    </AppModal>
  );
};

export default SuggestionsPopup;
