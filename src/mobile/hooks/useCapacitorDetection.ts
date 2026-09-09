import { useState, useEffect } from "react";

export const useCapacitorDetection = () => {
  const [isCapacitor, setIsCapacitor] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkCapacitor = () => {
      try {
        // Check if Capacitor is available
        const Capacitor = (window as any).Capacitor;
        const hasCapacitor = typeof Capacitor !== "undefined";

        // Check if running on native platform
        const isNative =
          hasCapacitor && typeof Capacitor.isNativePlatform === "function"
            ? Capacitor.isNativePlatform()
            : false;

        // Check for Capacitor platform
        const platform =
          hasCapacitor && Capacitor.getPlatform
            ? Capacitor.getPlatform()
            : null;
        const isNativePlatform = platform === "ios" || platform === "android";

        // Only consider it Capacitor if actually running on native platform
        // Don't rely on user agent as it can cause false positives
        setIsCapacitor(isNative || isNativePlatform);
        setIsLoading(false);
      } catch (error) {
        // If there's an error, assume not Capacitor
        setIsCapacitor(false);
        setIsLoading(false);
      }
    };

    // Initial check
    checkCapacitor();

    // Re-check after a short delay in case Capacitor loads asynchronously
    const timeout = setTimeout(checkCapacitor, 100);
    const timeout2 = setTimeout(checkCapacitor, 500);

    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
    };
  }, []);

  return { isCapacitor, isLoading };
};
