"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Layers, LocateFixed } from "lucide-react";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import styles from "./desktop-MapLayersDropdown.module.css";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useGeolocation } from "../../../mobile/hooks/useGeolocation";
import { useDeviceOrientation } from "../../../mobile/hooks/useDeviceOrientation";

/** Create a canvas-based arrow icon pointing upward (north) for use as a Mapbox symbol image. */
const createArrowImage = (): HTMLCanvasElement => {
  const w = 14;
  const h = 24;
  const gap = 1.5;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const cx = w / 2;
  const bottom = h;

  ctx.beginPath();
  ctx.moveTo(cx, bottom - gap - 14);
  ctx.lineTo(cx + 6, bottom - gap - 5.2);
  ctx.lineTo(cx, bottom - gap - 7.6);
  ctx.lineTo(cx - 6, bottom - gap - 5.2);
  ctx.closePath();

  ctx.fillStyle = "#60a5fa";
  ctx.fill();

  return canvas;
};

interface MapLayersDropdownProps {
  onStyleChange: (style: "outdoors" | "satellite") => void;
  onGlobeToggle: (enabled: boolean) => void;
  onTerrainToggle: (enabled: boolean) => void;
  currentStyle: "outdoors" | "satellite";
  isGlobeEnabled: boolean;
  isTerrainEnabled: boolean;
  map: MapboxMap | null;
}

