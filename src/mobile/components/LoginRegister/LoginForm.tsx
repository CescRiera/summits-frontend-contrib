import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import styles from "./LoginForm.module.css";
import { useI18n } from "../../../shared/context/I18nContext";
import { forgotPassword } from "../../../shared/api/endpoints/user";
import { LogIn } from "lucide-react";
import { initiateStravaLogin } from "../../../shared/utils/stravaAuth";
import { initiateSuuntoLogin } from "../../../shared/utils/suuntoAuth";

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login, loginWithStravaToken } = useAuth();
  const { t, language } = useI18n();
  const { trackEvent } = useAnalytics();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const handleStravaLogin = () => {
    initiateStravaLogin({
      onSuccess: async (tokens) => {
        const result = await loginWithStravaToken(tokens);
        if (result.success) {
          trackEvent("form_submit", "strava_login_success");
          window.dispatchEvent(new CustomEvent("refresh-keepalive-pages"));
          navigate("/");
        } else {
          setError(result.error || "Strava login failed");
        }
      },
      onError: (err) => {
        setError(err);
      },
      onLoading: (isLoading) => {
        setLoading(isLoading);
      },
      navigate,
    });
  };

  const handleSuuntoLogin = () => {
    initiateSuuntoLogin({
      onSuccess: async (tokens) => {
        const result = await loginWithStravaToken(tokens);
        if (result.success) {
          trackEvent("form_submit", "suunto_login_success");
          window.dispatchEvent(new CustomEvent("refresh-keepalive-pages"));
          navigate("/");
        } else {
          setError(result.error || "Suunto login failed");
        }
      },
      onError: (err) => {
        setError(err);
      },
      onLoading: (isLoading) => {
        setLoading(isLoading);
      },
      navigate,
    });
  };

  // Initialize error from query parameters or sessionStorage if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryError = params.get("error");
    if (queryError) {
      setError(queryError);
    }

    // Check for Strava error from sessionStorage
    const stravaError = sessionStorage.getItem("stravaError");
    if (stravaError) {
      setError(stravaError);
      // Clear it so it doesn't show again on refresh
      sessionStorage.removeItem("stravaError");
    }

    // Check for Garmin error from sessionStorage
    const garminError = sessionStorage.getItem("garminError");
    if (garminError) {
      setError(garminError);
      // Clear it so it doesn't show again on refresh
      sessionStorage.removeItem("garminError");
    }
    // Don't show strava=success or garmin=success message here - it will be handled by Profile component after login
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }
    setLoading(true);
    trackEvent("form_submit", "login");
    try {
      const result = await login(email, password);
      if (result.success) {
        trackEvent("form_submit", "login_success");
        // Refresh all KeepAlive pages after login
        const pagesToRefresh = ["explore", "map", "leaderboard", "profile"];
        console.log("🔄 Refreshing pages:", pagesToRefresh.join(", "));
        // Trigger refresh by incrementing refresh key in AuthContext
        window.dispatchEvent(new CustomEvent("refresh-keepalive-pages"));
        // Navigate to home page after successful login
        navigate("/");
      } else {
        trackEvent("form_submit", "login_failed");
        setError(result.error || t("auth.loginFailed"));
      }
    } catch (err) {
      trackEvent("form_submit", "login_error");
      setError((err as any)?.response?.data?.error || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!forgotPasswordEmail) {
      setError(t("auth.fillAllFields"));
      return;
    }
    setForgotPasswordLoading(true);
    try {
      await forgotPassword(forgotPasswordEmail, language || "en");
      // Store email for reset password page
      sessionStorage.setItem("pendingPasswordResetEmail", forgotPasswordEmail);
      // Navigate to reset password page
      navigate("/changepassword");
    } catch (err) {
      setError(
        (err as any)?.response?.data?.error || t("auth.forgotPassword.error")
      );
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className={styles["login-form"]}>
        <h2
          className={`${styles["login-form__title"]} typography-headline-medium`}
        >
          {t("auth.forgotPassword.title")}
        </h2>
        <p className={`${styles["login-form__hint"]} typography-body-medium`}>
          {t("auth.forgotPassword.instructions")}
        </p>
        {error && (
          <div
            className={`${styles["login-form__error"]} typography-body-small`}
          >
            {error}
          </div>
        )}
        <form onSubmit={handleForgotPassword} autoComplete="on">
          <input
            className={styles["login-form__input"]}
            type="email"
            placeholder={t("auth.email")}
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
            autoComplete="email"
          />
          <button
            className={`${styles["login-form__button"]} typography-button-medium`}
            type="submit"
            disabled={forgotPasswordLoading}
          >
            {forgotPasswordLoading
              ? t("common.loading")
              : t("auth.forgotPassword.sendEmail")}
          </button>
          <button
            type="button"
            className={`${styles["login-form__back-to-login"]} typography-body-small`}
            onClick={() => {
              setShowForgotPassword(false);
              setForgotPasswordEmail("");
              setError(null);
            }}
          >
            {t("auth.backToLogin")}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form
      className={styles["login-form"]}
      onSubmit={handleSubmit}
      autoComplete="on"
    >
      <h2
        className={`${styles["login-form__title"]} typography-headline-medium`}
      >
        {t("auth.signInButton")}
      </h2>
      <p className={`${styles["login-form__hint"]} typography-body-medium`}>
        {t("auth.loginHint")}
      </p>
      {error && (
        <div className={`${styles["login-form__error"]} typography-body-small`}>
          {error}
        </div>
      )}
      <input
        className={styles["login-form__input"]}
        type="email"
        placeholder={t("auth.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <div className={styles["login-form__field-group"]}>
        <input
          className={styles["login-form__input"]}
          type="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        <div className={styles["login-form__links"]}>
          <button
            type="button"
            className={`${styles["login-form__verify-email"]} typography-body-small`}
            onClick={() => navigate("/verifyemail")}
          >
            {t("auth.emailVerification.link") || "Verify email?"}
          </button>
          <button
            type="button"
            className={`${styles["login-form__forgot-password"]} typography-body-small`}
            onClick={() => setShowForgotPassword(true)}
          >
            {t("auth.forgotPassword.link")}
          </button>
        </div>
      </div>

      <button
        className={`${styles["login-form__button"]} typography-button-medium`}
        type="submit"
        disabled={loading}
      >
        <LogIn size={18} style={{ marginRight: 8 }} />
        {loading ? t("common.loading") : t("auth.signInButton")}
      </button>

      <div className={styles["login-form__divider"]}>
        <span className="typography-body-small">
          {t("auth.orSignInWith")}
        </span>
      </div>

      <div className={styles["login-form__social-buttons"]}>
        <button
          type="button"
          className={styles["login-form__strava-card"]}
          onClick={handleStravaLogin}
          disabled={loading}
          aria-label={t("auth.loginWithStrava") || "Login with Strava"}
          title={t("auth.loginWithStrava") || "Login with Strava"}
        >
          <img
            src="/icons/wikiloc/strava2.png"
            alt={t("auth.loginWithStrava") || "Login with Strava"}
            className={styles["login-form__strava-image"]}
          />
        </button>

        <button
          type="button"
          className={styles["login-form__strava-card"]}
          onClick={handleSuuntoLogin}
          disabled={loading}
          aria-label={t("auth.loginWithSuunto") || "Login with Suunto"}
          title={t("auth.loginWithSuunto") || "Login with Suunto"}
        >
          <img
            src="/icons/wikiloc/suunto.png"
            alt={t("auth.loginWithSuunto") || "Login with Suunto"}
            className={styles["login-form__strava-image"]}
          />
        </button>
      </div>
    </form>
  );
};

export default LoginForm;
