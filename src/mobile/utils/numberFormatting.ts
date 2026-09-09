import type { UnitSystem } from "../../shared/utils/unitConversions";
import { kmToMi, mToFt } from "../../shared/utils/unitConversions";

export type { UnitSystem } from "../../shared/utils/unitConversions";

/**
 * Formats numbers to a maximum of 4 digits with appropriate abbreviations
 * Examples:
 * - 15.10 -> "15.1"
 * - 158.15 -> "158.2"
 * - 1185.85 -> "1186"
 * - 12500 -> "12.5k"
 * - 1250000 -> "1.25M"
 */

export function formatSmartNumber(
  value: number | null | undefined,
  unit: string = ""
): string {
  // Handle null or undefined values
  if (value === null || value === undefined) {
    return `--${unit}`;
  }

  const absValue = Math.abs(value);

  // Handle very small numbers
  if (absValue < 0.01) {
    return `${value.toFixed(3)}${unit}`;
  }

  // Handle numbers less than 1000
  if (absValue < 1000) {
    // For numbers with decimals, limit to 1 decimal place if needed
    if (absValue % 1 !== 0) {
      const rounded = Math.round(absValue * 10) / 10;
      return `${rounded}${unit}`;
    }
    return `${Math.round(absValue)}${unit}`;
  }

  // Handle thousands (1k - 999k)
  if (absValue < 1000000) {
    const thousands = absValue / 1000;
    if (thousands < 10) {
      // For numbers like 1.25k, show 1 decimal place
      return `${Math.round(thousands * 10) / 10}k${unit}`;
    } else {
      // For numbers like 125k, show no decimal places
      return `${Math.round(thousands)}k${unit}`;
    }
  }

  // Handle millions (1M+)
  const millions = absValue / 1000000;
  if (millions < 10) {
    return `${Math.round(millions * 10) / 10}M${unit}`;
  } else {
    return `${Math.round(millions)}M${unit}`;
  }
}

const trimTrailingZeros = (value: string): string =>
  value.replace(/0+$/, "").replace(/[.,]$/, "");

const formatRoundedNumber = (
  value: number,
  decimalPlaces: number,
  decimalSeparator: "." | "," = ","
): string => {
  const rounded = value.toFixed(decimalPlaces);
  const normalized =
    decimalSeparator === "," ? rounded.replace(".", ",") : rounded;

  return decimalPlaces > 0 ? trimTrailingZeros(normalized) : normalized;
};

const DIGIT_GROUP_SEPARATOR = "\u202F";

const toFiniteNumber = (
  value: number | string | null | undefined
): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string" && value.trim() === "") {
    return null;
  }

  const numericValue =
    typeof value === "number" ? value : Number(value.replace(",", "."));

  return Number.isFinite(numericValue) ? numericValue : null;
};

const groupDigits = (value: string): string => {
  const sign = value.startsWith("-") ? "-" : "";
  const unsignedValue = sign ? value.slice(1) : value;
  const decimalSeparatorIndex = unsignedValue.search(/[.,]/);
  const integerPart =
    decimalSeparatorIndex === -1
      ? unsignedValue
      : unsignedValue.slice(0, decimalSeparatorIndex);
  const fractionalPart =
    decimalSeparatorIndex === -1
      ? ""
      : unsignedValue.slice(decimalSeparatorIndex);

  return `${sign}${integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    DIGIT_GROUP_SEPARATOR
  )}${fractionalPart}`;
};

export function formatDistanceValue(
  km: number | null | undefined,
  unitSystem: UnitSystem = "metric"
): string {
  if (km === null || km === undefined) {
    return "--";
  }

  const converted = unitSystem === "imperial" ? kmToMi(km) : km;
  const sign = converted < 0 ? "-" : "";
  const absValue = Math.abs(converted);
  const integerDigits = Math.max(1, Math.floor(absValue).toString().length);
  const decimalPlaces = integerDigits >= 4 ? 0 : Math.min(2, 4 - integerDigits);

  return `${sign}${formatRoundedNumber(absValue, decimalPlaces)}`;
}

/**
 * Formats distance values specifically for km
 * Never abbreviates to k/M and keeps the integer part fully visible.
 * Uses up to 4 visible digits when decimals are shown.
 * Examples:
 * - 1.534 -> "1,53 km"
 * - 11.52 -> "11,52 km"
 * - 111.52 -> "111,5 km"
 * - 1111.5 -> "1112 km"
 * - 10000 -> "10000 km"
 */
