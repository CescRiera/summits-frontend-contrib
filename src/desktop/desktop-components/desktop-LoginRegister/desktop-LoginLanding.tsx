import React, { useState } from "react";
import LoginForm from "./desktop-LoginForm.tsx";
import { GarminSignupForm } from "./desktop-GarminSignupForm.tsx";
import { UserPlus, LogIn, Watch } from "lucide-react";
import MountainIcon from "../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../shared/context/I18nContext";

const PROVIDERS = [
  {
    key: "wikiloc",
    label: "Wikiloc",
    color: "#4CAF50",
    icon: <MountainIcon size={24} />,
    logo: (
      <div
        style={{
          width: 32,
          height: 32,
          background: "rgb(255, 250, 243)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        W
      </div>
    ),
  },
  {
    key: "garmin",
    label: "Garmin",
    color: "#0072bc",
    icon: <Watch size={24} />,
    logo: (
      <div
        style={{
          width: 32,
          height: 32,
          background: "rgb(255, 250, 243)",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
        }}
      >
        G
      </div>
    ),
  },
];

const LoginLanding: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register" | null>(null);
  const [provider, setProvider] = useState<
    "wikiloc" | "strava" | "garmin" | null
  >(null);

  return (
    <div
      style={{
        maxWidth: 400,
        width: "100%",
        margin: "0 auto",
        background: "rgb(255, 255, 255)",
        borderRadius: 10,
        boxShadow: "0 2px 16px rgba(0, 0, 0, 0.10)",
        padding: "2.5rem 2rem 2rem 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
      }}
    >
      <h1
        className="typography-desktop-title-medium"
        style={{
          color: "#2d2d2d",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {t("auth.welcome")}
      </h1>
      <p
        className="typography-desktop-body-small"
        style={{
          color: "rgb(71, 85, 105)",
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        {t("auth.welcomeMessage")}
      </p>
      {mode === null && (
        <div
          style={{ width: "100%", display: "flex", gap: 16, marginBottom: 24 }}
        >
          <button
            style={{
              flex: 1,
              background: "#2d2d2d",
              color: "rgb(248, 250, 252)",
              border: "none",
              borderRadius: 10,
              padding: "1rem 0",
              fontWeight: 700,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onClick={() => setMode("login")}
          >
            <LogIn size={22} /> {t("auth.signInButton")}
          </button>
          <button
            style={{
              flex: 1,
              background: "#c2cf94",
              color: "rgb(248, 250, 252)",
              border: "none",
              borderRadius: 10,
              padding: "1rem 0",
              fontWeight: 700,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onClick={() => setMode("register")}
          >
            <UserPlus size={22} /> {t("auth.signUp")}
          </button>
        </div>
      )}
      {mode === "login" && (
        <>
          <LoginForm />
          <div style={{ marginTop: 16, textAlign: "center" }}>
            <span
              className="typography-desktop-body-small"
              style={{ color: "rgb(71, 85, 105)" }}
            >
              {t("auth.noAccountQuestion")}
            </span>
            <button
              className="typography-desktop-button-medium"
              style={{
                background: "none",
                border: "none",
                color: "#2d2d2d",
                marginLeft: 8,
                cursor: "pointer",
              }}
              onClick={() => setMode("register")}
            >
              {t("auth.signUp")}
            </button>
          </div>
        </>
      )}
      {mode === "register" && provider === null && (
        <>
          <div style={{ width: "100%", marginBottom: 16 }}>
            <p
              className="typography-desktop-body-small"
              style={{
                textAlign: "center",
                color: "rgb(71, 85, 105)",
                fontWeight: 500,
                marginBottom: 12,
              }}
            >
              {t("auth.chooseProvider")}
            </p>
            <div style={{ display: "flex", gap: 12, width: "100%" }}>
              {PROVIDERS.map((prov) => (
                <button
                  key={prov.key}
                  style={{
                    flex: 1,
                    background: prov.color,
                    color: "rgb(255, 255, 255)",
                    border: "none",
                    borderRadius: 10,
                    padding: "0.75rem 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onClick={() => setProvider(prov.key as any)}
                >
                  {prov.logo}
                  <span
                    className="typography-desktop-body-small"
                    style={{ marginTop: 4 }}
                  >
                    {prov.label}
                  </span>
                  {prov.icon}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <span
              className="typography-desktop-body-small"
              style={{ color: "rgb(71, 85, 105)" }}
            >
              {t("auth.hasAccountQuestion")}
            </span>
            <button
              className="typography-desktop-button-medium"
              style={{
                background: "none",
                border: "none",
                color: "#2d2d2d",
                marginLeft: 8,
                cursor: "pointer",
              }}
              onClick={() => setMode("login")}
            >
              {t("auth.signInButton")}
            </button>
          </div>
        </>
      )}
      {mode === "register" && provider === "wikiloc" && (
        <>
          {/* Wikiloc provider uses the flow page, not a local RegisterForm */}
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button
              className="typography-desktop-button-medium"
              style={{
                background: "none",
                border: "none",
                color: "#2d2d2d",
                marginLeft: 8,
                cursor: "pointer",
              }}
              onClick={() => setProvider(null)}
            >
              {t("auth.backToProviderSelection")}
            </button>
          </div>
        </>
      )}

      {mode === "register" && provider === "garmin" && (
        <>
          <GarminSignupForm />
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button
              className="typography-desktop-button-medium"
              style={{
                background: "none",
                border: "none",
                color: "#2d2d2d",
                marginLeft: 8,
                cursor: "pointer",
              }}
              onClick={() => setProvider(null)}
            >
              {t("auth.backToProviderSelection")}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LoginLanding;
