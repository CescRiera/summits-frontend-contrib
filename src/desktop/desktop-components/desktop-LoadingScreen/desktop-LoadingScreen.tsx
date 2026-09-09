import React from "react";
import styles from "./desktop-LoadingScreen.module.css";

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading...",
}) => {
  return (
    <div className={styles["loadingOverlay"]}>
      <div className={styles["loadingContent"]}>
        <div className={styles["spinner"]}></div>
        <p className={`${styles["loadingMessage"]} typography-desktop-body-small`}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
