import { storage } from "../shared/utils/storage";

const AUTH_TOKEN_KEY = "auth_token";

let currentIdToken: string | null = null;
let tokenInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize token from storage on app load
 */
const initializeToken = async (): Promise<void> => {
  if (tokenInitialized) return;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      const storedToken = await storage.get(AUTH_TOKEN_KEY);
      if (storedToken) {
        currentIdToken = storedToken;
      }
      tokenInitialized = true;
    } catch (error) {
      console.warn(
        "[SessionToken] Failed to initialize token from storage:",
        error
      );
      tokenInitialized = true; // Mark as initialized even on error to prevent infinite retries
    }
  })();

  return initializationPromise;
};

// Initialize token immediately (fire and forget)
initializeToken().catch(() => {
  // Error already handled in initializeToken
});

export const setAuthToken = (token: string | null) => {
  currentIdToken = token;

  // Persist token asynchronously (fire and forget)
  (async () => {
    try {
      if (token) {
        await storage.set(AUTH_TOKEN_KEY, token);
      } else {
        await storage.remove(AUTH_TOKEN_KEY);
      }
    } catch (error) {
      console.error("[SessionToken] Failed to persist token:", error);
      // Don't throw - token is still set in memory
    }
  })();
};

export const getAuthToken = (): string | null => {
  // Return current token immediately (may be null if not loaded yet)
  // The token will be loaded from storage asynchronously on app start
  return currentIdToken;
};

/**
 * Async version that ensures token is loaded from storage
 * Use this when you need to wait for storage initialization
 */
export const getAuthTokenAsync = async (): Promise<string | null> => {
  // Ensure token is initialized from storage
  if (!tokenInitialized) {
    await initializeToken();
  }

  return currentIdToken;
};
