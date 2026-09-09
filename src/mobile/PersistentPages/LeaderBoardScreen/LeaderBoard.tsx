"use client";

import type React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { Globe, List, Users } from "lucide-react";
import styles from "./LeaderBoard.module.css";
import WorldChallenge from "./WorldChallenge";
import ListsLeaderboard from "./ListsLeaderboard";
import ClubsLeaderboard from "./ClubsLeaderboard";
import { ExploreProvider } from "../../context/ExploreContext";

type LeaderboardType = "world" | "challenges" | "clubs";

const parseTabFromSearch = (search: string): LeaderboardType | null => {
  const tabParam = new URLSearchParams(search).get("tab");
  return tabParam === "world" || tabParam === "challenges" || tabParam === "clubs"
    ? tabParam
    : null;
};

const LeaderBoard: React.FC = () => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize tab from URL when present, otherwise use challenges.
  const [activeTab, setActiveTab] = useState<LeaderboardType>(() => {
    const tab = parseTabFromSearch(location.search) ?? "challenges";
    console.log("[DEBUG-LEADERBOARD] Initializing activeTab to:", tab, "from Search:", location.search);
    return tab;
  });

  useEffect(() => {
    console.log("[DEBUG-LEADERBOARD] MOUNTED.");
    return () => console.log("[DEBUG-LEADERBOARD] UNMOUNTED.");
  }, []);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Map-like behavior: apply tab only when URL explicitly provides it.
  // Missing tab params should not reset preserved KeepAlive state.
  useEffect(() => {
    console.log("[DEBUG-LEADERBOARD] Tab sync effect running. Pathname:", location.pathname, "Search:", location.search, "ActiveTab:", activeTab);
    if (!location.pathname.startsWith("/leaderboard")) {
      console.log("[DEBUG-LEADERBOARD] Tab sync effect: Bailing out because pathname doesn't start with /leaderboard");
      return;
    }
    const urlTab = parseTabFromSearch(location.search);
    if (urlTab && urlTab !== activeTab) {
      console.log("[DEBUG-LEADERBOARD] Tab sync effect: Setting activeTab to", urlTab);
      setActiveTab(urlTab);
    }
  }, [location.pathname, location.search, activeTab]);

  const handleTabChange = useCallback(
    (tab: LeaderboardType) => {
      if (tab !== activeTab && !isTransitioning) {
        trackEvent("button_click", `leaderboard_tab_${tab}`);
        setIsTransitioning(true);
        
        // Update state and preserve supported URL params
        setActiveTab(tab);
        const params = new URLSearchParams(location.search);
        params.set("tab", tab);
        if (tab !== "challenges") {
          params.delete("listId");
        }
        navigate(`/leaderboard?${params.toString()}`, { replace: true });

        // Clear transition state after animation
        setTimeout(() => setIsTransitioning(false), 300);
      }
    },
    [activeTab, isTransitioning, location.search, navigate, trackEvent]
  );

  return (
    <div className={styles["leaderboard"]}>
      <div className={styles["header"]}>
        <div className={styles["tabs"]} data-active-tab={activeTab}>
          <button
            className={`${styles["tab"]} ${
              activeTab === "world" ? styles["tabActive"] : ""
            }`}
            onClick={() => handleTabChange("world")}
          >
            <Globe size={16} />
            <span className="typography-button-medium">
              {t("leaderboard.worldTab")}
            </span>
          </button>
          <button
            className={`${styles["tab"]} ${
              activeTab === "challenges" ? styles["tabActive"] : ""
            }`}
            onClick={() => handleTabChange("challenges")}
          >
            <List size={16} />
            <span className="typography-button-medium">
              {t("leaderboard.forYouTab")}
            </span>
          </button>
          <button
            className={`${styles["tab"]} ${
              activeTab === "clubs" ? styles["tabActive"] : ""
            }`}
            onClick={() => handleTabChange("clubs")}
          >
            <Users size={16} />
            <span className="typography-button-medium">
              {t("leaderboard.clubsTab") || "Clubs"}
            </span>
          </button>
        </div>
      </div>

      <div className={styles["contentContainer"]} ref={contentRef}>
        {/* Render all tabs but only show the active one. 
              Keeping them in the DOM preserves their internal state and scroll positions. */}
        <div
          className={`${styles["content"]} ${
            activeTab === "world" ? styles["contentActive"] : styles["contentHidden"]
          }`}
        >
          <ExploreProvider>
            <WorldChallenge isActive={activeTab === "world"} />
          </ExploreProvider>
        </div>
        <div
          className={`${styles["content"]} ${
            activeTab === "challenges" ? styles["contentActive"] : styles["contentHidden"]
          }`}
        >
          <ListsLeaderboard />
        </div>
        <div
          className={`${styles["content"]} ${
            activeTab === "clubs" ? styles["contentActive"] : styles["contentHidden"]
          }`}
        >
          <ClubsLeaderboard />
        </div>
      </div>
    </div>
  );
};

export default LeaderBoard;
