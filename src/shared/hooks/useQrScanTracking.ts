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
 * General-area coordinates (~11km grid), never triggering a permission
 * prompt on landing:
 * 1. GPS, but ONLY if permission was already granted elsewhere in the
 *    app (map geolocate). Otherwise skipped — no dialog is ever shown.
 * 2. IP-based lookup fallback (city-level accuracy, no permission needed).
 * Coords are rounded to 1 decimal so the value holds an area, not a point.
 */
interface CoarseCoords {
  lat: number;
  lon: number;
  geo_src: "gps" | "ip";
  country?: string;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

const getPositionIfPermitted = (): Promise<CoarseCoords | null> =>
  new Promise((resolve) => {
    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.geolocation ||
        !navigator.permissions?.query
      ) {
        resolve(null);
        return;
      }
      let settled = false;
      const done = (v: CoarseCoords | null) => {
        if (!settled) {
          settled = true;
          resolve(v);
        }
      };
      const timer = window.setTimeout(() => done(null), 5000);
      navigator.permissions
        .query({
          name: "geolocation" as PermissionName,
        })
        .then((status) => {
          // Never prompt from a promo landing — only reuse a prior grant.
          if (status.state !== "granted") {
            window.clearTimeout(timer);
            done(null);
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              window.clearTimeout(timer);
              const { latitude, longitude } = pos.coords;
              if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                done(null);
                return;
              }
              done({ lat: round1(latitude), lon: round1(longitude), geo_src: "gps" });
            },
            () => {
              window.clearTimeout(timer);
              done(null);
            },
            { maximumAge: 3600000, timeout: 4500 }
          );
        })
        .catch(() => {
          window.clearTimeout(timer);
          done(null);
        });
    } catch {
      resolve(null);
    }
  });

const getCoordsFromIp = async (): Promise<CoarseCoords | null> => {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      "https://ipwho.is/?fields=success,country,latitude,longitude",
      { signal: controller.signal }
    );
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      country?: string;
      latitude?: number;
      longitude?: number;
    };
    if (
      data.success !== true ||
      !Number.isFinite(data.latitude) ||
      !Number.isFinite(data.longitude)
    ) {
      return null;
    }
    return {
      lat: round1(data.latitude as number),
      lon: round1(data.longitude as number),
      geo_src: "ip",
      ...(typeof data.country === "string" && data.country
        ? { country: data.country.slice(0, 100) }
        : {}),
    };
  } catch {
    return null;
  }
};

const getCoarseCoords = async (): Promise<CoarseCoords | null> =>
  (await getPositionIfPermitted()) ?? (await getCoordsFromIp());

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
 *   value is JSON: {campaign, medium, lat, lon, geo_src, country?} —
 *   coords rounded to ~11km so it's an area, never a precise point,
 *   and no permission dialog is ever triggered.
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

    let campaign: string;
    let medium: string;
    try {
      const parsed = JSON.parse(raw) as { campaign?: string; medium?: string };
      campaign = sanitizeCampaign(parsed.campaign ?? null);
      medium = sanitizeCampaign(parsed.medium ?? null);
    } catch {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }

    if (sessionStorage.getItem(`qr_scan:${campaign}`)) {
      sessionStorage.removeItem(PENDING_KEY);
      return;
    }

    firedRef.current = true;
    let cancelled = false;

    void (async () => {
      const coords = await getCoarseCoords();
      if (cancelled) return;
      sessionStorage.setItem(`qr_scan:${campaign}`, "1");
      sessionStorage.removeItem(PENDING_KEY);
      void trackEvent(
        "qr_scan",
        JSON.stringify({
          campaign,
          medium,
          ...(coords ?? { lat: null, lon: null, geo_src: "unknown" }),
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [isMobile, isInitialized, sessionId, trackEvent]);
}
