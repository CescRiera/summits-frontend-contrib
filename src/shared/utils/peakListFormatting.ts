export const toDateTimeLocalValue = (iso?: string | null): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffsetMs = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - tzOffsetMs);
  return localDate.toISOString().slice(0, 16);
};

export const toIsoFromDateTimeLocal = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export const formatDateShort = (
  iso?: string | null,
  locale?: string
): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale || undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDurationHours = (seconds?: number | null): string | null => {
  if (!seconds || seconds <= 0) return null;
  const hours = seconds / 3600;
  const display = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
  return `${display}h`;
};

export type DurationUnitLabels = {
  year: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

export const formatDurationCompact = (
  seconds?: number | null,
  labels?: Partial<DurationUnitLabels>
): string | null => {
  if (!seconds || seconds <= 0) return null;
  const totalSeconds = Math.floor(seconds);
  const merged: DurationUnitLabels = {
    year: "y",
    day: "d",
    hour: "h",
    minute: "m",
    second: "s",
    ...labels,
  };
  const units = [
    { label: merged.year, value: 31536000 },
    { label: merged.day, value: 86400 },
    { label: merged.hour, value: 3600 },
    { label: merged.minute, value: 60 },
    { label: merged.second, value: 1 },
  ];
  let remaining = totalSeconds;
  const parts: string[] = [];

  for (const unit of units) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / unit.value);
    if (count > 0) {
      parts.push(`${count}${unit.label}`);
      remaining -= count * unit.value;
    }
    if (parts.length === 2) break;
  }

  return parts.length > 0 ? parts.join(" ") : null;
};

export const formatDurationLong = (
  seconds?: number | null,
  locale?: string,
  labels?: Partial<DurationUnitLabels>,
  maxParts: number = 2
): string | null => {
  if (!seconds || seconds <= 0) return null;
  const totalSeconds = Math.floor(seconds);
  const merged: DurationUnitLabels = {
    year: "y",
    day: "d",
    hour: "h",
    minute: "m",
    second: "s",
    ...labels,
  };
  const units = [
    { unit: "year" as const, value: 31536000 },
    { unit: "day" as const, value: 86400 },
    { unit: "hour" as const, value: 3600 },
    { unit: "minute" as const, value: 60 },
    { unit: "second" as const, value: 1 },
  ];
  const parts: string[] = [];
  let remaining = totalSeconds;

  const formatUnit = (count: number, unit: "year" | "day" | "hour" | "minute" | "second") => {
    if (typeof Intl !== "undefined" && typeof Intl.NumberFormat === "function") {
      try {
        return new Intl.NumberFormat(locale || undefined, {
          style: "unit",
          unit,
          unitDisplay: "long",
        }).format(count);
      } catch {
        // Fall through to short labels
      }
    }
    return `${count}${merged[unit]}`;
  };

  for (const unit of units) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / unit.value);
    if (count > 0) {
      parts.push(formatUnit(count, unit.unit));
      remaining -= count * unit.value;
    }
    if (parts.length === maxParts) break;
  }

  return parts.length > 0 ? parts.join(" ") : null;
};

export const toDurationHoursInputValue = (
  seconds?: number | null
): string => {
  if (!seconds || seconds <= 0) return "";
  const hours = seconds / 3600;
  if (Number.isInteger(hours)) return hours.toString();
  return Number(hours.toFixed(2)).toString();
};

export const toDurationSecondsFromHoursInput = (
  value: string
): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const hours = Number(trimmed);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return Math.round(hours * 3600);
};
