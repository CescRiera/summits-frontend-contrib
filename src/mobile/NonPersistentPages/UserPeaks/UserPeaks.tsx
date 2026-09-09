import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";

import { Loader2 } from "lucide-react";
import { UnifiedFiltersPopup } from "../../components/UnifiedFilters";
import type { UserPeak } from "../../../shared/api/types";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import LoginRequiredPopup from "../../components/LoginRequiredPopup/LoginRequiredPopup";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";

import styles from "./UserPeaks.module.css";
import { UnifiedControls } from "../../components/UnifiedFilters";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import OverlayInfoSection from "../../components/Overlay/OverlayInfoSection/OverlayInfoSection";
// Removed unused imports: getCountryFromHierarchy, getRegionFromHierarchy
import { useAdminLevels } from "../../../shared/hooks/useAdminLevels";
import PeakInfoModal from "./PeakInfoModal";
import PeakListItem from "../../components/PeakListItem/PeakListItem";
// SingleDatePicker usage moved into UnifiedFilterSection
import { useUserPeaksData } from "../../../shared/hooks/peaks/useUserPeaksData";
import type { FilterState, SortOption, SortField, SortDirection } from "../../../shared/hooks/peaks/types";



type DayData = {
  day: number;
  month: number;
  year: number;
  monthName: string;
  fullDate: string;
  peaks: UserPeak[];
};



// Memoized Timeline Day Component
const TimelineDay = memo(
  ({
    dayData,
    onPeakClick,
    onYourAscensionsClick,
    userName,
  }: {
    dayData: DayData;
    onPeakClick: (peakId: number) => void;
    onYourAscensionsClick?: (peak: UserPeak) => void;
    userName?: string;
  }) => {
    const { t } = useI18n();
    const dateKey = `${dayData.year}-${dayData.month
      .toString()
      .padStart(2, "0")}-${dayData.day.toString().padStart(2, "0")}`;

    return (
      <div key={dateKey} className={styles["userPeaks__day-section"]}>
        {/* Day Header - Non-clickable */}
        <div className={styles["userPeaks__day-header"]}>
          <span
            className={`${styles["userPeaks__day-title"]} typography-title-medium`}
          >
            {dayData.fullDate}
          </span>
        </div>

        {/* Day Peaks List */}
        <div className={styles["userPeaks__day-peaks-list"]}>
          {dayData.peaks.map((peak, peakIndex) => (
            <PeakListItem
              key={`timeline-peak-${dateKey}-${peak.id}-${peakIndex}`}
              peak={peak}
              onPeakClick={onPeakClick}
              {...(onYourAscensionsClick && { onYourAscensionsClick })}
              t={t}
              {...(userName !== undefined && { userName })}
            />
          ))}
        </div>
      </div>
    );
  },
);

TimelineDay.displayName = "TimelineDay";

