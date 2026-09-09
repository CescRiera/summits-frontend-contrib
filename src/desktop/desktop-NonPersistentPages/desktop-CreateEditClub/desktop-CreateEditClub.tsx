import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ImagePlus, Trash2, X, Upload } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import LoadingScreen from "../../desktop-components/desktop-LoadingScreen/desktop-LoadingScreen.tsx";
import { useOptionalOverlayContext } from "../../desktop-components/desktop-Overlay/desktop-OverlayContext.tsx";
import { useClubMutations } from "../../../shared/hooks/clubs/useClubs";
import { getClubDetails } from "../../../shared/api/endpoints/clubs";
import { searchAdmin } from "../../../shared/api/endpoints/user";
import type { AdminSearchResult } from "../../../shared/api/types/peaks";
import {
  getClubApiErrorMessage,
  validateClubForm,
  type ClubFormErrors,
} from "../../../shared/utils/clubForm";
import { fixImageOrientation } from "../../../shared/utils/imageUtils";
import { getLocationFromHierarchy } from "../../../shared/utils/adminHierarchy";
import AppModal from "../../../shared/components/AppModal";
import ClubLogoCropperModal from "../../../shared/components/ClubLogoCropperModal/ClubLogoCropperModal";
import styles from "./desktop-CreateEditClub.module.css";

interface SelectedAdmin {
  osm_id: number;
  admin_level: number;
  name: string;
}

