import { useState, useRef, useCallback, useEffect } from "react";
import {
  RouteAnimationService,
  downloadVideo,
  isVideoRecordingSupported,
  type AnimationStats,
} from "../utils/routeAnimationService";
import type { RouteCoordinate } from "../api/types/routes";
import type { Map as MapboxMap } from "mapbox-gl";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Media } from "@capacitor-community/media";

interface UseRouteAnimationOptions {
  map: MapboxMap | null | (() => MapboxMap | null);
  coordinates: RouteCoordinate[] | (() => RouteCoordinate[]);
  routeName?: string | (() => string | undefined);
  totalDistance?: number | (() => number | undefined);
  totalElevation?: number | (() => number | undefined);
  isDesktop?: boolean;
  onAnimationStateChange?: (isAnimating: boolean) => void;
  /** Translation function */
  t?: (key: string) => string;
}

type MapboxMapWithLifecycle = MapboxMap & { _removed?: boolean };

function isMapStyleReady(map: MapboxMap | null): boolean {
  if (!map || (map as MapboxMapWithLifecycle)._removed) {
    return false;
  }

  try {
    return map.isStyleLoaded();
  } catch {
    return false;
  }
}

async function waitForMapStyleReady(
  map: MapboxMap,
  timeoutMs: number = 10000
): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if ((map as MapboxMapWithLifecycle)._removed) {
      return false;
    }

    if (isMapStyleReady(map)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return false;
}

/**
 * Save video to device gallery (native) or download (web)
 * Returns true if saved successfully, false otherwise
 */
async function saveVideoToGallery(
  blob: Blob,
  filename: string
): Promise<boolean> {
  const isNative = Capacitor.isNativePlatform();

  try {
    if (isNative) {
      // Write blob to file in chunks to avoid OutOfMemoryError
      // Each chunk is written separately to avoid large data in Capacitor bridge
      const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks - larger for speed, still safe for bridge
      const blobSize = blob.size;
      const totalChunks = Math.ceil(blobSize / CHUNK_SIZE);

      const fileExtension = ".mp4";
      const fullFilename = filename.endsWith(fileExtension)
        ? filename
        : `${filename}${fileExtension}`;
      const tempPath = `temp/${fullFilename}`;

      // Process and write blob in chunks
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, blobSize);
        const chunk = blob.slice(start, end);

        // Convert chunk to base64
        const chunkBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              const base64Data = reader.result.split(",")[1];
              if (base64Data) {
                resolve(base64Data);
              } else {
                reject(new Error("Failed to extract base64 data from chunk"));
              }
            } else {
              reject(new Error("Failed to convert chunk to base64"));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(chunk);
        });

        // Write first chunk, append rest
        if (i === 0) {
          await Filesystem.writeFile({
            path: tempPath,
            data: chunkBase64,
            directory: Directory.Cache,
            recursive: true, // Create parent directories if needed
          });
        } else {
          await Filesystem.appendFile({
            path: tempPath,
            data: chunkBase64,
            directory: Directory.Cache,
          });
        }
      }

      // Get the file URI
      const fileInfo = await Filesystem.getUri({
        path: tempPath,
        directory: Directory.Cache,
      });

      // Get albums to find Camera album identifier (required on Android)
      const albumsResponse = await Media.getAlbums();
      
      // Filter out smart albums - they can't accept content
      const regularAlbums = albumsResponse.albums.filter(
        (album) => album.type !== "smart"
      );
      
      const cameraAlbum = regularAlbums.find(
        (album) => album.name === "Camera" || album.name === "DCIM"
      );

      // Use Camera album if found, otherwise use first regular album or create one
      let albumIdentifier: string;
      if (cameraAlbum) {
        albumIdentifier = cameraAlbum.identifier;
      } else if (regularAlbums.length > 0) {
        const firstAlbum = regularAlbums[0];
        if (!firstAlbum) {
          throw new Error("No albums available");
        }
        albumIdentifier = firstAlbum.identifier;
      } else {
        // Create Camera album if none exists
        await Media.createAlbum({ name: "Camera" });
        const albumsAfterCreate = await Media.getAlbums();
        // Filter smart albums from the newly fetched list too
        const regularAlbumsAfterCreate = albumsAfterCreate.albums.filter(
          (album) => album.type !== "smart"
        );
        const newCameraAlbum = regularAlbumsAfterCreate.find(
          (album) => album.name === "Camera"
        );
        if (!newCameraAlbum) {
          throw new Error("Failed to create or find Camera album");
        }
        albumIdentifier = newCameraAlbum.identifier;
      }

      // Pass file path instead of base64 data URL (avoids memory issues)
      await Media.saveVideo({
        path: fileInfo.uri,
        albumIdentifier: albumIdentifier,
      });
      return true;
    }

    // For web platform, just download
    downloadVideo(blob, filename);
    return true;
  } catch (error) {
    console.error("[RouteAnimation] Error saving video:", error);
    downloadVideo(blob, filename);
    return false;
  }
}

