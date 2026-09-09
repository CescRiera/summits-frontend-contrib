import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Calendar } from "lucide-react";
import { UnifiedFiltersPopup } from "../../components/UnifiedFilters";
import { unsaveShelter } from "../../../shared/api/endpoints/user";
import type { UserSavedShelter, ShelterType } from "../../../shared/api/types";
import { useIntersectionObserver } from "../../hooks/useIntersectionObserver";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";

import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import LoginRequiredPopup from "../../components/LoginRequiredPopup/LoginRequiredPopup";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import styles from "./UserSavedShelters.module.css";
import { UnifiedControls } from "../../components/UnifiedFilters";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import OverlayInfoSection from "../../components/Overlay/OverlayInfoSection/OverlayInfoSection";
import { useAdminLevels } from "../../../shared/hooks/useAdminLevels";
import { useUserSavedSheltersData } from "../../../shared/hooks/shelters/useUserSavedSheltersData";
import type {
  ShelterFilterState,
  UserSavedShelterSortOption,
} from "../../../shared/hooks/shelters/useUserSavedSheltersData";
import ShelterIcon from "../../../shared/components/ShelterIcon/ShelterIcon";

type SortField = "name" | "elevation" | "saved_at";
type SortDirection = "asc" | "desc";

const SHELTER_TYPE_OPTIONS: ShelterType[] = [
  "alpine_hut",
  "wilderness_hut",
  "shelter",
];

const getShelterTypeColor = (type: ShelterType): string => {
  switch (type) {
    case "alpine_hut":
      return "#0C4A7B";
    case "wilderness_hut":
      return "#2D6A4F";
    default:
      return "#D92B2B";
  }
};

// Simple Shelter Item Component (no expand/collapse)
const ShelterItem = React.memo(
  ({
    shelter,
    onShelterClick,
    onUnsave,
  }: {
    shelter: UserSavedShelter;
    onShelterClick: (shelterId: number) => void;
    onUnsave: (shelterId: number) => void;
  }) => {
    const { formatMeters } = useUnitFormat();
    const { t } = useI18n();
    const { ref } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: "100px",
      freezeOnceVisible: true,
    });

    const shelterType: ShelterType =
      shelter.type || shelter.shelter_type || "shelter";
    const typeColor = getShelterTypeColor(shelterType);
    const typeLabel = t(`shelterDetails.type.${shelterType}`) || shelterType;
    const hasImage = Boolean(shelter.image);

    const handleCardClick = useCallback(() => {
      onShelterClick(shelter.id);
    }, [shelter.id, onShelterClick]);

    const handleUnsaveClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onUnsave(shelter.id);
      },
      [shelter.id, onUnsave]
    );

    return (
      <motion.div
        ref={ref}
        className={styles["userSavedShelters__list-item"]}
        layout
        transition={{ duration: 0.3, ease: "easeInOut" }}
        onClick={handleCardClick}
      >
        {/* Square image on the left */}
        <div className={styles["userSavedShelters__list-item-image"]}>
          {hasImage ? (
            <img
              src={shelter.image || ""}
              alt={shelter.name || ""}
              className={styles["userSavedShelters__list-item-image-img"]}
            />
          ) : (
            <div
              className={styles["userSavedShelters__list-item-image-placeholder"]}
              style={{
                background: `linear-gradient(rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.3)), ${typeColor}`,
              }}
            >
              <ShelterIcon
                size={40}
                className={styles["userSavedShelters__list-item-shelter-icon"]}
              />
            </div>
          )}
        </div>

        {/* Content on the right */}
        <div className={styles["userSavedShelters__list-item-info-wrapper"]}>
          <div className={styles["userSavedShelters__list-item-info"]}>
            {/* First row: Title */}
            <div
              className={`${styles["userSavedShelters__list-item-title"]} typography-title-medium`}
            >
              {shelter.name || shelter.name_en}
            </div>

            {/* Type badge */}
            <span
              className={styles["userSavedShelters__list-item-type-badge"]}
              style={{
                backgroundColor: `${typeColor}18`,
                color: typeColor,
                borderColor: `${typeColor}40`,
              }}
            >
              {typeLabel}
            </span>

            {/* Second row: Elevation, region, country all in one line */}
            <div className={styles["userSavedShelters__list-item-details"]}>
              {shelter.elevation != null && (
                <span
                  className={`${styles["userSavedShelters__list-item-elevation"]} typography-body-small`}
                >
                  {formatMeters(shelter.elevation)}
                </span>
              )}
              <span
                className={`${styles["userSavedShelters__list-item-location"]} typography-body-small`}
              >
                {getLocationFromHierarchy(shelter.admin_hierarchy)}
              </span>
            </div>

            {/* Third row: Saved date */}
            <div className={styles["userSavedShelters__list-item-saved-date"]}>
              <Calendar size={14} />
              <span className="typography-body-small">
                {t("userSavedShelters.savedOn")}{" "}
                {new Date(shelter.saved_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        {/* Unsave button */}
        <button
          className={styles["userSavedShelters__list-item-unsave-button"]}
          onClick={handleUnsaveClick}
          aria-label={t("userSavedShelters.unsave")}
        >
          <img
            src="/icons/common/ic_saved_filled.png"
            alt={t("userSavedShelters.unsave")}
            width={24}
            height={24}
          />
        </button>
      </motion.div>
    );
  }
);

