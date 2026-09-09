import { Capacitor } from "@capacitor/core";
import { useEffect, useRef } from "react";
import { NativePullToRefresh } from "../../capacitor-plugins/native-pull-to-refresh";

const NATIVE_PULL_TO_REFRESH_EXACT_PATHS = new Set([
  "/",
  "/explore",
  "/leaderboard",
  "/profile",
  
]);

/** Paths that also match with a trailing segment, e.g. `/peaks/123`. */
const NATIVE_PULL_TO_REFRESH_PREFIX_PATHS = [
  "/peaks/",

];

const isNativePullToRefreshPath = (pathname: string): boolean =>
  NATIVE_PULL_TO_REFRESH_EXACT_PATHS.has(pathname) ||
  NATIVE_PULL_TO_REFRESH_PREFIX_PATHS.some((prefix) =>
    pathname.startsWith(prefix)
  );

const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "scroll", "overlay"]);

const waitForRefreshPaint = () =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });

const isPullToRefreshDisabledByTarget = (
  startTarget: EventTarget | null
): boolean => {
  if (!(startTarget instanceof HTMLElement)) return false;
  let current: HTMLElement | null = startTarget;
  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    if (current.hasAttribute("data-disable-pull-to-refresh")) return true;
    current = current.parentElement;
  }
  return false;
};

const findNestedScrollableContainer = (
  startTarget: EventTarget | null
): HTMLElement | null => {
  if (!(startTarget instanceof HTMLElement)) {
    return null;
  }

  let currentElement: HTMLElement | null = startTarget;

  while (
    currentElement &&
    currentElement !== document.body &&
    currentElement !== document.documentElement
  ) {
    const computedStyle = window.getComputedStyle(currentElement);

    if (
      SCROLLABLE_OVERFLOW_VALUES.has(computedStyle.overflowY) &&
      currentElement.scrollHeight > currentElement.clientHeight + 1
    ) {
      return currentElement;
    }

    currentElement = currentElement.parentElement;
  }

  return null;
};

export function useNativePullToRefresh(pathname: string, search = "") {
  const isNative = Capacitor.isNativePlatform();
  const isAndroidNative = isNative && Capacitor.getPlatform() === "android";
  // Disable pull-to-refresh on the leaderboard world tab – the globe view
  // has its own non-refreshable content and the gesture conflicts with it.
  const isLeaderboardWorldTab =
    pathname === "/leaderboard" &&
    new URLSearchParams(search).get("tab") === "world";

  const isNativePullToRefreshEnabled =
    isNative &&
    isNativePullToRefreshPath(pathname) &&
    !isLeaderboardWorldTab;

  // Track open AppModal count so we can suppress pull-to-refresh while any
  // modal overlay is visible.
  const openModalCountRef = useRef(0);

  useEffect(() => {
    if (!isNative) return;

    const handleModalOpened = () => {
      openModalCountRef.current += 1;
      if (openModalCountRef.current === 1 && isNativePullToRefreshEnabled) {
        void NativePullToRefresh.setEnabled({ enabled: false }).catch(() => {});
      }
    };

    const handleModalClosed = () => {
      openModalCountRef.current = Math.max(0, openModalCountRef.current - 1);
      if (openModalCountRef.current === 0 && isNativePullToRefreshEnabled) {
        void NativePullToRefresh.setEnabled({ enabled: true }).catch(() => {});
      }
    };

    window.addEventListener("app-modal-opened", handleModalOpened);
    window.addEventListener("app-modal-closed", handleModalClosed);

    return () => {
      window.removeEventListener("app-modal-opened", handleModalOpened);
      window.removeEventListener("app-modal-closed", handleModalClosed);
      openModalCountRef.current = 0;
    };
  }, [isNative, isNativePullToRefreshEnabled]);

  useEffect(() => {
    if (!isNative) return;

    const handleNativePullToRefresh = async () => {
      // Guard: skip refresh if a modal is currently open
      if (openModalCountRef.current > 0) {
        await NativePullToRefresh.complete().catch(() => {});
        return;
      }

      try {
        window.dispatchEvent(new CustomEvent("refresh-keepalive-pages"));
        await waitForRefreshPaint();
      } finally {
        await NativePullToRefresh.complete().catch((error) => {
          console.warn("Failed to complete native pull-to-refresh:", error);
        });
      }
    };

    window.addEventListener(
      "native-pull-to-refresh",
      handleNativePullToRefresh
    );

    return () => {
      window.removeEventListener(
        "native-pull-to-refresh",
        handleNativePullToRefresh
      );
      void NativePullToRefresh.complete().catch(() => {});
    };
  }, [isNative]);

  useEffect(() => {
    void NativePullToRefresh.setEnabled({
      enabled: isNativePullToRefreshEnabled,
    }).catch((error) => {
      console.warn("Failed to update native pull-to-refresh state:", error);
    });

    return () => {
      void NativePullToRefresh.setEnabled({ enabled: false }).catch(() => {});
      void NativePullToRefresh.complete().catch(() => {});
    };
  }, [isNativePullToRefreshEnabled]);

  useEffect(() => {
    if (!isAndroidNative || !isNativePullToRefreshEnabled) return;

    let isNestedScrollInteraction = false;
    let startX = 0;
    let startY = 0;
    let directionDetermined = false;
    let disabledByHorizontalDrag = false;

    const handleTouchStart = (event: TouchEvent) => {
      directionDetermined = false;
      disabledByHorizontalDrag = false;

      if (event.touches.length > 0) {
        const touch = event.touches[0];
        if (touch) {
          startX = touch.clientX;
          startY = touch.clientY;
        }
      }

      if (
        isPullToRefreshDisabledByTarget(event.target) ||
        findNestedScrollableContainer(event.target)
      ) {
        isNestedScrollInteraction = true;
        void NativePullToRefresh.setEnabled({ enabled: false }).catch(() => {});
      } else {
        isNestedScrollInteraction = false;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (
        isNestedScrollInteraction ||
        directionDetermined ||
        event.touches.length === 0
      ) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) return;

      const currentX = touch.clientX;
      const currentY = touch.clientY;
      const deltaX = Math.abs(currentX - startX);
      const deltaY = Math.abs(currentY - startY);

      if (deltaX > 5 || deltaY > 5) {
        directionDetermined = true;
        if (deltaX > deltaY) {
          disabledByHorizontalDrag = true;
          void NativePullToRefresh.setEnabled({ enabled: false }).catch(() => {});
        }
      }
    };

    const handleTouchEnd = () => {
      if (isNestedScrollInteraction || disabledByHorizontalDrag) {
        void NativePullToRefresh.setEnabled({ enabled: true }).catch(() => {});
      }

      isNestedScrollInteraction = false;
      disabledByHorizontalDrag = false;
      directionDetermined = false;
    };

    window.addEventListener("touchstart", handleTouchStart, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchmove", handleTouchMove, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchend", handleTouchEnd, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchcancel", handleTouchEnd, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart, {
        capture: true,
      });
      window.removeEventListener("touchmove", handleTouchMove, {
        capture: true,
      });
      window.removeEventListener("touchend", handleTouchEnd, {
        capture: true,
      });
      window.removeEventListener("touchcancel", handleTouchEnd, {
        capture: true,
      });
    };
  }, [isAndroidNative, isNativePullToRefreshEnabled]);
}
