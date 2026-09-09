import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../shared/context/AuthContext";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import LoginRequiredPopup from "../../components/LoginRequiredPopup/LoginRequiredPopup";
import LoadingScreen from "../../components/LoadingScreen/LoadingScreen";
import { useUserRoutesData } from "./hooks/useUserRoutesData";
import { useUserRoutesUI } from "./hooks/useUserRoutesUI";
import { UnifiedFiltersPopup, UnifiedControls } from "../../components/UnifiedFilters";
import type { FilterState, SortOption } from "./types";
import styles from "./UserRoutes.module.css";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import OverlayInfoSection from "../../components/Overlay/OverlayInfoSection/OverlayInfoSection";
import { useAdminLevels } from "../../../shared/hooks/useAdminLevels";
import { RoutesList } from "./components/RoutesList";
import AddRouteModal from "../../components/AddRouteModal/AddRouteModal";
import AppModal from "../../../shared/components/AppModal/AppModal";

// Memoized Header Component - only re-renders when user data changes
const MemoizedHeader = React.memo<{
  id?: string;
  user_name?: string;
  user_image?: string;
  t: (key: string, params?: Record<string, unknown>) => string;
  onBack: () => void;
  userImageClassName: string;
}>(({ id, user_name, t, onBack }) => {
  return (
    <OverlayHeader
      title={
        id && user_name
          ? t("userRoutes.userTitle", { userName: user_name })
          : t("userRoutes.title")
      }
      onBack={onBack}
      rightContent={undefined}
    />
  );
});

MemoizedHeader.displayName = "MemoizedHeader";

// Memoized Info Section Component - only re-renders when user data changes
const MemoizedInfoSection = React.memo<{
  id?: string;
  stats: {
    user_name?: string;
    statistics: {
      total_routes: number;
      total_peaks: number;
    };
    pagination: {
      total_routes: number;
    };
  };
  t: (key: string, params?: Record<string, unknown>) => string;
}>(({ stats, t }) => {
  return (
    <OverlayInfoSection
      stats={[
        {
          label: t("userRoutes.routes"),
          value: stats.pagination.total_routes,
          variant: "primary",
        },
      ]}
    />
  );
});

