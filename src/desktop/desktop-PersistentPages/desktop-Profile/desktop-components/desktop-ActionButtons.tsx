import React from "react";
import { Globe, LogOut, Trash2 } from "lucide-react";
import styles from "./desktop-ActionButtons.module.css";

interface ActionButtonsProps {
  onLogout: () => void;
  onChangeLanguage?: () => void;
  onDeleteAccount?: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onLogout,
  onChangeLanguage,
  onDeleteAccount,
}) => {
  return (
    <div className={styles["action-buttons"]}>
      <button className={styles["action-button"]} onClick={onChangeLanguage}>
        <Globe className={styles["action-icon"]} />
        <span className={`${styles["action-text"]} typography-desktop-button-medium`}>
          Change Language
        </span>
      </button>

      <button
        className={`${styles["action-button"]} ${styles["action-button--logout"]}`}
        onClick={onLogout}
      >
        <LogOut className={styles["action-icon"]} />
        <span className={`${styles["action-text"]} typography-desktop-button-medium`}>
          Logout
        </span>
      </button>

      <button
        className={`${styles["action-button"]} ${styles["action-button--danger"]}`}
        onClick={onDeleteAccount}
      >
        <Trash2 className={styles["action-icon"]} />
        <span className={`${styles["action-text"]} typography-desktop-button-medium`}>
          Delete Account
        </span>
      </button>
    </div>
  );
};

export default ActionButtons;
