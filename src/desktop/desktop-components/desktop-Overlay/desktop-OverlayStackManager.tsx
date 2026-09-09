import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate, Routes, Route } from "react-router-dom";
import {
  OverlayProvider,
  type OverlayItem,
  type OverlayType,
} from "./desktop-OverlayContext.tsx";
import DetailOverlay from "./desktop-DetailOverlay.tsx";
import ProtectedRoute from "../../../shared/components/ProtectedRoute";
import UserPrivacyProtectedRoute from "../../../shared/components/UserPrivacyProtectedRoute";
import RoutePrivacyProtectedRoute from "../../../shared/components/RoutePrivacyProtectedRoute";

// Detail pages
import PeakDetails from "../../desktop-NonPersistentPages/desktop-PeakDetails/desktop-PeakDetails.tsx";
import ShelterDetails from "../../desktop-NonPersistentPages/desktop-ShelterDetails/desktop-ShelterDetails.tsx";
import ListDetails from "../../desktop-NonPersistentPages/desktop-ListDetails/desktop-ListDetails.tsx";
import DesktopClubsBrowse from "../../desktop-NonPersistentPages/desktop-ClubsBrowse/desktop-ClubsBrowse.tsx";
import DesktopClubDetails from "../../desktop-NonPersistentPages/desktop-ClubDetails/desktop-ClubDetails.tsx";
import DesktopCreateEditClub from "../../desktop-NonPersistentPages/desktop-CreateEditClub/desktop-CreateEditClub.tsx";
import UserPeaks from "../../desktop-NonPersistentPages/desktop-UserPeaks/desktop-UserPeaks.tsx";
import UserSavedPeaks from "../../desktop-NonPersistentPages/desktop-UserSavedPeaks/desktop-UserSavedPeaks.tsx";
import UserSavedShelters from "../../desktop-NonPersistentPages/desktop-UserSavedShelters/desktop-UserSavedShelters.tsx";
import UserRoutes from "../../desktop-NonPersistentPages/desktop-UserRoutes/desktop-UserRoutes.tsx";
import UserRouteDetails from "../../desktop-NonPersistentPages/desktop-UserRouteDetails/desktop-UserRouteDetails.tsx";
import ExternalProfile from "../../desktop-NonPersistentPages/desktop-ExternalProfile/desktop-ExternalProfile.tsx";
import AddManualPeaks from "../../desktop-NonPersistentPages/desktop-AddManualPeaks/desktop-AddManualPeaks.tsx";

let overlayInstanceCounter = 0;

