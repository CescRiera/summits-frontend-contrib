import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import OverlayHeader from "../../components/Overlay/OverlayHeader/OverlayHeader";
import { useManualPeakSelection } from "../../../shared/hooks/useManualPeakSelection";
import { discoverPeaks, addManualPeaks } from "../../../shared/api/endpoints";
import { AddManualPeaksList } from "./components/AddManualPeaksList";
import { AddManualPeaksMap } from "./components/AddManualPeaksMap";
import { PeakFilters } from "./components/PeakFilters";
import { SubmitOptionsModal } from "./components/SubmitOptionsModal";
import { RouteSelectionModal } from "./components/RouteSelectionModal";
import { ConfirmationModal } from "./components/ConfirmationModal";
import SingleDatePicker from "../UserPeaks/SingleDatePicker";
import { motion, AnimatePresence } from "framer-motion";
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
import styles from "./AddManualPeaks.module.css";

type ViewMode = "list" | "map";

/**
 * NonPersistentPage for manually adding peaks to user's profile
 * Supports dual view modes: List (with filters) and Map
 * Users can select multiple peaks and associate them with routes
 */
const AddManualPeaks: React.FC = () => {
  const navigate = useNavigate();
  const overlayContext = useOptionalOverlayContext();
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [peaks, setPeaks] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Accumulate peak names from both list and map selections
  const [peakNameMap, setPeakNameMap] = useState<Map<number, string>>(new Map());

  // Route selection modal state
  const [showRouteSelectionModal, setShowRouteSelectionModal] = useState(false);
  const [showAssociationConfirmation, setShowAssociationConfirmation] = useState(false);
  const [pendingRouteId, setPendingRouteId] = useState<number | null>(null);
  const [pendingRouteName, setPendingRouteName] = useState("");
  const [pendingRouteDate, setPendingRouteDate] = useState("");

  // Submit options modal state
  const [showSubmitOptions, setShowSubmitOptions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<{ show: boolean, count: number }>({ show: false, count: 0 });

  // Custom hooks
  const {
    selectedPeaks,
    selectedPeakCount,
    filters,
    togglePeakSelection,
    associateRoute,
    associateDate,
    updateFilter,
    getSubmissionPayload,
    clearSelection,
    isPeakSelected,
  } = useManualPeakSelection();

  const handleFilterChange = useCallback(
    (
      key: "query" | "admin_osm_ids" | "min_elevation" | "max_elevation",
      value: string | number | null | string[] | number[]
    ) => {
      if (key === "query") {
        trackEvent("search_query", "manual_peaks");
      } else if (key === "admin_osm_ids") {
        trackEvent("filter_change", "manual_peaks_location");
      } else if (key === "min_elevation" || key === "max_elevation") {
        trackEvent("filter_change", "manual_peaks_elevation");
      }
      if (key === "query" || key === "admin_osm_ids") {
        setLoading(true);
        setPeaks([]);
      }
      updateFilter(key, value);
    },
    [trackEvent, updateFilter]
  );

  const isFetchingRef = useRef(false);
  const stateRef = useRef({ page, hasMore, isLoadingMore, loading });

  // Fetch peaks from discovery API
  const fetchPeaks = useCallback(
    async (pageNum: number = 1, isLoadMore: boolean = false) => {
      // Prevent concurrent fetches
      if (isLoadMore && isFetchingRef.current) {
        return;
      }

      if (isLoadMore) {
        isFetchingRef.current = true;
      }

      try {
        if (!isLoadMore) {
          setLoading(true);
          setPeaks([]);
          setError(null);
        } else {
          setIsLoadingMore(true);
        }

        const hasActiveFilters = Boolean(
          filters.query || 
          (filters.admin_osm_ids && filters.admin_osm_ids.length > 0) || 
          filters.min_elevation || 
          filters.max_elevation
        );

        const response = await discoverPeaks({
          page: pageNum,
          limit: 30,
          ...(filters.query && { query: filters.query }),
          ...(filters.admin_osm_ids && filters.admin_osm_ids.length > 0 && { admin_osm_ids: filters.admin_osm_ids }),
          ...(filters.min_elevation && {
            min_elevation: filters.min_elevation,
          }),
          ...(filters.max_elevation && {
            max_elevation: filters.max_elevation,
          }),
          ...(hasActiveFilters && {
            order_by: "elevation",
            order_direction: "desc",
          }),
        });

        const newPeaks = response.peaks || [];

        if (isLoadMore) {
          setPeaks((prev) => [...prev, ...newPeaks]);
        } else {
          setPeaks(newPeaks);
          setPage(1);
        }

        setHasMore(newPeaks.length >= 30);
      } catch (err) {
        console.error("Failed to fetch peaks:", err);
        trackEvent("interaction", "manual_peaks_fetch_failed");
        setError(t("addManualPeaks.fetchError"));
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    [filters, t, trackEvent],
  );

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && !loading && !isFetchingRef.current) {
      trackEvent("interaction", "manual_peaks_load_more");
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPeaks(nextPage, true);
    }
  }, [page, hasMore, isLoadingMore, loading, fetchPeaks, trackEvent]);


  // Fetch when filters change (including initial mount)
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchPeaks(1, false);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [
    filters.query,
    filters.admin_osm_ids,
    filters.min_elevation,
    filters.max_elevation,
    fetchPeaks,
  ]);

  // Keep state ref in sync with actual state
  useEffect(() => {
    stateRef.current = { page, hasMore, isLoadingMore, loading };
  }, [page, hasMore, isLoadingMore, loading]);



  // Handle peak selection - just toggle, no modal
  const handlePeakSelect = (peakId: number, peakName: string) => {
    // Store name from either list or map
    setPeakNameMap((prev) => {
      if (prev.has(peakId)) return prev;
      const next = new Map(prev);
      next.set(peakId, peakName);
      return next;
    });
    if (isPeakSelected(peakId)) {
      togglePeakSelection(peakId);
      trackEvent("manual_peak_deselected");
    } else {
      togglePeakSelection(peakId);
      trackEvent("manual_peak_selected");
    }
  };

  // Handle submit button click - show options modal
  const handleSubmit = () => {
    if (selectedPeakCount === 0) {
      setError(t("addManualPeaks.noSelection"));
      return;
    }
    trackEvent("manual_peaks_submit_opened");
    setShowSubmitOptions(true);
  };

  // Submit options handlers
  const [pendingPeakIdForAction, setPendingPeakIdForAction] = useState<number | null>(null);

  const handleSelectRouteForPeak = (peakId: number) => {
    setPendingPeakIdForAction(peakId);
    setShowSubmitOptions(false);
    trackEvent("manual_peak_route_modal_opened");
    setShowRouteSelectionModal(true);
  };

  const handleSelectDateForPeak = (peakId: number) => {
    setPendingPeakIdForAction(peakId);
    setShowSubmitOptions(false);
    trackEvent("manual_peak_date_modal_opened");
    setShowDatePicker(true);
  };

  const handleDateSelected = (date: string | null) => {
    setShowDatePicker(false);
    if (date && pendingPeakIdForAction !== null) {
      associateDate(pendingPeakIdForAction, date);
      trackEvent("manual_peak_date_assigned");
    }
    setPendingPeakIdForAction(null);
    setShowSubmitOptions(true);
  };

  // Handle route selection from modal
  const handleRouteSelection = (
    routeId: number,
    routeName: string,
    routeDate: string,
  ) => {
    setPendingRouteId(routeId);
    setPendingRouteName(routeName);
    setPendingRouteDate(routeDate);
    setShowAssociationConfirmation(true);
  };

  const handleConfirmAssociation = () => {
    if (pendingRouteId !== null && pendingPeakIdForAction !== null) {
      associateRoute(pendingPeakIdForAction, pendingRouteId);
      trackEvent("manual_peak_route_associated");
    }
    setShowAssociationConfirmation(false);
    setShowRouteSelectionModal(false);
    setPendingRouteId(null);
    setPendingRouteName("");
    setPendingRouteDate("");
    setPendingPeakIdForAction(null);
    setShowSubmitOptions(true);
  };

  const handleCancelAssociation = () => {
    trackEvent("interaction", "manual_peak_association_cancelled");
    setShowAssociationConfirmation(false);
  };

  const handleJustAdd = () => {
    setShowSubmitOptions(false);
    executeSubmit();
  };

  // Execute the actual API call
  const executeSubmit = async () => {
    const payload = getSubmissionPayload();
    await executeSubmitWithPayload(payload);
  };

  const executeSubmitWithPayload = async (payload: { peak_id: number; route_id: number | null; date?: string | null }[]) => {
    try {
      setIsSubmitting(true);

      if (payload.length === 0) {
        setError(t("addManualPeaks.noSelection"));
        return;
      }

      await addManualPeaks(payload);

      trackEvent("manual_peaks_added", String(payload.length));

      setSuccessToast({ show: true, count: payload.length });
      clearSelection();
      
      setTimeout(() => {
        setSuccessToast(prev => ({ ...prev, show: false }));
      }, 3000);
    } catch (err) {
      console.error("Failed to add peaks:", err);
      trackEvent("interaction", "manual_peaks_submit_failed");
      setError(t("addManualPeaks.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build display data for the modal - merge list data with accumulated map names
  const peakDisplayData = selectedPeaks.map((sp) => {
    const fromList = peaks
      .filter((p): p is { id: number; name: string; name_en?: string | null } =>
        typeof p === "object" && p !== null && "id" in p && "name" in p
      )
      .find((p) => p.id === sp.peak_id);
    if (fromList) return fromList;
    const name = peakNameMap.get(sp.peak_id);
    return { id: sp.peak_id, name: name || `Peak #${sp.peak_id}`, name_en: null };
  });

  const handleBack = () => {
    trackEvent("button_click", "manual_peaks_back");
    if (overlayContext) {
      overlayContext.handleOverlayBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={styles["add-manual-peaks"]}>
      {/* Header */}
      <OverlayHeader title={t("addManualPeaks.title")} onBack={handleBack} />

      {/* View Mode Toggle */}
      <div className={styles["add-manual-peaks__view-toggle"]}>
        <button
          className={`${styles["add-manual-peaks__view-button"]} typography-label-large ${
            viewMode === "list"
              ? styles["add-manual-peaks__view-button--active"]
              : ""
          }`}
          onClick={() => {
            if (viewMode !== "list") {
              trackEvent("button_click", "manual_peaks_view_list");
            }
            setViewMode("list");
          }}
        >
          {t("addManualPeaks.listView")}
        </button>
        <button
          className={`${styles["add-manual-peaks__view-button"]} typography-label-large ${
            viewMode === "map"
              ? styles["add-manual-peaks__view-button--active"]
              : ""
          }`}
          onClick={() => {
            if (viewMode !== "map") {
              trackEvent("button_click", "manual_peaks_view_map");
            }
            setViewMode("map");
          }}
        >
          {t("addManualPeaks.mapView")}
        </button>
      </div>

      {/* Content Area */}
      <div className={styles["add-manual-peaks__content"]}>
        <AnimatePresence mode="wait">
          {viewMode === "list" ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className={styles["add-manual-peaks__list-container"]}
            >
              {/* Filters */}
              <PeakFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                t={t}
              />

              {/* List */}
              {loading && peaks.length === 0 ? (
                <div className={styles["add-manual-peaks__shimmer"]}>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={styles["add-manual-peaks__shimmer-item"]}>
                      <div className={styles["add-manual-peaks__shimmer-thumb"]} />
                      <div className={styles["add-manual-peaks__shimmer-text"]}>
                        <div className={styles["add-manual-peaks__shimmer-title"]} />
                        <div className={styles["add-manual-peaks__shimmer-subtitle"]} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className={styles["add-manual-peaks__error"]}>
                  <p className="typography-body-small">{error}</p>
                </div>
              ) : peaks.length === 0 ? (
                <div className={styles["add-manual-peaks__empty"]}>
                  <MapPin size={48} />
                  <p className="typography-body-small">
                    {t("addManualPeaks.noPeaks")}
                  </p>
                </div>
              ) : (
                <AddManualPeaksList
                  peaks={peaks}
                  selectedPeaks={selectedPeaks}
                  onPeakSelect={handlePeakSelect}
                  t={t}
                  onLoadMore={handleLoadMore}
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="map"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={styles["add-manual-peaks__map-container"]}
            >
              <AddManualPeaksMap
                selectedPeaks={selectedPeaks}
                onPeakSelect={handlePeakSelect}
                loading={loading}
                t={t}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Footer */}
      <div className={styles["add-manual-peaks__footer"]}>
        <button
          className={`${styles["add-manual-peaks__button"]} typography-label-large ${
            selectedPeakCount === 0
              ? styles["add-manual-peaks__button--disabled"]
              : ""
          }`}
          onClick={handleSubmit}
          disabled={selectedPeakCount === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} />
              {t("addManualPeaks.submitting")}
            </>
          ) : (
            t("addManualPeaks.submit", { count: selectedPeakCount })
          )}
        </button>
      </div>

      {/* Submit Options Modal */}
      <SubmitOptionsModal
        isOpen={showSubmitOptions}
        selectedPeaks={selectedPeaks}
        peakDisplayData={peakDisplayData}
        onSelectRoute={handleSelectRouteForPeak}
        onSelectDate={handleSelectDateForPeak}
        onSubmit={handleJustAdd}
        onClose={() => setShowSubmitOptions(false)}
        isSubmitting={isSubmitting}
        t={t}
      />

      {/* Route Selection Modal */}
      <RouteSelectionModal
        isOpen={showRouteSelectionModal}
        peakName={
          pendingPeakIdForAction
            ? peakDisplayData.find((p) => p.id === pendingPeakIdForAction)?.name || ""
            : ""
        }
        onSelectRoute={handleRouteSelection}
        onClose={() => {
          setShowRouteSelectionModal(false);
          setPendingPeakIdForAction(null);
          setShowSubmitOptions(true);
        }}
      />

      {/* Confirmation Modal for Route Association */}
      <ConfirmationModal
        isOpen={showAssociationConfirmation}
        title={t("addManualPeaks.routeAssociation.title") || "Confirm Association"}
        message={
          <>
            Associate peak with route{" "}
            <b>{pendingRouteName}</b> done on{" "}
            {pendingRouteDate
              ? new Date(pendingRouteDate).toLocaleDateString()
              : ""}
          </>
        }
        confirmLabel={t("addManualPeaks.routeAssociation.confirm") || "Confirm"}
        cancelLabel={t("addManualPeaks.routeAssociation.cancel") || "Cancel"}
        onConfirm={handleConfirmAssociation}
        onCancel={handleCancelAssociation}
      />

      {/* Date Picker (hidden trigger, controlled) */}
      <div style={{ display: "none" }}>
        <SingleDatePicker
          onDateChange={handleDateSelected}
          buttonLabel={t("addManualPeaks.submitOptions.date")}
          controlledOpen={showDatePicker}
          onControlledClose={() => {
            setShowDatePicker(false);
            setPendingPeakIdForAction(null);
            setShowSubmitOptions(true);
          }}
        />
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {successToast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: -20, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className={`${styles["add-manual-peaks__toast"]} typography-body-medium`}
          >
            {t("addManualPeaks.addSuccess", { count: successToast.count })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddManualPeaks;
