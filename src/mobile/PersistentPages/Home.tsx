import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "../../shared/context/AuthContext";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import SwiperHome from "../components/Main/SwiperHome/SwiperHome";
import UserHighestPeaks from "../components/Main/HighestPeaks/UserHighestPeaks";
import UserHighestRoutes from "../components/Main/HighestRoutes/UserHighestRoutes";
import RecentPeaks from "../components/Main/RecentPeaks/RecentPeaks";
import RecentRoutes from "../components/Main/RecentRoutes/RecentRoutes";
import { RefreshCw } from "lucide-react";
import Footer from "../components/Footer/Footer";
import MountainIcon from "../../shared/components/MountainIcon/MountainIcon";

import {
  getHighestUserPeaks,
  getUserHasPeaks,
  getHighestUserRoutes,
} from "../../shared/api/endpoints/user";
import type { AdminHierarchy } from "../../shared/api/types";
import { scrapeUserData } from "../../shared/api/endpoints/scraping";
import { websocketService } from "../../shared/api/websocket";
import { useI18n } from "../../shared/context/I18nContext";
import { useScrapingOverlay } from "../context/ScrapingOverlayContext";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import { getPlatformType } from "../../shared/utils/platformDetection";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import {
  GOOGLE_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
} from "../../shared/constants/storeLinks";

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
  } | null;
  difficulty_score: number;
  distance_km: number;
  elevation_gain_m: number;
}

const Home: React.FC = () => {
  const { user, idToken } = useAuth();
  const { trackEvent } = useAnalytics();
  const { t } = useI18n();
  const navigate = useNavigate();
  const scrapingListenerSet = useRef(false);
  const { showOverlay } = useScrapingOverlay();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recentDataRefreshTrigger, setRecentDataRefreshTrigger] = useState(0);

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
        console.log("Routes Response", routesResponse)
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
        // Trigger refresh of SwiperHome data
        window.dispatchEvent(new CustomEvent("refresh-swiper-home"));
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
    getHasAttemptedScraping,
    setHasAttemptedScraping,
  ]);

  // Note: We don't clear the scraping flag when user changes - it persists across remounts
  // This is intentional to prevent infinite loops. The flag is user-specific via sessionStorage key.

  // Fetch peaks and routes when user or token changes
  useEffect(() => {
    fetchPeaksData();
    fetchRoutesData();
  }, [
    user?.externalUserId,
    idToken,
    fetchPeaksData,
    fetchRoutesData,
  ]);

  // Navigation handlers for the peak components
  const handlePeakPress = (peak: HighestPeak) => {
    // Track peak click from home
    trackEvent("peak_click", `home_${peak.id}`);
    // Navigate to peak detail page
    navigate(`/peaks/${peak.id}`);
  };

  const handleRoutePress = (route: HighestRoute) => {
    // Track route click from home
    trackEvent("route_click", `home_${route.id}`);
    // Navigate to route detail page
    navigate(`/routes/${route.id}`);
  };

  // Helper function to prepare image file for sharing on native platforms
  const prepareImageForShare = async (): Promise<string | null> => {
    try {
      const isNative = Capacitor.isNativePlatform();
      if (!isNative) {
        return null;
      }

      // Use the app icon as the share image
      const imageUrl = "/icon-300.png";

      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.warn("Failed to fetch share image");
        return null;
      }

      // Convert to blob
      const blob = await response.blob();

      // Convert blob to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            const base64 = reader.result.split(",")[1];
            if (base64) {
              resolve(base64);
            } else {
              reject(new Error("Failed to extract base64 data"));
            }
          } else {
            reject(new Error("Failed to convert image to base64"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Save to cache directory
      const filename = "share-image.png";
      const tempPath = `temp/${filename}`;

      await Filesystem.writeFile({
        path: tempPath,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      // Get the file URI
      const fileInfo = await Filesystem.getUri({
        path: tempPath,
        directory: Directory.Cache,
      });

      return fileInfo.uri;
    } catch (error) {
      console.error("Error preparing image for share:", error);
      return null;
    }
  };

  // Share functionality
  const handleShare = async () => {
    const platform = getPlatformType();

    try {
      // Track share initiation
      trackEvent("button_click", "home_share");
      
      if (platform === "ios" || platform === "android") {
        // Prepare image file for sharing
        const imageUri = await prepareImageForShare();

        // Use Capacitor native Share plugin for iOS and Android
        const shareData: {
          title: string;
          text: string;
          url: string;
          dialogTitle: string;
          files?: string[];
        } = {
          title: t("og.title"),
          text: t("og.description"),
          url:
            platform === "ios"
              ? IOS_APP_STORE_URL
              : GOOGLE_PLAY_STORE_URL,
          dialogTitle: "Share Summits",
        };

        // Include image file if available
        if (imageUri) {
          shareData.files = [imageUri];
        }

        await Share.share(shareData);
      } else {
        // Web version - use Web Share API
        const shareData = {
          title: t("og.title"),
          text: t("og.description"),
          url: "https://summitstracker.com",
        };

        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare(shareData)
        ) {
          await navigator.share(shareData);
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(shareData.url);
          // You could show a toast notification here
        }
      }
    } catch (error) {
      // User cancelled or error occurred
      console.error("Error sharing:", error);
    }
  };

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
    trackEvent("button_click", "home_refresh_user_data");
    
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
          // Trigger refresh of SwiperHome data
          window.dispatchEvent(new CustomEvent("refresh-swiper-home"));
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
      {/* Share button - always visible */}
      <div className={styles["home__share-button"]}>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share Summits"
          className={styles["home__share-btn"]}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.33334 10V16.6667C3.33334 17.1087 3.50894 17.5326 3.8215 17.8452C4.13406 18.1578 4.55798 18.3334 5.00001 18.3334H15C15.442 18.3334 15.866 18.1578 16.1785 17.8452C16.4911 17.5326 16.6667 17.1087 16.6667 16.6667V10M13.3333 5.00002L10 1.66669M10 1.66669L6.66668 5.00002M10 1.66669V12.5"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Manual refresh button - only for wikiloc users */}
      {user?.type === "wikiloc" && idToken && (
        <div className={styles["home__action-buttons"]}>
          <button
            type="button"
            onClick={handleRefreshUserData}
            disabled={isRefreshing}
            aria-label={t("main.refreshUserData")}
            className="typography-button-medium"
          >
            {t("main.loadNewPeaks")} <RefreshCw size={18} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className={styles["home__logo-container"]}>
        <MountainIcon size={32} color="#2d2d2d" />
      </div>

      {/* SwiperHome now handles its own data fetching */}
      <SwiperHome />

      {/* Only show UserHighestPeaks if user is logged in */}
      {/* Recent Peaks - with Community/Following toggle */}
      <RecentPeaks refreshTrigger={recentDataRefreshTrigger} />
      {/* Recent Routes - with Community/Following toggle */}
      <RecentRoutes refreshTrigger={recentDataRefreshTrigger} />
      <UserHighestPeaks
        peaks={userPeaks}
        loading={userPeaksLoading}
        error={userPeaksError}
        onPeakPress={handlePeakPress}
      />

      {/* Only show UserHighestRoutes if user is logged in */}
      <UserHighestRoutes
        routes={userRoutes}
        loading={userRoutesLoading}
        error={userRoutesError}
        onRoutePress={handleRoutePress}
      />

      <Footer />
    </div>
  );
};

export default Home;
