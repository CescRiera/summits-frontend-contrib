import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Map,
  Trophy,
  Mail,
  LogIn,
  Menu,
  ChevronLeft,
  Compass,
  Route,
  Plus,
} from "lucide-react";
import MountainIcon from "../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../shared/context/I18nContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../shared/context/AuthContext";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import { getUserDetails } from "../../shared/api/endpoints/user";
import type { UserDetails } from "../../shared/api/types/user";
import LoginRequiredPopup from "../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup";
import DesktopAddRouteModal from "../desktop-components/desktop-AddRouteModal/desktop-AddRouteModal";
import styles from "./desktop-Navbar.module.css";

export type PageType = "home" | "explore" | "map" | "leaderboard" | "contact";

interface NavbarProps {
  currentPage?: PageType;
  className?: string;
}

const SIDEBAR_STATE_KEY = "desktop-sidebar-expanded";

const Navbar: React.FC<NavbarProps> = ({ currentPage, className }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [loginPopupMessage, setLoginPopupMessage] = useState("");
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    const expanded = saved !== null ? saved === "true" : true; // Default to expanded
    // Initialize CSS variable
    document.documentElement.style.setProperty(
      "--sidebar-width",
      expanded ? "280px" : "68px"
    );
    return expanded;
  });

  // Determine current page from location if not provided
  const getCurrentPageFromLocation = (): PageType => {
    const path = location.pathname;
    if (path === "/") return "home";
    if (path === "/explore") return "explore";
    if (path === "/map") return "map";
    if (path === "/leaderboard") return "leaderboard";
    if (path === "/contact") return "contact";
    return "home";
  };

  const activePage = currentPage || getCurrentPageFromLocation();

  // Fetch user details when logged in
  useEffect(() => {
    if (user) {
      getUserDetails()
        .then((details) => {
          setUserDetails(details);
        })
        .catch((error) => {
          console.error("Failed to fetch user details:", error);
        });
    } else {
      setUserDetails(null);
    }
  }, [user]);

  // Persist sidebar state to localStorage and update CSS variable
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, String(isExpanded));
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isExpanded ? "280px" : "68px"
    );
  }, [isExpanded]);

  const navItems = [
    {
      key: "home",
      label: t("navigation.home"),
      icon: <Home size={20} />,
      path: "/",
    },
    {
      key: "explore",
      label: t("navigation.discover") || "Explore",
      icon: <Compass size={20} />,
      path: "/explore",
    },
    {
      key: "map",
      label: t("navigation.map"),
      icon: <Map size={20} />,
      path: "/map",
    },
    {
      key: "leaderboard",
      label: t("navigation.leaderboard"),
      icon: <Trophy size={20} />,
      path: "/leaderboard",
    },
    {
      key: "contact",
      label: t("navigation.contact"),
      icon: <Mail size={20} />,
      path: "/contact",
    },
  ];

  const handleNavClick = (path: string) => {
    try {
      const pageName = path.replace("/", "") || "home";
      trackEvent("button_click", `navbar_${pageName}`);
      navigate(path);
    } catch {
      // Optionally handle error
    }
  };

  const handleAvatarClick = () => {
    trackEvent("button_click", "navbar_profile_avatar");
    navigate("/profile");
  };

  const handleLoginClick = () => {
    trackEvent("button_click", "navbar_login");
    navigate("/profile");
  };

  const handleToggleCollapse = () => {
    trackEvent(
      "button_click",
      `navbar_toggle_${isExpanded ? "collapse" : "expand"}`
    );
    setIsExpanded(!isExpanded);
  };

  const handleUserRouteClick = () => {
    if (user) {
      trackEvent("button_click", "navbar_user_routes");
      navigate("/userroutes");
    } else {
      trackEvent("button_click", "navbar_user_routes_login_required");
      setLoginPopupMessage("auth.loginRequired.myRoutes");
      setShowLoginPopup(true);
    }
  };

  const handleUserPeakClick = () => {
    if (user) {
      trackEvent("button_click", "navbar_user_peaks");
      navigate("/userpeaks");
    } else {
      trackEvent("button_click", "navbar_user_peaks_login_required");
      setLoginPopupMessage("auth.loginRequired.myPeaks");
      setShowLoginPopup(true);
    }
  };

  const handleAddPeaksClick = () => {
    if (user) {
      trackEvent("button_click", "navbar_add_peaks");
      navigate("/addManualPeaks");
    } else {
      trackEvent("button_click", "navbar_add_peaks_login_required");
      setLoginPopupMessage("auth.loginRequired.myPeaks");
      setShowLoginPopup(true);
    }
  };

  const handleOpenAddRoute = useCallback(() => {
    if (!user) {
      trackEvent("button_click", "navbar_add_route_login_required");
      setLoginPopupMessage("auth.loginRequired.myRoutes");
      setShowLoginPopup(true);
      return;
    }
    trackEvent("button_click", "navbar_add_route_open");
    setIsAddRouteOpen(true);
  }, [trackEvent, user]);

  const handleCloseAddRoute = useCallback(() => {
    setIsAddRouteOpen(false);
  }, []);

  // Get avatar display (image or initial)
  const getAvatarDisplay = () => {
    if (userDetails?.image) {
      return (
        <img
          src={userDetails.image}
          alt="Profile"
          className={styles["navbar__avatar-image"]}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML =
                userDetails?.externalUsername?.charAt(0)?.toUpperCase() ||
                userDetails?.email?.charAt(0)?.toUpperCase() ||
                "U";
            }
          }}
        />
      );
    }
    return (
      userDetails?.externalUsername?.charAt(0)?.toUpperCase() ||
      userDetails?.email?.charAt(0)?.toUpperCase() ||
      user?.email?.charAt(0)?.toUpperCase() ||
      "U"
    );
  };

  return (
    <motion.nav
      className={
        styles["navbar"] +
        (isExpanded
          ? " " + styles["navbar--expanded"]
          : " " + styles["navbar--collapsed"]) +
        (className ? ` ${className}` : "")
      }
      animate={{
        width: isExpanded ? 280 : 70,
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      {/* Top: Brand and Toggle */}
      <div className={styles["navbar__header"]}>
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.div
              key="brand"
              className={styles["navbar__brand-button"]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <span>SUMMITS</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          className={styles["navbar__toggle-button"]}
          onClick={handleToggleCollapse}
          aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Center: Navigation */}
      <div className={styles["navbar__nav"]}>
        <ul className={styles["navbar__list"]}>
          {navItems.map((item) => (
            <li key={item.key} className={styles["navbar__item"]}>
              <button
                className={
                  styles["navbar__button"] +
                  (activePage === item.key
                    ? " " + styles["navbar__button--active"]
                    : "")
                }
                onClick={() => handleNavClick(item.path)}
                title={!isExpanded ? item.label : undefined}
              >
                <span className={styles["navbar__icon"]}>{item.icon}</span>
                <AnimatePresence mode="wait">
                  {isExpanded && (
                    <motion.span
                      key={`label-${item.key}`}
                      className={
                        styles["navbar__label"] +
                        " typography-desktop-label-large"
                      }
                      initial={{ opacity: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, marginLeft: 8 }}
                      exit={{ opacity: 0, marginLeft: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </li>
          ))}
        </ul>

        {/* User Routes and Peaks Section */}
        <div className={styles["navbar__user-section"]}>
          <button
            className={styles["navbar__user-button"]}
            onClick={handleUserRouteClick}
            title={!isExpanded ? t("profile.yourRoutes") : undefined}
          >
            <span className={styles["navbar__icon"]}>
              <Route size={20} />
            </span>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  key="routes-label"
                  className={
                    styles["navbar__label"] + " typography-desktop-label-large"
                  }
                  initial={{ opacity: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, marginLeft: 8 }}
                  exit={{ opacity: 0, marginLeft: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {t("profile.yourRoutes")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            className={styles["navbar__user-button"]}
            onClick={handleUserPeakClick}
            title={!isExpanded ? t("profile.yourPeaks") : undefined}
          >
            <span className={styles["navbar__icon"]}>
              <MountainIcon size={20} />
            </span>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  key="peaks-label"
                  className={
                    styles["navbar__label"] + " typography-desktop-label-large"
                  }
                  initial={{ opacity: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, marginLeft: 8 }}
                  exit={{ opacity: 0, marginLeft: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {t("profile.yourPeaks")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            className={styles["navbar__user-button"]}
            onClick={handleAddPeaksClick}
            title={!isExpanded ? t("userPeaks.addPeaks") : undefined}
          >
            <span className={styles["navbar__icon"]}>
              <Plus size={20} />
            </span>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  key="add-peaks-label"
                  className={
                    styles["navbar__label"] + " typography-desktop-label-large"
                  }
                  initial={{ opacity: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, marginLeft: 8 }}
                  exit={{ opacity: 0, marginLeft: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {t("userPeaks.addPeaks")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            className={styles["navbar__user-button"]}
            onClick={handleOpenAddRoute}
            title={!isExpanded ? t("userRoutes.addRoute") : undefined}
          >
            <span className={styles["navbar__icon"]}>
              <Plus size={20} />
            </span>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  key="add-route-label"
                  className={
                    styles["navbar__label"] + " typography-desktop-label-large"
                  }
                  initial={{ opacity: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, marginLeft: 8 }}
                  exit={{ opacity: 0, marginLeft: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {t("userRoutes.addRoute")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Bottom: Authentication */}
      <div className={styles["navbar__auth"]}>
        {user ? (
          <button
            className={styles["navbar__avatar-button"]}
            onClick={handleAvatarClick}
            title={!isExpanded ? "Profile" : undefined}
          >
            <div className={styles["navbar__avatar"]}>{getAvatarDisplay()}</div>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  key="avatar-label"
                  className={styles["navbar__avatar-label"]}
                  initial={{ opacity: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, marginLeft: 8 }}
                  exit={{ opacity: 0, marginLeft: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {userDetails?.externalUsername ||
                    userDetails?.email?.split("@")[0] ||
                    "Profile"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ) : (
          <button
            className={styles["navbar__login-button"]}
            onClick={handleLoginClick}
            title={!isExpanded ? t("auth.signUpOrLogin") : undefined}
          >
            <span className={styles["navbar__icon"]}>
              <LogIn size={22} />
            </span>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  key="login-label"
                  className="typography-desktop-label-large"
                  initial={{ opacity: 0, marginLeft: 0 }}
                  animate={{ opacity: 1, marginLeft: 8 }}
                  exit={{ opacity: 0, marginLeft: 0 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {t("auth.signUpOrLogin")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>

      {/* Login Required Popup */}
      <LoginRequiredPopup
        isOpen={showLoginPopup}
        onClose={() => {
          trackEvent("interaction", "navbar_desktop_login_popup_close");
          setShowLoginPopup(false);
        }}
        message={loginPopupMessage}
      />
      <DesktopAddRouteModal
        isOpen={isAddRouteOpen}
        onClose={handleCloseAddRoute}
        onSuccess={() => navigate("/userroutes")}
        analyticsCategory="button_click"
        analyticsPrefix="navbar_add_route"
        idPrefix="navbar"
      />
    </motion.nav>
  );
};

export default Navbar;
