import React, { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getElevationIconMap } from "../../constants/elevationColors";
import {
  createLeafletPreviewInvalidator,
  getLeafletPreviewInitialView,
  hasLeafletPreviewSize,
  waitForLeafletPreviewContainer,
} from "../../utils/leafletPreviewLifecycle";

interface LeafletRouteMapProps {
  coordinates?: { type: string; coordinates: [number, number][] };
  peaks?: Array<{ lat: number; lng: number; elevation: number }>;
}

export const LeafletRouteMap: React.FC<LeafletRouteMapProps> = ({ coordinates, peaks }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const invalidatorRef = useRef<ReturnType<typeof createLeafletPreviewInvalidator> | null>(null);
  const latestDataRef = useRef({ coordinates, peaks });
  const initialViewRef = useRef<ReturnType<typeof getLeafletPreviewInitialView>>(null);
  const [initialView, setInitialView] = useState<ReturnType<typeof getLeafletPreviewInitialView>>(null);
  const shouldRenderMap = initialView !== null;

  useEffect(() => {
    const nextInitialView = getLeafletPreviewInitialView(coordinates, peaks);
    initialViewRef.current = nextInitialView;
    setInitialView(nextInitialView);
  }, [coordinates, peaks]);

  const syncMapContent = useCallback((map: L.Map) => {
    const currentCoordinates = latestDataRef.current.coordinates;
    const currentPeaks = latestDataRef.current.peaks;

    map.invalidateSize({ pan: false, debounceMoveend: true });

    map.eachLayer((layer) => {
      if (
        layer instanceof L.Polyline ||
        layer instanceof L.Marker ||
        layer instanceof L.CircleMarker
      ) {
        map.removeLayer(layer);
      }
    });

    const hasCoordinates = Boolean(currentCoordinates?.coordinates?.length);
    const hasPeaks = Boolean(currentPeaks?.length);

    if (!hasCoordinates && !hasPeaks) {
      invalidatorRef.current?.scheduleRefresh();
      return;
    }

    let polyline: L.Polyline | null = null;

    if (hasCoordinates && currentCoordinates) {
      const latlngs = currentCoordinates.coordinates.map(
        (coordinate) => [coordinate[1], coordinate[0]] as [number, number]
      );
      polyline = L.polyline(latlngs, {
        color: "#ED254E",
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
    }

    if (hasPeaks && currentPeaks) {
      const validPeaks = currentPeaks.filter(
        (peak): peak is { lat: number; lng: number; elevation: number } =>
          peak.lat != null && peak.lng != null
      );

      validPeaks.forEach((peak) => {
        const iconUrl = getElevationIconMap(peak.elevation || 0);
        const icon = L.divIcon({
          html: `<img src="${iconUrl}" style="height: 32px; width: auto; transform: translate(-50%, -100%); transform-origin: bottom center; display: block;" />`,
          className: "",
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });
        L.marker([peak.lat, peak.lng], { icon }).addTo(map);
      });

      if (!polyline) {
        if (validPeaks.length === 1) {
          const peak = validPeaks[0]!;
          map.setView([peak.lat, peak.lng], 14);
        } else if (validPeaks.length > 1) {
          const first = validPeaks[0]!;
          const bounds = L.latLngBounds([first.lat, first.lng], [first.lat, first.lng]);
          validPeaks.slice(1).forEach(p => bounds.extend([p.lat, p.lng]));
          map.invalidateSize();
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } else {
        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    } else if (polyline) {
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }

    invalidatorRef.current?.scheduleRefresh();
  }, []);

  useEffect(() => {
    if (!shouldRenderMap || !mapRef.current || mapInstance.current) return;

    const container = mapRef.current;

    const initializeMap = () => {
      const currentInitialView = initialViewRef.current;

      if (
        !currentInitialView ||
        mapInstance.current ||
        !hasLeafletPreviewSize(container)
      ) {
        return;
      }

      const map = L.map(container, {
        center: currentInitialView.center,
        zoom: currentInitialView.zoom,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      mapInstance.current = map;
      invalidatorRef.current = createLeafletPreviewInvalidator(
        container,
        mapInstance
      );

      syncMapContent(map);
      invalidatorRef.current.scheduleRefresh();
    };

    initializeMap();

    const stopWaitingForSize = mapInstance.current
      ? () => {}
      : waitForLeafletPreviewContainer(container, initializeMap);

    return () => {
      stopWaitingForSize();
      invalidatorRef.current?.cleanup();
      invalidatorRef.current = null;

      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [shouldRenderMap, syncMapContent]);

  useEffect(() => {
    latestDataRef.current = { coordinates, peaks };

    const map = mapInstance.current;
    if (!map) return;

    syncMapContent(map);
  }, [coordinates, peaks, syncMapContent]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {shouldRenderMap ? (
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      ) : null}
    </div>
  );
};
