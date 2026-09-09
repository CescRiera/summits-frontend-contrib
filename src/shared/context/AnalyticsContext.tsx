import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { openSession, setEvent } from "../api/endpoints/analytics";
import { useMobileDetection } from "../hooks/useMobileDetection";
import { detectOS } from "../utils/osDetection";
import { useAuth } from "./AuthContext";

interface AnalyticsContextType {
  trackEvent: (type: string, value?: string) => Promise<void>;
  sessionId: number | null;
  isInitialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(
  undefined
);

const CURRENT_MODE = import.meta.env["VITE_CURRENT_MODE"];
const SHOULD_TRACK = CURRENT_MODE === "pro";

// eslint_disable-next-line react-refresh/only-export-components
export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
};

export const AnalyticsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isInitializingRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const isMobile = useMobileDetection();
  const { authReady, user } = useAuth();

  // Function to open a new session
  const openNewSession = useCallback(async () => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current) {
      return;
    }

    // Wait for mobile detection to complete
    if (isMobile === null) {
      return;
    }

    // Open new session (no localStorage - fresh session on every reload)
    isInitializingRef.current = true;
    try {
      const os = detectOS();
      const device = isMobile ? "Mobile" : "Desktop";

      // The API interceptor will automatically add Authorization header if user is authenticated
      const response = await openSession(os, device);
      const newSessionId = response.session_id;

      setSessionId(newSessionId);
      setIsInitialized(true);
    } catch (error) {
      console.warn("[Analytics] Failed to open session:", error);
      // Still mark as initialized to not block the app
      setIsInitialized(true);
    } finally {
      isInitializingRef.current = false;
    }
  }, [isMobile]);

  // Initialize session on mount and reopen on login/logout
  useEffect(() => {
    if (!SHOULD_TRACK) {
      setIsInitialized(true);
      return;
    }

    // Wait for auth to be ready (so token is available if user is logged in)
    if (!authReady) {
      return;
    }

    // Track user ID to detect login/logout (not token refresh)
    const currentUserId = user?.uid || null;
    const previousUserId = previousUserIdRef.current;

    // If this is the first time (previousUserId is null), open initial session
    // Or if user changed (login: null -> uid, logout: uid -> null)
    if (previousUserId === null || previousUserId !== currentUserId) {
      // Update the ref to track current user
      previousUserIdRef.current = currentUserId;
      // Open new session (will include auth header if user is logged in)
      openNewSession();
    }
  }, [authReady, user, openNewSession]);

  // Track event function
  const trackEvent = useCallback(
    async (type: string, value?: string) => {
      // Don't track if analytics is disabled
      if (!SHOULD_TRACK) {
        return;
      }

      // Don't track if not initialized or no session
      if (!isInitialized || !sessionId) {
        return;
      }

      // Fire and forget - don't block user experience
      setEvent(sessionId, type, value).catch((error) => {
        // Silently handle errors - don't break user experience
        console.warn("[Analytics] Failed to track event:", error);
      });
    },
    [sessionId, isInitialized]
  );

  return (
    <AnalyticsContext.Provider value={{ trackEvent, sessionId, isInitialized }}>
      {children}
    </AnalyticsContext.Provider>
  );
};
