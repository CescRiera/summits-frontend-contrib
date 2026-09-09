import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Calendar } from "lucide-react";
// option type is not needed here
import { unsavePeak } from "../../../shared/api/endpoints/user";
import type { UserSavedPeak } from "../../../shared/api/types";
import { useIntersectionObserver } from "../../desktop-hooks/desktop-useIntersectionObserver.ts";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import { removeImageSizeRestriction } from "../../../shared/utils/imageUtils";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";

import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useAdminLevels } from "../../../shared/hooks/useAdminLevels";
import { useUserSavedPeaksData } from "../../../shared/hooks/peaks/useUserSavedPeaksData";
import type { FilterState } from "../../../shared/hooks/peaks/types";
import LoginRequiredPopup from "../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup.tsx";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import styles from "./desktop-UserSavedPeaks.module.css";
import { UnifiedControls } from "../../desktop-components/desktop-UnifiedFilters";
import OverlayHeader from "../../desktop-components/desktop-Overlay/desktop-OverlayHeader/desktop-OverlayHeader.tsx";
// SingleDatePicker usage moved into UnifiedFilterSection

// Elevation color and icon logic (copied from ListDetailsGrid)
const getElevationColor = (elevation: number) => {
  if (elevation >= 8000) return "#000000";
  if (elevation >= 6000) return "#480001";
  if (elevation >= 4000) return "#ff0000";
  if (elevation >= 3000) return "#ff7300";
  if (elevation >= 2000) return "#ffbb00";
  return "#00ae21";
};

const getElevationIcon = (elevation: number) => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

type SortField = "name" | "elevation" | "saved_at";
type SortDirection = "asc" | "desc";
type SortOption = {
  field: SortField;
  direction: SortDirection;
};

