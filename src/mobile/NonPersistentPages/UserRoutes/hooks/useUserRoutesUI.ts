import { useState, useCallback, useEffect } from "react";
import type { FilterState } from "../types";

export const useUserRoutesUI = (initialFilters: FilterState) => {
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isSortDropdownClosing, setIsSortDropdownClosing] = useState(false);
  const [isFiltersPopupOpen, setIsFiltersPopupOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);

  // Sync local filters with parent filters when they change
  useEffect(() => {
    setLocalFilters(initialFilters);
  }, [initialFilters]);

  const handleRouteToggle = useCallback((routeId: string) => {
    setExpandedRoutes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(routeId)) {
        newSet.delete(routeId);
      } else {
        newSet.add(routeId);
      }
      return newSet;
    });
  }, []);

  const handleOpenFilters = useCallback(() => {
    setIsFiltersPopupOpen(true);
    setIsSortDropdownOpen(false);
    setIsSortDropdownClosing(false);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setIsFiltersPopupOpen(false);
  }, []);

  const handleUpdateFilters = useCallback(
    (newFilters: Partial<FilterState>) => {
      setLocalFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    const clearedFilters: FilterState = {
      searchQuery: "",
      startDate: null,
      endDate: null,
      admin_osm_ids: [],
      admin_names: [],
    };
    setLocalFilters(clearedFilters);
  }, []);

  const handleSortDropdownToggle = useCallback(() => {
    if (isSortDropdownOpen) {
      setIsSortDropdownClosing(true);
      setIsSortDropdownOpen(false);
      setTimeout(() => {
        setIsSortDropdownClosing(false);
      }, 150);
    } else {
      setIsSortDropdownOpen(true);
      setIsSortDropdownClosing(false);
      setIsFiltersPopupOpen(false);
    }
  }, [isSortDropdownOpen]);

  const handleSortDropdownClose = useCallback(() => {
    if (isSortDropdownOpen) {
      setIsSortDropdownClosing(true);
      setIsSortDropdownOpen(false);
      setTimeout(() => {
        setIsSortDropdownClosing(false);
      }, 150);
    }
  }, [isSortDropdownOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown]")) {
        setIsSortDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return {
    expandedRoutes,
    isSortDropdownOpen,
    isSortDropdownClosing,
    isFiltersPopupOpen,
    localFilters,
    handleRouteToggle,
    handleOpenFilters,
    handleCloseFilters,
    handleUpdateFilters,
    handleClearFilters,
    handleSortDropdownToggle,
    handleSortDropdownClose,
  };
};
