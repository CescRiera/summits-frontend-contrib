import { useState, useEffect, useCallback, useRef } from "react";

interface DeviceOrientationState {
  heading: number | null;
  isSupported: boolean;
  permissionState: "unknown" | "granted" | "denied";
}

/**
 * Custom hook for reading device compass heading.
 *
 * - iOS 13+ requires a user gesture to call requestPermission().
 * - Android uses deviceorientationabsolute.
 * - Desktop browsers without a compass return null heading.
 *
 * Returns a smoothed heading (0–360°, clockwise from north).
 */
export const useDeviceOrientation = () => {
  const [state, setState] = useState<DeviceOrientationState>({
    heading: null,
    isSupported: false,
    permissionState: "unknown",
  });

  const smoothedRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);

  /** Smooth the heading to avoid jitter (exponential moving average). */
  const smoothHeading = (raw: number): number => {
    const prev = smoothedRef.current;
    if (prev === null) {
      smoothedRef.current = raw;
      return raw;
    }

    // Handle the 0°/360° wraparound
    let diff = raw - prev;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const SMOOTHING = 0.3;
    const smoothed = prev + diff * SMOOTHING;

    // Normalise back to 0–360
    const result = ((smoothed % 360) + 360) % 360;
    smoothedRef.current = result;
    return result;
  };

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      // Throttle updates to ~30fps to reduce re-renders
      const now = performance.now();
      if (now - lastUpdateRef.current < 33) return;
      lastUpdateRef.current = now;

      let heading: number | null = null;

      // iOS provides webkitCompassHeading (degrees clockwise from magnetic north)
      const webkitHeading = (
        event as DeviceOrientationEvent & { webkitCompassHeading?: number }
      ).webkitCompassHeading;
      if (webkitHeading != null && !isNaN(webkitHeading)) {
        heading = webkitHeading;
      } else if (event.alpha != null && !isNaN(event.alpha)) {
        // deviceorientationabsolute gives alpha as degrees from north (counter-clockwise)
        // deviceorientation gives alpha relative to device initial orientation
        // For absolute: heading = 360 - alpha
        heading = (360 - event.alpha) % 360;
      }

      if (heading != null) {
        const smoothed = smoothHeading(heading);
        setState((prev) => ({ ...prev, heading: smoothed }));
      }
    },
    []
  );

  /**
   * Start listening to orientation events.
   * On iOS 13+ this should only be called after requestPermission() succeeds.
   */
  const startListening = useCallback(() => {
    // Try absolute orientation first (Android — more reliable)
    window.addEventListener(
      "deviceorientationabsolute" as any,
      handleOrientation as EventListener,
      true
    );
    // Also listen to regular deviceorientation (iOS / fallback)
    window.addEventListener(
      "deviceorientation",
      handleOrientation as EventListener,
      true
    );
  }, [handleOrientation]);

  const stopListening = useCallback(() => {
    window.removeEventListener(
      "deviceorientationabsolute" as any,
      handleOrientation as EventListener,
      true
    );
    window.removeEventListener(
      "deviceorientation",
      handleOrientation as EventListener,
      true
    );
  }, [handleOrientation]);

  // Detect support on mount
  useEffect(() => {
    const supported =
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function";

    const fallbackSupported = typeof DeviceOrientationEvent !== "undefined";

    setState((prev) => ({
      ...prev,
      isSupported: supported || fallbackSupported,
    }));
  }, []);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  /**
   * Request permission (iOS 13+) and start listening.
   * Must be called from a user gesture (click/tap handler).
   * On Android/desktop this starts listening immediately without a prompt.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // iOS 13+ requires explicit permission
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === "granted") {
          setState((prev) => ({
            ...prev,
            permissionState: "granted",
            isSupported: true,
          }));
          startListening();
          return true;
        } else {
          setState((prev) => ({ ...prev, permissionState: "denied" }));
          return false;
        }
      } catch {
        setState((prev) => ({ ...prev, permissionState: "denied" }));
        return false;
      }
    }

    // Android / desktop — no permission needed, just start listening
    setState((prev) => ({
      ...prev,
      permissionState: "granted",
      isSupported: true,
    }));
    startListening();
    return true;
  }, [startListening]);

  /**
   * On Android / desktop, auto-start listening if no iOS permission API is present.
   * iOS will be started manually via requestPermission() after a user gesture.
   */
  useEffect(() => {
    const needsIOSPermission =
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function";

    if (!needsIOSPermission && state.isSupported) {
      startListening();
      setState((prev) => ({ ...prev, permissionState: "granted" }));
    }
  }, [state.isSupported, startListening]);

  return {
    heading: state.heading,
    isSupported: state.isSupported,
    permissionState: state.permissionState,
    requestPermission,
  };
};
