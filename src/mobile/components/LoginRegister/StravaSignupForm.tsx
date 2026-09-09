import React, { useState, useEffect, useRef } from "react";
import { useI18n } from "../../../shared/context/I18nContext";
import { Link, useNavigate } from "react-router-dom";
import styles from "./StravaSignupForm.module.css";
import pushNotificationManager from "../../../shared/utils/pushNotifications";
import { getPlatformType } from "../../../shared/utils/platformDetection";
import { type OAuthMessage } from "../../../shared/utils/oauthErrors";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";

export function StravaSignupForm() {
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const popupRef = useRef<Window | null>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const checkClosedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deepLinkListenerRef = useRef<any>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    language: language || "en",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [notificationsDisabled, setNotificationsDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check notification permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Wait for push notification initialization to complete
        // This ensures the token is available if permission was already granted
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const status = await pushNotificationManager.getPermissionStatus();
        // Only disable if explicitly denied
        if (status === "denied") {
          setNotificationsDisabled(true);
          setEnableNotifications(false);
        } else {
          setNotificationsDisabled(false);
        }
      } catch (error) {
        console.error("Error checking notification permission:", error);
        // Don't disable on error - allow user to try
        setNotificationsDisabled(false);
      }
    };
    checkPermission();
  }, []);

  // Read error from sessionStorage on mount (set by RegisterFlow when OAuth error occurs)
  useEffect(() => {
    const errorMessage = sessionStorage.getItem("stravaSignupError");
    if (errorMessage) {
      // Translate error message code to user-friendly message
      let errorText = t("auth.strava.error.generic");
      if (errorMessage === "email_already_exists") {
        errorText = t("auth.strava.error.emailAlreadyExists");
      } else if (errorMessage === "strava_account_already_linked") {
        errorText = t("auth.strava.error.accountAlreadyLinked");
      } else if (errorMessage === "registration_failed") {
        errorText = t("auth.strava.error.registrationFailed");
      } else if (errorMessage === "email_check_failed") {
        errorText = t("auth.strava.error.emailCheckFailed");
      } else if (errorMessage === "internal_error") {
        errorText = t("auth.strava.error.internalError");
      }

      setError(errorText);
      // Clear from sessionStorage after reading
      sessionStorage.removeItem("stravaSignupError");
    }
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError(t("auth.fillAllFields"));
      return;
    }

    if (!acceptTerms) {
      setError(t("auth.acceptTermsRequired"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.passwordsNotMatch"));
      return;
    }

    if (formData.password.length < 6) {
      setError(t("auth.passwordMin"));
      return;
    }

    setLoading(true);
    setError(null);

    // Cleanup any existing popup/listeners
    cleanupOAuth();

    try {
      // Encode user data to pass to Strava OAuth
      const derivedName = formData.email.split("@")[0] || formData.email;
      const userData = encodeURIComponent(
        JSON.stringify({
          name: derivedName,
          email: formData.email,
          password: formData.password,
          language: formData.language,
          notifications_enabled: enableNotifications,
        })
      );

      // Open Strava OAuth popup window
      const scope = "read,activity:read_all";
      const platform = getPlatformType();
      const backendUrl = import.meta.env["VITE_BACKEND_URL"];
      const oauthUrl = `${backendUrl}/api/auth/strava?scope=${encodeURIComponent(
        scope
      )}&data=${userData}&platform=${platform}`;

      const isNativePlatform = Capacitor.isNativePlatform();

      if (isNativePlatform) {
        // Mobile platform - use Capacitor Browser and deep links
        await handleMobileOAuth(oauthUrl);
      } else {
        // Web platform - use window.open and postMessage
        await handleWebOAuth(oauthUrl);
      }
    } catch (err) {
      await cleanupOAuth();
      setError("Failed to initiate Strava signup.");
      setLoading(false);
    }
  };

  // Handle OAuth for mobile platforms using Capacitor Browser and deep links
  const handleMobileOAuth = async (oauthUrl: string) => {
    try {
      // Set up deep link listener before opening browser
      const handleDeepLink = async (data: { url: string }) => {
        const url = data.url;
        console.log("Received deep link:", url);

        // Parse the deep link URL
        if (url.startsWith("summitstracker://oauth-callback")) {
          try {
            const urlObj = new URL(url.replace("summitstracker://", "https://"));
            const success = urlObj.searchParams.get("success") === "true";
            const email = urlObj.searchParams.get("email");
            const requiresVerification = urlObj.searchParams.get("requiresVerification") === "true";
            const error = urlObj.searchParams.get("error");

            // Close the browser
            await Browser.close();

            // Cleanup
            await cleanupOAuth();

            if (success) {
              // OAuth successful
              if (requiresVerification && email) {
                // Store email for verification page
                sessionStorage.setItem("pendingVerificationEmail", email);
                // Redirect to email verification page
                navigate("/verifyemail");
              } else {
                // User already verified or no verification needed
                // Redirect to login
                navigate("/profile");
              }
            } else {
              // OAuth failed - display the error message directly from backend
              if (error) {
                setError(error);
              } else {
                setError("An error occurred. Please try again.");
              }
              setLoading(false);
            }
          } catch (parseError) {
            console.error("Error parsing deep link:", parseError);
            await Browser.close();
            await cleanupOAuth();
            setError("An error occurred. Please try again.");
            setLoading(false);
          }
        }
      };

      // Add listener for deep links
      deepLinkListenerRef.current = await App.addListener("appUrlOpen", handleDeepLink);

      // Open OAuth URL in system browser
      await Browser.open({ url: oauthUrl });

      // Timeout after 5 minutes
      timeoutRef.current = setTimeout(async () => {
        await Browser.close();
        await cleanupOAuth();
        setError(t("auth.oauth.error.timeout") || "OAuth flow timed out. Please try again.");
        setLoading(false);
      }, 5 * 60 * 1000);
    } catch (err) {
      console.error("Error in mobile OAuth flow:", err);
      await cleanupOAuth();
      setError("Failed to open browser for Strava signup.");
      setLoading(false);
    }
  };

  // Handle OAuth for web platforms using window.open and postMessage
  const handleWebOAuth = async (oauthUrl: string) => {
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const popup = window.open(
      oauthUrl,
      "OAuth",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!popup) {
      setError("Popup blocked. Please allow popups for this site.");
      setLoading(false);
      return;
    }

    popupRef.current = popup;

    // Listen for messages from popup
    const messageHandler = async (event: MessageEvent) => {
      // Security: Verify message origin
      // Accept messages from backend URL or same origin
      const backendUrl = import.meta.env["VITE_BACKEND_URL"];
      if (backendUrl) {
        try {
          const backendOrigin = new URL(backendUrl).origin;
          if (event.origin !== backendOrigin && event.origin !== window.location.origin) {
            return;
          }
        } catch (e) {
          // If URL parsing fails, allow message (for development)
          console.warn("Failed to parse backend URL for origin check:", e);
        }
      }

      if (event.data && event.data.type === "oauth-success") {
        console.log("Received OAuth message:", event.data);
        const oauthMessage = event.data as OAuthMessage;
        
        // Cleanup
        await cleanupOAuth();

        if (oauthMessage.success) {
          // OAuth successful
          const { email, requiresVerification } = oauthMessage.message || {};

          if (requiresVerification && email) {
            // Store email for verification page
            sessionStorage.setItem("pendingVerificationEmail", email);
            // Redirect to email verification page
            navigate("/verifyemail");
          } else {
            // User already verified or no verification needed
            // Redirect to login
            navigate("/profile");
          }
        } else {
          // OAuth failed - display the error message directly from backend
          const errorFromBackend = oauthMessage.message?.error;
          if (errorFromBackend) {
            // Use the error message directly from backend
            setError(errorFromBackend);
          } else {
            setError("An error occurred. Please try again.");
          }
          setLoading(false);
        }
      }
    };

    messageHandlerRef.current = messageHandler;
    window.addEventListener("message", messageHandler);

    // Check if popup was closed manually
    checkClosedIntervalRef.current = setInterval(async () => {
      if (popup.closed) {
        await cleanupOAuth();
        setLoading(false);
        // User closed popup manually - don't show error, just reset loading
      }
    }, 1000);

    // Timeout after 5 minutes
    timeoutRef.current = setTimeout(async () => {
      await cleanupOAuth();
      setError(t("auth.oauth.error.timeout") || "OAuth flow timed out. Please try again.");
      setLoading(false);
    }, 5 * 60 * 1000);
  };

  // Cleanup function for OAuth popup and listeners
  const cleanupOAuth = async () => {
    if (messageHandlerRef.current) {
      window.removeEventListener("message", messageHandlerRef.current);
      messageHandlerRef.current = null;
    }

    if (checkClosedIntervalRef.current) {
      clearInterval(checkClosedIntervalRef.current);
      checkClosedIntervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
      popupRef.current = null;
    }

    // Remove deep link listener
    if (deepLinkListenerRef.current) {
      await deepLinkListenerRef.current.remove();
      deepLinkListenerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupOAuth();
    };
  }, []);

  return (
    <form className={styles["strava-form"]} onSubmit={handleSubmit}>
      <h3 className={`${styles["strava-form__title"]} typography-title-medium`}>
        Strava
      </h3>
      {error && (
        <div
          className={`${styles["strava-form__error"]} typography-body-small`}
        >
          {error}
        </div>
      )}

      <input
        className={styles["strava-form__input"]}
        type="email"
        placeholder={t("auth.email")}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        autoComplete="email"
        required
      />

      <input
        className={styles["strava-form__input"]}
        type="password"
        placeholder={t("auth.password")}
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        autoComplete="new-password"
        required
      />

      <input
        className={styles["strava-form__input"]}
        type="password"
        placeholder={t("auth.confirmPassword")}
        value={formData.confirmPassword}
        onChange={(e) =>
          setFormData({ ...formData, confirmPassword: e.target.value })
        }
        autoComplete="new-password"
        required
      />

      <label className={styles["strava-form__checkbox"]}>
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
        />
        <span className="typography-body-small">
          {t("auth.acceptTerms")}{" "}
          <Link to={t("auth.tosUrl")}>{t("auth.termsOfService")}</Link>
        </span>
      </label>

      <label className={styles["strava-form__checkbox"]}>
        <input
          type="checkbox"
          checked={enableNotifications}
          disabled={notificationsDisabled}
          onChange={async (e) => {
            const checked = e.target.checked;

            // If unchecking, just uncheck
            if (!checked) {
              setEnableNotifications(false);
              return;
            }

            // Check if notifications are supported
            if (!pushNotificationManager.isSupported()) {
              setEnableNotifications(false);
              return;
            }

            // If checking, first check current permission status
            try {
              const currentPermission =
                await pushNotificationManager.getPermissionStatus();

              // If already denied, disable and don't check
              if (currentPermission === "denied") {
                setNotificationsDisabled(true);
                setEnableNotifications(false);
                return;
              }

              // Request permission
              const hasPermission =
                await pushNotificationManager.requestPermission();
              const permissionAfterRequest =
                await pushNotificationManager.getPermissionStatus();

              if (hasPermission) {
                setEnableNotifications(true);
                setNotificationsDisabled(false);
              } else {
                // Permission was denied
                setEnableNotifications(false);
                if (permissionAfterRequest === "denied") {
                  setNotificationsDisabled(true);
                }
              }
            } catch (error) {
              console.error(
                "Failed to request notification permission:",
                error
              );
              setEnableNotifications(false);
              try {
                const permissionAfterRequest =
                  await pushNotificationManager.getPermissionStatus();
                if (permissionAfterRequest === "denied") {
                  setNotificationsDisabled(true);
                }
              } catch {
                // Ignore errors checking permission
              }
            }
          }}
        />
        <span className="typography-body-small">
          {t("auth.receiveNotificationsOnPeaks")}
        </span>
      </label>

      <button
        className={styles["strava-form__button"]}
        type="submit"
        disabled={loading}
      >
        {loading
          ? t("auth.register.strava.connecting")
          : t("auth.register.strava.submit")}
      </button>
    </form>
  );
}
