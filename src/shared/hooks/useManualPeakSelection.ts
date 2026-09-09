import { useState, useCallback, useMemo } from "react";

/**
 * Represents a peak selected for manual addition with optional route association
 */
export interface SelectedManualPeak {
  peak_id: number;
  route_id: number | null; // null = standalone, otherwise associated route
  date?: string | null; // YYYY-MM-DD for manual route creation
}

/**
 * Filter state for discovery endpoint
 */
export interface ManualPeakFilters {
  query: string; // Peak name search (minimum 2 characters)
  admin_osm_ids: number[] | null;
  min_elevation: number | null;
  max_elevation: number | null;
}

/**
 * Hook for managing multi-peak selection, route associations, and filters
 * Handles state for the Manual Peak Addition flow
 */
export const useManualPeakSelection = () => {
  // Track selected peaks with their route associations
  const [selectedPeaks, setSelectedPeaks] = useState<SelectedManualPeak[]>([]);

  // Filter state for discovery API
  const [filters, setFilters] = useState<ManualPeakFilters>({
    query: "",
    admin_osm_ids: null,
    min_elevation: null,
    max_elevation: null,
  });

  /**
   * Toggle a peak's selection status
   * If already selected, remove it
   * If not selected, add it as standalone (route_id = null)
   */
  const togglePeakSelection = useCallback((peakId: number) => {
    setSelectedPeaks((prev) => {
      const isSelected = prev.some((p) => p.peak_id === peakId);
      if (isSelected) {
        return prev.filter((p) => p.peak_id !== peakId);
      } else {
        return [...prev, { peak_id: peakId, route_id: null }];
      }
    });
  }, []);

  /**
   * Associate a selected peak with a route
   * If route_id is null, converts to standalone
   */
  const associateRoute = useCallback(
    (peakId: number, routeId: number | null) => {
      setSelectedPeaks((prev) =>
        prev.map((p) =>
          p.peak_id === peakId ? { ...p, route_id: routeId } : p,
        ),
      );
    },
    [],
  );

  /**
   * Associate a date with a selected peak
   * When provided without route_id, backend creates a manual route with this date
   */
  const associateDate = useCallback(
    (peakId: number, date: string | null) => {
      setSelectedPeaks((prev) =>
        prev.map((p) =>
          p.peak_id === peakId ? { ...p, date } : p,
        ),
      );
    },
    [],
  );

  /**
   * Set the same date on all selected peaks
   */
  const setDateOnAll = useCallback((date: string | null) => {
    setSelectedPeaks((prev) =>
      prev.map((p) => ({ ...p, date })),
    );
  }, []);

  /**
   * Set the same route on all selected peaks
   */
  const setRouteOnAll = useCallback((routeId: number | null) => {
    setSelectedPeaks((prev) =>
      prev.map((p) => ({ ...p, route_id: routeId })),
    );
  }, []);

  /**
   * Check if a peak is currently selected
   */
  const isPeakSelected = useCallback(
    (peakId: number): boolean => {
      return selectedPeaks.some((p) => p.peak_id === peakId);
    },
    [selectedPeaks],
  );

  /**
   * Get the route association for a selected peak
   */
  const getSelectedRoute = useCallback(
    (peakId: number): number | null => {
      const peak = selectedPeaks.find((p) => p.peak_id === peakId);
      return peak?.route_id ?? null;
    },
    [selectedPeaks],
  );

  /**
   * Update a single filter
   */
  const updateFilter = useCallback(
    (
    key: keyof ManualPeakFilters,
    value: string | number | null | string[] | number[],
  ) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  /**
   * Update multiple filters at once
   */
  const updateFilters = useCallback((updates: Partial<ManualPeakFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Reset all filters to default state
   */
  const resetFilters = useCallback(() => {
    setFilters({
      query: "",
      admin_osm_ids: null,
      min_elevation: null,
      max_elevation: null,
    });
  }, []);

  /**
   * Clear all selected peaks
   */
  const clearSelection = useCallback(() => {
    setSelectedPeaks([]);
  }, []);

  /**
   * Remove a single peak from selection
   */
  const removePeak = useCallback((peakId: number) => {
    setSelectedPeaks((prev) => prev.filter((p) => p.peak_id !== peakId));
  }, []);

  /**
   * Prepare payload for addManualPeaks API call
   * Returns only the selected peaks with their route associations
   */
  const getSubmissionPayload = useCallback((): SelectedManualPeak[] => {
    return selectedPeaks;
  }, [selectedPeaks]);

  /**
   * Memoized count of selected peaks
   */
  const selectedPeakCount = useMemo(
    () => selectedPeaks.length,
    [selectedPeaks],
  );

  return {
    // Selection state
    selectedPeaks,
    selectedPeakCount,
    togglePeakSelection,
    associateRoute,
    associateDate,
    setDateOnAll,
    setRouteOnAll,
    removePeak,
    clearSelection,
    isPeakSelected,
    getSelectedRoute,

    // Filter state
    filters,
    updateFilter,
    updateFilters,
    resetFilters,

    // API preparation
    getSubmissionPayload,
  };
};
