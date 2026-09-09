import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import pushNotificationManager from "../../../shared/utils/pushNotifications";
import styles from "./desktop-DefaultSignupForm.module.css";

type DefaultSignupFormProps = {
  showTitle?: boolean;
};

export function DefaultSignupForm({ showTitle = true }: DefaultSignupFormProps) {
  const { register } = useAuth();
  const { language, t } = useI18n();
  const navigate = useNavigate();

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
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        const status = await pushNotificationManager.getPermissionStatus();
        if (status === "denied") {
          setNotificationsDisabled(true);
          setEnableNotifications(false);
        }
      } catch (permissionError) {
        console.error("Error checking notification permission:", permissionError);
      }
    };
    checkPermission();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
    try {
      const result = await register(email, password, "default", undefined, {
        language,
        notifications_enabled: enableNotifications,
        name: name.trim(),
      });
      if (result.success) {
        setSuccess(t("auth.registrationSuccess"));
        sessionStorage.setItem("pendingVerificationEmail", email);
        navigate("/verifyemail");
      } else {
        setError(result.error || t("auth.registrationFailed"));
      }
    } catch (err: any) {
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
    <form className={styles["default-form"]} onSubmit={handleSubmit}>
      {showTitle && (
        <h3
          className={`${styles["default-form__title"]} typography-desktop-body-small`}
        >
          {t("auth.register.default.title")}
        </h3>
      )}

      {error && (
        <div
          className={`${styles["default-form__error"]} typography-desktop-label-medium`}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          className={`${styles["default-form__success"]} typography-desktop-body-small`}
        >
          {success}
        </div>
      )}

      <input
        className={styles["default-form__input"]}
        type="text"
        placeholder={t("auth.name")}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        autoComplete="name"
        required
      />

      <input
        className={styles["default-form__input"]}
        type="email"
        placeholder={t("auth.email")}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        autoComplete="email"
        required
      />

      <input
        className={styles["default-form__input"]}
        type="password"
        placeholder={t("auth.password")}
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        autoComplete="new-password"
        required
      />

      <input
        className={styles["default-form__input"]}
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
        className={`${styles["default-form__checkbox"]} typography-desktop-body-small`}
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
        className={`${styles["default-form__checkbox"]} typography-desktop-body-small`}
      >
        <input
          type="checkbox"
          checked={enableNotifications}
          disabled={notificationsDisabled}
          onChange={async (e) => {
            const checked = e.target.checked;

            if (!checked) {
              setEnableNotifications(false);
              return;
            }

            if (!pushNotificationManager.isSupported()) {
              setEnableNotifications(false);
              return;
            }

            try {
              const currentPermission =
                await pushNotificationManager.getPermissionStatus();

              if (currentPermission === "denied") {
                setNotificationsDisabled(true);
                setEnableNotifications(false);
                return;
              }

              const hasPermission =
                await pushNotificationManager.requestPermission();
              const permissionAfterRequest =
                await pushNotificationManager.getPermissionStatus();

              if (hasPermission) {
                setEnableNotifications(true);
                setNotificationsDisabled(false);
              } else {
                setEnableNotifications(false);
                if (permissionAfterRequest === "denied") {
                  setNotificationsDisabled(true);
                }
              }
            } catch (permissionError) {
              console.error(
                "Failed to request notification permission:",
                permissionError
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
        <span className="typography-desktop-label-medium">
          {t("auth.receiveNotificationsOnPeaks")}
        </span>
      </label>

      <button
        className={styles["default-form__button"]}
        type="submit"
        disabled={loading}
      >
        {loading ? t("common.loading") : t("auth.signUpButton")}
      </button>
    </form>
  );
}
