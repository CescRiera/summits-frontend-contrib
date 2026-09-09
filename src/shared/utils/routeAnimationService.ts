/**
 * Route Animation Service
 * Creates Strava-style 3D flyover animations with chase-cam perspective
 * Based on Mapbox cinematic route animations approach
 * References:
 * - https://www.mapbox.com/blog/building-cinematic-route-animations-with-mapboxgl
 * - https://github.com/acarnagey/route-animate
 * - https://docs.mapbox.com/mapbox-gl-js/example/query-terrain-elevation/
 */

import type { RouteCoordinate } from "../api/types/routes";
import type { Map as MapboxMap, LngLat, GeoJSONSource } from "mapbox-gl";
import { Capacitor } from "@capacitor/core";
import { enableMapboxTerrain } from "./mapboxTerrain";

// Layer IDs that should be hidden during animation
const LAYERS_TO_HIDE = [
  // Nearby peaks only - these clutter the animation
  "nearby-peaks-symbols",
  "nearby-peaks-labels",
  // General peak layers from tile source (not route-specific)
  "peak-icons",
  "peak-labels",
  // Start/end markers
  "route-start-circle",
  "route-finish-circle",
  // Original route line (we draw our own animated one)
  "route-line-layer",
];

// Route peak layers to KEEP visible (completed peaks on the route)
// "route-peaks-symbols" and "route-peaks-labels" are intentionally NOT hidden

// Animation stats for overlay
export interface AnimationStats {
  currentDistance: number; // in km
  currentElevation: number; // in meters
  totalDistance: number; // in km
  totalElevation: number; // in meters
}

/**
 * Handle video duration metadata
 *
 * WebM duration metadata fixing is unreliable across players because:
 * 1. The Duration element (0x4489) location in the EBML structure varies
 * 2. Many video players (especially on Windows) ignore WebM duration metadata
 *    and calculate duration from actual frame timestamps
 * 3. Client-side byte-level patching often hits the wrong location or gets ignored
 *
 * MP4 format handles duration correctly, so we prefer MP4 when available.
 * For WebM, the video will play correctly but duration display may be wrong
 * in some players.
 */
async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  const durationSeconds = durationMs / 1000;
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);

  console.log("[RouteAnimation] Video duration processing:", {
    blobType: blob.type,
    blobSize: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
    recordedDurationMs: durationMs,
    recordedDuration: `${minutes}:${seconds.toString().padStart(2, "0")}`,
    isMP4: blob.type.includes("mp4"),
    isWebM: blob.type.includes("webm"),
  });

  // For MP4, no fix needed - duration is properly embedded
  if (blob.type.includes("mp4")) {
    console.log(
      "[RouteAnimation] ✓ MP4 format - duration metadata should be correct"
    );
    return blob;
  }

  // For WebM, return as-is since client-side fixing is unreliable
  console.log(
    "[RouteAnimation] ⚠ WebM format - duration may display incorrectly in some players (Windows Media Player, etc.)"
  );
  console.log(
    "[RouteAnimation] Tip: Try playing the video in VLC, Chrome, or Firefox for accurate duration display"
  );
  return blob;
}

// Speed multipliers
const SPEED_MULTIPLIERS = [1, 3, 5, 10, 0.5];
const DEFAULT_SPEED_INDEX = 0; // Start at 1x

// Animation configuration
export interface RouteAnimationConfig {
  /** Base speed for animation (meters per second at 1x) */
  baseSpeed?: number;
  /** Camera pitch angle (0-85 degrees) */
  pitch?: number;
  /** Camera altitude above terrain in meters */
  cameraAltitude?: number;
  /** Frames per second for recording */
  fps?: number;
  /** Video bitrate in bits per second */
  videoBitrate?: number;
  /** Whether to show the animation progress polyline */
  showProgressLine?: boolean;
  /** Route name to display in overlay */
  routeName?: string;
  /** Whether this is mobile (for 9:16 aspect ratio) */
  isMobile?: boolean;
  /** Whether to keep map state after completion (don't restore) */
  keepMapStateOnComplete?: boolean;
  /** Translation function for overlay labels */
  t?: (key: string) => string;
  /** Callback for progress updates (0-1) */
  onProgress?: (progress: number) => void;
  /** Callback for stats updates during animation */
  onStatsUpdate?: (stats: AnimationStats) => void;
  /** Callback for speed updates */
  onSpeedUpdate?: (speed: number) => void;
  /** Callback when animation completes */
  onComplete?: (videoBlob: Blob) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Callback when animation is cancelled */
  onCancel?: () => void;
}

// Default config - will be adjusted based on platform
const getDefaultConfig = (): Required<
  Omit<
    RouteAnimationConfig,
    | "onProgress"
    | "onComplete"
    | "onError"
    | "onCancel"
    | "onStatsUpdate"
    | "onSpeedUpdate"
    | "t"
  >
> => ({
  baseSpeed: 150, // Base speed in meters per second at 1x
  pitch: 55, // Lower pitch for more top-down view, avoids clipping
  cameraAltitude: 3500, // Higher altitude for wider view
  // Same quality for both desktop and mobile: 60fps for smooth animation
  fps: 60,
  // Maximum quality: 50 Mbps for crisp 1080p+ video
  videoBitrate: 25000000, // 50 Mbps for both platforms
  showProgressLine: true,
  routeName: "Route",
  isMobile: false, // Default to desktop
  keepMapStateOnComplete: false, // Default to restoring map state
});

// Note: We use getDefaultConfig() dynamically based on platform detection
// No need for a static DEFAULT_CONFIG constant

// Smoothing factors - lower = smoother but more lag
// The smoothing factors control how quickly the camera or animation follows the target value.
// - POSITION_SMOOTHING (0.06): How quickly the camera position (lat/lng) moves towards the next point. Higher values = camera follows closely (snappier), lower = camera lags smoothly.
// - BEARING_SMOOTHING (0.03): How quickly the camera's rotation (direction it's pointing) turns to follow the path. Lower value here (compared to position) makes the camera's rotation respond more gradually, smoothing out sudden turns and preventing jerky rotation.
// - ALTITUDE_SMOOTHING (0.03): How quickly the camera's height above terrain changes as you move over hills/valleys. Matched to bearing for similar smooth lag effect.

// In summary, bearing and altitude react more slowly than position, which helps create a smooth cinematic flyover feel.

const POSITION_SMOOTHING = 0.05; // Faster response to path movement (camera position "catches up" quicker)
const BEARING_SMOOTHING = 0.02; // Slower/softer reaction to direction changes (camera turns more gently)
const ALTITUDE_SMOOTHING = 0.03; // Slower/softer reaction to terrain elevation changes

// Source and layer IDs for animation
const ANIMATION_SOURCE_ID = "route-animation-progress";
const ANIMATION_LINE_BORDER_ID = "route-animation-line-border";
const ANIMATION_LINE_ID = "route-animation-line";
const ANIMATION_DOT_SOURCE_ID = "route-animation-dot";
const ANIMATION_DOT_ID = "route-animation-dot-layer";
const TERRAIN_SOURCE_ID = "mapbox-dem-animation";

/**
 * Calculate bearing between two points
 */
function calculateBearing(
  start: { lng: number; lat: number },
  end: { lng: number; lat: number }
): number {
  const startLat = (start.lat * Math.PI) / 180;
  const startLng = (start.lng * Math.PI) / 180;
  const endLat = (end.lat * Math.PI) / 180;
  const endLng = (end.lng * Math.PI) / 180;

  const dLng = endLng - startLng;

  const x = Math.sin(dLng) * Math.cos(endLat);
  const y =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

  let bearing = (Math.atan2(x, y) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Smoothly interpolate between two bearings, handling the 0/360 wraparound
 */
function lerpBearing(current: number, target: number, t: number): number {
  current = ((current % 360) + 360) % 360;
  target = ((target % 360) + 360) % 360;

  let diff = target - current;

  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }

  let result = current + diff * t;
  return ((result % 360) + 360) % 360;
}

/**
 * Smoothly interpolate between two values
 */
function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * t;
}

/**
 * Calculate position offset from a point given bearing and distance in meters
 */
