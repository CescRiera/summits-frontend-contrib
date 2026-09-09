import React, { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import { toggleNotificationPreference } from "../../../../shared/api/endpoints/pushNotifications";
import pushNotificationManager from "../../../../shared/utils/pushNotifications";
import type { UserDetails } from "../../../../shared/api/types";
import styles from "./NotificationToggle.module.css";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";

interface NotificationToggleProps {
  userDetails?: UserDetails | null | undefined;
  onNotificationChange?: ((enabled: boolean) => void) | undefined;
  onRefreshUserDetails?: (() => Promise<void>) | undefined;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
  userDetails,
  onNotificationChange,
  onRefreshUserDetails,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionStatus, setPermissionStatus] =
    useState<"granted" | "denied" | "prompt" | null>(null);

  useEffect(() => {
    // Check if notifications are supported on this platform
    const supported = pushNotificationManager.isSupported();
    setIsSupported(supported);

    if (!supported) {
      return;
    }

    // Check permission status (works for both web and native)
    const checkPermission = async () => {
      try {
        const status = await pushNotificationManager.getPermissionStatus();
        setPermissionStatus(status);
      } catch (error) {
        console.error("Error checking notification permission:", error);
        setPermissionStatus("prompt");
      }
    };

    checkPermission();

    // Don't update state if userDetails is not loaded yet
    if (!userDetails) {
      return;
    }

    // Use user's preference from backend as the source of truth
    // Handle both boolean and string values (in case backend returns string)
    const rawPreference = userDetails.notifications_enabled;
    // Handle boolean, string, or number values (defensive programming)
    // Cast to unknown first to allow type checking for defensive programming
    const rawPreferenceUnknown = rawPreference as unknown;
    const userPreference =
      rawPreference === true ||
      (typeof rawPreferenceUnknown === "string" &&
        rawPreferenceUnknown === "true") ||
      (typeof rawPreferenceUnknown === "number" && rawPreferenceUnknown === 1);


    // Only enable if BOTH backend preference is true AND device has granted permissions
    // This ensures that when signing in on a different device, it shows as disabled
    // if that device doesn't have permissions, even if the backend says enabled
    const checkEnabled = async () => {
      const currentPermission = await pushNotificationManager.getPermissionStatus();
      const shouldBeEnabled = userPreference && currentPermission === "granted";
      setIsEnabled(shouldBeEnabled);
    };

    checkEnabled();

    // Optionally sync subscription state with user preference in the background
    // but don't let it override the UI state
    const syncSubscription = async () => {
      try {
        const subscribed = await pushNotificationManager.isSubscribed();
        const currentPermission = await pushNotificationManager.getPermissionStatus();

        if (userPreference && !subscribed && currentPermission === "granted") {
          // User wants notifications enabled but isn't subscribed yet
          // Try to subscribe silently in the background
          try {
            await pushNotificationManager.subscribe();
          } catch (error) {
            console.error("Error subscribing to notifications:", error);
          }
        } else if (!userPreference && subscribed) {
          // User wants notifications disabled but still subscribed
          // Unsubscribe to sync state
          try {
            await pushNotificationManager.unsubscribe();
          } catch (error) {
            console.error("Error unsubscribing from notifications:", error);
          }
        }
      } catch (error) {
        console.error("Error syncing subscription status:", error);
      }
    };

    syncSubscription();
  }, [userDetails, permissionStatus]);

  const handleToggle = async () => {
    if (!isSupported) {
      return;
    }

    try {
      setIsLoading(true);
      trackEvent("button_click", "profile_menu_notification_toggle");

      if (isEnabled) {
        // Disable notifications
        await pushNotificationManager.unsubscribe();
        await toggleNotificationPreference(false);
        setIsEnabled(false);
        onNotificationChange?.(false);
        // Refresh userDetails to get updated state from backend
        await onRefreshUserDetails?.();
      } else {
        // Enable notifications
        // First check current permission status (works for both web and native)
        const currentPermission = await pushNotificationManager.getPermissionStatus();

        // If permission is not granted, request it
        if (currentPermission !== "granted") {
          console.log("📱 Requesting notification permission...", {
            currentPermission,
          });
          const hasPermission =
            await pushNotificationManager.requestPermission();

          // Update permission status after request (clear cache first to get fresh status)
          pushNotificationManager.clearPermissionCache();
          const updatedPermission = await pushNotificationManager.getPermissionStatus();
          setPermissionStatus(updatedPermission);

          console.log("📱 Permission request result:", {
            hasPermission,
            updatedPermission,
          });

          if (!hasPermission) {
            console.log("📱 Permission not granted, stopping subscription");
            setIsLoading(false);
            return;
          }
        }

        // Subscribe to push notifications
        console.log("📱 Subscribing to push notifications...");
        await pushNotificationManager.subscribe();
        await toggleNotificationPreference(true);
        setIsEnabled(true);
        onNotificationChange?.(true);
        // Refresh userDetails to get updated state from backend
        await onRefreshUserDetails?.();
      }
    } catch (error) {
      console.error("Failed to toggle notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <button className={styles["notification-toggle"]} disabled>
        <div className={styles["notification-toggle__icon"]}>
          <BellOff size={20} />
        </div>
        <span
          className={`${styles["notification-toggle__label"]} typography-label-large`}
        >
          {t("profile.notifications.notifications")}
        </span>
        <span
          className={`${styles["notification-toggle__status"]} ${styles["notification-toggle__status--unsupported"]}`}
        >
          {t("profile.notifications.notificationsNotSupported")}
        </span>
      </button>
    );
  }

  const getStatusText = () => {
    if (permissionStatus === "denied") {
      return t("profile.notifications.notificationsPermissionDenied");
    }
    // Show enabled only if both backend preference and device permission are true
    const actualEnabled = isEnabled && permissionStatus === "granted";
    return actualEnabled
      ? t("profile.notifications.notificationsEnabled")
      : t("profile.notifications.notificationsDisabled");
  };

  const getStatusClass = () => {
    if (permissionStatus === "denied") {
      return styles["notification-toggle__status--denied"];
    }
    // Show enabled only if both backend preference and device permission are true
    const actualEnabled = isEnabled && permissionStatus === "granted";
    return actualEnabled
      ? styles["notification-toggle__status--enabled"]
      : styles["notification-toggle__status--disabled"];
  };

  return (
    <button
      className={styles["notification-toggle"]}
      onClick={handleToggle}
      disabled={isLoading || permissionStatus === "denied"}
    >
      <div className={styles["notification-toggle__icon"]}>
        {isEnabled && permissionStatus === "granted" ? (
          <Bell size={20} />
        ) : (
          <BellOff size={20} />
        )}
      </div>
      <span
        className={`${styles["notification-toggle__label"]} typography-label-large`}
      >
        {t("profile.notifications.notifications")}
      </span>
      <span
        className={`${
          styles["notification-toggle__status"]
        } ${getStatusClass()}`}
      >
        {getStatusText()}
      </span>
    </button>
  );
};

export default NotificationToggle;
