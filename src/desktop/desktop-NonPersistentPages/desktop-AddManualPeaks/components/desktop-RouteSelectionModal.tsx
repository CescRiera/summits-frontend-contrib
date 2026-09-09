import React, { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { useAuth } from "../../../../shared/context/AuthContext";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useUserRoutesData } from "../../../../mobile/NonPersistentPages/UserRoutes/hooks/useUserRoutesData";
import { useUserRoutesUI } from "../../../../mobile/NonPersistentPages/UserRoutes/hooks/useUserRoutesUI";
import { RoutesList } from "../../desktop-UserRoutes/desktop-components/desktop-RoutesList";
import type {
  FilterState,
  SortOption,
} from "../../desktop-UserRoutes/desktop-types";
import AppModal from "../../../../shared/components/AppModal";
import styles from "./desktop-RouteSelectionModal.module.css";
import { UnifiedControls } from "../../../desktop-components/desktop-UnifiedFilters";

interface DesktopRouteSelectionModalProps {
  peakId: number;
  peakName: string;
  onSelectRoute: (routeId: number, routeName: string, routeDate: string) => void;
  onClose: () => void;
}

/**
 * Desktop version of route selection modal
 * Similar to UserRoutes but in a modal format without header/info sections
 */
export const DesktopRouteSelectionModal: React.FC<
  DesktopRouteSelectionModalProps
