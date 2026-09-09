import type { AdminHierarchy } from "../api/types/common";

/**
 * Extract a human-readable location string from an admin_hierarchy object.
 * Returns the most specific levels first: e.g. "Aragon, Spain"
 */
export function getLocationFromHierarchy(
  adminHierarchy?: AdminHierarchy | null
): string {
  if (adminHierarchy && Object.keys(adminHierarchy).length > 0) {
    // Get all admin levels present, sorted from most general (lowest number) to most specific
    const allLevels = Object.entries(adminHierarchy).sort(
      ([levelA], [levelB]) => Number(levelA) - Number(levelB)
    );

    if (allLevels.length === 0) return "";

    // Take the most general (highest) and most specific (lowest) levels
    const selectedLevels = (allLevels.length > 1 
      ? [allLevels[0], allLevels[allLevels.length - 1]] 
      : [allLevels[0]]).filter((l): l is [string, any] => !!l);

    return selectedLevels
      .map(([, entry]) => {
        if (typeof entry === "string") return entry;
        return (entry as any).name || "";
      })
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

/**
 * Extract a full location string showing all admin levels.
 * Useful for desktop where there is more space to display.
 * Returns e.g. "Spain, Aragon, Huesca"
 */
export function getFullLocationFromHierarchy(
  adminHierarchy?: AdminHierarchy | null
): string {
  if (adminHierarchy && Object.keys(adminHierarchy).length > 0) {
    const allLevels = Object.entries(adminHierarchy).sort(
      ([levelA], [levelB]) => Number(levelA) - Number(levelB)
    );

    if (allLevels.length === 0) return "";

    return allLevels
      .map(([, entry]) => {
        if (typeof entry === "string") return entry;
        return (entry as any).name || "";
      })
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

/**
 * Get country name from admin_hierarchy (level 2).
 */
export function getCountryFromHierarchy(
  adminHierarchy?: AdminHierarchy | null
): string {
  if (adminHierarchy) {
    const country = adminHierarchy["2"];
    if (country) return country.name;
  }
  return "";
}

/**
 * Get region name from admin_hierarchy (level 4).
 */
export function getRegionFromHierarchy(
  adminHierarchy?: AdminHierarchy | null
): string {
  if (adminHierarchy) {
    const region = adminHierarchy["4"];
    if (region) return region.name;
  }
  return "";
}
