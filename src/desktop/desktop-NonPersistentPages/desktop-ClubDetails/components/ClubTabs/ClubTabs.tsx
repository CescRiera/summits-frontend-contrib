import React from "react";
import { useI18n } from "../../../../../shared/context/I18nContext";
import { useAnalytics } from "../../../../../shared/context/AnalyticsContext";
import styles from "./ClubTabs.module.css";
import type { ClubTab } from "../../types";

interface ClubTabsProps {
  activeTab: ClubTab;
  onTabChange: (tab: ClubTab) => void;
}

const ClubTabs: React.FC<ClubTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();

  const handleTabClick = (tab: ClubTab) => {
    trackEvent("interaction", `club_tab_${tab}`);
    onTabChange(tab);
  };

  return (
    <div className={styles["club-tabs"]}>
      <button
        type="button"
        className={`${styles["club-tabs__button"]} ${
          activeTab === "members" ? styles["club-tabs__button--active"] : ""
        } typography-desktop-button-medium`}
        onClick={() => handleTabClick("members")}
      >
        {t("clubs.tabs.members") || "Members"}
      </button>
      <button
        type="button"
        className={`${styles["club-tabs__button"]} ${
          activeTab === "activity" ? styles["club-tabs__button--active"] : ""
        } typography-desktop-button-medium`}
        onClick={() => handleTabClick("activity")}
      >
        {t("clubs.tabs.activity") || "Activity"}
      </button>
      <button
        type="button"
        className={`${styles["club-tabs__button"]} ${
          activeTab === "challenges" ? styles["club-tabs__button--active"] : ""
        } typography-desktop-button-medium`}
        onClick={() => handleTabClick("challenges")}
      >
        {t("clubs.challenges.title") || "Challenges"}
      </button>
    </div>
  );
};

export default ClubTabs;
