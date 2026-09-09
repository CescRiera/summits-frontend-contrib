import React, { useState, useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { getUserRoutes } from "../../../shared/api/endpoints";
import type { UserRoute } from "../../../shared/api/types";
import AppModal from "../../../shared/components/AppModal";
import styles from "./desktop-RouteAssociationModal.module.css";

interface DesktopRouteAssociationModalProps {
  peakName: string;
  onAssociate: (routeId: number | null) => void;
  onClose: () => void;
}

/**
 * Modal component for desktop: associates a peak with a user's route
 * or confirms it as a standalone manual peak
 */
export const DesktopRouteAssociationModal: React.FC<
  DesktopRouteAssociationModalProps
> = ({ peakName, onAssociate, onClose }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [routes, setRoutes] = useState<UserRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

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

  return (
    <AppModal
      open
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["desktop-route-association-modal__modal"]}
      ariaLabel={t("routeAssociation.title")}
    >
      <div>
        {/* Header */}
        <div className={styles["desktop-route-association-modal__header"]}>
          <div
            className={styles["desktop-route-association-modal__title-section"]}
          >
            <h2
              className={`${styles["desktop-route-association-modal__title"]} typography-desktop-headline-medium`}
            >
              {t("routeAssociation.title")}
            </h2>
            <p
              className={`${styles["desktop-route-association-modal__subtitle"]} typography-desktop-body-medium`}
            >
              {t("routeAssociation.subtitle", { peakName })}
            </p>
          </div>
          <button
            className={styles["desktop-route-association-modal__close"]}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles["desktop-route-association-modal__content"]}>
          {loading ? (
            <div className={styles["desktop-route-association-modal__loading"]}>
              <Loader2
                size={40}
                className={styles["desktop-route-association-modal__spinner"]}
              />
              <span className="typography-desktop-body-medium">
                {t("routeAssociation.loading")}
              </span>
            </div>
          ) : error ? (
            <div className={styles["desktop-route-association-modal__error"]}>
              <p className="typography-desktop-body-medium">{error}</p>
            </div>
          ) : routes.length === 0 ? (
            <div className={styles["desktop-route-association-modal__empty"]}>
              <p className="typography-desktop-body-medium">
                {t("routeAssociation.noRoutes")}
              </p>
            </div>
          ) : (
            <div className={styles["desktop-route-association-modal__routes"]}>
              {routes.map((route) => (
                <div
                  key={route.id}
                  className={`${
                    styles["desktop-route-association-modal__route-item"]
                  } ${
                    selectedRouteId === parseInt(route.id)
                      ? styles[
                          "desktop-route-association-modal__route-item--selected"
                        ]
                      : ""
                  }`}
                  onClick={() => setSelectedRouteId(parseInt(route.id))}
                >
                  <div
                    className={
                      styles["desktop-route-association-modal__route-checkbox"]
                    }
                  >
                    <div
                      className={`${styles["desktop-route-association-modal__checkbox"]} typography-button-small`}
                    />
                  </div>
                  <div
                    className={
                      styles["desktop-route-association-modal__route-info"]
                    }
                  >
                    <h3
                      className={`${styles["desktop-route-association-modal__route-name"]} typography-desktop-body-medium`}
                    >
                      {route.name}
                    </h3>
                    {route.date && (
                      <p
                        className={`${styles["desktop-route-association-modal__route-meta"]} typography-desktop-body-small`}
                      >
                        {new Date(route.date).toLocaleDateString()}
                        {route.peaks && ` · ${route.peaks.length} peaks`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles["desktop-route-association-modal__footer"]}>
          <button
            className={`${styles["desktop-route-association-modal__button"]} ${styles["desktop-route-association-modal__button--secondary"]} typography-button-medium`}
            onClick={handleStandalone}
          >
            {t("routeAssociation.noRoute")}
          </button>
          <button
            className={`${styles["desktop-route-association-modal__button"]} ${
              styles["desktop-route-association-modal__button--primary"]
            } typography-button-medium ${
              selectedRouteId === null
                ? styles["desktop-route-association-modal__button--disabled"]
                : ""
            }`}
            onClick={handleSelectRoute}
            disabled={selectedRouteId === null}
          >
            {t("routeAssociation.confirm")}
          </button>
        </div>
      </div>
    </AppModal>
  );
};
