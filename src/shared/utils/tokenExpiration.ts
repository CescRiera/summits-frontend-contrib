import type { User } from "firebase/auth";

/**
 * Log token expiration information and proactively refresh tokens before expiration.
 * Refreshes tokens when they have less than 10 minutes remaining to prevent
 * authentication issues when users are idle on non-root pages.
 */
export async function logTokenExpiration(
  user: User | null,
  refreshToken?: (token: string) => void
): Promise<void> {
  if (!user) {
    return;
  }

  try {
    const tokenResult = await user.getIdTokenResult();
    const expirationTime = new Date(tokenResult.expirationTime);
    const now = new Date();
    const expiresIn = expirationTime.getTime() - now.getTime();
    const minutesLeft = Math.floor(expiresIn / 60000);
    const secondsLeft = Math.floor(expiresIn / 1000);

    // Proactively refresh token if it expires in less than 10 minutes
    // This prevents authentication failures when users are idle on non-root pages
    if (minutesLeft < 10 && minutesLeft >= 0) {
      console.warn(
        `[Auth] ⚠️ Token expires in ${minutesLeft} minutes (${secondsLeft} seconds) - proactively refreshing...`
      );
      try {
        // Force refresh the token to get a new one with extended expiration
        const newToken = await user.getIdToken(true);
        if (refreshToken) {
          refreshToken(newToken);
        }
      } catch (refreshError) {
        console.error(
          "[Auth] ❌ Failed to proactively refresh token:",
          refreshError
        );
        // Don't throw - let Firebase handle automatic refresh on next request
      }
    } else if (minutesLeft < 0) {
      console.warn(
        `[Auth] ⚠️ Token EXPIRED ${Math.abs(minutesLeft)} minutes ago - attempting refresh...`
      );
      try {
        // Token is expired, force refresh
        const newToken = await user.getIdToken(true);
        if (refreshToken) {
          refreshToken(newToken);
        }
      } catch (refreshError) {
        console.error(
          "[Auth] ❌ Failed to refresh expired token:",
          refreshError
        );
        // Don't throw - let Firebase handle automatic refresh on next request
      }
    } else {
    }
  } catch (error) {
    console.error("[Auth] ❌ Failed to check token expiration:", error);
    // Don't throw - this is just monitoring, not critical
  }
}
