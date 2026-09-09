import React from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "./LoginForm";
import styles from "./LoginRegister.module.css";
import { useI18n } from "../../../shared/context/I18nContext";

const LoginRegister: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className={styles["login-register__container"]}>
      <LoginForm />
      <div className={styles["login-register__switch"]}>
        <span className="typography-body-small">{t("auth.noAccountQuestion")}</span>
        <button
          className={`${styles["login-register__link"]} typography-button-large`}
          onClick={() => navigate("/register")}
        >
          {t("auth.signUp")}
        </button>
      </div>
    </div>
  );
};

export default LoginRegister;
