"use client";

import type React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { Globe, List, Users } from "lucide-react";
import styles from "./desktop-LeaderBoard.module.css";
import DesktopWorldChallenge from "./desktop-WorldChallenge.tsx";
import ListsLeaderboard from "./desktop-ListsLeaderboard.tsx";
import DesktopClubsLeaderboard from "./desktop-ClubsLeaderboard.tsx";
import { ExploreProvider } from "../../desktop-context/desktop-ExploreContext";

type LeaderboardType = "world" | "challenges" | "clubs";

const LeaderBoard: React.FC = () => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize activeTab directly from search params for persistence
  const [activeTab, setActiveTab] = useState<LeaderboardType>(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab") as LeaderboardType | null;
    return tabParam && ["world", "challenges", "clubs"].includes(tabParam)
      ? tabParam
      : "challenges";
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync state with URL changes (e.g. browser navigation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab") as LeaderboardType | null;
    const effectiveTab = tabParam && ["world", "challenges", "clubs"].includes(tabParam)
      ? tabParam
      : "challenges";
      
    if (effectiveTab !== activeTab) {
      setActiveTab(effectiveTab);
    }
  }, [location.search, activeTab]);

  const handleTabChange = useCallback(
    (tab: LeaderboardType) => {
      if (tab !== activeTab && !isTransitioning) {
        trackEvent("button_click", `leaderboard_tab_${tab}`);
        setIsTransitioning(true);

        // Update state and URL for persistence
        setActiveTab(tab);
        const params = new URLSearchParams(location.search);
        params.set("tab", tab);
        // Remove listId when switching away from challenges tab
        if (tab !== "challenges") {
          params.delete("listId");
        }
        navigate(`/leaderboard?${params.toString()}`, { replace: true });

        // Clear transition state after animation
        setTimeout(() => setIsTransitioning(false), 300);
      }
    },
    [activeTab, isTransitioning, navigate, trackEvent, location.search]
  );

  return (
    <div className={styles["leader-board"]}>
      <div className={styles["leader-board__header"]}>
        <div
          className={styles["leader-board__tabs"]}
          data-active-tab={activeTab}
        >
          <button
            className={`${styles["leader-board__tab"]} ${
              activeTab === "world" ? styles["leader-board__tab--active"] : ""
            }`}
            onClick={() => handleTabChange("world")}
          >
            <Globe size={16} />
            <span className="typography-desktop-button-small">
              {t("leaderboard.worldTab")}
            </span>
          </button>
          <button
            className={`${styles["leader-board__tab"]} ${
              activeTab === "challenges"
                ? styles["leader-board__tab--active"]
                : ""
            }`}
            onClick={() => handleTabChange("challenges")}
          >
            <List size={16} />
            <span className="typography-desktop-button-small">
              {t("leaderboard.forYouTab")}
            </span>
          </button>
          <button
            className={`${styles["leader-board__tab"]} ${
              activeTab === "clubs"
                ? styles["leader-board__tab--active"]
                : ""
            }`}
            onClick={() => handleTabChange("clubs")}
          >
            <Users size={16} />
            <span className="typography-desktop-button-small">
              {t("leaderboard.clubsTab") || "Clubs"}
            </span>
          </button>
        </div>
      </div>

      <div
        className={styles["leader-board__content-container"]}
        ref={contentRef}
      >
        {/* Render both tabs but only show the active one.
            This preserves scroll positions and internal states without problematic manual caching. */}
        <div
          className={`${styles["leader-board__content"]} ${
            activeTab === "world"
              ? styles["leader-board__content--active"]
              : styles["leader-board__content--hidden"]
          }`}
        >
          <ExploreProvider>
            <DesktopWorldChallenge isActive={activeTab === "world"} />
          </ExploreProvider>
        </div>
        <div
          className={`${styles["leader-board__content"]} ${
            activeTab === "challenges"
              ? styles["leader-board__content--active"]
              : styles["leader-board__content--hidden"]
          }`}
        >
          <ListsLeaderboard />
        </div>
        <div
          className={`${styles["leader-board__content"]} ${
            activeTab === "clubs"
              ? styles["leader-board__content--active"]
              : styles["leader-board__content--hidden"]
          }`}
        >
          <DesktopClubsLeaderboard />
        </div>
      </div>
    </div>
  );
};

export default LeaderBoard;
