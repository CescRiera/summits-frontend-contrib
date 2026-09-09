/* eslint_disable react-refresh/only-export-components */
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface NavbarVisibilityContextType {
  isNavbarHidden: boolean;
  setNavbarHidden: (hidden: boolean) => void;
}

const NavbarVisibilityContext = createContext<NavbarVisibilityContextType | undefined>(undefined);

interface NavbarVisibilityProviderProps {
  children: ReactNode;
}

export const NavbarVisibilityProvider: React.FC<NavbarVisibilityProviderProps> = ({ children }) => {
  const [isNavbarHidden, setIsNavbarHidden] = useState(false);

  const setNavbarHidden = useCallback((hidden: boolean) => {
    setIsNavbarHidden(hidden);
  }, []);

  return (
    <NavbarVisibilityContext.Provider value={{ isNavbarHidden, setNavbarHidden }}>
      {children}
    </NavbarVisibilityContext.Provider>
  );
};

export const useNavbarVisibility = (): NavbarVisibilityContextType => {
  const context = useContext(NavbarVisibilityContext);
  if (context === undefined) {
    throw new Error("useNavbarVisibility must be used within a NavbarVisibilityProvider");
  }
  return context;
};

