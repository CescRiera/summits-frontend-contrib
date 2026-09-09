import { storage } from "../shared/utils/storage";

const AUTH_TOKEN_KEY = "auth_token";
const USER_DATA_KEY = "auth_user_data";

interface StoredUserData {
  email: string;
  language: string;
  uid: string;
  type?: "wikiloc" | "strava" | "garmin" | "default";
  externalUserId?: string;
  externalUsername?: string;
  internalUserId?: number;
}

let currentIdToken: string | null = null;
let currentUserData: StoredUserData | null = null;
let tokenInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Initialize token and user data from storage on app load
 */
const initializeToken = async (): Promise<void> => {
  if (tokenInitialized) return;
  if (initializationPromise) return initializationPromise;
  
  initializationPromise = (async () => {
    try {
      const [storedToken, storedUserData] = await Promise.all([
        storage.get(AUTH_TOKEN_KEY),
        storage.get(USER_DATA_KEY),
      ]);
      
      if (storedToken) {
        currentIdToken = storedToken;
      }
      
      if (storedUserData) {
        try {
          currentUserData = JSON.parse(storedUserData);
        } catch (parseError) {
          console.warn("[SessionToken] Failed to parse stored user data:", parseError);
        }
      }
      
      tokenInitialized = true;
    } catch (error) {
      console.warn("[SessionToken] Failed to initialize token from storage:", error);
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

/**
 * Store user data for session restoration on iOS native apps
 */
export const setUserData = (userData: StoredUserData | null) => {
  currentUserData = userData;
  
  // Persist user data asynchronously (fire and forget)
  (async () => {
    try {
      if (userData) {
        await storage.set(USER_DATA_KEY, JSON.stringify(userData));
      } else {
        await storage.remove(USER_DATA_KEY);
      }
    } catch (error) {
      console.error("[SessionToken] Failed to persist user data:", error);
      // Don't throw - user data is still set in memory
    }
  })();
};

/**
 * Get stored user data (synchronous, may return null if not loaded yet)
 */
export const getUserData = (): StoredUserData | null => {
  return currentUserData;
};

/**
 * Async version that ensures user data is loaded from storage
 */
export const getUserDataAsync = async (): Promise<StoredUserData | null> => {
  if (!tokenInitialized) {
    await initializeToken();
  }
  
  return currentUserData;
};
