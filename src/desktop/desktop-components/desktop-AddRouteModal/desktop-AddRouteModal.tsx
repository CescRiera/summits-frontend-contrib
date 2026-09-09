import React, { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { addRoute } from "../../../shared/api/endpoints/routes";
import { X } from "lucide-react";
import AppModal from "../../../shared/components/AppModal";
import styles from "./desktop-AddRouteModal.module.css";

interface DesktopAddRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  analyticsCategory?: string;
  analyticsPrefix?: string;
  idPrefix?: string;
}

const DesktopAddRouteModal: React.FC<DesktopAddRouteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  analyticsCategory = "interaction",
  analyticsPrefix = "add_route",
  idPrefix = "add-route",
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteFile, setNewRouteFile] = useState<File | null>(null);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [addRouteError, setAddRouteError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const resetForm = useCallback(() => {
    setNewRouteName("");
    setNewRouteFile(null);
    setAddRouteError(null);
    setIsAddingRoute(false);
    setFileInputKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const readFileAsText = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => {
        reject(reader.error || new Error("Failed to read file"));
      };
      reader.readAsText(file);
    });
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleAddRouteNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setNewRouteName(event.target.value);
      if (addRouteError) {
        setAddRouteError(null);
      }
    },
    [addRouteError]
  );

  const handleAddRouteFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      setNewRouteFile(file);
      if (addRouteError) {
        setAddRouteError(null);
      }
    },
    [addRouteError]
  );

  const handleAddRouteSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isAddingRoute) {
        return;
      }

      const trimmedName = newRouteName.trim();
      if (!trimmedName) {
        setAddRouteError(t("userRoutes.addRouteErrors.name"));
        return;
      }
      if (!newRouteFile) {
        setAddRouteError(t("userRoutes.addRouteErrors.file"));
        return;
      }

      setIsAddingRoute(true);
      setAddRouteError(null);
      trackEvent(analyticsCategory, `${analyticsPrefix}_submit`);

      try {
        const gpxContent = await readFileAsText(newRouteFile);
        await addRoute({ name: trimmedName, gpx: gpxContent });
        trackEvent(analyticsCategory, `${analyticsPrefix}_success`);
        resetForm();
        onClose();
        if (onSuccess) {
          onSuccess();
        }
      } catch (err) {
        console.error("Failed to add route:", err);
        trackEvent(analyticsCategory, `${analyticsPrefix}_failed`);
        setAddRouteError(t("userRoutes.addRouteErrors.submit"));
      } finally {
        setIsAddingRoute(false);
      }
    },
    [
      analyticsCategory,
      analyticsPrefix,
      isAddingRoute,
      newRouteFile,
      newRouteName,
      onClose,
      onSuccess,
      readFileAsText,
      resetForm,
      t,
      trackEvent,
    ]
  );

  const nameInputId = `desktop-${idPrefix}-add-route-name`;
  const fileInputId = `desktop-${idPrefix}-add-route-file`;

  return (
    <AppModal
      open={isOpen}
      onClose={handleClose}
      variant="dialog"
      contentClassName={styles["add-route__modal"]}
      ariaLabel={t("userRoutes.addRouteTitle")}
    >
      <div>
            <div className={styles["add-route__header"]}>
              <div className={styles["add-route__title-wrap"]}>
                <h3
                  className={`${styles["add-route__title"]} typography-desktop-title-medium`}
                >
                  {t("userRoutes.addRouteTitle")}
                </h3>
                <p
                  className={`${styles["add-route__subtitle"]} typography-desktop-body-small`}
                >
                  {t("userRoutes.addRouteFileLabel")}
                </p>
              </div>
              <button
                type="button"
                className={styles["add-route__close"]}
                onClick={handleClose}
                aria-label={t("common.close")}
              >
                <X size={20} />
              </button>
            </div>
            <form
              className={styles["add-route__form"]}
              onSubmit={handleAddRouteSubmit}
            >
              <div className={styles["add-route__field"]}>
                <label
                  className={`${styles["add-route__label"]} typography-desktop-label-medium`}
                  htmlFor={nameInputId}
                >
                  {t("userRoutes.addRouteNameLabel")}
                </label>
                <input
                  id={nameInputId}
                  type="text"
                  className={`${styles["add-route__input"]} typography-desktop-body-medium`}
                  value={newRouteName}
                  onChange={handleAddRouteNameChange}
                  placeholder={t("userRoutes.addRouteNamePlaceholder")}
                />
              </div>
              <div className={styles["add-route__field"]}>
                <label
                  className={`${styles["add-route__label"]} typography-desktop-label-medium`}
                  htmlFor={fileInputId}
                >
                  {t("userRoutes.addRouteFileLabel")}
                </label>
                <div className={styles["add-route__file-row"]}>
                  <input
                    key={fileInputKey}
                    id={fileInputId}
                    type="file"
                    accept=".gpx,application/gpx+xml"
                    className={styles["add-route__file-input"]}
                    onChange={handleAddRouteFileChange}
                  />
                  <label
                    htmlFor={fileInputId}
                    className={`${styles["add-route__file-button"]} typography-desktop-button-small`}
                  >
                    {t("userRoutes.addRouteFilePlaceholder")}
                  </label>
                  <span
                    className={`${styles["add-route__file-name"]} typography-desktop-body-small`}
                  >
                    {newRouteFile
                      ? newRouteFile.name
                      : t("userRoutes.addRouteFilePlaceholder")}
                  </span>
                </div>
              </div>
              {addRouteError && (
                <p
                  className={`${styles["add-route__error"]} typography-desktop-body-small`}
                >
                  {addRouteError}
                </p>
              )}
              <div className={styles["add-route__actions"]}>
                <button
                  type="button"
                  className={`${styles["add-route__cancel"]} typography-desktop-button-medium`}
                  onClick={handleClose}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  className={`${styles["add-route__submit"]} typography-desktop-button-medium`}
                  disabled={isAddingRoute}
                >
                  {isAddingRoute
                    ? t("userRoutes.addRouteSubmitting")
                    : t("userRoutes.addRouteSubmit")}
                </button>
              </div>
            </form>
      </div>
    </AppModal>
  );
};

export default DesktopAddRouteModal;
