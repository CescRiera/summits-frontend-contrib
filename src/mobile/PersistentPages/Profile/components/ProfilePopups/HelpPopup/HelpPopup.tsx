import React, { useState } from "react";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import { useAuth } from "../../../../../../shared/context/AuthContext";
import { contactDeveloper } from "../../../../../../shared/api/endpoints/user";
import AppModal from "../../../../../../shared/components/AppModal";
import styles from "./HelpPopup.module.css";

interface HelpPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpPopup: React.FC<HelpPopupProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [email, setEmail] = useState(() => {
    if (user?.email && !user.email.endsWith("@summitstracker.com")) {
      return user.email;
    }
    return "";
  });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !email.trim()) return;

    setIsLoading(true);
    try {
      await contactDeveloper({
        email: email.trim(),
        subject: subject.trim(),
        text: message.trim(),
      });
      setEmail(() => {
        if (user?.email && !user.email.endsWith("@summitstracker.com")) {
          return user.email;
        }
        return "";
      });
      setSubject("");
      setMessage("");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEmail(() => {
      if (user?.email && !user.email.endsWith("@summitstracker.com")) {
        return user.email;
      }
      return "";
    });
    setSubject("");
    setMessage("");
    onClose();
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["help-popup__content"]}
      ariaLabel={t("profile.helpTutorials")}
    >
      <div className={styles["help-popup__header"]}>
        <div className={styles["help-popup__header-text"]}>
          <h2
            className={`${styles["help-popup__title"]} typography-title-medium`}
          >
            {t("profile.helpTutorials")}
          </h2>
          <p className={`${styles["help-popup__message"]} typography-body-medium`}>
            {t("profile.helpResponseMessage")}
          </p>
        </div>
      </div>

      <div className={styles["help-popup__contact-info"]}>
        <div className={styles["help-popup__contact-item"]}>
          <span className="typography-body-small">
            cesc.riera@summitstracker.com
          </span>
        </div>
        <div className={styles["help-popup__contact-item"]}>
          <span className="typography-body-small">+34 644748764</span>
        </div>
      </div>

      {showSuccess ? (
        <div className={styles["help-popup__success"]}>
          <div className={styles["help-popup__success-message"]}>
            {t("profile.messageSentSuccessfully")}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles["help-popup__form"]}>
          <div className={styles["help-popup__field"]}>
            <label
              className={`${styles["help-popup__label"]} typography-label-medium`}
            >
              {t("contact.emailAddress") || "Email"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles["help-popup__input"]}
              placeholder={t("contact.emailPlaceholder") || "Email"}
              required
            />
          </div>

          <div className={styles["help-popup__field"]}>
            <label
              className={`${styles["help-popup__label"]} typography-label-medium`}
            >
              {t("profile.subject")}
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={styles["help-popup__input"]}
              placeholder={t("profile.subjectPlaceholder")}
              required
            />
          </div>

          <div className={styles["help-popup__field"]}>
            <label
              className={`${styles["help-popup__label"]} typography-label-medium`}
            >
              {t("profile.message")}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={styles["help-popup__textarea"]}
              placeholder={t("profile.messagePlaceholder")}
              rows={4}
              required
            />
          </div>

          <div className={styles["help-popup__actions"]}>
            <button
              type="button"
              className={`${styles["help-popup__button"]} ${styles["help-popup__button--cancel"]} typography-button-medium`}
              onClick={handleCancel}
              disabled={isLoading}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className={`${styles["help-popup__button"]} ${styles["help-popup__button--submit"]} typography-button-medium`}
              disabled={isLoading || !subject.trim() || !message.trim() || !email.trim()}
            >
              {isLoading && (
                <span className={styles["help-popup__loading-spinner"]}></span>
              )}
              {t("profile.sendMessage")}
            </button>
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default HelpPopup;