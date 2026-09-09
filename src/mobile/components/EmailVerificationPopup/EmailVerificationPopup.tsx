import { useI18n } from "../../../shared/context/I18nContext";
import { X, Mail } from "lucide-react";
import AppModal from "../../../shared/components/AppModal";
import styles from "./EmailVerificationPopup.module.css";

interface EmailVerificationPopupProps {
  onClose: () => void;
  onOpenGmail: () => void;
}

export function EmailVerificationPopup({
  onClose,
  onOpenGmail,
}: EmailVerificationPopupProps) {
  const { t } = useI18n();

  return (
    <AppModal
      open={true}
      onClose={onClose}
      variant="dialog"
      ariaLabel={t("auth.emailVerification.title")}
      contentClassName={styles["email-verification-popup"]}
    >
        <button
          className={styles["email-verification-popup__close"]}
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X size={20} />
        </button>
        <div className={styles["email-verification-popup__content"]}>
          <div className={styles["email-verification-popup__icon"]}>
            <Mail size={48} />
          </div>
          <h3
            className={`${styles["email-verification-popup__title"]} typography-title-medium`}
          >
            {t("auth.emailVerification.title")}
          </h3>
          <p
            className={`${styles["email-verification-popup__message"]} typography-body-medium`}
          >
            {t("auth.emailVerification.message")}
          </p>
          <button
            className={`${styles["email-verification-popup__button"]} typography-button-medium`}
            onClick={onOpenGmail}
          >
            {t("auth.emailVerification.openGmail")}
          </button>
        </div>
    </AppModal>
  );
}
