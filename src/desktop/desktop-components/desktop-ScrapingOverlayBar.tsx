import React, { useState, useEffect } from "react";
import styles from "./desktop-ScrapingOverlayBar.module.css";
import { useScrapingOverlay } from "../desktop-context/desktop-ScrapingOverlayContext.tsx";
import { X } from "lucide-react";

const ScrapingOverlayBar: React.FC = () => {
  const { overlay, hideOverlay } = useScrapingOverlay();
  const [shouldFadeOut, setShouldFadeOut] = useState(false);

  // Auto-fade out completion overlay after 5 seconds
  useEffect(() => {
    if (overlay.visible && overlay.type === "complete") {
      const timer = setTimeout(() => {
        setShouldFadeOut(true);
        setTimeout(() => {
          hideOverlay();
          setShouldFadeOut(false);
        }, 500);
      }, 5000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [overlay.visible, overlay.type, hideOverlay]);

  if (!overlay.visible) return null;

  return (
    <div
      className={`${
        overlay.type === "scraping"
          ? styles["scrapingBar"]
          : styles["completeBar"]
      } ${shouldFadeOut ? styles["fadeOut"] : ""}`}
      role="status"
    >
      <div className={styles["content"]}>
        <div className={styles["iconContainer"]}>
          {overlay.type === "scraping" ? (
            <div className={styles["spinner"]} />
          ) : (
            <div className={styles["completeIcon"]}>✓</div>
          )}
        </div>
        <span className={`${styles["message"]} typography-desktop-body-small`}>
          {overlay.message}
        </span>
        <div className={styles["iconContainer"]}>
          <button
            className={styles["closeBtn"]}
            onClick={hideOverlay}
            aria-label="Close scraping overlay"
          >
            <X size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScrapingOverlayBar;
