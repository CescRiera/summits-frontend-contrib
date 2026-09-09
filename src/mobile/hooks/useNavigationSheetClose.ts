import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Custom hook to close a sheet when navigating away from map-related routes
 *
 * This hook monitors route changes and automatically closes the sheet when the user
 * navigates away from specified routes. It's designed to prevent sheets from remaining
 * open when users navigate to different pages.
 *
 * @param isSheetOpen - Whether the sheet is currently open
 * @param onCloseSheet - Function to call when the sheet should be closed
 * @param mapRoutes - Array of routes where the sheet should remain open (default: ['/map', '/explore'])
 *
 * @example
 * ```tsx
 * const [isSheetOpen, setIsSheetOpen] = useState(false);
 *
 * const handleCloseSheet = useCallback(() => {
 *   setIsSheetOpen(false);
 * }, []);
 *
 * useNavigationSheetClose(
 *   isSheetOpen,
 *   handleCloseSheet,
 *   ['/map', '/explore'] // Keep sheet open on these routes
 * );
 * ```
 */
export const useNavigationSheetClose = (
  isSheetOpen: boolean,
  onCloseSheet: () => void,
  mapRoutes: string[] = ["/map", "/explore"]
) => {
  const location = useLocation();
  const prevLocationRef = useRef<string>(location.pathname);
  const isClosingRef = useRef<boolean>(false);

  useEffect(() => {
    const currentPath = location.pathname;
    const prevPath = prevLocationRef.current;

    // Only act if the sheet is open and we're navigating away from a map route
    if (isSheetOpen && !isClosingRef.current) {
      const wasOnMapRoute = mapRoutes.some((route) => prevPath === route);
      const isOnMapRoute = mapRoutes.some((route) => currentPath === route);

      // If we were on a map route and are now navigating away from all map routes
      if (wasOnMapRoute && !isOnMapRoute) {
        isClosingRef.current = true;
        onCloseSheet();

        // Reset the closing flag after a short delay
        setTimeout(() => {
          isClosingRef.current = false;
        }, 100);
      }
    }

    // Update the previous location reference
    prevLocationRef.current = currentPath;
  }, [location.pathname, isSheetOpen, onCloseSheet, mapRoutes]);

  // Reset closing flag when sheet is manually closed
  useEffect(() => {
    if (!isSheetOpen) {
      isClosingRef.current = false;
    }
  }, [isSheetOpen]);
};
