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
 * Tracks QR promo landings once, then strips UTM params from the URL.
 *
 * Example QR url:
 * https://summitstracker.com/?utm_source=qr&utm_medium=poster&utm_campaign=catalunya2026
 *
 * - Must be mounted inside a <BrowserRouter> (uses location + navigate).
 * - Cleans utm_* via navigate(replace) so back button stays clean and
 *   the URL can't be re-counted / re-shared with campaign params.
 * - Fires trackEvent("qr_scan", campaign) mobile-only, once per campaign
 *   per tab (sessionStorage), after the analytics session is ready.
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
      const parsed = JSON.parse(raw) as { campaign?: string };
      const campaign = sanitizeCampaign(parsed.campaign ?? null);

      if (sessionStorage.getItem(`qr_scan:${campaign}`)) {
        sessionStorage.removeItem(PENDING_KEY);
        return;
      }

      firedRef.current = true;
      sessionStorage.setItem(`qr_scan:${campaign}`, "1");
      sessionStorage.removeItem(PENDING_KEY);
      void trackEvent("qr_scan", campaign);
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
    }
  }, [isMobile, isInitialized, sessionId, trackEvent]);
}
