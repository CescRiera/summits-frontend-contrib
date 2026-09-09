import React, { useState, useRef, useEffect, useCallback } from "react";
import { Layers, Map, X, LocateFixed } from "lucide-react";
import type { Map as MapboxMap, GeoJSONSource } from "mapbox-gl";
import styles from "./LayerControl.module.css";
import { useI18n } from "../../../shared/context/I18nContext";
import { useGeolocation } from "../../hooks/useGeolocation";
import { useDeviceOrientation } from "../../hooks/useDeviceOrientation";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";

/** Create a canvas-based arrow icon pointing upward (north) for use as a Mapbox symbol image. */
const createArrowImage = (): HTMLCanvasElement => {
  const w = 14;
  const h = 24;
  const gap = 1.5;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Anchor is bottom-center (user position). Arrow extends upward (forward).
  const cx = w / 2;
  const bottom = h;

  ctx.beginPath();
  ctx.moveTo(cx, bottom - gap - 14);        // tip
  ctx.lineTo(cx + 6, bottom - gap - 5.2);   // right shoulder
  ctx.lineTo(cx, bottom - gap - 7.6);       // base notch
  ctx.lineTo(cx - 6, bottom - gap - 5.2);   // left shoulder
  ctx.closePath();

  ctx.fillStyle = "#60a5fa";
  ctx.fill();

  return canvas;
};

interface LayerControlProps {
  onStyleChange: (style: "outdoors" | "satellite") => void;
  onGlobeToggle: (enabled: boolean) => void;
  onTerrainToggle: (enabled: boolean) => void;
  currentStyle: "outdoors" | "satellite";
  isGlobeEnabled: boolean;
  isTerrainEnabled: boolean;
  isOnline?: boolean;
  map: MapboxMap | null;
  isPopupVisible?: boolean;
  fixedPosition?: boolean; // New prop to control positioning behavior
  isUIHidden?: boolean;
  onOpenChange?: (isOpen: boolean) => void; // Callback to notify parent of open state
}

