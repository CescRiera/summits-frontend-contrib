import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { getPlatformType } from "./platformDetection";
import { getLanguage } from "../api/client";

export interface StravaAuthOptions {
  onSuccess: (tokens: {
    customToken?: string | undefined;
    idToken?: string | undefined;
  }) => void;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
  navigate: (path: string) => void;
}

export const initiateStravaLogin = async (options: StravaAuthOptions) => {
  const { onLoading } = options;
  onLoading(true);
  
  const scope = "read,activity:read_all";
  const platform = getPlatformType();
  const backendUrl = import.meta.env["VITE_BACKEND_URL"];
  const language = getLanguage();
  const oauthUrl = `${backendUrl}/api/auth/strava?scope=${encodeURIComponent(
    scope
  )}&platform=${platform}&language=${encodeURIComponent(language)}`;

  const isNativePlatform = Capacitor.isNativePlatform();

  if (isNativePlatform) {
    handleMobileOAuth(oauthUrl, options);
  } else {
    handleWebOAuth(oauthUrl, options);
  }
};

let messageHandler: ((event: MessageEvent) => void) | null = null;
let deepLinkListener: any = null;
let checkClosedInterval: NodeJS.Timeout | null = null;
let timeoutRef: NodeJS.Timeout | null = null;
let popupWindow: Window | null = null;

const cleanupOAuth = async () => {
  if (messageHandler) {
    window.removeEventListener("message", messageHandler);
    messageHandler = null;
  }
  if (deepLinkListener) {
    await deepLinkListener.remove();
    deepLinkListener = null;
  }
  if (checkClosedInterval) {
    clearInterval(checkClosedInterval);
    checkClosedInterval = null;
  }
  if (timeoutRef) {
    clearTimeout(timeoutRef);
    timeoutRef = null;
  }
  if (popupWindow && !popupWindow.closed) {
    popupWindow.close();
    popupWindow = null;
  }
};

const handleWebOAuth = (oauthUrl: string, options: StravaAuthOptions) => {
  const { onSuccess, onError, onLoading } = options;
  const width = 600;
  const height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  popupWindow = window.open(
    oauthUrl,
    "StravaOAuth",
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );

  if (!popupWindow) {
    onError("Popup blocked. Please allow popups for this site.");
    onLoading(false);
    return;
  }

  messageHandler = async (event: MessageEvent) => {
    const backendUrl = import.meta.env["VITE_BACKEND_URL"];
    if (backendUrl) {
      try {
        const backendOrigin = new URL(backendUrl).origin;
        if (event.origin !== backendOrigin && event.origin !== window.location.origin) {
          return;
        }
      } catch (e) {
        console.warn("Failed to parse backend URL for origin check:", e);
      }
    }

    if (event.data && event.data.type === "oauth-success") {
      const { customToken, idToken } = event.data.message || {};
      
      await cleanupOAuth();

      if (customToken || idToken) {
        onSuccess({ customToken, idToken });
      } else {
        onError("Login failed: No token received");
        onLoading(false);
      }
    } else if (event.data && event.data.type === "oauth-error") {
      const error = event.data.message?.error || "An error occurred during Strava login.";
      await cleanupOAuth();
      onError(error);
      onLoading(false);
    }
  };

  window.addEventListener("message", messageHandler);

  checkClosedInterval = setInterval(async () => {
    if (popupWindow?.closed) {
      await cleanupOAuth();
      onLoading(false);
    }
  }, 1000);

  timeoutRef = setTimeout(async () => {
    await cleanupOAuth();
    onError("Login timed out. Please try again.");
    onLoading(false);
  }, 5 * 60 * 1000);
};

const handleMobileOAuth = async (oauthUrl: string, options: StravaAuthOptions) => {
  const { onSuccess, onError, onLoading } = options;
  try {
    const handleDeepLink = async (data: { url: string }) => {
      const url = data.url;
      if (url.startsWith("summitstracker://oauth-callback")) {
        try {
          const urlObj = new URL(url.replace("summitstracker://", "https://"));
          const success = urlObj.searchParams.get("success") === "true";
          const customToken = (urlObj.searchParams.get("customToken") || undefined) as string | undefined;
          const idToken = (urlObj.searchParams.get("idToken") || undefined) as string | undefined;
          const error = urlObj.searchParams.get("error");

          await Browser.close();
          await cleanupOAuth();

          if (success && (customToken || idToken)) {
            onSuccess({ customToken, idToken });
          } else {
            onError(error || "Login failed");
            onLoading(false);
          }
        } catch (parseError) {
          console.error("Error parsing deep link:", parseError);
          await Browser.close();
          await cleanupOAuth();
          onError("An error occurred during mobile login.");
          onLoading(false);
        }
      }
    };

    deepLinkListener = await App.addListener("appUrlOpen", handleDeepLink);
    await Browser.open({ url: oauthUrl });

    timeoutRef = setTimeout(async () => {
      await Browser.close();
      await cleanupOAuth();
      onError("Login timed out. Please try again.");
      onLoading(false);
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error("Error in mobile OAuth flow:", err);
    await cleanupOAuth();
    onError("Failed to open browser for Strava login.");
    onLoading(false);
  }
};
