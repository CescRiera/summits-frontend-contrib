import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "../../shared/context/AuthContext";
import { useNavigate } from "react-router-dom";
import styles from "./desktop-Home.module.css";
import SwiperHome from "../desktop-components/desktop-Main/desktop-SwiperHome/desktop-SwiperHome.tsx";
import UserHighestPeaks from "../desktop-components/desktop-Main/desktop-HighestPeaks/desktop-UserHighestPeaks.tsx";
import UserHighestRoutes from "../desktop-components/desktop-Main/desktop-HighestRoutes/desktop-UserHighestRoutes.tsx";
import RecentPeaks from "../desktop-components/desktop-Main/desktop-RecentPeaks/desktop-RecentPeaks.tsx";
import RecentRoutes from "../desktop-components/desktop-Main/desktop-RecentRoutes/desktop-RecentRoutes.tsx";
import DesktopWarning from "../desktop-components/desktop-Warning/desktop-Warning.tsx";
import DesktopFooter from "../desktop-components/desktop-Footer/desktop-Footer.tsx";

import { getPeakListsWithPeaks } from "../../shared/api/endpoints/peakLists";
import {
  getHighestUserPeaks,
  getUserHasPeaks,
  getHighestUserRoutes,
} from "../../shared/api/endpoints/user";
import type { AdminHierarchy } from "../../shared/api/types";
import { scrapeUserData } from "../../shared/api/endpoints/scraping";
import { websocketService } from "../../shared/api/websocket";
import { useI18n } from "../../shared/context/I18nContext";
import { useScrapingOverlay } from "../desktop-context/desktop-ScrapingOverlayContext.tsx";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import LoginRequiredPopup from "../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup.tsx";

interface PeakListType {
  list_id: number;
  list_name: string;
  description: string;
  num_peaks: number;
  primary_image: string | null;
  images: string[];
  user_completed: number;
  user_authenticated?: boolean;
  creator_id?: number | null;
  creator_name?: string | null;
  creator_image?: string | null;
  geojson: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: {
        type: "Point";
        coordinates: [number, number];
      };
      properties: {
        id: number;
        completed: boolean;
      };
    }>;
  };
}

interface HighestPeak {
  id: string;
  elevation: number;
  name: string;
  name_en?: string;
  admin_hierarchy?: AdminHierarchy;
  image_url?: string;
}

interface HighestRoute {
  id: string;
  name: string;
  date: string;
  elevation_gain: number;
  time: string;
  time_seconds: number;
  distance: number;
  activity_type: string;
  image: {
    url: string;
    order: number;
  };
  difficulty_score: number;
  distance_km: number;
  elevation_gain_m: number;
}

