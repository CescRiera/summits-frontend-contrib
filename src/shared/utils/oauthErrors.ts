/**
 * Get user-friendly error message from OAuth error code
 */
export function getOAuthErrorMessage(
  errorCode: string,
  t: (key: string) => string
): string {
  // Try to get translation first
  const translationKey = `auth.oauth.error.${errorCode}`;
  const translated = t(translationKey);

  // If translation exists and is different from the key, use it
  if (translated !== translationKey) {
    return translated;
  }

  // Fallback error messages
  const errorMessages: Record<string, string> = {
    missing_code:
      t("auth.oauth.error.generic") ||
      "OAuth authorization failed. Please try again.",
    missing_config:
      t("auth.oauth.error.generic") ||
      "Server configuration error. Please contact support.",
    invalid_state:
      t("auth.oauth.error.generic") || "Invalid OAuth state. Please try again.",
    name_required:
      t("auth.fillAllFields") || "Name is required for registration.",
    token_exchange_failed:
      t("auth.oauth.error.generic") ||
      "Failed to authenticate. Please try again.",
    invalid_tokens:
      t("auth.oauth.error.generic") ||
      "Authentication failed. Please try again.",
    user_id_fetch_failed:
      t("auth.oauth.error.generic") ||
      "Failed to retrieve user information. Please try again.",
    no_user_id:
      t("auth.oauth.error.generic") ||
      "User information not found. Please try again.",
    registration_failed:
      t("auth.registrationFailed") || "Registration failed. Please try again.",
    garmin_account_already_linked:
      t("auth.garmin.error.accountAlreadyLinked") ||
      "This Garmin account is already linked to another email address.",
    strava_account_already_linked:
      t("auth.strava.error.accountAlreadyLinked") ||
      "This Strava account is already linked to another email address.",
    email_check_failed:
      t("auth.oauth.error.generic") ||
      "Failed to verify email. Please try again.",
    email_already_exists:
      t("auth.strava.error.emailAlreadyExists") ||
      "This email address is already registered.",
    internal_error:
      t("auth.strava.error.internalError") ||
      "An internal error occurred. Please try again later.",
    unknown_error:
      t("auth.oauth.error.generic") ||
      "An unexpected error occurred. Please try again.",
  };

  const errorMessage = errorMessages[errorCode];
  return (
    errorMessage ||
    errorMessages["unknown_error"] ||
    "An unexpected error occurred. Please try again."
  );
}

/**
 * OAuth message type from popup window
 */
export interface OAuthMessage {
  type: "oauth-success";
  success: boolean;
  message: {
    email?: string;
    requiresVerification?: boolean;
    error?: string;
  } | null;
}
