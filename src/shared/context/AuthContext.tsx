import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getInternalUserId,
  getUserDetails,
} from "../api/endpoints/user";
import { websocketService } from "../api/websocket";
import {
  loginFirebaseUser,
  loginWithCustomToken,
  logoutFirebaseUser,
} from "../../mobile/authService";
import { onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { setAuthToken, getAuthTokenAsync, setUserData, getUserDataAsync } from "../../mobile/sessionToken";
import { AUTH_LOGOUT_EVENT } from "../api/client";
import pushNotificationManager from "../utils/pushNotifications";

import { Capacitor } from "@capacitor/core";
import { FirebaseAuthNative } from "../../capacitor-plugins/firebase-auth-native";

interface User {
  email: string;
  language: string;
  uid: string;
  type?: "wikiloc" | "strava" | "garmin" | "default";
  externalUserId?: string;
  externalUsername?: string;
  internalUserId?: number;
}

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  userPeaksData: unknown;
  loading: boolean;
  loadingMessage: string;
  completionMessage: string;
  authReady: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithStravaToken: (tokens: {
    customToken?: string | undefined;
    idToken?: string | undefined;
  }) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    type: "wikiloc" | "strava" | "garmin" | "default",
    externalUserId?: string,
    options?: {
      externalUsername?: string;
      name?: string;
      image?: string;
      language?: string;
      notifications_enabled?: boolean;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint_disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [userPeaksData, setUserPeaksData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [authReady, setAuthReady] = useState(false);
  
  // Track if this is the initial auth state check (to prevent clearing session on iOS cold start)
  const isInitialAuthCheckRef = React.useRef(true);
  // Track if user explicitly logged out (vs Firebase just returning null on init)
  const explicitLogoutRef = React.useRef(false);

  // Restore token and user data from storage on app load (for Capacitor native apps)
  // This ensures the session is available immediately when Firebase auth state is restored
  useEffect(() => {
    const restoreSessionFromStorage = async () => {
      try {
        const [storedToken, storedUserData] = await Promise.all([
          getAuthTokenAsync(),
          getUserDataAsync(),
        ]);
        
        if (storedToken && !idToken) {
          // If we have a stored token but no idToken in state, set it
          // This helps maintain auth state during app reloads on native
          setIdToken(storedToken);
          console.log("[Auth] Restored token from storage");
        }
        
        // Restore user data from storage while waiting for Firebase
        if (storedUserData && !user) {
          setUser(storedUserData);
          console.log("[Auth] Restored user data from storage");
        }
      } catch (error) {
        console.warn("[Auth] Failed to restore session from storage:", error);
      }
    };
    
    restoreSessionFromStorage();
  }, []); // Run once on mount

  // Auth state recovery timeout - prevents infinite loading if Firebase auth check hangs
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!authReady) {
        console.warn(
          "[Auth] ⚠️ Auth state check timeout - setting authReady to true to prevent infinite loading"
        );
        setAuthReady(true);
      }
    }, 10000); // 10 second timeout

    return () => {
      clearTimeout(timeout);
    };
  }, [authReady]);

  // Helper function to handle auth state change (used by both native and JS SDK)
  const handleAuthStateChange = useCallback(async (firebaseUser: any) => {
    const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
    
    if (!firebaseUser) {
      // On iOS native, don't clear state during initial auth check
      // Firebase SDK may return null briefly while restoring session from Keychain
      if (isIOSNative && isInitialAuthCheckRef.current && !explicitLogoutRef.current) {
        console.log("[Auth] iOS: Received null user during initial auth check, checking for stored session...");

        // Check if we have a stored token and user data - if so, validate token and wait for Firebase to restore
        const [storedToken, storedUserData] = await Promise.all([
          getAuthTokenAsync(),
          getUserDataAsync(),
        ]);

        if (storedToken && storedUserData) {
          console.log("[Auth] iOS: Found stored session, validating token...");

          // Validate stored token before using it
          try {
            const tokenParts = storedToken.split('.');
            if (tokenParts.length >= 2 && tokenParts[1]) {
              const tokenPayload = JSON.parse(atob(tokenParts[1]));
              const expirationTime = tokenPayload.exp * 1000;
              const now = Date.now();
              const timeUntilExpiration = expirationTime - now;
              const minutesUntilExpiration = timeUntilExpiration / (1000 * 60);

              if (minutesUntilExpiration > 5) {
                // Token is still valid, restore session immediately
                console.log("[Auth] iOS: Stored token is valid, restoring session");
                setUser(storedUserData);
                setIdToken(storedToken);
                isInitialAuthCheckRef.current = false;
                setAuthReady(true);
                return;
              } else {
                console.log("[Auth] iOS: Stored token expired or expires soon, attempting immediate refresh");
                // Try to force refresh the token immediately
                try {
                  const refreshPromise = FirebaseAuthNative.getIdToken({ forceRefresh: true });
                  refreshPromise.then((result) => {
                    console.log("[Auth] iOS: Token refreshed successfully, restoring session");
                    setUser(storedUserData);
                    setIdToken(result.token);
                    setAuthToken(result.token);
                    isInitialAuthCheckRef.current = false;
                    setAuthReady(true);
                  }).catch((_refreshError) => {
                    console.warn("[Auth] iOS: Failed to refresh token, will wait for Firebase to restore");
                    // Fall back to waiting for Firebase to restore
                    setUser(storedUserData);
                    setIdToken(storedToken);
                    isInitialAuthCheckRef.current = false;
                    setAuthReady(true);
                  });
                  return;
                } catch (error) {
                  console.warn("[Auth] iOS: Error attempting token refresh, proceeding with stored token");
                  setUser(storedUserData);
                  setIdToken(storedToken);
                  isInitialAuthCheckRef.current = false;
                  setAuthReady(true);
                  return;
                }
              }
            }
          } catch (tokenError) {
            console.warn("[Auth] iOS: Invalid stored token format, attempting refresh");
            // Try to force refresh the token even with invalid stored token
            try {
              const refreshPromise = FirebaseAuthNative.getIdToken({ forceRefresh: true });
              refreshPromise.then((result) => {
                console.log("[Auth] iOS: Token refreshed successfully after invalid stored token");
                setUser(storedUserData);
                setIdToken(result.token);
                setAuthToken(result.token);
                isInitialAuthCheckRef.current = false;
                setAuthReady(true);
              }).catch((_refreshError) => {
                console.warn("[Auth] iOS: Failed to refresh after invalid stored token, proceeding without token");
                setUser(storedUserData);
                setIdToken(null); // Clear invalid token
                isInitialAuthCheckRef.current = false;
                setAuthReady(true);
              });
              return;
            } catch (error) {
              console.warn("[Auth] iOS: Error attempting refresh after invalid token, proceeding");
              setUser(storedUserData);
              setIdToken(null);
              isInitialAuthCheckRef.current = false;
              setAuthReady(true);
              return;
            }
          }

          // Token is expired or invalid, wait for Firebase to restore and refresh
          // Set a timeout to check if Firebase restored within 5 seconds
          setTimeout(async () => {
            if (isInitialAuthCheckRef.current) {
              const currentUser = await FirebaseAuthNative.getCurrentUser();
              if (currentUser.user) {
                console.log("[Auth] iOS: Firebase restored session during timeout period");
                isInitialAuthCheckRef.current = false;
                // Firebase restored, the auth state change handler will handle the rest
              } else {
                console.log("[Auth] iOS: Firebase didn't restore session, keeping stored session anyway");
                isInitialAuthCheckRef.current = false;
                setAuthReady(true);
                // Don't clear the session - keep the user logged in with stored data
                // The app will handle token refresh when API calls are made
              }
            }
          }, 5000); // Increased timeout to 5 seconds
          return;
        }
      }
      
      isInitialAuthCheckRef.current = false;
      setUser(null);
      setIdToken(null);
      // Only clear stored session data if this was an explicit logout
      if (explicitLogoutRef.current) {
        setAuthToken(null);
        setUserData(null);
        explicitLogoutRef.current = false;
      }
      setAuthReady(true);
      return;
    }
    
    // User is authenticated, mark initial check as complete
    isInitialAuthCheckRef.current = false;

    // Refresh token on app launch for iOS native users
    if (isIOSNative) { // Only for native SDK users
      try {
        console.log("[Auth] iOS: About to call refreshTokenOnAppLaunch...");
        const refreshResult = FirebaseAuthNative.refreshTokenOnAppLaunch();
        refreshResult.then((result) => {
          console.log("[Auth] iOS: refreshTokenOnAppLaunch completed, result:", result);
          console.log("[Auth] iOS: Token refreshed on app launch, new token available");
        }).catch((refreshError) => {
          console.warn("[Auth] iOS: Failed to refresh token on app launch:", refreshError);
        });
      } catch (error) {
        console.warn("[Auth] iOS: Error calling refreshTokenOnAppLaunch:", error);
      }
    }

    // Get token - works for both native and JS SDK users
    let token: string | null = null;
    try {
      if (firebaseUser.getIdToken && typeof firebaseUser.getIdToken === 'function') {
        // JS SDK User object
        token = await firebaseUser.getIdToken();
      } else {
        // Native SDK - get token via plugin
        const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
        if (isIOSNative) {
          const result = await FirebaseAuthNative.getIdToken({ forceRefresh: false });
          token = result.token;
        }
      }
    } catch (error) {
      console.error("[Auth] Failed to get token:", error);
    }
    
    if (token) {
      setIdToken(token);
      setAuthToken(token);
    }


    
    // Fetch user details from backend
    try {
      const [details, internalUserIdResponse] = await Promise.all([
        getUserDetails(),
        getInternalUserId(),
      ]);
      const userData = {
        email: details.email || "",
        language: details.language ?? "en",
        uid: details.uid,
        type: details.type ?? "wikiloc",
        externalUserId: details.externalUserId ?? "",
        externalUsername: details.externalUsername ?? "",
        ...(internalUserIdResponse.success && {
          internalUserId: internalUserIdResponse.user_id,
        }),
      };

      setUser(userData);
      
      // Store user data for session restoration on reload
      setUserData(userData);
    } catch (e) {
      console.warn(
        "[Auth] ⚠️ Failed to fetch user details after auth state change",
        e
      );
    }
    setAuthReady(true);
  }, []);

  // Subscribe to Firebase auth state and token changes
  useEffect(() => {
    const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
    
    if (isIOSNative) {
      // Use native SDK auth state listener on iOS
      
      let nativeListenerId: string | null = null;
      let tokenRefreshInterval: NodeJS.Timeout | null = null;
      
      // Set up native auth state listener using Capacitor events
      console.log("[Auth] iOS: Setting up native auth state listener...");
      FirebaseAuthNative.addAuthStateListener().then((result) => {
        console.log("[Auth] iOS: Native auth state listener set up with ID:", result.listenerId);
        nativeListenerId = result.listenerId;
        
        // Set up event listener for auth state changes
        // Capacitor plugins expose addListener method for listening to events
        const listener = (FirebaseAuthNative as any).addListener('authStateChanged', (event: any) => {
          console.log("[Auth] iOS: Auth state changed event received:", event);
          const nativeUser = event.user;
          if (nativeUser && nativeUser !== null) {
            // Create a minimal user object compatible with handleAuthStateChange
            const userObj = {
              uid: nativeUser.uid,
              email: nativeUser.email,
              emailVerified: nativeUser.emailVerified,
              getIdToken: async () => {
                const result = await FirebaseAuthNative.getIdToken({ forceRefresh: false });
                return result.token;
              },
            };
            handleAuthStateChange(userObj);
          } else {
            handleAuthStateChange(null);
          }
        });
        
        // Also check current user on mount
        console.log("[Auth] iOS: Checking current user on mount...");
        FirebaseAuthNative.getCurrentUser().then(async (currentUserResult) => {
          console.log("[Auth] iOS: getCurrentUser result:", currentUserResult);
          if (currentUserResult.user) {
            const userObj = {
              uid: currentUserResult.user.uid,
              email: currentUserResult.user.email,
              emailVerified: currentUserResult.user.emailVerified,
              getIdToken: async () => {
                const result = await FirebaseAuthNative.getIdToken({ forceRefresh: false });
                return result.token;
              },
            };

            handleAuthStateChange(userObj);
          } else {
            handleAuthStateChange(null);
            // Set up a fallback timeout to check for user restoration
            setTimeout(async () => {
              console.log("[Auth] iOS: Checking again for current user after timeout...");
              try {
                const retryResult = await FirebaseAuthNative.getCurrentUser();
                console.log("[Auth] iOS: Retry getCurrentUser result:", retryResult);
                if (retryResult.user) {
                  const userObj = {
                    uid: retryResult.user.uid,
                    email: retryResult.user.email,
                    emailVerified: retryResult.user.emailVerified,
                    getIdToken: async () => {
                      const result = await FirebaseAuthNative.getIdToken({ forceRefresh: false });
                      return result.token;
                    },
                  };
                  handleAuthStateChange(userObj);
                }
              } catch (retryError) {
                console.warn("[Auth] iOS: Retry getCurrentUser failed:", retryError);
              }
            }, 2000); // Check again after 2 seconds
          }
        }).catch((error) => {
          console.error("[Auth] iOS: Error getting current user:", error);
          handleAuthStateChange(null);
        });
        
        // Set up intelligent token refresh for native SDK (check every 10 minutes)
        // Only refresh if token is close to expiration (< 15 minutes remaining)
        tokenRefreshInterval = setInterval(async () => {
          try {
            const currentUser = await FirebaseAuthNative.getCurrentUser();
            if (currentUser.user) {
              // Check if token needs refresh by trying to get it without force refresh first
              try {
                const tokenResult = await FirebaseAuthNative.getIdToken({ forceRefresh: false });
                // If we got a token without force refresh, check if it's close to expiration
                // Firebase tokens expire after 1 hour, so refresh if less than 15 minutes remaining
                const tokenParts = tokenResult.token.split('.');
                if (tokenParts.length >= 2 && tokenParts[1]) {
                  const tokenPayload = JSON.parse(atob(tokenParts[1]));
                  const expirationTime = tokenPayload.exp * 1000; // Convert to milliseconds
                  const now = Date.now();
                  const timeUntilExpiration = expirationTime - now;
                  const minutesUntilExpiration = timeUntilExpiration / (1000 * 60);

                  if (minutesUntilExpiration < 15) {
                    console.log(`[Auth] iOS: Token expires in ${Math.floor(minutesUntilExpiration)} minutes, refreshing...`);
                    const freshResult = await FirebaseAuthNative.getIdToken({ forceRefresh: true });
                    setIdToken(freshResult.token);
                    setAuthToken(freshResult.token);
                  }
                }
              } catch (tokenError) {
                // If getting token without force refresh fails, try with force refresh
                console.log("[Auth] iOS: Token refresh needed, forcing refresh...");
                const result = await FirebaseAuthNative.getIdToken({ forceRefresh: true });
                setIdToken(result.token);
                setAuthToken(result.token);
              }
            }
          } catch (error) {
            console.warn("[Auth] Failed to check/refresh token:", error);
          }
        }, 10 * 60 * 1000); // Check every 10 minutes instead of 5
        
        // Store listener for cleanup
        (window as any).__firebaseAuthNativeListener = listener;

        // Set up app resume/focus detection for token validation on iOS
        const handleAppResume = async () => {
          console.log("[Auth] iOS: App resumed, validating token...");
          try {
            const currentUser = await FirebaseAuthNative.getCurrentUser();
            if (currentUser.user) {
              // Validate current token and refresh if needed
              try {
                const tokenResult = await FirebaseAuthNative.getIdToken({ forceRefresh: false });
                // Check token expiration
                const tokenParts = tokenResult.token.split('.');
                if (tokenParts.length >= 2 && tokenParts[1]) {
                  const tokenPayload = JSON.parse(atob(tokenParts[1]));
                  const expirationTime = tokenPayload.exp * 1000;
                  const now = Date.now();
                  const timeUntilExpiration = expirationTime - now;
                  const minutesUntilExpiration = timeUntilExpiration / (1000 * 60);

                  if (minutesUntilExpiration < 5) {
                    console.log(`[Auth] iOS: Token expired or expires soon (${Math.floor(minutesUntilExpiration)} minutes), refreshing...`);
                    const freshResult = await FirebaseAuthNative.getIdToken({ forceRefresh: true });
                    setIdToken(freshResult.token);
                    setAuthToken(freshResult.token);
                  } else {
                    // Token is still valid, ensure it's set in state
                    setIdToken(tokenResult.token);
                    setAuthToken(tokenResult.token);
                  }
                }
              } catch (tokenError) {
                // Token is invalid/expired, force refresh
                console.log("[Auth] iOS: Token invalid on resume, refreshing...");
                const result = await FirebaseAuthNative.getIdToken({ forceRefresh: true });
                setIdToken(result.token);
                setAuthToken(result.token);
              }
            }
          } catch (error) {
            console.warn("[Auth] Failed to validate token on app resume:", error);
          }
        };

        // Listen for app resume events (Capacitor events)
        // @ts-ignore - Capacitor plugins expose addListener
        const resumeListener = Capacitor.Plugins.App?.addListener('appStateChange', (state: any) => {
          if (state.isActive) {
            handleAppResume();
          }
        });

        // Also listen for visibility change events as fallback
        const handleVisibilityChange = () => {
          if (!document.hidden) {
            handleAppResume();
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Store listeners for cleanup
        (window as any).__appResumeListener = resumeListener;
        (window as any).__visibilityChangeListener = handleVisibilityChange;
      }).catch((error) => {
        console.error("[Auth] iOS: Failed to set up native auth state listener:", error);

        // Try to fall back to checking current user manually
        FirebaseAuthNative.getCurrentUser().then((currentUserResult) => {
          if (currentUserResult.user) {
            const userObj = {
              uid: currentUserResult.user.uid,
              email: currentUserResult.user.email,
              emailVerified: currentUserResult.user.emailVerified,
              getIdToken: async () => {
                const result = await FirebaseAuthNative.getIdToken({ forceRefresh: false });
                return result.token;
              },
            };
            handleAuthStateChange(userObj);
          } else {
            setAuthReady(true);
          }
        }).catch((fallbackError) => {
          console.error("[Auth] iOS: Fallback current user check failed:", fallbackError);
          setAuthReady(true);
        });
      });
      
      return () => {
        if (nativeListenerId) {
          FirebaseAuthNative.removeAuthStateListener({ listenerId: nativeListenerId }).catch(() => {});
        }
        if (tokenRefreshInterval) {
          clearInterval(tokenRefreshInterval);
        }
        // Remove event listeners
        if ((window as any).__firebaseAuthNativeListener) {
          (window as any).__firebaseAuthNativeListener.remove();
          delete (window as any).__firebaseAuthNativeListener;
        }
        if ((window as any).__appResumeListener) {
          (window as any).__appResumeListener.remove();
          delete (window as any).__appResumeListener;
        }
        if ((window as any).__visibilityChangeListener) {
          document.removeEventListener('visibilitychange', (window as any).__visibilityChangeListener);
          delete (window as any).__visibilityChangeListener;
        }
      };
    } else {
      // Use JS SDK auth state listener on web/Android
      
      const unsubAuth = onAuthStateChanged(auth, handleAuthStateChange);

      const unsubToken = onIdTokenChanged(auth, async (firebaseUser) => {
        // Check if user is actually signed out (not just a temporary null)
        if (!firebaseUser) {
          // Only clear if auth.currentUser is also null (user actually signed out)
          if (!auth.currentUser) {
            setUser(null);
            setIdToken(null);
            // Only clear stored session data if this was an explicit logout
            if (explicitLogoutRef.current) {
              setAuthToken(null);
              setUserData(null);
              explicitLogoutRef.current = false;
            }
            setAuthReady(true);
          } else {
            // Try to recover token from currentUser if available
            try {
              const currentUser = auth.currentUser;
              if (currentUser) {
                const token = await currentUser.getIdToken();
                setIdToken(token);
                setAuthToken(token);
              }
            } catch (error) {
              console.warn(
                "[Auth] ⚠️ Failed to recover token from currentUser:",
                error
              );
              // Don't clear user state on temporary token fetch failure
            }
          }
          return;
        }
        try {
          const token = await firebaseUser.getIdToken();
          setIdToken(token);
          setAuthToken(token);

          // Just update state. Proactive refresh is handled by the dedicated interval below.
          // This prevents circular dependencies where refresh triggers this listener
          // which might trigger another refresh check.
        } catch (error) {
          console.error(
            "[Auth] ❌ Failed to get token in onIdTokenChanged:",
            error
          );
          // Don't clear user state on temporary token fetch failure
          // Firebase will retry automatically
        }
      });

      return () => {
        unsubAuth();
        unsubToken();
      };
    }
  }, [handleAuthStateChange]);

  // Periodic token expiration logging and proactive refresh (every 5 minutes)
  // Only runs when user is authenticated
  // Proactively refreshes tokens before expiration to prevent issues when idle
  // Periodic token expiration check and proactive refresh for Web/Android
  // This mimics the robust Native implementation but uses JS SDK methods
  useEffect(() => {
    // Skip if on iOS Native (handled by native listener) or no user
    const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
    if (isIOSNative || !auth.currentUser || !idToken) {
      return;
    }

    const checkAndRefreshToken = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Get token details without forcing refresh first
        const tokenResult = await user.getIdTokenResult();
        const expirationTime = new Date(tokenResult.expirationTime).getTime();
        const now = Date.now();
        const minutesUntilExpiration = (expirationTime - now) / (1000 * 60);

        // Refresh if less than 20 minutes remaining (increased buffer for safety)
        if (minutesUntilExpiration < 20) {
          console.log(`[Auth] Web: Token expires in ${minutesUntilExpiration.toFixed(1)} mins, refreshing...`);
          const newToken = await user.getIdToken(true);
          setIdToken(newToken);
          setAuthToken(newToken);
        }
      } catch (error) {
        console.warn("[Auth] Web: Token check failed", error);
      }
    };

    // Check immediately and then every 5 minutes
    checkAndRefreshToken();
    const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [idToken]);

  // Visibility-based token refresh - refresh token when app becomes visible
  // This handles cases where periodic refresh was throttled in background tabs
  // Visibility-based token refresh for Web/Android
  useEffect(() => {
    // Skip if on iOS Native (handled by native listener) or no user
    const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
    if (isIOSNative || !auth.currentUser || !idToken) {
      return;
    }

    const handleVisibilityChange = async () => {
      if (document.hidden) return;

      const user = auth.currentUser;
      if (!user) return;

      try {
        // Check token expiration and refresh if needed
        const tokenResult = await user.getIdTokenResult();
        const expirationTime = new Date(tokenResult.expirationTime).getTime();
        const now = Date.now();
        const minutesUntilExpiration = (expirationTime - now) / (1000 * 60);

        if (minutesUntilExpiration < 20) {
          console.log(`[Auth] Web: App visible, token expires in ${minutesUntilExpiration.toFixed(1)} mins, refreshing...`);
          const newToken = await user.getIdToken(true);
          setIdToken(newToken);
          setAuthToken(newToken);
        }
      } catch (error) {
        console.warn("[Auth] Web: Visibility token check failed", error);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    // Initial check on mount if visible
    if (!document.hidden) {
      handleVisibilityChange();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [idToken]);

  useEffect(() => {
  }, [user, idToken]);

  useEffect(() => {
    if (user?.externalUserId) {
      websocketService.connect();
      websocketService.joinUserRoom(user.externalUserId);
    } else {
      websocketService.disconnect();
    }
    return () => {
      websocketService.removeAllListeners();
    };
  }, [user?.externalUserId]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const data = await apiLogin(email, password);
      
      if (data.user) {
        try {
          await loginFirebaseUser(email, password);

          // Also sign in with native Firebase SDK on iOS for token management
          const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
          if (isIOSNative) {
            try {
              console.log("[Auth] iOS: Signing in with native Firebase SDK...");
              await FirebaseAuthNative.signInWithEmail({ email, password });
              console.log("[Auth] iOS: Native Firebase sign-in successful");
            } catch (nativeError: any) {
              console.warn("[Auth] iOS: Native Firebase sign-in failed:", nativeError);
              // Don't fail the login if native auth fails - web auth is sufficient
            }
          }
        } catch (firebaseError: any) {
          // If we have an API token, continue anyway
          if (!data.idToken) {
            return {
              success: false,
              error: `Firebase login failed: ${firebaseError?.message || firebaseError?.code || "Unknown error"}`
            };
          }
        }
        
        const firebaseUser = auth.currentUser;
        let firebaseToken = null;
        if (firebaseUser) {
          try {
            firebaseToken = await firebaseUser.getIdToken(true);
          } catch (tokenError) {
            // Token retrieval failed, continue with API token if available
          }
        }
        
        const effectiveToken = firebaseToken || data.idToken || null;

        if (effectiveToken) {
          setIdToken(effectiveToken);
          setAuthToken(effectiveToken);

          const mappedUser: User = {
            email: data.user.email || "",
            language: data.user.language,
            uid: data.user.uid,
            type: data.user.type,
            externalUserId: data.user.externalUserId,
            externalUsername: data.user.externalUsername,
          };

          setUser(mappedUser);
          
          // Store user data for session restoration on reload
          setUserData(mappedUser);

          try {
            const internalUserIdResponse = await getInternalUserId();
            if (internalUserIdResponse.success) {
              const updatedUser = {
                ...mappedUser,
                internalUserId: internalUserIdResponse.user_id,
              };
              setUser(updatedUser);
              
              // Update stored user data with internal user ID
              setUserData(updatedUser);
            }
          } catch (e) {
            // Failed to get internal user ID, but continue
          }

          return { success: true };
        }
        return { success: false, error: "Login failed to obtain token" };
      }
      return { success: false, error: "Login failed" };
    } catch (error: unknown) {
      type ApiError = { response?: { data?: { error?: string } } };
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.error || "Login failed",
      };
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }, []);

  const loginWithStravaToken = useCallback(
    async (tokens: {
      customToken?: string | undefined;
      idToken?: string | undefined;
    }) => {
      const { customToken, idToken: backendIdToken } = tokens;
      setLoading(true);
      try {
        let firebaseToken: string | null = null;

        if (customToken) {
          const firebaseUser = await loginWithCustomToken(customToken);

          if (firebaseUser) {
            firebaseToken = await firebaseUser.getIdToken(true);
          }
        }

        const effectiveToken = firebaseToken || backendIdToken;

        if (effectiveToken) {
          setIdToken(effectiveToken);
          setAuthToken(effectiveToken);

          // Fetch user details from backend to complete the session
          const [details, internalUserIdResponse] = await Promise.all([
            getUserDetails(),
            getInternalUserId(),
          ]);

          const mappedUser: User = {
            email: details.email || "",
            language: details.language ?? "en",
            uid: details.uid || "",
            type: details.type ?? "strava",
            externalUserId: details.externalUserId ?? "",
            externalUsername: details.externalUsername ?? "",
            ...(internalUserIdResponse.success && {
              internalUserId: internalUserIdResponse.user_id,
            }),
          };

          setUser(mappedUser);

          // Store user data for session restoration on reload
          setUserData(mappedUser);

          return { success: true };
        }
        return { success: false, error: "Strava login failed to obtain user" };
      } catch (error: any) {
        console.error("Strava login error:", error);
        return {
          success: false,
          error: error?.message || "Strava login failed",
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      type: "wikiloc" | "strava" | "garmin" | "default",
      externalUserId?: string,
      options?: {
        externalUsername?: string;
        name?: string;
        image?: string;
        language?: string;
        notifications_enabled?: boolean;
      }
    ) => {
      setLoading(true);
      setLoadingMessage("Registering...");
      try {
        await apiRegister(email, password, type, externalUserId, options);
        // Removed frontend Firebase sign-up; backend handles user creation/auth
        return { success: true };
      } catch (error: unknown) {
        type ApiError = { response?: { data?: { error?: string } } };
        const apiError = error as ApiError;
        return {
          success: false,
          error: apiError.response?.data?.error || "Registration failed",
        };
      } finally {
        setLoading(false);
        setLoadingMessage("");
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setLoading(true);
    // Mark this as an explicit logout so auth state change handler clears storage
    explicitLogoutRef.current = true;
    
    try {
      // Unsubscribe this device from push notifications
      try {
        await pushNotificationManager.unsubscribe();
      } catch (error) {
        console.warn("[Auth] Failed to unsubscribe from push notifications:", error);
      }
      
      await apiLogout();
      await logoutFirebaseUser();

      // Also sign out from native Firebase SDK on iOS
      const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
      if (isIOSNative) {
        try {
          console.log("[Auth] iOS: Signing out from native Firebase SDK...");
          await FirebaseAuthNative.signOut();
          console.log("[Auth] iOS: Native Firebase sign-out successful");
        } catch (nativeError: any) {
          console.warn("[Auth] iOS: Native Firebase sign-out failed:", nativeError);
          // Don't fail the logout if native sign-out fails
        }
      }
    } finally {
      websocketService.disconnect();
      websocketService.removeAllListeners();
      setUser(null);
      setIdToken(null);
      setAuthToken(null); // Clear stored token on explicit logout
      setUserData(null); // Clear stored user data on explicit logout
      setUserPeaksData(null);
      setCompletionMessage("");
      setLoading(false);
      explicitLogoutRef.current = false;
    }
  }, []);

  // Handle global logout events (from API client)
  useEffect(() => {
    const handleGlobalLogout = () => {
      console.warn("[Auth] Global logout triggered");
      logout();
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleGlobalLogout);
    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleGlobalLogout);
    };
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      idToken,
      userPeaksData,
      loading,
      loadingMessage,
      completionMessage,
      authReady,
      login,
      loginWithStravaToken,
      register,
      logout,
    }),
    [
      user,
      idToken,
      userPeaksData,
      loading,

      loadingMessage,
      completionMessage,
      authReady,
      login,
      register,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