const MapLayersDropdown: React.FC<MapLayersDropdownProps> = ({
  onStyleChange,
  onGlobeToggle,
  onTerrainToggle,
  currentStyle,
  isGlobeEnabled,
  isTerrainEnabled,
  map,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Geolocation hook
  const {
    coordinates,
    permissionGranted,
    isLoading: isGeolocationLoading,
    requestPermissionAndGetLocation,
    getCurrentLocation,
  } = useGeolocation();

  // Device orientation (compass heading)
  const orientation = useDeviceOrientation();

  // Blue dot layer constants
  const USER_LOCATION_SOURCE_ID = "user-location-source";
  const USER_LOCATION_LAYER_ID = "user-location-circle";
  const HEADING_SOURCE_ID = "user-location-heading-source";
  const HEADING_LAYER_ID = "user-location-heading-cone";
  const [isBlueDotReady, setIsBlueDotReady] = useState(false);
  const [isHeadingReady, setIsHeadingReady] = useState(false);
  const coordsRef = useRef<{ longitude: number; latitude: number } | null>(null);
  const headingRef = useRef<number | null>(null);
  const bearingRef = useRef<number>(0);

  // Initialize blue dot layer on map
  useEffect(() => {
    if (!map) {
      setIsBlueDotReady(false);
      return;
    }

    let isInitialized = false;

    // Core function to add source and layer (assumes style is ready)
    const addSourceAndLayer = () => {
      if (!map || isInitialized) return;

      try {
        if (!map.getSource(USER_LOCATION_SOURCE_ID)) {
          map.addSource(USER_LOCATION_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        if (!map.getLayer(USER_LOCATION_LAYER_ID)) {
          map.addLayer({
            id: USER_LOCATION_LAYER_ID,
            type: "circle",
            source: USER_LOCATION_SOURCE_ID,
            paint: {
              "circle-radius": 7,
              "circle-color": "#60a5fa",
              "circle-opacity": 1,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-opacity": 1,
            },
          });
        }

        // Heading cone source + layer
        if (!map.getSource(HEADING_SOURCE_ID)) {
          map.addSource(HEADING_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
        }

        // Register arrow icon image
        if (!map.hasImage("heading-arrow")) {
          const canvas = createArrowImage();
          const ctx = canvas.getContext("2d")!;
          map.addImage("heading-arrow", ctx.getImageData(0, 0, canvas.width, canvas.height));
        }

        if (!map.getLayer(HEADING_LAYER_ID)) {
          map.addLayer({
            id: HEADING_LAYER_ID,
            type: "symbol",
            source: HEADING_SOURCE_ID,
            layout: {
              "icon-image": "heading-arrow",
              "icon-anchor": "bottom",
              "icon-rotate": ["get", "heading"],
              "icon-rotation-alignment": "viewport",
              "icon-size": 1.4,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
            },
          });
        }

        if (
          map.getSource(USER_LOCATION_SOURCE_ID) &&
          map.getLayer(USER_LOCATION_LAYER_ID)
        ) {
          isInitialized = true;
          setIsBlueDotReady(true);
          setIsHeadingReady(!!map.getSource(HEADING_SOURCE_ID));
        }
      } catch (error) {
        console.error("[Geolocation Desktop] Error adding layer:", error);
        setIsBlueDotReady(false);
      }
    };

    // Wait for style to be ready using polling
    const waitForStyleAndAdd = () => {
      let attempts = 0;
      const maxAttempts = 50;

      const check = () => {
        if (!map || attempts >= maxAttempts) return;

        if (map.isStyleLoaded()) {
          addSourceAndLayer();
        } else {
          attempts++;
          requestAnimationFrame(check);
        }
      };

      check();
    };

    // Initial setup
    if (map.loaded() && map.isStyleLoaded()) {
      addSourceAndLayer();
    } else {
      map.once("load", waitForStyleAndAdd);
    }

    // Handle style changes (style changes remove all custom layers)
    const handleStyleLoad = () => {
      isInitialized = false;
      setIsBlueDotReady(false);
      waitForStyleAndAdd();
    };

    map.on("style.load", handleStyleLoad);

    // Cleanup
    return () => {
      setIsBlueDotReady(false);
      setIsHeadingReady(false);
      map.off("style.load", handleStyleLoad);
      try {
        if (map.getLayer(HEADING_LAYER_ID)) {
          map.removeLayer(HEADING_LAYER_ID);
        }
        if (map.getSource(HEADING_SOURCE_ID)) {
          map.removeSource(HEADING_SOURCE_ID);
        }
        if (map.getLayer(USER_LOCATION_LAYER_ID)) {
          map.removeLayer(USER_LOCATION_LAYER_ID);
        }
        if (map.getSource(USER_LOCATION_SOURCE_ID)) {
          map.removeSource(USER_LOCATION_SOURCE_ID);
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [map]);

  // Update heading arrow icon (position + heading only — size is constant via icon-size)
  const updateHeadingIcon = useCallback(() => {
    if (!map || !isHeadingReady || !coordsRef.current || headingRef.current == null) return;

    const source = map.getSource(HEADING_SOURCE_ID) as GeoJSONSource;
    if (!source) return;

    const screenHeading = ((headingRef.current - bearingRef.current) % 360 + 360) % 360;

    source.setData({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [coordsRef.current.longitude, coordsRef.current.latitude],
      },
      properties: { heading: screenHeading },
    });
    map.triggerRepaint();
  }, [map, isHeadingReady]);

  // Sync map bearing — redraw arrow when map rotates
  useEffect(() => {
    if (!map) return;
    const updateBearing = () => { bearingRef.current = map.getBearing(); updateHeadingIcon(); };
    updateBearing();
    map.on("rotate", updateBearing);
    return () => { map.off("rotate", updateBearing); };
  }, [map, updateHeadingIcon]);

  // Update blue dot when coordinates change
  useEffect(() => {
    if (!map || !isBlueDotReady || !coordinates) return;

    const source = map.getSource(USER_LOCATION_SOURCE_ID) as GeoJSONSource;
    if (!source || !map.getLayer(USER_LOCATION_LAYER_ID)) {
      setIsBlueDotReady(false);
      return;
    }

    source.setData({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [coordinates.longitude, coordinates.latitude],
      },
      properties: {},
    });
    map.triggerRepaint();
  }, [map, coordinates, isBlueDotReady]);

  // Update heading arrow when heading or coordinates change
  useEffect(() => {
    if (!map || !isHeadingReady || !coordinates || orientation.heading == null) return;

    const source = map.getSource(HEADING_SOURCE_ID) as GeoJSONSource;
    if (!source) {
      setIsHeadingReady(false);
      return;
    }

    coordsRef.current = coordinates;
    headingRef.current = orientation.heading;
    updateHeadingIcon();
  }, [map, coordinates, isHeadingReady, orientation.heading, updateHeadingIcon]);

  // Show blue dot on mount if permission already granted
  useEffect(() => {
    if (!map || !permissionGranted || coordinates) return;

    // Permission is granted but we don't have coordinates yet, get them
    const getInitialLocation = async () => {
      await getCurrentLocation();
    };

    getInitialLocation();
  }, [map, permissionGranted, coordinates, getCurrentLocation]);

  const handleStyleChange = (style: "outdoors" | "satellite") => {
    trackEvent("map_style_change", style);
    onStyleChange(style);
    localStorage.setItem("mapStyle", style);
  };

  const handleGlobeToggleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const enabled = event.target.checked;
    trackEvent("map_layer_toggle", `globe_${enabled ? "on" : "off"}`);
    onGlobeToggle(enabled);
    localStorage.setItem("globeEnabled", enabled.toString());
  };

  const handleTerrainToggleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const enabled = event.target.checked;
    trackEvent("map_layer_toggle", `terrain_${enabled ? "on" : "off"}`);
    onTerrainToggle(enabled);
    localStorage.setItem("terrainEnabled", enabled.toString());
  };

  // Handle geolocation button click
  const handleGeolocationClick = async () => {
    if (!map) {
      console.log("[Geolocation Desktop] Button click: No map instance");
      return;
    }

    // Request compass heading permission on iOS (must be from user gesture)
    if (
      orientation.isSupported &&
      orientation.permissionState === "unknown"
    ) {
      orientation.requestPermission();
    }

    console.log(
      "[Geolocation Desktop] Button clicked, permission granted:",
      permissionGranted
    );

    if (permissionGranted) {
      // Permission already granted, just fly to current location
      console.log("[Geolocation Desktop] Getting current location...");
      const coords = await getCurrentLocation();
      console.log("[Geolocation Desktop] Current location received:", coords);
      if (coords) {
        console.log("[Geolocation Desktop] Flying to location:", [
          coords.longitude,
          coords.latitude,
        ]);
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 15,
          duration: 1500,
          essential: true,
        });
        // Blue dot will be updated automatically via useEffect when coordinates change
      }
    } else {
      // First time: request permission, show blue dot, and fly to location
      console.log(
        "[Geolocation Desktop] Requesting permission and location..."
      );
      const coords = await requestPermissionAndGetLocation();
      console.log(
        "[Geolocation Desktop] Permission and location received:",
        coords
      );
      if (coords) {
        console.log("[Geolocation Desktop] Flying to location:", [
          coords.longitude,
          coords.latitude,
        ]);
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 15,
          duration: 1500,
          essential: true,
        });
        // Blue dot will be updated automatically via useEffect when coordinates change
      }
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showDropdown &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className={styles["map-layers-dropdown"]}>
      {/* MapLayers Icon Button - Bottom Left */}
      <button
        ref={buttonRef}
        className={`${styles["map-layers-dropdown__button"]} ${
          showDropdown ? styles["map-layers-dropdown__button--active"] : ""
        }`}
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Map layers"
        title="Map layers"
      >
        <Layers size={24} />
      </button>

      {/* Geolocation Button */}
      <button
        className={styles["map-layers-dropdown__geolocation-button"]}
        onClick={handleGeolocationClick}
        disabled={isGeolocationLoading || !map || !isBlueDotReady}
        aria-label="Get current location"
      >
        <LocateFixed size={24} />
      </button>

      {/* Dropdown - Above Icon */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className={styles["map-layers-dropdown__dropdown"]}
        >
          {/* Globe Toggle */}
          <label className={styles["map-layers-dropdown__toggle-label"]}>
            <input
              type="checkbox"
              checked={isGlobeEnabled}
              onChange={handleGlobeToggleChange}
              className={styles["map-layers-dropdown__toggle-input"]}
            />
            <span className="typography-desktop-body-small">
              {t("map.controls.globeView")}
            </span>
          </label>

          {/* Terrain Toggle */}
          <label className={styles["map-layers-dropdown__toggle-label"]}>
            <input
              type="checkbox"
              checked={isTerrainEnabled}
              onChange={handleTerrainToggleChange}
              className={styles["map-layers-dropdown__toggle-input"]}
            />
            <span className="typography-desktop-body-small">3D Terrain</span>
          </label>

          {/* Map Style Options */}
          <div className={styles["map-layers-dropdown__map-styles-container"]}>
            <button
              className={`${styles["map-layers-dropdown__map-style"]} ${
                currentStyle === "outdoors"
                  ? styles["map-layers-dropdown__map-style--active"]
                  : ""
              }`}
              onClick={() => handleStyleChange("outdoors")}
              aria-label="Switch to outdoors view"
            >
              <img
                src="/icons/map/ic_default_colors2-2x.png"
                alt="Outdoors"
                className={styles["map-layers-dropdown__map-style-image"]}
              />
              <span className="typography-desktop-body-small">
                {t("map.controls.outdoors")}
              </span>
            </button>

            <button
              className={`${styles["map-layers-dropdown__map-style"]} ${
                currentStyle === "satellite"
                  ? styles["map-layers-dropdown__map-style--active"]
                  : ""
              }`}
              onClick={() => handleStyleChange("satellite")}
              aria-label="Switch to satellite view"
            >
              <img
                src="/icons/map/ic_satellite-2x.png"
                alt="Satellite"
                className={styles["map-layers-dropdown__map-style-image"]}
              />
              <span className="typography-desktop-body-small">
                {t("map.controls.satellite")}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(MapLayersDropdown);
