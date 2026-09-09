import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { UnitSystem } from "../utils/unitConversions";

interface UnitSystemContextValue {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
}

const UnitSystemContext = createContext<UnitSystemContextValue | undefined>(
  undefined
);

export const useUnitSystem = (): UnitSystemContextValue => {
  const ctx = useContext(UnitSystemContext);
  if (!ctx)
    throw new Error("useUnitSystem must be used within UnitSystemProvider");
  return ctx;
};

const STORAGE_KEY = "unitSystem";
const VALID_VALUES: UnitSystem[] = ["metric", "imperial"];

export const UnitSystemProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as UnitSystem | null;
    if (stored && VALID_VALUES.includes(stored)) return stored;
    return "metric";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, unitSystem);
  }, [unitSystem]);

  const setUnitSystem = useCallback((system: UnitSystem) => {
    if (VALID_VALUES.includes(system)) {
      setUnitSystemState(system);
    }
  }, []);

  return (
    <UnitSystemContext.Provider value={{ unitSystem, setUnitSystem }}>
      {children}
    </UnitSystemContext.Provider>
  );
};
