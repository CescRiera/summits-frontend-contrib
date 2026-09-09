import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type {
  ScrapingOverlayState,
  ScrapingOverlayContextType,
} from "./desktop-ScrapingOverlayTypes.ts";

const ScrapingOverlayContext = createContext<
  ScrapingOverlayContextType | undefined
>(undefined);

export const useScrapingOverlay = () => {
  const ctx = useContext(ScrapingOverlayContext);
  if (!ctx)
    throw new Error(
      "useScrapingOverlay must be used within ScrapingOverlayProvider"
    );
  return ctx;
};

export const ScrapingOverlayProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [overlay, setOverlay] = useState<ScrapingOverlayState>({
    visible: false,
    message: "",
    type: "scraping",
  });
  // Use ref to track manuallyClosed so callback always has latest value
  const manuallyClosedRef = useRef(false);

  // Show overlay
  const showOverlay = useCallback(
    (message: string, type: "scraping" | "complete") => {
      // If it's a complete overlay, always show it (reset manuallyClosed flag)
      if (type === "complete") {
        manuallyClosedRef.current = false;
        setOverlay({ visible: true, message, type });
      } else if (!manuallyClosedRef.current) {
        // Only show scraping overlay if it wasn't manually closed
        setOverlay({ visible: true, message, type });
      }
    },
    []
  );

  // Hide overlay
  const hideOverlay = useCallback(() => {
    manuallyClosedRef.current = true;
    setOverlay((prev: ScrapingOverlayState) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ScrapingOverlayContext.Provider
      value={{ overlay, showOverlay, hideOverlay }}
    >
      {children}
    </ScrapingOverlayContext.Provider>
  );
};
