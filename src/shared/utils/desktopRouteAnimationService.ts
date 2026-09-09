/**
 * Desktop Route Animation Service (Professional Implementation)
 *
 * Implements smooth 3D flyover animations with:
 * - Pre-calculated keyframe positions for performance
 * - Real-time interpolation between keyframes for smooth transitions
 * - Proper bearing wraparound handling (0-360 degrees)
 * - Continuous stats updates
 * - Pause/resume with speed control
 *
 * Architecture:
 * 1. Precalculation phase: Calculate sparse keyframes ahead of time
 * 2. Animation phase: Interpolate smoothly between keyframes during playback
 * 3. Cleanup phase: Restore map state and remove layers/sources
 */

import type { RouteCoordinate } from "../api/types/routes";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import { enableMapboxTerrain } from "./mapboxTerrain";

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

/** Layers that should be hidden during animation to reduce clutter */
const LAYERS_TO_HIDE = [
  "nearby-peaks-symbols",
  "nearby-peaks-labels",
  "peak-icons",
  "peak-labels",
  "route-start-circle",
  "route-finish-circle",
  "route-line-layer",
];

/** Default animation parameters */
const DEFAULT_PITCH = 55; // Camera angle (0-85)
const DEFAULT_CAMERA_ALTITUDE = 2500; // Height above terrain in meters
const DEFAULT_BASE_SPEED = 50; // Meters per second at 1x speed
const DEFAULT_SPEED_MULTIPLIER = 5; // Start at 5x speed

/** Interpolation smoothing factors (0-1, higher = snappier) */
const POSITION_SMOOTHING = 0.08; // Camera position follows path smoothly
const BEARING_SMOOTHING = 0.06; // Camera rotation follows smoothly with slight lag
const ALTITUDE_SMOOTHING = 0.06; // Camera height follows smoothly

/** Mapbox layer/source IDs for animation overlays */
const ANIMATION_SOURCE_ID = "route-animation-progress";
const ANIMATION_LINE_BORDER_ID = "route-animation-line-border";
const ANIMATION_LINE_ID = "route-animation-line";
const ANIMATION_DOT_SOURCE_ID = "route-animation-dot";
const ANIMATION_DOT_ID = "route-animation-dot-layer";

// ============================================================================
// TYPES
// ============================================================================

/** Animation statistics for UI display */
export interface AnimationStats {
  currentDistance: number; // km
  currentElevation: number; // meters
  totalDistance: number; // km
  totalElevation: number; // meters
}

/** Configuration options for animation */
export interface DesktopRouteAnimationConfig {
  pitch?: number;
  cameraAltitude?: number;
  showProgressLine?: boolean;
  keepMapStateOnComplete?: boolean;
  onPrecalcProgress?: (progress: number) => void;
  onStatsUpdate?: (stats: AnimationStats) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

/** Keyframe for animation with pre-calculated position and camera state */
interface CameraKeyframe {
  lng: number;
  lat: number;
  bearing: number;
  zoom: number;
  pitch: number;
  distance: number; // Cumulative distance from start (meters)
  elevation: number; // Cumulative elevation gain (meters)
  polylineCoords: [number, number][]; // Route polyline from start to this point
}

/** Current interpolated camera frame state */
interface AnimationFrame {
  lng: number;
  lat: number;
  bearing: number;
  zoom: number;
  pitch: number;
  polylineCoords: [number, number][];
}

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
 * Smoothly interpolate between two bearings, handling 0/360 wraparound
 * E.g., interpolating from 350° to 10° goes through 360°, not 180°
 */
function lerpBearing(
  current: number,
  target: number,
  t: number
): number {
  current = ((current % 360) + 360) % 360;
  target = ((target % 360) + 360) % 360;

  let diff = target - current;

  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }

  const result = current + diff * t;
  return ((result % 360) + 360) % 360;
}

/**
 * Linear interpolation between two values
 */
function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * t;
}

/**
 * Calculate position offset from a point given bearing and distance
 */
