import React, { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import AppModal from "../../../shared/components/AppModal";
import { getUserDetails } from "../../../shared/api/endpoints/user";
import { toggleNotificationPreference } from "../../../shared/api/endpoints/pushNotifications";
import pushNotificationManager from "../../../shared/utils/pushNotifications";
import type { UserDetails } from "../../../shared/api/types";
import styles from "./NotificationsOptInPopup.module.css";

const PROMPT_DELAY_MS = 3 * 60 * 1000;
const DISMISS_KEY = "cimloc_notifications_opt_in_dismissed";

const normalizeNotificationsEnabled = (
  value: UserDetails["notifications_enabled"]
) => {
  const raw = value as unknown;
  return (
    value === true ||
    (typeof raw === "string" && raw === "true") ||
    (typeof raw === "number" && raw === 1)
  );
};

const NotificationsOptInPopup: React.FC = () => {
  const { t } = useI18n();
  const { user, authReady } = useAuth();
  const { trackEvent } = useAnalytics();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    "granted" | "denied" | "prompt" | null
  >(null);
  // null = no feedback yet, "waiting" = native prompt shown, "enabled" = success
  const [feedbackState, setFeedbackState] = useState<
    "waiting" | "enabled" | null
  >(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Tracks when the user first became eligible, so the 3-min delay
  // starts from that point rather than from component mount.
  const eligibleAtRef = useRef<number | null>(null);
  const dismissedRef = useRef(false);
  const hasPromptedRef = useRef(false);

  useEffect(() => {
    try {
      dismissedRef.current = localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      dismissedRef.current = false;
    }
  }, []);

  const markDismissed = useCallback(() => {
    dismissedRef.current = true;
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {}
  }, []);

  const closePrompt = useCallback(() => {
    markDismissed();
    setIsOpen(false);
  }, [markDismissed]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    trackEvent("popup_view", "notifications_opt_in_prompt");
  }, [isOpen, trackEvent]);

  const refreshPermissionStatus = useCallback(async () => {
    const supported = pushNotificationManager.isSupported();
    setIsSupported(supported);

    try {
      const status = await pushNotificationManager.getPermissionStatus();
      setPermissionStatus(status);
      return status;
    } catch {
      setPermissionStatus("prompt");
      return "prompt" as const;
    }
  }, []);

  const checkEligibility = useCallback(async () => {
    if (!authReady || !user) return false;
    if (dismissedRef.current || hasPromptedRef.current) return false;
    if (user.type !== "strava" && user.type !== "garmin") return false;

    try {
      const details = await getUserDetails();
      const enabledPreference = normalizeNotificationsEnabled(
        details.notifications_enabled
      );
      const permission = await refreshPermissionStatus();
      const notificationsOn = enabledPreference && permission === "granted";
      setIsEnabled(notificationsOn);
      return !notificationsOn;
    } catch {
      return false;
    }
  }, [authReady, user, refreshPermissionStatus]);

  const maybeOpenPrompt = useCallback(async () => {
    const shouldOpen = await checkEligibility();
    if (shouldOpen) {
      hasPromptedRef.current = true;
      setIsOpen(true);
    }
  }, [checkEligibility]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setIsOpen(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      // Reset eligibility timestamp so the timer restarts fresh on next login
      eligibleAtRef.current = null;
      return;
    }
    if (dismissedRef.current || hasPromptedRef.current) return;
    if (user.type !== "strava" && user.type !== "garmin") return;

    // Record the moment the user first becomes eligible (only once).
    // The 3-minute delay counts from this point, not from component mount.
    if (eligibleAtRef.current === null) {
      eligibleAtRef.current = Date.now();
    }

    const elapsed = Date.now() - eligibleAtRef.current;
    const delay = Math.max(0, PROMPT_DELAY_MS - elapsed);

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      maybeOpenPrompt();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [authReady, user, maybeOpenPrompt]);

  const handleToggle = async () => {
    if (isLoading || isEnabled) return;
    if (!isSupported) return;

    try {
      setIsLoading(true);
      trackEvent("button_click", "notifications_opt_in_toggle");
      const currentPermission = await refreshPermissionStatus();

      if (currentPermission !== "granted") {
        // Show "waiting" state while the native OS permission prompt is open
        setFeedbackState("waiting");
        const hasPermission = await pushNotificationManager.requestPermission();
        pushNotificationManager.clearPermissionCache();
        const updatedPermission = await refreshPermissionStatus();

        if (!hasPermission || updatedPermission !== "granted") {
          trackEvent("interaction", "notifications_opt_in_permission_denied");
          setIsEnabled(false);
          setFeedbackState(null);
          return;
        }
      }

      await pushNotificationManager.subscribe();
      await toggleNotificationPreference(true);
      setIsEnabled(true);
      setFeedbackState("enabled");
      trackEvent("interaction", "notifications_opt_in_enabled");
      markDismissed();

      // Give the user a moment to see the "Enabled" confirmation before closing
      setTimeout(() => {
        setIsOpen(false);
      }, 1500);
    } catch (error) {
      trackEvent("interaction", "notifications_opt_in_enable_failed");
      setFeedbackState(null);
      console.error("Failed to enable notifications from prompt:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseButton = () => {
    trackEvent("button_click", "notifications_opt_in_close_button");
    closePrompt();
  };

  const statusText = () => {
    if (!isSupported) {
      return t("profile.notifications.notificationsNotSupported");
    }
    if (permissionStatus === "denied") {
      return t("profile.notifications.notificationsPermissionDenied");
    }
    return isEnabled && permissionStatus === "granted"
      ? t("profile.notifications.notificationsEnabled")
      : t("profile.notifications.notificationsDisabled");
  };

  const statusClass = () => {
    if (!isSupported) return styles["toggleStatus--unsupported"];
    if (permissionStatus === "denied") return styles["toggleStatus--denied"];
    return isEnabled && permissionStatus === "granted"
      ? styles["toggleStatus--enabled"]
      : styles["toggleStatus--disabled"];
  };

  const toggleDisabled =
    isLoading || permissionStatus === "denied" || !isSupported;

  return (
    <AppModal
      open={isOpen}
      onClose={() => {
        trackEvent("button_click", "notifications_opt_in_close_modal");
        closePrompt();
      }}
      variant="dialog"
      ariaLabel={t("profile.notifications.notifications")}
      contentClassName={styles["popup"]}
    >
        <button
          className={styles["closeButton"]}
          onClick={handleCloseButton}
          aria-label="Close popup"
        >
          <X size={20} />
        </button>
        <div className={styles["content"]}>
          <h2 className={`${styles["title"]} typography-title-medium`}>
            {t("profile.notifications.notifications")}
          </h2>
          <p className={`${styles["message"]} typography-body-medium`}>
            {t("auth.receiveNotificationsOnPeaks")}
          </p>

          {/* Feedback banner shown while waiting for OS prompt or after success */}
          {feedbackState === "waiting" && (
            <p className={`${styles["feedbackBanner"]} ${styles["feedbackBanner--waiting"]} typography-body-small`}>
              {t("profile.notifications.waitingForPermission") ??
                "Waiting for permission…"}
            </p>
          )}
          {feedbackState === "enabled" && (
            <p className={`${styles["feedbackBanner"]} ${styles["feedbackBanner--enabled"]} typography-body-small`}>
              {t("profile.notifications.notificationsEnabled") ??
                "Notifications enabled ✓"}
            </p>
          )}

          <label className={styles["toggleRow"]}>
            <div className={styles["toggleText"]}>
              <span className={`${styles["toggleLabel"]} typography-label-medium`}>
                {t("profile.notifications.notifications")}
              </span>
              <span
                className={`${styles["toggleStatus"]} ${statusClass()} typography-body-small`}
              >
                {statusText()}
              </span>
            </div>
            <input
              className={styles["toggleInput"]}
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggle}
              disabled={toggleDisabled}
              aria-label={t("profile.notifications.notifications")}
            />
          </label>
        </div>
    </AppModal>
  );
};

export default NotificationsOptInPopup;
