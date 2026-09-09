import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { 
  createPeakList, 
  updatePeakList, 
  getPeakListDetails,
  deletePeakList,
} from "../../../shared/api/endpoints/peakLists";
import { discoverPeaks } from "../../../shared/api/endpoints/peaks";
import { DesktopPeakFilters } from "../desktop-AddManualPeaks/components/desktop-PeakFilters";
import { DesktopAddManualPeaksList } from "../desktop-AddManualPeaks/components/desktop-AddManualPeaksList";
import { DesktopAddManualPeaksMap } from "../desktop-AddManualPeaks/components/desktop-AddManualPeaksMap";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import {
  toDateTimeLocalValue,
  toIsoFromDateTimeLocal,
  toDurationHoursInputValue,
  toDurationSecondsFromHoursInput,
} from "../../../shared/utils/peakListFormatting";
import {
  getApiErrorMessage,
  validatePeakListForm,
  type PeakListFormErrors,
} from "../../../shared/utils/peakListForm";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  Image as ImageIcon, 
  Save, 
  ArrowLeft,
  X,
  Trash2
} from "lucide-react";
import styles from "./desktop-CreateEditList.module.css";

interface SelectedPeak {
  id: number;
  name: string;
  elevation: number;
  image?: string | null;
}

const DesktopCreateEditList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { t, language } = useI18n();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  
  const isEditing = !!id;
  const initialClubContext = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const rawClubId = searchParams.get("clubId") ?? searchParams.get("club_id");
    const parsedClubId = rawClubId ? Number.parseInt(rawClubId, 10) : Number.NaN;
    return {
      clubId:
        Number.isFinite(parsedClubId) && parsedClubId > 0 ? parsedClubId : null,
      clubName:
        searchParams.get("clubName") ?? searchParams.get("club_name") ?? "",
    };
  }, [location.search]);
  
  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [clubId, setClubId] = useState<number | null>(initialClubContext.clubId);
  const [clubName, setClubName] = useState(initialClubContext.clubName);
  const [primaryImage, setPrimaryImage] = useState<string | File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedPeaks, setSelectedPeaks] = useState<SelectedPeak[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxDurationHours, setMaxDurationHours] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // UI State
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<PeakListFormErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectorError, setSelectorError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectorMode, setSelectorMode] = useState<'list' | 'map'>('list');
  const [searchPeaks, setSearchPeaks] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState({
    query: "",
    admin_osm_ids: [] as number[],
    min_elevation: null as number | null,
    max_elevation: null as number | null,
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const isClubChallenge = clubId !== null;

  const clearFieldError = useCallback((field: keyof PeakListFormErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validateForm = useCallback(() => {
    const nextErrors = validatePeakListForm(
      {
        name,
        description,
        hasPrimaryImage: Boolean(primaryImage || imagePreview),
        selectedPeakCount: selectedPeaks.length,
        startDate,
        endDate,
        maxDurationHours,
      },
      t
    );

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [
    description,
    endDate,
    imagePreview,
    maxDurationHours,
    name,
    primaryImage,
    selectedPeaks.length,
    startDate,
    t,
  ]);

  const handleFilterChange = useCallback((
    key: "query" | "admin_osm_ids" | "min_elevation" | "max_elevation",
    value: string | number | null | string[] | number[]
  ) => {
    if (key === "query") {
      const query = String(value ?? "").trim();
      trackEvent("search_query", `create_list_desktop_selector_${query.length > 0 ? "typed" : "cleared"}_${query.length}`);
    } else if (key === "admin_osm_ids") {
      trackEvent("filter_change", `create_list_desktop_location_${value ? "selected" : "all"}`);
    } else {
      trackEvent("filter_change", "create_list_desktop_elevation_updated");
    }
    setFilters(prev => ({ ...prev, [key]: value }));
  }, [trackEvent]);

  useEffect(() => {
    trackEvent("interaction", `create_list_desktop_page_open_${isEditing ? "edit" : "create"}`);
  }, [isEditing, trackEvent]);

  useEffect(() => {
    if (isEditing) return;
    setClubId(initialClubContext.clubId);
    setClubName(initialClubContext.clubName);
  }, [initialClubContext.clubId, initialClubContext.clubName, isEditing]);

  useEffect(() => {
    if (!isClubChallenge) return;
    if (!isPrivate) return;
    setIsPrivate(false);
  }, [isClubChallenge, isPrivate]);

  const loadList = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setLoadError(null);

    try {
      const details = await getPeakListDetails(Number.parseInt(id, 10));

      const ownerId = details.creator_id ?? details.created_by;
      if (ownerId && user?.internalUserId) {
        if (Number(ownerId) !== Number(user.internalUserId)) {
          console.warn("Unauthorized access attempt to edit list", {
            listOwner: ownerId,
            currentUser: user.internalUserId,
          });
          trackEvent("interaction", "create_list_desktop_edit_unauthorized_redirect");
          navigate("/profile", { replace: true });
          return;
        }
      }

      setName(details.list_name || "");
      setDescription(details.description || "");
      const detailsClubId =
        typeof details.club_id === "number" && Number.isFinite(details.club_id)
          ? details.club_id
          : null;
      setClubId(detailsClubId);
      setClubName(
        details.club?.name || (details as any).club_name || initialClubContext.clubName || ""
      );
      setIsPrivate(detailsClubId !== null ? false : details.is_private || false);
      setStartDate(toDateTimeLocalValue(details.start_date));
      setEndDate(toDateTimeLocalValue(details.end_date));
      setMaxDurationHours(toDurationHoursInputValue(details.max_duration));
      setFieldErrors({});
      setSubmitError(null);
      setDeleteError(null);

      if (details.primary_image) {
        setPrimaryImage(details.primary_image);
        setImagePreview(details.primary_image);
      } else {
        setPrimaryImage(null);
        setImagePreview(null);
      }

      setSelectedPeaks(
        details.peaks.map((p) => ({
          id: p.id,
          name: p.name_en || p.name,
          elevation: p.elevation,
          image: p.image,
        }))
      );
      trackEvent("interaction", `create_list_desktop_edit_loaded_${details.peaks.length}`);
    } catch (error) {
      console.error("Failed to load list details:", error);
      setLoadError(
        getApiErrorMessage(
          error,
          t("peakLists.loadError") || "Failed to load challenge. Please try again."
        )
      );
      trackEvent("interaction", "create_list_desktop_edit_load_failed");
    } finally {
      setLoading(false);
    }
  }, [id, initialClubContext.clubName, navigate, t, trackEvent, user?.internalUserId]);

  useEffect(() => {
    if (isEditing) {
      void loadList();
    }
  }, [isEditing, loadList]);

  // Fetch peaks for selection
  const fetchSearchPeaks = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setSearchLoading(true);
    else setIsLoadingMore(true);
    setSelectorError(null);

    try {
       const resp = await discoverPeaks({
         query: filters.query || undefined,
         admin_osm_ids: filters.admin_osm_ids,
         min_elevation: filters.min_elevation ?? undefined,
         max_elevation: filters.max_elevation ?? undefined,
         limit: 50,
         page: pageNum
       } as any);
       
       const newPeaks = resp.peaks || [];
       if (pageNum === 1) {
         setSearchPeaks(newPeaks);
       } else {
         setSearchPeaks(prev => [...prev, ...newPeaks]);
       }
       
       setHasMore(newPeaks.length === 50);
       trackEvent("interaction", `create_list_desktop_selector_results_${pageNum}_${newPeaks.length}`);
    } catch (error) {
       console.error("Failed to fetch peaks:", error);
       setSelectorError(
         getApiErrorMessage(
           error,
           t("manualPeaks.fetchError") || "Failed to load peaks. Please try again."
         )
       );
       trackEvent("interaction", "create_list_desktop_selector_fetch_failed");
    } finally {
       setSearchLoading(false);
       setIsLoadingMore(false);
    }
  }, [filters, t, trackEvent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      void fetchSearchPeaks(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters, fetchSearchPeaks]);

  const handleLoadMore = () => {
    if (!hasMore || isLoadingMore || searchLoading) return;
    trackEvent("interaction", "create_list_desktop_selector_load_more");
    const nextPage = page + 1;
    setPage(nextPage);
    void fetchSearchPeaks(nextPage);
  };

  const handleTogglePeakSelection = (peak: any) => {
    setSubmitError(null);
    clearFieldError("selectedPeaks");
    setSelectedPeaks(prev => {
      const exists = prev.find(p => p.id === peak.id);
      if (exists) {
        trackEvent("interaction", `create_list_desktop_peak_removed_${peak.id}`);
        return prev.filter(p => p.id !== peak.id);
      } else {
        trackEvent("interaction", `create_list_desktop_peak_added_${peak.id}`);
        return [...prev, {
          id: peak.id,
          name: peak.name_en || peak.name,
          elevation: peak.elevation,
          image: peak.image
        }];
      }
    });
  };

  const handleRemovePeak = (peakId: number) => {
    trackEvent("interaction", `create_list_desktop_peak_removed_${peakId}`);
    setSubmitError(null);
    setSelectedPeaks(prev => prev.filter(p => p.id !== peakId));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setDeleteError(null);
    if (!validateForm()) {
      trackEvent("interaction", `create_list_desktop_validation_failed_${isEditing ? "edit" : "create"}`);
      return;
    }

    setSubmitting(true);
    try {
      trackEvent("interaction", `create_list_desktop_submit_attempt_${isEditing ? "edit" : "create"}_${selectedPeaks.length}`);
      const trimmedName = name.trim();
      const trimmedDescription = description.trim();
      const resolvedPrivacy = isClubChallenge ? false : isPrivate;
      const payload: any = {
        name: trimmedName,
        description: trimmedDescription,
        is_private: resolvedPrivacy,
        peak_ids: selectedPeaks.map(p => p.id)
      };
      if (clubId !== null) payload.club_id = clubId;

      const normalizedStartDate = toIsoFromDateTimeLocal(startDate);
      const normalizedEndDate = toIsoFromDateTimeLocal(endDate);
      const normalizedMaxDuration = toDurationSecondsFromHoursInput(maxDurationHours);

      if (normalizedStartDate) payload.start_date = normalizedStartDate;
      else if (isEditing) payload.start_date = null;

      if (normalizedEndDate) payload.end_date = normalizedEndDate;
      else if (isEditing) payload.end_date = null;

      if (normalizedMaxDuration !== null) payload.max_duration = normalizedMaxDuration;
      else if (isEditing) payload.max_duration = null;

      if (primaryImage instanceof File) {
        payload.image = primaryImage;
      }
      
      if (isEditing) {
        await updatePeakList({
          list_id: Number.parseInt(id!, 10),
          ...payload
        });
      } else {
        await createPeakList({
          ...payload,
          language
        });
      }
      trackEvent("interaction", `create_list_desktop_submit_success_${isEditing ? "edit" : "create"}`);
      navigate(-1);
    } catch (error) {
      console.error("Failed to save list:", error);
      setSubmitError(
        getApiErrorMessage(
          error,
          t("peakLists.saveError") || "Failed to save challenge. Please try again."
        )
      );
      trackEvent("interaction", `create_list_desktop_submit_failed_${isEditing ? "edit" : "create"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleteError(null);
    setSubmitting(true);
    try {
      trackEvent("interaction", "create_list_desktop_delete_confirmed");
      await deletePeakList(Number.parseInt(id, 10));
      trackEvent("interaction", "create_list_desktop_delete_success");
      navigate("/profile", { replace: true });
    } catch (error) {
      console.error("Failed to delete list:", error);
      setDeleteError(
        getApiErrorMessage(
          error,
          t("peakLists.deleteError") || "Failed to delete challenge. Please try again."
        )
      );
      trackEvent("interaction", "create_list_desktop_delete_failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      trackEvent("interaction", "create_list_desktop_cover_image_selected");
      setSubmitError(null);
      clearFieldError("primaryImage");
      setPrimaryImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className={styles["desktop-loading"]}>
        <Loader2 className={styles["spinner"]} size={48} />
      </div>
    );
  }

  const pageTitle =
    isEditing ? t("peakLists.editTitle") || "Edit Peak List" : t("peakLists.createTitle") || "Create Peak List";

  return (
    <div className={styles["desktop-create-edit-list"]}>
      {/* Top Header Barra */}
      <header className={styles["header"]}>
        <div className={styles["header-left"]}>
          <button className={styles["back-btn"]} onClick={() => {
            trackEvent("button_click", "create_list_desktop_back");
            navigate(-1);
          }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="typography-desktop-title-large">
            {pageTitle}
          </h1>
        </div>
        <div className={styles["header-right"]}>
          <button 
            className={`${styles["save-btn"]} typography-desktop-button-small`} 
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? <Loader2 className={styles["spinner"]} size={20} /> : <Save size={20} />}
            <span>{isEditing ? t("common.save") : t("common.create")}</span>
          </button>
        </div>
      </header>

      {loadError ? (
        <div className={styles["page-state"]}>
          <p className={`${styles["page-state__message"]} typography-desktop-body-medium`} role="alert">
            {loadError}
          </p>
          <button
            className={`${styles["secondary-btn"]} typography-desktop-button-small`}
            onClick={() => {
              void loadList();
            }}
          >
            {t("common.retry")}
          </button>
        </div>
      ) : (
      <div className={styles["main-container"]}>
        {/* Left Pane - List Metadata */}
        <aside className={styles["left-pane"]}>
          <div className={styles["card"]}>
            {submitError && (
              <div className={`${styles["error-banner"]} typography-desktop-body-small`} role="alert">
                {submitError}
              </div>
            )}

            {isClubChallenge ? (
              <div className={styles["club-context"]}>
                <p className={`${styles["club-context__title"]} typography-desktop-label-medium`}>
                  {t("peakLists.clubChallengeTitle") || "Club challenge"}
                  {clubName ? (
                    <span className={`${styles["club-context__name"]} typography-desktop-body-small`}>
                      {` : ${clubName}`}
                    </span>
                  ) : null}
                </p>
                <p className={`${styles["club-context__description"]} typography-desktop-body-small`}>
                  {t("peakLists.clubChallengeDescription") ||
                    "This challenge is linked to a club and will be visible only to club members."}
                </p>
              </div>
            ) : null}

            <div className={styles["input-group"]}>
              <label className="typography-desktop-label-medium">{t("peakLists.name") || "List Name"}</label>
              <input 
                type="text" 
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  clearFieldError("name");
                  setSubmitError(null);
                }}
                placeholder={t("peakLists.namePlaceholder") || "Enter a name for your list..."}
                className={`${styles["input"]} typography-body-medium ${fieldErrors.name ? styles["input--error"] : ""}`}
                aria-invalid={Boolean(fieldErrors.name)}
                required
              />
              {fieldErrors.name && (
                <p className={`${styles["field-error"]} typography-desktop-body-small`} role="alert">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div className={styles["input-group"]}>
              <label className="typography-desktop-label-medium">{t("peakLists.description") || "Description"}</label>
              <textarea 
                value={description}
                onChange={e => {
                  setDescription(e.target.value);
                  clearFieldError("description");
                  setSubmitError(null);
                }}
                placeholder={t("peakLists.descriptionPlaceholder") || "What is this list about?"}
                className={`${styles["textarea"]} typography-body-medium ${fieldErrors.description ? styles["input--error"] : ""}`}
                rows={4}
                aria-invalid={Boolean(fieldErrors.description)}
                required
              />
              {fieldErrors.description && (
                <p className={`${styles["field-error"]} typography-desktop-body-small`} role="alert">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className={styles["input-group"]}>
              <label className={`${styles["input-group__label"]} ${styles["input-group__label--checkbox"]} typography-desktop-label-small`}>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={e => {
                    if (isClubChallenge) return;
                    setIsPrivate(e.target.checked);
                  }}
                  className={styles["input-group__checkbox"]}
                  disabled={isClubChallenge}
                />
                {t("peakLists.isPrivate") || "Private List"}
              </label>
              <p className={`${styles["input-group__help-text"]} typography-desktop-body-small`}>
                {isClubChallenge
                  ? t("peakLists.clubPrivateHelp") ||
                    "Club challenges are always public to club members and cannot be private."
                  : t("peakLists.privateHelp") ||
                    "Private lists are only visible to you."}
              </p>
            </div>

            <div className={styles["input-group"]}>
              <label className="typography-desktop-label-medium">
                {t("peakLists.challengeConstraints") || "Challenge Constraints"}
              </label>
              <div className={styles["constraints-grid"]}>
                <div className={styles["constraint-field"]}>
                  <label className="typography-desktop-label-medium">
                    {t("peakLists.startDate") || "Start date"}
                  </label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      clearFieldError("startDate");
                      clearFieldError("endDate");
                      setSubmitError(null);
                    }}
                    className={`${styles["input"]} typography-body-medium ${fieldErrors.startDate ? styles["input--error"] : ""}`}
                    aria-invalid={Boolean(fieldErrors.startDate)}
                  />
                  {fieldErrors.startDate && (
                    <p className={`${styles["field-error"]} typography-desktop-body-small`} role="alert">
                      {fieldErrors.startDate}
                    </p>
                  )}
                </div>
                <div className={styles["constraint-field"]}>
                  <label className="typography-desktop-label-medium">
                    {t("peakLists.endDate") || "End date"}
                  </label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      clearFieldError("endDate");
                      clearFieldError("startDate");
                      setSubmitError(null);
                    }}
                    className={`${styles["input"]} typography-body-medium ${fieldErrors.endDate ? styles["input--error"] : ""}`}
                    aria-invalid={Boolean(fieldErrors.endDate)}
                  />
                  {fieldErrors.endDate && (
                    <p className={`${styles["field-error"]} typography-desktop-body-small`} role="alert">
                      {fieldErrors.endDate}
                    </p>
                  )}
                </div>
              </div>
              <p className={`${styles["input-group__help-text"]} typography-desktop-body-small`}>
                {t("peakLists.dateRangeHelp") || "Leave both dates empty to allow any completion date."}
              </p>
            </div>

            <div className={styles["input-group"]}>
              <label className="typography-desktop-label-medium">
                {t("peakLists.maxDuration") || "Max duration (hours)"}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={maxDurationHours}
                onChange={(e) => {
                  setMaxDurationHours(e.target.value);
                  clearFieldError("maxDurationHours");
                  setSubmitError(null);
                }}
                placeholder={t("peakLists.maxDurationPlaceholder") || "e.g. 24"}
                className={`${styles["input"]} typography-body-medium ${fieldErrors.maxDurationHours ? styles["input--error"] : ""}`}
                aria-invalid={Boolean(fieldErrors.maxDurationHours)}
              />
              {fieldErrors.maxDurationHours && (
                <p className={`${styles["field-error"]} typography-desktop-body-small`} role="alert">
                  {fieldErrors.maxDurationHours}
                </p>
              )}
              <p className={`${styles["input-group__help-text"]} typography-desktop-body-small`}>
                {t("peakLists.maxDurationHelp") || "Leave empty for no time limit between first and last peak."}
              </p>
            </div>

            <div className={styles["input-group"]}>
              <label className="typography-desktop-label-medium">{t("peakLists.primaryImage") || "Cover Image"}</label>
              <div className={styles["image-section"]}>
                {imagePreview ? (
                  <div
                    className={`${styles["image-preview"]} ${
                      fieldErrors.primaryImage ? styles["image-preview--error"] : ""
                    }`}
                    style={{ backgroundImage: `url(${imagePreview})` }}
                  >
                    <button className={styles["remove-image"]} onClick={() => {
                      trackEvent("interaction", "create_list_desktop_cover_image_removed");
                      setPrimaryImage(null);
                      setImagePreview(null);
                      setSubmitError(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}>
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`${styles["image-placeholder"]} ${
                      fieldErrors.primaryImage ? styles["image-placeholder--error"] : ""
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon size={40} />
                    <span className="typography-desktop-body-small">{t("peakLists.noImage") || "Click to add image"}</span>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
              {fieldErrors.primaryImage && (
                <p className={`${styles["field-error"]} typography-desktop-body-small`} role="alert">
                  {fieldErrors.primaryImage}
                </p>
              )}
            </div>

            {isEditing && (
              <div className={styles["danger-zone"]}>
                <button 
                  className={`${styles["delete-btn"]} typography-desktop-body-small`}
                  onClick={() => {
                    trackEvent("interaction", "create_list_desktop_delete_prompt_opened");
                    setDeleteConfirmOpen(true);
                    setDeleteError(null);
                  }}
                  disabled={submitting}
                >
                  <Trash2 size={18} />
                  <span>{t("peakLists.deleteList") || "Delete List"}</span>
                </button>
              </div>
            )}
          </div>

          <div className={styles["selected-peaks-card"]}>
             <h3 className="typography-desktop-title-small">
               {t("peakLists.selectedPeaks") || "Selected Peaks"} ({selectedPeaks.length})
             </h3>
             {fieldErrors.selectedPeaks && (
               <p className={`${styles["field-error"]} typography-desktop-body-small`} role="alert">
                 {fieldErrors.selectedPeaks}
               </p>
             )}
             <div className={styles["selected-peaks-container"]}>
               <AnimatePresence>
                 {selectedPeaks.length > 0 ? (
                   selectedPeaks.map(peak => (
                     <motion.div 
                       key={peak.id}
                       initial={{ opacity: 0, height: 0 }}
                       animate={{ opacity: 1, height: 'auto' }}
                       exit={{ opacity: 0, height: 0 }}
                       className={styles["selected-peak-item"]}
                     >
                       <div className={styles["selected-peak-dot"]} />
                       <span className="typography-desktop-body-small">{peak.name}</span>
                       <button className={styles["mini-remove"]} onClick={() => handleRemovePeak(peak.id)}>
                         <Trash2 size={16} />
                       </button>
                     </motion.div>
                   ))
                 ) : (
                   <p className={`${styles["no-peaks-msg"]} typography-body-small`}>{t("peakLists.noPeaksSelected") || "Search and select peaks on the right."}</p>
                 )}
               </AnimatePresence>
             </div>
          </div>
        </aside>

        {/* Right Pane - Peak Selector */}
        <main className={styles["right-pane"]}>
          <div className={styles["selector-card"]}>
            <div className={styles["selector-header"]}>
              <div className={styles["selector-header-left"]}>
                <DesktopPeakFilters 
                  filters={filters as any}
                  onFilterChange={handleFilterChange}
                  t={t}
                />
              </div>
              <div className={styles["selector-mode-toggle"]}>
                <button 
                  className={`${styles["mode-btn"]} typography-desktop-label-small ${selectorMode === "list" ? styles["mode-btn--active"] : ""}`}
                  onClick={() => {
                    if (selectorMode !== "list") {
                      trackEvent("button_click", "create_list_desktop_selector_view_list");
                    }
                    setSelectorMode("list");
                  }}
                >
                  {t("common.list")}
                </button>
                <button 
                  className={`${styles["mode-btn"]} typography-desktop-label-small ${selectorMode === "map" ? styles["mode-btn--active"] : ""}`}
                  onClick={() => {
                    if (selectorMode !== "map") {
                      trackEvent("button_click", "create_list_desktop_selector_view_map");
                    }
                    setSelectorMode("map");
                  }}
                >
                  {t("common.map")}
                </button>
              </div>
            </div>
            
            <div className={styles["selector-list"]}>
              {selectorError && (
                <div className={styles["selector-feedback"]}>
                  <p className={`${styles["field-error"]} typography-desktop-body-small`} role="alert">
                    {selectorError}
                  </p>
                  <button
                    className={`${styles["secondary-btn"]} typography-desktop-button-small`}
                    onClick={() => {
                      setPage(1);
                      void fetchSearchPeaks(1);
                    }}
                  >
                    {t("common.retry")}
                  </button>
                </div>
              )}
              {selectorMode === "list" ? (
                searchLoading && searchPeaks.length === 0 ? (
                  <div className={styles["centered-loading"]}>
                    <Loader2 className={styles["spinner"]} size={32} />
                  </div>
                ) : searchPeaks.length > 0 || !selectorError ? (
                  <DesktopAddManualPeaksList 
                    peaks={searchPeaks}
                    selectedPeaks={selectedPeaks.map(p => ({ peak_id: p.id, route_id: null }))}
                    onPeakSelect={(id) => {
                      const peak = searchPeaks.find(p => p.id === id);
                      if (peak) handleTogglePeakSelection(peak);
                    }}
                    t={t}
                    hasMore={hasMore}
                    isLoadingMore={isLoadingMore}
                    onLoadMore={handleLoadMore}
                  />
                ) : null
              ) : (
                <div className={styles["selector-map-container"]}>
                  <DesktopAddManualPeaksMap 
                    selectedPeaks={selectedPeaks.map(p => ({ peak_id: p.id, route_id: null }))}
                    onPeakSelect={(id, name) => {
                      // Handled by discovering the peak in the cache or hitting the toggle
                      handleTogglePeakSelection({ id, name, elevation: 0 }); // Same logic as mobile
                    }}
                    loading={searchLoading}
                    t={t}
                  />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
      )}

      {/* Delete Confirmation Popup */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <div className={styles["delete-popup"]}>
            <motion.div 
              className={styles["delete-popup__content"]}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <Trash2 size={64} color="#ef4444" style={{ margin: "0 auto" }} />
              <h2 className={`${styles["delete-popup__title"]} typography-desktop-title-medium`}>
                {t("peakLists.deleteConfirmTitle") || "Delete Challenge?"}
              </h2>
              <p className={`${styles["delete-popup__message"]} typography-desktop-body-medium`}>
                {t("peakLists.deleteConfirmMessage") || "Are you sure you want to delete this challenge? This action cannot be undone."}
              </p>
              {deleteError && (
                <p className={`${styles["field-error"]} typography-desktop-body-small`} role="alert">
                  {deleteError}
                </p>
              )}
              <div className={styles["delete-popup__actions"]}>
                <button 
                  className={`${styles["delete-popup__btn"]} typography-desktop-button-small ${styles["delete-popup__btn--cancel"]}`}
                  onClick={() => {
                    trackEvent("interaction", "create_list_desktop_delete_cancelled");
                    setDeleteConfirmOpen(false);
                    setDeleteError(null);
                  }}
                  disabled={submitting}
                >
                  {t("common.cancel")}
                </button>
                <button 
                  className={`${styles["delete-popup__btn"]} typography-desktop-button-small ${styles["delete-popup__btn--confirm"]}`}
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className={styles["spinner"]} size={20} /> : t("common.delete")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DesktopCreateEditList;
