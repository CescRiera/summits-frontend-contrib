import { useCallback } from "react";
import { useUnitSystem } from "../context/UnitSystemContext";
import {
  formatDistance,
  formatDistanceValue,
  formatMeters,
  formatMetersValue,
  formatElevationGain,
  formatStatDistance,
  formatStatElevationGain,
} from "../../mobile/utils/numberFormatting";
import type { UnitSystem } from "../../mobile/utils/numberFormatting";
import {
  getDistanceUnit,
  getElevationUnit,
  getSpeedUnit,
  getTempUnit,
  getPrecipUnit,
  getSnowUnit,
  kmToMi,
  mToFt,
  kmhToMph,
  celsiusToFahrenheit,
  mmToIn,
  cmToIn,
} from "../utils/unitConversions";

export interface UnitFormatters {
  /** Current unit system */
  unitSystem: UnitSystem;
  /** Format a km distance with unit suffix, e.g. "12,5 km" / "7,77 mi" */
  formatDistance: (km: number | null | undefined) => string;
  /** Format a km distance value without unit suffix */
  formatDistanceValue: (km: number | null | undefined) => string;
  /** Format a meter value with compact suffix, e.g. "1200m" / "3937ft" */
  formatMeters: (meters: number | null | undefined) => string;
  /** Format a meter value without unit suffix */
  formatMetersValue: (meters: number | null | undefined) => string;
  /** Format elevation gain with spaced unit, e.g. "1 200 m" / "3 937 ft" */
  formatElevationGain: (meters: number | null | undefined) => string;
  /** Format a stat-style distance with digit grouping */
  formatStatDistance: (km: number | string | null | undefined) => string;
  /** Format a stat-style elevation gain with digit grouping */
  formatStatElevationGain: (meters: number | string | null | undefined) => string;

  /** Raw conversion helpers */
  convertDistance: (km: number) => number;
  convertElevation: (meters: number) => number;
  convertSpeed: (kmh: number) => number;
  convertTemp: (celsius: number) => number;
  convertPrecip: (mm: number) => number;
  convertSnow: (cm: number) => number;

  /** Current unit labels */
  distanceUnit: string;
  elevationUnit: string;
  speedUnit: string;
  tempUnit: string;
  precipUnit: string;
  snowUnit: string;
}

/**
 * Hook that wraps all formatting functions with the current unit system.
 * Components use this instead of importing formatters directly.
 */
export function useUnitFormat(): UnitFormatters {
  const { unitSystem } = useUnitSystem();

  const fmtDistance = useCallback(
    (km: number | null | undefined) => formatDistance(km, unitSystem),
    [unitSystem]
  );

  const fmtDistanceValue = useCallback(
    (km: number | null | undefined) => formatDistanceValue(km, unitSystem),
    [unitSystem]
  );

  const fmtMeters = useCallback(
    (meters: number | null | undefined) => formatMeters(meters, unitSystem),
    [unitSystem]
  );

  const fmtMetersValue = useCallback(
    (meters: number | null | undefined) =>
      formatMetersValue(meters, unitSystem),
    [unitSystem]
  );

  const fmtElevationGain = useCallback(
    (meters: number | null | undefined) =>
      formatElevationGain(meters, unitSystem),
    [unitSystem]
  );

  const fmtStatDistance = useCallback(
    (km: number | string | null | undefined) =>
      formatStatDistance(km, unitSystem),
    [unitSystem]
  );

  const fmtStatElevationGain = useCallback(
    (meters: number | string | null | undefined) =>
      formatStatElevationGain(meters, unitSystem),
    [unitSystem]
  );

  const convertDistance = useCallback(
    (km: number) => (unitSystem === "imperial" ? kmToMi(km) : km),
    [unitSystem]
  );

  const convertElevation = useCallback(
    (meters: number) => (unitSystem === "imperial" ? mToFt(meters) : meters),
    [unitSystem]
  );

  const convertSpeed = useCallback(
    (kmh: number) => (unitSystem === "imperial" ? kmhToMph(kmh) : kmh),
    [unitSystem]
  );

  const convertTemp = useCallback(
    (celsius: number) =>
      unitSystem === "imperial" ? celsiusToFahrenheit(celsius) : celsius,
    [unitSystem]
  );

  const convertPrecip = useCallback(
    (mm: number) => (unitSystem === "imperial" ? mmToIn(mm) : mm),
    [unitSystem]
  );

  const convertSnow = useCallback(
    (cm: number) => (unitSystem === "imperial" ? cmToIn(cm) : cm),
    [unitSystem]
  );

  return {
    unitSystem,
    formatDistance: fmtDistance,
    formatDistanceValue: fmtDistanceValue,
    formatMeters: fmtMeters,
    formatMetersValue: fmtMetersValue,
    formatElevationGain: fmtElevationGain,
    formatStatDistance: fmtStatDistance,
    formatStatElevationGain: fmtStatElevationGain,
    convertDistance,
    convertElevation,
    convertSpeed,
    convertTemp,
    convertPrecip,
    convertSnow,
    distanceUnit: getDistanceUnit(unitSystem),
    elevationUnit: getElevationUnit(unitSystem),
    speedUnit: getSpeedUnit(unitSystem),
    tempUnit: getTempUnit(unitSystem),
    precipUnit: getPrecipUnit(unitSystem),
    snowUnit: getSnowUnit(unitSystem),
  };
}
