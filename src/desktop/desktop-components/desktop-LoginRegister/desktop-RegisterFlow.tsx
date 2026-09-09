import React, { startTransition, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { GarminSignupForm } from "./desktop-GarminSignupForm.tsx";
import { WikilocSignupForm } from "./desktop-WikilocSignupForm.tsx";
import { DefaultSignupForm } from "./desktop-DefaultSignupForm.tsx";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { initiateStravaLogin } from "../../../shared/utils/stravaAuth";
import { initiateSuuntoLogin } from "../../../shared/utils/suuntoAuth";
import AuthShell from "./desktop-AuthShell.tsx";
import styles from "./desktop-RegisterFlow.module.css";

type ProviderKey = "default" | "garmin" | "wikiloc";
type OAuthProviderKey = "strava" | "suunto";
type PlatformKey = ProviderKey | OAuthProviderKey;

type PlatformCard = {
  key: PlatformKey;
  label: string;
  logoSrc: string;
};

const getPlatforms = (t: (key: string) => string): PlatformCard[] => [
  {
    key: "garmin",
    label: t("auth.register.garmin.label"),
    logoSrc: "/icons/wikiloc/garmin3.png",
  },
  {
    key: "wikiloc",
    label: t("auth.register.wikiloc.label"),
    logoSrc: "/icons/wikiloc/wikiloc2.png",
  },
  {
    key: "strava",
    label: t("auth.register.strava.label"),
    logoSrc: "/icons/wikiloc/strava2.png",
  },
  {
    key: "suunto",
    label: t("auth.register.suunto.label"),
    logoSrc: "/icons/wikiloc/suunto.png",
  },
];

const getProviderTitle = (
  provider: ProviderKey,
  t: (key: string) => string
) => {
  if (provider === "default") {
    return t("auth.register.default.title");
  }
  if (provider === "garmin") {
    return t("auth.register.garmin.title");
  }
  if (provider === "wikiloc") {
    return t("auth.register.wikiloc.title");
  }
  return t("auth.register.garmin.title");
};

export const RegisterFlowContent: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<ProviderKey | null>(
    null
  );
  const [stravaLoading, setStravaLoading] = useState(false);
  const [suuntoLoading, setSuuntoLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useI18n();
  const { loginWithStravaToken } = useAuth();
  const { trackEvent } = useAnalytics();
  const platforms = getPlatforms(t);
  const registerTitle = t("auth.register.title");
  const registerSubtitle = t("auth.register.subtitle");
  const noPlatformOptionLabel = t("auth.register.noPlatformOption");

  const handleStravaLogin = () => {
    setOauthError(null);
    initiateStravaLogin({
      onSuccess: async (tokens) => {
        const result = await loginWithStravaToken(tokens);
        if (result.success) {
          trackEvent("form_submit", "strava_login_success");
          window.dispatchEvent(new CustomEvent("refresh-keepalive-pages"));
          navigate("/");
        } else {
          setOauthError(result.error || t("auth.loginFailed"));
        }
      },
      onError: (error) => {
        setOauthError(error);
        setStravaLoading(false);
      },
      onLoading: (loading) => {
        setStravaLoading(loading);
      },
      navigate,
    });
  };

  const handleSuuntoLogin = () => {
    setOauthError(null);
    initiateSuuntoLogin({
      onSuccess: async (tokens) => {
        const result = await loginWithStravaToken(tokens);
        if (result.success) {
          trackEvent("form_submit", "suunto_login_success");
          window.dispatchEvent(new CustomEvent("refresh-keepalive-pages"));
          navigate("/");
        } else {
          setOauthError(result.error || t("auth.loginFailed"));
        }
      },
      onError: (error) => {
        setOauthError(error);
        setSuuntoLoading(false);
      },
      onLoading: (loading) => {
        setSuuntoLoading(loading);
      },
      navigate,
    });
  };

  const openProvider = (provider: ProviderKey) => {
    setOauthError(null);
    startTransition(() => {
      setSelectedProvider(provider);
    });
  };

  const handleBackToSelection = () => {
    setOauthError(null);
    startTransition(() => {
      setSelectedProvider(null);
    });
  };

  const handlePlatformSelect = (platform: PlatformKey) => {
    if (platform === "strava") {
      handleStravaLogin();
      return;
    }

    if (platform === "suunto") {
      handleSuuntoLogin();
      return;
    }

    openProvider(platform);
  };

  const renderProviderContent = () => {
    if (!selectedProvider) {
      return null;
    }

    if (selectedProvider === "default") {
      return <DefaultSignupForm showTitle={false} />;
    }

    if (selectedProvider === "wikiloc") {
      return <WikilocSignupForm showTitle={false} />;
    }

    if (selectedProvider === "garmin") {
      return <GarminSignupForm showTitle={false} />;
    }
    return null;
  };

  return (
    <div className={styles["register-flow"]}>
      <AnimatePresence initial={false} mode="wait">
        {selectedProvider === null ? (
          <motion.section
            key="platform-selection"
            className={styles["register-flow__chooser"]}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className={styles["register-flow__chooser-header"]}>
              <h2
                className={`${styles["register-flow__chooser-title"]} typography-desktop-title-medium`}
              >
                {registerTitle}
              </h2>
              <p
                className={`${styles["register-flow__chooser-description"]} typography-desktop-body-small`}
              >
                {registerSubtitle}
              </p>
            </div>

            {oauthError ? (
              <div
                className={`${styles["register-flow__provider-error"]} typography-desktop-label-medium`}
              >
                {oauthError}
              </div>
            ) : null}

            <div className={styles["register-flow__platforms-wrap"]}>
              <div className={styles["register-flow__platforms"]}>
                {platforms.map((platform) => (
                  <button
                    key={platform.key}
                    type="button"
                    className={styles["platform-card"]}
                    onClick={() => handlePlatformSelect(platform.key)}
                    disabled={stravaLoading || suuntoLoading}
                    aria-label={platform.label}
                    title={platform.label}
                  >
                    <img
                      src={platform.logoSrc}
                      alt={platform.label}
                      className={styles["platform-card__image"]}
                    />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className={`${styles["register-flow__continue-link"]} typography-desktop-body-small`}
              onClick={() => openProvider("default")}
            >
              {noPlatformOptionLabel}
            </button>
          </motion.section>
        ) : (
          <motion.section
            key={selectedProvider}
            className={styles["register-flow__detail"]}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <button
              type="button"
              className={`${styles["register-flow__back"]} typography-desktop-body-small`}
              onClick={handleBackToSelection}
            >
              {t("auth.backToProviderSelection")}
            </button>

            <h2
              className={`${styles["register-flow__title"]} typography-desktop-title-medium`}
            >
              {getProviderTitle(selectedProvider, t)}
            </h2>

            <div className={styles["register-flow__detail-body"]}>
              {renderProviderContent()}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

const RegisterFlow: React.FC = () => {
  return (
    <AuthShell mode="register">
      <RegisterFlowContent />
    </AuthShell>
  );
};

export default RegisterFlow;
