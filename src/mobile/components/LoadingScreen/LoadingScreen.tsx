import React from "react";
import styles from "./LoadingScreen.module.css";

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
        <p className={`${styles["loadingMessage"]} typography-body-medium`}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
