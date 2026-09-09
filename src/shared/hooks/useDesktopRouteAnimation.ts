import { useState, useRef, useCallback, useEffect } from "react";
import {
  DesktopRouteAnimationService,
  type AnimationStats,
} from "../utils/desktopRouteAnimationService";
import type { RouteCoordinate } from "../api/types/routes";
import type { Map as MapboxMap } from "mapbox-gl";

interface UseDesktopRouteAnimationOptions {
  map: MapboxMap | null | (() => MapboxMap | null);
  coordinates: RouteCoordinate[] | (() => RouteCoordinate[]);
  routeName?: string | (() => string | undefined);
  totalDistance?: number | (() => number | undefined);
  totalElevation?: number | (() => number | undefined);
  onAnimationStateChange?: (isAnimating: boolean) => void;
  t?: (key: string) => string;
}

const SPEED_MULTIPLIERS = [0.5, 1, 3, 5, 10];
const DEFAULT_SPEED_INDEX = 3; // Start at 5x

export function useDesktopRouteAnimation({
  map,
  coordinates,
  routeName = "Route",
  totalDistance = 0,
  totalElevation = 0,
  onAnimationStateChange,
  t,
}: UseDesktopRouteAnimationOptions) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isPrecalculating, setIsPrecalculating] = useState(false);
  const [precalcProgress, setPrecalcProgress] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);

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

  const animationServiceRef = useRef<DesktopRouteAnimationService | null>(null);
  const statsRef = useRef<AnimationStats>(stats);
  const onAnimationStateChangeRef = useRef(onAnimationStateChange);

  useEffect(() => {
    onAnimationStateChangeRef.current = onAnimationStateChange;
  }, [onAnimationStateChange]);

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

  useEffect(() => {
    if (onAnimationStateChangeRef.current) {
      onAnimationStateChangeRef.current(isAnimating);
    }
  }, [isAnimating]);

  // Update speed multiplier when speed index changes
  useEffect(() => {
    if (animationServiceRef.current) {
      const newSpeed = SPEED_MULTIPLIERS[speedIndex] ?? SPEED_MULTIPLIERS[DEFAULT_SPEED_INDEX]!;
      animationServiceRef.current.setSpeedMultiplier(newSpeed);
    }
  }, [speedIndex]);

  const startAnimation = useCallback(async () => {
    const currentMap = typeof map === "function" ? map() : map;
    const currentCoordinates =
      typeof coordinates === "function" ? coordinates() : coordinates;
    const currentTotalDistance =
      typeof totalDistance === "function" ? totalDistance() : totalDistance;
    const currentTotalElevation =
      typeof totalElevation === "function" ? totalElevation() : totalElevation;

    if (!currentMap || !currentCoordinates || currentCoordinates.length === 0) {
      console.error("Cannot start animation: missing map or coordinates");
      return;
    }

    setIsAnimating(true);
    setIsPrecalculating(true);
    setPrecalcProgress(0);
    setStats({
      currentDistance: 0,
      currentElevation: 0,
      totalDistance: currentTotalDistance || 0,
      totalElevation: currentTotalElevation || 0,
    });

    try {
      const currentSpeedMultiplier = SPEED_MULTIPLIERS[speedIndex] ?? SPEED_MULTIPLIERS[DEFAULT_SPEED_INDEX]!;

      animationServiceRef.current = new DesktopRouteAnimationService(
        currentMap,
        currentCoordinates,
        {
          keepMapStateOnComplete: true,
          onPrecalcProgress: (progress) => {
            setPrecalcProgress(progress);
          },
          onStatsUpdate: (newStats) => {
            const current = statsRef.current;
            const distanceChanged =
              Math.abs(current.currentDistance - newStats.currentDistance) >
              0.01;
            const elevationChanged =
              current.currentElevation !== newStats.currentElevation;

            if (distanceChanged || elevationChanged) {
              statsRef.current = newStats;
              requestAnimationFrame(() => {
                setStats(newStats);
              });
            }
          },
          onComplete: () => {
            setIsAnimating(false);
            setIsPrecalculating(false);
            setIsComplete(true);
          },
          onError: (error) => {
            console.error("Animation error:", error);
            setIsAnimating(false);
            setIsPrecalculating(false);
          },
          onCancel: () => {
            setIsAnimating(false);
            setIsPrecalculating(false);
            setIsComplete(false);
            setIsPaused(false);
          },
        }
      );

      // Set initial speed multiplier
      animationServiceRef.current.setSpeedMultiplier(currentSpeedMultiplier);

      await animationServiceRef.current.precalculate();
      setIsPrecalculating(false);

      if (animationServiceRef.current) {
        await animationServiceRef.current.start();
      }
    } catch (error) {
      console.error("Failed to start animation:", error);
      setIsAnimating(false);
      setIsPrecalculating(false);
    }
  }, [map, coordinates, routeName, totalDistance, totalElevation, speedIndex, t]);

  const cancelAnimation = useCallback(() => {
    if (animationServiceRef.current?.running) {
      animationServiceRef.current.cancel();
    }
    setIsAnimating(false);
    setIsPrecalculating(false);
  }, []);

  useEffect(() => {
    return () => {
      if (animationServiceRef.current?.running) {
        animationServiceRef.current.cancel();
      }
    };
  }, []);

  const handleCancel = useCallback(() => {
    setIsComplete(false);
    setIsAnimating(false);
    setIsPrecalculating(false);
    setIsPaused(false);
    if (animationServiceRef.current) {
      animationServiceRef.current.cancel();
      animationServiceRef.current = null;
    }
  }, []);

  const handleWatchAgain = useCallback(() => {
    setIsComplete(false);
    setIsPaused(false);
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
    setSpeedIndex((prev) => Math.min(prev + 1, SPEED_MULTIPLIERS.length - 1));
  }, []);

  const handleSpeedDecrease = useCallback(() => {
    setSpeedIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const currentSpeed = SPEED_MULTIPLIERS[speedIndex] ?? SPEED_MULTIPLIERS[DEFAULT_SPEED_INDEX]!;

  return {
    startAnimation,
    cancelAnimation,
    isAnimating,
    isPaused,
    isComplete,
    isPrecalculating,
    precalcProgress,
    currentSpeed,
    speedMultipliers: SPEED_MULTIPLIERS,
    speedIndex,
    stats,
    handleCancel,
    handleWatchAgain,
    handlePause,
    handleResume,
    handleSpeedIncrease,
    handleSpeedDecrease,
  };
}