const DesktopCreateEditClub: React.FC = () => {
  const navigate = useNavigate();
  const { 
    updateOverlayNameByBaseKey,
    overlayStack 
  } = useOptionalOverlayContext() || {};
  const { clubId } = useParams<{ clubId: string }>();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const numericClubId = Number(clubId);
  const isEditing = Number.isFinite(numericClubId);
  const mutations = useClubMutations();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | "">(
    "public"
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropSourceName, setCropSourceName] = useState("club-logo");
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ClubFormErrors>({});
  const [loading, setLoading] = useState(Boolean(isEditing));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Admin area search state
  const [selectedAdmin, setSelectedAdmin] = useState<SelectedAdmin | null>(null);
  const [adminQuery, setAdminQuery] = useState("");
  const [adminResults, setAdminResults] = useState<AdminSearchResult[]>([]);
  const [adminSearching, setAdminSearching] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const adminDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const adminFieldRef = useRef<HTMLDivElement>(null);
  const lastOverlayNameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!updateOverlayNameByBaseKey) return;
    
    const baseKey = isEditing ? `club-edit:${numericClubId}` : "club-create:root";
    
    let displayName = isEditing
      ? t("clubs.edit.title") || "Edit club"
      : t("clubs.create.title") || "Create club";

    // If we have a name and we are editing, use the full title with name
    if (isEditing && name) {
      displayName = `${t("clubs.edit.title") || "Edit club"}: ${name}`;
    }

    if (lastOverlayNameRef.current === displayName) return;

    // Only update if the name is different to avoid unnecessary updates/infinite loops
    const matchingOverlay = overlayStack?.find(
      (overlay) => overlay.baseStorageKey === baseKey
    );
    
    if (matchingOverlay && matchingOverlay.name !== displayName) {
      updateOverlayNameByBaseKey(baseKey, displayName);
      lastOverlayNameRef.current = displayName;
    }
  }, [isEditing, numericClubId, name, updateOverlayNameByBaseKey, overlayStack, t]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        adminFieldRef.current &&
        !adminFieldRef.current.contains(event.target as Node)
      ) {
        setAdminDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced admin search
  const handleAdminSearch = useCallback(
    (query: string) => {
      setAdminQuery(query);
      if (adminDebounceRef.current) clearTimeout(adminDebounceRef.current);

      if (query.trim().length < 2) {
        setAdminResults([]);
        setAdminDropdownOpen(false);
        return;
      }

      setAdminSearching(true);
      setAdminDropdownOpen(true);
      adminDebounceRef.current = setTimeout(async () => {
        try {
          const response = await searchAdmin(query.trim(), 8);
          setAdminResults(response.results ?? []);
        } catch {
          setAdminResults([]);
        } finally {
          setAdminSearching(false);
        }
      }, 350);
    },
    []
  );

  const handleSelectAdmin = useCallback((result: AdminSearchResult) => {
    setSelectedAdmin({
      osm_id: result.id,
      admin_level: result.admin_level,
      name: result.name,
    });
    setAdminQuery("");
    setAdminResults([]);
    setAdminDropdownOpen(false);
  }, []);

  const handleClearAdmin = useCallback(() => {
    setSelectedAdmin(null);
    setAdminQuery("");
    setAdminResults([]);
    setAdminDropdownOpen(false);
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    let isMounted = true;

    const loadClub = async () => {
      try {
        setLoading(true);
        const response = await getClubDetails(numericClubId);
        if (!isMounted) return;

        if (!response.club.is_creator) {
          navigate(`/clubs/${numericClubId}`, { replace: true });
          return;
        }

        setName(response.club.name);
        setDescription(response.club.description);
        setVisibility(response.club.visibility);
        setImagePreview(response.club.image || null);

        // Load existing admin hierarchy
        const hierarchy = response.club.admin_hierarchy;
        if (hierarchy && Object.keys(hierarchy).length > 0) {
          const levels = Object.entries(hierarchy).sort(
            ([a], [b]) => Number(b) - Number(a)
          );
          const firstLevel = levels[0];
          if (firstLevel) {
            const [level, entry] = firstLevel;
            setSelectedAdmin({
              osm_id: entry.osm_id ?? 0,
              admin_level: Number(level),
              name: getLocationFromHierarchy(hierarchy) || entry.name,
            });
          }
        }
      } catch (error) {
        if (!isMounted) return;
        setSubmitError(
          getClubApiErrorMessage(
            error,
            t("clubs.messages.loadFailed") || "Could not load this club."
          )
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadClub();

    return () => {
      isMounted = false;
    };
  }, [isEditing, navigate, numericClubId, t]);

  const handleSelectImage = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    try {
      const processedFile = await fixImageOrientation(file);
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.image;
        return next;
      });

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : null;
        if (!result) return;
        setCropSource(result);
        setCropSourceName(processedFile.name || file.name || "club-logo");
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(processedFile);
    } catch (error) {
      setSubmitError(
        getClubApiErrorMessage(
          error,
          t("clubs.messages.imageFailed") || "Could not read that image."
        )
      );
    }
  };

  const handleCropCancel = () => {
    setIsCropModalOpen(false);
    setCropSource(null);
  };

  const handleCropComplete = (croppedFile: File, previewUrl: string) => {
    setImageFile(croppedFile);
    setImagePreview(previewUrl);
    setIsCropModalOpen(false);
    setCropSource(null);
  };

  const validate = () => {
    const errors = validateClubForm(
      {
        name,
        description,
        visibility,
        hasImage: Boolean(imageFile || imagePreview),
        requireImage: !isEditing && !imagePreview,
        hasRegion: Boolean(selectedAdmin),
      },
      t
    );

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    try {
      setSubmitting(true);
      if (isEditing) {
        await mutations.updateClub.mutateAsync({
          club_id: numericClubId,
          name,
          description,
          visibility: visibility as "public" | "private",
          ...(imageFile ? { image: imageFile } : {}),
          ...(selectedAdmin
            ? {
                admin_osm_id: selectedAdmin.osm_id,
                admin_level: selectedAdmin.admin_level,
              }
            : { admin_osm_id: null, admin_level: null }),
        });
        navigate(`/clubs/${numericClubId}`);
        return;
      }

      if (!imageFile) {
        setFieldErrors((prev) => ({
          ...prev,
          image:
            t("clubs.validation.imageRequired") || "A club image is required",
        }));
        return;
      }

      const response = await mutations.createClub.mutateAsync({
        name,
        description,
        visibility: visibility as "public" | "private",
        image: imageFile,
        ...(selectedAdmin
          ? {
              admin_osm_id: selectedAdmin.osm_id,
              admin_level: selectedAdmin.admin_level,
            }
          : {}),
      });
      navigate(`/clubs/${response.club.id}`);
    } catch (error) {
      setSubmitError(
        getClubApiErrorMessage(
          error,
          t("clubs.messages.saveFailed") || "Could not save this club."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!isEditing) return;
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setSubmitting(true);
      await mutations.deleteClub.mutateAsync(numericClubId);
      setIsDeleteModalOpen(false);
      navigate("/clubs");
    } catch (error) {
      setSubmitError(
        getClubApiErrorMessage(
          error,
          t("clubs.messages.deleteFailed") || "Could not delete this club."
        )
      );
      setIsDeleteModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  return (
    <div className={styles["create-edit-club"]}>
      <div className={styles["create-edit-club__container"]}>
        <div className={styles["create-edit-club__header"]}>
          <h1 className={`${styles["create-edit-club__title"]} typography-desktop-display-small`}>
            {isEditing
              ? t("clubs.edit.title") || "Edit club"
              : t("clubs.create.title") || "Create club"}
          </h1>
          <p className={`${styles["create-edit-club__subtitle"]} typography-desktop-body-medium`}>
            {t("clubs.create.subtitle") ||
              "Set the club identity, visibility, and cover image your members will see first."}
          </p>
        </div>

        {submitError ? (
          <div className={`${styles["create-edit-club__error-box"]} typography-desktop-body-small`}>
            {submitError}
          </div>
        ) : null}

        <form className={styles["create-edit-club__form"]} onSubmit={handleSubmit}>
          {/* Left Column: Identity & Media */}
          <div className={styles["create-edit-club__card"]}>
            <div className={styles["create-edit-club__image-section"]}>
              <label className={`${styles["create-edit-club__label"]} typography-desktop-label-medium`}>
                {t("clubs.form.image") || "Club logo"}
              </label>
              <div className={styles["create-edit-club__image-preview-container"]}>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={name || t("clubs.form.image") || "Club image"}
                    className={styles["create-edit-club__image-preview"]}
                  />
                ) : (
                  <div 
                    className={styles["create-edit-club__image-placeholder"]}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={32} />
                    <span className="typography-desktop-body-small">
                      {t("clubs.form.uploadImage") || "Upload image"}
                    </span>
                  </div>
                )}
              </div>
              
              <div className={styles["create-edit-club__image-actions"]}>
                <button
                  type="button"
                  className={`${styles["create-edit-club__button"]} ${styles["create-edit-club__button--ghost"]} typography-desktop-button-small`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={18} />
                  {imagePreview ? t("clubs.form.changeImage") || "Change image" : t("clubs.form.uploadImage") || "Upload image"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleSelectImage}
                />
              </div>
              {fieldErrors.image ? (
                <span className={`${styles["create-edit-club__error-text"]} typography-desktop-body-small`}>
                  {fieldErrors.image}
                </span>
              ) : null}
            </div>

            <div className={styles["create-edit-club__field"]}>
              <label className={`${styles["create-edit-club__label"]} typography-desktop-label-medium`}>
                {t("clubs.form.name") || "Club name"}
              </label>
              <input
                type="text"
                className={`${styles["create-edit-club__input"]} typography-desktop-body-medium`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("clubs.form.namePlaceholder") || "Pyrenees Finishers"}
              />
              {fieldErrors.name ? (
                <span className={`${styles["create-edit-club__error-text"]} typography-desktop-body-small`}>
                  {fieldErrors.name}
                </span>
              ) : null}
            </div>
          </div>

          {/* Right Column: Settings & Details */}
          <div className={styles["create-edit-club__card"]}>
            <div className={styles["create-edit-club__field"]}>
              <label className={`${styles["create-edit-club__label"]} typography-desktop-label-medium`}>
                {t("clubs.form.description") || "Description"}
              </label>
              <textarea
                className={`${styles["create-edit-club__textarea"]} typography-desktop-body-medium`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={
                  t("clubs.form.descriptionPlaceholder") ||
                  "What kind of climbers should join this club?"
                }
              />
              {fieldErrors.description ? (
                <span className={`${styles["create-edit-club__error-text"]} typography-desktop-body-small`}>
                  {fieldErrors.description}
                </span>
              ) : null}
            </div>

            <div className={styles["create-edit-club__field"]} ref={adminFieldRef}>
              <label className={`${styles["create-edit-club__label"]} typography-desktop-label-medium`}>
                {t("clubs.form.region") || "Region"}
              </label>

              {selectedAdmin ? (
                <div className={styles["create-edit-club__admin-chip"]}>
                  <span className="typography-desktop-body-medium">
                    {selectedAdmin.name}
                  </span>
                  <button
                    type="button"
                    className={styles["create-edit-club__admin-chip-remove"]}
                    onClick={handleClearAdmin}
                    aria-label={t("clubs.form.regionClear") || "Remove region"}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className={styles["create-edit-club__admin-search-container"]}>
                  <input
                    type="text"
                    className={`${styles["create-edit-club__input"]} typography-desktop-body-medium`}
                    value={adminQuery}
                    onChange={(event) => handleAdminSearch(event.target.value)}
                    placeholder={
                      t("clubs.form.regionPlaceholder") ||
                      "Search for a country or region..."
                    }
                  />
                  {adminDropdownOpen && (
                    <div className={styles["create-edit-club__admin-dropdown"]}>
                      {adminSearching ? (
                        <div className={`${styles["create-edit-club__admin-dropdown-item"]} ${styles["create-edit-club__admin-dropdown-item--muted"]} typography-desktop-body-small`}>
                          {t("clubs.form.regionSearching") || "Searching..."}
                        </div>
                      ) : adminResults.length === 0 ? (
                        <div className={`${styles["create-edit-club__admin-dropdown-item"]} ${styles["create-edit-club__admin-dropdown-item--muted"]} typography-desktop-body-small`}>
                          {t("clubs.form.regionNoResults") || "No regions found"}
                        </div>
                      ) : (
                        adminResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            className={`${styles["create-edit-club__admin-dropdown-item"]} typography-desktop-body-small`}
                            onClick={() => handleSelectAdmin(result)}
                          >
                            <span>{result.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              {fieldErrors.region ? (
                <span className={`${styles["create-edit-club__error-text"]} typography-desktop-body-small`}>
                  {fieldErrors.region}
                </span>
              ) : null}
            </div>

            <div className={styles["create-edit-club__field"]}>
              <label className={`${styles["create-edit-club__label"]} typography-desktop-label-medium`}>
                {t("clubs.form.visibility") || "Visibility"}
              </label>
              <select
                className={`${styles["create-edit-club__select"]} typography-desktop-body-medium`}
                value={visibility}
                onChange={(event) =>
                  setVisibility(event.target.value as "public" | "private")
                }
              >
                <option value="public">{t("clubs.visibility.public") || "Public"}</option>
                <option value="private">{t("clubs.visibility.private") || "Private"}</option>
              </select>
              {fieldErrors.visibility ? (
                <span className={`${styles["create-edit-club__error-text"]} typography-desktop-body-small`}>
                  {fieldErrors.visibility}
                </span>
              ) : null}
            </div>

            <div className={styles["create-edit-club__actions"]}>
              <button
                type="submit"
                className={`${styles["create-edit-club__button"]} ${styles["create-edit-club__button--primary"]} typography-desktop-button-medium`}
                disabled={submitting}
              >
                {submitting
                  ? t("common.loading")
                  : isEditing
                  ? t("common.save")
                  : t("clubs.create.submit") || "Create club"}
              </button>
              {isEditing ? (
                <button
                  type="button"
                  className={`${styles["create-edit-club__button"]} ${styles["create-edit-club__button--danger"]} typography-desktop-button-medium`}
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  <Trash2 size={18} />
                  {t("common.delete")}
                </button>
              ) : null}
            </div>
          </div>
        </form>
      </div>

      <AppModal
        open={isDeleteModalOpen}
        onClose={() => !submitting && setIsDeleteModalOpen(false)}
        variant="dialog"
      >
        <div className={styles["create-edit-club__delete-modal"]}>
          <h3 className={`${styles["create-edit-club__delete-modal-title"]} typography-desktop-title-medium`}>
            {t("clubs.actions.deleteConfirmTitle")}
          </h3>
          <p className={`${styles["create-edit-club__delete-modal-message"]} typography-desktop-body-small`}>
            {t("clubs.actions.deleteConfirmMessage")}
          </p>
          <div className={styles["create-edit-club__delete-modal-actions"]}>
            <button
              type="button"
              className={`${styles["create-edit-club__button"]} ${styles["create-edit-club__button--ghost"]} typography-desktop-button-medium`}
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              className={`${styles["create-edit-club__button"]} ${styles["create-edit-club__button--danger"]} typography-desktop-button-medium`}
              onClick={handleConfirmDelete}
              disabled={submitting}
              style={{ background: "#ef4444", color: "#fff" }}
            >
              {submitting ? t("common.loading") : t("common.delete")}
            </button>
          </div>
        </div>
      </AppModal>

      <ClubLogoCropperModal
        open={isCropModalOpen}
        imageSrc={cropSource}
        imageName={cropSourceName}
        title={t("clubs.form.cropTitle") || "Adjust club logo"}
        description={
          t("clubs.form.cropDescription") ||
          "Position and zoom your logo to preview the circular avatar."
        }
        zoomLabel={t("clubs.form.cropZoom") || "Zoom"}
        cancelLabel={t("common.cancel") || "Cancel"}
        confirmLabel={t("common.save") || "Save"}
        onCancel={handleCropCancel}
        onComplete={handleCropComplete}
      />
    </div>
  );
};

export default DesktopCreateEditClub;
