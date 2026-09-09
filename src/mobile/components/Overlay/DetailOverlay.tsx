import React, { useEffect, useRef } from "react";
import styles from "./DetailOverlay.module.css";

interface DetailOverlayProps {
  storageKey: string;
  children: React.ReactNode;
}

const DetailOverlay: React.FC<DetailOverlayProps> = ({
  storageKey,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const key = `scroll:${storageKey}`;
      if (sessionStorage.getItem(key) === null) {
        sessionStorage.setItem(key, "0");
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const restore = () => {
      try {
        const saved = sessionStorage.getItem(`scroll:${storageKey}`);
        const y = saved != null ? Number(saved) || 0 : 0;
        requestAnimationFrame(() => {
          container.scrollTo({ top: y });
        });
      } catch {
        container.scrollTo({ top: 0 });
      }
    };

    restore();

    const onScroll = () => {
      try {
        sessionStorage.setItem(
          `scroll:${storageKey}`,
          String(container.scrollTop)
        );
      } catch {}
    };

    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [storageKey]);

  return (
    <div ref={containerRef} className={styles["detail-overlay__container"]}>
      {children}
    </div>
  );
};

export default DetailOverlay;
