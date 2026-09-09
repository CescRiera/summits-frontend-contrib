import React, { useState, useCallback, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../../../shared/context/AuthContext";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useUserRoutesData } from "../../UserRoutes/hooks/useUserRoutesData";
import { useUserRoutesUI } from "../../UserRoutes/hooks/useUserRoutesUI";
import { RoutesList } from "../../UserRoutes/components/RoutesList";
import { UnifiedFiltersPopup, UnifiedControls } from "../../../components/UnifiedFilters";
import { useAdminLevels } from "../../../../shared/hooks/useAdminLevels";
import type { FilterState, SortOption } from "../../UserRoutes/types";
import AppModal from "../../../../shared/components/AppModal";
import styles from "./RouteSelectionModal.module.css";

interface RouteSelectionModalProps {
  isOpen: boolean;
  peakName: string;
  onSelectRoute: (routeId: number, routeName: string, routeDate: string) => void;
  onClose: () => void;
}

/**
 * Modal for selecting an existing route to associate with a peak
 * Similar to UserRoutes but in a modal format without header/info sections
 */
export const RouteSelectionModal: React.FC<RouteSelectionModalProps> = ({
  isOpen,
  peakName,
  onSelectRoute,
  onClose,
}) => {
  const { user } = useAuth();
  const { t } = useI18n();

  // Initial state
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
    isFiltersPopupOpen,
    localFilters,
    handleRouteToggle,
    handleOpenFilters,
    handleCloseFilters,
    handleUpdateFilters,
    handleClearFilters,
    handleSortDropdownToggle,
    handleSortDropdownClose,
  } = useUserRoutesUI(filters);

  const { adminLevels, handleAdminLevelChange, resetAdminLevels } = useAdminLevels(({ ids, names }: { ids: number[]; names: string[] }) => {
    handleUpdateFilters({ admin_osm_ids: ids, admin_names: names });
  });

  const clearFilters = useCallback(() => {
    handleClearFilters();
    resetAdminLevels();
  }, [handleClearFilters, resetAdminLevels]);

  // Debounce search query updates
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchQuery: localSearchQuery }));
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
    setFilters((prev) => ({ ...prev, searchQuery: "" }));
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
    (routeId: string) => {
      const selectedRoute = allRoutes.find((r) => String(r.id) === String(routeId));
      if (selectedRoute) {
        onSelectRoute(Number(routeId), selectedRoute.name, selectedRoute.date);
      }
    },
    [onSelectRoute, allRoutes],
  );

  const handleApplyFilters = useCallback(() => {
    setFilters(localFilters);
    handleCloseFilters();
  }, [localFilters, handleCloseFilters]);

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

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["route-selection-modal__content"]}
      ariaLabel={t("addManualPeaks.selectRoute", { peakName })}
    >
      {/* Header */}
      <div className={styles["route-selection-modal__header"]}>
        <h2 className="typography-headline-small">
          {t("addManualPeaks.selectRoute", { peakName })}
        </h2>
        <button
          className={styles["route-selection-modal__close"]}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {loading && allRoutes.length === 0 && !isLoadingRoutes ? (
        <div className={styles["route-selection-modal__loading"]}>
          <Loader2 size={32} />
          <span className="typography-body-small">{t("common.loading")}</span>
        </div>
      ) : error && allRoutes.length === 0 ? (
        <div className={styles["route-selection-modal__error"]}>
          <p className="typography-body-medium">{error}</p>
          <button
            className={`${styles["route-selection-modal__retry"]} typography-label-medium`}
            onClick={() => fetchRoutes?.(1, true)}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className={styles["route-selection-modal__filters-wrapper"]}>
            <UnifiedControls
              searchValue={localSearchQuery || ""}
              searchPlaceholder={t("userRoutes.searchPlaceholder")}
              onSearchChange={handleSearchChange}
              onSearchClear={handleClearSearch}
              filtersLabel={t("userRoutes.filters")}
              hasActiveFilters={Boolean(
                filters.searchQuery ||
                  filters.startDate ||
                  filters.endDate ||
                  (filters.admin_osm_ids && filters.admin_osm_ids.length > 0),
              )}
              onOpenFilters={handleOpenFilters}
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
              onOrderChange={(f, d) => handleSortChange(f as "date" | "peaks", d)}
              orderDisabled={false}
            />
          </div>

          {/* Routes List */}
          <div className={styles["route-selection-modal__routes-wrapper"]}>
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

          {/* Filters Popup */}
          <UnifiedFiltersPopup
            isOpen={isFiltersPopupOpen}
            scope="userRoutes"
            t={t}
            localFilters={localFilters}
            adminLevels={adminLevels}
            onAdminLevelChange={handleAdminLevelChange}
            includeElevation={false}
            onClose={handleCloseFilters}
            onUpdateFilters={handleUpdateFilters}
            onClearFilters={clearFilters}
            onApplyFilters={handleApplyFilters}
          />
        </>
      )}
    </AppModal>
  );
};