function offsetPosition(
  point: { lng: number; lat: number },
  bearing: number,
  distanceMeters: number
): { lng: number; lat: number } {
  const earthRadius = 6371000; // meters
  const angularDistance = distanceMeters / earthRadius;

  const bearingRad = (bearing * Math.PI) / 180;
  const lat1 = (point.lat * Math.PI) / 180;
  const lng1 = (point.lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lng2 * 180) / Math.PI,
  };
}

/**
 * Calculate distance between two points in meters using Haversine formula
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Interpolate between two coordinates
 */
function interpolateCoordinate(
  start: RouteCoordinate,
  end: RouteCoordinate,
  t: number
): RouteCoordinate {
  return {
    lat: start.lat + (end.lat - start.lat) * t,
    lng: start.lng + (end.lng - start.lng) * t,
    elevation: start.elevation + (end.elevation - start.elevation) * t,
    timestamp: null,
  };
}

/**
 * Sample coordinates to reduce complexity for long routes
 */
function sampleCoordinates(
  coordinates: RouteCoordinate[],
  maxPoints: number = 600
): RouteCoordinate[] {
  if (coordinates.length <= maxPoints) {
    return coordinates;
  }

  const step = (coordinates.length - 1) / (maxPoints - 1);
  const sampled: RouteCoordinate[] = [];

  for (let i = 0; i < maxPoints - 1; i++) {
    const index = Math.floor(i * step);
    const coord = coordinates[index];
    if (coord) {
      sampled.push(coord);
    }
  }

  const lastCoord = coordinates[coordinates.length - 1];
  if (lastCoord) {
    sampled.push(lastCoord);
  }
  return sampled;
}

/**
 * Calculate total route distance and elevation gain
 */
function calculateRouteStats(coordinates: RouteCoordinate[]): {
  totalDistance: number;
  totalElevation: number;
} {
  let totalDistance = 0;
  let totalElevation = 0;
  let prevElevation = coordinates[0]?.elevation ?? null;

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];

    if (!prev || !curr) continue;

    totalDistance += haversineDistance(prev.lat, prev.lng, curr.lat, curr.lng);

    const elevation = curr.elevation;
    if (elevation != null && prevElevation != null) {
      const elevDiff = elevation - prevElevation;
      if (elevDiff > 0) {
        totalElevation += elevDiff;
      }
    }
    prevElevation = elevation ?? prevElevation;
  }

  return {
    totalDistance: totalDistance / 1000, // km
    totalElevation,
  };
}

/**
 * Calculate route bounds from coordinates
 */
