/**
 * Utility functions for formatting time values
 */

/**
 * Formats a time string in HH:MM:SS format to a more readable format
 * @param timeString - Time string in HH:MM:SS format (e.g., "02:30:45")
 * @returns Formatted time string (e.g., "2h 30m" or "30m" if less than 1 hour)
 */
export const formatTimeFromHHMMSS = (
  timeString: string | null | undefined
): string => {
  if (!timeString) return "--:--";

  // Handle case where time might already be in HH:MM format
  if (timeString.length === 5 && timeString.includes(":")) {
    return timeString;
  }

  // Handle HH:MM:SS format
  if (timeString.length === 8 && timeString.includes(":")) {
    const parts = timeString.split(":");
    if (parts.length === 3) {
      const hours = parseInt(parts[0] || "0", 10);
      const minutes = parseInt(parts[1] || "0", 10);
      const seconds = parseInt(parts[2] || "0", 10);

      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else {
        return `${minutes}m ${seconds}s`;
      }
    }
  }

  // Fallback to original string if format is not recognized
  return timeString;
};

/**
 * Formats a time string in HH:MM:SS format to HH:MM format (truncates seconds)
 * @param timeString - Time string in HH:MM:SS format
 * @returns Time string in HH:MM format
 */
export const formatTimeToHHMM = (
  timeString: string | null | undefined
): string => {
  if (!timeString) return "--:--";

  // If already in HH:MM format, return as is
  if (timeString.length === 5 && timeString.includes(":")) {
    return timeString;
  }

  // If in HH:MM:SS format, truncate seconds
  if (timeString.length === 8 && timeString.includes(":")) {
    return timeString.slice(0, 5);
  }

  return timeString;
};

/**
 * Converts time string in HH:MM:SS format to total seconds
 * @param timeString - Time string in HH:MM:SS format
 * @returns Total seconds
 */
export const timeStringToSeconds = (
  timeString: string | null | undefined
): number => {
  if (!timeString) return 0;

  if (timeString.length === 8 && timeString.includes(":")) {
    const parts = timeString.split(":");
    if (parts.length === 3) {
      const hours = parseInt(parts[0] || "0", 10);
      const minutes = parseInt(parts[1] || "0", 10);
      const seconds = parseInt(parts[2] || "0", 10);
      return hours * 3600 + minutes * 60 + seconds;
    }
  }

  return 0;
};

/**
 * Converts seconds to HH:MM:SS format
 * @param seconds - Total seconds
 * @returns Time string in HH:MM:SS format
 */
export const secondsToHHMMSS = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
};
