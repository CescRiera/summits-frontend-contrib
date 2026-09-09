import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";
import pushNotificationManager from "./pushNotifications";

// Track registration state to prevent duplicate registrations
let isRegistering = false;
let lastRegistrationTime = 0;
const REGISTRATION_COOLDOWN = 2000; // 2 seconds cooldown between registrations

/**
 * Clear notification badges on native platforms
 * This removes the red notification count from the app icon
 */
const clearNotificationBadges = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const platform = Capacitor.getPlatform();

    if (platform === "ios") {
      // Use FirebaseAuthNative plugin for iOS
      const FirebaseAuthNative = (window as any).Capacitor?.Plugins
        ?.FirebaseAuthNative;
      if (
        FirebaseAuthNative &&
        typeof FirebaseAuthNative.clearNotificationBadges === "function"
      ) {
        await FirebaseAuthNative.clearNotificationBadges();
        console.log("[CapacitorPush] Cleared notification badges on iOS");
      } else {
        console.warn(
          "[CapacitorPush] FirebaseAuthNative plugin not available for badge clearing on iOS"
        );
      }
    } else if (platform === "android") {
      // Simple approach: remove all delivered notifications
      // This clears badges on most Android launchers
      await PushNotifications.removeAllDeliveredNotifications();
      console.log("[CapacitorPush] Cleared notification badges on Android");
    }
  } catch (error) {
    console.warn("[CapacitorPush] Failed to clear notification badges:", error);
  }
};

/**
 * Register for remote notifications on app launch
 * This must be called on EVERY app launch because device tokens can change
 * (app reinstall, device restore, OS update, etc.)
 */
const registerForRemoteNotifications = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // Prevent excessive registration attempts
  const now = Date.now();
  if (isRegistering || now - lastRegistrationTime < REGISTRATION_COOLDOWN) {
    return;
  }

  try {
    isRegistering = true;
    lastRegistrationTime = now;

    // Check if we have permission first
    const permissionStatus = await PushNotifications.checkPermissions();

    // Only register if permission is already granted
    // If not granted, we'll register when user grants permission
    if (permissionStatus.receive === "granted") {
      await PushNotifications.register();
    }
  } catch (error: any) {
    // Silently handle errors - registration will retry on next app launch
  } finally {
    isRegistering = false;
  }
};

/**
 * Initialize Capacitor push notification event listeners
 * This handles notifications when the app is in the foreground
 * and stores the registration token when received
 *
 * Also registers for remote notifications on every app launch
 * (required by Apple - device tokens can change across launches)
 */