function calculateRouteBounds(
  coordinates: RouteCoordinate[]
): [[number, number], [number, number]] | null {
  if (coordinates.length === 0) return null;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  coordinates.forEach((coord) => {
    minLng = Math.min(minLng, coord.lng);
    maxLng = Math.max(maxLng, coord.lng);
    minLat = Math.min(minLat, coord.lat);
    maxLat = Math.max(maxLat, coord.lat);
  });

  if (
    minLng === Infinity ||
    maxLng === -Infinity ||
    minLat === Infinity ||
    maxLat === -Infinity
  ) {
    return null;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Main animation class
 */
export class RouteAnimationService {
  private map: MapboxMap;
  private coordinates: RouteCoordinate[];
  private config: Required<
    Omit<
      RouteAnimationConfig,
      | "onProgress"
      | "onComplete"
      | "onError"
      | "onCancel"
      | "onStatsUpdate"
      | "onSpeedUpdate"
      | "t"
    >
  > &
    RouteAnimationConfig;
  private isRunning: boolean = false;
  private isCancelled: boolean = false;
  private isPaused: boolean = false;
  private isRecordingComplete: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private animationFrameId: number | null = null;
  private currentSpeedIndex: number = DEFAULT_SPEED_INDEX;
  private distanceTraveled: number = 0; // in meters
  private originalMapState: {
    center: LngLat;
    zoom: number;
    bearing: number;
    pitch: number;
    terrain: unknown;
  } | null = null;

  // Track which layers were visible before animation
  private hiddenLayers: string[] = [];

  // Composite canvas for recording (map + overlay)
  private compositeCanvas: HTMLCanvasElement | null = null;
  private compositeCtx: CanvasRenderingContext2D | null = null;
  private canvasStream: MediaStream | null = null;

  // Recording timing for duration fix
  private recordingStartTime: number = 0;
  private recordingEndTime: number = 0;

  // Current stats for overlay
  private currentStats: AnimationStats = {
    currentDistance: 0,
    currentElevation: 0,
    totalDistance: 0,
    totalElevation: 0,
  };

  // Smoothed camera state
  private smoothedCamera: {
    lng: number;
    lat: number;
    bearing: number;
    altitude: number;
  } | null = null;

  // Route stats
  private routeStats: { totalDistance: number; totalElevation: number };

  // Cumulative distances for distance-based progress
  private cumulativeDistances: number[] = [];

  // Store translation function to ensure it's preserved
  private translationFn: ((key: string) => string) | undefined;

  // Map render event handler for compositing overlay after each map frame
  private mapRenderHandler: (() => void) | null = null;

  // Throttling for callbacks to prevent infinite update loops
  private lastProgressUpdate: number = 0;
  private lastStatsUpdate: number = 0;
  private pendingStatsUpdate: AnimationStats | null = null;
  private statsUpdateRafId: number | null = null;
  private readonly PROGRESS_THROTTLE_MS = 100; // Throttle progress updates to 10fps
  private readonly STATS_THROTTLE_MS = 100; // Throttle stats updates to 10fps

  constructor(
    map: MapboxMap,
    coordinates: RouteCoordinate[],
    config: RouteAnimationConfig = {}
  ) {
    this.map = map;
    this.coordinates = sampleCoordinates(coordinates);

    this.translationFn = config.t;

    // Get default config (same quality for all platforms)
    const isNative = Capacitor.isNativePlatform();
    const platformDefaults = getDefaultConfig();

    // Merge: platform defaults -> user config (user config takes precedence)
    this.config = { ...platformDefaults, ...config };

    if (isNative) {
      console.log(
        "[RouteAnimation] Native platform detected - using optimized settings:",
        {
          fps: this.config.fps,
          bitrate: `${(this.config.videoBitrate / 1000000).toFixed(1)} Mbps`,
          platform: Capacitor.getPlatform(),
        }
      );
    }

    // Log elevation data quality
    const elevations = coordinates
      .map((c) => c.elevation)
      .filter((e): e is number => e != null);
    const elevSummary =
      elevations.length > 0
        ? `${elevations.length}/${coordinates.length} coords have elevation, range: ${Math.min(...elevations)}–${Math.max(...elevations)}m, sample: [${coordinates.slice(0, 5).map((c) => c.elevation).join(", ")}${coordinates.length > 5 ? ", ..." : ""}]`
        : "NO elevation data in any coordinate";
    console.log(
      `[RouteAnimation] Coordinates: ${coordinates.length} total, sampled to ${this.coordinates.length}. ${elevSummary}`
    );

    // Calculate stats from FULL coordinate set for accuracy, then sample for animation
    this.routeStats = calculateRouteStats(coordinates);
    this.calculateCumulativeDistances();
  }

  /**
   * Pre-calculate cumulative distances for each coordinate
   * This allows us to find coordinate index based on distance traveled
   */
  private calculateCumulativeDistances(): void {
    this.cumulativeDistances = [0]; // First coordinate is at distance 0

    for (let i = 1; i < this.coordinates.length; i++) {
      const prev = this.coordinates[i - 1];
      const curr = this.coordinates[i];
      if (!prev || !curr) continue;
      const segmentDist = haversineDistance(
        prev.lat,
        prev.lng,
        curr.lat,
        curr.lng
      );
      const prevDist = this.cumulativeDistances[i - 1];
      if (prevDist !== undefined) {
        this.cumulativeDistances.push(prevDist + segmentDist);
      }
    }
  }

  private isMapAvailable(): boolean {
    return !(this.map as MapboxMap & { _removed?: boolean })._removed;
  }

  private isStyleLoaded(): boolean {
    if (!this.isMapAvailable()) {
      return false;
    }

    try {
      return this.map.isStyleLoaded();
    } catch {
      return false;
    }
  }

  private areTilesLoaded(): boolean {
    if (!this.isMapAvailable()) {
      return false;
    }

    try {
      return this.map.areTilesLoaded();
    } catch {
      return false;
    }
  }

  private async waitForMapStyleReady(timeoutMs: number = 10000): Promise<void> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      if (!this.isMapAvailable()) {
        throw new Error("Map is no longer available");
      }

      if (this.isStyleLoaded()) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error("Map style is not ready yet");
  }

  private hasLayer(id: string): boolean {
    if (!this.isMapAvailable()) {
      return false;
    }

    try {
      return Boolean(this.map.getLayer(id));
    } catch {
      return false;
    }
  }

  private hasSource(id: string): boolean {
    if (!this.isMapAvailable()) {
      return false;
    }

    try {
      return Boolean(this.map.getSource(id));
    } catch {
      return false;
    }
  }

  private removeLayerIfPresent(id: string): void {
    if (!this.hasLayer(id)) {
      return;
    }

    try {
      this.map.removeLayer(id);
    } catch {
      // Ignore style lifecycle races during teardown
    }
  }

  private removeSourceIfPresent(id: string): void {
    if (!this.hasSource(id)) {
      return;
    }

    try {
      this.map.removeSource(id);
    } catch {
      // Ignore style lifecycle races during teardown
    }
  }

  private safeSetTerrain(
    terrain: Parameters<MapboxMap["setTerrain"]>[0]
  ): void {
    if (!this.isMapAvailable()) {
      return;
    }

    try {
      this.map.setTerrain(terrain);
    } catch {
      // Ignore terrain restoration failures when the style is unavailable
    }
  }

  private clearAnimationArtifacts(): void {
    [ANIMATION_LINE_ID, ANIMATION_LINE_BORDER_ID, ANIMATION_DOT_ID].forEach(
      (id) => {
        this.removeLayerIfPresent(id);
      }
    );
    [ANIMATION_SOURCE_ID, ANIMATION_DOT_SOURCE_ID].forEach((id) => {
      this.removeSourceIfPresent(id);
    });

    // Mobile creates a separate terrain source that needs cleanup
    // Desktop reuses the existing source - restoremapState handles restoration
    if (this.config.isMobile && this.hasSource(TERRAIN_SOURCE_ID)) {
      this.safeSetTerrain(null);
      this.removeSourceIfPresent(TERRAIN_SOURCE_ID);
    }
  }

  /**
   * Find coordinate index and interpolation factor based on target distance
   * Returns { index, t } where index is the coordinate index and t is interpolation (0-1)
   */
  private findPositionByDistance(targetDistance: number): {
    index: number;
    t: number;
  } {
    if (this.cumulativeDistances.length === 0) {
      return { index: 0, t: 0 };
    }

    const totalDistance =
      this.cumulativeDistances[this.cumulativeDistances.length - 1] || 0;
    const clampedDistance = Math.max(
      0,
      Math.min(targetDistance, totalDistance)
    );

    // Binary search for the segment containing this distance
    let left = 0;
    let right = this.cumulativeDistances.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midDist = this.cumulativeDistances[mid] || 0;
      if (midDist < clampedDistance) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    // left is now the index of the coordinate at or after the target distance
    // We want the segment before it
    const index = Math.max(
      0,
      Math.min(left - 1, this.cumulativeDistances.length - 2)
    );
    const nextIndex = index + 1;

    const segmentStartDist = this.cumulativeDistances[index] || 0;
    const segmentEndDist =
      this.cumulativeDistances[nextIndex] || segmentStartDist;
    const segmentLength = segmentEndDist - segmentStartDist;

    // Interpolation factor within this segment
    const t =
      segmentLength > 0
        ? (clampedDistance - segmentStartDist) / segmentLength
        : 0;

    return { index, t: Math.max(0, Math.min(1, t)) };
  }

  /**
   * Cycle to next speed multiplier
   */
  cycleSpeed(): void {
    this.currentSpeedIndex =
      (this.currentSpeedIndex + 1) % SPEED_MULTIPLIERS.length;
    const currentSpeed = SPEED_MULTIPLIERS[this.currentSpeedIndex];
    if (currentSpeed !== undefined && this.config.onSpeedUpdate) {
      this.config.onSpeedUpdate(currentSpeed);
    }
  }

  /**
   * Increase speed multiplier
   */
  increaseSpeed(): void {
    if (this.currentSpeedIndex < SPEED_MULTIPLIERS.length - 1) {
      this.currentSpeedIndex++;
    } else {
      // Wrap around to first speed
      this.currentSpeedIndex = 0;
    }
    const currentSpeed = SPEED_MULTIPLIERS[this.currentSpeedIndex];
    if (currentSpeed !== undefined && this.config.onSpeedUpdate) {
      this.config.onSpeedUpdate(currentSpeed);
    }
  }

  /**
   * Decrease speed multiplier
   */
  decreaseSpeed(): void {
    if (this.currentSpeedIndex > 0) {
      this.currentSpeedIndex--;
    } else {
      // Wrap around to last speed
      this.currentSpeedIndex = SPEED_MULTIPLIERS.length - 1;
    }
    const currentSpeed = SPEED_MULTIPLIERS[this.currentSpeedIndex];
    if (currentSpeed !== undefined && this.config.onSpeedUpdate) {
      this.config.onSpeedUpdate(currentSpeed);
    }
  }

  /**
   * Get current speed multiplier
   */
  getCurrentSpeed(): number {
    return SPEED_MULTIPLIERS[this.currentSpeedIndex] ?? 1;
  }

  /**
   * Pause the animation
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the animation
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Get pause state
   */
  get paused(): boolean {
    return this.isPaused;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Animation is already running");
    }

    this.isRunning = true;
    this.isCancelled = false;
    this.isRecordingComplete = false;
    this.recordedChunks = [];
    this.currentSpeedIndex = DEFAULT_SPEED_INDEX;
    this.distanceTraveled = 0;

    try {
      await this.waitForMapStyleReady();
      this.saveMapState();

      // Hide layers that would clutter the animation
      this.hideLayers();

      // Setup 3D terrain and wait for it to load
      await this.setup3DTerrain();

      // PRE-CACHE: Silently fly through the route to warm the tile cache
      // This prevents black tiles during sharp turns in the animation
      await this.preloadRouteTiles();

      // Setup animation layers (line with border + dot)
      if (this.config.showProgressLine) {
        this.setupAnimationLayers();
      }

      // Start recording BEFORE flyTo so the flyTo is captured
      await this.startRecording();

      // Fly to starting position and wait for tiles to fully load (now recorded)
      await this.prepareStartingPosition();

      // Run the actual animation (recording is active now)
      await this.runAnimation();

      if (!this.isCancelled) {
        await this.stopRecording();
      }
    } catch (error) {
      try {
        this.cleanup(false);
      } catch (cleanupError) {
        console.error(
          "[RouteAnimation] Cleanup failed after start error:",
          cleanupError
        );
      }
      const normalizedError =
        error instanceof Error ? error : new Error(String(error));
      if (this.config.onError) {
        this.config.onError(normalizedError);
      }
      throw normalizedError;
    }
  }

  cancel(): void {
    this.isCancelled = true;
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Cancel pending stats update
    if (this.statsUpdateRafId !== null) {
      cancelAnimationFrame(this.statsUpdateRafId);
      this.statsUpdateRafId = null;
    }
    this.pendingStatsUpdate = null;

    this.unregisterRenderHandler();

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }

    this.cleanup(false);

    if (this.config.onCancel) {
      this.config.onCancel();
    }
  }

  /**
   * Hide layers that would clutter the animation
   */
  private hideLayers(): void {
    this.hiddenLayers = [];

    for (const layerId of LAYERS_TO_HIDE) {
      try {
        if (this.map.getLayer(layerId)) {
          const visibility = this.map.getLayoutProperty(layerId, "visibility");
          if (visibility !== "none") {
            this.hiddenLayers.push(layerId);
            this.map.setLayoutProperty(layerId, "visibility", "none");
          }
        }
      } catch {
        // Layer doesn't exist, ignore
      }
    }
  }

  /**
   * Restore layers that were hidden
   */
  private restoreLayers(): void {
    for (const layerId of this.hiddenLayers) {
      try {
        if (this.map.getLayer(layerId)) {
          this.map.setLayoutProperty(layerId, "visibility", "visible");
        }
      } catch {
        // Layer doesn't exist, ignore
      }
    }
    this.hiddenLayers = [];
  }

  private saveMapState(): void {
    this.originalMapState = {
      center: this.map.getCenter(),
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
      terrain: this.map.getTerrain(),
    };
  }

  private restoreMapState(): void {
    if (!this.originalMapState || !this.isMapAvailable()) return;

    try {
      this.map.jumpTo({
        center: this.originalMapState.center,
        zoom: this.originalMapState.zoom,
        bearing: this.originalMapState.bearing,
        pitch: this.originalMapState.pitch,
      });
    } catch {
      return;
    }

    this.safeSetTerrain(
      (this.originalMapState.terrain ??
        null) as Parameters<MapboxMap["setTerrain"]>[0]
    );
  }

  private async setup3DTerrain(): Promise<void> {
    // Desktop: reuse existing terrain source to avoid loading separate DEM tiles
    // Mobile: create a separate terrain source (native animation runs on a different map)
    if (this.config.isMobile) {
      enableMapboxTerrain(this.map, {
        sourceId: TERRAIN_SOURCE_ID,
        exaggeration: 1.2,
      });
    } else {
      enableMapboxTerrain(this.map, {
        exaggeration: 1.2,
      });
    }

    // Wait for style and terrain to fully load
    await new Promise<void>((resolve) => {
      const checkFullyLoaded = () => {
        if (this.isCancelled) { resolve(); return; }
        const isStyleLoaded = this.isStyleLoaded();
        const areTilesLoaded = this.areTilesLoaded();

        if (isStyleLoaded && areTilesLoaded) {
          setTimeout(resolve, 1000);
        } else {
          setTimeout(checkFullyLoaded, 100);
        }
      };
      checkFullyLoaded();
    });
  }

  /**
   * Preload all tiles along the route before animation starts
   * This is what Strava likely does - a "silent" pre-flight to warm the tile cache
   * Prevents black/missing tiles during sharp turns in the animation
   */
  private async preloadRouteTiles(): Promise<void> {
    console.log("[RouteAnimation] Preloading tiles along route...");

    const numCoordinates = this.coordinates.length;
    if (numCoordinates < 2) {
      console.log("[RouteAnimation] Not enough coordinates to preload");
      return;
    }

    // Store current view to restore later
    const currentCenter = this.map.getCenter();
    const currentZoom = this.map.getZoom();
    const currentBearing = this.map.getBearing();
    const currentPitch = this.map.getPitch();

    // Sample every Nth point to preload (balance between coverage and speed)
    // More samples = better coverage but slower preload
    const step = Math.max(1, Math.floor(numCoordinates / 30));

    let preloadedCount = 0;

    for (let i = 0; i < numCoordinates; i += step) {
      if (this.isCancelled) break;

      const coord = this.coordinates[i];
      const nextIdx = Math.min(i + step, numCoordinates - 1);
      const nextCoord = this.coordinates[nextIdx];

      if (!coord || !nextCoord) continue;

      // Calculate bearing towards next point
      const bearing = calculateBearing(coord, nextCoord);

      // Get terrain elevation at this point for proper altitude
      const terrainElevation = this.getTerrainElevation(coord.lng, coord.lat);
      const altitude = terrainElevation + this.config.cameraAltitude;

      // Calculate zoom based on altitude (same formula as animation)
      const altitudeZoom = 17.0 - altitude / 2000;
      const zoom = Math.max(13.0, Math.min(16.5, altitudeZoom));

      // Calculate camera offset position (behind the point looking forward)
      const cameraDistance = -200;
      const cameraOffset = offsetPosition(
        coord,
        (bearing + 180) % 360,
        cameraDistance
      );

      // Jump to this viewpoint (no animation, instant)
      this.map.jumpTo({
        center: [cameraOffset.lng, cameraOffset.lat],
        zoom: zoom,
        bearing: bearing,
        pitch: this.config.pitch,
      });

      // Wait for tiles to load at this position
      await new Promise<void>((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // Max 2.5 seconds per position

        const check = () => {
          if (this.isCancelled) {
            resolve();
            return;
          }

          if (this.areTilesLoaded() || attempts >= maxAttempts) {
            resolve();
          } else {
            attempts++;
            setTimeout(check, 50);
          }
        };
        check();
      });

      preloadedCount++;
    }

    // Return to original position before starting the actual animation
    this.map.jumpTo({
      center: currentCenter,
      zoom: currentZoom,
      bearing: currentBearing,
      pitch: currentPitch,
    });

    // Wait for tiles at starting position to reload
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.areTilesLoaded()) {
          resolve();
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });

    console.log(
      `[RouteAnimation] Tile preloading complete - ${preloadedCount} viewpoints cached`
    );
  }

  /**
   * Setup animation layers - orange line with dark orange border + blue dot
   */
  private setupAnimationLayers(): void {
    // Remove existing layers/sources if present
    this.clearAnimationArtifacts();

    // Add line source (starts empty)
    this.map.addSource(ANIMATION_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: [] },
          },
        ],
      },
    });

    // Add dot source for current position
    this.map.addSource(ANIMATION_DOT_SOURCE_ID, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    // Border (wider, underneath) - #A70000
    this.map.addLayer({
      id: ANIMATION_LINE_BORDER_ID,
      type: "line",
      source: ANIMATION_SOURCE_ID,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#A70000",
        "line-width": 9,
        "line-opacity": 0.8,
      },
    });

    // Main line (on top) - #ED254E
    this.map.addLayer({
      id: ANIMATION_LINE_ID,
      type: "line",
      source: ANIMATION_SOURCE_ID,
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#ED254E",
        "line-width": 5,
        "line-opacity": 1,
      },
    });

    // Classic blue dot with white border for current position
    this.map.addLayer({
      id: ANIMATION_DOT_ID,
      type: "circle",
      source: ANIMATION_DOT_SOURCE_ID,
      paint: {
        "circle-radius": 8,
        "circle-color": "#3b82f6", // Classic blue (same as map blue dot)
        "circle-stroke-width": 3,
        "circle-stroke-color": "rgb(255, 255, 255)", // White border
        "circle-opacity": 1,
      },
    });
  }

  /**
   * Setup composite canvas for recording map + overlay
   * For mobile, uses 9:16 aspect ratio (portrait) for Instagram stories
   * For desktop, uses the native map canvas resolution for maximum quality (no upscaling)
   */
  private setupCompositeCanvas(): void {
    // Create composite canvas
    this.compositeCanvas = document.createElement("canvas");

    // Always use 9:16 aspect ratio (portrait, 1080x1920)
    // Full HD at high bitrate gives excellent quality while keeping performance smooth
    const targetHeight = 1920;
    const targetWidth = 1080;
    this.compositeCanvas.width = targetWidth;
    this.compositeCanvas.height = targetHeight;

    // Get context with high-quality rendering settings
    this.compositeCtx = this.compositeCanvas.getContext("2d", {
      alpha: false, // No transparency needed, slightly better performance
      desynchronized: false, // Better quality
      willReadFrequently: false, // Optimize for drawing, not reading
    });

    // Enable high-quality image smoothing
    if (this.compositeCtx) {
      this.compositeCtx.imageSmoothingEnabled = true;
      this.compositeCtx.imageSmoothingQuality = "high"; // Best quality
    }
  }

  /**
   * Draw the overlay (SUMMITS branding + stats + speed) on the composite canvas
   */
  private drawOverlay(): void {
    if (!this.compositeCtx || !this.compositeCanvas) return;

    const ctx = this.compositeCtx;
    const width = this.compositeCanvas.width;
    const height = this.compositeCanvas.height;

    // Scale factor based on canvas size for consistent overlay sizing
    // For desktop, we use native canvas resolution, so scale based on height
    // For mobile (1920px height), scale is approximately 1.78
    const referenceHeight = 1080; // Reference height for scale calculation
    const scale = height / referenceHeight;
    const baseSize = Math.min(width, height) / scale;

    // Draw the map canvas first
    const mapCanvas = this.map.getCanvas();

    // Ensure high-quality rendering is enabled
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Scale and center the map to fit the 9:16 canvas
    // This ensures the map fills the video properly regardless of original aspect ratio
    const mapAspect = mapCanvas.width / mapCanvas.height;
    const targetAspect = width / height; // 9:16 ≈ 0.5625

    let drawWidth = width;
    let drawHeight = height;
    let drawX = 0;
    let drawY = 0;

    if (mapAspect > targetAspect) {
      // Map is wider, fit to height and center horizontally
      drawHeight = height;
      drawWidth = height * mapAspect;
      drawX = (width - drawWidth) / 2;
    } else {
      // Map is taller, fit to width and center vertically
      drawWidth = width;
      drawHeight = width / mapAspect;
      drawY = (height - drawHeight) / 2;
    }

    ctx.drawImage(mapCanvas, drawX, drawY, drawWidth, drawHeight);

    // Get translated labels - use translation function with fallback pattern
    const t = this.translationFn;

    let elevationLabel = "Elevation Gain";
    let distanceLabel = "Distance";

    if (t && typeof t === "function") {
      const elevationResult = t("routeAnimation.elevationGain");
      const distanceResult = t("routeAnimation.distance");
      elevationLabel = elevationResult || "Elevation Gain";
      distanceLabel = distanceResult || "Distance";
    }

    // Text shadow for readability
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 8 * scale;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2 * scale;

    // Centered layout for 9:16 portrait video
    const topPadding = 32 * scale;
    let yPos = topPadding;
    const titleSize = Math.max(32, baseSize * 0.062) * scale;
    const labelSize = Math.max(14, baseSize * 0.026) * scale;
    const valueSize = Math.max(42, baseSize * 0.082) * scale;
    const unitSize = Math.max(16, baseSize * 0.032) * scale;
    const statLabelValueSpacing = 25 * scale;

    // Calculate where gradient should end (after stats)
    const statsAreaTop = 0;
    const statsYPos = topPadding + titleSize + 40 * scale + 15 * scale;
    const statsAreaHeight =
      statsYPos +
      labelSize +
      statLabelValueSpacing +
      5 * scale +
      valueSize +
      valueSize +
      8 * scale +
      unitSize +
      30 * scale;

    // Draw gradient behind everything
    const gradient = ctx.createLinearGradient(
      0,
      statsAreaTop,
      0,
      statsAreaHeight
    );
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.4)");
    gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.2)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, statsAreaTop, width, statsAreaHeight);

    // Draw all text on top of the gradient
    ctx.textAlign = "center";
    ctx.fillStyle = "rgb(255, 255, 255)";

    // SUMMITS title
    yPos = topPadding;
    ctx.font = `800 ${titleSize}px "Montserrat", "Inter", -apple-system, sans-serif`;
    ctx.letterSpacing = "0.2em";
    ctx.fillText("SUMMITS", width / 2, yPos + titleSize);
    ctx.letterSpacing = "0";
    yPos += titleSize + 40 * scale + 15 * scale;

    // Two centered columns
    const leftX = width * 0.25;
    const rightX = width * 0.75;

    // Elevation (left)
    ctx.font = `700 ${labelSize}px "Inter", -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.letterSpacing = "0.04em";
    ctx.fillText(elevationLabel.toUpperCase(), leftX, yPos);
    ctx.letterSpacing = "0";

    let statValueY = yPos + labelSize + statLabelValueSpacing + 8 * scale;

    ctx.font = `700 ${valueSize}px "Inter", -apple-system, sans-serif`;
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.fillText(
      Math.round(this.currentStats.currentElevation).toLocaleString(),
      leftX,
      statValueY
    );

    ctx.font = `600 ${unitSize}px "Inter", -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("m", leftX, statValueY + valueSize * 0.6 + 2 * scale);

    // Distance (right)
    ctx.font = `700 ${labelSize}px "Inter", -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.letterSpacing = "0.04em";
    ctx.fillText(distanceLabel.toUpperCase(), rightX, yPos);
    ctx.letterSpacing = "0";

    let statValueRightY =
      yPos + labelSize + statLabelValueSpacing + 8 * scale;

    ctx.font = `700 ${valueSize}px "Inter", -apple-system, sans-serif`;
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.fillText(
      this.currentStats.currentDistance.toFixed(1),
      rightX,
      statValueRightY
    );

    ctx.font = `600 ${unitSize}px "Inter", -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText("km", rightX, statValueRightY + valueSize * 0.6 + 2 * scale);

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }

  // Track the mime type used for recording
  private recordingMimeType: string = "video/webm";

  private async startRecording(): Promise<void> {
    // Setup composite canvas
    this.setupCompositeCanvas();

    if (!this.compositeCanvas) {
      throw new Error("Failed to create composite canvas");
    }

    this.canvasStream = this.compositeCanvas.captureStream(this.config.fps);

    // Detect if we're on native platform for optimized codec selection
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();

    // For native platforms, prioritize MP4/H.264 (better compatibility with gallery)
    // For web, we can be more flexible with codec selection
    let mimeType: string;

    if (isNative) {
      // Native platforms (Android/iOS): Prioritize MP4/H.264 for gallery compatibility
      console.log(
        "[RouteAnimation] Native platform detected, optimizing for MP4/H.264"
      );

      // Try MP4 codecs in order of compatibility (Baseline is most compatible)
      if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E")) {
        // H.264 Baseline Profile Level 3.0 - best compatibility (WhatsApp, gallery, etc.)
        mimeType = "video/mp4;codecs=avc1.42E01E";
      } else if (
        MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.4D001E")
      ) {
        // H.264 Main Profile Level 3.0 - good balance
        mimeType = "video/mp4;codecs=avc1.4D001E";
      } else if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")) {
        // Generic H.264
        mimeType = "video/mp4;codecs=avc1";
      } else if (MediaRecorder.isTypeSupported("video/mp4")) {
        // MP4 without codec spec (browser will choose)
        mimeType = "video/mp4";
      } else {
        // Fallback to WebM only if MP4 is completely unavailable (shouldn't happen on native)
        console.warn(
          "[RouteAnimation] MP4 not supported on native platform, falling back to WebM"
        );
        mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";
      }
    } else {
      // Web platform: Try high-quality codecs first, then fall back
      if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.640028")) {
        // H.264 High Profile Level 4.0 - best quality
        mimeType = "video/mp4;codecs=avc1.640028";
      } else if (
        MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.64001E")
      ) {
        // H.264 High Profile Level 3.0
        mimeType = "video/mp4;codecs=avc1.64001E";
      } else if (
        MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.4D001E")
      ) {
        // H.264 Main Profile Level 3.0
        mimeType = "video/mp4;codecs=avc1.4D001E";
      } else if (
        MediaRecorder.isTypeSupported("video/mp4;codecs=avc1.42E01E")
      ) {
        // H.264 Baseline Profile Level 3.0
        mimeType = "video/mp4;codecs=avc1.42E01E";
      } else if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")) {
        mimeType = "video/mp4;codecs=avc1";
      } else if (MediaRecorder.isTypeSupported("video/mp4")) {
        mimeType = "video/mp4";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        mimeType = "video/webm;codecs=vp8";
      } else {
        mimeType = "video/webm";
      }
    }

    this.recordingMimeType = mimeType;

    // Log codec detection results for debugging
    console.log("[RouteAnimation] Recording configuration:", {
      platform: isNative ? platform : "web",
      isNative,
      selectedMimeType: mimeType,
      isMP4: mimeType.includes("mp4"),
      isWebM: mimeType.includes("webm"),
      videoBitrate: `${(this.config.videoBitrate / 1000000).toFixed(1)} Mbps`,
      fps: this.config.fps,
      canvasSize: this.compositeCanvas
        ? `${this.compositeCanvas.width}x${this.compositeCanvas.height}`
        : "unknown",
      isMobile: this.config.isMobile,
      note: isNative
        ? "Native platform - optimized for MP4/H.264 gallery compatibility"
        : "Web platform - flexible codec selection",
    });

    // Log available codec support for troubleshooting
    console.log("[RouteAnimation] Browser codec support:", {
      "mp4 (H.264 High)": MediaRecorder.isTypeSupported(
        "video/mp4;codecs=avc1.640028"
      ),
      "mp4 (H.264 Main)": MediaRecorder.isTypeSupported(
        "video/mp4;codecs=avc1.4D001E"
      ),
      "mp4 (H.264 Baseline)": MediaRecorder.isTypeSupported(
        "video/mp4;codecs=avc1.42E01E"
      ),
      "mp4 (generic)": MediaRecorder.isTypeSupported("video/mp4"),
      "webm (VP9)": MediaRecorder.isTypeSupported("video/webm;codecs=vp9"),
      "webm (VP8)": MediaRecorder.isTypeSupported("video/webm;codecs=vp8"),
      "webm (generic)": MediaRecorder.isTypeSupported("video/webm"),
    });

    this.mediaRecorder = new MediaRecorder(this.canvasStream, {
      mimeType,
      videoBitsPerSecond: this.config.videoBitrate,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    // Track recording start time for duration calculation
    this.recordingStartTime = performance.now();

    console.log(
      "[RouteAnimation] Recording started at:",
      new Date().toISOString()
    );

    // Start recording with timeslice - request data every 100ms
    // This ensures we get regular data chunks and can properly stop recording
    this.mediaRecorder.start(100);
  }

  private async stopRecording(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve();
        return;
      }

      // Track recording end time for duration calculation
      this.recordingEndTime = performance.now();

      console.log(
        "[RouteAnimation] Recording stopped at:",
        new Date().toISOString()
      );

      // Stop the animation frame loop first to prevent further drawing
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }

      // Stop the MediaRecorder
      if (
        this.mediaRecorder.state === "recording" ||
        this.mediaRecorder.state === "paused"
      ) {
        // Set up the stop handler before stopping
        const stopHandler = async () => {
          // Stop all tracks in the stream AFTER MediaRecorder has stopped
          // This prevents further frames from being recorded
          if (this.canvasStream) {
            this.canvasStream.getTracks().forEach((track) => {
              track.stop();
            });
            this.canvasStream = null;
          }

          console.log(
            "[RouteAnimation] MediaRecorder stopped, processing video..."
          );
          console.log(
            "[RouteAnimation] Recorded chunks:",
            this.recordedChunks.length
          );

          // Use the actual mime type that was used for recording
          let blob = new Blob(this.recordedChunks, {
            type: this.recordingMimeType,
          });

          // Fix WebM duration metadata if needed
          const durationMs = this.recordingEndTime - this.recordingStartTime;
          if (durationMs > 0) {
            blob = await fixWebmDuration(blob, durationMs);
          }

          console.log("[RouteAnimation] Final video blob created:", {
            type: blob.type,
            size: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
            chunks: this.recordedChunks.length,
          });

          // Clear recorded chunks after creating blob
          this.recordedChunks = [];

          const keepMapState = this.config.keepMapStateOnComplete || false;
          this.cleanup(keepMapState);
          if (this.config.onComplete) {
            this.config.onComplete(blob);
          }
          resolve();
        };

        this.mediaRecorder.onstop = stopHandler;

        // Request final data chunk before stopping to ensure we get the last frame
        try {
          this.mediaRecorder.requestData();
        } catch (e) {
          // Ignore if already stopped or not supported
        }

        // Stop the recorder - this will trigger onstop handler
        try {
          this.mediaRecorder.stop();
        } catch (e) {
          // If stop fails, manually trigger cleanup
          if (this.canvasStream) {
            this.canvasStream.getTracks().forEach((track) => {
              track.stop();
            });
            this.canvasStream = null;
          }
          resolve();
        }
      } else {
        // Already stopped or inactive
        if (this.canvasStream) {
          this.canvasStream.getTracks().forEach((track) => {
            track.stop();
          });
          this.canvasStream = null;
        }
        resolve();
      }
    });
  }

  /**
   * Register a map render handler that composites the overlay after each Mapbox frame.
   * This ensures we always capture the latest rendered map pixels.
   */
  private registerRenderHandler(): void {
    this.unregisterRenderHandler();
    this.mapRenderHandler = () => {
      if (!this.isRecordingComplete) {
        this.drawOverlay();
      }
    };
    this.map.on("render", this.mapRenderHandler);
  }

  private unregisterRenderHandler(): void {
    if (this.mapRenderHandler) {
      try {
        this.map.off("render", this.mapRenderHandler);
      } catch {
        // Ignore
      }
      this.mapRenderHandler = null;
    }
  }

  /**
   * Query terrain elevation at a point
   */
  private getTerrainElevation(lng: number, lat: number): number {
    try {
      const elevation = this.map.queryTerrainElevation([lng, lat]);
      return elevation || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Wait for all tiles to be fully loaded
   */
  private async waitForTilesLoaded(): Promise<void> {
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (this.areTilesLoaded() && this.isStyleLoaded()) {
          setTimeout(resolve, 500);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
  }

  /**
   * Prepare starting position - fly to start and wait for tiles to load
   */
  private async prepareStartingPosition(): Promise<void> {
    const numCoordinates = this.coordinates.length;
    const firstCoord = this.coordinates[0];
    if (!firstCoord) {
      throw new Error("No coordinates available");
    }
    const lookAheadStart = Math.min(15, numCoordinates - 1);
    const lookAheadCoord = this.coordinates[lookAheadStart];
    if (!lookAheadCoord) {
      throw new Error("Not enough coordinates for animation");
    }
    const initialBearing = calculateBearing(firstCoord, lookAheadCoord);

    const cameraDistance = -200;
    const initialCameraPos = offsetPosition(
      firstCoord,
      (initialBearing + 180) % 360,
      cameraDistance
    );

    const startElevation = this.getTerrainElevation(
      firstCoord.lng,
      firstCoord.lat
    );
    const initialAltitude = startElevation + this.config.cameraAltitude;

    // Calculate initial zoom using the same formula as the animation
    const altitudeZoom = 17.0 - initialAltitude / 2000;
    const initialZoom = Math.max(13.0, Math.min(16.5, altitudeZoom));

    this.smoothedCamera = {
      lng: initialCameraPos.lng,
      lat: initialCameraPos.lat,
      bearing: initialBearing,
      altitude: initialAltitude,
    };

    // Fly to starting position while drawing overlay
    await new Promise<void>((resolve) => {
      let renderHandler: () => void;
      let moveEndHandler: () => void;

      renderHandler = () => {
        // Draw overlay only when map has finished rendering
        // This avoids read/write conflicts with the map canvas
        if (!this.isRecordingComplete) {
          this.drawOverlay();
        }
      };

      moveEndHandler = () => {
        // Clean up event listener
        this.map.off("render", renderHandler);
        resolve();
      };

      // Listen to map render events instead of separate RAF loop
      // This ensures we only read from map canvas after Mapbox has finished rendering
      this.map.on("render", renderHandler);

      this.map.flyTo({
        center: [initialCameraPos.lng, initialCameraPos.lat],
        zoom: initialZoom,
        bearing: initialBearing,
        pitch: this.config.pitch,
        duration: 2500,
        essential: true,
      });

      this.map.once("moveend", moveEndHandler);
    });

    await this.waitForTilesLoaded();
  }

  /**
   * Calculate stats up to current position (distance-based)
   */
  private calculateCurrentStats(
    currentIndex: number,
    interpolationFactor: number
  ): AnimationStats {
    // Use cumulative distances for accurate distance calculation
    let currentDistance = this.cumulativeDistances[currentIndex] || 0;
    let currentElevation = 0;
    let prevElevation = this.coordinates[0]?.elevation ?? null;

    // Calculate elevation up to current index
    for (let i = 1; i <= currentIndex && i < this.coordinates.length; i++) {
      const curr = this.coordinates[i];
      if (!curr) continue;
      const elevation = curr.elevation;
      if (elevation != null && prevElevation != null) {
        const elevDiff = elevation - prevElevation;
        if (elevDiff > 0) {
          currentElevation += elevDiff;
        }
      }
      prevElevation = elevation ?? prevElevation;
    }

    // Add partial distance/elevation for current segment
    if (currentIndex < this.coordinates.length - 1 && interpolationFactor > 0) {
      const prev = this.coordinates[currentIndex];
      const curr = this.coordinates[currentIndex + 1];

      if (prev && curr) {
        const segmentStartDist = this.cumulativeDistances[currentIndex] || 0;
        const segmentEndDist =
          this.cumulativeDistances[currentIndex + 1] || segmentStartDist;
        const segmentDist = segmentEndDist - segmentStartDist;
        currentDistance += segmentDist * interpolationFactor;

        const prevElev = prev.elevation;
        const currElev = curr.elevation;
        if (prevElev != null && currElev != null) {
          const segmentElev = currElev - prevElev;
          if (segmentElev > 0) {
            currentElevation += segmentElev * interpolationFactor;
          }
        }
      }
    }

    return {
      currentDistance: currentDistance / 1000, // km
      currentElevation: Math.round(currentElevation),
      totalDistance: this.routeStats.totalDistance,
      totalElevation: Math.round(this.routeStats.totalElevation),
    };
  }

  /**
   * Run the main animation loop
   */
  private async runAnimation(): Promise<void> {
    const numCoordinates = this.coordinates.length;
    const cameraDistance = -200;

    const totalDistance =
      this.cumulativeDistances[this.cumulativeDistances.length - 1] || 0;

    return new Promise((resolve) => {
      let lastTime = performance.now();
      let pausedStartTime: number | null = null;
      let previousSpeedIndex = this.currentSpeedIndex;

      // Register map render handler to composite overlay after each map frame
      this.registerRenderHandler();

      const animate = (currentTime: number) => {
        if (this.isCancelled) {
          this.unregisterRenderHandler();
          resolve();
          return;
        }

        // Handle pause/resume
        if (this.isPaused) {
          if (pausedStartTime === null) {
            pausedStartTime = currentTime;
          }
          // Continue rendering but don't advance animation - keep camera at current position
          // Still update the map to maintain smooth rendering and prevent visual jumps
          if (this.smoothedCamera) {
            const altitudeZoom = 17.0 - this.smoothedCamera.altitude / 2000;
            const zoom = Math.max(13.0, Math.min(16.5, altitudeZoom));
            this.map.jumpTo({
              center: [this.smoothedCamera.lng, this.smoothedCamera.lat],
              bearing: this.smoothedCamera.bearing,
              pitch: this.config.pitch,
              zoom: zoom,
            });
          }
          // Draw overlay during pause in case map render event doesn't fire
          // (no camera change = no re-render)
          if (!this.isRecordingComplete) {
            this.drawOverlay();
          }
          this.animationFrameId = requestAnimationFrame(animate);
          return;
        } else {
          // If we were paused, reset lastTime to current time to avoid jump on resume
          if (pausedStartTime !== null) {
            lastTime = currentTime;
            pausedStartTime = null;
          }
        }

        const deltaTime = Math.min(currentTime - lastTime, 50) / 1000; // Convert to seconds
        lastTime = currentTime;
        const frameFactor = deltaTime * 60; // Normalize to 60fps

        // Calculate distance traveled based on speed and time
        // Track speed changes to ensure smooth transitions
        const speedChanged = previousSpeedIndex !== this.currentSpeedIndex;
        const currentSpeed = SPEED_MULTIPLIERS[this.currentSpeedIndex] || 1;
        const speedMetersPerSecond = this.config.baseSpeed * currentSpeed;

        // When speed changes, use a smaller deltaTime for the first frame to prevent jumps
        // This allows the camera smoothing to catch up smoothly
        const effectiveDeltaTime =
          speedChanged && deltaTime > 0.016 ? 0.016 : deltaTime;
        const distanceThisFrame = speedMetersPerSecond * effectiveDeltaTime;
        this.distanceTraveled += distanceThisFrame;

        // Update previous speed index
        previousSpeedIndex = this.currentSpeedIndex;

        // Clamp distance to total route distance
        this.distanceTraveled = Math.min(this.distanceTraveled, totalDistance);

        // Calculate progress based on distance traveled
        const progress =
          totalDistance > 0 ? this.distanceTraveled / totalDistance : 0;

        // Throttle progress updates to prevent excessive callback invocations
        if (this.config.onProgress) {
          const now = performance.now();
          if (now - this.lastProgressUpdate >= this.PROGRESS_THROTTLE_MS) {
            this.lastProgressUpdate = now;
            // Use requestAnimationFrame to batch updates and prevent infinite loops
            requestAnimationFrame(() => {
              if (this.config.onProgress && !this.isCancelled) {
                this.config.onProgress(progress);
              }
            });
          }
        }

        // Calculate target distance based on distance traveled
        const targetDistance = this.distanceTraveled;

        // Find position based on distance traveled
        const { index: currentIndex, t } =
          this.findPositionByDistance(targetDistance);
        const nextIndex = Math.min(currentIndex + 1, numCoordinates - 1);

        const currentCoord = this.coordinates[currentIndex];
        const nextCoord = this.coordinates[nextIndex];

        if (!currentCoord || !nextCoord) {
          requestAnimationFrame(animate);
          return;
        }

        const currentPos = interpolateCoordinate(currentCoord, nextCoord, t);

        // Update stats (throttle to prevent infinite loops)
        const stats = this.calculateCurrentStats(currentIndex, t);

        // Throttle external stats updates to prevent excessive callback invocations
        if (this.config.onStatsUpdate) {
          // Compare with previous stats BEFORE updating
          const prevStats = this.currentStats;
          const distanceChanged =
            Math.abs(prevStats.currentDistance - stats.currentDistance) > 0.01;
          const elevationChanged =
            prevStats.currentElevation !== stats.currentElevation;
          const totalDistanceChanged =
            prevStats.totalDistance !== stats.totalDistance;
          const totalElevationChanged =
            prevStats.totalElevation !== stats.totalElevation;

          if (
            distanceChanged ||
            elevationChanged ||
            totalDistanceChanged ||
            totalElevationChanged
          ) {
            // Update internal stats for overlay rendering
            this.currentStats = stats;

            // Always store the latest pending stats update (overwrite previous if any)
            this.pendingStatsUpdate = stats;

            // Throttle using time-based throttling
            const now = performance.now();
            if (now - this.lastStatsUpdate >= this.STATS_THROTTLE_MS) {
              this.lastStatsUpdate = now;

              // Cancel any existing pending RAF callback
              if (this.statsUpdateRafId !== null) {
                cancelAnimationFrame(this.statsUpdateRafId);
                this.statsUpdateRafId = null;
              }

              // Use requestAnimationFrame to batch updates and prevent infinite loops
              this.statsUpdateRafId = requestAnimationFrame(() => {
                if (
                  this.config.onStatsUpdate &&
                  this.pendingStatsUpdate &&
                  !this.isCancelled
                ) {
                  // Use the latest pending stats (may have been updated since RAF was scheduled)
                  this.config.onStatsUpdate(this.pendingStatsUpdate);
                  this.pendingStatsUpdate = null;
                }
                this.statsUpdateRafId = null;
              });
            }
            // If not enough time has passed, pendingStatsUpdate is still updated above
            // and will be used when the next RAF callback executes
          } else {
            // Still update internal stats even if no callback is needed
            this.currentStats = stats;
          }
        } else {
          // Always update internal stats for overlay rendering
          this.currentStats = stats;
        }

        // Overlay is now drawn by map render handler (registerRenderHandler)
        // to ensure we composite after each map frame with the latest pixels

        // Look ahead for bearing
        const lookAhead = Math.min(25, numCoordinates - 1 - currentIndex);
        const lookAheadIdx = Math.min(
          currentIndex + Math.max(8, lookAhead),
          numCoordinates - 1
        );
        const lookAheadCoord = this.coordinates[lookAheadIdx];
        if (!lookAheadCoord) {
          requestAnimationFrame(animate);
          return;
        }
        const targetBearing = calculateBearing(currentPos, lookAheadCoord);

        // Camera position
        const cameraOffset = offsetPosition(
          currentPos,
          (targetBearing + 180) % 360,
          cameraDistance
        );

        const terrainElevation = this.getTerrainElevation(
          cameraOffset.lng,
          cameraOffset.lat
        );
        const routeElevation = currentPos.elevation || 0;
        const targetAltitude =
          Math.max(terrainElevation, routeElevation) +
          this.config.cameraAltitude;

        // Apply smoothing
        if (this.smoothedCamera) {
          const posSmooth = Math.min(POSITION_SMOOTHING * frameFactor, 0.15);
          const bearSmooth = Math.min(BEARING_SMOOTHING * frameFactor, 0.08);
          const altSmooth = Math.min(ALTITUDE_SMOOTHING * frameFactor, 0.1);

          this.smoothedCamera.lng = lerp(
            this.smoothedCamera.lng,
            cameraOffset.lng,
            posSmooth
          );
          this.smoothedCamera.lat = lerp(
            this.smoothedCamera.lat,
            cameraOffset.lat,
            posSmooth
          );
          this.smoothedCamera.bearing = lerpBearing(
            this.smoothedCamera.bearing,
            targetBearing,
            bearSmooth
          );
          this.smoothedCamera.altitude = lerp(
            this.smoothedCamera.altitude,
            targetAltitude,
            altSmooth
          );

          const altitudeZoom = 17.0 - this.smoothedCamera.altitude / 2000;
          const zoom = Math.max(13.0, Math.min(16.5, altitudeZoom));

          this.map.jumpTo({
            center: [this.smoothedCamera.lng, this.smoothedCamera.lat],
            bearing: this.smoothedCamera.bearing,
            pitch: this.config.pitch,
            zoom: zoom,
          });
        }

        // Update progress line
        if (this.config.showProgressLine) {
          const lineSource = this.map.getSource(
            ANIMATION_SOURCE_ID
          ) as GeoJSONSource;
          if (lineSource) {
            const lineCoords = this.coordinates
              .slice(0, currentIndex + 1)
              .map((c) => [c.lng, c.lat]);
            lineCoords.push([currentPos.lng, currentPos.lat]);

            lineSource.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: {},
                  geometry: { type: "LineString", coordinates: lineCoords },
                },
              ],
            });
          }

          // Update current position dot
          const dotSource = this.map.getSource(
            ANIMATION_DOT_SOURCE_ID
          ) as GeoJSONSource;
          if (dotSource) {
            dotSource.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: {},
                  geometry: {
                    type: "Point",
                    coordinates: [currentPos.lng, currentPos.lat],
                  },
                },
              ],
            });
          }
        }

        // Check if we've completed the route
        if (this.distanceTraveled >= totalDistance) {
          // Stop the animation loop immediately
          if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
          }

          // Run final animation (goes up, shows route from top-down, fits to bounds)
          // This will continue drawing overlay and recording (render handler remains active)
          this.runFinalAnimation()
            .then(() => {
              // Mark recording as complete after final animation
              this.isRecordingComplete = true;

              // Draw final frame one more time before stopping
              this.drawOverlay();

              this.unregisterRenderHandler();

              // Wait a bit to ensure final frame is captured by MediaRecorder
              // Then resolve to trigger stopRecording
              // DO NOT stop stream tracks here - let MediaRecorder finish properly first
              setTimeout(() => {
                resolve();
              }, 200);
            })
            .catch((error) => {
              // If final animation fails, still resolve to stop recording
              console.error("[RouteAnimation] Final animation error:", error);
              this.isRecordingComplete = true;
              this.drawOverlay();
              this.unregisterRenderHandler();
              setTimeout(() => {
                resolve();
              }, 200);
            });
        } else {
          this.animationFrameId = requestAnimationFrame(animate);
        }
      };

      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  /**
   * Run final animation - goes up, shows route from top-down, and fits to bounds
   */
  private async runFinalAnimation(): Promise<void> {
    if (!this.smoothedCamera) {
      return;
    }

    // Calculate route bounds
    const bounds = calculateRouteBounds(this.coordinates);
    if (!bounds) {
      return;
    }

    // Fit to bounds with top-down view (pitch 0) - single smooth animation
    await new Promise<void>((resolve) => {
      // Add padding to bounds (10% on each side)
      const lngPadding = (bounds[1][0] - bounds[0][0]) * 0.1;
      const latPadding = (bounds[1][1] - bounds[0][1]) * 0.1;

      const paddedBounds: [[number, number], [number, number]] = [
        [bounds[0][0] - lngPadding, bounds[0][1] - latPadding],
        [bounds[1][0] + lngPadding, bounds[1][1] + latPadding],
      ];

      this.map.fitBounds(paddedBounds, {
        padding: {
          top: 200,
          right: 50,
          bottom: 50,
          left: 50,
        },
        duration: 2000, // Slightly longer for smoother transition
        pitch: 0, // Top-down view
        essential: true,
      });

      // Wait for fitBounds flyTo to complete
      // Overlay is drawn by the render handler registered in runAnimation
      let frameId: number | null = null;
      let isResolved = false;
      const drawLoop = () => {
        if (isResolved) return;
        if (this.map.isMoving()) {
          frameId = requestAnimationFrame(drawLoop);
        } else {
          isResolved = true;
          if (frameId !== null) {
            cancelAnimationFrame(frameId);
          }
          resolve();
        }
      };
      frameId = requestAnimationFrame(drawLoop);

      this.map.once("moveend", () => {
        isResolved = true;
        if (frameId !== null) {
          cancelAnimationFrame(frameId);
        }
        resolve();
      });
    });
  }

  private cleanup(keepMapState: boolean = false): void {
    this.unregisterRenderHandler();

    // Stop animation frame loop if still running
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Cancel pending stats update
    if (this.statsUpdateRafId !== null) {
      cancelAnimationFrame(this.statsUpdateRafId);
      this.statsUpdateRafId = null;
    }
    this.pendingStatsUpdate = null;

    // Stop and cleanup MediaRecorder if still active
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    }

    // Stop canvas stream tracks
    if (this.canvasStream) {
      this.canvasStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.canvasStream = null;
    }

    // Only remove animation layers if not keeping map state
    if (!keepMapState) {
      this.clearAnimationArtifacts();

      // Restore hidden layers
      this.restoreLayers();

      // Restore map state
      this.restoreMapState();
    }
    // If keeping map state, keep everything as is - layers, terrain, camera position

    // Cleanup composite canvas
    this.compositeCanvas = null;
    this.compositeCtx = null;

    this.isRunning = false;
    this.isRecordingComplete = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    if (!keepMapState) {
      this.smoothedCamera = null;
    }
    this.recordingMimeType = "video/webm"; // Reset to default
    this.currentSpeedIndex = DEFAULT_SPEED_INDEX;
    this.distanceTraveled = 0;
    this.recordingStartTime = 0;
    this.recordingEndTime = 0;
    this.lastProgressUpdate = 0;
    this.lastStatsUpdate = 0;
  }

  /**
   * Restore everything (layers and map state) - used when canceling from completion screen
   */
  restoreEverything(): void {
    // Remove animation layers
    this.clearAnimationArtifacts();

    // Restore hidden layers
    this.restoreLayers();

    // Restore map state
    this.restoreMapState();

    // Clean up camera and reset state
    this.smoothedCamera = null;
    this.isRunning = false;
    this.isCancelled = false;
    this.isPaused = false;
    this.currentSpeedIndex = DEFAULT_SPEED_INDEX;
    this.distanceTraveled = 0;
  }

  get running(): boolean {
    return this.isRunning;
  }
}

/**
 * Get file extension from mime type
 */
function getExtensionFromMime(mimeType: string): string {
  if (mimeType.includes("mp4")) return ".mp4";
  if (mimeType.includes("webm")) return ".webm";
  return ".webm"; // default
}

/**
 * Download video blob
 */
export function downloadVideo(
  blob: Blob,
  filename: string = "route-animation"
): void {
  // Remove any existing extension
  const baseName = filename.replace(/\.(mp4|webm)$/i, "");
  const extension = getExtensionFromMime(blob.type);

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = baseName + extension;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Check browser support for video recording
 */
export function isVideoRecordingSupported(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    (MediaRecorder.isTypeSupported("video/mp4") ||
      MediaRecorder.isTypeSupported("video/webm"))
  );
}
