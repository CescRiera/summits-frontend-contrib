import React, { useState, useEffect, useRef } from "react";
import { useI18n } from "../../../shared/context/I18nContext";
import { Link, useNavigate } from "react-router-dom";
import styles from "./desktop-GarminSignupForm.module.css";
import pushNotificationManager from "../../../shared/utils/pushNotifications";
import { getPlatformType } from "../../../shared/utils/platformDetection";
import { type OAuthMessage } from "../../../shared/utils/oauthErrors";

type GarminSignupFormProps = {
  showTitle?: boolean;
};

export function GarminSignupForm({ showTitle = true }: GarminSignupFormProps) {
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const popupRef = useRef<Window | null>(null);
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);
  const checkClosedIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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
        const status = await pushNotificationManager.getPermissionStatus();
        if (status === "denied") {
          setNotificationsDisabled(true);
          setEnableNotifications(false);
        }
      } catch (error) {
        console.error("Error checking notification permission:", error);
      }
    };
    checkPermission();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { name, email, password, confirmPassword } = formData;
    if (!name || !email || !password || !confirmPassword) {
      setError(t("auth.fillAllFields"));
      return;
    }
    if (!acceptTerms) {
      setError(t("auth.acceptTermsRequired"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.passwordsNotMatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.passwordMin"));
      return;
    }

    setLoading(true);
    setError(null);

    // Cleanup any existing popup/listeners
    cleanupOAuth();

    try {
      // Encode user data to pass to Garmin OAuth
      const derivedName = email.split("@")[0] || email;
      const displayName = name.trim() || derivedName;
      const userData = encodeURIComponent(
        JSON.stringify({
          name: displayName,
          email: email,
          password: password,
          language: language || "en",
          notifications_enabled: enableNotifications,
        })
      );

      // Open Garmin OAuth popup window
      const platform = getPlatformType();
      const backendUrl = import.meta.env["VITE_BACKEND_URL"];
      const oauthUrl = `${backendUrl}/api/auth/garmin?data=${userData}&platform=${platform}`;

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
      const messageHandler = (event: MessageEvent) => {
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
          cleanupOAuth();

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
      checkClosedIntervalRef.current = setInterval(() => {
        if (popup.closed) {
          cleanupOAuth();
          setLoading(false);
          // User closed popup manually - don't show error, just reset loading
        }
      }, 1000);

      // Timeout after 5 minutes
      timeoutRef.current = setTimeout(() => {
        cleanupOAuth();
        setError(t("auth.oauth.error.timeout") || "OAuth flow timed out. Please try again.");
        setLoading(false);
      }, 5 * 60 * 1000);
    } catch (err) {
      cleanupOAuth();
      setError("Failed to initiate Garmin Connect signup.");
      setLoading(false);
    }
  };

  // Cleanup function for OAuth popup and listeners
  const cleanupOAuth = () => {
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
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupOAuth();
    };
  }, []);

  return (
    <form className={styles["garmin-form"]} onSubmit={handleSubmit}>
      {showTitle && (
        <h3
          className={`${styles["garmin-form__title"]} typography-desktop-body-small`}
        >
          {t("auth.register.garmin.title")}
        </h3>
      )}
      <div className={`${styles["garmin-form__notice"]} typography-desktop-label-medium`}>
        {t("auth.register.garmin.warning")}
      </div>
      {error && (
        <div
          className={`${styles["garmin-form__error"]} typography-desktop-label-medium`}
        >
          {error}
        </div>
      )}

      <input
        className={styles["garmin-form__input"]}
        type="text"
        placeholder={t("auth.name")}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        autoComplete="name"
        required
      />

      <input
        className={styles["garmin-form__input"]}
        type="email"
        placeholder={t("auth.email")}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        autoComplete="email"
        required
      />

      <input
        className={styles["garmin-form__input"]}
        type="password"
        placeholder={t("auth.password")}
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        autoComplete="new-password"
        required
      />

      <input
        className={styles["garmin-form__input"]}
        type="password"
        placeholder={t("auth.confirmPassword")}
        value={formData.confirmPassword}
        onChange={(e) =>
          setFormData({ ...formData, confirmPassword: e.target.value })
        }
        autoComplete="new-password"
        required
      />

      <label
        className={`${styles["garmin-form__checkbox"]} typography-desktop-body-small`}
      >
        <input
          type="checkbox"
          checked={acceptTerms}
          onChange={(e) => setAcceptTerms(e.target.checked)}
        />
        <span className="typography-desktop-label-medium">
          {t("auth.acceptTerms")}{" "}
          <Link to={t("auth.tosUrl")}>{t("auth.termsOfService")}</Link>
        </span>
      </label>

      <label
        className={`${styles["garmin-form__checkbox"]} typography-desktop-body-small`}
      >
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
              const currentPermission = await pushNotificationManager.getPermissionStatus();
              
              // If already denied, disable and don't check
              if (currentPermission === "denied") {
                setNotificationsDisabled(true);
                setEnableNotifications(false);
                return;
              }

              // Request permission
              const hasPermission = await pushNotificationManager.requestPermission();
              const permissionAfterRequest = await pushNotificationManager.getPermissionStatus();
              
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
              console.error("Failed to request notification permission:", error);
              setEnableNotifications(false);
              try {
                const permissionAfterRequest = await pushNotificationManager.getPermissionStatus();
                if (permissionAfterRequest === "denied") {
                  setNotificationsDisabled(true);
                }
              } catch {
                // Ignore errors checking permission
              }
            }
          }}
        />
        <span className="typography-desktop-label-medium">
          {t("auth.receiveNotificationsOnPeaks")}
        </span>
      </label>

      <button
        className={styles["garmin-form__button"]}
        type="submit"
        disabled={loading}
      >
        {loading
          ? t("auth.register.garmin.connecting")
          : t("auth.register.garmin.submit")}
      </button>
    </form>
  );
}
