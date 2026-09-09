import React, { useState, useEffect } from "react";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useNavigate, Link } from "react-router-dom";
import { searchUsers } from "../../../shared/api/endpoints/user";
import styles from "./WikilocSignupForm.module.css";
import pushNotificationManager from "../../../shared/utils/pushNotifications";

interface WikilocUser {
  id: string;
  name: string;
  avatar?: string;
  username?: string;
  trailCount?: number;
}

type WikilocSignupFormProps = {
  showTitle?: boolean;
};

export function WikilocSignupForm({ showTitle = true }: WikilocSignupFormProps) {
  const { register } = useAuth();
  const { language, t } = useI18n();
  const { trackEvent } = useAnalytics();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [wikilocSearch, setWikilocSearch] = useState("");
  const [wikilocUsers, setWikilocUsers] = useState<WikilocUser[]>([]);
  const [selectedWikilocUser, setSelectedWikilocUser] =
    useState<WikilocUser | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [notificationsDisabled, setNotificationsDisabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check notification permission status on mount
  // Use a small delay to allow FCM token registration to complete first
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // First check if notifications are even supported
        if (!pushNotificationManager.isSupported()) {
          setNotificationsDisabled(true);
          setEnableNotifications(false);
          return;
        }

        const status = await pushNotificationManager.getPermissionStatus();
        if (status === "denied") {
          setNotificationsDisabled(true);
          setEnableNotifications(false);
        } else if (status === "granted") {
          // Permission already granted, allow checkbox to be enabled
          setNotificationsDisabled(false);
        }
        // If status is "prompt", leave checkbox enabled so user can request permission
      } catch (error) {
        console.error("Error checking notification permission:", error);
        // Don't disable on error - let user try
      }
    };
    
    // Delay check to allow FCM token registration to complete
    // On native platforms, the token registration can take 1-2 seconds
    const timeoutId = setTimeout(checkPermission, 500);
    return () => clearTimeout(timeoutId);
  }, []);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSearch = async () => {
    trackEvent("search", "wikiloc_signup_search_submit");
    setError(null);
    setSuccess(null);
    if (!wikilocSearch.trim()) {
      setError(t("auth.wikiloc.enterUsername"));
      return;
    }
    setSearching(true);
    try {
      const data = await searchUsers(wikilocSearch.trim());
      setWikilocUsers(data.users || []);
      if (!data.users || data.users.length === 0) {
        setError(t("auth.wikiloc.noUsers"));
      }
    } catch {
      setError(t("auth.wikiloc.searchFailed"));
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent("auth", "wikiloc_signup_submit");
    setError(null);
    setSuccess(null);

    if (!name || !email || !password || !confirmPassword || !selectedWikilocUser) {
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
    try {
      // Check if notifications should be enabled and if permission is granted
      let shouldEnableNotifications = false;
      if (enableNotifications) {
        const permissionStatus = await pushNotificationManager.getPermissionStatus();
        shouldEnableNotifications = permissionStatus === "granted";
      }

      const result = await register(
        email,
        password,
        "wikiloc",
        selectedWikilocUser.id,
        {
          externalUsername:
            selectedWikilocUser.username || selectedWikilocUser.name,
          name: name.trim(),
          image: selectedWikilocUser.avatar ?? "",
          language,
          notifications_enabled: shouldEnableNotifications,
        }
      );
      if (result.success) {
        trackEvent("auth", "wikiloc_signup_success");
        // If notifications were enabled and permission is granted, subscribe to push notifications
        if (shouldEnableNotifications) {
          try {
            await pushNotificationManager.subscribe();
            console.log("Successfully subscribed to push notifications after registration");
          } catch (subscribeError) {
            console.error("Failed to subscribe to push notifications after registration:", subscribeError);
            // Don't fail registration if subscription fails - user can enable it later
          }
        }
        setSuccess(t("auth.registrationSuccess"));
        // Store email for display on verify email page
        sessionStorage.setItem("pendingVerificationEmail", email);
        navigate("/verifyemail");
      } else {
        trackEvent("auth", "wikiloc_signup_failed");
        setError(result.error || t("auth.registrationFailed"));
      }
    } catch (err: any) {
      trackEvent("auth", "wikiloc_signup_error");
      console.error("Registration error:", err);
      if (err?.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError(t("auth.registrationFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles["wikiloc-form"]} onSubmit={handleSubmit}>
      {showTitle && (
        <h3
          className={`${styles["wikiloc-form__title"]} typography-title-medium`}
        >
          {t("auth.register.wikiloc.title")}
        </h3>
      )}
      <div className={styles["wikiloc-form__warning"]}>
        <span className="typography-body-small">
          {t("auth.register.wikiloc.warning")}
        </span>
      </div>
      {error && (
        <div
          className={`${styles["wikiloc-form__error"]} typography-body-small`}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className={`${styles["wikiloc-form__success"]} typography-body-medium`}
        >
          {success}
        </div>
      )}

      <input
        className={styles["wikiloc-form__input"]}
        type="text"
        placeholder={t("auth.name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        required
      />

      <input
        className={styles["wikiloc-form__input"]}
        type="email"
        placeholder={t("auth.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />

      <input
        className={styles["wikiloc-form__input"]}
        type="password"
        placeholder={t("auth.password")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
      />

      <input
        className={styles["wikiloc-form__input"]}
        type="password"
        placeholder={t("auth.confirmPassword")}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        required
      />

      <div className={styles["wikiloc-form__search"]}>
        <div className={styles["wikiloc-form__search-container"]}>
          <input
            className={styles["wikiloc-form__input"]}
            type="text"
            placeholder={t("auth.register.wikiloc.searchPlaceholder")}
            value={wikilocSearch}
            onChange={(e) => setWikilocSearch(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <button
            className={styles["wikiloc-form__search-btn"]}
            type="button"
            onClick={handleSearch}
            disabled={searching}
          >
            {searching ? t("common.searching") : t("common.search")}
          </button>
        </div>

        {selectedWikilocUser && (
          <div className={styles["wikiloc-form__selected-user"]}>
            <span>
              {t("auth.wikiloc.selected")}: {selectedWikilocUser.name}
            </span>
            <button
              type="button"
              onClick={() => {
                trackEvent("interaction", "wikiloc_signup_clear_selected_user");
                setSelectedWikilocUser(null);
                setWikilocSearch("");
                setName("");
              }}
            >
              {t("common.clear")}
            </button>
          </div>
        )}

        {wikilocUsers.length > 0 && !selectedWikilocUser && (
          <div className={styles["wikiloc-form__results"]}>
            <div
              className={`${styles["wikiloc-form__results-label"]} typography-body-small`}
            >
              {t("auth.wikiloc.selectUserToContinue")}
            </div>
            {wikilocUsers.map((user) => (
              <div
                key={user.id}
                className={styles["wikiloc-form__user"]}
                onClick={() => {
                  trackEvent("interaction", `wikiloc_signup_select_user_${user.id}`);
                  setSelectedWikilocUser(user);
                  setWikilocSearch(user.name);
                  setName(user.name);
                  setWikilocUsers([]);
                }}
              >
                {user.username && (
                  <span
                    className={`${styles["wikiloc-form__user-username"]} typography-title-medium`}
                  >
                    @{user.username}
                  </span>
                )}
                {user.trailCount && (
                  <span className={styles["wikiloc-form__user-trails"]}>
                    {t("auth.wikiloc.trails")}: {user.trailCount}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <label className={styles["wikiloc-form__checkbox"]}>
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

      <label className={styles["wikiloc-form__checkbox"]}>
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
        <span className="typography-body-small">
          {t("auth.receiveNotificationsOnPeaks")}
        </span>
      </label>

      <button
        className={styles["wikiloc-form__button"]}
        type="submit"
        disabled={loading}
      >
        {loading ? t("common.loading") : t("auth.signUpButton")}
      </button>
    </form>
  );
}
