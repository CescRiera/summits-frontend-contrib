import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Home from "./PersistentPages/Home";
import Explore from "./PersistentPages/Explore";
import Map from "./PersistentPages/Map";
import Profile from "./PersistentPages/Profile";
import LeaderBoard from "./PersistentPages/LeaderBoardScreen/LeaderBoard";
import TermsOfService from "./NonPersistentPages/TermsOfService/TermsOfService";
import PrivacyPolicy from "./NonPersistentPages/PrivacyPolicy/PrivacyPolicy";
import RegisterFlow from "./components/LoginRegister/RegisterFlow";
import VerifyEmail from "./NonPersistentPages/VerifyEmail/VerifyEmail";
import ChangePassword from "./NonPersistentPages/ChangePassword/ChangePassword";
import CreateEditList from "./NonPersistentPages/CreateEditList/CreateEditList";
import "../shared/App.css";
import { ScrapingOverlayProvider } from "./context/ScrapingOverlayContext";
import ScrapingOverlayBar from "./components/ScrapingOverlayBar";
import { MapNavigationProvider } from "./context/MapNavigationContext";
import { ExploreProvider } from "./context/ExploreContext";
import { MapProvider } from "./context/MapContext";
import LandingPageOverlay from "./components/LandingPageOverlay/LandingPageOverlay";
import LastUpdateModal from "./components/LastUpdateModal/LastUpdateModal";
import { AliveScope, KeepAlive } from "react-activation";
import OverlayStackManager from "./components/Overlay/OverlayStackManager";
import DynamicMetaTags from "./components/DynamicMetaTags/DynamicMetaTags";
import ForceUpdateOverlay from "./components/ForceUpdateOverlay/ForceUpdateOverlay";
import NotificationsOptInPopup from "./components/NotificationsOptInPopup/NotificationsOptInPopup";
import AppInstallBanner from "./components/AppInstallBanner/AppInstallBanner";
import axios from "axios";
import { Capacitor } from "@capacitor/core";
import StructuredData from "../shared/components/StructuredData/StructuredData";
import { useAnalytics } from "../shared/context/AnalyticsContext";
import { useAuth } from "../shared/context/AuthContext";
import pushNotificationManager from "../shared/utils/pushNotifications";
import Navbar from "./PersistentPages/Navbar";
import navbarStyles from "./PersistentPages/Navbar.module.css";
import OfflineBanner from "./components/OfflineBanner/OfflineBanner";
import {
  NavbarVisibilityProvider,
  useNavbarVisibility,
} from "./context/NavbarVisibilityContext";
import {
  initializeDeepLinkHandler,
  deepLinkToRoute,
} from "../shared/utils/deepLinkHandler";
import { useNativePullToRefresh } from "./hooks/useNativePullToRefresh";
import { CURRENT_APP_VERSION } from "../shared/constants/appVersion";

function NavbarWrapper() {
  const location = useLocation();
  const { isNavbarHidden } = useNavbarVisibility();

  // Determine if current page is a persistent page (should show navbar)
  const isPersistentPage = useMemo(() => {
    const persistentPaths = [
      "/",
      "/explore",
      "/map",
      "/leaderboard",
      "/profile",
    ];
    return persistentPaths.includes(location.pathname);
  }, [location.pathname]);

  // Determine current page for navbar
  const getCurrentPage = ():
    | "home"
    | "explore"
    | "map"
    | "profile"
    | "leaderboard" => {
    const path = location.pathname;
    if (path === "/") return "home";
    if (path === "/explore") return "explore";
    if (path === "/map") return "map";
    if (path === "/leaderboard") return "leaderboard";
    if (path === "/profile") return "profile";
    return "home";
  };

  if (!isPersistentPage) return null;

  return (
    <Navbar
      currentPage={getCurrentPage()}
      {...(isNavbarHidden && { className: navbarStyles["navbar--hidden"] })}
    />
  );
}

