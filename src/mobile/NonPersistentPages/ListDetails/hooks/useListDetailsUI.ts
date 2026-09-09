import { useState, useEffect, useCallback, useRef } from "react";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";
import { type SortOption, type FilterMode } from "../types";

export const useListDetailsUI = (
  initialSortOption: SortOption,
  initialFilterMode: FilterMode,
  user: unknown
): {
  sortOption: SortOption;
  filterMode: FilterMode;
  searchQuery: string;
  isTransitioning: boolean;
  isSortDropdownOpen: boolean;
  isFilterDropdownOpen: boolean;
  isLoading: boolean;
  showLoginPopup: boolean;
  loginPopupMessage: string;
  sortDropdownRef: React.RefObject<HTMLDivElement | null>;
  filterDropdownRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  handleSortChange: (
    field: SortOption["field"],
    direction: SortOption["direction"]
  ) => void;
  handleFilterChange: (mode: FilterMode) => void;
  handleSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSearchClear: () => void;
  handleSortDropdownToggle: () => void;
  handleFilterDropdownToggle: () => void;
  handleCloseLoginPopup: () => void;
} => {
  const [sortOption, setSortOption] = useState<SortOption>(initialSortOption);
  const [filterMode, setFilterMode] = useState<FilterMode>(initialFilterMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [loginPopupMessage, setLoginPopupMessage] = useState("");

  const { trackEvent } = useAnalytics();
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Handle transition timeout
  useEffect(() => {
    if (!isTransitioning) {
      return;
    }
    const timer = setTimeout(() => {
      setIsTransitioning(false);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [isTransitioning]);

  // Handle various events to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(target)
      ) {
        setIsSortDropdownOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(target)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      const target = event.target as Node;
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(target)
      ) {
        setIsSortDropdownOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(target)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      // Don't close dropdown when scrolling within dropdown menus
      const target = e.target as Element;
      if (
        target &&
        (target.closest("[data-dropdown]") ||
          target.closest(".searchAndFilters__dropdownMenu"))
      ) {
        return; // Don't close dropdown when scrolling within these elements
      }
      setIsSortDropdownOpen(false);
      setIsFilterDropdownOpen(false);
    };

    const handleResize = () => {
      setIsSortDropdownOpen(false);
      setIsFilterDropdownOpen(false);
    };

    // Prevent body scroll when any dropdown is open
    const preventScroll = (e: Event) => {
      // Allow scrolling within dropdown menus
      const target = e.target as Element;
      if (
        target &&
        (target.closest("[data-dropdown]") ||
          target.closest(".searchAndFilters__dropdownMenu"))
      ) {
        return; // Allow scrolling within these elements
      }
      e.preventDefault();
    };

    const isAnyDropdownOpen = isSortDropdownOpen || isFilterDropdownOpen;

    if (!isAnyDropdownOpen) {
      return;
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    // Prevent scrolling on body
    document.body.style.overflow = "hidden";
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);

      // Restore scrolling
      document.body.style.overflow = "";
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [isSortDropdownOpen, isFilterDropdownOpen]);

  const handleSortChange = useCallback(
    (field: SortOption["field"], direction: SortOption["direction"]) => {
      // Check if user is authenticated for date sorting
      if (field === "date" && !user) {
        trackEvent("interaction", "listDetails_sort_requires_login");
        setLoginPopupMessage("auth.loginRequired.sortByDate");
        setShowLoginPopup(true);
        setIsSortDropdownOpen(false);
        return;
      }

      const newSortOption = { field, direction };
      if (
        newSortOption.field === sortOption.field &&
        newSortOption.direction === sortOption.direction
      )
        return;

      // If sorting by date or ascents, automatically switch to completed filter
      if (
        (field === "date" || field === "ascents") &&
        filterMode !== "completed"
      ) {
        setFilterMode("completed");
      }

      // Close dropdown immediately
      setIsSortDropdownOpen(false);

      // Track sort change
      trackEvent("sort_change", `listDetails_${field}_${direction}`);

      // Then start loading and transition
      setIsLoading(true);
      setIsTransitioning(true);
      setSortOption(newSortOption);
    },
    [sortOption, user, filterMode, trackEvent]
  );

  const handleFilterChange = useCallback(
    (mode: FilterMode) => {
      if (mode === filterMode) return;

      // Check if user is authenticated for completed/missing filters
      if ((mode === "completed" || mode === "missing") && !user) {
        trackEvent("interaction", "listDetails_filter_requires_login");
        setLoginPopupMessage("auth.loginRequired.filterPeaks");
        setShowLoginPopup(true);
        setIsFilterDropdownOpen(false);
        return;
      }

      // If switching to All or Missing, and currently sorting by date or ascents, switch to name sorting
      if (
        (mode === "all" || mode === "missing") &&
        (sortOption.field === "date" || sortOption.field === "ascents")
      ) {
        setSortOption({ field: "name", direction: "asc" });
      }

      // Close dropdown immediately
      setIsFilterDropdownOpen(false);

      // Track filter change
      trackEvent("filter_change", `listDetails_${mode}`);

      // Then start loading and transition
      setIsLoading(true);
      setIsTransitioning(true);
      setFilterMode(mode);
    },
    [filterMode, user, sortOption.field, trackEvent]
  );

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      const previous = searchQuery.trim();
      setSearchQuery(query);
      const trimmed = query.trim();
      if (trimmed !== previous && (trimmed.length === 0 || trimmed.length === 2 || trimmed.length % 5 === 0)) {
        trackEvent("search_query", `listDetails_${trimmed.length}`);
      }

      // Trigger loading state for search
      if (query.trim() !== searchQuery.trim()) {
        setIsLoading(true);
        setIsTransitioning(true);
      }
    },
    [searchQuery, trackEvent]
  );

  const handleSearchClear = useCallback(() => {
    trackEvent("search_query", "listDetails_clear");
    setSearchQuery("");
    setIsLoading(true);
    setIsTransitioning(true);
  }, [trackEvent]);

  const handleSortDropdownToggle = useCallback(() => {
    if (!isLoading) {
      trackEvent("button_click", `listDetails_sort_dropdown_${isSortDropdownOpen ? "close" : "open"}`);
      setIsSortDropdownOpen(!isSortDropdownOpen);
    }
  }, [isLoading, isSortDropdownOpen, trackEvent]);

  const handleFilterDropdownToggle = useCallback(() => {
    if (!isLoading) {
      trackEvent("button_click", `listDetails_filter_dropdown_${isFilterDropdownOpen ? "close" : "open"}`);
      setIsFilterDropdownOpen(!isFilterDropdownOpen);
    }
  }, [isLoading, isFilterDropdownOpen, trackEvent]);

  const handleCloseLoginPopup = useCallback(() => {
    trackEvent("interaction", "listDetails_login_popup_closed");
    setShowLoginPopup(false);
  }, [trackEvent]);

  return {
    // State
    sortOption,
    filterMode,
    searchQuery,
    isTransitioning,
    isSortDropdownOpen,
    isFilterDropdownOpen,
    isLoading,
    showLoginPopup,
    loginPopupMessage,

    // Refs
    sortDropdownRef,
    filterDropdownRef,
    searchInputRef,

    // Handlers
    handleSortChange,
    handleFilterChange,
    handleSearchChange,
    handleSearchClear,
    handleSortDropdownToggle,
    handleFilterDropdownToggle,
    handleCloseLoginPopup,
  };
};
