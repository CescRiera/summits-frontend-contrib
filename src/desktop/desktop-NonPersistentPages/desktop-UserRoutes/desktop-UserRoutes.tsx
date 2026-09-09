import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { Plus } from "lucide-react";
import LoginRequiredPopup from "../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup.tsx";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import { useUserRoutesData } from "./desktop-hooks/desktop-useUserRoutesData.ts";
import { useUserRoutesUI } from "./desktop-hooks/desktop-useUserRoutesUI.ts";
import { RoutesList } from "./desktop-components/desktop-RoutesList.tsx";
import type { FilterState, SortOption } from "./desktop-types.ts";
import styles from "./desktop-UserRoutes.module.css";
import { UnifiedControls } from "../../desktop-components/desktop-UnifiedFilters";
import { useOptionalOverlayContext } from "../../desktop-components/desktop-Overlay/desktop-OverlayContext.tsx";
import DesktopAddRouteModal from "../../desktop-components/desktop-AddRouteModal/desktop-AddRouteModal.tsx";
import AppModal from "../../../shared/components/AppModal/AppModal";

const UserRoutes: React.FC = () => {
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const { user } = useAuth();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { id } = useParams<{ id?: string }>();

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

  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Local search state for immediate UI updates (debounced before updating filters)
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store initial stats data separately - only update on initial load, not on filter changes
  const initialStatsRef = useRef<{
    user_name?: string;
    user_image?: string;
    statistics: {
      total_routes: number;
      total_peaks: number;
    };
    pagination: {
      total_routes: number;
    };
  } | null>(null);

  // Custom hooks
  const {
    routesData,
    allRoutes,
    availableCountries,
    loading,
    isLoadingMore,
    isLoadingRoutes,
    hasMore,
    currentPage,
    error,
    fetchRoutes,
    deleteUserRoute,
  } = useUserRoutesData(user, filters, sortOption, id);

  // Update initial stats only on first load or when user changes
  useEffect(() => {
    if (routesData) {
      // Only update if it's the first load or user changed
      if (
        !initialStatsRef.current ||
        initialStatsRef.current.user_name !== routesData.user_name ||
        initialStatsRef.current.user_image !== routesData.user_image
      ) {
        initialStatsRef.current = {
          ...(routesData.user_name !== undefined && { user_name: routesData.user_name }),
          ...(routesData.user_image !== undefined && { user_image: routesData.user_image }),
          statistics: {
            total_routes: routesData.statistics.total_routes,
            total_peaks: routesData.statistics.total_peaks,
          },
          pagination: {
            total_routes: routesData.pagination.total_routes,
          },
        };
      }
    }
  }, [routesData?.user_name, routesData?.user_image, user, id]);

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
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout to update filters after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, searchQuery: localSearchQuery }));
    }, 300);

    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [localSearchQuery]);

  // Sync local search with filters when filters change externally (e.g., clear filters)
  useEffect(() => {
    if (filters.searchQuery !== localSearchQuery) {
      setLocalSearchQuery(filters.searchQuery);
    }
    // eslint_disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchQuery]);

  // Event handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      trackEvent("search", "userRoutes_desktop_search_change");
      setLocalSearchQuery(e.target.value);
    },
    [trackEvent]
  );

  const handleClearSearch = useCallback(() => {
    trackEvent("search", "userRoutes_desktop_search_clear");
    setLocalSearchQuery("");
    setFilters((prev) => ({ ...prev, searchQuery: "" }));
    // Clear any pending timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, [trackEvent]);

  const handleSortChange = useCallback(
    (field: "date" | "peaks", direction: "asc" | "desc") => {
      trackEvent("sort_change", `userRoutes_${field}_${direction}`);
      setSortOption({ field, direction });
      handleSortDropdownClose();
    },
    [handleSortDropdownClose, trackEvent]
  );

  const handlePeakClick = useCallback(
    (peakId: string) => {
      trackEvent("peak_click", `userRoutes_${peakId}`);
      navigate(`/peaks/${peakId}`);
    },
    [navigate, trackEvent]
  );

  // Update overlay name for breadcrumbs when routesData loads
  useEffect(() => {
    if (!routesData?.user_name || !id || !overlayContext) return;
    
    const baseStorageKey = `userroutes:${id}`;
    
    // Find the overlay in the stack that matches this user routes
    const matchingOverlay = overlayContext.overlayStack.find(
      (overlay) => overlay.baseStorageKey === baseStorageKey
    );
    
    // Only update if the name is different to avoid unnecessary updates
    if (matchingOverlay && matchingOverlay.name !== routesData.user_name) {
      overlayContext.updateOverlayNameByBaseKey(baseStorageKey, routesData.user_name);
    }
  }, [routesData?.user_name, id, overlayContext]);

  const handleMapClick = useCallback(
    (routeId: string) => {
      trackEvent("route_click", `userRoutes_${routeId}`);
      navigate(`/routes/${routeId}`);
    },
    [navigate, trackEvent]
  );

  // Filter update handler (applies immediately)
  const handleUpdateFilters = useCallback(
    (newFilters: Partial<Omit<FilterState, "searchQuery">>) => {
      const updatedFilters = { ...filters, ...newFilters };
      
      // Track filter changes
      if (newFilters.startDate !== undefined || newFilters.endDate !== undefined) {
        trackEvent("filter_change", `userRoutes_date_${newFilters.startDate || "null"}_${newFilters.endDate || "null"}`);
      }
      if (newFilters.admin_osm_ids !== undefined) {
        trackEvent("filter_change", `userRoutes_admin_${newFilters.admin_osm_ids.join(",") || "all"}`);
      }
      
      setFilters(updatedFilters);
    },
    [filters, trackEvent]
  );

  const handleClearFilters = useCallback(() => {
    trackEvent("filter_change", "userRoutes_clear_all");
    const clearedFilters: FilterState = {
      searchQuery: filters.searchQuery, // Keep search query
      startDate: null,
      endDate: null,
      admin_osm_ids: [],
      admin_names: [],
    };
    setFilters(clearedFilters);
  }, [filters.searchQuery, trackEvent]);

  const handleRetry = useCallback(() => {
    trackEvent("interaction", "userRoutes_desktop_retry");
    if (fetchRoutes && hasMore) {
      fetchRoutes(currentPage + 1, false);
    }
  }, [fetchRoutes, currentPage, hasMore, trackEvent]);

  const handleLoadMore = useCallback(() => {
    trackEvent("pagination", "userRoutes_desktop_load_more");
    if (fetchRoutes && hasMore && !isLoadingMore && !isLoadingRoutes) {
      fetchRoutes(currentPage + 1, false);
    }
  }, [fetchRoutes, hasMore, isLoadingMore, isLoadingRoutes, currentPage, trackEvent]);

  const handleDeleteClick = useCallback((routeId: string) => {
    setRouteToDelete(routeId);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!routeToDelete) return;

    try {
      setIsDeleting(true);
      await deleteUserRoute(routeToDelete);
      setDeleteStatus({
        type: "success",
        message: t("userRoutes.deleteSuccess"),
      });
      setTimeout(() => setDeleteStatus(null), 3000);
    } catch (err) {
      setDeleteStatus({
        type: "error",
        message: t("userRoutes.deleteError"),
      });
      setTimeout(() => setDeleteStatus(null), 3000);
    } finally {
      setIsDeleting(false);
      setRouteToDelete(null);
    }
  }, [deleteUserRoute, routeToDelete, t]);

  const handleCancelDelete = useCallback(() => {
    if (isDeleting) return;
    setRouteToDelete(null);
  }, [isDeleting]);

  const handleSortDropdownToggleTracked = useCallback(() => {
    trackEvent("interaction", "userRoutes_desktop_sort_dropdown_toggle");
    handleSortDropdownToggle();
  }, [handleSortDropdownToggle, trackEvent]);

  const handleOpenAddRoute = useCallback(() => {
    if (!user) {
      setShowLoginPopup(true);
      return;
    }
    trackEvent("interaction", "userRoutes_desktop_add_route_open");
    setIsAddRouteOpen(true);
  }, [trackEvent, user]);

  const handleCloseAddRoute = useCallback(() => {
    setIsAddRouteOpen(false);
  }, []);

  // Show login popup if no user and no id
  useEffect(() => {
    if (!user && !id) {
      setShowLoginPopup(true);
    }
  }, [user, id]);

  // Loading state - only show full screen on initial load
  if (loading && allRoutes.length === 0 && !isLoadingRoutes) {
    return (
      <div className={styles["userRoutes"]}>
        <LoadingScreen message={t("common.loading")} />
      </div>
    );
  }

  // Error state
  if (error && allRoutes.length === 0) {
    return (
      <div className={styles["userRoutes"]}>
        <div className={styles["userRoutes__error-container"]}>
          <p className="typography-desktop-body-small">{error}</p>
          <button
            className={styles["userRoutes__retry-button"]}
            onClick={handleRetry}
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["userRoutes"]}>
      <LoginRequiredPopup
        isOpen={showLoginPopup}
        onClose={() => {
          trackEvent("interaction", "userRoutes_desktop_login_popup_close");
          setShowLoginPopup(false);
        }}
        message="auth.loginRequired.myRoutes"
      />

      {/* Sticky Filters with Header and Info Section */}
      <div className={styles["userRoutes__filters-wrapper"]}>
        {/* Add Route Button - only for current user */}
        
        <UnifiedControls
          headerTitle={
            id && initialStatsRef.current?.user_name
              ? t("userRoutes.userTitle", { userName: initialStatsRef.current.user_name })
              : t("userRoutes.title")
          }
          headerRightContent={undefined}
          {...(initialStatsRef.current
            ? {
                infoDescription: id && initialStatsRef.current?.user_name
                  ? t("userRoutes.userDescription", {
                      userName: initialStatsRef.current.user_name,
                      totalRoutes: initialStatsRef.current.statistics.total_routes,
                      totalPeaks: initialStatsRef.current.statistics.total_peaks,
                    })
                  : t("userRoutes.description", {
                      totalRoutes: initialStatsRef.current.statistics.total_routes,
                      totalPeaks: initialStatsRef.current.statistics.total_peaks,
                    }),
                infoStats: [
                  {
                    label: t("userRoutes.routes"),
                    value: initialStatsRef.current.pagination.total_routes,
                    variant: "primary" as const,
                  },
                ],
              }
            : {})}
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
            sortOption as { field: "date" | "peaks"; direction: "asc" | "desc" }
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
          onOrderToggle={handleSortDropdownToggleTracked}
          onOrderChange={(f, d) => handleSortChange(f as "date" | "peaks", d)}
          orderDisabled={false}
        />
        
      </div>
      {!id && user && (
          <div className={styles["userRoutes__add-route-button"]}>
            <button
              className={`${styles["userRoutes__add-route-btn"]} typography-desktop-button-small`}
              onClick={handleOpenAddRoute}
            >
              <Plus size={18} />
              {t("userRoutes.addRoute")}
            </button>
          </div>
        )}

      {/* Routes List */}
      <RoutesList
        routes={allRoutes}
        expandedRoutes={expandedRoutes}
        isLoadingRoutes={isLoadingRoutes}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        error={error}
        onRouteToggle={handleRouteToggle}
        onPeakClick={handlePeakClick}
        onMapClick={handleMapClick}
        onDeleteClick={handleDeleteClick}
        onRetry={handleRetry}
        onLoadMore={handleLoadMore}
        t={t}
      />

      <AppModal
        open={routeToDelete !== null}
        onClose={handleCancelDelete}
        variant="dialog"
      >
        <div className={styles["userRoutes__delete-modal"]}>
          <h2 className="typography-title-large">
            {t("userRoutes.deleteConfirmTitle")}
          </h2>
          <p className="typography-body-medium">
            {t("userRoutes.deleteConfirmMessage")}
          </p>
          <div className={styles["userRoutes__modal-actions"]}>
            <button
              className={`${styles["userRoutes__modal-btn"]} ${styles["userRoutes__modal-btn--secondary"]} typography-desktop-button-medium`}
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              {t("common.cancel")}
            </button>
            <button
              className={`${styles["userRoutes__modal-btn"]} ${styles["userRoutes__modal-btn--danger"]} typography-desktop-button-medium`}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("common.deleting") || "Deleting..." : t("common.delete")}
            </button>
          </div>
        </div>
      </AppModal>

      {deleteStatus && (
        <div
          className={`${styles["userRoutes__status-toast"]} ${
            styles[`userRoutes__status-toast--${deleteStatus.type}`]
          }`}
        >
          <span className="typography-desktop-body-small">{deleteStatus.message}</span>
        </div>
      )}

      <DesktopAddRouteModal
        isOpen={isAddRouteOpen}
        onClose={handleCloseAddRoute}
        onSuccess={() => {
          if (fetchRoutes) {
            fetchRoutes(1, true);
          }
        }}
        analyticsCategory="interaction"
        analyticsPrefix="userRoutes_desktop_add_route"
        idPrefix="userRoutes"
      />
    </div>
  );
};

export default UserRoutes;
