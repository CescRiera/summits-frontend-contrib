import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAnalytics } from "../context/AnalyticsContext";
import { useMobileDetection } from "./useMobileDetection";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

const PENDING_KEY = "pending_qr_scan";

const sanitizeCampaign = (value: string | null): string =>
  (value ?? "unknown").trim().slice(0, 100) || "unknown";

/**
 * Coarse, permission-free location signals. No GPS prompt:
 * - tz e.g. "Europe/Madrid" (~country/region level)
 * - locale e.g. "ca-ES" (language-region hint)
 * Precise coords via navigator.geolocation would pop a permission
 * dialog on landing, so deliberately not used here.
 */
const getCoarseLocation = (): { tz: string; locale: string } => {
  let tz = "unknown";
  let locale = "unknown";
  try {
    tz =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    tz = "unknown";
  }
  try {
    locale =
      (typeof navigator !== "undefined" &&
        (navigator.language ||
          (navigator as Navigator & { userLanguage?: string })
            .userLanguage)) ||
      "unknown";
  } catch {
    locale = "unknown";
  }
  return { tz: tz.slice(0, 100), locale: locale.slice(0, 20) };
};

/**
 * Tracks QR promo landings once, then strips UTM params from the URL.
 *
 * Example QR url:
 * https://summitstracker.com/?utm_source=qr&utm_medium=poster&utm_campaign=catalunya2026
 *
 * - Must be mounted inside a <BrowserRouter> (uses location + navigate).
 * - Cleans utm_* via navigate(replace) so back button stays clean and
 *   the URL can't be re-counted / re-shared with campaign params.
 * - Fires trackEvent("qr_scan", value) mobile-only, once per campaign
 *   per tab (sessionStorage), after the analytics session is ready.
 *   value is JSON: {campaign, medium, tz, locale} — tz/locale give a
 *   coarse country hint with no permission prompt.
 */
export function useQrScanTracking() {
  const location = useLocation();
  const navigate = useNavigate();
  const { trackEvent, isInitialized, sessionId } = useAnalytics();
  const isMobile = useMobileDetection();
  const firedRef = useRef(false);

  // Phase 1: capture campaign + clean URL immediately (both platforms).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("utm_source") !== "qr") return;

    const campaign = sanitizeCampaign(params.get("utm_campaign"));

    if (!sessionStorage.getItem(`qr_scan:${campaign}`)) {
      sessionStorage.setItem(
        PENDING_KEY,
        JSON.stringify({
          campaign,
          medium: params.get("utm_medium") ?? "unknown",
        })
      );
    }

    const next = new URLSearchParams(params);
    UTM_KEYS.forEach((k) => next.delete(k));
    const qs = next.toString();
    navigate(
      `${location.pathname}${qs ? `?${qs}` : ""}${location.hash}`,
      { replace: true }
    );
    // Run only when the query string changes (landing / new scan).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Phase 2: fire the event once the analytics session exists (mobile only).
  useEffect(() => {
    if (!isMobile || !isInitialized || !sessionId || firedRef.current) return;

    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as { campaign?: string; medium?: string };
      const campaign = sanitizeCampaign(parsed.campaign ?? null);
      const medium = sanitizeCampaign(parsed.medium ?? null);

      if (sessionStorage.getItem(`qr_scan:${campaign}`)) {
        sessionStorage.removeItem(PENDING_KEY);
        return;
      }

      firedRef.current = true;
      sessionStorage.setItem(`qr_scan:${campaign}`, "1");
      sessionStorage.removeItem(PENDING_KEY);
      const { tz, locale } = getCoarseLocation();
      void trackEvent(
        "qr_scan",
        JSON.stringify({ campaign, medium, tz, locale })
      );
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
    }
  }, [isMobile, isInitialized, sessionId, trackEvent]);
}
