import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Routes, Route } from "react-router-dom";
import {
  OverlayProvider,
  type OverlayItem,
  type OverlayType,
} from "./OverlayContext";
import DetailOverlay from "./DetailOverlay";
import ProtectedRoute from "../../../shared/components/ProtectedRoute";
import UserPrivacyProtectedRoute from "../../../shared/components/UserPrivacyProtectedRoute";
import RoutePrivacyProtectedRoute from "../../../shared/components/RoutePrivacyProtectedRoute";

// Detail pages
import PeakDetails from "../../NonPersistentPages/PeakDetails/PeakDetails";
import ShelterDetails from "../../NonPersistentPages/ShelterDetails/ShelterDetails";
import ListDetails from "../../NonPersistentPages/ListDetails/ListDetails";
import ClubDetails from "../../NonPersistentPages/ClubDetails/ClubDetails";
import CreateEditClub from "../../NonPersistentPages/CreateEditClub/CreateEditClub";
import UserPeaks from "../../NonPersistentPages/UserPeaks/UserPeaks";
import UserSavedPeaks from "../../NonPersistentPages/UserSavedPeaks/UserSavedPeaks";
import UserSavedShelters from "../../NonPersistentPages/UserSavedShelters/UserSavedShelters";
import UserRoutes from "../../NonPersistentPages/UserRoutes/UserRoutes";
import UserRouteDetails from "../../NonPersistentPages/UserRouteDetails/UserRouteDetails";
import ExternalProfile from "../../NonPersistentPages/ExternalProfile/ExternalProfile";
import AddManualPeaks from "../../NonPersistentPages/AddManualPeaks/AddManualPeaks";

let overlayInstanceCounter = 0;
const TRANSIENT_NON_OVERLAY_PATHS = ["/createlist", "/editlist/"];

export default function OverlayStackManager() {
  const location = useLocation();
  const navigate = useNavigate();
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const overlaysRef = useRef<OverlayItem[]>([]);
  const prevPathRef = useRef<string>("");
  const lastNonOverlayPathRef = useRef<string>("");
  const lastPersistentPageScrollRef = useRef<Record<string, number>>({});
  const isBackNavigationRef = useRef(false);
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
    if (/\/addManualPeaks\/?$/.test(pathname)) {
      return {
        id: undefined,
        type: "add-manual-peaks" as OverlayType,
        baseStorageKey: "add-manual-peaks:root",
      };
    }
    return null;
  }, []);

  const getBasePath = useCallback(() => {
    return "/";
  }, []);

  const isTransientNonOverlayPath = useCallback((path: string) => {
    return TRANSIENT_NON_OVERLAY_PATHS.some((prefix) =>
      path.startsWith(prefix)
    );
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
      case "add-manual-peaks":
        return `/addManualPeaks`;
      case "userstats":
        return `/externalprofile/${overlay.id}`;
      default:
        return "/";
    }
  }, []);

  useEffect(() => {
    const parsed = parseOverlayFromUrl(location.pathname);
    const prevStack = overlaysRef.current;
    const currentPath = location.pathname;

    // reset flags
    isBackNavigationRef.current = false;

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

      // Preserve fallback when closing overlay flow via non-overlay routes
      if (!hadOverlayStack) {
        lastNonOverlayPathRef.current = `${location.pathname}${location.search}`;
      }

      const persistentPaths = ["/", "/explore", "/map", "/leaderboard", "/profile"];
      if (persistentPaths.includes(location.pathname)) {
        const currentPage = location.pathname;
        lastPersistentPageScrollRef.current[currentPage] = window.scrollY;
      }
      prevPathRef.current = currentPath;
      return;
    }

    // 0. Save current page scroll before showing overlay
    const prevPath = prevPathRef.current;
    const prevPersistentPaths = ["/", "/explore", "/map", "/leaderboard", "/profile"];
    const isPrevPersistent = prevPersistentPaths.includes(prevPath);
    if (isPrevPersistent && parsed) {
      lastPersistentPageScrollRef.current[prevPath] = window.scrollY;
    }

    // 2. Reconciliation: check if this overlay is already in the stack
    let matchIndex = -1;
    for (let i = prevStack.length - 1; i >= 0; i--) {
      if (prevStack[i]?.baseStorageKey === parsed.baseStorageKey) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex >= 0) {
      // It's already in the stack! Trim or update active.
      if (matchIndex < prevStack.length - 1) {
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
          skipTransition: true,
        }));
        
        setOverlays(trimmedStack);
        overlaysRef.current = trimmedStack;
      } else {
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

    // 3. Push new overlay
    if (prevStack.length === 0) {
      const prevPath = prevPathRef.current;
      const prevWasOverlay = !!parseOverlayFromUrl(prevPath || "");
      if (
        !prevWasOverlay &&
        !lastNonOverlayPathRef.current &&
        !isTransientNonOverlayPath(prevPath || "")
      ) {
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
  }, [location.pathname, isTransientNonOverlayPath, parseOverlayFromUrl]);

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
    
    const prevOverlay = overlaysRef.current[overlaysRef.current.length - 2];
    const target = overlaysRef.current.length === 1
      ? (lastNonOverlayPathRef.current || getBasePath())
      : (prevOverlay ? buildPathFromOverlay(prevOverlay) : getBasePath());

    if (overlaysRef.current.length === 1) {
      try {
        const topOverlay = overlaysRef.current[0];
        if (topOverlay) sessionStorage.removeItem(`scroll:${topOverlay.storageKey}`);
      } catch {}
    }

    navigate(target, { state: { restoreScroll: true } });
  }, [navigate, getBasePath, buildPathFromOverlay]);

  const handleClose = handleBack;

  const handleNavigateToOverlay = useCallback(
    (index: number) => {
      if (index < 0 || index >= overlaysRef.current.length) return;
      if (index === 0 && overlaysRef.current.length === 1) {
        handleBack();
        return;
      }
      const targetOverlay = overlaysRef.current[index];
      if (!targetOverlay) return;
      const newPath = buildPathFromOverlay(targetOverlay);
      navigate(newPath);
    },
    [navigate, handleBack, buildPathFromOverlay]
  );

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

  if (overlays.length === 0) return null;

  return (
    <OverlayProvider
      value={{
        handleOverlayBack: handleBack,
        handleOverlayClose: handleClose,
        overlayStack: overlays,
        handleNavigateToOverlay,
        updateOverlayName,
        updateOverlayNameByBaseKey,
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          zIndex: 3000,
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
            <div
              key={overlay.instanceKey}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                pointerEvents: overlay.isActive ? "auto" : "none",
                opacity: overlay.isActive ? 1 : 0,
              }}
            >
              <DetailOverlay storageKey={overlay.storageKey}>
                <Routes location={syntheticLocation}>
                  <Route path="/peaks/:id" element={<PeakDetails />} />
                  <Route path="/shelters/:id" element={<ShelterDetails />} />
                  <Route path="/list-details/:id" element={<ListDetails />} />
                  <Route path="/clubs/:clubId" element={<ClubDetails />} />
                  <Route
                    path="/clubs/create"
                    element={
                      <ProtectedRoute>
                        <CreateEditClub />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/clubs/:clubId/edit"
                    element={
                      <ProtectedRoute>
                        <CreateEditClub />
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
            </div>
          );
        })}
      </div>
    </OverlayProvider>
  );
}
