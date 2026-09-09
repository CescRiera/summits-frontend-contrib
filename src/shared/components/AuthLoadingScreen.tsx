import React from "react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import styles from "./AuthLoadingScreen.module.css";

interface AuthLoadingScreenProps {
  children: React.ReactNode;
}

const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({ children }) => {
  const { authReady } = useAuth();
  const { t } = useI18n();

  if (!authReady) {
    return (
      <div className={styles["auth-loading-screen"]}>
        <img
          src="/icons/controls/loading.svg"
          alt="Loading"
          className={styles["auth-loading-screen__icon"]}
        />
        <p className={`${styles["auth-loading-screen__label"]} typography-body-small`}>
          {t("common.loading").replace(/\.+$/, "")}
          <span className={styles["auth-loading-screen__dot"]}>.</span>
          <span className={`${styles["auth-loading-screen__dot"]} ${styles["auth-loading-screen__dot--2"]}`}>.</span>
          <span className={`${styles["auth-loading-screen__dot"]} ${styles["auth-loading-screen__dot--3"]}`}>.</span>
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthLoadingScreen;