const UserPeaks: React.FC = () => {
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const [searchParams] = useSearchParams();
  const { user, authReady } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { id } = useParams<{ id?: string }>();

  // Parse URL parameters for sorting
  const getInitialSortOption = useCallback((): SortOption => {
    const sortBy = searchParams.get("sortBy") as SortField | null;
    const direction = searchParams.get("direction") as SortDirection | null;

    if (sortBy && (sortBy === "name" || sortBy === "elevation" || sortBy === "date" || sortBy === "ascents")) {
      return { 
        field: sortBy, 
        direction: direction === "asc" || direction === "desc" ? direction : "desc" 
      };
    }

    return { field: "elevation", direction: "desc" };
  }, [searchParams]);

  // Initial values for state
  const initialFilters: FilterState = {
    searchQuery: "",
    startDate: null,
    endDate: null,
    elevationRange: [0, 8849],
    admin_osm_ids: [],
    admin_names: [],
  };

  const initialSort: SortOption = {
    field: "elevation",
    direction: "desc",
  };

  // State
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [sortOption, setSortOption] = useState<SortOption>(initialSort);
  const [searchQuery, setSearchQuery] = useState("");
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showPeakInfoModal, setShowPeakInfoModal] = useState(false);
  const [selectedPeakId, setSelectedPeakId] = useState<number | null>(null);

  // Memoize order sections for performance
  const orderSections = useMemo(() => [
    {
      title: t("listDetails.sorting.name"),
      options: [
        {
          field: "name" as const,
          direction: "asc" as const,
          label: t("listDetails.sortingOptions.nameAsc"),
        },
        {
          field: "name" as const,
          direction: "desc" as const,
          label: t("listDetails.sortingOptions.nameDesc"),
        },
      ],
    },
    {
      title: t("listDetails.sorting.elevation"),
      options: [
        {
          field: "elevation" as const,
          direction: "asc" as const,
          label: t("listDetails.sortingOptions.elevationAsc"),
        },
        {
          field: "elevation" as const,
          direction: "desc" as const,
          label: t("listDetails.sortingOptions.elevationDesc"),
        },
      ],
    },
    {
      title: t("listDetails.sorting.ascents"),
      options: [
        {
          field: "ascents" as const,
          direction: "desc" as const,
          label: t("listDetails.sortingOptions.ascentsMost"),
        },
        {
          field: "ascents" as const,
          direction: "asc" as const,
          label: t("listDetails.sortingOptions.ascentsLeast"),
        },
      ],
    },
    {
      title: t("listDetails.sorting.date"),
      options: [
        {
          field: "date" as const,
          direction: "desc" as const,
          label: t("listDetails.sortingOptions.dateNewest"),
        },
        {
          field: "date" as const,
          direction: "asc" as const,
          label: t("listDetails.sortingOptions.dateOldest"),
        },
      ],
    },
  ], [t]);

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const hasTriggeredLoadMoreRef = useRef(false);
  const hasUserScrolledRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Admin hierarchy levels for location filtering
  const { adminLevels, handleAdminLevelChange, resetAdminLevels } = useAdminLevels(
    useCallback(({ ids, names }: { ids: number[]; names: string[] }) => {
      setLocalFilters(prev => ({ 
        ...prev, 
        admin_osm_ids: ids, 
        admin_names: names 
      }));
    }, [])
  );

  // Hook for data fetching
  const {
    peaksData,
    allPeaks,
    loading,
    isLoadingMore,
    isLoadingPeaks,
    hasMore,
    currentPage,
    error,
    fetchPeaks,
    setAllPeaks,
  } = useUserPeaksData(user, filters, sortOption, id);

  // Update local filters when filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // View mode based on sort field
  const viewMode = useMemo(() => {
    return sortOption.field === "date" ? "date" : "grid";
  }, [sortOption.field]);

  // Handle transition timeout
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isTransitioning]);

  // Update sort option when URL parameters change
  useEffect(() => {
    const newSortOption = getInitialSortOption();
    setSortOption((prev) =>
      prev.field === newSortOption.field &&
      prev.direction === newSortOption.direction
        ? prev
        : newSortOption,
    );
  }, [getInitialSortOption]);

  const handleYourAscensionsClick = useCallback((peak: UserPeak) => {
    setSelectedPeakId(peak.id);
    setShowPeakInfoModal(true);
    trackEvent("interaction", `userPeaks_peak_info_open_${peak.id}`);
  }, [trackEvent]);

  const handlePeakDeleted = useCallback(() => {
    if (selectedPeakId) {
      setAllPeaks((prev) => prev.filter((p) => p.id !== selectedPeakId));
    }
  }, [selectedPeakId, setAllPeaks]);

  const handleCloseFilterPopup = useCallback(() => {
    setShowFilterPopup(false);
  }, []);

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
    };

    const handleTouchStart = (event: TouchEvent) => {
      const target = event.target as Node;

      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(target)
      ) {
        setIsSortDropdownOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      // Don't close dropdown when scrolling within dropdown menus
      const target = e.target as Element;
      if (
        target &&
        (target.closest("[data-dropdown]") ||
          target.closest(".orderby__menu") ||
          target.closest(".unified-filters-popup"))
      ) {
        return; // Don't close dropdown when scrolling within these elements
      }
      setIsSortDropdownOpen(false);
    };

    const handleResize = () => {
      setIsSortDropdownOpen(false);
    };

    // Prevent body scroll when any dropdown is open
    const preventScroll = (e: Event) => {
      // Allow scrolling within dropdown menus
      const target = e.target as Element;
      if (
        target &&
        (target.closest("[data-dropdown]") ||
          target.closest(".orderby__menu") ||
          target.closest(".unified-filters-popup"))
      ) {
        return; // Allow scrolling within these elements
      }
      e.preventDefault();
    };

    const isAnyDropdownOpen = isSortDropdownOpen;

    if (isAnyDropdownOpen) {
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
    }
    return undefined;
  }, [isSortDropdownOpen]);

  /* Legacy fetchUserPeaks removed - handled by hook */

  // Process peaks data into hierarchical structure for timeline view
  const processedData = useMemo(() => {
    if (!allPeaks.length) return { days: [], allPeaks: [] };

    // Group by date (year, month, day) - flat structure
    const dateMap = new Map<string, UserPeak[]>();

    allPeaks.forEach((peak) => {
      if (peak.user?.routes?.length) {
        peak.user.routes.forEach((route) => {
          const date = new Date(route.date);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          const day = date.getDate();
          const dateKey = `${year}-${month.toString().padStart(2, "0")}-${day
            .toString()
            .padStart(2, "0")}`;

          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, []);
          }
          dateMap.get(dateKey)!.push(peak);
        });
      }
    });

    // Convert to array structure - flat list of days
    const days: DayData[] = Array.from(dateMap.entries())
      .map(([dateKey, dayPeaks]) => {
        const [year, month, day] = dateKey.split("-").map(Number);
        const date = new Date(year ?? 0, (month ?? 0) - 1, day ?? 0);

        return {
          day: day ?? 0,
          month: month ?? 0,
          year: year ?? 0,
          monthName: date.toLocaleString("default", { month: "short" }),
          fullDate: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          peaks: dayPeaks,
        };
      })
      .sort((a, b) => {
        // Sort days based on the current sort option
        if (sortOption.field === "date") {
          const aDate = new Date(a.year, a.month - 1, a.day).getTime();
          const bDate = new Date(b.year, b.month - 1, b.day).getTime();

          if (sortOption.direction === "asc") {
            return aDate - bDate; // Oldest first
          } else {
            return bDate - aDate; // Newest first
          }
        } else {
          // For non-date sorting, maintain the original order (most recent first)
          const aDate = new Date(a.year, a.month - 1, a.day).getTime();
          const bDate = new Date(b.year, b.month - 1, b.day).getTime();
          return bDate - aDate; // Most recent first
        }
      });

    return { days, allPeaks: allPeaks };
  }, [allPeaks, sortOption]);

  /* availableCountries and availableRegions removed - handled by hook */

  // Memoized event handlers
  const handleSortChange = useCallback(
    (field: SortField, direction: SortDirection) => {
      const newSortOption = { field, direction };
      if (
        newSortOption.field === sortOption.field &&
        newSortOption.direction === sortOption.direction
      )
        return;

      // Close dropdown immediately
      setIsSortDropdownOpen(false);

      // Track sort change
      trackEvent("sort_change", `userPeaks_${field}_${direction}`);

      // Then start loading and transition
      setIsTransitioning(true);
      setSortOption(newSortOption);
    },
    [sortOption, trackEvent],
  );

  const handlePeakClick = useCallback(
    (peakId: number) => {
      trackEvent("peak_click", `userPeaks_${peakId}`);
      navigate(`/peaks/${peakId}`);
    },
    [navigate, trackEvent],
  );

  const handleLoadMore = useCallback(() => {
    trackEvent("pagination", "userPeaks_load_more");
    if (hasMore && !isLoadingMore && !isLoadingPeaks) {
      fetchPeaks(currentPage + 1);
    }
  }, [
    currentPage,
    fetchPeaks,
    hasMore,
    isLoadingMore,
    isLoadingPeaks,
    trackEvent,
  ]);

  const maybeTriggerLoadMore = useCallback(() => {
    if (
      !hasMore ||
      isLoadingMore ||
      isLoadingPeaks ||
      loading ||
      allPeaks.length === 0 ||
      !hasUserScrolledRef.current ||
      hasTriggeredLoadMoreRef.current
    ) {
      return;
    }

    hasTriggeredLoadMoreRef.current = true;
    handleLoadMore();
  }, [
    allPeaks.length,
    handleLoadMore,
    hasMore,
    isLoadingMore,
    isLoadingPeaks,
    loading,
  ]);

  const checkSentinelNearViewport = useCallback(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) {
      return;
    }

    const rect = sentinel.getBoundingClientRect();
    if (rect.top - window.innerHeight < 250) {
      maybeTriggerLoadMore();
    }
  }, [maybeTriggerLoadMore]);

  const handleSortDropdownToggle = useCallback(() => {
    if (!loading) {
      trackEvent("button_click", `userPeaks_sort_dropdown_${isSortDropdownOpen ? "close" : "open"}`);
      setIsSortDropdownOpen(!isSortDropdownOpen);
    }
  }, [loading, isSortDropdownOpen, trackEvent]);

  const handleBack = () => {
    if (overlayContext) {
      overlayContext.handleOverlayBack();
    } else {
      navigate(-1);
    }
  };

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      setSearchQuery(query);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        const trimmed = query.trim();
        const previous = (filters.searchQuery || "").trim();

        if (trimmed !== previous) {
          // Only search if 2+ characters or clearing search
          if (trimmed.length === 0 || trimmed.length >= 2) {
            trackEvent("search_query", `userPeaks_${trimmed.length}`);
            setIsTransitioning(true);
            setFilters((prev) => ({ ...prev, searchQuery: trimmed }));
          }
        }
      }, 500); // 500ms debounce
    },
    [filters.searchQuery, trackEvent],
  );

  const handleSearchClear = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    trackEvent("search_query", "userPeaks_clear");
    setSearchQuery("");
    setIsTransitioning(true);
    setFilters(prev => ({ ...prev, searchQuery: "" }));
  }, [trackEvent]);

  const handleOpenFilterPopup = useCallback(() => {
    // Sync local filters with current filters when opening
    trackEvent("button_click", "userPeaks_filters_open");
    setLocalFilters(filters);
    setShowFilterPopup(true);
  }, [filters, trackEvent]);

  const handleApplyFilters = useCallback(() => {
    // Track filter application
    trackEvent("interaction", "userPeaks_filters_apply");
    // Apply local filters to main filters
    setFilters(localFilters);
    setIsTransitioning(true);
    handleCloseFilterPopup();
  }, [localFilters, handleCloseFilterPopup, trackEvent]);

  // Local filter handlers (for popup)
  const updateLocalFilters = useCallback((newFilters: Partial<FilterState>) => {
    setLocalFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearAllFilters = useCallback(() => {
    trackEvent("filter_change", "userPeaks_clear_all");
    const clearedFilters: FilterState = {
      startDate: null,
      endDate: null,
      elevationRange: [0, 8849] as [number, number],
      admin_osm_ids: [],
      admin_names: [],
      searchQuery: "",
    };
    setFilters(clearedFilters);
    setLocalFilters(clearedFilters);
    resetAdminLevels();
    setSearchQuery("");
    setIsTransitioning(true);
    handleCloseFilterPopup();
  }, [handleCloseFilterPopup, trackEvent, resetAdminLevels]);

  // Check if any filters are active (for filter button styling)
  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchQuery !== "" ||
      filters.startDate !== null ||
      filters.endDate !== null ||
      (filters.admin_osm_ids && filters.admin_osm_ids.length > 0) ||
      filters.elevationRange[0] > 0 ||
      filters.elevationRange[1] < 8849
    );
  }, [filters]);

  useEffect(() => {
    if (isLoadingPeaks || isLoadingMore) {
      return;
    }
    hasTriggeredLoadMoreRef.current = false;
    if (hasUserScrolledRef.current) {
      checkSentinelNearViewport();
    }
  }, [allPeaks.length, checkSentinelNearViewport, isLoadingMore, isLoadingPeaks]);

  useEffect(() => {
    if (currentPage === 1) {
      hasUserScrolledRef.current = false;
    }
  }, [currentPage]);

  useEffect(() => {
    if (!hasMore || allPeaks.length === 0 || loading) {
      return;
    }

    const handleUserScroll = () => {
      hasUserScrolledRef.current = true;
      checkSentinelNearViewport();
    };

    document.addEventListener("scroll", handleUserScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", checkSentinelNearViewport);

    return () => {
      document.removeEventListener("scroll", handleUserScroll, true);
      window.removeEventListener("resize", checkSentinelNearViewport);
    };
  }, [
    allPeaks.length,
    hasMore,
    loading,
    checkSentinelNearViewport,
  ]);

  const waitingForAuth = !id && !authReady && !user;

  if (loading || waitingForAuth) {
    return (
      <div className={styles["userPeaks"]}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  if (error || (!peaksData && !waitingForAuth)) {
    return (
      <div className={styles["userPeaks"]}>
        <div className={styles["userPeaks__content"]}>
          <OverlayHeader title={t("main.myPeaks")} onBack={handleBack} />
          <div
            className={`${styles["userPeaks__error-container"]} typography-body-small`}
          >
            <p className="typography-body-medium">
              {error || "Failed to load peaks"}
            </p>
            <button
              className={styles["userPeaks__retry-button"]}
              onClick={() => {
                trackEvent("button_click", "userPeaks_retry");
                window.location.reload();
              }}
            >
              {t("common.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!peaksData) {
    return null;
  }

  return (
    <>
      <div className={styles["userPeaks"]}>
        <div className={styles["userPeaks__content"]}>
          {/* Login Required Popup */}
          <LoginRequiredPopup
            isOpen={showLoginPopup}
            onClose={() => {
              trackEvent("interaction", "userPeaks_login_required_closed");
              setShowLoginPopup(false);
            }}
            message="auth.loginRequired.myPeaks"
          />

          {/* Header Section */}
          <OverlayHeader
            title={
              id && peaksData?.user_name
                ? t("userPeaks.userTitle", { userName: peaksData.user_name })
                : t("userPeaks.title")
            }
            onBack={handleBack}
            rightContent={undefined}
          />

          {/* Description and Stats Section */}
          <OverlayInfoSection
            stats={[
              {
                label: t("main.totalPeaks"),
                value: peaksData.total_peaks,
                variant: "primary",
              },
            ]}
            showMapButton={!id}
            onMapClick={() => {
              trackEvent("button_click", `userPeaks_map_open_${id ? "external" : "self"}`);
              if (id) {
                // For external user peaks, navigate to map with userId parameter
                navigate(`/map?userId=${id}`);
              } else {
                // For current user's peaks, navigate to map with userPeaks parameter
                navigate(`/map?userPeaks=true`);
              }
            }}
          />

          {/* Add Peaks Button - only for current user */}
          {!id && (
            <div className={styles["userPeaks__add-peaks-button"]}>
              <button
                className={`${styles["userPeaks__add-peaks-btn"]} typography-label-large`}
                onClick={() => {
                  trackEvent("button_click", "userPeaks_add_manual_open");
                  navigate("/addManualPeaks");
                }}
              >
                {t("userPeaks.addPeaks")}
              </button>
            </div>
          )}
          {/* Controls */}
          <div className={styles["userPeaks__filters-wrapper"]}>
            <UnifiedControls
              searchValue={searchQuery || ""}
              searchPlaceholder={t("userPeaks.searchPlaceholder")}
              onSearchChange={handleSearchChange}
              onSearchClear={handleSearchClear}
              filtersLabel={t("userPeaks.filters")}
              hasActiveFilters={hasActiveFilters}
              onOpenFilters={handleOpenFilterPopup}
              orderLabel={
                sortOption.field === "name"
                  ? t("listDetails.sorting.name")
                  : sortOption.field === "elevation"
                  ? t("listDetails.sorting.elevation")
                  : sortOption.field === "ascents"
                  ? t("listDetails.sorting.ascents")
                  : t("listDetails.sorting.date")
              }
              orderValue={
                sortOption as {
                  field: "name" | "elevation" | "ascents" | "date";
                  direction: "asc" | "desc";
                }
              }
              orderSections={orderSections}
              isOrderOpen={isSortDropdownOpen}
              isOrderClosing={false}
              onOrderToggle={handleSortDropdownToggle}
              onOrderChange={(f, d) =>
                handleSortChange(
                  f as "name" | "elevation" | "ascents" | "date",
                  d,
                )
              }
              orderDisabled={loading || isLoadingPeaks}
            />
          </div>

          <UnifiedFiltersPopup
            isOpen={showFilterPopup}
            scope="userPeaks"
            t={t}
            localFilters={localFilters}
            adminLevels={adminLevels}
            onAdminLevelChange={handleAdminLevelChange}
            onClose={handleCloseFilterPopup}
            onUpdateFilters={updateLocalFilters}
            onClearFilters={clearAllFilters}
            onApplyFilters={handleApplyFilters}
          />

          {/* Content Area */}
          <div className={styles["userPeaks__content-area"]}>
            {/* Loading Spinner */}
            {(loading || isLoadingPeaks) && (
              <div className={styles["userPeaks__content-loading-spinner"]}>
                <Loader2
                  size={24}
                  className={styles["userPeaks__loading-spinner"]}
                />
                <p className={`${styles["userPeaks__loading-text"]} typography-body-small`}>
                  {t("listDetails.loading")}
                </p>
              </div>
            )}

            {/* Timeline View - Flat Daily List */}
            {!(loading || isLoadingPeaks) && viewMode === "date" && (
              <>
                <div className={styles["userPeaks__timeline-view"]}>
                  {!processedData.days || processedData.days.length === 0 ? (
                    <div className={styles["userPeaks__no-results"]}>
                      <p className="typography-body-medium">
                        {t("userPeaks.noResults")}
                      </p>
                    </div>
                  ) : (
                    <div className={styles["userPeaks__timeline-container"]}>
                      {processedData.days.map((dayData) => {
                        const userName =
                          id && peaksData?.user_name
                            ? peaksData.user_name
                            : undefined;
                        return (
                          <TimelineDay
                            key={`${dayData.year}-${dayData.month}-${dayData.day}`}
                            dayData={dayData}
                            onPeakClick={handlePeakClick}
                            {...(!id && { onYourAscensionsClick: handleYourAscensionsClick })}
                            {...(userName !== undefined && { userName })}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* List View (for non-date sorting) */}
            {!(loading || isLoadingPeaks) && viewMode === "grid" && (
              <div
                className={`${styles["userPeaks__list-container"]} ${
                  isTransitioning
                    ? styles["userPeaks__list-container--transitioning"]
                    : styles["userPeaks__list-container--loaded"]
                }`}
              >
                {allPeaks.length === 0 ? (
                  <div className={styles["userPeaks__no-results"]}>
                    <p className="typography-body-medium">
                      {t("userPeaks.noResults")}
                    </p>
                  </div>
                ) : (
                  <div className={styles["userPeaks__list"]}>
                    {allPeaks.map((peak, index) => {
                      const userName =
                        id && peaksData?.user_name
                          ? peaksData.user_name
                          : undefined;
                      return (
                        <PeakListItem
                          key={`list-peak-${peak.id}-${index}`}
                          peak={peak}
                          onPeakClick={handlePeakClick}
                          {...(!id && { onYourAscensionsClick: handleYourAscensionsClick })}
                          t={t}
                          {...(userName !== undefined && { userName })}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!loading && !isLoadingPeaks && hasMore && allPeaks.length > 0 && (
              <div
                ref={loadMoreSentinelRef}
                className={`${styles["userPeaks__load-more-container"]} ${
                  !isLoadingMore ? styles["userPeaks__load-more-container--idle"] : ""
                }`}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2
                      className={styles["userPeaks__load-more-spinner"]}
                      size={20}
                    />
                    <span className="typography-label-medium">
                      {t("listDetails.loading")}
                    </span>
                  </>
                ) : (
                  <div style={{ height: "1px" }} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <PeakInfoModal
        isOpen={showPeakInfoModal}
        peakId={selectedPeakId}
        onClose={() => {
          setShowPeakInfoModal(false);
          setSelectedPeakId(null);
        }}
        onPeakDeleted={handlePeakDeleted}
      />
    </>
  );
};

export default UserPeaks;