export default function OverlayStackManager() {
  const location = useLocation();
  const navigate = useNavigate();
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const overlaysRef = useRef<OverlayItem[]>([]);
  const prevPathRef = useRef<string>("");
  const lastNonOverlayPathRef = useRef<string>("");
  const isBackNavigationRef = useRef(false);
  const isNavigatingToExistingOverlayRef = useRef<number | null>(null);
  const isBodyLockedRef = useRef(false);
  const bodyLockStateRef = useRef<{
    scrollY: number;
    position: string;
    top: string;
    width: string;
    overflow: string;
  } | null>(null);

  // Detect browser back/forward to differentiate from programmatic navigate
  useEffect(() => {
    const onPopState = () => {
      isBackNavigationRef.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const parseOverlayFromUrl = useCallback((pathname: string) => {
    // peaks/:id
    const peakMatch = pathname.match(/\/peaks\/(\d+)/);
    if (peakMatch) {
      return {
        id: peakMatch[1],
        type: "peak" as OverlayType,
        baseStorageKey: `peak:${peakMatch[1]}`,
      };
    }
    // shelters/:id
    const shelterMatch = pathname.match(/\/shelters\/(\d+)/);
    if (shelterMatch) {
      return {
        id: shelterMatch[1],
        type: "shelter" as OverlayType,
        baseStorageKey: `shelter:${shelterMatch[1]}`,
      };
    }
    // list-details/:id or :id/:userId
    const listUserMatch = pathname.match(/\/list-details\/(\d+)\/(\d+)/);
    if (listUserMatch) {
      return {
        id: `${listUserMatch[1]}:${listUserMatch[2]}`,
        type: "list" as OverlayType,
        baseStorageKey: `list:${listUserMatch[1]}:${listUserMatch[2]}`,
      };
    }
    const listMatch = pathname.match(/\/list-details\/(\d+)/);
    if (listMatch) {
      return {
        id: listMatch[1],
        type: "list" as OverlayType,
        baseStorageKey: `list:${listMatch[1]}`,
      };
    }
    if (/\/clubs\/?$/.test(pathname)) {
      return {
        id: undefined,
        type: "clubs-root" as OverlayType,
        baseStorageKey: "clubs:root",
      };
    }
    if (/\/clubs\/create\/?$/.test(pathname)) {
      return {
        id: undefined,
        type: "create-club" as OverlayType,
        baseStorageKey: "club-create:root",
      };
    }
    const clubEditMatch = pathname.match(/\/clubs\/(\d+)\/edit/);
    if (clubEditMatch) {
      return {
        id: clubEditMatch[1],
        type: "edit-club" as OverlayType,
        baseStorageKey: `club-edit:${clubEditMatch[1]}`,
      };
    }
    const clubMatch = pathname.match(/\/clubs\/(\d+)/);
    if (clubMatch) {
      return {
        id: clubMatch[1],
        type: "club" as OverlayType,
        baseStorageKey: `club:${clubMatch[1]}`,
      };
    }
    // userpeaks (root and :id)
    if (/\/userpeaks\/?$/.test(pathname)) {
      return {
        id: undefined,
        type: "userpeaks-root" as OverlayType,
        baseStorageKey: "userpeaks:root",
      };
    }
    const userPeaksMatch = pathname.match(/\/userpeaks\/(\d+)/);
    if (userPeaksMatch) {
      return {
        id: userPeaksMatch[1],
        type: "userpeaks" as OverlayType,
        baseStorageKey: `userpeaks:${userPeaksMatch[1]}`,
      };
    }
    // saved-peaks
    if (/\/saved-peaks\/?$/.test(pathname)) {
      return {
        id: undefined,
        type: "saved-peaks-root" as OverlayType,
        baseStorageKey: "saved-peaks:root",
      };
    }
    // saved-shelters
    if (/\/saved-shelters\/?$/.test(pathname)) {
      return {
        id: undefined,
        type: "saved-shelters-root" as OverlayType,
        baseStorageKey: "saved-shelters:root",
      };
    }
    // userroutes (root and :id)
    if (/\/userroutes\/?$/.test(pathname)) {
      return {
        id: undefined,
        type: "userroutes-root" as OverlayType,
        baseStorageKey: "userroutes:root",
      };
    }
    const userRoutesMatch = pathname.match(/\/userroutes\/(\d+)/);
    if (userRoutesMatch) {
      return {
        id: userRoutesMatch[1],
        type: "userroutes" as OverlayType,
        baseStorageKey: `userroutes:${userRoutesMatch[1]}`,
      };
    }
    // routes/:routeId
    const routeMatch = pathname.match(/\/routes\/(\d+)/);
    if (routeMatch) {
      return {
        id: routeMatch[1],
        type: "route" as OverlayType,
        baseStorageKey: `route:${routeMatch[1]}`,
      };
    }

    const externalProfileMatch = pathname.match(/\/externalprofile\/(\d+)/);
    if (externalProfileMatch) {
      return {
        id: externalProfileMatch[1],
        type: "userstats" as OverlayType,
        baseStorageKey: `externalprofile:${externalProfileMatch[1]}`,
      };
    }
    // addManualPeaks
    if (/\/addManualPeaks\/?$/.test(pathname)) {
      return {
        id: undefined,
        type: "add-manual-peaks" as OverlayType,
        baseStorageKey: "add-manual-peaks",
      };
    }
    return null;
  }, []);

  const getBasePath = useCallback(() => {
    // Keep it simple: go home when clearing overlays
    return "/";
  }, []);

  // Helper function to build path from overlay
  const buildPathFromOverlay = useCallback((overlay: OverlayItem): string => {
    switch (overlay.type) {
      case "peak":
        return `/peaks/${overlay.id}`;
      case "shelter":
        return `/shelters/${overlay.id}`;
      case "list":
        if (overlay.id && overlay.id.includes(":")) {
          const [lid, uid] = overlay.id.split(":");
          return `/list-details/${lid}/${uid}`;
        }
        return `/list-details/${overlay.id}`;
      case "clubs-root":
        return `/clubs`;
      case "club":
        return `/clubs/${overlay.id}`;
      case "create-club":
        return `/clubs/create`;
      case "edit-club":
        return `/clubs/${overlay.id}/edit`;
      case "userpeaks-root":
        return `/userpeaks`;
      case "userpeaks":
        return `/userpeaks/${overlay.id}`;
      case "saved-peaks-root":
        return `/saved-peaks`;
      case "saved-shelters-root":
        return `/saved-shelters`;
      case "userroutes-root":
        return `/userroutes`;
      case "userroutes":
        return `/userroutes/${overlay.id}`;
      case "route":
        return `/routes/${overlay.id}`;

      case "userstats":
        return `/externalprofile/${overlay.id}`;
      case "add-manual-peaks":
        return `/addManualPeaks`;
      default:
        return "/";
    }
  }, []);

  useEffect(() => {
    const parsed = parseOverlayFromUrl(location.pathname);
    const prevStack = overlaysRef.current;
    const currentPath = location.pathname;

    // Reset flags
    isBackNavigationRef.current = false;
    isNavigatingToExistingOverlayRef.current = null;

    // 1. Handle non-overlay URLs
    if (!parsed) {
      const hadOverlayStack = prevStack.length > 0;
      if (hadOverlayStack) {
        prevStack.forEach((overlay) => {
          try {
            sessionStorage.removeItem(`scroll:${overlay.storageKey}`);
          } catch {}
        });
        setOverlays([]);
        overlaysRef.current = [];
      }
      if (!hadOverlayStack) {
        lastNonOverlayPathRef.current = `${location.pathname}${location.search}`;
      }
      prevPathRef.current = currentPath;
      return;
    }

    // 2. Reconciliation: check if this overlay is already in the stack (by baseStorageKey)
    let matchIndex = -1;
    for (let i = prevStack.length - 1; i >= 0; i--) {
      if (prevStack[i]?.baseStorageKey === parsed.baseStorageKey) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex >= 0) {
      // It's already in the stack!
      // If it's not the top item, trim the stack to this point
      if (matchIndex < prevStack.length - 1) {
        // Clean up scroll storage for removed overlays
        for (let i = matchIndex + 1; i < prevStack.length; i++) {
          try {
            const overlay = prevStack[i];
            if (overlay) sessionStorage.removeItem(`scroll:${overlay.storageKey}`);
          } catch {}
        }
        
        const trimmedStack = prevStack.slice(0, matchIndex + 1).map((o, i) => ({
          ...o,
          isActive: i === matchIndex,
          isNew: false,
          skipTransition: i < matchIndex,
        }));
        
        setOverlays(trimmedStack);
        overlaysRef.current = trimmedStack;
      } else {
        // Already at the top, just ensure it's active
        if (!prevStack[matchIndex]?.isActive) {
          const updatedStack = prevStack.map((o, i) => ({
            ...o,
            isActive: i === matchIndex,
          }));
          setOverlays(updatedStack);
          overlaysRef.current = updatedStack;
        }
      }
      prevPathRef.current = currentPath;
      return;
    }

    // 3. Not in stack: Push a new overlay
    if (prevStack.length === 0) {
      const prevPath = prevPathRef.current;
      const prevWasOverlay = !!parseOverlayFromUrl(prevPath || "");
      if (!prevWasOverlay && !lastNonOverlayPathRef.current) {
        lastNonOverlayPathRef.current = prevPath || "";
      }
    }

    const instanceKey = `instance-${++overlayInstanceCounter}`;
    const pushStack: OverlayItem[] = [
      ...prevStack.map((o) => ({
        ...o,
        isActive: false,
        isNew: false,
        skipTransition: false,
      })),
      {
        id: parsed.id,
        type: parsed.type,
        baseStorageKey: parsed.baseStorageKey,
        storageKey: `${parsed.baseStorageKey}:${instanceKey}`,
        isActive: true,
        instanceKey,
        isNew: true,
        skipTransition: false,
      } as OverlayItem,
    ];

    setOverlays(pushStack);
    overlaysRef.current = pushStack;
    prevPathRef.current = currentPath;
  }, [location.pathname, parseOverlayFromUrl]);

  useEffect(() => {
    const hasOverlays = overlays.length > 0;
    if (hasOverlays && !isBodyLockedRef.current) {
      const scrollY = window.scrollY;
      bodyLockStateRef.current = {
        scrollY,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
      };
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
      isBodyLockedRef.current = true;
    } else if (!hasOverlays && isBodyLockedRef.current) {
      const state = bodyLockStateRef.current;
      if (state) {
        document.body.style.position = state.position;
        document.body.style.top = state.top;
        document.body.style.width = state.width;
        document.body.style.overflow = state.overflow;
        window.scrollTo(0, state.scrollY);
      } else {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
      }
      isBodyLockedRef.current = false;
      bodyLockStateRef.current = null;
    }
  }, [overlays.length]);

  const handleBack = useCallback(() => {
    if (overlaysRef.current.length === 0) return;
    isBackNavigationRef.current = true;
    if (overlaysRef.current.length === 1) {
      try {
        const topOverlay = overlaysRef.current[0];
        if (topOverlay) {
          sessionStorage.removeItem(`scroll:${topOverlay.storageKey}`);
        }
      } catch {}
      const fallback = getBasePath();
      const target = lastNonOverlayPathRef.current || fallback;
      navigate(target, { state: { restoreScroll: true } });
    } else {
      const previous = overlaysRef.current[overlaysRef.current.length - 2];
      if (!previous) {
        navigate(getBasePath(), { state: { restoreScroll: true } });
        return;
      }
      const newPath = buildPathFromOverlay(previous);
      navigate(newPath, { state: { restoreScroll: true } });
    }
  }, [navigate, getBasePath, buildPathFromOverlay]);

  const handleClose = handleBack;

  // Navigate to a specific overlay in the stack
  const handleNavigateToOverlay = useCallback(
    (index: number) => {
      if (index < 0 || index >= overlaysRef.current.length) return;

      // Clean up scroll storage for overlays after the target index
      for (let i = index + 1; i < overlaysRef.current.length; i++) {
        try {
          const overlay = overlaysRef.current[i];
          if (overlay) {
            sessionStorage.removeItem(`scroll:${overlay.storageKey}`);
          }
        } catch {}
      }

      // If navigating to the first overlay and it's the only one, go back to base
      if (index === 0 && overlaysRef.current.length === 1) {
        try {
          const topOverlay = overlaysRef.current[0];
          if (topOverlay) {
            sessionStorage.removeItem(`scroll:${topOverlay.storageKey}`);
          }
        } catch {}
        const fallback = getBasePath();
        const target = lastNonOverlayPathRef.current || fallback;
        setOverlays([]);
        overlaysRef.current = [];
        navigate(target);
        return;
      }

      // Navigate to the target overlay
      const targetOverlay = overlaysRef.current[index];
      if (!targetOverlay) {
        navigate(getBasePath());
        return;
      }

      // Set flag to indicate we're navigating to an existing overlay
      isNavigatingToExistingOverlayRef.current = index;

      // Update the stack to only include overlays up to the target index
      const newStack = overlaysRef.current.slice(0, index + 1).map((o, i) => ({
        ...o,
        isActive: i === index,
        isNew: false,
        skipTransition: i < index, // Skip transition for overlays before the target
      }));

      setOverlays(newStack);
      overlaysRef.current = newStack;

      const newPath = buildPathFromOverlay(targetOverlay);
      navigate(newPath);
    },
    [navigate, getBasePath, buildPathFromOverlay]
  );

  // Update overlay name for breadcrumbs by instanceKey
  const updateOverlayName = useCallback((instanceKey: string, name: string) => {
    setOverlays((prev) =>
      prev.map((overlay) =>
        overlay.instanceKey === instanceKey ? { ...overlay, name } : overlay
      )
    );
    overlaysRef.current = overlaysRef.current.map((overlay) =>
      overlay.instanceKey === instanceKey ? { ...overlay, name } : overlay
    );
  }, []);

  // Update overlay name for breadcrumbs by baseStorageKey (more reliable when navigating back)
  const updateOverlayNameByBaseKey = useCallback(
    (baseStorageKey: string, name: string) => {
      setOverlays((prev) =>
        prev.map((overlay) =>
          overlay.baseStorageKey === baseStorageKey
            ? { ...overlay, name }
            : overlay
        )
      );
      overlaysRef.current = overlaysRef.current.map((overlay) =>
        overlay.baseStorageKey === baseStorageKey
          ? { ...overlay, name }
          : overlay
      );
    },
    []
  );

  const overlayContextValue = useMemo(() => ({
    handleOverlayBack: handleBack,
    handleOverlayClose: handleClose,
    overlayStack: overlays,
    handleNavigateToOverlay,
    updateOverlayName,
    updateOverlayNameByBaseKey,
  }), [handleBack, handleClose, overlays, handleNavigateToOverlay, updateOverlayName, updateOverlayNameByBaseKey]);

  if (overlays.length === 0) return null;

  return (
    <OverlayProvider value={overlayContextValue}>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "var(--sidebar-width)",
          width: "calc(100vw - var(--sidebar-width))",
          zIndex: 3000,
          transition: "left 0.25s ease-in-out, width 0.25s ease-in-out",
          pointerEvents: "none",
        }}
      >
        {overlays.map((overlay) => {
          const overlayPath = buildPathFromOverlay(overlay);

          const syntheticLocation = {
            pathname: overlayPath,
            search: "",
            hash: "",
            state: null,
            key: overlay.instanceKey,
          } as any;

          return (
            <DetailOverlay
              key={overlay.instanceKey}
              storageKey={overlay.storageKey}
              isActive={overlay.isActive}
            >
              <Routes location={syntheticLocation}>
                <Route path="/peaks/:id" element={<PeakDetails />} />
                <Route path="/shelters/:id" element={<ShelterDetails />} />
                <Route path="/list-details/:id" element={<ListDetails />} />
                <Route path="/clubs" element={<DesktopClubsBrowse />} />
                <Route path="/clubs/:clubId" element={<DesktopClubDetails />} />
                <Route
                  path="/clubs/create"
                  element={
                    <ProtectedRoute>
                      <DesktopCreateEditClub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clubs/:clubId/edit"
                  element={
                    <ProtectedRoute>
                      <DesktopCreateEditClub />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/list-details/:id/:userId"
                  element={
                    <UserPrivacyProtectedRoute userIdParam="userId">
                      <ListDetails />
                    </UserPrivacyProtectedRoute>
                  }
                />
                <Route
                  path="/userpeaks"
                  element={
                    <ProtectedRoute>
                      <UserPeaks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/userpeaks/:id"
                  element={
                    <UserPrivacyProtectedRoute>
                      <UserPeaks />
                    </UserPrivacyProtectedRoute>
                  }
                />
                <Route
                  path="/saved-peaks"
                  element={
                    <ProtectedRoute>
                      <UserSavedPeaks />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/saved-shelters"
                  element={
                    <ProtectedRoute>
                      <UserSavedShelters />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/userroutes"
                  element={
                    <ProtectedRoute>
                      <UserRoutes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/userroutes/:id"
                  element={
                    <UserPrivacyProtectedRoute>
                      <UserRoutes />
                    </UserPrivacyProtectedRoute>
                  }
                />
                <Route
                  path="/routes/:routeId"
                  element={
                    <RoutePrivacyProtectedRoute>
                      <UserRouteDetails />
                    </RoutePrivacyProtectedRoute>
                  }
                />
           
                <Route
                  path="/externalprofile/:id"
                  element={<ExternalProfile />}
                />
                <Route
                  path="/addManualPeaks"
                  element={
                    <ProtectedRoute>
                      <AddManualPeaks />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </DetailOverlay>
          );
        })}
      </div>
    </OverlayProvider>
  );
}
