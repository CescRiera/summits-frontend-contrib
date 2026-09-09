import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useI18n } from "../../../shared/context/I18nContext";
import { KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import styles from "./ChangePassword.module.css";
import { resetPassword, resendPasswordResetCode } from "../../../shared/api/endpoints/user";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import { VerificationCodeInput } from "../../../shared/components/VerificationCodeInput/VerificationCodeInput";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Get email from query params or sessionStorage
  useEffect(() => {
    const emailFromQuery = searchParams.get("email");
    const emailFromStorage = sessionStorage.getItem("pendingPasswordResetEmail");
    const emailToDisplay = emailFromQuery || emailFromStorage;
    
    if (emailToDisplay) {
      setEmail(emailToDisplay);
    }
  }, [searchParams]);

  const handleCodeComplete = (completeCode: string) => {
    setCode(completeCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailToUse = email || manualEmail.trim();
    
    if (!emailToUse) {
      setError(t("auth.resetPassword.emailRequired") || "Please enter your email address.");
      return;
    }

    if (!code || code.length !== 6) {
      setError(t("auth.resetPassword.codeRequired") || "Please enter the 6-digit code.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError(t("auth.fillAllFields"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordsNotMatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("auth.passwordMin"));
      return;
    }

    await handleSubmitInternal(emailToUse, code);
  };

  const handleSubmitInternal = async (emailToUse: string, codeToUse: string) => {
    setLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const result = await resetPassword(emailToUse, codeToUse, newPassword);
      // If we get a 200 response, treat it as success unless there's an explicit error
      if (result.error) {
        setError(result.error || t("auth.resetPassword.error"));
      } else {
        // Success - 200 response means password was reset
        setSuccess(true);
        // Clear email from sessionStorage after successful reset
        sessionStorage.removeItem("pendingPasswordResetEmail");
        setTimeout(() => {
          navigate("/profile");
        }, 3000);
      }
    } catch (err) {
      setError((err as any)?.response?.data?.error || t("auth.resetPassword.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const emailToUse = email || manualEmail.trim();
    
    if (!emailToUse) {
      setError(t("auth.resetPassword.emailRequired") || "Please enter your email address.");
      return;
    }

    setIsResending(true);
    setError("");
    setResendSuccess(false);

    try {
      await resendPasswordResetCode(emailToUse);
      setResendSuccess(true);
    } catch (err: any) {
      console.error("Failed to resend code:", err);
      const errorMessage =
        err?.response?.data?.error ||
        t("auth.resetPassword.resendError");
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/profile");
  };

  if (success) {
    return (
      <div className={styles["change-password"]}>
        <OverlayHeader
          title={t("auth.resetPassword.title")}
          onBack={handleGoToLogin}
        />
        <div className={styles["change-password__content"]}>
          <div className={styles["change-password__card"]}>
            <div className={styles["change-password__icon-container"]}>
              <CheckCircle size={64} className={styles["change-password__icon"]} />
            </div>
            <h2 className={`${styles["change-password__title"]} typography-title-large`}>
              {t("auth.resetPassword.successTitle")}
            </h2>
            <p className={`${styles["change-password__message"]} typography-body-medium`}>
              {t("auth.resetPassword.successMessage")}
            </p>
            <button
              className={`${styles["change-password__login-button"]} typography-button-medium`}
              onClick={handleGoToLogin}
            >
              <ArrowLeft size={16} style={{ marginRight: 8 }} />
              {t("auth.goToLogin")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["change-password"]}>
      <OverlayHeader
        title={t("auth.resetPassword.title")}
        onBack={handleGoToLogin}
      />
      <div className={styles["change-password__content"]}>
        <div className={styles["change-password__card"]}>
          <div className={styles["change-password__icon-container"]}>
            <KeyRound size={64} className={styles["change-password__icon"]} />
          </div>
          <h2 className={`${styles["change-password__title"]} typography-title-large`}>
            {t("auth.resetPassword.title")}
          </h2>
          <p className={`${styles["change-password__message"]} typography-body-medium`}>
            {email
              ? t("auth.resetPassword.messageWithEmail", { email })
              : t("auth.resetPassword.instructions")}
          </p>

          {/* Show email input if email is not set */}
          {!email && (
            <div className={styles["change-password__email-section"]}>
              <input
                type="email"
                className={`${styles["change-password__input"]} typography-body-medium`}
                placeholder={t("auth.email")}
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                disabled={loading || isResending}
                autoComplete="email"
              />
            </div>
          )}

          {/* Code input section */}
          <div className={styles["change-password__code-section"]}>
            <p className={`${styles["change-password__code-label"]} typography-body-small`}>
              {t("auth.resetPassword.codePlaceholder") || "Enter 6-digit code"}
            </p>
            <VerificationCodeInput
              onCodeComplete={handleCodeComplete}
              disabled={loading || isResending || (!email && !manualEmail.trim())}
              error={!!error && !resendSuccess}
            />
          </div>

          {error && !resendSuccess && (
            <div className={`${styles["change-password__error"]} typography-body-small`}>
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className={`${styles["change-password__success"]} typography-body-small`}>
              {t("auth.resetPassword.resendSuccess")}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles["change-password__form"]}>
            <input
              className={`${styles["change-password__input"]} typography-body-medium`}
              type="password"
              placeholder={t("auth.password")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading || isResending}
            />
            <input
              className={`${styles["change-password__input"]} typography-body-medium`}
              type="password"
              placeholder={t("auth.confirmPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading || isResending}
            />
            <button
              className={`${styles["change-password__button"]} typography-button-medium`}
              type="submit"
              disabled={loading || isResending || !code || code.length !== 6}
            >
              {loading ? t("common.loading") : t("auth.resetPassword.submit")}
            </button>
          </form>

          {(email || manualEmail.trim()) && (
            <button
              type="button"
              className={`${styles["change-password__resend-button"]} typography-body-medium`}
              onClick={handleResend}
              disabled={isResending || loading}
            >
              {isResending
                ? t("common.loading")
                : t("auth.resetPassword.resendCode")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

