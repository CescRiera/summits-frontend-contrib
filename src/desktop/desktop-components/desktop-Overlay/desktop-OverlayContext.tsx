import React, { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type OverlayType =
  | "peak"
  | "list"
  | "clubs-root"
  | "club"
  | "create-club"
  | "edit-club"
  | "userpeaks-root"
  | "userpeaks"
  | "saved-peaks-root"
  | "saved-shelters-root"
  | "userroutes-root"
  | "userroutes"
  | "route"
  | "userstats"
  | "add-manual-peaks"
  | "shelter";

export type OverlayItem = {
  id?: string; // optional for root overlays
  type: OverlayType;
  baseStorageKey: string; // e.g. peak:1, list:123:55, userpeaks:root
  storageKey: string; // includes instance key
  isActive: boolean;
  instanceKey: string;
  isNew?: boolean;
  skipTransition?: boolean;
  name?: string; // Display name for breadcrumbs (e.g., peak name, user name)
};

interface OverlayContextType {
  handleOverlayBack: () => void;
  handleOverlayClose: () => void;
  overlayStack: OverlayItem[];
  handleNavigateToOverlay: (index: number) => void;
  updateOverlayName: (instanceKey: string, name: string) => void;
  updateOverlayNameByBaseKey: (baseStorageKey: string, name: string) => void;
}

const OverlayContext = createContext<OverlayContextType | null>(null);

export const useOverlayContext = () => {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error("useOverlayContext must be used within an OverlayProvider");
  }
  return context;
};

export const useOptionalOverlayContext = () => {
  return useContext(OverlayContext);
};

interface OverlayProviderProps {
  children: ReactNode;
  value: OverlayContextType;
}

export const OverlayProvider: React.FC<OverlayProviderProps> = ({
  children,
  value,
}) => {
  return (
    <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
  );
};
