import { registerPlugin } from "@capacitor/core";

export interface RouteAnimationNativeConfig {
  /** Coordinates data as JSON string (preferred) */
  coordinatesData?: string;
  /** Peaks data as JSON string (optional) */
  peaksData?: string;
  /** Coordinates file path (legacy, will be deprecated) */
  coordinatesFile?: string;
  /** Peaks file path (legacy, will be deprecated) */
  peaksFile?: string;
  /** Base speed in meters per second (default: 100) */
  baseSpeed?: number;
}

export interface RouteAnimationNativePlugin {
  /**
   * Start the native route animation
   * Opens a full-screen native Activity/ViewController with Mapbox map
   */
  startAnimation(config: RouteAnimationNativeConfig): Promise<void>;
}

const RouteAnimationNative = registerPlugin<RouteAnimationNativePlugin>(
  "RouteAnimationNative",
  {
    web: () => import("./web").then((m) => m.RouteAnimationNativeWeb),
  }
);

export { RouteAnimationNative };
