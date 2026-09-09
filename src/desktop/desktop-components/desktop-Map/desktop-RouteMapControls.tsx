import React, { useState, useRef, useEffect } from "react";
import { Layers, Map, X } from "lucide-react";
import styles from "./desktop-RouteMapControls.module.css";
import { useI18n } from "../../../shared/context/I18nContext";

interface RouteMapControlsProps {
  onStyleChange: (style: "outdoors" | "satellite") => void;
  onGlobeToggle: (enabled: boolean) => void;
  currentStyle: "outdoors" | "satellite";
  isGlobeEnabled: boolean;
  map: mapboxgl.Map | null;
  isUIHidden?: boolean;
}

const RouteMapControls: React.FC<RouteMapControlsProps> = ({
  onStyleChange,
  onGlobeToggle,
  currentStyle,
  isGlobeEnabled,
  map,
  isUIHidden = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  // Geolocation control is handled by the main Map component
  // RouteMap doesn't add its own geolocation control to avoid conflicts
  useEffect(() => {
    if (!map) return;
  }, [map]);

  // Close menu when clicking outside or on overlay
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        handleCloseMenu();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
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
    }, 300);
  };

  const handleToggleMenu = () => {
    if (isOpen) {
      handleCloseMenu();
    } else {
      setIsOpen(true);
    }
  };

  // Centralized function to position controls

  const handleStyleChange = (style: "outdoors" | "satellite") => {
    onStyleChange(style);
    localStorage.setItem("mapStyle", style);
    handleCloseMenu();
  };

  const handleGlobeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    onGlobeToggle(enabled);
    localStorage.setItem("globeEnabled", enabled.toString());
  };

  return (
    <>
      <div
        className={`${styles["routeMapControls"]} ${
          isUIHidden ? styles["hidden"] : ""
        }`}
      >
        <button
          className={styles["layerButton"]}
          onClick={handleToggleMenu}
          aria-label="Layer control"
        >
          <Layers size={22} />
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
              <h3 className={`${styles["popupTitle"]} typography-desktop-body-small`}>
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
                  className={`${styles["toggleLabel"]} typography-desktop-label-medium`}
                  aria-label={t("map.controls.globeView")}
                >
                  <input
                    type="checkbox"
                    checked={isGlobeEnabled}
                    onChange={handleGlobeToggle}
                    className={styles["toggleInput"]}
                  />
                  <div className={styles["toggleText"]}>
                    <div className="typography-desktop-body-small">
                      {t("map.controls.globeView")}
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
                    className={`${styles["mapStyleName"]} typography-desktop-label-medium`}
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
                    className={`${styles["mapStyleName"]} typography-desktop-label-medium`}
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

export default RouteMapControls;
