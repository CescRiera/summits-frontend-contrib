import React, { useState, useEffect } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { getUserRoutes } from "../../../shared/api/endpoints";
import type { UserRoute } from "../../../shared/api/types";
import styles from "./RouteAssociationBottomSheet.module.css";

interface RouteAssociationBottomSheetProps {
  peakName: string;
  onAssociate: (routeId: number | null) => void;
  onClose: () => void;
}

/**
 * Bottom sheet component for associating a peak with a user's route
 * or confirming it as a standalone manual peak
 */
export const RouteAssociationBottomSheet: React.FC<
  RouteAssociationBottomSheetProps
> = ({ peakName, onAssociate, onClose }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [routes, setRoutes] = useState<UserRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());

  // Fetch user routes on mount
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user || !user.internalUserId) {
          setError(t("routeAssociation.authRequired"));
          setLoading(false);
          return;
        }

        // Fetch routes for current user
        const response = await getUserRoutes({ page: 1, limit: 100 });
        setRoutes(response.routes || []);
      } catch (err) {
        console.error("Failed to fetch routes:", err);
        setError(t("routeAssociation.fetchError"));
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [user?.internalUserId, t]);

  const handleStandalone = () => {
    onAssociate(null);
    onClose();
  };

  const handleSelectRoute = () => {
    if (selectedRouteId !== null) {
      onAssociate(selectedRouteId);
      onClose();
    }
  };

  const toggleRoute = (routeId: string) => {
    setExpandedRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  };

  return (
    <div className={styles["route-association"]}>
      {/* Header */}
      <div className={styles["route-association__header"]}>
        <h2 className={`${styles["route-association__title"]} typography-title-large`}>
          {t("routeAssociation.title")}
        </h2>
        <p className={`${styles["route-association__subtitle"]} typography-body-small`}>
          {t("routeAssociation.subtitle", { peakName })}
        </p>
      </div>

      {/* Content */}
      <div className={styles["route-association__content"]}>
        {loading ? (
          <div className={styles["route-association__loading"]}>
            <Loader2
              size={32}
              className={styles["route-association__spinner"]}
            />
            <span className="typography-body-small">
              {t("routeAssociation.loading")}
            </span>
          </div>
        ) : error ? (
          <div className={styles["route-association__error"]}>
            <p className="typography-body-small">{error}</p>
          </div>
        ) : routes.length === 0 ? (
          <div className={styles["route-association__empty"]}>
            <p className="typography-body-small">
              {t("routeAssociation.noRoutes")}
            </p>
          </div>
        ) : (
          <div className={styles["route-association__routes"]}>
            {routes.map((route) => (
              <div
                key={route.id}
                className={`${styles["route-association__route-item"]} ${
                  selectedRouteId === parseInt(route.id)
                    ? styles["route-association__route-item--selected"]
                    : ""
                }`}
              >
                <div
                  className={styles["route-association__route-header"]}
                  onClick={() => {
                    setSelectedRouteId(
                      selectedRouteId === parseInt(route.id)
                        ? null
                        : parseInt(route.id),
                    );
                    toggleRoute(route.id);
                  }}
                >
                  <div className={styles["route-association__route-info"]}>
                    <h3
                      className={`${styles["route-association__route-name"]} typography-label-medium`}
                    >
                      {route.name}
                    </h3>
                    {route.date && (
                      <p
                        className={`${styles["route-association__route-date"]} typography-body-small`}
                      >
                        {new Date(route.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className={styles["route-association__route-chevron"]}>
                    {expandedRoutes.has(route.id) ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </div>

                {/* Route peaks preview */}
                {expandedRoutes.has(route.id) && route.peaks && (
                  <div className={styles["route-association__route-peaks"]}>
                    <p className="typography-body-small">
                      {t("routeAssociation.peaks", {
                        count: route.peaks.length,
                      })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={styles["route-association__footer"]}>
        <button
          className={`${styles["route-association__button"]} ${styles["route-association__button--secondary"]} typography-button-medium`}
          onClick={handleStandalone}
        >
          {t("routeAssociation.noRoute")}
        </button>
        <button
          className={`${styles["route-association__button"]} ${
            styles["route-association__button--primary"]
          } ${
            selectedRouteId === null
              ? styles["route-association__button--disabled"]
              : ""
          } typography-button-medium`}
          onClick={handleSelectRoute}
          disabled={selectedRouteId === null}
        >
          {t("routeAssociation.confirm")}
        </button>
      </div>
    </div>
  );
};
