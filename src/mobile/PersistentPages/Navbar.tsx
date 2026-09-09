import React from "react";
import { motion } from "framer-motion";
import { Home, Compass, Map, User, Trophy } from "lucide-react";
import { useI18n } from "../../shared/context/I18nContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useAnalytics } from "../../shared/context/AnalyticsContext";
import styles from "./Navbar.module.css";

export type PageType = "home" | "explore" | "map" | "profile" | "leaderboard";

interface NavbarProps {
  currentPage?: PageType;
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, className }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackEvent } = useAnalytics();

  // Determine current page from location if not provided
  const getCurrentPageFromLocation = (): PageType => {
    const path = location.pathname;
    if (path === "/") return "home";
    if (path === "/explore") return "explore";
    if (path === "/map") return "map";
    if (path === "/leaderboard") return "leaderboard";
    if (path === "/profile") return "profile";
    return "home";
  };

  const activePage = currentPage || getCurrentPageFromLocation();

  const navItems = [
    { key: "home", label: t("navigation.home"), icon: <Home size={22} /> },
    {
      key: "explore",
      label: t("navigation.discover"),
      icon: <Compass size={22} />,
    },
    {
      key: "map",
      label: t("navigation.map"),
      icon: <Map size={22} />,
    },
    {
      key: "leaderboard",
      label: t("navigation.leaderboard"),
      icon: <Trophy size={22} />,
    },
    {
      key: "profile",
      label: t("navigation.profile"),
      icon: <User size={22} />,
    },
  ];

  const handleNavClick = (page: PageType) => {
    try {
      // Track navigation click
      trackEvent("button_click", `navbar_${page}`);
      
      // Navigate using React Router for all pages
      const routes: Record<PageType, string> = {
        home: "/",
        explore: "/explore",
        map: "/map",
        profile: "/profile",
        leaderboard: "/leaderboard",
      };
      navigate(routes[page]);
    } catch {
      // Optionally handle error
    }
  };

  return (
    <nav className={styles["navbar"] + (className ? ` ${className}` : "")}>
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
              onClick={() => handleNavClick(item.key as PageType)}
            >
              <motion.span
                className={styles["navbar__icon"]}
                whileTap={{ scale: 0.95 }}
                animate={
                  activePage === item.key ? { scale: 1.1 } : { scale: 1 }
                }
                transition={{ type: "spring", stiffness: 300 }}
              >
                {item.icon}
              </motion.span>
              <span
                className={styles["navbar__label"] + " typography-label-medium"}
              >
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