const Home: React.FC = () => {
  const { user, idToken } = useAuth();
  const { trackEvent } = useAnalytics();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [peakLists, setPeakLists] = useState<PeakListType[]>([]);
  const [allPeaksCount, setAllPeaksCount] = useState<number>(0);
  const [totalUserPeaks, setTotalUserPeaks] = useState<number>(0);
  const scrapingListenerSet = useRef(false);
  const { showOverlay } = useScrapingOverlay();
  const [swiperDataVersion, setSwiperDataVersion] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentDataRefreshTrigger, setRecentDataRefreshTrigger] = useState(0);
  const [filterMode, setFilterMode] = useState<
    "community" | "following" | "user"
  >("community");
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [recentDataExpandedState, setRecentDataExpandedState] = useState<{
    filterMode: "community" | "following" | "user";
    expanded: boolean;
  }>({ filterMode: "community", expanded: false });
  const isRecentDataExpanded =
    recentDataExpandedState.filterMode === filterMode
      ? recentDataExpandedState.expanded
      : false;
  const [shouldShowSeeMore, setShouldShowSeeMore] = useState(false);

  // Helper to check if we've attempted scraping for this user in this session
  const getHasAttemptedScraping = useCallback(() => {
    if (!user?.externalUserId) return false;
    const key = `hasAttemptedScraping_${user.externalUserId}`;
    return sessionStorage.getItem(key) === "true";
  }, [user?.externalUserId]);

  // Helper to set scraping attempt flag in sessionStorage
  const setHasAttemptedScraping = useCallback(
    (value: boolean) => {
      if (!user?.externalUserId) return;
      const key = `hasAttemptedScraping_${user.externalUserId}`;
      if (value) {
        sessionStorage.setItem(key, "true");
      } else {
        sessionStorage.removeItem(key);
      }
    },
    [user?.externalUserId]
  );
  const splitSectionRef = useRef<HTMLDivElement>(null);
  // Removed visibleRoutesCount; no longer needed

  // Helper to refresh lists and bump swiper version (used after scraping completes)
  const refreshListsAfterScrape = useCallback(async () => {
    try {
      const response = await getPeakListsWithPeaks();

      const lists = (response.lists || []).map((list: any) => ({
        ...list,
        geojson: list.geojson || {
          type: "FeatureCollection",
          features: [],
        },
      }));
      setPeakLists(lists);
      setAllPeaksCount(response.all_peaks || 0);
      if (
        "total_user_peaks" in response &&
        typeof response.total_user_peaks === "number"
      ) {
        setTotalUserPeaks(response.total_user_peaks);
      } else {
        setTotalUserPeaks(0);
      }
      setSwiperDataVersion((v) => v + 1);
    } catch {
      // ignore
    }
  }, []);

  // New state for peaks data
  const [userPeaks, setUserPeaks] = useState<HighestPeak[]>([]);
  const [userPeaksLoading, setUserPeaksLoading] = useState(false);
  const [userPeaksError, setUserPeaksError] = useState<string | null>(null);

  // New state for routes data
  const [userRoutes, setUserRoutes] = useState<HighestRoute[]>([]);
  const [userRoutesLoading, setUserRoutesLoading] = useState(false);
  const [userRoutesError, setUserRoutesError] = useState<string | null>(null);

  // New state for community peaks data

  // Fetch peaks data
  const fetchPeaksData = useCallback(async () => {
    // Require auth token before hitting user-data endpoints
    if (user?.externalUserId && idToken) {
      setUserPeaksLoading(true);
      setUserPeaksError(null);

      try {
        const userResponse = await getHighestUserPeaks();
        const peaksWithStringIds = (userResponse.peaks || []).map(
          (peak: {
            id: string | number;
            name_en?: string;
            [key: string]: unknown;
          }) => ({
            ...peak,
            id: String(peak.id),
            name_en: peak.name_en || undefined,
          })
        );
        setUserPeaks(peaksWithStringIds);
      } catch (error) {
        console.error("Error fetching user peaks:", error);
        setUserPeaksError("Failed to load your peaks");
        setUserPeaks([]);
      } finally {
        setUserPeaksLoading(false);
      }
    } else {
      setUserPeaks([]);
      setUserPeaksLoading(false);
      setUserPeaksError(null);
    }
  }, [user?.externalUserId, idToken]);

  // Fetch routes data
  const fetchRoutesData = useCallback(async () => {
    if (user?.externalUserId && idToken) {
      setUserRoutesLoading(true);
      setUserRoutesError(null);

      try {
        const routesResponse = await getHighestUserRoutes();
        setUserRoutes(routesResponse.routes || []);
      } catch (error) {
        console.error("Error fetching user routes:", error);
        setUserRoutesError("Failed to load your routes");
        setUserRoutes([]);
      } finally {
        setUserRoutesLoading(false);
      }
    } else {
      setUserRoutes([]);
      setUserRoutesLoading(false);
      setUserRoutesError(null);
    }
  }, [user?.externalUserId, idToken]);

  // Fetch user peaks or start scraping if needed
  useEffect(() => {
    let wsCleanup: (() => void) | undefined;

    const setupWebSocket = () => {
      if (!user?.externalUserId || !idToken) return;
      websocketService.connect();
      websocketService.joinUserRoom(user.externalUserId as unknown as string);
      // Listen for scraping-progress and update overlay with backend message
      websocketService.socket?.on(
        "scraping-progress",
        (data: {
          message?: string;
          phase?: string;
          processedRoutes?: number;
          totalRoutes?: number;
          currentRouteName?: string;
          timestamp?: string;
          language?: string;
        }) => {
          showOverlay(data?.message || "Scraping...", "scraping");
        }
      );
      // Listen for scraping-completed and update overlay with backend message
      const handleScrapingCompleted = async (data: {
        message?: string;
        totalPeaks?: number;
        timestamp?: string;
      }) => {
        setIsRefreshing(false);
        // Refresh all KeepAlive pages after scraping completes
        const pagesToRefresh = [
          "home",
          "explore",
          "map",
          "leaderboard",
          "profile",
        ];
        console.log("🔄 Refreshing pages:", pagesToRefresh.join(", "));
        // Trigger refresh by dispatching custom event
        window.dispatchEvent(new CustomEvent("refresh-keepalive-pages"));
        // Refetch user peaks
        setUserPeaksLoading(true);
        setUserRoutesLoading(true);
        let hasPeaksAfterScrape = false;
        try {
          const userResponse = await getHighestUserPeaks();
          const peaksWithStringIds = (userResponse.peaks || []).map(
            (peak: {
              id: string | number;
              name_en?: string;
              [key: string]: unknown;
            }) => ({
              ...peak,
              id: String(peak.id),
              name_en: peak.name_en || undefined,
            })
          );
          setUserPeaks(peaksWithStringIds);
          // Check if user has peaks after scraping
          hasPeaksAfterScrape =
            peaksWithStringIds.length > 0 || (data?.totalPeaks ?? 0) > 0;
        } catch {
          setUserPeaksError("Failed to load your peaks");
          setUserPeaks([]);
        } finally {
          setUserPeaksLoading(false);
        }
        try {
          const routesResponse = await getHighestUserRoutes();
          setUserRoutes(routesResponse.routes || []);
        } catch {
          setUserRoutesError("Failed to load your routes");
          setUserRoutes([]);
        } finally {
          setUserRoutesLoading(false);
        }
        // Refresh lists so Swiper reflects new totals
        await refreshListsAfterScrape();
        // Trigger refresh of recent data components
        setRecentDataRefreshTrigger((prev) => prev + 1);
        showOverlay(data?.message || "Scraping completed!", "complete");
        scrapingListenerSet.current = false;
        // If user still has no peaks after scraping, mark scraping as attempted in sessionStorage
        // to prevent infinite loop of automatic scraping attempts
        // User can still manually trigger scraping via refresh button
        if (!hasPeaksAfterScrape) {
          setHasAttemptedScraping(true);
          console.log(
            "⚠️ [Home] Scraping completed but user still has 0 peaks. Preventing automatic re-scraping."
          );
        } else {
          // If user now has peaks, clear the flag so future checks work normally
          setHasAttemptedScraping(false);
        }
      };
      websocketService.onScrapingCompleted(handleScrapingCompleted);
      return () => {
        websocketService.removeAllListeners();
      };
    };

    const fetchUserPeaksGuard = async () => {
      if (!user?.externalUserId || !idToken) return;
      if (user?.type === "default") return;
      if (scrapingListenerSet.current) {
        return;
      }
      // If we've already attempted scraping once in this session, don't scrape again
      if (getHasAttemptedScraping()) {
        console.log(
          "⏭️ [Home] Skipping automatic scrape - already attempted in this session"
        );
        return;
      }
      try {
        const result = await getUserHasPeaks();
        if (result.hasPeaks) {
          // User data exists, no scraping needed
          return;
        } else {
          // Only show overlay if scraping is needed; message will be updated by WebSocket events
          showOverlay(t("main.scrapingInProgress"), "scraping");
          if (!scrapingListenerSet.current) {
            wsCleanup = setupWebSocket();
            scrapingListenerSet.current = true;
            setHasAttemptedScraping(true); // Mark that we've attempted scraping in sessionStorage
            console.log(
              "🔄 [Home] Calling scrapeUserData - automatic (user has no peaks)"
            );
            await scrapeUserData(); // Only call ONCE
          }
        }
      } catch {
        // Handle error silently
      }
    };

    if (user?.externalUserId && idToken) {
      fetchUserPeaksGuard();
    }

    return () => {
      if (wsCleanup) wsCleanup();
    };
  }, [
    user?.externalUserId,
    user?.type,
    idToken,
    t,
    showOverlay,
    refreshListsAfterScrape,
    getHasAttemptedScraping,
    setHasAttemptedScraping,
  ]);

  // Fetch all peak lists (POST if authenticated, GET /all if public handled in API fn)
  const fetchLists = useCallback(async () => {
    try {
      const response = await getPeakListsWithPeaks();
      const lists = (response.lists || []).map((list: any) => ({
        ...list,
        geojson: list.geojson || {
          type: "FeatureCollection",
          features: [],
        },
      }));
      setPeakLists(lists);
      setAllPeaksCount(response.all_peaks || 0);
      if (
        "total_user_peaks" in response &&
        typeof response.total_user_peaks === "number"
      ) {
        setTotalUserPeaks(response.total_user_peaks);
      } else {
        setTotalUserPeaks(0);
      }
      setSwiperDataVersion((v) => v + 1); // bump version to remount Swiper
    } catch (error) {
      console.error("Error fetching peak lists:", error);
    }
  }, []);

  // Note: We don't clear the scraping flag when user changes - it persists across remounts
  // This is intentional to prevent infinite loops. The flag is user-specific via sessionStorage key.

  // Fetch peak lists, peaks and routes when user or token changes
  useEffect(() => {
    fetchLists();
    fetchPeaksData();
    fetchRoutesData();
  }, [
    user?.externalUserId,
    idToken,
    fetchPeaksData,
    fetchRoutesData,
    fetchLists,
  ]);

  // Measure content height to determine if "See More" button should be shown
  useEffect(() => {
    const element = splitSectionRef.current;
    if (!element) return;

    const measureHeight = () => {
      // Temporarily remove max-height restriction to measure natural height
      const originalMaxHeight = element.style.maxHeight;
      const originalOverflow = element.style.overflow;

      element.style.maxHeight = "none";
      element.style.overflow = "visible";

      const naturalHeight = element.scrollHeight;

      // Restore original styles
      element.style.maxHeight = originalMaxHeight;
      element.style.overflow = originalOverflow;

      // Show button if content exceeds 750px (with small threshold to avoid flickering)
      setShouldShowSeeMore(naturalHeight > 760);
    };

    // Use ResizeObserver to measure when content changes
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure content is fully rendered
      setTimeout(measureHeight, 100);
    });

    resizeObserver.observe(element);

    // Initial measurement with longer delay to ensure content is loaded
    const timeoutId = setTimeout(measureHeight, 200);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [recentDataRefreshTrigger, filterMode]);

  // Removed height coupling logic between routes and peaks

  // Compose the list for the swiper, including All Peaks
  const allPeaksList = useMemo(
    () => ({
      list_id: 0, // Use 0 for "all" peaks
      list_name: t("main.allPeaks"),
      description: "",
      num_peaks: allPeaksCount,
      user_completed: totalUserPeaks,
      user_authenticated: !!user?.externalUserId,
      primary_image: "/icons/peaklist/tot.jpg", // Fallback for All Peaks
      images: [],
      geojson: {
        type: "FeatureCollection" as const,
        features: [],
      },
    }),
    [allPeaksCount, totalUserPeaks, t, user?.externalUserId]
  );

  const peakListsForSwiper = useMemo(
    () => [allPeaksList, ...peakLists],
    [allPeaksList, peakLists]
  );

  // Navigation handlers for the peak components
  const handlePeakPress = (peak: HighestPeak) => {
    // Track peak click from home
    trackEvent("peak_click", `home_desktop_${peak.id}`);
    // Navigate to peak detail page
    navigate(`/peaks/${peak.id}`);
  };

  const handleRoutePress = (route: HighestRoute) => {
    // Track route click from home
    trackEvent("route_click", `home_desktop_${route.id}`);
    // Navigate to route detail page
    navigate(`/routes/${route.id}`);
  };

  // Shared filter mode handler for Recent Peaks and Recent Routes
  const getFilterDisplayName = (
    mode: "community" | "following" | "user"
  ): string => {
    switch (mode) {
      case "community":
        return t("recentPeaks.filter.community") || "Community";
      case "following":
        return t("recentPeaks.filter.following") || "Following";
      case "user":
        return t("recentPeaks.filter.user") || "You";
      default:
        return "Community";
    }
  };

  const handleFilterChange = (mode: string) => {
    const typedMode = mode as "community" | "following" | "user";
    
    // Track filter change
    trackEvent("interaction", `home_filter_change_${typedMode}`);
    
    if (!user && (typedMode === "following" || typedMode === "user")) {
      // User is not authenticated and trying to switch to following/user mode
      setShowLoginPopup(true);
      return;
    }
    if (typedMode === filterMode) {
      return;
    }
    setFilterMode(typedMode);
    setRecentDataExpandedState({ filterMode: typedMode, expanded: false });
  };

  const switchOptions = [
    { value: "community", label: getFilterDisplayName("community") },
    { value: "following", label: getFilterDisplayName("following") },
    { value: "user", label: getFilterDisplayName("user") },
  ];

  // Simple refresh button handler to trigger user data fetch
  const handleRefreshUserData = async () => {
    if (
      isRefreshing ||
      !user?.externalUserId ||
      !idToken ||
      user?.type === "default"
    )
      return;
    
    // Track manual refresh
    trackEvent("button_click", "home_desktop_refresh_user_data");
    
    setIsRefreshing(true);
    try {
      // Show overlay and trigger scraping
      showOverlay(t("main.scrapingInProgress"), "scraping");

      // Ensure WebSocket is connected and listeners are set up
      if (!scrapingListenerSet.current) {
        websocketService.connect();
        websocketService.joinUserRoom(user.externalUserId as unknown as string);

        // Set up the scraping progress listener
        websocketService.socket?.on(
          "scraping-progress",
          (data: {
            message?: string;
            phase?: string;
            processedRoutes?: number;
            totalRoutes?: number;
            currentRouteName?: string;
            timestamp?: string;
            language?: string;
          }) => {
            showOverlay(data?.message || "Scraping...", "scraping");
          }
        );

        // Set up the scraping completed listener
        const handleScrapingCompleted = async (data: {
          message?: string;
          totalPeaks?: number;
          timestamp?: string;
        }) => {
          setIsRefreshing(false);
          // Refetch user peaks
          setUserPeaksLoading(true);
          setUserRoutesLoading(true);
          try {
            const userResponse = await getHighestUserPeaks();
            const peaksWithStringIds = (userResponse.peaks || []).map(
              (peak: {
                id: string | number;
                name_en?: string;
                [key: string]: unknown;
              }) => ({
                ...peak,
                id: String(peak.id),
                name_en: peak.name_en || undefined,
              })
            );
            setUserPeaks(peaksWithStringIds);
          } catch {
            setUserPeaksError("Failed to load your peaks");
            setUserPeaks([]);
          } finally {
            setUserPeaksLoading(false);
          }
          try {
            const routesResponse = await getHighestUserRoutes();
            setUserRoutes(routesResponse.routes || []);
          } catch {
            setUserRoutesError("Failed to load your routes");
            setUserRoutes([]);
          } finally {
            setUserRoutesLoading(false);
          }
          // Refresh lists so Swiper reflects new totals
          await refreshListsAfterScrape();
          // Trigger refresh of recent data components
          setRecentDataRefreshTrigger((prev) => prev + 1);
          showOverlay(data?.message || "Scraping completed!", "complete");
          scrapingListenerSet.current = false;
        };
        websocketService.onScrapingCompleted(handleScrapingCompleted);

        scrapingListenerSet.current = true;
      }

      console.log("🔄 [Home] Calling scrapeUserData - manual refresh");
      await scrapeUserData();
    } catch {
      setIsRefreshing(false);
    }
  };

  return (
    <div
      className={styles["persistent-pages__page"]}
      style={{ position: "relative" }}
    >
      {/* SwiperHome stays full width (100vw) */}
      <SwiperHome
        peakLists={peakListsForSwiper}
        key={swiperDataVersion}
        {...(user?.externalUserId && idToken
          ? {
              onRefreshUserData: () => {
                void handleRefreshUserData();
              },
            }
          : {})}
        isRefreshing={isRefreshing}
      />

      {/* Main content wrapper - 1440px max-width, centered */}
      <div className={styles["home__content-wrapper"]}>
        {/* Shared Centered Header */}
        <div className={styles["home__centered-header"]}>
          <div className={styles["home__centered-header__content"]}>
            <h2
              className={`${styles["home__centered-header__title"]} typography-desktop-headline-large`}
            >
              {t("home.routesAndPeaks.title") ||
                "Routes and Peaks of the World"}
            </h2>
            <p
              className={`${styles["home__centered-header__subtitle"]} typography-desktop-body-medium`}
            >
              {t("home.routesAndPeaks.subtitle") ||
                "Visualize routes and peaks completed by community members, your friends, or yourself"}
            </p>
          </div>
          <div className={styles["home__centered-header__switch"]}>
            <div
              className={styles["home__centered-header__switch-background"]}
              style={{
                transform: `translateX(${
                  switchOptions.findIndex((opt) => opt.value === filterMode) *
                  204
                }px)`,
              }}
            />
            {switchOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                className={`${styles["home__centered-header__switch-option"]} ${
                  filterMode === option.value
                    ? styles["home__centered-header__switch-option--active"]
                    : ""
                } typography-desktop-label-large`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 1: Top Split - Recent Routes (65%) | Recent Peaks (35%) */}
        <div
          ref={splitSectionRef}
          className={styles["home__section--split"]}
          style={{
            maxHeight: isRecentDataExpanded ? "none" : "750px",
            overflow: isRecentDataExpanded ? "visible" : "hidden",
            transition: "max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div className={styles["home__section--split-left"]}>
            <RecentRoutes
              refreshTrigger={recentDataRefreshTrigger}
              filterMode={filterMode}
            />
          </div>
          <div className={styles["home__section--split-right"]}>
            <RecentPeaks
              refreshTrigger={recentDataRefreshTrigger}
              filterMode={filterMode}
            />
          </div>
        </div>

        {/* Shared See More / See Less Button - Only show if content exceeds 750px */}
        {shouldShowSeeMore && (
          <div className={styles["home__see-more-container"]}>
            <button
              className={styles["home__see-more-button"]}
              onClick={() =>
                setRecentDataExpandedState({
                  filterMode,
                  expanded: !isRecentDataExpanded,
                })
              }
            >
              <span className="typography-desktop-label-large">
                {isRecentDataExpanded
                  ? t("home.showLess") || "Show less"
                  : t("home.showMore") || "Show more"}
              </span>
            </button>
          </div>
        )}

        {/* Desktop Warning - QR Code */}
        <DesktopWarning />

        {/* Section 2: Bottom - Highest Peaks and Highest Routes */}
        <div className={styles["home__section--bottom"]}>
          <div className={styles["home__section--bottom-left"]}>
            <UserHighestPeaks
              peaks={userPeaks}
              loading={userPeaksLoading}
              error={userPeaksError}
              onPeakPress={handlePeakPress}
            />
          </div>
          <div className={styles["home__section--bottom-right"]}>
            <UserHighestRoutes
              routes={userRoutes}
              loading={userRoutesLoading}
              error={userRoutesError}
              onRoutePress={handleRoutePress}
            />
          </div>
        </div>
      </div>

      {showLoginPopup && (
        <LoginRequiredPopup
          isOpen={showLoginPopup}
          onClose={() => setShowLoginPopup(false)}
          message="auth.loginRequired.followingMode"
        />
      )}
      <DesktopFooter />
    </div>
  );
};

export default Home;
