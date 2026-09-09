import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Route, Calendar, X } from "lucide-react";
import AppModal from "../../../shared/components/AppModal";
import { getUserPeakInfo } from "../../../shared/api/endpoints/peaks";
import {
  linkPeakAscension,
  deletePeakAscension,
} from "../../../shared/api/endpoints/user";
import type {
  UserPeakInfoResponse,
  PeakAscension,
} from "../../../shared/api/types";
import { DesktopRouteSelectionModal } from "../desktop-AddManualPeaks/components/desktop-RouteSelectionModal";
import { DesktopConfirmationModal } from "../../desktop-components/desktop-ConfirmationModal/desktop-ConfirmationModal";
import SingleDatePicker from "./desktop-SingleDatePicker";
import { useI18n } from "../../../shared/context/I18nContext";
import { useUnitFormat } from "../../../shared/hooks/useUnitFormat";
import styles from "./desktop-PeakInfoModal.module.css";

interface DesktopPeakInfoModalProps {
  isOpen: boolean;
  peakId: number | null;
  onClose: () => void;
  onPeakDeleted: () => void;
}

const getElevationIcon = (elevation: number) => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

const formatAscensionDate = (date: string | null) => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
};

const DesktopPeakInfoModal: React.FC<DesktopPeakInfoModalProps> = ({
  isOpen,
  peakId,
  onClose,
  onPeakDeleted,
}) => {
  const { t } = useI18n();
  const { formatMeters } = useUnitFormat();

  const [data, setData] = useState<UserPeakInfoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [linking, setLinking] = useState(false);

  // Route selection modal state
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [pendingAscIdx, setPendingAscIdx] = useState<number | null>(null);
  const [pendingOldRouteId, setPendingOldRouteId] = useState<number | null>(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Delete ascension confirmation
  const [pendingDeleteAsc, setPendingDeleteAsc] = useState<{ routeId: number | null; idx: number } | null>(null);
  const [deletingAsc, setDeletingAsc] = useState(false);

  // Delete peak confirmation
  const [showDeletePeakConfirm, setShowDeletePeakConfirm] = useState(false);
  const [deletingPeak, setDeletingPeak] = useState(false);

  const fetchData = useCallback(async () => {
    if (!peakId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getUserPeakInfo(peakId);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch peak info:", err);
      setError("Failed to load peak info");
    } finally {
      setLoading(false);
    }
  }, [peakId]);

  useEffect(() => {
    if (isOpen && peakId) {
      fetchData();
      setPendingAscIdx(null);
      setPendingOldRouteId(null);
      setShowRouteModal(false);
      setShowDatePicker(false);
      setShowDeletePeakConfirm(false);
      setPendingDeleteAsc(null);
    }
  }, [isOpen, peakId, fetchData]);

  // Route selection handlers
  const openRouteModal = (idx: number, oldRouteId: number | null) => {
    setPendingAscIdx(idx);
    setPendingOldRouteId(oldRouteId);
    setShowRouteModal(true);
  };

  const handleRouteSelected = async (routeId: number, _routeName: string, _routeDate: string) => {
    if (!peakId) return;
    setLinking(true);
    try {
      await linkPeakAscension(peakId, {
        routeId,
        ...(pendingOldRouteId != null ? { oldRouteId: pendingOldRouteId } : {}),
      });
      setShowRouteModal(false);
      setPendingAscIdx(null);
      setPendingOldRouteId(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to link ascension:", err);
    } finally {
      setLinking(false);
    }
  };

  const handleRouteModalClose = () => {
    setShowRouteModal(false);
    setPendingAscIdx(null);
    setPendingOldRouteId(null);
  };

  // Date selection handlers
  const openDatePicker = (idx: number, oldRouteId: number | null) => {
    setPendingAscIdx(idx);
    setPendingOldRouteId(oldRouteId);
    setShowDatePicker(true);
  };

  const handleDateSelected = async (date: string | null) => {
    setShowDatePicker(false);
    if (!peakId || !date) {
      setPendingAscIdx(null);
      setPendingOldRouteId(null);
      return;
    }
    setLinking(true);
    try {
      await linkPeakAscension(peakId, {
        date,
        ...(pendingOldRouteId != null ? { oldRouteId: pendingOldRouteId } : {}),
      });
      setPendingAscIdx(null);
      setPendingOldRouteId(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to link ascension:", err);
    } finally {
      setLinking(false);
    }
  };

  const handleDatePickerClose = () => {
    setShowDatePicker(false);
    setPendingAscIdx(null);
    setPendingOldRouteId(null);
  };

  // Delete ascension handlers
  const confirmDeleteAscension = (routeId: number | null, idx: number) => {
    setPendingDeleteAsc({ routeId, idx });
  };

  const handleConfirmDeleteAscension = async () => {
    if (!peakId || !pendingDeleteAsc) return;
    setDeletingAsc(true);
    try {
      const result = await deletePeakAscension(
        peakId,
        pendingDeleteAsc.routeId != null ? pendingDeleteAsc.routeId : undefined,
      );
      setPendingDeleteAsc(null);
      if (result.peak_removed) {
        onPeakDeleted();
        onClose();
        return;
      }
      await fetchData();
    } catch (err) {
      console.error("Failed to delete ascension:", err);
    } finally {
      setDeletingAsc(false);
    }
  };

  // Delete peak handlers
  const handleDeletePeak = async () => {
    if (!peakId) return;
    setDeletingPeak(true);
    try {
      let keepGoing = true;
      while (keepGoing) {
        const result = await deletePeakAscension(peakId);
        if (result.peak_removed) {
          keepGoing = false;
        } else if (result.remaining_ascensions <= 0) {
          keepGoing = false;
        }
      }
      onPeakDeleted();
      onClose();
    } catch (err) {
      console.error("Failed to delete peak:", err);
    } finally {
      setDeletingPeak(false);
      setShowDeletePeakConfirm(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles["peak-info-modal__loading"]}>
          <Loader2 size={24} />
          <span className="typography-desktop-body-small">
            {t("userPeaks.peakInfo.loading")}
          </span>
        </div>
      );
    }

    if (error || !data) {
      return (
        <div className={styles["peak-info-modal__error"]}>
          <span className="typography-desktop-body-small">
            {error || t("userPeaks.peakInfo.error")}
          </span>
        </div>
      );
    }

    const { peak, total_ascensions, ascensions } = data;

    return (
      <>
        {/* Header */}
        <div className={styles["peak-info-modal__header"]}>
          <img
            src={getElevationIcon(peak.elevation)}
            alt=""
            className={styles["peak-info-modal__elevation-icon"]}
          />
          <div className={styles["peak-info-modal__header-text"]}>
            <h2 className={`${styles["peak-info-modal__peak-name"]} typography-desktop-title-large`}>
              {peak.name}
            </h2>
            <div className={styles["peak-info-modal__peak-meta"]}>
              <span className={`${styles["peak-info-modal__elevation-badge"]} typography-desktop-label-small`}>
                {formatMeters(peak.elevation)}
              </span>
              <span className={`${styles["peak-info-modal__ascension-badge"]} typography-desktop-label-small`}>
                {total_ascensions} {total_ascensions === 1 ? "ascension" : "ascensions"}
              </span>
            </div>
          </div>
          <button
            className={styles["peak-info-modal__icon-btn"]}
            onClick={onClose}
            style={{ flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className={styles["peak-info-modal__body"]}>
          {ascensions.length > 0 && (
            <div className={styles["peak-info-modal__section"]}>
              <h3 className={`${styles["peak-info-modal__section-title"]} typography-desktop-label-small`}>
                {t("userPeaks.peakInfo.ascensions")}
              </h3>
              <div className={styles["peak-info-modal__section-hint"]}>
                <Route size={20} />
                <span className="typography-desktop-label-small">{t("addManualPeaks.submitOptions.routeHint")}</span>
                <Calendar size={20} style={{ marginLeft: 6 }} />
                <span className="typography-desktop-label-small">{t("addManualPeaks.submitOptions.dateHint")}</span>
              </div>
              {ascensions.map((asc: PeakAscension, idx: number) => {
                const ascDate = formatAscensionDate(asc.route_date);
                const isDeleting = deletingAsc && pendingDeleteAsc?.idx === idx;

                return (
                  <div key={`${asc.route_id ?? "unlinked"}-${idx}`}>
                    <div className={styles["peak-info-modal__ascension"]}>
                      <span className={`${styles["peak-info-modal__ascension-num"]} typography-desktop-title-large`}>
                        {idx + 1}.
                      </span>
                      <div className={styles["peak-info-modal__ascension-details"]}>
                        {asc.route_name ? (
                          asc.route_url ? (
                            <a
                              href={asc.route_url}
                              className={styles["peak-info-modal__route-link"]}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <p className={`${styles["peak-info-modal__ascension-name"]} typography-desktop-body-medium`}>
                                {asc.route_name}
                              </p>
                            </a>
                          ) : (
                            <p className={`${styles["peak-info-modal__ascension-name"]} typography-desktop-body-medium`}>
                              {asc.route_name}
                            </p>
                          )
                        ) : (
                          <p className={`${styles["peak-info-modal__ascension-name"]} typography-desktop-body-medium`}>
                            {t("userPeaks.peakInfo.youAscended")}
                          </p>
                        )}

                        {ascDate && (
                          <p className={`${styles["peak-info-modal__ascension-date"]} typography-desktop-body-small`}>{ascDate}</p>
                        )}
                      </div>

                      <div className={styles["peak-info-modal__ascension-actions"]}>
                        {linking && pendingAscIdx === idx ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <button
                              className={`${styles["peak-info-modal__icon-btn"]} ${
                                asc.route_id != null && !asc.is_manual
                                  ? styles["peak-info-modal__icon-btn--active-route"]
                                  : ""
                              }`}
                              onClick={() => openRouteModal(idx, asc.route_id)}
                              title={t("userPeaks.peakInfo.linkToRoute")}
                            >
                              <Route size={16} />
                            </button>
                            <button
                              className={`${styles["peak-info-modal__icon-btn"]} ${
                                asc.is_manual
                                  ? styles["peak-info-modal__icon-btn--active-date"]
                                  : ""
                              }`}
                              onClick={() => openDatePicker(idx, asc.route_id)}
                              title={t("userPeaks.peakInfo.linkToDate")}
                            >
                              <Calendar size={16} />
                            </button>
                            <button
                              className={`${styles["peak-info-modal__icon-btn"]} ${styles["peak-info-modal__icon-btn--danger"]}`}
                              onClick={() => confirmDeleteAscension(asc.route_id, idx)}
                              disabled={isDeleting}
                              title={t("userPeaks.peakInfo.deleteAscension")}
                            >
                              {isDeleting ? <Loader2 size={14} /> : <Trash2 size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {ascensions.length === 0 && !loading && (
            <div className={`${styles["peak-info-modal__empty"]} typography-desktop-body-small`}>
              {t("userPeaks.peakInfo.noAscensions")}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles["peak-info-modal__footer"]}>
          <button className={`${styles["peak-info-modal__close-btn"]} typography-desktop-label-medium`} onClick={onClose}>
            {t("userPeaks.peakInfo.close")}
          </button>
          <button
            className={`${styles["peak-info-modal__delete-peak-btn"]} typography-desktop-label-medium`}
            onClick={() => setShowDeletePeakConfirm(true)}
          >
            {t("userPeaks.peakInfo.deletePeak")}
          </button>
        </div>
      </>
    );
  };

  const pendingPeakName = data?.peak?.name || "";

  return (
    <>
      <AppModal
        open={isOpen}
        onClose={onClose}
        variant="dialog"
        contentClassName={styles["peak-info-modal"]}
        ariaLabel={t("userPeaks.peakInfo.title")}
      >
        {renderContent()}
      </AppModal>

      {showRouteModal && peakId && (
        <DesktopRouteSelectionModal
          peakId={peakId}
          peakName={pendingPeakName}
          onSelectRoute={handleRouteSelected}
          onClose={handleRouteModalClose}
        />
      )}

      <div style={{ display: "none" }}>
        <SingleDatePicker
          onDateChange={handleDateSelected}
          buttonLabel={t("userPeaks.peakInfo.linkToDate")}
          controlledOpen={showDatePicker}
          onControlledClose={handleDatePickerClose}
        />
      </div>

      {/* Delete ascension confirmation */}
      <DesktopConfirmationModal
        isOpen={pendingDeleteAsc !== null}
        title={t("userPeaks.peakInfo.deleteAscension")}
        message={t("userPeaks.peakInfo.confirmDeleteAscension")}
        confirmLabel={deletingAsc ? t("userPeaks.peakInfo.deleting") : t("userPeaks.peakInfo.yesDelete")}
        cancelLabel={t("userPeaks.peakInfo.cancel")}
        onConfirm={handleConfirmDeleteAscension}
        onCancel={() => setPendingDeleteAsc(null)}
        isDanger
      />

      {/* Delete peak confirmation */}
      <DesktopConfirmationModal
        isOpen={showDeletePeakConfirm}
        title={t("userPeaks.peakInfo.deletePeak")}
        message={t("userPeaks.peakInfo.confirmDeletePeak", { peakName: pendingPeakName })}
        confirmLabel={deletingPeak ? t("userPeaks.peakInfo.deleting") : t("userPeaks.peakInfo.yesDelete")}
        cancelLabel={t("userPeaks.peakInfo.cancel")}
        onConfirm={handleDeletePeak}
        onCancel={() => setShowDeletePeakConfirm(false)}
        isDanger
      />
    </>
  );
};

export default DesktopPeakInfoModal;