ShelterItem.displayName = "ShelterItem";

const UserSavedShelters: React.FC = () => {
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const { user } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();

  const initialFilters: ShelterFilterState = {
    startDate: null,
    endDate: null,
    elevationRange: [0, 8849],
    admin_osm_ids: [],
    admin_names: [],
    searchQuery: "",
    shelterType: "",
  };

  const [sortOption, setSortOption] = useState<UserSavedShelterSortOption>({
    field: "saved_at",
    direction: "desc",
  });
  const [filters, setFilters] = useState<ShelterFilterState>(initialFilters);
  const [localFilters, setLocalFilters] =
    useState<ShelterFilterState>(initialFilters);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showFilterPopup, setShowFilterPopup] = useState(false);

  // Memoize order sections for performance
  const orderSections = useMemo(
    () => [
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
        title: t("userSavedShelters.sorting.savedDate"),
        options: [
          {
            field: "saved_at" as const,
            direction: "desc" as const,
            label: t("userSavedShelters.sortingOptions.savedDateNewest"),
          },
          {
            field: "saved_at" as const,
            direction: "asc" as const,
            label: t("userSavedShelters.sortingOptions.savedDateOldest"),
          },
        ],
      },
    ],
    [t]
  );
  const [searchQuery, setSearchQuery] = useState("");

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const hasTriggeredLoadMoreRef = useRef(false);
  const hasUserScrolledRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { adminLevels, handleAdminLevelChange, resetAdminLevels } =
    useAdminLevels(
      useCallback(({ ids, names }: { ids: number[]; names: string[] }) => {
        setLocalFilters((prev) => ({
          ...prev,
          admin_osm_ids: ids,
          admin_names: names,
        }));
      }, [])
    );

  const {
    sheltersData,
    allShelters,
    loading,
    isLoadingMore,
    isLoadingShelters,
    hasMore,
    currentPage,
    error,
    fetchShelters,
    setAllShelters,
  } = useUserSavedSheltersData(user, filters, sortOption);

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

  const handleCloseFilterPopup = useCallback(() => {
    trackEvent("interaction", "saved_shelters_filters_close");
    setShowFilterPopup(false);
  }, [trackEvent]);

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
      document.addEventListener("touchmove", preventScroll, {
        passive: false,
      });

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
    setLocalFilters(filters);
  }, [filters]);

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
      trackEvent(
        "interaction",
        `saved_shelters_sort_${newSortOption.field}_${newSortOption.direction}`
      );
      setSortOption(newSortOption);
    },
    [sortOption, trackEvent]
  );

  const handleShelterClick = useCallback(
    (shelterId: number) => {
      trackEvent("shelter_click", `saved_shelters_${shelterId}`);
      navigate(`/shelters/${shelterId}`);
    },
    [navigate, trackEvent]
  );

  const handleUnsave = useCallback(
    async (shelterId: number) => {
      if (!user) return;

      try {
        trackEvent("interaction", `saved_shelters_unsave_${shelterId}`);
        const response = await unsaveShelter(shelterId);
        if (response.success) {
          setAllShelters((prev) =>
            prev.filter((shelter) => shelter.id !== shelterId)
          );
        }
      } catch (error) {
        console.error("Error unsaving shelter:", error);
      }
    },
    [user, trackEvent, setAllShelters]
  );

  const handleSortDropdownToggle = useCallback(() => {
    if (!isLoading) {
      trackEvent("interaction", "saved_shelters_sort_dropdown_toggle");
      setIsSortDropdownOpen(!isSortDropdownOpen);
    }
  }, [isLoading, isSortDropdownOpen, trackEvent]);

  const handleBack = () => {
    trackEvent("navigation", "saved_shelters_back");
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
            trackEvent("search", "saved_shelters_search_applied");
            setIsLoading(true);
            setIsTransitioning(true);
            setFilters((prev) => ({ ...prev, searchQuery: trimmed }));
          }
        }
      }, 500);
    },
    [filters.searchQuery, trackEvent]
  );

  const handleSearchClear = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    trackEvent("search", "saved_shelters_search_clear");
    setSearchQuery("");
    setIsLoading(true);
    setIsTransitioning(true);
    setFilters((prev) => ({ ...prev, searchQuery: "" }));
  }, [trackEvent]);

  const handleOpenFilterPopup = useCallback(() => {
    // Sync local filters with current filters when opening
    trackEvent("interaction", "saved_shelters_filters_open");
    setLocalFilters(filters);
    setShowFilterPopup(true);
  }, [filters, trackEvent]);

  const handleApplyFilters = useCallback(() => {
    trackEvent("interaction", "saved_shelters_filters_applied");
    setFilters({
      ...localFilters,
      searchQuery,
    });
    setIsLoading(true);
    setIsTransitioning(true);
    handleCloseFilterPopup();
  }, [localFilters, searchQuery, handleCloseFilterPopup, trackEvent]);

  const handleShelterTypeChange = useCallback(
    (shelterType: ShelterType | "") => {
      trackEvent(
        "filter_change",
        `saved_shelters_type_${shelterType || "all"}`
      );
      setIsLoading(true);
      setIsTransitioning(true);
      setFilters((prev) => ({ ...prev, shelterType }));
    },
    [trackEvent]
  );

  // Local filter handlers (for popup)
  const updateLocalFilters = useCallback(
    (newFilters: Partial<ShelterFilterState>) => {
      setLocalFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const clearAllFilters = useCallback(() => {
    trackEvent("filter_change", "saved_shelters_filters_clear_all");
    const clearedFilters: ShelterFilterState = {
      startDate: null,
      endDate: null,
      elevationRange: [0, 8849] as [number, number],
      admin_osm_ids: [],
      admin_names: [],
      searchQuery: "",
      shelterType: "",
    };
    setFilters(clearedFilters);
    setLocalFilters(clearedFilters);
    resetAdminLevels();
    setSearchQuery("");
    setIsLoading(true);
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
      filters.elevationRange[1] < 8849 ||
      filters.shelterType !== ""
    );
  }, [filters]);

  const handleLoadMore = useCallback(() => {
    trackEvent("pagination", "saved_shelters_load_more");
    if (hasMore && !isLoadingMore && !isLoadingShelters) {
      fetchShelters(currentPage + 1);
    }
  }, [
    currentPage,
    fetchShelters,
    hasMore,
    isLoadingMore,
    isLoadingShelters,
    trackEvent,
  ]);

  const maybeTriggerLoadMore = useCallback(() => {
    if (
      !hasMore ||
      isLoadingMore ||
      isLoadingShelters ||
      loading ||
      allShelters.length === 0 ||
      !hasUserScrolledRef.current ||
      hasTriggeredLoadMoreRef.current
    ) {
      return;
    }

    hasTriggeredLoadMoreRef.current = true;
    handleLoadMore();
  }, [
    allShelters.length,
    handleLoadMore,
    hasMore,
    isLoadingMore,
    isLoadingShelters,
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
    if (isLoadingShelters || isLoadingMore) {
      return;
    }
    hasTriggeredLoadMoreRef.current = false;
    if (hasUserScrolledRef.current) {
      checkSentinelNearViewport();
    }
  }, [
    allShelters.length,
    checkSentinelNearViewport,
    isLoadingMore,
    isLoadingShelters,
  ]);

  useEffect(() => {
    if (currentPage === 1) {
      hasUserScrolledRef.current = false;
    }
  }, [currentPage]);

  useEffect(() => {
    if (!hasMore || allShelters.length === 0 || loading) {
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
  }, [allShelters.length, hasMore, loading, checkSentinelNearViewport]);

  if (loading && user) {
    return (
      <div className={styles["userSavedShelters"]}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  if (error || (user && !sheltersData)) {
    return (
      <div className={styles["userSavedShelters"]}>
        <div className={styles["userSavedShelters__content"]}>
          <OverlayHeader
            title={t("userSavedShelters.title")}
            onBack={handleBack}
          />
          <div
            className={`${styles["userSavedShelters__error-container"]} typography-body-small`}
          >
            <p className="typography-body-medium">
              {error || "Failed to load saved shelters"}
            </p>
            <button
              className={`${styles["userSavedShelters__retry-button"]} typography-button-medium`}
              onClick={() => {
                trackEvent("interaction", "saved_shelters_retry_reload");
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

  if (!user || !sheltersData) {
    return (
      <div className={styles["userSavedShelters"]}>
        <div className={styles["userSavedShelters__content"]}>
          <LoginRequiredPopup
            isOpen={showLoginPopup}
            onClose={() => {
              trackEvent("interaction", "saved_shelters_login_popup_close");
              setShowLoginPopup(false);
            }}
            message="auth.loginRequired.savedShelters"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles["userSavedShelters"]}>
        <div className={styles["userSavedShelters__content"]}>
          {/* Login Required Popup */}
          <LoginRequiredPopup
            isOpen={showLoginPopup}
            onClose={() => {
              trackEvent("interaction", "saved_shelters_login_popup_close");
              setShowLoginPopup(false);
            }}
            message="auth.loginRequired.savedShelters"
          />
          {/* Header Section */}
          <OverlayHeader
            title={t("userSavedShelters.title")}
            onBack={handleBack}
          />
          {/* Description and Stats Section */}
          <OverlayInfoSection
            stats={[
              {
                label: t("userSavedShelters.totalLabel"),
                value: sheltersData.total_shelters,
                variant: "primary",
              },
            ]}
          />
          {/* Controls */}
          <div className={styles["userSavedShelters__filters-wrapper"]}>
            <UnifiedControls
              searchValue={searchQuery}
              searchPlaceholder={t("userSavedShelters.searchPlaceholder")}
              onSearchChange={handleSearchChange}
              onSearchClear={handleSearchClear}
              filtersLabel={t("userSavedShelters.filters")}
              hasActiveFilters={hasActiveFilters}
              onOpenFilters={handleOpenFilterPopup}
              orderLabel={
                sortOption.field === "name"
                  ? t("listDetails.sorting.name")
                  : sortOption.field === "elevation"
                  ? t("listDetails.sorting.elevation")
                  : t("userSavedShelters.sorting.savedDate")
              }
              orderValue={
                sortOption as {
                  field: "name" | "elevation" | "saved_at";
                  direction: "asc" | "desc";
                }
              }
              orderSections={orderSections}
              isOrderOpen={isSortDropdownOpen}
              isOrderClosing={false}
              onOrderToggle={handleSortDropdownToggle}
              onOrderChange={(f, d) =>
                handleSortChange(f as "name" | "elevation" | "saved_at", d)
              }
              orderDisabled={loading || isLoadingShelters || isLoading}
            />
          </div>
          {/* Unified Filters Popup */}
          <UnifiedFiltersPopup
            isOpen={showFilterPopup}
            scope="userSavedShelters"
            t={t}
            localFilters={localFilters}
            adminLevels={adminLevels}
            onAdminLevelChange={handleAdminLevelChange}
            includeElevation={true}
            onClose={handleCloseFilterPopup}
            onUpdateFilters={updateLocalFilters}
            onClearFilters={clearAllFilters}
            onApplyFilters={handleApplyFilters}
          />
          {/* Content Area */}
          <div className={styles["userSavedShelters__content-area"]}>
            {/* Shelter Type Filter Chips */}
            <div className={styles["userSavedShelters__type-chips"]}>
              <button
                className={`${styles["userSavedShelters__type-chip"]} ${
                  filters.shelterType === ""
                    ? styles["userSavedShelters__type-chip--active"]
                    : ""
                }`}
                onClick={() => handleShelterTypeChange("")}
              >
                {t("userSavedShelters.typeOptions.all")}
              </button>
              {SHELTER_TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  className={`${styles["userSavedShelters__type-chip"]} ${
                    filters.shelterType === type
                      ? styles["userSavedShelters__type-chip--active"]
                      : ""
                  }`}
                  style={
                    filters.shelterType === type
                      ? {
                          backgroundColor: `${getShelterTypeColor(type)}18`,
                          color: getShelterTypeColor(type),
                          borderColor: `${getShelterTypeColor(type)}40`,
                        }
                      : undefined
                  }
                  onClick={() => handleShelterTypeChange(type)}
                >
                  {t(`shelterDetails.type.${type}`) || type}
                </button>
              ))}
            </div>

            {/* Loading Spinner */}
            {(loading || isLoadingShelters || isLoading) && (
              <div
                className={
                  styles["userSavedShelters__content-loading-spinner"]
                }
              >
                <Loader2
                  size={24}
                  className={styles["userSavedShelters__loading-spinner"]}
                />
                <p
                  className={`${styles["userSavedShelters__loading-text"]} typography-body-medium`}
                >
                  {t("listDetails.loading")}
                </p>
              </div>
            )}

            {/* List View */}
            {!(loading || isLoadingShelters || isLoading) && (
              <div
                className={`${styles["userSavedShelters__list-container"]} ${
                  isTransitioning
                    ? styles["userSavedShelters__list-container--transitioning"]
                    : styles["userSavedShelters__list-container--loaded"]
                }`}
              >
                {allShelters.length === 0 ? (
                  <div className={styles["userSavedShelters__no-results"]}>
                    <p className="typography-body-medium">
                      {t("userSavedShelters.noResults")}
                    </p>
                  </div>
                ) : (
                  <div className={styles["userSavedShelters__list"]}>
                    {allShelters.map((shelter, index) => (
                      <ShelterItem
                        key={`saved-shelter-${shelter.id}-${index}`}
                        shelter={shelter}
                        onShelterClick={handleShelterClick}
                        onUnsave={handleUnsave}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {!loading &&
              !isLoadingShelters &&
              hasMore &&
              allShelters.length > 0 && (
                <div
                  ref={loadMoreSentinelRef}
                  className={`${styles["userSavedShelters__load-more-container"]} ${
                    !isLoadingMore
                      ? styles["userSavedShelters__load-more-container--idle"]
                      : ""
                  }`}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2
                        className={
                          styles["userSavedShelters__load-more-spinner"]
                        }
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
    </>
  );
};

export default UserSavedShelters;