> = ({ peakName, onSelectRoute, onClose }) => {
  const { user } = useAuth();
  const { t } = useI18n();

  // State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    startDate: null,
    endDate: null,
    admin_osm_ids: [],
    admin_names: [],
  });

  const [sortOption, setSortOption] = useState<SortOption>({
    field: "date",
    direction: "desc",
  });

  // Local search state for immediate UI updates (debounced before updating filters)
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Custom hooks
  const {
    allRoutes,
    availableCountries,
    loading,
    isLoadingMore,
    isLoadingRoutes,
    hasMore,
    currentPage,
    error,
    fetchRoutes,
  } = useUserRoutesData(user, filters, sortOption);

  const {
    expandedRoutes,
    isSortDropdownOpen,
    isSortDropdownClosing,
    handleRouteToggle,
    handleSortDropdownToggle,
    handleSortDropdownClose,
  } = useUserRoutesUI(filters);

  // Debounce search query updates
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev: FilterState) => ({
        ...prev,
        searchQuery: localSearchQuery,
      }));
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [localSearchQuery]);

  // Sync local search with filters when filters change externally
  useEffect(() => {
    if (filters.searchQuery !== localSearchQuery) {
      setLocalSearchQuery(filters.searchQuery);
    }
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchQuery]);

  // Event handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalSearchQuery(e.target.value);
    },
    [],
  );

  const handleClearSearch = useCallback(() => {
    setLocalSearchQuery("");
    setFilters((prev: FilterState) => ({ ...prev, searchQuery: "" }));
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  const handleSortChange = useCallback(
    (field: "date" | "peaks", direction: "asc" | "desc") => {
      setSortOption({ field, direction });
      handleSortDropdownClose();
    },
    [handleSortDropdownClose],
  );

  const handleRouteSelect = useCallback(
    (routeIdStr: string) => {
      const route = allRoutes.find((r) => String(r.id) === routeIdStr);
      if (route) {
        onSelectRoute(Number(routeIdStr), route.name, route.date);
      }
    },
    [onSelectRoute, allRoutes],
  );

  const handleUpdateFilters = useCallback(
    (newFilters: Partial<FilterState>) => {
      setFilters((prev: FilterState) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const handleClearFilters = useCallback(() => {
    setFilters({
      searchQuery: "",
      startDate: null,
      endDate: null,
      admin_osm_ids: [],
      admin_names: [],
    });
  }, []);

  const handleRetry = useCallback(() => {
    if (fetchRoutes && hasMore) {
      fetchRoutes(currentPage + 1, false);
    }
  }, [fetchRoutes, currentPage, hasMore]);

  const handleLoadMore = useCallback(() => {
    if (fetchRoutes && hasMore && !isLoadingMore && !isLoadingRoutes) {
      fetchRoutes(currentPage + 1, false);
    }
  }, [fetchRoutes, hasMore, isLoadingMore, isLoadingRoutes, currentPage]);

  // Loading state
  if (loading && allRoutes.length === 0 && !isLoadingRoutes) {
    return (
      <AppModal
        open
        onClose={onClose}
        variant="dialog"
        contentClassName={styles["desktop-route-selection-modal__content"]}
        ariaLabel={t("addManualPeaks.selectRoute", { peakName })}
      >
        <div className={styles["desktop-route-selection-modal__container"]}>
          <div className={styles["desktop-route-selection-modal__header"]}>
            <h2 className="typography-desktop-title-large">
              {t("addManualPeaks.selectRoute", { peakName })}
            </h2>
            <button
              className={styles["desktop-route-selection-modal__close"]}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <div className={styles["desktop-route-selection-modal__loading"]}>
            <Loader2 size={32} />
            <span className="typography-desktop-body-small">
              {t("common.loading")}
            </span>
          </div>
        </div>
      </AppModal>
    );
  }

  // Error state
  if (error && allRoutes.length === 0) {
    return (
      <AppModal
        open
        onClose={onClose}
        variant="dialog"
        contentClassName={styles["desktop-route-selection-modal__content"]}
        ariaLabel={t("addManualPeaks.selectRoute", { peakName })}
      >
        <div className={styles["desktop-route-selection-modal__container"]}>
          <div className={styles["desktop-route-selection-modal__header"]}>
            <h2 className="typography-desktop-title-large">
              {t("addManualPeaks.selectRoute", { peakName })}
            </h2>
            <button
              className={styles["desktop-route-selection-modal__close"]}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>

          <div className={styles["desktop-route-selection-modal__error"]}>
            <p className="typography-desktop-body-small">{error}</p>
            <button
              className={`${styles["desktop-route-selection-modal__retry"]} typography-desktop-button-small`}
              onClick={() => fetchRoutes?.(1, true)}
            >
              {t("common.retry")}
            </button>
          </div>
        </div>
      </AppModal>
    );
  }

  return (
    <AppModal
      open
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["desktop-route-selection-modal__content"]}
      ariaLabel={t("addManualPeaks.selectRoute", { peakName })}
    >
      <div className={styles["desktop-route-selection-modal__container"]}>
        {/* Header */}
        <div className={styles["desktop-route-selection-modal__header"]}>
          <h2 className="typography-desktop-title-large">
            {t("addManualPeaks.selectRoute", { peakName })}
          </h2>
          <button
            className={styles["desktop-route-selection-modal__close"]}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className={styles["desktop-route-selection-modal__main"]}>
          {/* Filters */}
          <div
            className={styles["desktop-route-selection-modal__filters-wrapper"]}
          >
            <UnifiedControls
              searchValue={localSearchQuery}
              searchPlaceholder={t("userRoutes.searchPlaceholder")}
              onSearchChange={handleSearchChange}
              onSearchClear={handleClearSearch}
              scope="userRoutes"
              t={t}
              localFilters={filters}
              onUpdateFilters={handleUpdateFilters}
              onClearFilters={handleClearFilters}
              availableCountries={availableCountries
                .filter((area) => area.admin_hierarchy["2"] && !area.admin_hierarchy["4"])
                .map((area) => ({
                  value: String(area.admin_hierarchy["2"]!.osm_id || 0),
                  label: area.admin_hierarchy["2"]!.name,
                }))}
              availableRegions={
                filters.admin_osm_ids.length > 0 && availableCountries.length > 0
                  ? availableCountries
                      .filter(
                        (area) =>
                          area.admin_hierarchy["2"] &&
                          filters.admin_osm_ids.includes(area.admin_hierarchy["2"]!.osm_id || 0) && 
                          area.admin_hierarchy["4"]
                      )
                      .map((area) => ({
                        value: String(area.admin_hierarchy["4"]!.osm_id || 0),
                        label: area.admin_hierarchy["4"]!.name,
                      })) || []
                  : []
              }
              includeElevation={false}
              orderLabel={
                sortOption.field === "peaks"
                  ? t("userRoutes.peaks")
                  : t("userRoutes.date")
              }
              orderValue={
                sortOption as {
                  field: "date" | "peaks";
                  direction: "asc" | "desc";
                }
              }
              orderSections={[
                {
                  title: t("userRoutes.sortBy"),
                  options: [
                    {
                      field: "date",
                      direction: "desc",
                      label: t("userRoutes.sortOptions.dateNewest"),
                    },
                    {
                      field: "date",
                      direction: "asc",
                      label: t("userRoutes.sortOptions.dateOldest"),
                    },
                    {
                      field: "peaks",
                      direction: "desc",
                      label: t("userRoutes.sortOptions.peaksMost"),
                    },
                    {
                      field: "peaks",
                      direction: "asc",
                      label: t("userRoutes.sortOptions.peaksLeast"),
                    },
                  ],
                },
              ]}
              isOrderOpen={isSortDropdownOpen}
              isOrderClosing={isSortDropdownClosing}
              onOrderToggle={handleSortDropdownToggle}
              onOrderChange={(f, d) =>
                handleSortChange(f as "date" | "peaks", d)
              }
              orderDisabled={false}
            />
          </div>

          {/* Routes List */}
          <div
            className={styles["desktop-route-selection-modal__routes-wrapper"]}
          >
            <RoutesList
              routes={allRoutes}
              expandedRoutes={expandedRoutes}
              selectionMode={true}
              isLoadingRoutes={isLoadingRoutes}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              error={error}
              onRouteToggle={handleRouteToggle}
              onPeakClick={() => {}} // Not used in modal
              onMapClick={handleRouteSelect}
              onRetry={handleRetry}
              onLoadMore={handleLoadMore}
              t={t}
            />
          </div>
        </div>
      </div>
    </AppModal>
  );
};
