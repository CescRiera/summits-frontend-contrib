import React, { useEffect, useState } from "react";
import { LogIn, Compass } from "lucide-react";
import styles from "./LandingPageOverlay.module.css";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";

const LANDING_COMPLETED_KEY = "cimloc_landing_completed";

const LandingPageOverlay: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isVisible, setIsVisible] = useState(false);

  // Check if landing page should be shown
  useEffect(() => {
    try {
      const landingCompleted = localStorage.getItem(LANDING_COMPLETED_KEY);
      setIsVisible(!landingCompleted);
    } catch {
      setIsVisible(true);
    }
  }, []);

  // Manage body overflow based on visibility
  useEffect(() => {
    if (isVisible) {
      // Prevent scrolling on the background
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      // Restore scrolling
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }

    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isVisible]);

  const markLandingCompleted = () => {
    try {
      localStorage.setItem(LANDING_COMPLETED_KEY, "true");
    } catch {}
    setIsVisible(false);
    // Body overflow will be restored by the useEffect watching isVisible
  };

  const handleButtonClick = (route: string) => {
    markLandingCompleted();
    navigate(route);
  };

  const close = () => {
    markLandingCompleted();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles["landing-overlay"]} onClick={close}>
      {/* Content Container */}
      <div
        className={styles["landing-overlay__content"]}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Content - Centered Title */}
        <div className={styles["landing-overlay__main-content"]}>
          <div className={styles["landing-overlay__title-section"]}>
            <h1 className={`${styles["landing-overlay__title"]} typography-display-large`}>SUMMITS</h1>
            <p
              className={`${styles["landing-overlay__subtitle"]} typography-body-medium`}
            >
              {t("landing.subtitle", undefined) ||
                "Discover • Explore • Conquer"}
            </p>
          </div>
        </div>

        {/* Register Section - Fixed at Bottom */}
        <div className={styles["landing-overlay__register-section"]}>
          <div className={styles["landing-overlay__register-buttons"]}>
            <button
              className={styles["landing-overlay__btn-primary"]}
              onClick={() => handleButtonClick("/")}
            >
              <Compass size={20} />
              <span className="typography-button-medium">
                {t("landing.startExploring", undefined) || "Explore"}
              </span>
            </button>
            <div className={styles["landing-overlay__button-divider"]}></div>
            <button
              className={styles["landing-overlay__btn-primary"]}
              onClick={() => handleButtonClick("/register")}
            >
              <LogIn size={20} />
              <span className="typography-button-medium">
                {t("auth.signUp", undefined) || "Sign up"}
              </span>
            </button>
          </div>
          <p
            className={`${styles["landing-overlay__register-text"]} typography-body-small`}
          >
            {t("landing.wikilocText", undefined) ||
              "Registrat amb el teu compte de Wikiloc, Strava o Garmin, per poder veure quins cims has pujat en totes les teves rutes!"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPageOverlay;
