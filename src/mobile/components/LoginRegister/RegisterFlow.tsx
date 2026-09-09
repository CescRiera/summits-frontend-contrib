import React, { startTransition, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { GarminSignupForm } from "./GarminSignupForm";
import { WikilocSignupForm } from "./WikilocSignupForm";
import { DefaultSignupForm } from "./DefaultSignupForm";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { initiateStravaLogin } from "../../../shared/utils/stravaAuth";
import { initiateSuuntoLogin } from "../../../shared/utils/suuntoAuth";
import styles from "./RegisterFlow.module.css";

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

const getProviderTitle = (provider: ProviderKey, t: (key: string) => string) => {
  if (provider === "default") {
    return t("auth.register.default.title");
  }
  if (provider === "garmin") {
    return t("auth.register.garmin.title");
  }
  return t("auth.register.wikiloc.title");
};

const RegisterFlow: React.FC = () => {
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
  const noPlatformOptionLabel = t("auth.register.noPlatformOption");

  const handleBackToLogin = () => {
    navigate("/profile");
  };

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

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
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

    return <GarminSignupForm showTitle={false} />;
  };

  return (
    <motion.div
      className={styles["register-flow"]}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles["register-flow__container"]}>
        <AnimatePresence initial={false} mode="wait">
          {selectedProvider === null ? (
            <motion.section
              key="provider-selection"
              className={styles["register-flow__chooser"]}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
            >
              <header className={styles["register-flow__header"]}>
                <button
                  type="button"
                  className={`${styles["register-flow__back"]} typography-body-small`}
                  onClick={handleBackToLogin}
                >
                  <ArrowLeft size={18} />
                  {t("auth.backToLogin")}
                </button>
                <h1
                  className={`${styles["register-flow__title"]} typography-title-medium`}
                >
                  {t("auth.register.title")}
                </h1>
                <div className={styles["register-flow__subtitle"]}>
                  <p className="typography-body-small">
                    {t("auth.register.subtitle")}
                  </p>
                </div>
              </header>

              <div className={styles["register-flow__chooser-card"]}>
                {oauthError ? (
                  <div
                    className={`${styles["register-flow__error"]} typography-body-small`}
                  >
                    {oauthError}
                  </div>
                ) : null}

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

                <button
                  type="button"
                  className={`${styles["register-flow__continue-link"]} typography-body-small`}
                  onClick={() => openProvider("default")}
                >
                  {noPlatformOptionLabel}
                </button>
              </div>
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
                className={`${styles["register-flow__back"]} typography-body-small`}
                onClick={handleBackToSelection}
              >
                <ArrowLeft size={18} />
                {t("auth.backToProviderSelection")}
              </button>

              <h2
                className={`${styles["register-flow__form-title"]} typography-title-medium`}
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
    </motion.div>
  );
};

export default RegisterFlow;