const LayerControl: React.FC<LayerControlProps> = ({
  onStyleChange,
  onGlobeToggle,
  onTerrainToggle,
  currentStyle,
  isGlobeEnabled,
  isTerrainEnabled,
  isOnline = true,
  map,
  fixedPosition = false,
  isUIHidden = false,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();

  // Fixed stack metrics for placing layer control above geolocate
  const GEOLOCATE_HEIGHT_PX = 44; // geolocation button size
  const STACK_GAP_PX = 10; // gap between buttons
  const STACK_OFFSET_PX = GEOLOCATE_HEIGHT_PX + STACK_GAP_PX; // = 54

  // Geolocation hook
  const {
    coordinates,
    permissionGranted,
    isLoading: isGeolocationLoading,
    requestPermissionAndGetLocation,
    getCurrentLocation,
    startWatching,
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
const LAST_POSITION_KEY = "last-known-position";

// Restore last known position from localStorage on mount
const getLastKnownPosition = (): { latitude: number; longitude: number } | null => {
  try {
    const stored = localStorage.getItem(LAST_POSITION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
        return parsed;
      }
    }
  } catch {}
  return null;
};

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

        // Heading arrow source + symbol layer
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
        console.error("[Geolocation] Error adding layer:", error);
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

    // Compute screen-relative rotation: device heading minus map bearing
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

  // Sync map bearing — redraw arrow when map rotates (since we use viewport-aligned rotation)
  useEffect(() => {
    if (!map) return;
    const updateBearing = () => { bearingRef.current = map.getBearing(); updateHeadingIcon(); };
    updateBearing();
    map.on("rotate", updateBearing);
    return () => { map.off("rotate", updateBearing); };
  }, [map, updateHeadingIcon]);

  // Persist last known position to localStorage
  useEffect(() => {
    if (!coordinates) return;
    try {
      localStorage.setItem(
        LAST_POSITION_KEY,
        JSON.stringify({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
        })
      );
    } catch {}
  }, [coordinates]);

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

  // Show blue dot and start continuous tracking on mount if permission already granted
  useEffect(() => {
    if (!map || !permissionGranted) return;

    // Start tracking location continuously if permission is granted
    startWatching();
  }, [map, permissionGranted, startWatching]);

  // Notify parent component when layer control opens/closes
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Close menu when clicking outside or on overlay
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleCloseMenu();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden"; // Prevent background scrolling
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleCloseMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 300); // Match the animation duration
  };

  const handleToggleMenu = () => {
    if (isOpen) {
      handleCloseMenu();
    } else {
      setIsOpen(true);
    }
  };

  // Handle positioning based on fixedPosition prop
  useEffect(() => {
    const setControlsPosition = () => {
      const geolocationButton = document.querySelector(
        `.${styles["geolocationButton"]}`
      ) as HTMLElement | null;
      const layerControl = document.querySelector(
        `.${styles["layerControl"]}`
      ) as HTMLElement | null;

      if (fixedPosition) {
        // Fixed positioning for RouteMap
        if (geolocationButton) {
          geolocationButton.style.position = "fixed";
          geolocationButton.style.bottom = "20px";
          geolocationButton.style.right = "20px";
        }
        if (layerControl) {
          layerControl.style.position = "fixed";
          layerControl.style.bottom = `calc(20px + ${STACK_OFFSET_PX}px + env(safe-area-inset-bottom))`;
          layerControl.style.right = "20px";
        }
      } else {
        // Default position for Map.tsx
        if (geolocationButton) {
          geolocationButton.style.position = "absolute";
          geolocationButton.style.bottom =
            "calc(80px + env(safe-area-inset-bottom))";
          geolocationButton.style.right = "20px";
        }
        if (layerControl) {
          layerControl.style.position = "absolute";
          layerControl.style.bottom = `calc(80px + ${STACK_OFFSET_PX}px + env(safe-area-inset-bottom))`;
          layerControl.style.right = "20px";
        }
      }
    };

    // Set position immediately and after a delay to ensure controls are rendered
    setControlsPosition();
    const timeoutId = setTimeout(setControlsPosition, 100);

    return () => clearTimeout(timeoutId);
  }, [map, fixedPosition]);

  // Handle UI visibility for geolocation button
  useEffect(() => {
    const geolocationButtonClass = styles["geolocationButton"];
    const hiddenClass = styles["geolocationButton--hidden"];

    if (!geolocationButtonClass || !hiddenClass) return;

    const geolocationButton = document.querySelector(
      `.${geolocationButtonClass}`
    ) as HTMLElement | null;

    if (geolocationButton) {
      if (isUIHidden) {
        geolocationButton.classList.add(hiddenClass);
      } else {
        geolocationButton.classList.remove(hiddenClass);
      }
    }
  }, [isUIHidden, styles]);

  const handleStyleChange = (style: "outdoors" | "satellite") => {
    trackEvent("interaction", `map_style_change_${style}`);
    onStyleChange(style);
    localStorage.setItem("mapStyle", style);
    handleCloseMenu();
  };

  const handleGlobeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    trackEvent("interaction", `map_globe_toggle_${enabled}`);
    onGlobeToggle(enabled);
    localStorage.setItem("globeEnabled", enabled.toString());
  };

  const handleTerrainToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    trackEvent("interaction", `map_terrain_toggle_${enabled}`);
    onTerrainToggle(enabled);
    localStorage.setItem("terrainEnabled", enabled.toString());
  };

  // Handle geolocation button click
  const handleGeolocationClick = async () => {
    trackEvent("button_click", "map_geolocation");
    if (!map) return;

    // Request compass heading permission on iOS (must be from user gesture)
    if (
      orientation.isSupported &&
      orientation.permissionState === "unknown"
    ) {
      orientation.requestPermission();
    }

    if (permissionGranted) {
      // Permission already granted, start tracking and fly to location
      startWatching();
      const coords = coordinates || await getCurrentLocation();
      if (coords) {
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 15,
          duration: 1500,
          essential: true,
        });
      } else {
        // If GPS unavailable (e.g. deep offline first launch), try last known position
        const lastPos = getLastKnownPosition();
        if (lastPos) {
          map.flyTo({
            center: [lastPos.longitude, lastPos.latitude],
            zoom: 15,
            duration: 1500,
            essential: true,
          });
        }
      }
    } else {
      // First time: request permission, start tracking, and fly to location
      const coords = await requestPermissionAndGetLocation();
      if (coords) {
        startWatching();
        map.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 15,
          duration: 1500,
          essential: true,
        });
      } else {
        // Permission denied or unavailable — try last known position as fallback
        const lastPos = getLastKnownPosition();
        if (lastPos) {
          map.flyTo({
            center: [lastPos.longitude, lastPos.latitude],
            zoom: 15,
            duration: 1500,
            essential: true,
          });
        }
      }
    }
  };

  return (
    <>
      {/* Geolocation Button */}
      <div
        className={`${styles["geolocationButton"]} ${
          isUIHidden ? styles["geolocationButton--hidden"] : ""
        }`}
      >
        <button
          className={styles["geolocationButton__button"]}
          onClick={handleGeolocationClick}
          disabled={isGeolocationLoading || !map}
          aria-label="Get current location"
        >
          <LocateFixed size={20} />
        </button>
      </div>

      {/* Layer Control */}
      <div
        className={`${styles["layerControl"]} ${
          isUIHidden ? styles["layerControl--hidden"] : ""
        }`}
      >
        <button
          className={styles["layerButton"]}
          onClick={handleToggleMenu}
          aria-label="Layer control"
        >
          <Layers size={20} />
        </button>
      </div>

      {isOpen && (
        <div className={styles["overlay"]} onClick={handleCloseMenu}>
          <div
            className={`${styles["bottomPopup"]} ${
              isClosing ? styles["bottomPopupClosing"] : ""
            }`}
            onClick={(e) => e.stopPropagation()}
            ref={menuRef}
          >
            <div className={styles["popupHeader"]}>
              <h3 className={`${styles["popupTitle"]} typography-title-medium`}>
                <Map size={18} />
                {t("map.controls.title")}
              </h3>
              <button
                className={styles["closeButton"]}
                onClick={handleCloseMenu}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles["popupContent"]}>
              {/* Globe Toggle */}
              <div className={styles["globeToggleRow"]}>
                <label
                  className={`${styles["toggleLabel"]} typography-label-medium`}
                  aria-label={t("map.controls.globeView")}
                >
                  <input
                    type="checkbox"
                    checked={isGlobeEnabled}
                    onChange={handleGlobeToggle}
                    className={styles["toggleInput"]}
                  />
                  <div className={styles["toggleText"]}>
                    <div className="typography-body-medium">
                      {t("map.controls.globeView")}
                    </div>
                  </div>
                </label>
              </div>

              {/* Terrain Toggle */}
              <div className={styles["globeToggleRow"]}>
                <label
                  className={`${styles["toggleLabel"]} typography-label-medium`}
                  aria-label={t("map.controls.terrainView") || "3D Terrain"}
                >
                  <input
                    type="checkbox"
                    checked={isTerrainEnabled}
                    onChange={handleTerrainToggle}
                    disabled={!isOnline}
                    className={styles["toggleInput"]}
                  />
                  <div className={styles["toggleText"]}>
                    <div className="typography-body-medium">
                      3D Terrain
                    </div>
                  </div>
                </label>
              </div>

              {/* Map Style Options */}
              <div className={styles["mapStyleRow"]}>
                <button
                  className={`${styles["mapStyleOption"]} ${
                    currentStyle === "outdoors"
                      ? styles["mapStyleOptionActive"]
                      : ""
                  }`}
                  onClick={() => handleStyleChange("outdoors")}
                  aria-label="Switch to outdoors view"
                >
                  <img
                    src="/icons/map/ic_default_colors2-2x.png"
                    alt="Outdoors"
                    className={styles["mapStyleOptionImage"]}
                  />
                  <span
                    className={`${styles["mapStyleName"]} typography-title-small`}
                  >
                    {t("map.controls.outdoors")}
                  </span>
                </button>

                <button
                  className={`${styles["mapStyleOption"]} ${
                    currentStyle === "satellite"
                      ? styles["mapStyleOptionActive"]
                      : ""
                  }`}
                  onClick={() => handleStyleChange("satellite")}
                  aria-label="Switch to satellite view"
                >
                  <img
                    src="/icons/map/ic_satellite-2x.png"
                    alt="Satellite"
                    className={styles["mapStyleOptionImage"]}
                  />
                  <span
                    className={`${styles["mapStyleName"]} typography-title-small`}
                  >
                    {t("map.controls.satellite")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LayerControl;
