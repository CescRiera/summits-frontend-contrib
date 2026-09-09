import React from "react";
import { X, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import AppModal from "../../../shared/components/AppModal";
import styles from "./LoginRequiredPopup.module.css";

interface LoginRequiredPopupProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

const LoginRequiredPopup: React.FC<LoginRequiredPopupProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleLogin = () => {
    onClose();
    navigate("/profile");
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      ariaLabel={t("auth.loginRequired.title")}
      contentClassName={styles["popup"]}
    >
      <button
        className={styles["closeButton"]}
        onClick={onClose}
        aria-label="Close popup"
      >
        <X size={20} />
      </button>

      <div className={styles["content"]}>
        <h2 className={`${styles["title"]} typography-title-medium`}>
          {t("auth.loginRequired.title")}
        </h2>

        <p className={`${styles["message"]} typography-body-medium`}>
          {t(message)}
        </p>

        <div className={styles["buttonContainer"]}>
          <button
            className={`${styles["cancelButton"]} typography-button-medium`}
            onClick={onClose}
          >
            {t("auth.loginRequired.cancel")}
          </button>

          <button
            className={`${styles["loginButton"]} typography-button-medium`}
            onClick={handleLogin}
          >
            <LogIn size={16} />
            {t("auth.loginRequired.login")}
          </button>
        </div>
      </div>
    </AppModal>
  );
};

export default LoginRequiredPopup;
