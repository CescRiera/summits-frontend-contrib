import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { isMobile, isTablet } from "react-device-detect";

const isCapacitorNative =
  typeof Capacitor !== "undefined" && Capacitor.isNativePlatform();

const detectMobile = (): boolean => {
  if (isCapacitorNative) return true;
  return isMobile || isTablet || window.innerWidth <= 768;
};

export const useMobileDetection = () => {
  const [detected, setDetected] = useState<boolean>(detectMobile);

  useEffect(() => {
    if (isCapacitorNative) return;
    const checkSize = () => {
      setDetected(detectMobile());
    };
    window.addEventListener("resize", checkSize);
    return () => {
      window.removeEventListener("resize", checkSize);
    };
  }, []);

  return detected;
};
