import React, { useEffect, useRef } from "react";
import styles from "./desktop-DetailOverlay.module.css";
import OverlayBreadcrumbs from "./desktop-OverlayBreadcrumbs/desktop-OverlayBreadcrumbs.tsx";

interface DetailOverlayProps {
  storageKey: string;
  children: React.ReactNode;
  isActive?: boolean;
}

const DetailOverlay: React.FC<DetailOverlayProps> = ({
  storageKey,
  children,
  isActive = true,
}) => {
  useEffect(() => {
    try {
      const key = `scroll:${storageKey}`;
      if (sessionStorage.getItem(key) === null) {
        sessionStorage.setItem(key, "0");
      }
    } catch {}
  }, [storageKey]);

  const contentWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const contentWrapper = contentWrapperRef.current;
    if (!contentWrapper) return;

    const restore = () => {
      try {
        const saved = sessionStorage.getItem(`scroll:${storageKey}`);
        const y = saved != null ? Number(saved) || 0 : 0;
        requestAnimationFrame(() => {
          contentWrapper.scrollTo({ top: y });
        });
      } catch {
        contentWrapper.scrollTo({ top: 0 });
      }
    };

    restore();

    const onScroll = () => {
      try {
        sessionStorage.setItem(
          `scroll:${storageKey}`,
          String(contentWrapper.scrollTop)
        );
      } catch {}
    };

    contentWrapper.addEventListener("scroll", onScroll);
    return () => contentWrapper.removeEventListener("scroll", onScroll);
  }, [storageKey]);

  return (
    <div
      className={styles["detail-overlay__container"]}
      style={{
        opacity: isActive ? 1 : 0,
        pointerEvents: isActive ? "auto" : "none",
      }}
    >
      <div className={styles["detail-overlay__breadcrumbs"]}>
        <OverlayBreadcrumbs />
      </div>
      <div
        ref={contentWrapperRef}
        className={styles["detail-overlay__content-wrapper"]}
      >
        {children}
      </div>
    </div>
  );
};

export default DetailOverlay;
