import React, { useState, useCallback, useRef, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { addRoute } from "../../../shared/api/endpoints/routes";
import AppModal from "../../../shared/components/AppModal";
import styles from "./AddRouteModal.module.css";

interface AddRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  idPrefix?: string;
}

/**
 * Mobile version of the Add Route modal using AppModal
 */
const AddRouteModal: React.FC<AddRouteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  idPrefix = "mobile-add-route",
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAddRouteSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isAddingRoute) return;

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
    trackEvent("interaction", "userRoutes_add_route_submit");

    try {
      const gpxContent = await readFileAsText(newRouteFile);
      await addRoute({ name: trimmedName, gpx: gpxContent });
      trackEvent("interaction", "userRoutes_add_route_success");
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to add route:", err);
      trackEvent("interaction", "userRoutes_add_route_failed");
      setAddRouteError(t("userRoutes.addRouteErrors.submit"));
    } finally {
      setIsAddingRoute(false);
    }
  };

  const nameInputId = `${idPrefix}-name`;
  const fileInputId = `${idPrefix}-file`;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["add-route-modal"]}
      ariaLabel={t("userRoutes.addRouteTitle")}
    >
      <div className={styles["add-route-modal__header"]}>
        <h3 className={`${styles["add-route-modal__title"]} typography-title-medium`}>
          {t("userRoutes.addRouteTitle")}
        </h3>
        <button
          type="button"
          className={styles["add-route-modal__close"]}
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <X size={20} />
        </button>
      </div>

      <form className={styles["add-route-modal__form"]} onSubmit={handleAddRouteSubmit}>
        <div className={styles["add-route-modal__field"]}>
          <label
            className={`${styles["add-route-modal__label"]} typography-body-small`}
            htmlFor={nameInputId}
          >
            {t("userRoutes.addRouteNameLabel")}
          </label>
          <input
            id={nameInputId}
            type="text"
            className={`${styles["add-route-modal__input"]} typography-body-medium`}
            value={newRouteName}
            onChange={(e) => {
              setNewRouteName(e.target.value);
              if (addRouteError) setAddRouteError(null);
            }}
            placeholder={t("userRoutes.addRouteNamePlaceholder")}
          />
        </div>

        <div className={styles["add-route-modal__field"]}>
          <label
            className={`${styles["add-route-modal__label"]} typography-body-small`}
            htmlFor={fileInputId}
          >
            {t("userRoutes.addRouteFileLabel")}
          </label>
          <input
            ref={fileInputRef}
            key={fileInputKey}
            id={fileInputId}
            type="file"
            accept=".gpx,application/gpx+xml"
            className={styles["add-route-modal__file-input"]}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setNewRouteFile(file);
              if (addRouteError) setAddRouteError(null);
            }}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className={styles["add-route-modal__file-button"]}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={18} />
            <span className="typography-body-small">
              {newRouteFile ? newRouteFile.name : t("userRoutes.addRouteFilePlaceholder")}
            </span>
          </button>
        </div>

        {addRouteError && (
          <p className={`${styles["add-route-modal__error"]} typography-body-small`}>
            {addRouteError}
          </p>
        )}

        <div className={styles["add-route-modal__actions"]}>
          <button
            type="button"
            className={`${styles["add-route-modal__cancel"]} typography-label-medium`}
            onClick={onClose}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className={`${styles["add-route-modal__submit"]} typography-label-medium`}
            disabled={isAddingRoute}
          >
            {isAddingRoute ? t("userRoutes.addRouteSubmitting") : t("userRoutes.addRouteSubmit")}
          </button>
        </div>
      </form>
    </AppModal>
  );
};

export default AddRouteModal;