// Simple Peak Item Component (no expand/collapse)
const PeakItem = React.memo(
  ({
    peak,
    onPeakClick,
    onUnsave,
  }: {
    peak: UserSavedPeak;
    onPeakClick: (peakId: number) => void;
    onUnsave: (peakId: number) => void;
  }) => {
    const { ref } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: "100px",
      freezeOnceVisible: true,
    });
    const { formatMeters } = useUnitFormat();

    const handleCardClick = useCallback(() => {
      onPeakClick(peak.id);
    }, [peak.id, onPeakClick]);

    const handleUnsaveClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onUnsave(peak.id);
      },
      [peak.id, onUnsave]
    );

    const hasImage = Boolean(peak.image);
    const elevationColor = getElevationColor(peak.elevation);
    const elevationIcon = getElevationIcon(peak.elevation);

    return (
      <motion.div
        ref={ref}
        className={styles["userSavedPeaks__list-item"]}
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onClick={handleCardClick}
        style={{ cursor: "pointer" }}
      >
        {/* Square image on the left */}
        <div className={styles["userSavedPeaks__list-item-image"]}>
          {hasImage ? (
            <img
              src={removeImageSizeRestriction(peak.image) || ""}
              alt={peak.name}
              className={styles["userSavedPeaks__list-item-image-img"]}
            />
          ) : (
            <div
              className={styles["userSavedPeaks__list-item-image-placeholder"]}
              style={{
                background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${elevationColor}`,
              }}
            >
              <img
                src={elevationIcon}
                alt="Elevation icon"
                className={styles["userSavedPeaks__list-item-elevation-icon"]}
              />
            </div>
          )}
        </div>

        {/* Content on the right */}
        <div className={styles["userSavedPeaks__list-item-info-wrapper"]}>
          <div className={styles["userSavedPeaks__list-item-info"]}>
            {/* First row: Title */}
            <div
              className={`${styles["userSavedPeaks__list-item-title"]} typography-desktop-body-medium`}
            >
              {peak.name}
            </div>

            {/* Second row: Elevation, region, country all in one line */}
            <div className={styles["userSavedPeaks__list-item-details"]}>
              <img
                src={elevationIcon}
                alt="Elevation icon"
                className={styles["userSavedPeaks__list-item-details-icon"]}
              />
              <span
                className={`${styles["userSavedPeaks__list-item-elevation"]} typography-desktop-body-small`}
              >
                {formatMeters(peak.elevation)}
              </span>
              <span
                className={`${styles["userSavedPeaks__list-item-location"]} typography-desktop-body-small`}
              >
                {getLocationFromHierarchy(peak.admin_hierarchy)}
              </span>
            </div>

            {/* Third row: Saved date */}
            <div className={styles["userSavedPeaks__list-item-saved-date"]}>
              <Calendar size={18} />
              <span className="typography-desktop-body-small">
                Saved on {new Date(peak.saved_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        {/* Unsave button */}
        <button
          className={styles["userSavedPeaks__list-item-unsave-button"]}
          onClick={handleUnsaveClick}
          aria-label="Unsave peak"
        >
          <img
            src="/icons/common/ic_saved_filled.png"
            alt="Unsave"
            width={24}
            height={24}
          />
        </button>
      </motion.div>
    );
  }
);

PeakItem.displayName = "PeakItem";

// Elevation slider and date/country/region filters are unified via UnifiedFilterSection

// Filters popup is handled via UnifiedFiltersPopup; no local FilterSection needed

// Deprecated: legacy per-page SortDropdown removed in favor of UnifiedControls

const UserSavedPeaks: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();

  const initialFilters: FilterState = {
    startDate: null,
    endDate: null,
    elevationRange: [0, 8849],
    admin_osm_ids: [],
    admin_names: [],
    selectedCountry: null,
    selectedRegion: null,
    searchQuery: "",
  };

  const [sortOption, setSortOption] = useState<SortOption>({
    field: "saved_at",
    direction: "desc",
  });
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const hasTriggeredLoadMoreRef = useRef(false);
  const hasUserScrolledRef = useRef(false);

  const { adminLevels, handleAdminLevelChange, resetAdminLevels } = useAdminLevels();

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
  } = useUserSavedPeaksData(user, filters, sortOption);

  // Handle transition timeout
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timer);
    }
    return undefined;
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

  useEffect(() => {
    if (!user) {
      setShowLoginPopup(true);
    }
  }, [user]);

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

      // Then start loading and transition
      setIsLoading(true);
      setIsTransitioning(true);
      trackEvent("interaction", `saved_peaks_desktop_sort_${newSortOption.field}_${newSortOption.direction}`);
      setSortOption(newSortOption);
    },
    [sortOption, trackEvent]
  );

  const handlePeakClick = useCallback(
    (peakId: number) => {
      trackEvent("peak_click", `saved_peaks_desktop_${peakId}`);
      navigate(`/peaks/${peakId}`);
    },
    [navigate, trackEvent]
  );

  const handleUnsave = useCallback(
    async (peakId: number) => {
      if (!user) return;

      try {
        trackEvent("interaction", `saved_peaks_desktop_unsave_${peakId}`);
        const response = await unsavePeak(peakId);
        if (response.success) {
          setAllPeaks((prev) => prev.filter((peak) => peak.id !== peakId));
        }
      } catch (error) {
        console.error("Error unsaving peak:", error);
      }
    },
    [user, trackEvent, setAllPeaks],
  );

  const handleSortDropdownToggle = useCallback(() => {
    if (!isLoading) {
      trackEvent("interaction", "saved_peaks_desktop_sort_dropdown_toggle");
      setIsSortDropdownOpen(!isSortDropdownOpen);
    }
  }, [isLoading, isSortDropdownOpen, trackEvent]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      trackEvent("search", "saved_peaks_desktop_search_change");
      setSearchQuery(query);

      if (query.trim() !== searchQuery.trim()) {
        setIsLoading(true);
        setIsTransitioning(true);
        setFilters((prev) => ({ ...prev, searchQuery: query }));
      }
    },
    [searchQuery, trackEvent],
  );

  const handleSearchClear = useCallback(() => {
    trackEvent("search", "saved_peaks_desktop_search_clear");
    setSearchQuery("");
    setIsLoading(true);
    setIsTransitioning(true);
    setFilters((prev) => ({ ...prev, searchQuery: "" }));
  }, [trackEvent]);

  // Filter update handler (applies immediately)
  const handleUpdateFilters = useCallback(
    (newFilters: Partial<FilterState>) => {
      if (newFilters.selectedCountry !== undefined) {
        trackEvent(
          "filter_change",
          `saved_peaks_desktop_country_${newFilters.selectedCountry || "all"}`,
        );
        handleAdminLevelChange(
          0,
          newFilters.selectedCountry ? Number(newFilters.selectedCountry) : null,
        );
      }
      if (newFilters.selectedRegion !== undefined) {
        trackEvent(
          "filter_change",
          `saved_peaks_desktop_region_${newFilters.selectedRegion || "all"}`,
        );
        handleAdminLevelChange(
          1,
          newFilters.selectedRegion ? Number(newFilters.selectedRegion) : null,
        );
      }

      setFilters((prev) => {
        const merged: FilterState = { ...prev, ...newFilters };

        if (
          newFilters.selectedCountry !== undefined ||
          newFilters.selectedRegion !== undefined
        ) {
          const selectedCountry = merged.selectedCountry ?? null;
          const selectedRegion = merged.selectedRegion ?? null;

          const mostSpecificOsmId = selectedRegion
            ? Number(selectedRegion)
            : selectedCountry
              ? Number(selectedCountry)
              : null;

          const mostSpecificName = selectedRegion
            ? adminLevels[1]?.options.find(
                (region) => String(region.osm_id) === selectedRegion,
              )?.name ?? null
            : selectedCountry
              ? adminLevels[0]?.options.find(
                  (country) => String(country.osm_id) === selectedCountry,
                )?.name ?? null
              : null;

          merged.admin_osm_ids = mostSpecificOsmId ? [mostSpecificOsmId] : [];
          merged.admin_names = mostSpecificName ? [mostSpecificName] : [];
        }

        return merged;
      });

      trackEvent("interaction", "saved_peaks_desktop_filters_applied");
      setIsLoading(true);
      setIsTransitioning(true);
    },
    [trackEvent, handleAdminLevelChange, adminLevels],
  );

  const clearAllFilters = useCallback(() => {
    trackEvent("filter_change", "saved_peaks_desktop_filters_clear_all");
    const clearedFilters: FilterState = {
      startDate: null,
      endDate: null,
      elevationRange: [0, 8849] as [number, number],
      admin_osm_ids: [],
      admin_names: [],
      selectedCountry: null,
      selectedRegion: null,
      searchQuery: "",
    };
    setFilters(clearedFilters);
    setSearchQuery("");
    resetAdminLevels();
    setIsLoading(true);
    setIsTransitioning(true);
  }, [trackEvent, resetAdminLevels]);

  const handleLoadMore = useCallback(() => {
    trackEvent("pagination", "saved_peaks_desktop_load_more");
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
  }, [allPeaks.length, hasMore, loading, checkSentinelNearViewport]);

  if (loading && user) {
    return (
      <div className={styles["userSavedPeaks"]}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  if (error || (user && !peaksData)) {
    return (
      <div className={styles["userSavedPeaks"]}>
        <div className={styles["userSavedPeaks__content"]}>
          <OverlayHeader title={t("userSavedPeaks.title")} />
          <div
            className={`${styles["userSavedPeaks__error-container"]} typography-desktop-label-medium`}
          >
            <p className="typography-desktop-body-small">
              {error || "Failed to load saved peaks"}
            </p>
            <button
              className={`${styles["userSavedPeaks__retry-button"]} typography-desktop-button-medium`}
              onClick={() => {
                trackEvent("interaction", "saved_peaks_desktop_retry_reload");
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

  if (!user || !peaksData) {
    return (
      <div className={styles["userSavedPeaks"]}>
        <div className={styles["userSavedPeaks__content"]}>
          <LoginRequiredPopup
            isOpen={showLoginPopup}
            onClose={() => {
              trackEvent("interaction", "saved_peaks_desktop_login_popup_close");
              setShowLoginPopup(false);
            }}
            message="auth.loginRequired.savedPeaks"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles["userSavedPeaks"]}>
        <div className={styles["userSavedPeaks__content"]}>
          {/* Login Required Popup */}
          <LoginRequiredPopup
            isOpen={showLoginPopup}
            onClose={() => {
              trackEvent("interaction", "saved_peaks_desktop_login_popup_close");
              setShowLoginPopup(false);
            }}
            message="auth.loginRequired.savedPeaks"
          />
          {/* Controls with Header and Info Section */}
          <div className={styles["userSavedPeaks__filters-wrapper"]}>
            <UnifiedControls
              headerTitle={t("userSavedPeaks.title")}
              infoDescription={t("userSavedPeaks.description", {
                count: peaksData.total_peaks,
              })}
              searchValue={searchQuery}
              searchPlaceholder={t("userSavedPeaks.searchPlaceholder")}
              onSearchChange={handleSearchChange}
              onSearchClear={handleSearchClear}
              scope="userSavedPeaks"
              t={t}
              localFilters={filters}
              onUpdateFilters={handleUpdateFilters}
              onClearFilters={clearAllFilters}
              availableCountries={
                adminLevels[0]?.options.map((c) => ({
                  value: String(c.osm_id),
                  label: c.name,
                })) || []
              }
              availableRegions={
                adminLevels[1]?.options.map((r) => ({
                  value: String(r.osm_id),
                  label: r.name,
                })) || []
              }
              includeElevation={true}
              orderLabel={
                sortOption.field === "name"
                  ? t("listDetails.sorting.name")
                  : sortOption.field === "elevation"
                  ? t("listDetails.sorting.elevation")
                  : t("userSavedPeaks.sorting.savedDate")
              }
              orderValue={
                sortOption as {
                  field: "name" | "elevation" | "saved_at";
                  direction: "asc" | "desc";
                }
              }
              orderSections={[
                {
                  title: t("listDetails.sorting.name"),
                  options: [
                    {
                      field: "name",
                      direction: "asc",
                      label: t("listDetails.sortingOptions.nameAsc"),
                    },
                    {
                      field: "name",
                      direction: "desc",
                      label: t("listDetails.sortingOptions.nameDesc"),
                    },
                  ],
                },
                {
                  title: t("listDetails.sorting.elevation"),
                  options: [
                    {
                      field: "elevation",
                      direction: "asc",
                      label: t("listDetails.sortingOptions.elevationAsc"),
                    },
                    {
                      field: "elevation",
                      direction: "desc",
                      label: t("listDetails.sortingOptions.elevationDesc"),
                    },
                  ],
                },
                {
                  title: t("userSavedPeaks.sorting.savedDate"),
                  options: [
                    {
                      field: "saved_at",
                      direction: "desc",
                      label: t("userSavedPeaks.sortingOptions.savedDateNewest"),
                    },
                    {
                      field: "saved_at",
                      direction: "asc",
                      label: t("userSavedPeaks.sortingOptions.savedDateOldest"),
                    },
                  ],
                },
              ]}
              isOrderOpen={isSortDropdownOpen}
              isOrderClosing={false}
              onOrderToggle={handleSortDropdownToggle}
              onOrderChange={(f, d) =>
                handleSortChange(f as "name" | "elevation" | "saved_at", d)
              }
              orderDisabled={loading || isLoadingPeaks || isLoading}
            />
          </div>
          {/* Content Area */}
          <div className={styles["userSavedPeaks__content-area"]}>
            {/* Loading Spinner */}
            {(loading || isLoadingPeaks || isLoading) && (
              <div
                className={styles["userSavedPeaks__content-loading-spinner"]}
              >
                <Loader2
                  size={24}
                  className={styles["userSavedPeaks__loading-spinner"]}
                />
                <p
                  className={`${styles["userSavedPeaks__loading-text"]} typography-desktop-body-small`}
                >
                  {t("listDetails.loading")}
                </p>
              </div>
            )}

            {/* List View */}
            {!(loading || isLoadingPeaks || isLoading) && (
              <div
                className={`${styles["userSavedPeaks__list-container"]} ${
                  isTransitioning
                    ? styles["userSavedPeaks__list-container--transitioning"]
                    : styles["userSavedPeaks__list-container--loaded"]
                }`}
              >
                {allPeaks.length === 0 ? (
                  <div className={styles["userSavedPeaks__no-results"]}>
                    <p className="typography-desktop-body-small">
                      {t("userSavedPeaks.noResults")}
                    </p>
                  </div>
                ) : (
                  <div className={styles["userSavedPeaks__list"]}>
                    {allPeaks.map((peak, index) => (
                      <PeakItem
                        key={`saved-peak-${peak.id}-${index}`}
                        peak={peak}
                        onPeakClick={handlePeakClick}
                        onUnsave={handleUnsave}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {!loading && !isLoadingPeaks && hasMore && allPeaks.length > 0 && (
              <div
                ref={loadMoreSentinelRef}
                className={`${styles["userSavedPeaks__load-more-container"]} ${
                  !isLoadingMore
                    ? styles["userSavedPeaks__load-more-container--idle"]
                    : ""
                }`}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2
                      className={styles["userSavedPeaks__load-more-spinner"]}
                      size={20}
                    />
                    <span className="typography-desktop-label-medium">
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
    </>
  );
};

export default UserSavedPeaks;
