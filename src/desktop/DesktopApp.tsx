import {
  BrowserRouter,
  Navigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import Home from "./desktop-PersistentPages/desktop-Home.tsx";
import Map from "./desktop-PersistentPages/desktop-Map.tsx";
import Explore from "./desktop-PersistentPages/desktop-Explore.tsx";
import Profile from "./desktop-PersistentPages/desktop-Profile";
import LeaderBoard from "./desktop-PersistentPages/desktop-LeaderBoardScreen/desktop-LeaderBoard.tsx";
import Contact from "./desktop-NonPersistentPages/desktop-Contact/desktop-Contact.tsx";
import TermsOfService from "./desktop-NonPersistentPages/desktop-TermsOfService/desktop-TermsOfService.tsx";
import PrivacyPolicy from "./desktop-NonPersistentPages/desktop-PrivacyPolicy/desktop-PrivacyPolicy.tsx";
import VerifyEmail from "./desktop-NonPersistentPages/desktop-VerifyEmail/desktop-VerifyEmail.tsx";
import ChangePassword from "./desktop-NonPersistentPages/desktop-ChangePassword/desktop-ChangePassword.tsx";
import DesktopCreateEditList from "./desktop-NonPersistentPages/desktop-CreateEditList/desktop-CreateEditList.tsx";

import "../shared/App.css";
import { ScrapingOverlayProvider } from "./desktop-context/desktop-ScrapingOverlayContext.tsx";
import ScrapingOverlayBar from "./desktop-components/desktop-ScrapingOverlayBar.tsx";
import { MapNavigationProvider } from "./desktop-context/desktop-MapNavigationContext.tsx";
import { MapProvider } from "./desktop-context/desktop-MapContext.tsx";
import { ExploreProvider } from "./desktop-context/desktop-ExploreContext.tsx";
import { AliveScope, KeepAlive } from "react-activation";
import OverlayStackManager from "./desktop-components/desktop-Overlay/desktop-OverlayStackManager.tsx";
import DynamicMetaTags from "./desktop-components/desktop-DynamicMetaTags/desktop-DynamicMetaTags.tsx";
import StructuredData from "../shared/components/StructuredData/StructuredData";
import Navbar from "./desktop-PersistentPages/desktop-Navbar.tsx";
import DesktopLastUpdateModal from "./desktop-components/desktop-LastUpdateModal/desktop-LastUpdateModal";
import { useAnalytics } from "../shared/context/AnalyticsContext";

// Component to render Navbar on all pages
function ConditionalNavbar() {
  return <Navbar />;
}

function AppRoutes() {
  const location = useLocation();
  const { trackEvent } = useAnalytics();
  const [refreshKey, setRefreshKey] = useState(0);

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

  // Track page views on route changes
  useEffect(() => {
    trackEvent("page_view", location.pathname);
  }, [location.pathname, trackEvent]);

  // Track previous path for scroll save/restore between persistent and non-persistent pages
  const prevPathRef = useRef<string>(location.pathname);

  // Restore scroll when returning to a persistent page from overlays or non-persistent pages
  useEffect(() => {
    const persistentPaths = ["/", "/explore", "/map", "/leaderboard", "/profile"];
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
          const savedScroll = sessionStorage.getItem(`persistent-scroll:${currentPath}`);
          if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll, 10));
          }
        });
      });
    } else if (isCurrentPersistent && location.state?.restoreScroll) {
      // Explicit restore request (e.g. from overlay back with state)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const savedScroll = sessionStorage.getItem(`persistent-scroll:${currentPath}`);
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
    const persistentPaths = ["/", "/explore", "/map", "/leaderboard", "/profile"];
    const currentPath = location.pathname;
    if (!persistentPaths.includes(currentPath)) return;

    const handleScroll = () => {
      // Only save if body is NOT locked (position: fixed makes scrollY = 0)
      if (document.body.style.position !== "fixed") {
        sessionStorage.setItem(`persistent-scroll:${currentPath}`, String(window.scrollY));
      }
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      // Do NOT save on cleanup — OverlayStackManager may have already locked the body,
      // which would overwrite the correct scroll value with 0
      window.removeEventListener("scroll", handleScroll);
    };
  }, [location.pathname]);

  return (
    <MapNavigationProvider>
      <ScrapingOverlayProvider>
        <DynamicMetaTags />
        <StructuredData />
        <ConditionalNavbar />
        <DesktopLastUpdateModal />
        <ScrapingOverlayBar />
        <div
          style={{
            marginLeft: "var(--sidebar-width, 280px)",
            transition: "margin-left 0.3s ease",
            minHeight: "100vh",
          }}
        >
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
              <Route
                path="/register"
                element={
                  <KeepAlive
                    key={`profile-${refreshKey}`}
                    id="profile"
                    saveScrollPosition="screen"
                  >
                    <Profile registerMode={true} />
                  </KeepAlive>
                }
              />
              <Route path="/verifyemail" element={<VerifyEmail />} />
              <Route path="/changepassword" element={<ChangePassword />} />

              <Route
                path="/help"
                element={<Navigate to="/profile?help=contact" replace />}
              />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/createlist" element={<DesktopCreateEditList />} />
              <Route path="/editlist/:id" element={<DesktopCreateEditList />} />
            </Routes>
            <OverlayStackManager />
          </AliveScope>
        </div>
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
