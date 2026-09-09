import type L from "leaflet";

const REFRESH_DELAYS_MS = [120, 320];
const DEFAULT_PREVIEW_ZOOM = 11;

type MapRef = {
  current: L.Map | null;
};

type PreviewCoordinates = {
  coordinates?: [number, number][];
};

type PreviewPeak = {
  lat?: number | null;
  lng?: number | null;
};

export const getLeafletPreviewInitialView = (
  coordinates?: PreviewCoordinates | null,
  peaks?: PreviewPeak[] | null
) => {
  const firstCoordinate = coordinates?.coordinates?.[0];

  if (firstCoordinate) {
    return {
      center: [firstCoordinate[1], firstCoordinate[0]] as [number, number],
      zoom: DEFAULT_PREVIEW_ZOOM,
    };
  }

  const firstPeak = peaks?.find(
    (peak): peak is { lat: number; lng: number } =>
      peak.lat != null && peak.lng != null
  );

  if (!firstPeak) {
    return null;
  }

  return {
    center: [firstPeak.lat, firstPeak.lng] as [number, number],
    zoom: DEFAULT_PREVIEW_ZOOM,
  };
};

export const hasLeafletPreviewSize = (
  container: HTMLElement | null
): container is HTMLElement => {
  if (!container) {
    return false;
  }

  const { width, height } = container.getBoundingClientRect();
  return width > 0 && height > 0;
};

export const waitForLeafletPreviewContainer = (
  container: HTMLElement,
  onReady: () => void
): (() => void) => {
  if (hasLeafletPreviewSize(container)) {
    onReady();
    return () => {};
  }

  let isActive = true;
  let frameId: number | null = null;
  let timeoutId: number | null = null;

  const tryReady = () => {
    if (!isActive || !hasLeafletPreviewSize(container)) {
      return;
    }

    cleanup();
    onReady();
  };

  const resizeObserver =
    typeof window !== "undefined" && "ResizeObserver" in window
      ? new ResizeObserver(tryReady)
      : null;

  resizeObserver?.observe(container);

  if (typeof window !== "undefined") {
    frameId = window.requestAnimationFrame(tryReady);
    timeoutId = window.setTimeout(tryReady, REFRESH_DELAYS_MS[0]);
  }

  const cleanup = () => {
    isActive = false;
    resizeObserver?.disconnect();

    if (frameId !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(frameId);
    }

    if (timeoutId !== null && typeof window !== "undefined") {
      window.clearTimeout(timeoutId);
    }
  };

  return cleanup;
};

export const createLeafletPreviewInvalidator = (
  container: HTMLElement,
  mapRef: MapRef
) => {
  let frameId: number | null = null;
  const timeoutIds = new Set<number>();

  const clearScheduledRefreshes = () => {
    if (frameId !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }

    if (typeof window !== "undefined") {
      timeoutIds.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    }

    timeoutIds.clear();
  };

  const refresh = () => {
    const map = mapRef.current;

    if (!map || !hasLeafletPreviewSize(container)) {
      return;
    }

    map.invalidateSize({ pan: false, debounceMoveend: true });
  };

  const scheduleRefresh = () => {
    clearScheduledRefreshes();

    if (typeof window === "undefined") {
      refresh();
      return;
    }

    frameId = window.requestAnimationFrame(refresh);

    REFRESH_DELAYS_MS.forEach((delay) => {
      timeoutIds.add(window.setTimeout(refresh, delay));
    });
  };

  const resizeObserver =
    typeof window !== "undefined" && "ResizeObserver" in window
      ? new ResizeObserver(scheduleRefresh)
      : null;

  resizeObserver?.observe(container);

  return {
    scheduleRefresh,
    cleanup: () => {
      clearScheduledRefreshes();
      resizeObserver?.disconnect();
    },
  };
};
