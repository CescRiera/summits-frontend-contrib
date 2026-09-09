import React from "react";
import styles from "./desktop-EmptyState.module.css";

const EmptyState: React.FC<{ searchQuery?: string }> = ({ searchQuery }) => {
  const isSearching = !!searchQuery && searchQuery.trim().length > 0;
  return (
    <div className={styles["empty-state"]}>
      <div className={styles["empty-state__icon"]}>
        {isSearching ? "🔍" : "⛰️"}
      </div>
      <div className={`${styles["empty-state__title"]} typography-desktop-body-small`}>
        {isSearching ? "No Peaks Found" : "No Peaks Yet"}
      </div>
      <div className={`${styles["empty-state__subtitle"]} typography-desktop-body-small`}>
        {isSearching
          ? `No peaks match "${searchQuery}".`
          : "Start your climbing journey!"}
      </div>
    </div>
  );
};

export default EmptyState;