function AppRoutes() {
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [forceUpdateVersion, setForceUpdateVersion] = useState<string | null>(
    null
  );
  const isNative = Capacitor.isNativePlatform();
  const isPreview = useMemo(
    () => new URLSearchParams(location.search).get("preview") === "true",
    [location.search]
  );

  useNativePullToRefresh(location.pathname, location.search);

  // Listen for refresh event
  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey((prev) => prev + 1);
    };
    window.addEventListener("refresh-keepalive-pages", handleRefresh);
    return () => {
      window.removeEventListener("refresh-keepalive-pages", handleRefresh);
    };
  }, []);

  const navigate = useNavigate();
  const { trackEvent } = useAnalytics();
  const { user, authReady } = useAuth();

  // Track page views on route changes
  useEffect(() => {
    trackEvent("page_view", location.pathname);
  }, [location.pathname, trackEvent]);

  // Track previous path for scroll save/restore between persistent and non-persistent pages
  const prevPathRef = useRef<string>(location.pathname);

  // Restore scroll when returning to a persistent page from overlays or non-persistent pages
  useEffect(() => {
    const persistentPaths = [
      "/",
      "/explore",
      "/map",
      "/leaderboard",
      "/profile",
    ];
    const currentPath = location.pathname;
    const prevPath = prevPathRef.current;

    // Update the ref for next transition
    prevPathRef.current = currentPath;

    const isCurrentPersistent = persistentPaths.includes(currentPath);
    const isPrevPersistent = persistentPaths.includes(prevPath);

    // Restore scroll when returning to a persistent page from any non-persistent path
    if (isCurrentPersistent && !isPrevPersistent) {
      // Double rAF ensures we restore AFTER react-activation and body unlock
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const savedScroll = sessionStorage.getItem(
            `persistent-scroll:${currentPath}`
          );
          if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll, 10));
          }
        });
      });
    } else if (isCurrentPersistent && location.state?.restoreScroll) {
      // Explicit restore request (e.g. from overlay back with state)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const savedScroll = sessionStorage.getItem(
            `persistent-scroll:${currentPath}`
          );
          if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll, 10));
          }
          window.history.replaceState({}, document.title, currentPath);
        });
      });
    }
  }, [location.pathname, location.state]);

  // Continuously capture scroll position while on a persistent page
  // The scroll listener saves on every scroll event, giving us an accurate value
  // before the body gets locked by OverlayStackManager
  useEffect(() => {
    const persistentPaths = [
      "/",
      "/explore",
      "/map",
      "/leaderboard",
      "/profile",
    ];
    const currentPath = location.pathname;
    if (!persistentPaths.includes(currentPath)) return;

    const handleScroll = () => {
      // Only save if body is NOT locked (position: fixed makes scrollY = 0)
      if (document.body.style.position !== "fixed") {
        sessionStorage.setItem(
          `persistent-scroll:${currentPath}`,
          String(window.scrollY)
        );
      }
    };

    // Save initial position
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      // Do NOT save on cleanup — OverlayStackManager may have already locked the body,
      // which would overwrite the correct scroll value with 0
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.pathname]);

  // Initialize push notifications when user is authenticated
  // Also subscribe if permission is already granted (handles OAuth-based registrations)
  useEffect(() => {
    if (authReady && user) {
      // Initialize push notification manager
      pushNotificationManager
        .initialize()
        .then(async () => {
          try {
            // After initialization, check if permission is already granted
            // If so, subscribe to send token to backend
            // This ensures OAuth-based registrations (Strava/Garmin) get their tokens registered
            // since they redirect away from the app and can't call subscribe() after registration
            const permissionStatus =
              await pushNotificationManager.getPermissionStatus();
            if (permissionStatus === "granted") {
              await pushNotificationManager.subscribe();
              console.log(
                "📱 Auto-subscribed to push notifications after authentication"
              );
            }
          } catch (error) {
            // Don't warn on subscription errors - user may have disabled notifications
            console.log(
              "📱 Push notification auto-subscription skipped:",
              error
            );
          }
        })
        .catch((error) => {
          console.warn("Failed to initialize push notifications:", error);
        });
    }
  }, [authReady, user]);

  // Initialize deep link handler for mobile app
  useEffect(() => {
    initializeDeepLinkHandler((url: string) => {
      const route = deepLinkToRoute(url);
      if (route) {
        console.log("Navigating to deep link route:", route);
        navigate(route);
      }
    });
  }, [navigate]);

  const { data: latestVersion, error: versionError } = useQuery({
    queryKey: ["mobile-app-version"],
    queryFn: async () => {
      const backendUrl = import.meta.env["VITE_BACKEND_URL"] || "";
      const response = await axios.get(`${backendUrl}/api/getMobileAppVersion`);
      return response.data.version as string | undefined;
    },
    enabled: isNative || isPreview,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Check for mandatory mobile app updates
  useEffect(() => {
    if (!isNative && !isPreview) return;

    if (latestVersion) {
      console.log("Latest version:", latestVersion);
      if (isPreview || latestVersion > CURRENT_APP_VERSION) {
        setForceUpdateVersion(latestVersion || "1.02");
      }
      return;
    }

    if (versionError) {
      console.error("Failed to check app version:", versionError);
      if (isPreview) {
        setForceUpdateVersion("1.02");
      }
    }
  }, [latestVersion, versionError, isNative, isPreview]);

  return (
    <MapNavigationProvider>
      <ScrapingOverlayProvider>
        <NavbarVisibilityProvider>
          {forceUpdateVersion && (
            <ForceUpdateOverlay
              latestVersion={forceUpdateVersion}
              onClose={() => setForceUpdateVersion(null)}
            />
          )}
          <AppInstallBanner />
          <DynamicMetaTags />
          <StructuredData />
          <LandingPageOverlay />
          <LastUpdateModal />
          <NotificationsOptInPopup />
          <OfflineBanner />
          <ScrapingOverlayBar />
          <AliveScope>
            <Routes>
              <Route
                path="/"
                element={
                  <KeepAlive
                    key={`home-${refreshKey}`}
                    id="home"
                    saveScrollPosition="screen"
                  >
                    <Home />
                  </KeepAlive>
                }
              />
              <Route
                path="/explore"
                element={
                  <KeepAlive
                    key={`explore-${refreshKey}`}
                    id="explore"
                    saveScrollPosition="screen"
                  >
                    <ExploreProvider>
                      <Explore />
                    </ExploreProvider>
                  </KeepAlive>
                }
              />
              <Route
                path="/map"
                element={
                  <KeepAlive
                    key={`map-${refreshKey}`}
                    id="map"
                    saveScrollPosition="screen"
                  >
                    <MapProvider>
                      <Map />
                    </MapProvider>
                  </KeepAlive>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <KeepAlive
                    key={`leaderboard-${refreshKey}`}
                    id="leaderboard"
                    saveScrollPosition="screen"
                  >
                    <LeaderBoard />
                  </KeepAlive>
                }
              />
              <Route
                path="/profile"
                element={
                  <KeepAlive
                    key={`profile-${refreshKey}`}
                    id="profile"
                    saveScrollPosition="screen"
                  >
                    <Profile />
                  </KeepAlive>
                }
              />
              <Route path="/register" element={<RegisterFlow />} />
              <Route path="/verifyemail" element={<VerifyEmail />} />
              <Route path="/changepassword" element={<ChangePassword />} />

              <Route
                path="/help"
                element={<Navigate to="/profile?help=contact" replace />}
              />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/createlist" element={<CreateEditList />} />
              <Route path="/editlist/:id" element={<CreateEditList />} />
            </Routes>
            <OverlayStackManager />
          </AliveScope>
          {/* Navbar - only show on persistent pages */}
          <NavbarWrapper />
        </NavbarVisibilityProvider>
      </ScrapingOverlayProvider>
    </MapNavigationProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