function offsetPosition(
  point: { lng: number; lat: number },
  bearing: number,
  distanceMeters: number
): { lng: number; lat: number } {
  const earthRadius = 6371000;
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
 * Calculate great-circle distance between two points (Haversine formula)
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
 * Sample coordinates to reduce complexity for long routes
 */
function sampleCoordinates(
  coordinates: RouteCoordinate[],
  maxPoints: number = 600
): RouteCoordinate[] {
  if (coordinates.length <= maxPoints) return coordinates;

  const step = (coordinates.length - 1) / (maxPoints - 1);
  const sampled: RouteCoordinate[] = [];

  for (let i = 0; i < maxPoints - 1; i++) {
    const index = Math.floor(i * step);
    const coord = coordinates[index];
    if (coord) sampled.push(coord);
  }

  const lastCoord = coordinates[coordinates.length - 1];
  if (lastCoord) sampled.push(lastCoord);

  return sampled;
}

/**
 * Calculate cumulative distance and elevation for route statistics
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
      if (elevDiff > 0) totalElevation += elevDiff;
    }
    prevElevation = elevation ?? prevElevation;
  }

  return {
    totalDistance: totalDistance / 1000, // Convert to km
    totalElevation,
  };
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class DesktopRouteAnimationService {
  private map: MapboxMap;
  private coordinates: RouteCoordinate[];
  private config: Required<
    Omit<
      DesktopRouteAnimationConfig,
      "onPrecalcProgress" | "onStatsUpdate" | "onComplete" | "onError" | "onCancel"
    >
  > &
    DesktopRouteAnimationConfig;

  // Animation state
  private isRunning = false;
  private isPaused = false;
  private isCancelled = false;
  private animationFrameId: number | null = null;

  // Route data
  private keyframes: CameraKeyframe[] = [];
  private routeStats: { totalDistance: number; totalElevation: number } = {
    totalDistance: 0,
    totalElevation: 0,
  };
  private isPrecalculated = false;

  // Map state management
  private originalMapState: {
    center: { lng: number; lat: number };
    zoom: number;
    bearing: number;
    pitch: number;
  } | null = null;
  private hiddenLayers: string[] = [];

  // Animation playback state
  private speedMultiplier = DEFAULT_SPEED_MULTIPLIER;
  private accumulatedDistance = 0; // Total distance traveled so far in animation
  private accumulatedPolyline: [number, number][] = []; // Accumulated route coordinates as we progress
  private lastPolylineUpdateIndex = -1; // Track last polyline update to avoid constant redraws

  // Current interpolated camera state
  private currentFrame: AnimationFrame = {
    lng: 0,
    lat: 0,
    bearing: 0,
    zoom: 15,
    pitch: DEFAULT_PITCH,
    polylineCoords: [],
  };

  constructor(
    map: MapboxMap,
    coordinates: RouteCoordinate[],
    config: DesktopRouteAnimationConfig = {}
  ) {
    this.map = map;
    this.coordinates = sampleCoordinates(coordinates);
    this.config = {
      pitch: DEFAULT_PITCH,
      cameraAltitude: DEFAULT_CAMERA_ALTITUDE,
      showProgressLine: true,
      keepMapStateOnComplete: false,
      ...config,
    };
    // Calculate stats from FULL coordinate set for accuracy
    this.routeStats = calculateRouteStats(coordinates);

    const elevations = coordinates
      .map((c) => c.elevation)
      .filter((e): e is number => e != null);
    const elevSummary =
      elevations.length > 0
        ? `${elevations.length}/${coordinates.length} coords have elevation, range: ${Math.min(...elevations)}–${Math.max(...elevations)}m`
        : "NO elevation data in any coordinate";
    console.log(
      `[DesktopRouteAnimation] Coordinates: ${coordinates.length} total, sampled to ${this.coordinates.length}. ${elevSummary}`
    );
  }

  async precalculate(): Promise<void> {
    if (this.isPrecalculated) return;

    const numCoordinates = this.coordinates.length;
    if (numCoordinates < 2) {
      throw new Error("Not enough coordinates for animation (minimum 2)");
    }

    this.keyframes = [];
    const KEYFRAME_INTERVAL = 50; // Calculate keyframe every 50 coordinates

    // Calculate cumulative distances and elevations
    const cumulativeDistances: number[] = [0];
    const cumulativeElevations: number[] = [0];
    let prevElevation = this.coordinates[0]?.elevation ?? null;

    for (let i = 1; i < numCoordinates; i++) {
      const prev = this.coordinates[i - 1];
      const curr = this.coordinates[i];

      if (!prev || !curr) continue;

      const segmentDist = haversineDistance(
        prev.lat,
        prev.lng,
        curr.lat,
        curr.lng
      );
      const lastDist = cumulativeDistances[cumulativeDistances.length - 1];
      if (lastDist !== undefined) {
        cumulativeDistances.push(lastDist + segmentDist);
      }
      const elevation = curr.elevation;
      if (elevation != null && prevElevation != null) {
        const elevDiff = elevation - prevElevation;
        const elevGain = elevDiff > 0 ? elevDiff : 0;
        const lastElev = cumulativeElevations[cumulativeElevations.length - 1];
        if (lastElev !== undefined) {
          cumulativeElevations.push(lastElev + elevGain);
        }
      } else {
        const lastElev = cumulativeElevations[cumulativeElevations.length - 1];
        if (lastElev !== undefined) {
          cumulativeElevations.push(lastElev);
        }
      }
      prevElevation = elevation ?? prevElevation;
    }

    const totalDistance = cumulativeDistances[cumulativeDistances.length - 1] ?? 0;

    // Generate keyframes at intervals
    for (let i = 0; i < numCoordinates; i += KEYFRAME_INTERVAL) {
      if (this.isCancelled) break;

      const coordIndex = Math.min(i, numCoordinates - 1);
      const coord = this.coordinates[coordIndex];

      if (!coord) continue;

      // Look ahead for bearing calculation
      const lookAhead = Math.max(5, Math.min(20, numCoordinates - 1 - coordIndex));
      const lookAheadIdx = Math.min(coordIndex + lookAhead, numCoordinates - 1);
      const lookAheadCoord = this.coordinates[lookAheadIdx];

      if (!lookAheadCoord) continue;

      const currentPos = {
        lat: coord.lat ?? 0,
        lng: coord.lng ?? 0,
        elevation: coord.elevation ?? 0,
      };

      // Calculate bearing from current position to look-ahead position
      const bearing = calculateBearing(currentPos, lookAheadCoord);

      // Position camera behind the current position, looking forward
      const cameraOffset = offsetPosition(
        currentPos,
        (bearing + 180) % 360,
        -250 // Camera is 250 meters behind
      );

      // Query terrain elevation at camera position
      let terrainElevation = 0;
      try {
        const elevation = this.map.queryTerrainElevation([
          cameraOffset.lng,
          cameraOffset.lat,
        ]);
        terrainElevation = elevation ?? 0;
      } catch {
        terrainElevation = 0;
      }

      // Calculate camera altitude above ground
      const groundElevation = Math.max(
        terrainElevation,
        currentPos.elevation ?? 0
      );
      const altitude = groundElevation + this.config.cameraAltitude;

      // Calculate zoom based on altitude (higher altitude = lower zoom)
      const altitudeZoom = 17.0 - altitude / 2000;
      const zoom = Math.max(13.0, Math.min(16.5, altitudeZoom));

      // Build polyline from start to current position
      const polylineCoords: [number, number][] = [];
      for (let j = 0; j <= coordIndex; j++) {
        const c = this.coordinates[j];
        if (c) polylineCoords.push([c.lng, c.lat]);
      }

      const distance = cumulativeDistances[coordIndex] ?? 0;
      const elevation = cumulativeElevations[coordIndex] ?? 0;

      this.keyframes.push({
        lng: cameraOffset.lng,
        lat: cameraOffset.lat,
        bearing,
        zoom,
        pitch: this.config.pitch,
        distance,
        elevation,
        polylineCoords,
      });

      // Report precalculation progress
      if (this.config.onPrecalcProgress) {
        const progress = Math.min(1, i / numCoordinates);
        this.config.onPrecalcProgress(progress);
      }

      // Yield to prevent blocking UI
      if (i % (KEYFRAME_INTERVAL * 5) === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // Ensure last keyframe is included
    if (
      this.keyframes.length === 0 ||
      (this.keyframes.length > 0 &&
        (this.keyframes[this.keyframes.length - 1]?.distance ?? 0) < totalDistance * 0.99)
    ) {
      const lastCoord = this.coordinates[numCoordinates - 1];
      if (lastCoord) {
        const lastKeyframe = this.keyframes[this.keyframes.length - 1];
        if (!lastKeyframe) return;
        
        const currentPos = {
          lat: lastCoord.lat ?? 0,
          lng: lastCoord.lng ?? 0,
          elevation: lastCoord.elevation ?? 0,
        };

        const bearing = lastKeyframe?.bearing ?? 0;
        const cameraOffset = offsetPosition(
          currentPos,
          (bearing + 180) % 360,
          -250
        );

        let terrainElevation = 0;
        try {
          const elevation = this.map.queryTerrainElevation([
            cameraOffset.lng,
            cameraOffset.lat,
          ]);
          terrainElevation = elevation ?? 0;
        } catch {
          terrainElevation = 0;
        }

        const groundElevation = Math.max(terrainElevation, currentPos.elevation ?? 0);
        const altitude = groundElevation + this.config.cameraAltitude;
        const altitudeZoom = 17.0 - altitude / 2000;
        const zoom = Math.max(13.0, Math.min(16.5, altitudeZoom));
        const polylineCoords: [number, number][] = [];
        for (let j = 0; j < numCoordinates; j++) {
          const c = this.coordinates[j];
          if (c) polylineCoords.push([c.lng, c.lat]);
        }

        if (lastKeyframe) {
          lastKeyframe.lng = cameraOffset.lng;
          lastKeyframe.lat = cameraOffset.lat;
          lastKeyframe.bearing = bearing;
          lastKeyframe.zoom = zoom;
          lastKeyframe.distance = totalDistance;
          lastKeyframe.elevation = cumulativeElevations[numCoordinates - 1] ?? 0;
          lastKeyframe.polylineCoords = polylineCoords;
        } else {
          this.keyframes.push({
            lng: cameraOffset.lng,
            lat: cameraOffset.lat,
            bearing,
            zoom,
            pitch: this.config.pitch,
            distance: totalDistance,
            elevation: cumulativeElevations[numCoordinates - 1] ?? 0,
            polylineCoords,
          });
        }
      }
    }

    this.isPrecalculated = true;

    if (this.config.onPrecalcProgress) {
      this.config.onPrecalcProgress(1);
    }
  }

  // ============================================================================
  // ANIMATION PLAYBACK
  // ============================================================================

  /**
   * Start the animation from the beginning
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error("Animation is already running");
    }

    try {
      this.isRunning = true;
      this.isPaused = false;
      this.isCancelled = false;
      this.accumulatedDistance = 0;

      // Precalculate if not done yet
      if (!this.isPrecalculated) {
        await this.precalculate();
      }

      if (this.isCancelled || this.keyframes.length === 0) return;

      // Save map state and prepare for animation
      this.saveMapState();
      this.hideLayers();
      await this.setup3DTerrain();

      if (this.config.showProgressLine) {
        this.setupAnimationLayers();
      }

      // Fly to starting position
      await this.flyToStartingPosition();

      // Run the main animation loop
      await this.runAnimationLoop();

      // Final animation: zoom out to show entire route
      if (!this.isCancelled) {
        await this.runFinalAnimation();
      }

      // Notify completion
      if (!this.isCancelled && this.config.onComplete) {
        this.config.onComplete();
      }
    } catch (error) {
      this.cleanup(false);
      const err = error instanceof Error ? error : new Error(String(error));

      if (this.config.onError) {
        this.config.onError(err);
      }

      throw err;
    }
  }

  /**
   * Pause the animation
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume a paused animation
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Cancel the animation and restore map state
   */
  cancel(): void {
    this.isCancelled = true;
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.cleanup(false);

    if (this.config.onCancel) {
      this.config.onCancel();
    }
  }

  /**
   * Set animation speed multiplier (e.g., 1x, 2x, 5x)
   */
  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.25, Math.min(10, multiplier));
  }

  /**
   * Get current speed multiplier
   */
  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Save current map state so it can be restored later
   */
  private saveMapState(): void {
    const center = this.map.getCenter();
    this.originalMapState = {
      center: { lng: center.lng, lat: center.lat },
      zoom: this.map.getZoom(),
      bearing: this.map.getBearing(),
      pitch: this.map.getPitch(),
    };
  }

  /**
   * Restore map to original state
   */
  private restoreMapState(): void {
    if (!this.originalMapState) return;

    this.map.jumpTo({
      center: [
        this.originalMapState.center.lng,
        this.originalMapState.center.lat,
      ],
      zoom: this.originalMapState.zoom,
      bearing: this.originalMapState.bearing,
      pitch: this.originalMapState.pitch,
    });
  }

  /**
   * Hide map layers that would clutter the animation
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
        // Layer might not exist, that's okay
      }
    }
  }

  /**
   * Restore hidden layers to original visibility
   */
  private restoreLayers(): void {
    for (const layerId of this.hiddenLayers) {
      try {
        if (this.map.getLayer(layerId)) {
          this.map.setLayoutProperty(layerId, "visibility", "visible");
        }
      } catch {
        // Ignore errors
      }
    }
    this.hiddenLayers = [];
  }

  /**
   * Enable 3D terrain for the animation
   */
  private async setup3DTerrain(): Promise<void> {
    enableMapboxTerrain(this.map, {
      exaggeration: 1.2,
    });
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.map.isStyleLoaded() && this.map.areTilesLoaded()) {
          setTimeout(resolve, 500);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * Create Mapbox layers for showing animation progress (line and dot)
   */
  private setupAnimationLayers(): void {
    // Clean up existing layers/sources
    [ANIMATION_LINE_ID, ANIMATION_LINE_BORDER_ID, ANIMATION_DOT_ID].forEach(
      (id) => {
        if (this.map.getLayer(id)) this.map.removeLayer(id);
      }
    );

    [ANIMATION_SOURCE_ID, ANIMATION_DOT_SOURCE_ID].forEach((id) => {
      if (this.map.getSource(id)) this.map.removeSource(id);
    });

    // Create sources
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

    this.map.addSource(ANIMATION_DOT_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });

    // Line border (thick, semi-transparent)
    this.map.addLayer({
      id: ANIMATION_LINE_BORDER_ID,
      type: "line",
      source: ANIMATION_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#A70000",
        "line-width": 9,
        "line-opacity": 0.8,
      },
    });

    // Line inner (bright, opaque)
    this.map.addLayer({
      id: ANIMATION_LINE_ID,
      type: "line",
      source: ANIMATION_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "#ED254E",
        "line-width": 5,
        "line-opacity": 1,
      },
    });

    // Current position dot
    this.map.addLayer({
      id: ANIMATION_DOT_ID,
      type: "circle",
      source: ANIMATION_DOT_SOURCE_ID,
      paint: {
        "circle-radius": 8,
        "circle-color": "#3b82f6",
        "circle-stroke-width": 3,
        "circle-stroke-color": "rgb(255, 255, 255)",
        "circle-opacity": 1,
      },
    });
  }

  /**
   * Fly to starting position of the route
   */
  private async flyToStartingPosition(): Promise<void> {
    if (this.keyframes.length === 0) return;

    const firstFrame = this.keyframes[0];
    if (!firstFrame) return;

    await new Promise<void>((resolve) => {
      this.map.flyTo({
        center: [firstFrame.lng, firstFrame.lat],
        zoom: firstFrame.zoom,
        bearing: firstFrame.bearing,
        pitch: firstFrame.pitch,
        duration: 2000,
        essential: true,
      });

      this.map.once("moveend", () => resolve());
    });

    // Wait for tiles to load
    await new Promise<void>((resolve) => {
      const check = () => {
        if (this.map.areTilesLoaded() && this.map.isStyleLoaded()) {
          setTimeout(resolve, 300);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * Main animation loop - runs frame by frame with proper interpolation
   */
  private async runAnimationLoop(): Promise<void> {
    if (this.keyframes.length === 0) return;

    const totalDistance = this.routeStats.totalDistance * 1000; // Convert to meters
    const baseSpeed = DEFAULT_BASE_SPEED;
    this.accumulatedPolyline = []; // Start with empty polyline
    this.lastPolylineUpdateIndex = -1;

    return new Promise<void>((resolve) => {
      let lastTimestamp = performance.now();
      let lastMapUpdate = 0;
      const MAP_UPDATE_THROTTLE = 16; // Update map ~60fps (every 16ms)

      const frameCallback = (currentTimestamp: number) => {
        if (this.isCancelled) {
          resolve();
          return;
        }

        // Handle pause
        if (this.isPaused) {
          lastTimestamp = currentTimestamp;
          this.animationFrameId = requestAnimationFrame(frameCallback);
          return;
        }

        // Calculate delta time
        const deltaMs = currentTimestamp - lastTimestamp;
        lastTimestamp = currentTimestamp;

        // Calculate distance traveled in this frame
        const distanceTraveledMeters =
          (baseSpeed * this.speedMultiplier * deltaMs) / 1000;

        // Update accumulated distance
        this.accumulatedDistance += distanceTraveledMeters;

        // Check if animation is complete
        if (this.accumulatedDistance >= totalDistance) {
          this.accumulatedDistance = totalDistance;
          this.updateMapFrame();
          resolve();
          return;
        }

        // Throttle map updates to 60fps
        if (currentTimestamp - lastMapUpdate >= MAP_UPDATE_THROTTLE) {
          this.updateMapFrame();
          lastMapUpdate = currentTimestamp;
        }

        // Continue animation loop
        this.animationFrameId = requestAnimationFrame(frameCallback);
      };

      this.animationFrameId = requestAnimationFrame(frameCallback);
    });
  }

  /**
   * Update camera position based on current accumulated distance
   * Finds the appropriate keyframe and interpolates smoothly
   */
  private updateMapFrame(): void {
    if (this.keyframes.length === 0) return;

    // Clamp accumulated distance to total
    const totalDistance = this.routeStats.totalDistance * 1000;
    const currentDistance = Math.min(this.accumulatedDistance, totalDistance);

    // Find keyframe range for current distance
    let startIdx = 0;
    let endIdx = 1;

    for (let i = 0; i < this.keyframes.length - 1; i++) {
      const kf = this.keyframes[i];
      const kfNext = this.keyframes[i + 1];

      if (kf && kfNext) {
        if (currentDistance >= kf.distance && currentDistance <= kfNext.distance) {
          startIdx = i;
          endIdx = i + 1;
          break;
        }
      }
    }

    // Handle edge cases - if we've gone past all keyframes, use the last one
    if (currentDistance > (this.keyframes[this.keyframes.length - 1]?.distance ?? 0)) {
      startIdx = Math.max(0, this.keyframes.length - 2);
      endIdx = this.keyframes.length - 1;
    }

    const startKeyframe = this.keyframes[startIdx];
    const endKeyframe = this.keyframes[endIdx];

    if (!startKeyframe || !endKeyframe) return;

    // Calculate interpolation factor (0-1) between the two keyframes
    const keyframeDistance = endKeyframe.distance - startKeyframe.distance;
    const distanceInKeyframe = currentDistance - startKeyframe.distance;

    const t =
      keyframeDistance > 0
        ? Math.max(0, Math.min(1, distanceInKeyframe / keyframeDistance))
        : 0;

    // Apply easing
    const easedT = this.easeInOutCubic(t);

    // Interpolate target values
    const targetLng = lerp(startKeyframe.lng, endKeyframe.lng, easedT);
    const targetLat = lerp(startKeyframe.lat, endKeyframe.lat, easedT);
    const targetBearing = lerpBearing(
      startKeyframe.bearing,
      endKeyframe.bearing,
      easedT
    );
    const targetZoom = lerp(startKeyframe.zoom, endKeyframe.zoom, easedT);
    const targetPitch = lerp(startKeyframe.pitch, endKeyframe.pitch, easedT);

    // Smoothly update camera position
    this.currentFrame.lng = lerp(
      this.currentFrame.lng,
      targetLng,
      POSITION_SMOOTHING
    );
    this.currentFrame.lat = lerp(
      this.currentFrame.lat,
      targetLat,
      POSITION_SMOOTHING
    );
    this.currentFrame.bearing = lerpBearing(
      this.currentFrame.bearing,
      targetBearing,
      BEARING_SMOOTHING
    );
    this.currentFrame.zoom = lerp(
      this.currentFrame.zoom,
      targetZoom,
      ALTITUDE_SMOOTHING
    );
    this.currentFrame.pitch = lerp(
      this.currentFrame.pitch,
      targetPitch,
      ALTITUDE_SMOOTHING
    );

    // Build accumulated polyline up to end keyframe
    // This accumulates all coordinates from start through end keyframe
    const targetCoordIndex = Math.floor(
      (this.keyframes.length - 1) * (currentDistance / totalDistance)
    );

    // Update polyline if we've progressed to new coordinates
    if (targetCoordIndex > this.lastPolylineUpdateIndex) {
      this.accumulatedPolyline = [];
      for (let i = 0; i <= Math.min(targetCoordIndex, this.coordinates.length - 1); i++) {
        const coord = this.coordinates[i];
        if (coord) {
          this.accumulatedPolyline.push([coord.lng, coord.lat]);
        }
      }
      this.lastPolylineUpdateIndex = targetCoordIndex;
    }

    this.currentFrame.polylineCoords = this.accumulatedPolyline;

    // Update map camera
    this.map.jumpTo({
      center: [this.currentFrame.lng, this.currentFrame.lat],
      zoom: this.currentFrame.zoom,
      bearing: this.currentFrame.bearing,
      pitch: this.currentFrame.pitch,
    });

    // Update animation visualization layers (less frequently)
    if (this.config.showProgressLine) {
      this.updateAnimationLayers();
    }

    // Update stats for UI
    if (this.config.onStatsUpdate) {
      const currentDistanceKm = currentDistance / 1000;
      const distancePortion = totalDistance > 0 ? currentDistance / totalDistance : 0;
      const currentElevation = Math.round(
        this.routeStats.totalElevation * distancePortion
      );

      this.config.onStatsUpdate({
        currentDistance: currentDistanceKm,
        currentElevation,
        totalDistance: this.routeStats.totalDistance,
        totalElevation: Math.round(this.routeStats.totalElevation),
      });
    }
  }

  /**
   * Ease-in-out cubic easing function for smooth acceleration/deceleration
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Update the animation progress line and dot on the map
   */
  private updateAnimationLayers(): void {
    const lineSource = this.map.getSource(ANIMATION_SOURCE_ID) as GeoJSONSource;
    if (lineSource) {
      lineSource.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: this.currentFrame.polylineCoords,
            },
          },
        ],
      });
    }

    const dotSource = this.map.getSource(ANIMATION_DOT_SOURCE_ID) as GeoJSONSource;
    if (dotSource && this.currentFrame.polylineCoords.length > 0) {
      const lastCoord =
        this.currentFrame.polylineCoords[
          this.currentFrame.polylineCoords.length - 1
        ];

      if (lastCoord) {
        dotSource.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "Point",
                coordinates: lastCoord,
              },
            },
          ],
        });
      }
    }
  }

  /**
   * Final animation: zoom out to show the entire route
   */
  private async runFinalAnimation(): Promise<void> {
    const coords = this.coordinates;
    if (coords.length === 0) return;

    // Calculate bounds
    let minLng = Infinity,
      maxLng = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;

    coords.forEach((coord) => {
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
      return;
    }

    // Add padding
    const lngPadding = (maxLng - minLng) * 0.15;
    const latPadding = (maxLat - minLat) * 0.15;

    const bounds: [[number, number], [number, number]] = [
      [minLng - lngPadding, minLat - latPadding],
      [maxLng + lngPadding, maxLat + latPadding],
    ];

    await new Promise<void>((resolve) => {
      this.map.fitBounds(bounds, {
        padding: { top: 100, right: 50, bottom: 50, left: 50 },
        duration: 2000,
        pitch: 30,
        essential: true,
      });

      this.map.once("moveend", () => resolve());
    });
  }

  /**
   * Clean up animation resources and restore map state
   */
  private cleanup(keepMapState: boolean): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (!keepMapState) {
      // Remove animation layers
      [ANIMATION_LINE_ID, ANIMATION_LINE_BORDER_ID, ANIMATION_DOT_ID].forEach(
        (id) => {
          if (this.map.getLayer(id)) this.map.removeLayer(id);
        }
      );

      [ANIMATION_SOURCE_ID, ANIMATION_DOT_SOURCE_ID].forEach((id) => {
        if (this.map.getSource(id)) this.map.removeSource(id);
      });
      this.restoreLayers();
      this.restoreMapState();
    }
    this.isRunning = false;
  }

  restoreEverything(): void {
    [ANIMATION_LINE_ID, ANIMATION_LINE_BORDER_ID, ANIMATION_DOT_ID].forEach(
      (id) => {
        if (this.map.getLayer(id)) this.map.removeLayer(id);
      }
    );
    [ANIMATION_SOURCE_ID, ANIMATION_DOT_SOURCE_ID].forEach((id) => {
      if (this.map.getSource(id)) this.map.removeSource(id);
    });
    this.restoreLayers();
    this.restoreMapState();
    this.isRunning = false;
  }

  // ============================================================================
  // PUBLIC GETTERS
  // ============================================================================

  get running(): boolean {
    return this.isRunning;
  }

  get paused(): boolean {
    return this.isPaused;
  }
}
