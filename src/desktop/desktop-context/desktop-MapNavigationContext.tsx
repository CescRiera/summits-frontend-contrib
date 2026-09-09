import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface PeakData {
  name: string;
  name_en?: string | null;
  elevation: number;
}

export interface ShelterData {
  name: string;
  name_en?: string | null;
  elevation?: number | null;
  shelter_type: string;
}

interface MapNavigationState {
  targetCoordinates: { lat: number; lng: number } | null;
  targetPeakId: number | null;
  targetPeakData: PeakData | null;
  targetShelterId: number | null;
  targetShelterData: ShelterData | null;
  shouldNavigateToMap: boolean;
  resetMapState: boolean;
}

interface MapNavigationContextType {
  navigationState: MapNavigationState;
  navigateToMapWithPeak: (
    peakId: number,
    coordinates: { lat: number; lng: number },
    peakData?: PeakData,
    resetMapState?: boolean
  ) => void;
  navigateToMapWithShelter: (
    shelterId: number,
    coordinates: { lat: number; lng: number },
    shelterData?: ShelterData,
    resetMapState?: boolean
  ) => void;
  clearNavigation: () => void;
}

const MapNavigationContext = createContext<
  MapNavigationContextType | undefined
>(undefined);

export const useMapNavigation = () => {
  const context = useContext(MapNavigationContext);
  if (!context) {
    throw new Error(
      "useMapNavigation must be used within a MapNavigationProvider"
    );
  }
  return context;
};

interface MapNavigationProviderProps {
  children: ReactNode;
}

export const MapNavigationProvider: React.FC<MapNavigationProviderProps> = ({
  children,
}) => {
  const [navigationState, setNavigationState] = useState<MapNavigationState>({
    targetCoordinates: null,
    targetPeakId: null,
    targetPeakData: null,
    targetShelterId: null,
    targetShelterData: null,
    shouldNavigateToMap: false,
    resetMapState: false,
  });

  const navigateToMapWithPeak = useCallback(
    (
      peakId: number,
      coordinates: { lat: number; lng: number },
      peakData?: PeakData,
      resetMapState: boolean = false
    ) => {
      setNavigationState({
        targetCoordinates: coordinates,
        targetPeakId: peakId,
        targetPeakData: peakData || null,
        targetShelterId: null,
        targetShelterData: null,
        shouldNavigateToMap: true,
        resetMapState,
      });
    },
    []
  );

  const navigateToMapWithShelter = useCallback(
    (
      shelterId: number,
      coordinates: { lat: number; lng: number },
      shelterData?: ShelterData,
      resetMapState: boolean = false
    ) => {
      setNavigationState({
        targetCoordinates: coordinates,
        targetPeakId: null,
        targetPeakData: null,
        targetShelterId: shelterId,
        targetShelterData: shelterData || null,
        shouldNavigateToMap: true,
        resetMapState,
      });
    },
    []
  );

  const clearNavigation = useCallback(() => {
    setNavigationState({
      targetCoordinates: null,
      targetPeakId: null,
      targetPeakData: null,
      targetShelterId: null,
      targetShelterData: null,
      shouldNavigateToMap: false,
      resetMapState: false,
    });
  }, []);

  return (
    <MapNavigationContext.Provider
      value={{
        navigationState,
        navigateToMapWithPeak,
        navigateToMapWithShelter,
        clearNavigation,
      }}
    >
      {children}
    </MapNavigationContext.Provider>
  );
};