export function useRouteAnimation({
  map,
  coordinates,
  routeName = "Route",
  totalDistance = 0,
  totalElevation = 0,
  isDesktop = false,
  onAnimationStateChange,
  t,
}: UseRouteAnimationOptions) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  // Resolve totalDistance and totalElevation (handle both direct values and functions)
  const resolvedTotalDistance =
    typeof totalDistance === "function" ? totalDistance() : totalDistance;
  const resolvedTotalElevation =
    typeof totalElevation === "function" ? totalElevation() : totalElevation;

  const [stats, setStats] = useState<AnimationStats>({
    currentDistance: 0,
    currentElevation: 0,
    totalDistance: resolvedTotalDistance ?? 0,
    totalElevation: resolvedTotalElevation ?? 0,
  });
  const [isSharing, setIsSharing] = useState(false);
  const animationServiceRef = useRef<RouteAnimationService | null>(null);
  const statsRef = useRef<AnimationStats>(stats);
  const onAnimationStateChangeRef = useRef(onAnimationStateChange);

  const isSupported = isVideoRecordingSupported();

  // Keep ref updated with latest callback
  useEffect(() => {
    onAnimationStateChangeRef.current = onAnimationStateChange;
  }, [onAnimationStateChange]);

  // Update stats ref to prevent infinite loops
  // Only update ref when stats actually change (by value, not reference)
  useEffect(() => {
    const current = statsRef.current;
    if (
      Math.abs(current.currentDistance - stats.currentDistance) > 0.001 ||
      current.currentElevation !== stats.currentElevation ||
      current.totalDistance !== stats.totalDistance ||
      current.totalElevation !== stats.totalElevation
    ) {
      statsRef.current = stats;
    }
  }, [
    stats.currentDistance,
    stats.currentElevation,
    stats.totalDistance,
    stats.totalElevation,
  ]);

  // Notify parent when animation state changes
  // Use ref to avoid infinite loops from callback dependency changes
  useEffect(() => {
    if (onAnimationStateChangeRef.current) {
      onAnimationStateChangeRef.current(isAnimating);
    }
  }, [isAnimating]);

  const startAnimation = useCallback(async () => {
    // Get current values (support both direct values and getter functions)
    const currentMap = typeof map === "function" ? map() : map;
    const currentCoordinates =
      typeof coordinates === "function" ? coordinates() : coordinates;
    const currentRouteName =
      typeof routeName === "function" ? routeName() : routeName;
    const currentTotalDistance =
      typeof totalDistance === "function" ? totalDistance() : totalDistance;
    const currentTotalElevation =
      typeof totalElevation === "function" ? totalElevation() : totalElevation;

    if (!currentMap || !currentCoordinates || currentCoordinates.length === 0) {
      console.error("Cannot start animation: missing map or coordinates", {
        map: !!currentMap,
        coordinates: currentCoordinates?.length || 0,
      });
      return;
    }

    if (!isSupported) {
      console.error("Video recording is not supported");
      return;
    }

    if (!(await waitForMapStyleReady(currentMap))) {
      console.error("Cannot start animation: map style is not ready");
      return;
    }

    setIsAnimating(true);
    setCurrentSpeed(1);
    setStats({
      currentDistance: 0,
      currentElevation: 0,
      totalDistance: currentTotalDistance || 0,
      totalElevation: currentTotalElevation || 0,
    });

    try {
      const isMobile = !isDesktop;

      animationServiceRef.current = new RouteAnimationService(
        currentMap,
        currentCoordinates,
        {
          routeName: currentRouteName || "Route",
          isMobile: isMobile,
          t: t ?? ((key: string) => key), // Pass translation function for overlay labels, with fallback
          keepMapStateOnComplete: true, // Keep map at final position
          onProgress: () => {
            // Progress tracking if needed
          },
          onStatsUpdate: (newStats) => {
            // Update ref immediately for comparison
            const current = statsRef.current;
            // Only update if values actually changed (with threshold for distance)
            const distanceChanged =
              Math.abs(current.currentDistance - newStats.currentDistance) >
              0.01;
            const elevationChanged =
              current.currentElevation !== newStats.currentElevation;
            const totalDistanceChanged =
              current.totalDistance !== newStats.totalDistance;
            const totalElevationChanged =
              current.totalElevation !== newStats.totalElevation;

            if (
              distanceChanged ||
              elevationChanged ||
              totalDistanceChanged ||
              totalElevationChanged
            ) {
              statsRef.current = newStats;
              // Use requestAnimationFrame to batch updates and prevent infinite loops
              requestAnimationFrame(() => {
                setStats(newStats);
              });
            }
          },
          onSpeedUpdate: (speed) => {
            setCurrentSpeed(speed);
          },
          onComplete: async (blob) => {
            setIsAnimating(false);
            setIsComplete(true);
            setVideoBlob(blob);
            // Don't auto-share - show completion overlay instead
          },
          onError: (error) => {
            console.error("Animation error:", error);
            setIsAnimating(false);
          },
          onCancel: () => {
            setIsAnimating(false);
            setIsComplete(false);
            setIsPaused(false);
            setVideoBlob(null);
          },
        }
      );

      await animationServiceRef.current.start();
    } catch (error) {
      console.error("Failed to start animation:", error);
      setIsAnimating(false);
    }
  }, [
    map,
    coordinates,
    routeName,
    totalDistance,
    totalElevation,
    isDesktop,
    isSupported,
    t,
  ]);

  const cancelAnimation = useCallback(() => {
    if (animationServiceRef.current?.running) {
      animationServiceRef.current.cancel();
    }
    setIsAnimating(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationServiceRef.current?.running) {
        animationServiceRef.current.cancel();
      }
    };
  }, []);

  const handleShare = useCallback(async (): Promise<boolean> => {
    if (!videoBlob || isSharing) return false;

    setIsSharing(true);
    try {
      const currentRouteName =
        typeof routeName === "function" ? routeName() : routeName;
      const sanitizedName = (currentRouteName || "Route").replace(
        /[^a-zA-Z0-9-_]/g,
        "_"
      );
      const filename = `${sanitizedName}-animation`;

      const isNative = Capacitor.isNativePlatform();

      // Native platform: save to gallery, Web platform (desktop or mobile): download
      if (isNative) {
        const success = await saveVideoToGallery(videoBlob, filename);
        // Note: Toast will be shown by the modal component
        return success;
      } else {
        downloadVideo(videoBlob, filename);
        return true; // Download is considered success
      }
    } finally {
      setIsSharing(false);
    }
  }, [videoBlob, routeName, isSharing]);

  const handleCancel = useCallback(() => {
    setIsComplete(false);
    setIsAnimating(false);
    setVideoBlob(null);
    setIsPaused(false);
    // Restore everything when canceling from completion screen
    if (animationServiceRef.current) {
      animationServiceRef.current.restoreEverything();
      // Clear the service reference after restoring
      animationServiceRef.current = null;
    }
  }, []);

  const handleWatchAgain = useCallback(() => {
    setIsComplete(false);
    setVideoBlob(null);
    setIsPaused(false);
    // Restart animation
    startAnimation();
  }, [startAnimation]);

  const handlePause = useCallback(() => {
    if (animationServiceRef.current) {
      animationServiceRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  const handleResume = useCallback(() => {
    if (animationServiceRef.current) {
      animationServiceRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  const handleSpeedIncrease = useCallback(() => {
    if (animationServiceRef.current) {
      animationServiceRef.current.increaseSpeed();
    }
  }, []);

  const handleSpeedDecrease = useCallback(() => {
    if (animationServiceRef.current) {
      animationServiceRef.current.decreaseSpeed();
    }
  }, []);

  return {
    startAnimation,
    cancelAnimation,
    isAnimating,
    isPaused,
    isComplete,
    videoBlob,
    currentSpeed,
    stats,
    isSupported,
    handleShare,
    isSharing,
    handleCancel,
    handleWatchAgain,
    handlePause,
    handleResume,
    handleSpeedIncrease,
    handleSpeedDecrease,
  };
}
