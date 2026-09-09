import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./shared/App.css";
import { AuthProvider } from "./shared/context/AuthContext";
import { I18nProvider } from "./shared/context/I18nContext";
import { UnitSystemProvider } from "./shared/context/UnitSystemContext";
import { AnalyticsProvider } from "./shared/context/AnalyticsContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthLoadingScreen from "./shared/components/AuthLoadingScreen";
import ErrorBoundary from "./shared/components/ErrorBoundary/ErrorBoundary";
import { Capacitor } from "@capacitor/core";
import { useMobileDetection } from "./shared/hooks/useMobileDetection";
import { initializeCapacitorSafeArea } from "./shared/utils/capacitorSafeArea";
import { initializeCapacitorPushNotifications } from "./shared/utils/capacitorPushNotifications";
import { perfMark, perfMemorySnapshot } from "./shared/utils/perfLog";

declare const __CAPACITOR_BUILD__: boolean;

declare global {
  interface Window {
    addEventListener(
      type: "vite:preloadError",
      listener: (this: Window, ev: Event & { payload?: Error }) => unknown,
      options?: boolean | AddEventListenerOptions
    ): void;
  }
}

const isCapacitorNative = typeof Capacitor !== "undefined" && Capacitor.isNativePlatform();

// Recover from stale deployment hashes (old HTML referencing deleted assets)
// or transient network failures: reload once to get a fresh index.html.
// Vite only throws when the event is NOT prevented, so preventDefault + reload
// cleanly recovers instead of hard-crashing the app.
//
// On native builds (Capacitor) all assets are bundled locally — preload errors
// there are never caused by stale deployments, so we skip the reload.
// When offline, chunk preloads also fail but reloading won't help — it would
// just restart the same failures in an infinite loop.  A per-session counter
// ensures we never reload more than once even on web (stale hash case).
{
  let preloadReloads = 0;
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();

    // Native builds: all code is bundled — nothing to reload for.
    if (isCapacitorNative) {
      console.warn(
        "[App] Chunk/CSS preload failed on native build (non-fatal):",
        event.payload
      );
      return;
    }

    // Offline: reloading won't fix missing network.
    if (!navigator.onLine) {
      console.warn(
        "[App] Chunk/CSS preload failed while offline (non-fatal):",
        event.payload
      );
      return;
    }

    // Online stale-hash / transient failure: reload at most once per session.
    if (preloadReloads > 0) {
      console.warn(
        "[App] Chunk/CSS preload failed again after reload (non-fatal):",
        event.payload
      );
      return;
    }
    preloadReloads++;
    console.warn(
      "[App] Chunk/CSS preload failed (stale build or network). Reloading...",
      event.payload
    );
    window.location.reload();
  });
}
const queryClient = new QueryClient();

const MobileApp = lazy(() => import("./mobile/MobileApp"));
const DesktopApp = __CAPACITOR_BUILD__
  ? null
  : lazy(() => import("./desktop/DesktopApp"));

perfMark("module-load");
perfMemorySnapshot("after-module-imports");

initializeCapacitorSafeArea();

if (isCapacitorNative) {
  initializeCapacitorPushNotifications().catch((error) => {
    console.error("Failed to initialize push notifications:", error);
  });
}

perfMark("before-react-render");

function App() {
  const isMobile = useMobileDetection();

  if (isMobile === null) {
    perfMark("mobile-detection-pending");
    return null;
  }

  perfMark(`mobile-detection-result: ${isMobile ? "MOBILE" : "DESKTOP"}`);

  if (isMobile) {
    return (
      <Suspense fallback={null}>
        <MobileApp />
      </Suspense>
    );
  }

  if (!DesktopApp) return null;

    return (
    <Suspense fallback={null}>
      <DesktopApp />
    </Suspense>
  );
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <UnitSystemProvider>
          <AuthProvider>
            <AnalyticsProvider>
              <AuthLoadingScreen>
                <App />
              </AuthLoadingScreen>
            </AnalyticsProvider>
          </AuthProvider>
        </UnitSystemProvider>
      </I18nProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

perfMark("react-render-scheduled");
perfMemorySnapshot("after-react-render");

if (isCapacitorNative) {
  // The native builds do not ship a service worker (see vite.config.ts), but
  // older installs may still have a stale one registered from a web/PWA build.
  // Unregister it so it can never serve outdated assets (stale-hash crashes).
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      })
      .catch((error) => {
        console.warn("[App] Failed to unregister stale service worker:", error);
      });
  }
  let memSamples = 0;
  const memInterval = setInterval(() => {
    memSamples++;
    const m = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (m) {
      const usedMB = +(m.usedJSHeapSize / 1048576).toFixed(1);
      const limitMB = +(m.jsHeapSizeLimit / 1048576).toFixed(1);
      console.log(`[Perf] MEM #${memSamples}: ${usedMB}MB / ${limitMB}MB`);
    }
    if (memSamples >= 30) clearInterval(memInterval);
  }, 2000);
}