export function formatDistance(
  km: number | null | undefined,
  unitSystem: UnitSystem = "metric"
): string {
  const unit = unitSystem === "imperial" ? "mi" : "km";
  if (km === null || km === undefined) {
    return `--${unit}`;
  }

  return `${formatDistanceValue(km, unitSystem)} ${unit}`;
}

/**
 * Formats meter values without abbreviation.
 */
export function formatMeters(
  meters: number | null | undefined,
  unitSystem: UnitSystem = "metric"
): string {
  const unit = unitSystem === "imperial" ? "ft" : "m";
  if (meters === null || meters === undefined) {
    return `--${unit}`;
  }

  return `${formatMetersValue(meters, unitSystem)}${unit}`;
}

export function formatMetersValue(
  meters: number | null | undefined,
  unitSystem: UnitSystem = "metric"
): string {
  if (meters === null || meters === undefined) {
    return "--";
  }

  const converted = unitSystem === "imperial" ? mToFt(meters) : meters;
  const sign = converted < 0 ? "-" : "";
  const absValue = Math.abs(converted);

  return `${sign}${Math.round(absValue)}`;
}

/**
 * Formats elevation gain values for stats and route UIs.
 */
export function formatElevationGain(
  meters: number | null | undefined,
  unitSystem: UnitSystem = "metric"
): string {
  const unit = unitSystem === "imperial" ? "ft" : "m";
  if (meters === null || meters === undefined) {
    return `-- ${unit}`;
  }

  return `${formatMetersValue(meters, unitSystem)} ${unit}`;
}

export function formatStatInteger(
  value: number | string | null | undefined
): string {
  const numericValue = toFiniteNumber(value);

  if (numericValue === null) {
    return "--";
  }

  return groupDigits(Math.round(numericValue).toString());
}

export function formatStatDistance(
  km: number | string | null | undefined,
  unitSystem: UnitSystem = "metric"
): string {
  const numericValue = toFiniteNumber(km);
  const unit = unitSystem === "imperial" ? "mi" : "km";

  if (numericValue === null) {
    return `--${unit}`;
  }

  return `${groupDigits(formatDistanceValue(numericValue, unitSystem))} ${unit}`;
}

export function formatStatElevationGain(
  meters: number | string | null | undefined,
  unitSystem: UnitSystem = "metric"
): string {
  const numericValue = toFiniteNumber(meters);
  const unit = unitSystem === "imperial" ? "ft" : "m";

  if (numericValue === null) {
    return `-- ${unit}`;
  }

  return `${groupDigits(formatMetersValue(numericValue, unitSystem))} ${unit}`;
}

export function formatStatDuration(
  seconds: number | string | null | undefined,
  maxParts: 1 | 2 = 2
): string {
  const numericValue = toFiniteNumber(seconds);

  if (numericValue === null || numericValue <= 0) {
    return "0m";
  }

  let remainingSeconds = Math.floor(numericValue);
  const units = [
    { label: "y", seconds: 365 * 24 * 60 * 60 },
    { label: "d", seconds: 24 * 60 * 60 },
    { label: "h", seconds: 60 * 60 },
    { label: "m", seconds: 60 },
    { label: "s", seconds: 1 },
  ] as const;
  const parts: string[] = [];

  for (const unit of units) {
    if (remainingSeconds < unit.seconds) {
      continue;
    }

    const count = Math.floor(remainingSeconds / unit.seconds);
    parts.push(`${formatStatInteger(count)}${unit.label}`);
    remainingSeconds -= count * unit.seconds;

    if (parts.length >= maxParts) {
      break;
    }
  }

  return parts.join(" ") || "0m";
}

/**
 * Formats time values to be more compact
 * Converts HH:MM:SS to a more compact format
 */
export function formatCompactTime(timeString: string | null | undefined): string {
  // Handle null, undefined, or empty values
  if (timeString === null || timeString === undefined || timeString === "") {
    return "—";
  }

  const parts = timeString.split(":");
  const hours = parseInt(parts[0] || "0", 10);
  const minutes = parseInt(parts[1] || "0", 10);
  const seconds = parseInt(parts[2] || "0", 10);

  // If less than 1 hour, show minutes
  if (hours === 0) {
    if (minutes === 0) {
      return `${seconds}s`;
    }
    return `${minutes}m`;
  }

  // If less than 24 hours, show hours and minutes
  if (hours < 24) {
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }

  // For very long times, show days
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days}d`;
  }

  return `${days}d ${remainingHours}h`;
}
