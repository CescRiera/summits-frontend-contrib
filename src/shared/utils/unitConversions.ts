/**
 * Unit conversion utilities for metric ↔ imperial system.
 * All API data is stored in metric; these are display-only conversions.
 */

export type UnitSystem = "metric" | "imperial";

// ── Distance ────────────────────────────────────────────────────────
export const kmToMi = (km: number): number => km * 0.621371;
export const miToKm = (mi: number): number => mi / 0.621371;

// ── Elevation / altitude ────────────────────────────────────────────
export const mToFt = (m: number): number => m * 3.28084;
export const ftToM = (ft: number): number => ft / 3.28084;

// ── Speed ───────────────────────────────────────────────────────────
export const kmhToMph = (kmh: number): number => kmh * 0.621371;

// ── Temperature ─────────────────────────────────────────────────────
export const celsiusToFahrenheit = (c: number): number => c * 9 / 5 + 32;

// ── Precipitation / snow ────────────────────────────────────────────
export const mmToIn = (mm: number): number => mm * 0.0393701;
export const cmToIn = (cm: number): number => cm * 0.393701;

// ── Unit labels ─────────────────────────────────────────────────────
export const getDistanceUnit = (s: UnitSystem): string =>
  s === "imperial" ? "mi" : "km";

export const getElevationUnit = (s: UnitSystem): string =>
  s === "imperial" ? "ft" : "m";

export const getSpeedUnit = (s: UnitSystem): string =>
  s === "imperial" ? "mph" : "km/h";

export const getTempUnit = (s: UnitSystem): string =>
  s === "imperial" ? "°F" : "°C";

export const getPrecipUnit = (s: UnitSystem): string =>
  s === "imperial" ? "in" : "mm";

export const getSnowUnit = (s: UnitSystem): string =>
  s === "imperial" ? "in" : "cm";
