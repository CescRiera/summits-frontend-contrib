import React from "react";
import { Loader2 } from "lucide-react";
import type { UserRoute } from "../../../../shared/api/types";
import { RouteCard } from "./RouteCard";
import { useIntersectionObserver } from "../../../hooks/useIntersectionObserver";
import styles from "../UserRoutes.module.css";

type RoutesListProps = {
  routes: UserRoute[];
  expandedRoutes: Set<string>;
  selectionMode?: boolean;
  isLoadingRoutes: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  onRouteToggle: (routeId: string) => void;
  onPeakClick: (peakId: string) => void;
  onMapClick: (routeId: string) => void;
  onDeleteClick?: ((routeId: string) => void) | undefined;
  onRetry: () => void;
  onLoadMore: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
};

export const RoutesList: React.FC<RoutesListProps> = React.memo(
  ({
    routes,
    expandedRoutes,
    selectionMode,
    isLoadingRoutes,
    isLoadingMore,
    hasMore,
    error,
    onRouteToggle,
    onPeakClick,
    onMapClick,
    onDeleteClick,
    onRetry,
    onLoadMore,
    t,
  }) => {
    const handleRetry = React.useCallback(() => {
      onRetry();
    }, [onRetry]);

    // Use intersection observer to detect when loading indicator comes into view
    const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver({
      threshold: 0.1,
      rootMargin: "100px",
    });

    // Track if we've already triggered load more to prevent multiple calls
    const hasTriggeredRef = React.useRef(false);

    // Reset trigger flag when loading states change or when routes change (filter applied)
    React.useEffect(() => {
      if (isLoadingRoutes || isLoadingMore) {
        // Don't reset during loading - wait for it to complete
        return;
      }
      // Reset when loading completes so we can trigger again if needed
      hasTriggeredRef.current = false;
    }, [isLoadingRoutes, isLoadingMore, routes.length]);

    // Trigger load more when loading indicator comes into view
    React.useEffect(() => {
      if (
        isIntersecting &&
        hasMore &&
        !isLoadingMore &&
        !isLoadingRoutes &&
        !hasTriggeredRef.current
      ) {
        hasTriggeredRef.current = true;
        onLoadMore();
      }
    }, [isIntersecting, hasMore, isLoadingMore, isLoadingRoutes, onLoadMore]);

    return (
      <div className={styles["userRoutes__routes-list"]}>
        {/* Routes Loading Spinner */}
        {isLoadingRoutes && (
          <div className={styles["userRoutes__routes-loading"]}>
            <Loader2
              size={32}
              className={styles["userRoutes__loading-spinner"]}
            />
            <span className="typography-body-medium">
              {t("userRoutes.loadingRoutes")}
            </span>
          </div>
        )}

        {/* Routes */}
        {!isLoadingRoutes &&
          routes.map((route) => (
            <div key={route.id} className={styles["route-card-wrapper"]}>
              <RouteCard
                route={route}
                isExpanded={expandedRoutes.has(route.id)}
                isSelectionMode={Boolean(selectionMode)}
                onToggle={onRouteToggle}
                onPeakClick={onPeakClick}
                onMapClick={onMapClick}
                onDeleteClick={onDeleteClick}
                t={t}
              />
            </div>
          ))}

        {/* Loading div - always present when there are more pages */}
        {!isLoadingRoutes && hasMore && routes.length > 0 && (
          <div ref={loadMoreRef} className={styles["userRoutes__loading-more"]}>
            {isLoadingMore ? (
              <>
                <Loader2
                  size={24}
                  className={styles["userRoutes__loading-spinner"]}
                />
                <span className="typography-body-medium">
                  {t("userRoutes.loadingMore")}
                </span>
              </>
            ) : (
              <div style={{ height: "1px" }} />
            )}
          </div>
        )}

        {/* End message */}
        {!isLoadingRoutes && !hasMore && routes.length > 0 && (
          <div className={styles["userRoutes__end-message"]}>
            <p className="typography-body-medium">
              {t("userRoutes.endMessage")}
            </p>
          </div>
        )}

        {/* Error state for pagination */}
        {!isLoadingRoutes && error && routes.length > 0 && (
          <div
            className={`${styles["userRoutes__pagination-error"]} typography-body-small`}
          >
            <p className="typography-body-medium">
              {t("userRoutes.paginationError")}
            </p>
            <button
              className={styles["userRoutes__retry-button"]}
              onClick={handleRetry}
            >
              <span className="typography-button-medium">
                {t("userRoutes.tryAgain")}
              </span>
            </button>
          </div>
        )}

        {/* No results */}
        {!isLoadingRoutes && routes.length === 0 && (
          <div className={styles["userRoutes__no-results"]}>
            <p className="typography-body-medium">
              {t("userRoutes.noResults")}
            </p>
          </div>
        )}
      </div>
    );
  }
);
