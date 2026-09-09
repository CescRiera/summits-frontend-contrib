import React, { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useManualPeakSelection } from "../../../shared/hooks/useManualPeakSelection";
import { discoverPeaks, addManualPeaks } from "../../../shared/api/endpoints";
import { DesktopAddManualPeaksList } from "./components/desktop-AddManualPeaksList";
import { DesktopAddManualPeaksMap } from "./components/desktop-AddManualPeaksMap";
import { DesktopPeakFilters } from "./components/desktop-PeakFilters";
import { DesktopSubmitOptionsModal } from "./components/desktop-SubmitOptionsModal";
import { DesktopRouteSelectionModal } from "./components/desktop-RouteSelectionModal";
import { DesktopConfirmationModal } from "../../desktop-components/desktop-ConfirmationModal/desktop-ConfirmationModal";
import SingleDatePicker from "../desktop-UserPeaks/desktop-SingleDatePicker";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./desktop-AddManualPeaks.module.css";

/**
 * Desktop NonPersistentPage for manually adding peaks
 * Two-column layout: Filters + List (left), Map (right)
 * Synchronized selection state across views
 */
const DesktopAddManualPeaks: React.FC = () => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();

  // State management
  const [peaks, setPeaks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Accumulate peak names from both list and map selections
  const [peakNameMap, setPeakNameMap] = useState<Map<number, string>>(new Map());

  // Route selection modal state
  const [showRouteSelectionModal, setShowRouteSelectionModal] = useState(false);
  
  // Route association confirmation
  const [showAssociationConfirmation, setShowAssociationConfirmation] = useState(false);
  const [pendingRouteId, setPendingRouteId] = useState<number | null>(null);
  const [pendingRouteName, setPendingRouteName] = useState("");

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

        const response = await discoverPeaks({
          page: pageNum,
          limit: 50,
          ...(filters.query && { query: filters.query }),
          ...(filters.admin_osm_ids && filters.admin_osm_ids.length > 0 && {
            admin_osm_ids: filters.admin_osm_ids,
          }),
          ...(filters.min_elevation && {
            min_elevation: filters.min_elevation,
          }),
          ...(filters.max_elevation && {
            max_elevation: filters.max_elevation,
          }),
        });

        const newPeaks = response.peaks || [];

        if (isLoadMore) {
          setPeaks((prev) => [...prev, ...newPeaks]);
        } else {
          setPeaks(newPeaks);
          setPage(1);
        }

        setHasMore(newPeaks.length >= 50);
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

  // Initial fetch on mount
  useEffect(() => {
    fetchPeaks(1, false);
  }, []);

  // Fetch when filters change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchPeaks(1, false);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [filters, fetchPeaks]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && !loading && !isFetchingRef.current) {
      trackEvent("interaction", "manual_peaks_load_more");
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPeaks(nextPage, true);
    }
  }, [page, hasMore, isLoadingMore, loading, fetchPeaks, trackEvent]);

  // Handle peak selection - just toggle, no modal
  const handlePeakSelect = useCallback((peakId: number, peakName: string) => {
    // Store name from either list or map
    setPeakNameMap((prev) => {
      if (prev.has(peakId)) return prev;
      const next = new Map(prev);
      next.set(peakId, peakName);
      return next;
    });
    const isSelected = selectedPeaks.some(p => p.peak_id === peakId);
    
    if (isSelected) {
      togglePeakSelection(peakId);
      trackEvent("manual_peak_deselected");
    } else {
      togglePeakSelection(peakId);
      trackEvent("manual_peak_selected");
    }
  }, [selectedPeaks, togglePeakSelection, trackEvent]);

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
  const handleRouteSelection = (routeId: number, routeName: string) => {
    setPendingRouteId(routeId);
    setPendingRouteName(routeName);
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



  return (
    <div className={styles["desktop-add-manual-peaks"]}>


      {/* Main Content - Two Column */}
      <div className={styles["desktop-add-manual-peaks__container"]}>
        {/* Left Column - Filters + List */}
        <div className={styles["desktop-add-manual-peaks__left"]}>
          {/* Filters */}
          <DesktopPeakFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            t={t}
          />

          {/* List */}
          {loading && peaks.length === 0 ? (
            <div className={styles["desktop-add-manual-peaks__shimmer"]}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={styles["desktop-add-manual-peaks__shimmer-item"]}>
                  <div className={styles["desktop-add-manual-peaks__shimmer-thumb"]} />
                  <div className={styles["desktop-add-manual-peaks__shimmer-text"]}>
                    <div className={styles["desktop-add-manual-peaks__shimmer-title"]} />
                    <div className={styles["desktop-add-manual-peaks__shimmer-subtitle"]} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className={styles["desktop-add-manual-peaks__error"]}>
              <p className="typography-desktop-body-medium">{error}</p>
            </div>
          ) : peaks.length === 0 ? (
            <div className={styles["desktop-add-manual-peaks__empty"]}>
              <p className="typography-desktop-body-medium">
                {t("addManualPeaks.noPeaks")}
              </p>
            </div>
          ) : (
            <DesktopAddManualPeaksList
              peaks={peaks}
              selectedPeaks={selectedPeaks}
              onPeakSelect={handlePeakSelect}
              t={t}
              onLoadMore={handleLoadMore}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
            />
          )}
        </div>

        {/* Right Column - Map */}
        <div className={styles["desktop-add-manual-peaks__right"]}>
          <DesktopAddManualPeaksMap
            selectedPeaks={selectedPeaks}
            onPeakSelect={handlePeakSelect}
            loading={loading}
            t={t}
          />
        </div>
      </div>

      {/* Sticky Footer */}
      <div className={styles["desktop-add-manual-peaks__footer"]}>
        <div className={styles["desktop-add-manual-peaks__footer-info"]}>
          {selectedPeakCount > 0 && (
            <span className="typography-desktop-body-medium">
              {t("addManualPeaks.selectedCount", { count: selectedPeakCount })}
            </span>
          )}
        </div>
        <button
          className={`${styles["desktop-add-manual-peaks__submit"]} typography-desktop-body-medium ${
            selectedPeakCount === 0
              ? styles["desktop-add-manual-peaks__submit--disabled"]
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
      <DesktopSubmitOptionsModal
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
      <AnimatePresence>
        {showRouteSelectionModal && (
          <DesktopRouteSelectionModal
            peakId={pendingPeakIdForAction || 0}
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
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Route Association */}
      <DesktopConfirmationModal
        isOpen={showAssociationConfirmation}
        title={t("addManualPeaks.routeAssociation.title")}
        message={t("addManualPeaks.routeAssociation.message", {
          peakName: pendingPeakIdForAction
            ? peakDisplayData.find((p) => p.id === pendingPeakIdForAction)?.name || ""
            : "",
          routeName: pendingRouteName,
        })}
        confirmLabel={t("addManualPeaks.routeAssociation.confirm")}
        cancelLabel={t("addManualPeaks.routeAssociation.cancel")}
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
            animate={{ opacity: 1, y: -40, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className={styles["desktop-add-manual-peaks__toast"]}
          >
             <div className={styles["desktop-add-manual-peaks__toast-content"]}>
              <span className="typography-desktop-body-medium" style={{ color: 'white' }}>
                {t("addManualPeaks.addSuccess", { count: successToast.count })}
              </span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DesktopAddManualPeaks;
