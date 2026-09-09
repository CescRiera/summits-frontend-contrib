import axios, { AxiosError } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { getAuthTokenAsync, setAuthToken } from "../../mobile/sessionToken";
import { auth } from "../../firebase";
import { API_CONFIG } from "./config";
import { getPlatformHeader } from "../utils/platformDetection";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthNative } from "../../capacitor-plugins/firebase-auth-native";
import {
  DEFAULT_LANGUAGE,
  getIntlLocale,
} from "../i18n/languages";

// Global logout event name
export const AUTH_LOGOUT_EVENT = "cims:auth:logout";

/**
 * Utility to trigger a global logout from anywhere (e.g., Axios interceptors)
 * The AuthProvider will listen for this event and perform the logout.
 */
export const triggerGlobalLogout = () => {
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
};

export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: API_CONFIG.TIMEOUT,
});

// Helper to check if endpoint requires authentication
const isAuthRequiredEndpoint = (url?: string) => {
  if (!url) return false;
  return (
    url.startsWith("/api/user-data/") ||
    url.startsWith("/api/route-info/getUserPeaksCountries") ||
    url.startsWith("/api/route-info/addRoute") ||
    url.startsWith("/api/route-info/deleteRoute") ||
    (url.startsWith("/api/peak-lists") && !url.endsWith("/all"))
  );
};

const DEBUG_AUTH = import.meta.env["VITE_DEBUG_AUTH"] === "1";

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (DEBUG_AUTH) {
    }

    // Use async version to ensure token is initialized from storage on web/native
    let idToken = await getAuthTokenAsync();

    // Prefer token from Firebase JS SDK if currentUser is available,
    // as it manages token refresh automatically and more reliably than manual storage.
    // This fixes issues where the manual storage might have a stale token.
    if (auth.currentUser) {
      try {
        const firebaseToken = await auth.currentUser.getIdToken();
        if (firebaseToken) {
          idToken = firebaseToken;
          // Sync the updated token back to manual storage
          setAuthToken(idToken);
        }
      } catch (e) {
        if (DEBUG_AUTH) {
          console.warn(
            "[Auth] ⚠️ Failed to get token from Firebase currentUser",
            e
          );
        }
      }
    }

    // Add platform header
    const platform = getPlatformHeader();
    const headersAny = config.headers as any;
    if (headersAny && typeof headersAny.set === "function") {
      headersAny.set("X-Platform", platform);
    } else if (headersAny) {
      headersAny["X-Platform"] = platform;
    } else {
      config.headers = {
        "X-Platform": platform,
      } as any;
    }

    if (idToken) {
      if (headersAny && typeof headersAny.set === "function") {
        headersAny.set("Authorization", `Bearer ${idToken}`);
        if (DEBUG_AUTH) {
        }
      } else if (headersAny) {
        headersAny["Authorization"] = `Bearer ${idToken}`;
        if (DEBUG_AUTH) {
        }
      } else {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${idToken}`,
        } as any;
        if (DEBUG_AUTH) {
        }
      }
      if (DEBUG_AUTH) {
      }
    } else if (isAuthRequiredEndpoint(config.url)) {
      if (DEBUG_AUTH) {
        console.warn(
          `[Auth] ⚠️ Missing idToken for auth-required request: ${config.url}`
        );
      }
    }

    if (DEBUG_AUTH) {
    }
    return config;
  },
  (error: AxiosError) => {
    if (DEBUG_AUTH) {
      console.error("[Auth] ❌ API Request Error:", error);
    }
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    if (DEBUG_AUTH) {
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (DEBUG_AUTH) {
      console.error("[Auth] ❌ API Response Error", {
        status: error.response?.status,
        data: error.response?.data,
        url: originalRequest?.url,
      });
    }

    if (error.response?.status === 401) {
      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          let newToken: string | null = null;
          const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

          if (isIOSNative) {
            // Force refresh on 401 for native SDK
            const result = await FirebaseAuthNative.getIdToken({ forceRefresh: true });
            newToken = result.token;
          } else if (auth.currentUser) {
            // Force refresh on 401 for JS SDK
            newToken = await auth.currentUser.getIdToken(true);
          }

          if (newToken) {
            setAuthToken(newToken);
            const headersAny = originalRequest.headers as Record<string, unknown>;
            if (headersAny && typeof headersAny["set"] === "function") {
              (headersAny as { set: (key: string, value: string) => void })[
                "set"
              ]("Authorization", `Bearer ${newToken}`);
            } else if (originalRequest.headers) {
              (originalRequest.headers as Record<string, unknown>)[
                "Authorization"
              ] = `Bearer ${newToken}`;
            } else {
              originalRequest.headers = {
                Authorization: `Bearer ${newToken}`,
              } as InternalAxiosRequestConfig["headers"];
            }
            if (DEBUG_AUTH) {
              console.log("[Auth] 🔄 Token refreshed, retrying request...");
            }
            return api(originalRequest);
          } else {
            if (DEBUG_AUTH) {
              console.warn("[Auth] ⚠️ No user available for token refresh on 401; triggering logout");
            }
            triggerGlobalLogout();
          }
        } catch (refreshError) {
          if (DEBUG_AUTH) {
            console.error("[Auth] ⚠️ Token refresh failed after 401; triggering logout", refreshError);
          }
          triggerGlobalLogout();
        }
      } else {
        // Already retried once and still getting 401
        if (DEBUG_AUTH) {
          console.error("[Auth] 🚨 401 persists after token refresh retry; triggering logout");
        }
        triggerGlobalLogout();
      }
    }

    if (DEBUG_AUTH) {
      if (error.code === "ECONNABORTED") {
        console.error("[Auth] ⏰ Request timeout");
      } else if (error.response?.status === 404) {
        console.error("[Auth] 🔍 Endpoint not found");
      } else if (error.response?.status && error.response.status >= 500) {
        console.error("[Auth] 🚨 Server error");
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to get language from localStorage
export const getLanguage = () => {
  const storedLanguage = localStorage.getItem("language") || DEFAULT_LANGUAGE;
  return getIntlLocale(storedLanguage);
};

// Helper function to ensure authentication
export const ensureAuth = async () => {
  let token = await getAuthTokenAsync();
  if (token) return token;
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      token = await currentUser.getIdToken();
      if (token) {
        setAuthToken(token);
        return token;
      }
    }
  } catch {
    // Ignore errors
  }
  throw new Error("Authentication required");
};
