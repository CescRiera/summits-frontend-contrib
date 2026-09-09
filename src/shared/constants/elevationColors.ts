/**
 * Centralized elevation color system
 * These colors are used throughout the application for elevation-based visualizations
 */

export const ELEVATION_COLORS = {
  // Green - Low elevation (0m+)
  GREEN: "#00AE21",

  // Yellow - Medium-low elevation (2000m+)
  YELLOW: "#FFBB00",

  // Orange - Medium elevation (3000m+)
  ORANGE: "#FF7300",

  // Red - High elevation (4000m+)
  RED: "#FF0000",

  // Burgundy - Very high elevation (6000m+)
  BURGUNDY: "#480001",

  // Black - Extreme elevation (8000m+)
  BLACK: "rgb(0, 0, 0)",
} as const;

export const SOFT_ELEVATION_COLORS = {
  GREEN: "#b7deab",
  YELLOW: "#fce076",
  ORANGE: "#efad75",
  RED: "#df6654",
  BURGUNDY: "#65403a",
  BLACK: "rgb(30, 41, 59)",
} as const;

/**
 * Get elevation color based on elevation value
 */
export const getElevationColor = (elevation: number): string => {
  if (elevation >= 8000) return ELEVATION_COLORS.BLACK;
  if (elevation >= 6000) return ELEVATION_COLORS.BURGUNDY;
  if (elevation >= 4000) return ELEVATION_COLORS.RED;
  if (elevation >= 3000) return ELEVATION_COLORS.ORANGE;
  if (elevation >= 2000) return ELEVATION_COLORS.YELLOW;
  return ELEVATION_COLORS.GREEN;
};

/**
 * Get soft elevation color based on elevation value (ideal for backgrounds)
 */
export const getElevationSoftColor = (elevation: number): string => {
  if (elevation >= 8000) return SOFT_ELEVATION_COLORS.BLACK;
  if (elevation >= 6000) return SOFT_ELEVATION_COLORS.BURGUNDY;
  if (elevation >= 4000) return SOFT_ELEVATION_COLORS.RED;
  if (elevation >= 3000) return SOFT_ELEVATION_COLORS.ORANGE;
  if (elevation >= 2000) return SOFT_ELEVATION_COLORS.YELLOW;
  return SOFT_ELEVATION_COLORS.GREEN;
};

/**
 * Elevation ranges with their corresponding colors
 */
export const ELEVATION_RANGES = [
  { min: 0, max: 2000, color: ELEVATION_COLORS.GREEN, name: "Green" },
  { min: 2000, max: 3000, color: ELEVATION_COLORS.YELLOW, name: "Yellow" },
  { min: 3000, max: 4000, color: ELEVATION_COLORS.ORANGE, name: "Orange" },
  { min: 4000, max: 6000, color: ELEVATION_COLORS.RED, name: "Red" },
  { min: 6000, max: 8000, color: ELEVATION_COLORS.BURGUNDY, name: "Burgundy" },
  { min: 8000, max: 99999, color: ELEVATION_COLORS.BLACK, name: "Black" },
] as const;

/**
 * Legacy color mapping for backward compatibility
 * Maps old color names to new standardized colors
 */
export const LEGACY_COLOR_MAP = {
  peak_black: ELEVATION_COLORS.BLACK,
  peak_burgundy: ELEVATION_COLORS.BURGUNDY,
  peak_red: ELEVATION_COLORS.RED,
  peak_orange: ELEVATION_COLORS.ORANGE,
  peak_yellow: ELEVATION_COLORS.YELLOW,
  peak_green: ELEVATION_COLORS.GREEN,
  peak_gray: "#6b7280", // Keep gray as fallback
  peak_blue: ELEVATION_COLORS.BURGUNDY, // Map blue to burgundy
} as const;

/**
 * Get elevation icon path based on elevation value
 */
export const getElevationIcon = (elevation: number): string => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

export const getElevationIconMap = (elevation: number): string => {
  if (elevation >= 8000) return "/icons/altitude/map/ic_mountain_black_map.png";
  if (elevation >= 6000) return "/icons/altitude/map/ic_mountain_burgundy_map.png";
  if (elevation >= 4000) return "/icons/altitude/map/ic_mountain_red_map.png";
  if (elevation >= 3000) return "/icons/altitude/map/ic_mountain_orange_map.png";
  if (elevation >= 2000) return "/icons/altitude/map/ic_mountain_yellow_map.png";
  return "/icons/altitude/map/ic_mountain_green_map.png";
};

/**
 * Get total ascensions for a community peak
 */
export const getTotalAscensions = (peak: { users?: { completion_count?: number }[] }): number => {
  if (!peak.users || peak.users.length === 0) return 0;
  return peak.users.reduce(
    (total, user) => total + (user.completion_count || 0),
    0
  );
};
