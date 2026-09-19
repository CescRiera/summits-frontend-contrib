import React, { useId, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import { useAuth } from "../../../../../../shared/context/AuthContext";
import { useAnalytics } from "../../../../../../shared/context/AnalyticsContext";
import { contactDeveloper } from "../../../../../../shared/api/endpoints/user";
import {
  sanitizeDonationAmountInput,
  toDonationAmountCents,
} from "../../../../../../shared/utils/donationAmount";
import AppModal from "../../../../../../shared/components/AppModal";
import styles from "./ContributePopup.module.css";

interface ContributePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const DONATE_URL = "https://buy.stripe.com/eVqdR9g9HbpO1Tw32z9IQ01";

const ContributePopup: React.FC<ContributePopupProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const inputId = useId();
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState(() => {
    if (user?.email && !user.email.endsWith("@summitstracker.com")) {
      return user.email;
    }
    return "";
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const needsEmailInput = !email;

  const donateLink = useMemo(() => {
    const cents = toDonationAmountCents(amount);
    return cents ? `${DONATE_URL}?__prefilled_amount=${cents}` : DONATE_URL;
  }, [amount]);

  const handleDonate = () => {
    const amountVal = amount.replace(/[^\d]/g, "");
    trackEvent("button_click", `contribute_popup_donate_${amountVal}`);
    window.open(donateLink, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;

    setIsLoading(true);
    try {
      await contactDeveloper({
        email: email.trim(),
        subject: t("profile.contribute"),
        text: message.trim(),
      });
      trackEvent("contact", "contribute_popup_submit_success");
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

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="fullscreen"
      contentClassName={styles["contribute-popup__content"]}
      ariaLabel={t("profile.contribute")}
    >
      <div className={styles["contribute-popup__header"]}>
        <h2
          className={`${styles["contribute-popup__title"]} typography-title-large`}
        >
          {t("profile.contribute")}
        </h2>
        <button
          type="button"
          className={styles["contribute-popup__close"]}
          onClick={onClose}
          aria-label={t("common.close") || "Close"}
        >
          <X size={20} />
        </button>
      </div>

      <div className={styles["contribute-popup__body"]}>
        <p className={`${styles["contribute-popup__intro"]} typography-body-small`}>
          {t("profile.contributeIntro")}
        </p>

        <ul className={styles["contribute-popup__options"]}>
          <li className={styles["contribute-popup__option"]}>
            <div className={styles["contribute-popup__option-body"]}>
              <span
                className={`${styles["contribute-popup__option-title"]} typography-label-medium`}
              >
                {t("profile.contributeCollaboratorsTitle")}
              </span>
              <p className={`${styles["contribute-popup__option-text"]} typography-body-small`}>
                {t("profile.contributeCollaboratorsText")}
              </p>
            </div>
          </li>
          <li className={styles["contribute-popup__option"]}>
            <div className={styles["contribute-popup__option-body"]}>
              <span
                className={`${styles["contribute-popup__option-title"]} typography-label-medium`}
              >
                {t("profile.contributeContentTitle")}
              </span>
              <p className={`${styles["contribute-popup__option-text"]} typography-body-small`}>
                {t("profile.contributeContentText")}
              </p>
            </div>
          </li>
        </ul>

        <div className={styles["contribute-popup__donate-card"]}>
          <div className={styles["contribute-popup__donate-text"]}>
            <span
              className={`${styles["contribute-popup__donate-title"]} typography-label-medium`}
            >
              {t("profile.contributeDonateTitle")}
            </span>
            <p className={`${styles["contribute-popup__donate-description"]} typography-body-small`}>
              {t("profile.contributeDonateText")}
            </p>
          </div>
          <div className={styles["contribute-popup__donate-row"]}>
            <div className={styles["contribute-popup__donate-field"]}>
              <input
                id={inputId}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(sanitizeDonationAmountInput(event.target.value));
                }}
                className={`${styles["contribute-popup__donate-input"]} typography-body-medium`}
                placeholder="0,00"
                aria-label={t("profile.donateAmount")}
              />
              <span className={styles["contribute-popup__donate-currency"]}>
                {"\u20ac"}
              </span>
            </div>
            <button
              type="button"
              className={`${styles["contribute-popup__donate-button"]} typography-button-medium`}
              onClick={handleDonate}
            >
              {t("profile.donateButton")}
            </button>
          </div>
        </div>

        {showSuccess ? (
          <div className={styles["contribute-popup__success"]}>
            <div className={styles["contribute-popup__success-message"]}>
              {t("profile.messageSentSuccessfully")}
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={styles["contribute-popup__contact"]}
          >
            {needsEmailInput && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles["contribute-popup__contact-email"]}
                placeholder={t("contact.emailPlaceholder") || "Email"}
                required
              />
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={styles["contribute-popup__contact-textarea"]}
              placeholder={t("profile.contributeContactPlaceholder")}
              rows={2}
              required
            />
            <button
              type="submit"
              className={`${styles["contribute-popup__contact-button"]} typography-button-medium`}
              disabled={isLoading || !message.trim() || !email.trim()}
            >
              {isLoading && (
                <span className={styles["contribute-popup__loading-spinner"]}></span>
              )}
              {t("profile.sendMessage")}
            </button>
          </form>
        )}
      </div>
    </AppModal>
  );
};

export default ContributePopup;