export const initializeCapacitorPushNotifications = async () => {
  // Only initialize on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log(
      "[CapacitorPush] Not a native platform, skipping initialization"
    );
    return;
  }

  console.log("[CapacitorPush] Initializing Capacitor push notifications...");

  try {
    // Clear notification badges on app launch
    console.log(
      "[CapacitorPush] Clearing notification badges on app launch..."
    );
    await clearNotificationBadges();

    // Register for remote notifications on app launch
    // This is critical - Apple requires registration on every launch
    // because device tokens can change (app reinstall, device restore, OS update, etc.)
    console.log("[CapacitorPush] Registering for remote notifications...");
    registerForRemoteNotifications();

    // Also register when app becomes active (comes to foreground)
    // This handles cases where the app was backgrounded and token might have changed
    // Use await to fix deprecation warning
    await App.addListener("appStateChange", async (state) => {
      if (state.isActive) {
        // Clear notification badges when app becomes active
        await clearNotificationBadges();
        await registerForRemoteNotifications();
      }
    });

    // Listen for registration events (when token is received)
    // This will fire when PushNotifications.register() is called
    // According to Capacitor docs: token.value is a string containing the APNs device token
    // This is the DIRECT native iOS token from Apple APNs (no transformations)
    // Use await to fix deprecation warning
    await PushNotifications.addListener("registration", (token) => {
      const nativeTokenValue = token.value;

      // Store the token
      (pushNotificationManager as any).nativeToken = nativeTokenValue;

      // Notify pushNotificationManager that token is available
      if (
        typeof (pushNotificationManager as any).notifyTokenReceived ===
        "function"
      ) {
        (pushNotificationManager as any).notifyTokenReceived(nativeTokenValue);
      }
    });

    // Listen for registration errors
    // Use await to fix deprecation warning
    await PushNotifications.addListener("registrationError", (error) => {
      const errorMessage = error?.error || String(error);

      // Notify pushNotificationManager of the error
      if (
        typeof (pushNotificationManager as any).notifyRegistrationError ===
        "function"
      ) {
        (pushNotificationManager as any).notifyRegistrationError(
          new Error(errorMessage)
        );
      }
    });

    // Listen for push notifications received (when app is in foreground)
    // Use await to fix deprecation warning
    await PushNotifications.addListener(
      "pushNotificationReceived",
      async (notification) => {
        // Log full notification data for debugging
        console.error("[CapacitorPush] ===== PUSH NOTIFICATION RECEIVED =====");
        console.error(
          "[CapacitorPush] Full data:",
          JSON.stringify(notification.data, null, 2)
        );
        console.error(
          "[CapacitorPush] url:",
          notification.data?.url,
          "activityId:",
          notification.data?.activityId,
          "route_id:",
          notification.data?.route_id
        );
        // The notification is displayed by the system via presentationOptions in capacitor.config.ts

        // Clear notification badges when receiving new notifications
        // This handles cases where app is in foreground and badges accumulate
        await clearNotificationBadges();
      }
    );

    // Listen for push notification actions (when user taps notification)
    // Use await to fix deprecation warning
    console.log(
      "[CapacitorPush] Setting up pushNotificationActionPerformed listener..."
    );
    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      async (action) => {
        // Log immediately with error level to ensure visibility
        console.error("[CapacitorPush] ===== NOTIFICATION CLICKED =====");
        console.error(
          "[CapacitorPush] Full action object:",
          JSON.stringify(action, null, 2)
        );

        // Clear notification badges when user interacts with notification
        await clearNotificationBadges();

        // Extract data from the notification
        // Note: ActionPerformed may have data in notification.data or as a separate property
        const data =
          (action.notification?.data as Record<string, unknown>) || {};

        // Log full notification data for debugging
        console.error(
          "[CapacitorPush] Notification data:",
          JSON.stringify(data, null, 2)
        );

        // Store in localStorage for persistence (can check later)
        try {
          localStorage.setItem(
            "lastNotificationData",
            JSON.stringify({
              timestamp: new Date().toISOString(),
              data: data,
              fullAction: action,
            })
          );
        } catch (e) {
          console.error("[CapacitorPush] Failed to store in localStorage:", e);
        }

        const notificationType = data?.["type"];

        // Determine navigation URL based on notification type
        let url = "/";

        if (
          notificationType === "followRequest" ||
          notificationType === "followAccepted" ||
          notificationType === "requestAccepted"
        ) {
          url = "/profile";
          console.error(
            "[CapacitorPush] Follow request notification, navigating to profile"
          );
        } else {
          // For activity notifications, check for URL, activityId, or route_id
          const urlFromData = data?.["url"];
          const activityId = data?.["activityId"];
          const routeId = data?.["route_id"];

          // Log all available data
          console.error(
            "[CapacitorPush] Route notification data - url:",
            urlFromData,
            "activityId:",
            activityId,
            "route_id:",
            routeId
          );

          // Priority: 1. Use data.url if provided, 2. Construct from activityId/route_id, 3. Fallback to home
          if (urlFromData && typeof urlFromData === "string") {
            // If url is already absolute, use it directly; otherwise use as relative path
            if (
              urlFromData.startsWith("http://") ||
              urlFromData.startsWith("https://")
            ) {
              // Absolute URL - extract pathname for navigation
              try {
                const urlObj = new URL(urlFromData);
                url = urlObj.pathname;
                console.error(
                  "[CapacitorPush] Using pathname from absolute URL:",
                  url
                );
              } catch (e) {
                console.error(
                  "[CapacitorPush] Invalid absolute URL, using as-is:",
                  urlFromData
                );
                url = urlFromData;
              }
            } else {
              // Relative URL - use directly
              url = urlFromData.startsWith("/")
                ? urlFromData
                : `/${urlFromData}`;
              console.error("[CapacitorPush] Using URL from data.url:", url);
            }
          } else {
            // Use route_id if activityId is not available
            const idToUse =
              (typeof activityId === "string" ? activityId : null) ||
              (typeof routeId === "string" ? routeId : null);
            console.error(
              "[CapacitorPush] Using route ID for navigation:",
              idToUse
            );

            if (idToUse) {
              url = `/routes/${idToUse}`;
            } else {
              console.error(
                "[CapacitorPush] WARNING: No route ID found! activityId:",
                activityId,
                "route_id:",
                routeId
              );
            }
          }

          console.error("[CapacitorPush] Final navigation URL:", url);
        }

        // Use window.location for reliable navigation across app states
        window.location.href = url;
      }
    );
    console.log(
      "[CapacitorPush] pushNotificationActionPerformed listener registered successfully"
    );
  } catch (error) {
    // Silently handle initialization errors
  }
};
