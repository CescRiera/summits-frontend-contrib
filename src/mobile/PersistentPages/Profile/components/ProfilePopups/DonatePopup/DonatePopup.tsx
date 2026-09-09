import React, { useEffect, useId, useMemo, useState } from "react";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import { useAnalytics } from "../../../../../../shared/context/AnalyticsContext";
import {
  sanitizeDonationAmountInput,
  toDonationAmountCents,
} from "../../../../../../shared/utils/donationAmount";
import AppModal from "../../../../../../shared/components/AppModal";
import styles from "./DonatePopup.module.css";

interface DonatePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const DONATE_URL = "https://buy.stripe.com/eVqdR9g9HbpO1Tw32z9IQ01";

const DonatePopup: React.FC<DonatePopupProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const inputId = useId();
  const [amount, setAmount] = useState("");
  const donateLink = useMemo(() => {
    const cents = toDonationAmountCents(amount);
    return cents ? `${DONATE_URL}?__prefilled_amount=${cents}` : DONATE_URL;
  }, [amount]);

  useEffect(() => {
    if (!isOpen) return;
    setAmount("");
    trackEvent("popup_view", "donate_popup");
  }, [isOpen, trackEvent]);

  const handleClose = () => {
    trackEvent("button_click", "donate_popup_close");
    onClose();
  };

  const handleDonate = () => {
    const amountVal = amount.replace(/[^\d]/g, "");
    trackEvent("button_click", `donate_popup_submit_${amountVal}`);
    window.open(donateLink, "_blank", "noopener,noreferrer");
  };

  return (
    <AppModal
      open={isOpen}
      onClose={() => {
        trackEvent("button_click", "donate_popup_overlay_close");
        onClose();
      }}
      variant="dialog"
      contentClassName={styles["donate-popup__content"]}
      ariaLabel={t("profile.donateTitle")}
    >
        <div className={styles["donate-popup__header"]}>
          <h2
            className={`${styles["donate-popup__title"]} typography-title-medium`}
          >
            {t("profile.donateTitle")}
          </h2>
          <p
            className={`${styles["donate-popup__message"]} typography-body-medium`}
          >
            {t("profile.donateMessage")}
          </p>
        </div>

        <div className={styles["donate-popup__stripe-card"]}>
          <label
            htmlFor={inputId}
            className={`${styles["donate-popup__label"]} typography-title-small`}
          >
            {t("profile.donateAmount")}
          </label>
          <div className={styles["donate-popup__input-row"]}>
            <input
              id={inputId}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(sanitizeDonationAmountInput(event.target.value));
              }}
              className={`${styles["donate-popup__input"]} typography-body-large`}
              placeholder="0,00"
            />
            <span className={`${styles["donate-popup__currency"]} typography-headline-small`}>
              {"\u20ac"}
            </span>
          </div>
        </div>

        <div className={styles["donate-popup__actions"]}>
          <button
            className={`${styles["donate-popup__button"]} ${styles["donate-popup__button--secondary"]} typography-button-medium`}
            onClick={handleClose}
          >
            {t("common.close")}
          </button>
          <button
            className={`${styles["donate-popup__button"]} typography-button-medium`}
            onClick={handleDonate}
          >
            {t("profile.donateButton")}
          </button>
        </div>
    </AppModal>
  );
};

export default DonatePopup;
