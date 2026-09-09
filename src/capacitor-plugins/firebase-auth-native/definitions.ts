export interface FirebaseAuthNativePlugin {
  signInWithEmail(options: { email: string; password: string }): Promise<{
    user: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
    };
  }>;

  signOut(): Promise<void>;
  
  signInWithCustomToken(options: { token: string }): Promise<{
    user: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
    };
  }>;

  getIdToken(options?: { forceRefresh?: boolean }): Promise<{ token: string }>;

  refreshTokenOnAppLaunch(): Promise<{ token: string }>;

  restoreAuthSession(options: { idToken: string }): Promise<void>;

  getCurrentUser(): Promise<{
    user: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
    } | null;
  }>;

  addAuthStateListener(): Promise<{ listenerId: string }>;

  removeAuthStateListener(options: { listenerId: string }): Promise<void>;

  /**
   * Clear all notification badges on iOS
   * This removes the red notification count from the app icon
   */
  clearNotificationBadges(): Promise<void>;
}
