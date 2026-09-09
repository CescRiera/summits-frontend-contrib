import { useCallback } from "react";
import { useAnalytics } from "../context/AnalyticsContext";

export type PeakDetailsAnalyticsVariant =
  | "mobile"
  | "desktop"
  | "desktop_map";

const PREFIX_BY_VARIANT: Record<PeakDetailsAnalyticsVariant, string> = {
  mobile: "peak_details",
  desktop: "peak_details_desktop",
  desktop_map: "peak_details_desktop_map",
};

const sanitizeAnalyticsToken = (
  value: string | number | boolean | null | undefined
) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const buildPeakDetailsEventValue = (
  variant: PeakDetailsAnalyticsVariant,
  section: string,
  action: string,
  ...details: Array<string | number | boolean | null | undefined>
) =>
  [PREFIX_BY_VARIANT[variant], section, action, ...details]
    .map(sanitizeAnalyticsToken)
    .filter(Boolean)
    .join("_");

export function usePeakDetailsAnalytics(
  variant: PeakDetailsAnalyticsVariant,
  section: string,
  peakId?: number | null
) {
  const { trackEvent } = useAnalytics();

  const trackSectionEvent = useCallback(
    (
      type: string,
      action: string,
      ...details: Array<string | number | boolean | null | undefined>
    ) =>
      trackEvent(
        type,
        buildPeakDetailsEventValue(variant, section, action, ...details, peakId)
      ),
    [peakId, section, trackEvent, variant]
  );

  return { trackSectionEvent };
}

export function usePeakDetailsView(
  variant: PeakDetailsAnalyticsVariant,
  section: string,
  enabled = true,
  peakId?: number | null
) {
  // Peak details analytics should only reflect explicit user interactions,
  // not passive renders/section visibility.
  void variant;
  void section;
  void enabled;
  void peakId;
}
