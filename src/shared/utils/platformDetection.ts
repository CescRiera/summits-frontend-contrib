import { Capacitor } from "@capacitor/core";

export type PlatformType = "web" | "ios" | "android";

/**
 * Detects the current platform type
 * @returns PlatformType - 'web', 'ios', or 'android'
 */
export const getPlatformType = (): PlatformType => {
  try {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === "ios") {
        return "ios";
      } else if (platform === "android") {
        return "android";
      }
    }
  } catch (error) {
    // If Capacitor is not available or there's an error, assume web
    console.warn("Error detecting platform, defaulting to web:", error);
  }
  return "web";
};

/**
 * Gets the platform type as a string for API headers
 * @returns 'web', 'ios', or 'android'
 */
export const getPlatformHeader = (): string => {
  return getPlatformType();
};





