import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Initialize deep link handling for mobile app
 * This handles OAuth callbacks and other deep links from the backend
 */
export const initializeDeepLinkHandler = (
  onDeepLink: (url: string) => void
) => {
  // Only initialize on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Handle app opened via deep link (when app is closed)
    App.addListener("appUrlOpen", (event: { url: string }) => {
      const url = event.url;
      console.log("App opened via deep link:", url);
      onDeepLink(url);
    });

    // Handle app state changes (when app is already open)
    App.addListener("appStateChange", (state: { isActive: boolean }) => {
      if (state.isActive) {
        // App became active - check if we have a pending deep link
        // This is useful for handling links when app is in background
        console.log("App state changed to active");
      }
    });
  } catch (error) {
    console.error("Error initializing deep link handler:", error);
  }
};

/**
 * Parse a deep link URL and extract path and query parameters
 * Supports both custom schemes (summitstracker://) and Universal Links (https://summitstracker.com)
 */
export const parseDeepLink = (url: string): {
  path: string;
  queryParams: URLSearchParams;
} | null => {
  try {
    // Handle custom scheme URLs (summitstracker://path?params)
    if (url.startsWith("summitstracker://")) {
      const urlWithoutScheme = url.replace("summitstracker://", "");
      const [path, queryString] = urlWithoutScheme.split("?");
      const queryParams = new URLSearchParams(queryString || "");
      return {
        path: path || "/",
        queryParams,
      };
    }

    // Handle Universal Links (https://summitstracker.com/path?params)
    if (url.includes("summitstracker.com")) {
      const urlObj = new URL(url);
      return {
        path: urlObj.pathname,
        queryParams: urlObj.searchParams,
      };
    }

    return null;
  } catch (error) {
    console.error("Error parsing deep link:", error);
    return null;
  }
};

/**
 * Convert a deep link URL to a React Router path
 * This handles OAuth callbacks and other deep links
 */
export const deepLinkToRoute = (url: string): string | null => {
  const parsed = parseDeepLink(url);
  if (!parsed) {
    return null;
  }

  const { path, queryParams } = parsed;

  // Handle OAuth callbacks
  if (path === "/profile" || path === "/") {
    // Build query string from params
    const queryString = queryParams.toString();
    return queryString ? `${path}?${queryString}` : path;
  }

  // Handle email verification
  if (path === "/verifyemail") {
    // Support email parameter if present, but no longer require token
    const email = queryParams.get("email");
    return email ? `/verifyemail?email=${encodeURIComponent(email)}` : "/verifyemail";
  }

  // Handle password reset
  if (path === "/changepassword") {
    const token = queryParams.get("token");
    return token ? `/changepassword?token=${token}` : "/changepassword";
  }

  // Default: return the path as-is
  const queryString = queryParams.toString();
  return queryString ? `${path}?${queryString}` : path;
};