MemoizedInfoSection.displayName = "MemoizedInfoSection";

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
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  const { adminLevels, handleAdminLevelChange, resetAdminLevels } = useAdminLevels(
    useCallback(({ ids, names }: { ids: number[]; names: string[] }) => {
      handleUpdateFilters({ admin_osm_ids: ids, admin_names: names });
    }, [handleUpdateFilters])
  );

  // Memoize order sections to prevent unnecessary re-renders of UnifiedControls
  const orderSections = useMemo(() => [
    {
      title: t("userRoutes.sortBy"),
      options: [
        {
          field: "date" as const,
          direction: "desc" as const,
          label: t("userRoutes.sortOptions.dateNewest"),
        },
        {
          field: "date" as const,
          direction: "asc" as const,
          label: t("userRoutes.sortOptions.dateOldest"),
        },
        {
          field: "peaks" as const,
          direction: "desc" as const,
          label: t("userRoutes.sortOptions.peaksMost"),
        },
        {
          field: "peaks" as const,
          direction: "asc" as const,
          label: t("userRoutes.sortOptions.peaksLeast"),
        },
      ],
    },
  ], [t]);

  // Sync local filters with current filters when opening
  const handleOpenFiltersTracked = useCallback(() => {
    trackEvent("interaction", "userRoutes_filters_open");
    handleOpenFilters();
  }, [handleOpenFilters, trackEvent]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchQuery !== "" ||
      filters.startDate !== null ||
      filters.endDate !== null ||
      (filters.admin_osm_ids && filters.admin_osm_ids.length > 0)
    );
  }, [filters]);

  // Handle Clear Filters
  const handleClearFiltersWithAdmin = useCallback(() => {
    handleClearFilters();
    resetAdminLevels();
    
    // Create the cleared filter state
    const clearedFilters: FilterState = {
      searchQuery: "",
      startDate: null,
      endDate: null,
      admin_osm_ids: [],
      admin_names: [],
    };
    
    // Apply immediately to parent state to update UI and trigger fetch
    setFilters(clearedFilters);
    setLocalSearchQuery("");
    handleCloseFilters();
  }, [handleClearFilters, resetAdminLevels, handleCloseFilters]);

  // Debounce search query updates
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const trimmed = localSearchQuery.trim();
      const previous = filters.searchQuery.trim();

      if (trimmed !== previous) {
        // Only search if 2+ characters or clearing search
        if (trimmed.length === 0 || trimmed.length >= 2) {
          setIsTransitioning(true);
          setFilters((prev) => ({ ...prev, searchQuery: trimmed }));
        }
      }
    }, 500);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchQuery]);

  // Event handlers
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      trackEvent("search", "userRoutes_search_change");
      setLocalSearchQuery(e.target.value);
    },
    [trackEvent]
  );
  
  // Handle transition timeout
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 400); // 400ms match standard transition duration
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isTransitioning]);

  const handleClearSearch = useCallback(() => {
    trackEvent("search", "userRoutes_search_clear");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setLocalSearchQuery("");
    setFilters((prev) => ({ ...prev, searchQuery: "" }));
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

  const handleMapClick = useCallback(
    (routeId: string) => {
      trackEvent("route_click", `userRoutes_${routeId}`);
      navigate(`/routes/${routeId}`);
    },
    [navigate, trackEvent]
  );

  const handleApplyFilters = useCallback(() => {
    trackEvent("interaction", "userRoutes_filters_apply");
    setIsTransitioning(true);
    setFilters({ ...localFilters });
    handleCloseFilters();
  }, [localFilters, handleCloseFilters, trackEvent]);

  const handleRetry = useCallback(() => {
    trackEvent("interaction", "userRoutes_retry");
    if (fetchRoutes && hasMore) {
      fetchRoutes(currentPage + 1, false);
    }
  }, [fetchRoutes, currentPage, hasMore, trackEvent]);

  const handleLoadMore = useCallback(() => {
    trackEvent("pagination", "userRoutes_load_more");
    if (fetchRoutes && hasMore && !isLoadingMore && !isLoadingRoutes) {
      fetchRoutes(currentPage + 1, false);
    }
  }, [fetchRoutes, hasMore, isLoadingMore, isLoadingRoutes, currentPage, trackEvent]);

  const handleBack = useCallback(() => {
    trackEvent("navigation", "userRoutes_back");
    if (overlayContext) {
      overlayContext.handleOverlayBack();
    } else {
      navigate(-1);
    }
  }, [overlayContext, navigate, trackEvent]);

  const handleSortDropdownToggleTracked = useCallback(() => {
    trackEvent("interaction", "userRoutes_sort_dropdown_toggle");
    handleSortDropdownToggle();
  }, [handleSortDropdownToggle, trackEvent]);

  const handleOpenAddRoute = useCallback(() => {
    if (!user) {
      setShowLoginPopup(true);
      return;
    }
    trackEvent("interaction", "userRoutes_add_route_open");
    setIsAddRouteOpen(true);
  }, [trackEvent, user]);

  const handleCloseAddRoute = useCallback(() => {
    setIsAddRouteOpen(false);
  }, []);

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

  // Show login popup if no user and no id
  useEffect(() => {
    if (!user && !id) {
      setShowLoginPopup(true);
    }
  }, [user, id]);

  // Loading state
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
          <p className="typography-body-medium">{error}</p>
          <button className={styles["userRoutes__retry-button"]} onClick={handleRetry}>
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
          trackEvent("interaction", "userRoutes_login_popup_close");
          setShowLoginPopup(false);
        }}
        message="auth.loginRequired.myRoutes"
      />

      <MemoizedHeader
        {...(id !== undefined && { id })}
        {...(initialStatsRef.current?.user_name !== undefined && {
          user_name: initialStatsRef.current.user_name,
        })}
        {...(initialStatsRef.current?.user_image !== undefined && {
          user_image: initialStatsRef.current.user_image,
        })}
        t={t}
        onBack={handleBack}
        userImageClassName={styles["userRoutes__userImage"] || ""}
      />

      {initialStatsRef.current && (
        <MemoizedInfoSection stats={initialStatsRef.current} t={t} />
      )}

      {/* Sticky Filters */}
      <div className={styles["userRoutes__filters-wrapper"]}>
        <UnifiedControls
          searchValue={localSearchQuery || ""}
          searchPlaceholder={t("userRoutes.searchPlaceholder")}
          onSearchChange={handleSearchChange}
          onSearchClear={handleClearSearch}
          filtersLabel={t("userRoutes.filters")}
          hasActiveFilters={hasActiveFilters}
          onOpenFilters={handleOpenFiltersTracked}
          orderLabel={
            sortOption.field === "peaks" ? t("userRoutes.peaks") : t("userRoutes.date")
          }
          orderValue={sortOption as { field: "date" | "peaks"; direction: "asc" | "desc" }}
          orderSections={orderSections}
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
            className={`${styles["userRoutes__add-route-btn"]} typography-label-large`}
            onClick={handleOpenAddRoute}
          >
            {t("userRoutes.addRoute")}
          </button>
        </div>
      )}

      <div
        className={`${styles["userRoutes__list-container"]} ${
          isTransitioning
            ? styles["userRoutes__list-container--transitioning"]
            : styles["userRoutes__list-container--loaded"]
        }`}
      >
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
        onDeleteClick={id ? undefined : handleDeleteClick}
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
              className={`${styles["userRoutes__modal-btn"]} ${styles["userRoutes__modal-btn--secondary"]} typography-button-medium`}
              onClick={handleCancelDelete}
              disabled={isDeleting}
            >
              {t("common.cancel")}
            </button>
            <button
              className={`${styles["userRoutes__modal-btn"]} ${styles["userRoutes__modal-btn--danger"]} typography-button-medium`}
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
          <span className="typography-body-small">{deleteStatus.message}</span>
        </div>
      )}
      </div>

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
        onClearFilters={handleClearFiltersWithAdmin}
        onApplyFilters={handleApplyFilters}
      />

      <AddRouteModal
        isOpen={isAddRouteOpen}
        onClose={handleCloseAddRoute}
        onSuccess={() => {
          if (fetchRoutes) {
            fetchRoutes(1, true);
          }
        }}
      />
    </div>
  );
};

export default UserRoutes;
