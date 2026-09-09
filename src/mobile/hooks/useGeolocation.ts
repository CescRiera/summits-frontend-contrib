import { useState, useEffect, useCallback, useRef } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { useCapacitorDetection } from "./useCapacitorDetection";

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationState {
  coordinates: GeolocationCoordinates | null;
  permissionGranted: boolean;
  isLoading: boolean;
  error: string | null;
}

const PERMISSION_STORAGE_KEY = "geolocation-permission-granted";

/**
 * Custom hook for handling geolocation across Web, iOS, and Android platforms
 */
export const useGeolocation = () => {
  const { isCapacitor, isLoading: isCapacitorLoading } =
    useCapacitorDetection();
  const [state, setState] = useState<GeolocationState>({
    coordinates: null,
    permissionGranted: false,
    isLoading: true,
    error: null,
  });
  const coordinatesFromPermissionRef = useRef<GeolocationCoordinates | null>(null);

  /**
   * Check permission status on Web
   */
  const checkWebPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.permissions || !navigator.permissions.query) {
      // Fallback: check localStorage
      return localStorage.getItem(PERMISSION_STORAGE_KEY) === "true";
    }

    try {
      const result = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      return result.state === "granted";
    } catch (error) {
      // Fallback: check localStorage
      return localStorage.getItem(PERMISSION_STORAGE_KEY) === "true";
    }
  }, []);

  /**
   * Check permission status on Capacitor (iOS/Android)
   */
  const checkCapacitorPermission = useCallback(async (): Promise<boolean> => {
    try {
      const status = await Geolocation.checkPermissions();
      return status.location === "granted";
    } catch (error) {
      console.warn("Error checking Capacitor geolocation permission:", error);
      // Fallback: check localStorage
      return localStorage.getItem(PERMISSION_STORAGE_KEY) === "true";
    }
  }, []);

  /**
   * Request permission on Web
   * Uses low accuracy first for faster permission request
   */
  const requestWebPermission = useCallback(
    async (): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          setState((prev) => ({
            ...prev,
            error: "Geolocation is not supported by this browser",
          }));
          resolve(false);
          return;
        }

        // Phase 1: Try to get current position with low accuracy first (fast)
        // This will trigger permission prompt
        navigator.geolocation.getCurrentPosition(
          (position) => {
            // Permission granted and position received - extract coordinates immediately
            const coords: GeolocationCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            coordinatesFromPermissionRef.current = coords;
            localStorage.setItem(PERMISSION_STORAGE_KEY, "true");
            setState((prev) => ({
              ...prev,
              permissionGranted: true,
              coordinates: coords,
              error: null,
            }));
            resolve(true);
          },
          (error) => {
            // If low accuracy fails, try high accuracy as fallback
            if (error.code === error.PERMISSION_DENIED) {
              setState((prev) => ({
                ...prev,
                permissionGranted: false,
                error: "Location permission denied",
              }));
              localStorage.setItem(PERMISSION_STORAGE_KEY, "false");
              resolve(false);
              return;
            }

            // Try high accuracy as fallback for other errors
            navigator.geolocation.getCurrentPosition(
              (position) => {
                // Permission granted and position received - extract coordinates immediately
                const coords: GeolocationCoordinates = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                };
                coordinatesFromPermissionRef.current = coords;
                localStorage.setItem(PERMISSION_STORAGE_KEY, "true");
                setState((prev) => ({
                  ...prev,
                  permissionGranted: true,
                  coordinates: coords,
                  error: null,
                }));
                resolve(true);
              },
              (fallbackError) => {
                if (fallbackError.code === fallbackError.PERMISSION_DENIED) {
                  setState((prev) => ({
                    ...prev,
                    permissionGranted: false,
                    error: "Location permission denied",
                  }));
                  localStorage.setItem(PERMISSION_STORAGE_KEY, "false");
                } else {
                  setState((prev) => ({
                    ...prev,
                    error: "Failed to get location",
                  }));
                }
                resolve(false);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              }
            );
          },
          {
            enableHighAccuracy: false, // Use network positioning (fast)
            timeout: 3000, // Short timeout for quick response
            maximumAge: 60000, // Accept positions up to 1 minute old
          }
        );
      });
    },
    []
  );

  /**
   * Request permission on Capacitor (iOS/Android)
   */
  const requestCapacitorPermission = useCallback(
    async (): Promise<boolean> => {
      try {
        const status = await Geolocation.requestPermissions();
        const granted = status.location === "granted";
        
        if (granted) {
          localStorage.setItem(PERMISSION_STORAGE_KEY, "true");
          setState((prev) => ({
            ...prev,
            permissionGranted: true,
            error: null,
          }));
        } else {
          localStorage.setItem(PERMISSION_STORAGE_KEY, "false");
          setState((prev) => ({
            ...prev,
            permissionGranted: false,
            error: "Location permission denied",
          }));
        }
        return granted;
      } catch (error) {
        console.error("Error requesting Capacitor geolocation permission:", error);
        setState((prev) => ({
          ...prev,
          error: "Failed to request location permission",
        }));
        return false;
      }
    },
    []
  );

  /**
   * Get current position on Web - FAST version
   * First tries to get a quick cached/low-accuracy position,
   * then refines with high accuracy in the background
   */
  const getWebPosition = useCallback(
    async (): Promise<GeolocationCoordinates | null> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          setState((prev) => ({
            ...prev,
            error: "Geolocation is not supported",
          }));
          resolve(null);
          return;
        }

        // Phase 1: Get quick position (cached or low accuracy)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: GeolocationCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            setState((prev) => ({
              ...prev,
              coordinates: coords,
              error: null,
            }));
            resolve(coords);

            // Phase 2: Get high-accuracy position in background
            if (coords.accuracy && coords.accuracy > 100) {
              navigator.geolocation.getCurrentPosition(
                (highAccuracyPosition) => {
                  const highAccuracyCoords: GeolocationCoordinates = {
                    latitude: highAccuracyPosition.coords.latitude,
                    longitude: highAccuracyPosition.coords.longitude,
                    accuracy: highAccuracyPosition.coords.accuracy,
                  };
                  setState((prev) => ({
                    ...prev,
                    coordinates: highAccuracyCoords,
                  }));
                },
                () => {}, // Silently ignore - we already have a position
                {
                  enableHighAccuracy: true,
                  timeout: 15000,
                  maximumAge: 0,
                }
              );
            }
          },
          (_error) => {
            // Quick position failed, try high accuracy as fallback
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const coords: GeolocationCoordinates = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                };
                setState((prev) => ({
                  ...prev,
                  coordinates: coords,
                  error: null,
                }));
                resolve(coords);
              },
              (fallbackError) => {
                let errorMessage = "Failed to get location";
                if (fallbackError.code === fallbackError.PERMISSION_DENIED) {
                  errorMessage = "Location permission denied";
                  setState((prev) => ({
                    ...prev,
                    permissionGranted: false,
                  }));
                  localStorage.setItem(PERMISSION_STORAGE_KEY, "false");
                } else if (fallbackError.code === fallbackError.POSITION_UNAVAILABLE) {
                  errorMessage = "Location information unavailable";
                } else if (fallbackError.code === fallbackError.TIMEOUT) {
                  errorMessage = "Location request timed out";
                }
                setState((prev) => ({
                  ...prev,
                  error: errorMessage,
                }));
                resolve(null);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
              }
            );
          },
          {
            enableHighAccuracy: false, // Use network positioning (fast)
            timeout: 3000, // Short timeout
            maximumAge: 60000, // Accept cached positions up to 1 minute old
          }
        );
      });
    },
    []
  );

  /**
   * Get current position on Capacitor (iOS/Android) - FAST version
   * Uses a two-phase approach: first gets a quick cached/low-accuracy position,
   * then optionally refines with high accuracy in the background
   */
  const getCapacitorPosition = useCallback(
    async (): Promise<GeolocationCoordinates | null> => {
      try {
        // Phase 1: Try to get a quick position (cached or low accuracy)
        // This uses cell tower/WiFi positioning which is nearly instant
        let position;
        try {
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false, // Use network positioning (fast)
            timeout: 3000, // Short timeout for quick response
            maximumAge: 60000, // Accept positions up to 1 minute old
          });
        } catch {
          // If quick position fails, try high accuracy as fallback
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
          });
        }

        const coords: GeolocationCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setState((prev) => ({
          ...prev,
          coordinates: coords,
          error: null,
        }));

        // Phase 2: Get high-accuracy position in background to update blue dot
        // Only if the initial position wasn't very accurate (> 100m accuracy)
        if (coords.accuracy && coords.accuracy > 100) {
          Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
          }).then((highAccuracyPosition) => {
            const highAccuracyCoords: GeolocationCoordinates = {
              latitude: highAccuracyPosition.coords.latitude,
              longitude: highAccuracyPosition.coords.longitude,
              accuracy: highAccuracyPosition.coords.accuracy,
            };
            setState((prev) => ({
              ...prev,
              coordinates: highAccuracyCoords,
            }));
          }).catch(() => {
            // Silently ignore - we already have a position
          });
        }

        return coords;
      } catch (error: any) {
        let errorMessage = "Failed to get location";
        if (error?.message?.includes("permission")) {
          errorMessage = "Location permission denied";
          setState((prev) => ({
            ...prev,
            permissionGranted: false,
          }));
          localStorage.setItem(PERMISSION_STORAGE_KEY, "false");
        }
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        return null;
      }
    },
    []
  );

  /**
   * Check permission status on mount
   */
  useEffect(() => {
    if (isCapacitorLoading) return;

    const checkPermission = async () => {
      const granted = isCapacitor
        ? await checkCapacitorPermission()
        : await checkWebPermission();

      setState((prev) => ({
        ...prev,
        permissionGranted: granted,
        isLoading: false,
      }));

      // If permission is granted, get current location
      if (granted) {
        if (isCapacitor) {
          await getCapacitorPosition();
        } else {
          await getWebPosition();
        }
      }
    };

    checkPermission();
  }, [
    isCapacitor,
    isCapacitorLoading,
    checkWebPermission,
    checkCapacitorPermission,
    getWebPosition,
    getCapacitorPosition,
  ]);

  /**
   * Request permission and get location
   */
  const requestPermissionAndGetLocation = useCallback(async (): Promise<GeolocationCoordinates | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    coordinatesFromPermissionRef.current = null; // Reset ref

    const permissionGranted = isCapacitor
      ? await requestCapacitorPermission()
      : await requestWebPermission();

    if (!permissionGranted) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return null;
    }

    // For web, coordinates may already be set by requestWebPermission
    // Check if coordinates were captured during permission request
    if (!isCapacitor && coordinatesFromPermissionRef.current) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return coordinatesFromPermissionRef.current;
    }

    // Get location after permission is granted (or if not already available)
    const coords = isCapacitor
      ? await getCapacitorPosition()
      : await getWebPosition();

    setState((prev) => ({ ...prev, isLoading: false }));
    return coords;
  }, [
    isCapacitor,
    requestCapacitorPermission,
    requestWebPermission,
    getCapacitorPosition,
    getWebPosition,
  ]);

  /**
   * Get current location (assumes permission already granted)
   */
  const getCurrentLocation = useCallback(async (): Promise<GeolocationCoordinates | null> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const coords = isCapacitor
      ? await getCapacitorPosition()
      : await getWebPosition();

    setState((prev) => ({ ...prev, isLoading: false }));
    return coords;
  }, [isCapacitor, getCapacitorPosition, getWebPosition]);

  /**
   * Continuous location tracking
   */
  const watchIdRef = useRef<string | number | null>(null);

  const stopWatching = useCallback(async () => {
    if (watchIdRef.current !== null) {
      if (isCapacitor) {
        await Geolocation.clearWatch({ id: watchIdRef.current as string });
      } else {
        if (navigator.geolocation) {
          navigator.geolocation.clearWatch(watchIdRef.current as number);
        }
      }
      watchIdRef.current = null;
    }
  }, [isCapacitor]);

  const startWatching = useCallback(async () => {
    if (watchIdRef.current !== null) return;
    
    // We only start watching if permission has already been verified/granted
    if (isCapacitor) {
      try {
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          (position) => {
            if (position) {
              const coords: GeolocationCoordinates = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              };
              setState((prev) => ({ ...prev, coordinates: coords, error: null }));
            }
          }
        );
        watchIdRef.current = id;
      } catch (err) {
        console.error("Failed to start Capacitor watch", err);
      }
    } else {
      if (navigator.geolocation) {
        const id = navigator.geolocation.watchPosition(
          (position) => {
            const coords: GeolocationCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            setState((prev) => ({ ...prev, coordinates: coords, error: null }));
          },
          (err) => {
            console.error("Failed to start Web watch", err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
        watchIdRef.current = id;
      }
    }
  }, [isCapacitor]);

  // Clean up watch on unmount
  useEffect(() => {
    return () => {
      stopWatching();
    };
  }, [stopWatching]);

  return {
    coordinates: state.coordinates,
    permissionGranted: state.permissionGranted,
    isLoading: state.isLoading,
    error: state.error,
    requestPermissionAndGetLocation,
    getCurrentLocation,
    startWatching,
    stopWatching,
  };
};

