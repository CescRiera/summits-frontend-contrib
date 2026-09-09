import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Calendar } from "lucide-react";
import { unsaveShelter } from "../../../shared/api/endpoints/user";
import type { UserSavedShelter, ShelterType } from "../../../shared/api/types";
import { useIntersectionObserver } from "../../desktop-hooks/desktop-useIntersectionObserver.ts";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import { removeImageSizeRestriction } from "../../../shared/utils/imageUtils";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";

import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useAdminLevels } from "../../../shared/hooks/useAdminLevels";
import { useUserSavedSheltersData } from "../../../shared/hooks/shelters/useUserSavedSheltersData";
import type {
  ShelterFilterState,
  UserSavedShelterSortOption,
} from "../../../shared/hooks/shelters/useUserSavedSheltersData";
import LoginRequiredPopup from "../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup.tsx";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import styles from "./desktop-UserSavedShelters.module.css";
import { UnifiedControls } from "../../desktop-components/desktop-UnifiedFilters";
import OverlayHeader from "../../desktop-components/desktop-Overlay/desktop-OverlayHeader/desktop-OverlayHeader.tsx";
import ShelterIcon from "../../../shared/components/ShelterIcon/ShelterIcon";

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

type SortField = "name" | "elevation" | "saved_at";
type SortDirection = "asc" | "desc";

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
    const { ref } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: "100px",
      freezeOnceVisible: true,
    });
    const { formatMeters } = useUnitFormat();
    const { t } = useI18n();

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
        style={{ cursor: "pointer" }}
      >
        {/* Square image on the left */}
        <div className={styles["userSavedShelters__list-item-image"]}>
          {hasImage ? (
            <img
              src={removeImageSizeRestriction(shelter.image) || ""}
              alt={shelter.name || shelter.name_en || ""}
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
              className={`${styles["userSavedShelters__list-item-title"]} typography-desktop-body-medium`}
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
                  className={`${styles["userSavedShelters__list-item-elevation"]} typography-desktop-body-small`}
                >
                  {formatMeters(shelter.elevation)}
                </span>
              )}
              <span
                className={`${styles["userSavedShelters__list-item-location"]} typography-desktop-body-small`}
              >
                {getLocationFromHierarchy(shelter.admin_hierarchy)}
              </span>
            </div>

            {/* Third row: Saved date */}
            <div className={styles["userSavedShelters__list-item-saved-date"]}>
              <Calendar size={18} />
              <span className="typography-desktop-body-small">
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
  const { user } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();

  const initialFilters: ShelterFilterState = {
    startDate: null,
    endDate: null,
    elevationRange: [0, 8849],
    admin_osm_ids: [],
    admin_names: [],
    selectedCountry: null,
    selectedRegion: null,
    searchQuery: "",
    shelterType: "",
  };

  const [sortOption, setSortOption] = useState<UserSavedShelterSortOption>({
    field: "saved_at",
    direction: "desc",
  });
  const [filters, setFilters] = useState<ShelterFilterState>(initialFilters);
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
      trackEvent("interaction", `saved_shelters_desktop_sort_${newSortOption.field}_${newSortOption.direction}`);
      setSortOption(newSortOption);
    },
    [sortOption, trackEvent]
  );

  const handleShelterClick = useCallback(
    (shelterId: number) => {
      trackEvent("shelter_click", `saved_shelters_desktop_${shelterId}`);
      navigate(`/shelters/${shelterId}`);
    },
    [navigate, trackEvent]
  );

  const handleUnsave = useCallback(
    async (shelterId: number) => {
      if (!user) return;

      try {
        trackEvent("interaction", `saved_shelters_desktop_unsave_${shelterId}`);
        const response = await unsaveShelter(shelterId);
        if (response.success) {
          setAllShelters((prev) => prev.filter((shelter) => shelter.id !== shelterId));
        }
      } catch (error) {
        console.error("Error unsaving shelter:", error);
      }
    },
    [user, trackEvent, setAllShelters],
  );

  const handleSortDropdownToggle = useCallback(() => {
    if (!isLoading) {
      trackEvent("interaction", "saved_shelters_desktop_sort_dropdown_toggle");
      setIsSortDropdownOpen(!isSortDropdownOpen);
    }
  }, [isLoading, isSortDropdownOpen, trackEvent]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const query = event.target.value;
      trackEvent("search", "saved_shelters_desktop_search_change");
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
    trackEvent("search", "saved_shelters_desktop_search_clear");
    setSearchQuery("");
    setIsLoading(true);
    setIsTransitioning(true);
    setFilters((prev) => ({ ...prev, searchQuery: "" }));
  }, [trackEvent]);

  // Filter update handler (applies immediately)
  const handleUpdateFilters = useCallback(
    (newFilters: Partial<ShelterFilterState>) => {
      if (newFilters.selectedCountry !== undefined) {
        trackEvent(
          "filter_change",
          `saved_shelters_desktop_country_${newFilters.selectedCountry || "all"}`,
        );
        handleAdminLevelChange(
          0,
          newFilters.selectedCountry ? Number(newFilters.selectedCountry) : null,
        );
      }
      if (newFilters.selectedRegion !== undefined) {
        trackEvent(
          "filter_change",
          `saved_shelters_desktop_region_${newFilters.selectedRegion || "all"}`,
        );
        handleAdminLevelChange(
          1,
          newFilters.selectedRegion ? Number(newFilters.selectedRegion) : null,
        );
      }

      setFilters((prev) => {
        const merged: ShelterFilterState = { ...prev, ...newFilters };

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

      trackEvent("interaction", "saved_shelters_desktop_filters_applied");
      setIsLoading(true);
      setIsTransitioning(true);
    },
    [trackEvent, handleAdminLevelChange, adminLevels],
  );

  const handleShelterTypeChange = useCallback(
    (shelterType: ShelterType | "") => {
      trackEvent(
        "filter_change",
        `saved_shelters_desktop_type_${shelterType || "all"}`,
      );
      setIsLoading(true);
      setIsTransitioning(true);
      setFilters((prev) => ({ ...prev, shelterType }));
    },
    [trackEvent]
  );

  const clearAllFilters = useCallback(() => {
    trackEvent("filter_change", "saved_shelters_desktop_filters_clear_all");
    const clearedFilters: ShelterFilterState = {
      startDate: null,
      endDate: null,
      elevationRange: [0, 8849] as [number, number],
      admin_osm_ids: [],
      admin_names: [],
      selectedCountry: null,
      selectedRegion: null,
      searchQuery: "",
      shelterType: "",
    };
    setFilters(clearedFilters);
    setSearchQuery("");
    resetAdminLevels();
    setIsLoading(true);
    setIsTransitioning(true);
  }, [trackEvent, resetAdminLevels]);

  const handleLoadMore = useCallback(() => {
    trackEvent("pagination", "saved_shelters_desktop_load_more");
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
  }, [allShelters.length, checkSentinelNearViewport, isLoadingMore, isLoadingShelters]);

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
          <OverlayHeader title={t("userSavedShelters.title")} />
          <div
            className={`${styles["userSavedShelters__error-container"]} typography-desktop-label-medium`}
          >
            <p className="typography-desktop-body-small">
              {error || "Failed to load saved shelters"}
            </p>
            <button
              className={`${styles["userSavedShelters__retry-button"]} typography-desktop-button-medium`}
              onClick={() => {
                trackEvent("interaction", "saved_shelters_desktop_retry_reload");
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
              trackEvent("interaction", "saved_shelters_desktop_login_popup_close");
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
              trackEvent("interaction", "saved_shelters_desktop_login_popup_close");
              setShowLoginPopup(false);
            }}
            message="auth.loginRequired.savedShelters"
          />
          {/* Controls with Header and Info Section */}
          <div className={styles["userSavedShelters__filters-wrapper"]}>
            <UnifiedControls
              headerTitle={t("userSavedShelters.title")}
              infoDescription={t("userSavedShelters.description", {
                count: sheltersData.total_shelters,
              })}
              searchValue={searchQuery}
              searchPlaceholder={t("userSavedShelters.searchPlaceholder")}
              onSearchChange={handleSearchChange}
              onSearchClear={handleSearchClear}
              scope="userSavedShelters"
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
                  : t("userSavedShelters.sorting.savedDate")
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
                  title: t("userSavedShelters.sorting.savedDate"),
                  options: [
                    {
                      field: "saved_at",
                      direction: "desc",
                      label: t("userSavedShelters.sortingOptions.savedDateNewest"),
                    },
                    {
                      field: "saved_at",
                      direction: "asc",
                      label: t("userSavedShelters.sortingOptions.savedDateOldest"),
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
              orderDisabled={loading || isLoadingShelters || isLoading}
            />
          </div>
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
                className={styles["userSavedShelters__content-loading-spinner"]}
              >
                <Loader2
                  size={24}
                  className={styles["userSavedShelters__loading-spinner"]}
                />
                <p
                  className={`${styles["userSavedShelters__loading-text"]} typography-desktop-body-small`}
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
                    <p className="typography-desktop-body-small">
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

            {!loading && !isLoadingShelters && hasMore && allShelters.length > 0 && (
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
                      className={styles["userSavedShelters__load-more-spinner"]}
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

export default UserSavedShelters;