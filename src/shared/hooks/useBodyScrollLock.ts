import { useEffect } from "react";

let activeScrollLocks = 0;
let lockedScrollY = 0;
let previousStyles:
  | {
      bodyOverflow: string;
      bodyPosition: string;
      bodyTop: string;
      bodyLeft: string;
      bodyRight: string;
      bodyWidth: string;
      bodyPaddingRight: string;
      htmlOverflow: string;
    }
  | null = null;

let globalUnlockListenerAttached = false;
let globalNavigationListenerAttached = false;

const lockBodyScroll = () => {
  if (typeof window === "undefined") {
    return;
  }

  const { body, documentElement } = document;

  if (activeScrollLocks === 0) {
    lockedScrollY = window.scrollY;
    previousStyles = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyPaddingRight: body.style.paddingRight,
      htmlOverflow: documentElement.style.overflow,
    };

    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  activeScrollLocks += 1;
};

const unlockBodyScroll = () => {
  if (typeof window === "undefined" || activeScrollLocks === 0) {
    return;
  }

  activeScrollLocks -= 1;

  if (activeScrollLocks > 0) {
    return;
  }

  const { body, documentElement } = document;

  if (previousStyles) {
    documentElement.style.overflow = previousStyles.htmlOverflow;
    body.style.overflow = previousStyles.bodyOverflow;
    body.style.position = previousStyles.bodyPosition;
    body.style.top = previousStyles.bodyTop;
    body.style.left = previousStyles.bodyLeft;
    body.style.right = previousStyles.bodyRight;
    body.style.width = previousStyles.bodyWidth;
    body.style.paddingRight = previousStyles.bodyPaddingRight;
  }

  previousStyles = null;
  window.scrollTo(0, lockedScrollY);
};

export const useBodyScrollLock = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) {
      return;
    }

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [isLocked]);

  useEffect(() => {
    if (typeof window === "undefined" || globalUnlockListenerAttached) {
      return;
    }

    globalUnlockListenerAttached = true;

    const handleNavigate = () => {
      if (activeScrollLocks > 0) {
        activeScrollLocks = 0;
        previousStyles = null;
        const { body, documentElement } = document;
        body.style.overflow = "";
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.paddingRight = "";
        documentElement.style.overflow = "";
      }
    };

    window.addEventListener("popstate", handleNavigate);
    return () => {
      window.removeEventListener("popstate", handleNavigate);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || globalNavigationListenerAttached) {
      return;
    }

    globalNavigationListenerAttached = true;

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const clearLocks = () => {
      if (activeScrollLocks > 0) {
        activeScrollLocks = 0;
        previousStyles = null;
        const { body, documentElement } = document;
        body.style.overflow = "";
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.paddingRight = "";
        documentElement.style.overflow = "";
      }
    };

    window.history.pushState = function (...args) {
      clearLocks();
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      clearLocks();
      return originalReplaceState.apply(this, args);
    };

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);
};

export const closeAllModals = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("close-all-app-modals"));
  }
};
