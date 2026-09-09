import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { Mail, ArrowLeft, X } from "lucide-react";
import styles from "./desktop-VerifyEmail.module.css";
import {
  verifyEmail,
  resendVerificationCode,
} from "../../../shared/api/endpoints/user";
import { VerificationCodeInput } from "../../../shared/components/VerificationCodeInput/VerificationCodeInput";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [verificationStatus, setVerificationStatus] = useState<
    "success" | "error" | "loading" | null
  >(null);
  const [email, setEmail] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Get email from query params (for Strava backend redirects) or sessionStorage (for frontend registrations)
  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    const emailFromStorage = sessionStorage.getItem("pendingVerificationEmail");
    const emailToDisplay = emailFromQuery || emailFromStorage;

    if (emailToDisplay) {
      setEmail(emailToDisplay);
    }
  }, [searchParams]);

  const handleCodeComplete = async (completeCode: string) => {
    // Use email from state or manual email input
    const emailToUse = email || manualEmail.trim();

    if (!emailToUse) {
      setError(
        t("auth.emailVerification.codeRequired") ||
          "Please enter your email address."
      );
      return;
    }

    setIsVerifying(true);
    setError("");
    setResendSuccess(false);

    try {
      await verifyEmail(emailToUse, completeCode);
      // If we get here, response was 200 = success
      setVerificationStatus("success");
      // Clear email from sessionStorage after successful verification
      sessionStorage.removeItem("pendingVerificationEmail");
    } catch (err: any) {
      // Handle error response
      console.error("Failed to verify email:", err);
      setVerificationStatus("error");
      const errorMessage =
        err?.response?.data?.error || t("auth.emailVerification.codeError");
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    // Use email from state or manual email input
    const emailToUse = email || manualEmail.trim();

    if (!emailToUse) {
      setError(
        t("auth.emailVerification.codeRequired") ||
          "Please enter your email address."
      );
      return;
    }

    setIsResending(true);
    setError("");
    setResendSuccess(false);

    try {
      await resendVerificationCode(emailToUse);
      setResendSuccess(true);
    } catch (err: any) {
      console.error("Failed to resend code:", err);
      const errorMessage =
        err?.response?.data?.error || t("auth.emailVerification.error");
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleOpenGmail = () => {
    window.open("https://mail.google.com", "_blank");
  };

  const handleGoToLogin = () => {
    navigate("/profile");
  };

  // Show authenticated success message if verification succeeded
  if (verificationStatus === "success") {
    return (
      <div className={styles["verify-email"]}>
        <div className={styles["verify-email__header"]}>
          <button
            className={`${styles["verify-email__back-button"]} typography-label-large`}
            onClick={handleGoToLogin}
          >
            <ArrowLeft size={20} />
            <span>{t("auth.goToLogin")}</span>
          </button>
        </div>

        <div className={styles["verify-email__content"]}>
          <div className={styles["verify-email__card"]}>
            <h2
              className={`${styles["verify-email__title"]} typography-desktop-title-large`}
            >
              {t("auth.emailVerification.authenticated")}
            </h2>

            <button
              className={`${styles["verify-email__gmail-button"]} typography-desktop-button-medium`}
              onClick={handleGoToLogin}
            >
              {t("auth.goToLogin")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show error message if verification failed
  if (verificationStatus === "error" && !email) {
    return (
      <div className={styles["verify-email"]}>
        <div className={styles["verify-email__header"]}>
          <button
            className={`${styles["verify-email__back-button"]} typography-label-large`}
            onClick={handleGoToLogin}
          >
            <ArrowLeft size={20} />
            <span>{t("auth.goToLogin")}</span>
          </button>
        </div>

        <div className={styles["verify-email__content"]}>
          <div className={styles["verify-email__card"]}>
            <X size={80} className={styles["verify-email__icon"]} />

            <h2
              className={`${styles["verify-email__title"]} typography-desktop-title-large`}
            >
              {t("auth.emailVerification.error")}
            </h2>

            <button
              className={`${styles["verify-email__gmail-button"]} typography-desktop-button-medium`}
              onClick={handleGoToLogin}
            >
              {t("auth.goToLogin")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default view - show code input form
  return (
    <div className={styles["verify-email"]}>
      <div className={styles["verify-email__header"]}>
        <button
          className={`${styles["verify-email__back-button"]} typography-label-large`}
          onClick={handleGoToLogin}
        >
          <ArrowLeft size={20} />
          <span>{t("auth.goToLogin")}</span>
        </button>
      </div>

      <div className={styles["verify-email__content"]}>
        <div className={styles["verify-email__card"]}>
          <h2
            className={`${styles["verify-email__title"]} typography-desktop-title-large`}
          >
            {t("auth.emailVerification.title")}
          </h2>

          <p
            className={`${styles["verify-email__message"]} typography-desktop-body-medium`}
          >
            {email
              ? t("auth.emailVerification.messageWithEmail", { email })
              : t("auth.emailVerification.message")}
          </p>

          {/* Show email input if email is not set */}
          {!email && (
            <div className={styles["verify-email__email-section"]}>
              <input
                type="email"
                className={`${styles["verify-email__email-input"]} typography-body-medium`}
                placeholder={t("auth.email")}
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                disabled={isVerifying || isResending}
                autoComplete="email"
              />
            </div>
          )}

          {/* Always show code input - it's the main action on this page */}
          <div className={styles["verify-email__code-section"]}>
            <p
              className={`${styles["verify-email__code-label"]} typography-desktop-body-small`}
            >
              {t("auth.emailVerification.codePlaceholder")}
            </p>
            <VerificationCodeInput
              onCodeComplete={handleCodeComplete}
              disabled={isVerifying || (!email && !manualEmail.trim())}
              error={!!error && !resendSuccess}
            />
          </div>

          {error && !resendSuccess && (
            <div className={`${styles["verify-email__error"]} typography-body-small`}>{error}</div>
          )}

          {resendSuccess && (
            <div className={`${styles["verify-email__success"]} typography-body-small`}>
              {t("auth.emailVerification.resendSuccess")}
            </div>
          )}

          {isVerifying && (
            <div className={`${styles["verify-email__verifying"]} typography-body-small`}>
              {t("auth.emailVerification.verifying")}
            </div>
          )}

          {(email || manualEmail.trim()) && (
            <button
              type="button"
              className={`${styles["verify-email__resend-button"]} typography-desktop-body-medium`}
              onClick={handleResend}
              disabled={isResending || isVerifying}
            >
              {isResending
                ? t("auth.emailVerification.verifying")
                : t("auth.emailVerification.resendCode")}
            </button>
          )}

          {!email && (
            <>
              <button
                className={`${styles["verify-email__gmail-button"]} typography-desktop-button-medium`}
                onClick={handleOpenGmail}
              >
                <Mail size={20} style={{ marginRight: 8 }} />
                {t("auth.emailVerification.openGmail")}
              </button>

              <button
                className={`${styles["verify-email__login-button"]} typography-desktop-body-medium`}
                onClick={handleGoToLogin}
              >
                <ArrowLeft size={16} style={{ marginRight: 8 }} />
                {t("auth.goToLogin")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
