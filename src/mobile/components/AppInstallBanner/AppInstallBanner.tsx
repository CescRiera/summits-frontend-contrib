import React, { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { X } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import {
  ANDROID_APP_PACKAGE_ID,
  APP_NAME,
  getNativeStoreUrl,
} from "../../../shared/constants/storeLinks";
import styles from "./AppInstallBanner.module.css";

type MobileWebPlatform = "android" | "ios";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }

  interface Navigator {
    getInstalledRelatedApps?: () => Promise<
      Array<{
        id?: string;
        platform: string;
        url?: string;
      }>
    >;
    standalone?: boolean;
  }
}

const DISMISS_KEY = "summits_install_banner_dismissed_at";
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FALLBACK_DELAY_MS = 1500;

const isIOSDevice = (userAgent: string) => {
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return true;
  }

  return (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
};

const getMobileWebPlatform = (): {
  isSafari: boolean;
  platform: MobileWebPlatform | null;
} => {
  const userAgent = navigator.userAgent;
  const platform = /Android/i.test(userAgent)
    ? "android"
    : isIOSDevice(userAgent)
      ? "ios"
      : null;

  const isSafari =
    /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(userAgent);

  return {
    isSafari,
    platform,
  };
};

const wasDismissedRecently = () => {
  try {
    const rawTimestamp = localStorage.getItem(DISMISS_KEY);
    if (!rawTimestamp) {
      return false;
    }

    const dismissedAt = Number(rawTimestamp);
    if (!Number.isFinite(dismissedAt)) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }

    if (Date.now() - dismissedAt < DISMISS_TTL_MS) {
      return true;
    }

    localStorage.removeItem(DISMISS_KEY);
    return false;
  } catch {
    return false;
  }
};

const markDismissed = () => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures so the CTA can still be used.
  }
};

const isStandaloneWebApp = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true
  );
};

const AppInstallBanner: React.FC = () => {
  const { t } = useI18n();
  const [platform, setPlatform] = useState<MobileWebPlatform | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      return;
    }

    if (wasDismissedRecently() || isStandaloneWebApp()) {
      return;
    }

    const { isSafari, platform: detectedPlatform } = getMobileWebPlatform();
    if (!detectedPlatform) {
      return;
    }

    setPlatform(detectedPlatform);

    if (detectedPlatform === "ios" && isSafari) {
      return;
    }

    let isCancelled = false;
    let fallbackTimer: number | null = null;

    const showBanner = () => {
      if (!isCancelled) {
        setIsVisible(true);
      }
    };

    const checkInstalledApps = async () => {
      if (
        detectedPlatform !== "android" ||
        typeof navigator.getInstalledRelatedApps !== "function"
      ) {
        return false;
      }

      try {
        const relatedApps = await navigator.getInstalledRelatedApps();
        return relatedApps.some(
          (app) =>
            app.platform === "play" && app.id === ANDROID_APP_PACKAGE_ID
        );
      } catch {
        return false;
      }
    };

    const handleBeforeInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      showBanner();
    };

    if (detectedPlatform === "android") {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    }

    void (async () => {
      const hasInstalledRelatedApp = await checkInstalledApps();
      if (hasInstalledRelatedApp || isCancelled) {
        return;
      }

      fallbackTimer = window.setTimeout(showBanner, FALLBACK_DELAY_MS);
    })();

    return () => {
      isCancelled = true;
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      if (detectedPlatform === "android") {
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt
        );
      }
    };
  }, []);

  const handleClose = () => {
    markDismissed();
    setIsVisible(false);
  };

  const handleInstall = async () => {
    if (!platform) {
      return;
    }

    if (platform === "android" && deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        setDeferredPrompt(null);

        if (choice.outcome === "accepted") {
          markDismissed();
          setIsVisible(false);
        }
        return;
      } catch {
        setDeferredPrompt(null);
      }
    }

    window.location.assign(getNativeStoreUrl(platform));
  };

  if (!platform || !isVisible) {
    return null;
  }

  return (
    <div
      className={styles["banner"]}
      role="dialog"
      aria-modal="false"
      aria-label={t("appInstallBanner.title")}
    >
      <div className={styles["iconWrapper"]}>
        <img
          src="/icon-192.webp"
          alt={`${APP_NAME} icon`}
          className={styles["icon"]}
        />
      </div>

      <div className={styles["copy"]}>
        <div className={`${styles["title"]} typography-title-small`}>
          {t("appInstallBanner.title")}
        </div>
        <div className={`${styles["subtitle"]} typography-body-small`}>
          {t("appInstallBanner.subtitle")}
        </div>
      </div>

      <button
        type="button"
        className={`${styles["cta"]} typography-button-small`}
        onClick={handleInstall}
      >
        {t("appInstallBanner.button")}
      </button>

      <button
        type="button"
        className={styles["closeButton"]}
        onClick={handleClose}
        aria-label={t("appInstallBanner.dismiss")}
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default AppInstallBanner;
