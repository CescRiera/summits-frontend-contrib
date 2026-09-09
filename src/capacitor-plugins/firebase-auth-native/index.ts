import { registerPlugin } from "@capacitor/core";

export interface FirebaseAuthNativePlugin {
  /**
   * Sign in with email and password using Firebase native SDK
   */
  signInWithEmail(options: { email: string; password: string }): Promise<{
    user: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
    };
  }>;

  signOut(): Promise<void>;

  /**
   * Sign in with a custom token using Firebase native SDK
   */
  signInWithCustomToken(options: { token: string }): Promise<{
    user: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
    };
  }>;

  /**
   * Get the ID token for the current user
   */
  getIdToken(options?: { forceRefresh?: boolean }): Promise<{ token: string }>;

  /**
   * Refresh the ID token on app launch (iOS only)
   * This forces a token refresh and logs the previous and new tokens
   */
  refreshTokenOnAppLaunch(): Promise<{ token: string }>;

  /**
   * Attempt to restore an auth session (iOS only)
   * This is a placeholder method - Firebase iOS sessions are auto-persisted
   */
  restoreAuthSession(options: { idToken: string }): Promise<void>;

  /**
   * Get the current user information
   */
  getCurrentUser(): Promise<{
    user: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
    } | null;
  }>;

  /**
   * Add a listener for auth state changes
   * Returns a listener ID that can be used to remove the listener
   * Auth state changes are sent via the 'authStateChanged' event
   */
  addAuthStateListener(): Promise<{ listenerId: string }>;

  /**
   * Remove an auth state listener
   */
  removeAuthStateListener(options: { listenerId: string }): Promise<void>;

  /**
   * Clear all notification badges on iOS
   * This removes the red notification count from the app icon
   */
  clearNotificationBadges(): Promise<void>;
}

const FirebaseAuthNative = registerPlugin<FirebaseAuthNativePlugin>(
  "FirebaseAuthNative",
  {
    web: () => import("./web").then((m) => new m.FirebaseAuthNativeWeb()),
  }
);

export * from "./definitions";
export { FirebaseAuthNative };
