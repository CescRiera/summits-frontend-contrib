import React from "react";
import styles from "./SubmitOptionsModal.module.css";
import AppModal from "../../../../shared/components/AppModal";
import { X, Route, Calendar, Loader2 } from "lucide-react";
import type { SelectedManualPeak } from "../../../../shared/hooks/useManualPeakSelection";

interface PeakDisplayData {
  id: number;
  name: string;
  name_en?: string | null;
}

interface SubmitOptionsModalProps {
  isOpen: boolean;
  selectedPeaks: SelectedManualPeak[];
  peakDisplayData: PeakDisplayData[];
  onSelectRoute: (peakId: number) => void;
  onSelectDate: (peakId: number) => void;
  onSubmit: () => void;
  onClose: () => void;
  isSubmitting: boolean;
  t: (key: string, params?: Record<string, unknown>) => string;
}

export const SubmitOptionsModal: React.FC<SubmitOptionsModalProps> = ({
  isOpen,
  selectedPeaks,
  peakDisplayData,
  onSelectRoute,
  onSelectDate,
  onSubmit,
  onClose,
  isSubmitting,
  t,
}) => {
  const peakCount = selectedPeaks.length;

  const getPeakName = (peakId: number): string => {
    const peak = peakDisplayData.find((p) => p.id === peakId);
    if (!peak) return `Peak #${peakId}`;
    return peak.name_en || peak.name;
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      contentClassName={styles["submit-options__modal"]}
      ariaLabel={t("addManualPeaks.submitOptions.title")}
    >
      <div className={styles["submit-options__content"]}>
        <div className={styles["submit-options__header"]}>
          <h2
            className={`${styles["submit-options__title"]} typography-title-medium`}
          >
            {t("addManualPeaks.submitOptions.title")}
          </h2>
          <button
            className={styles["submit-options__close-btn"]}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles["submit-options__subtitle"]}>
          <Route size={14} />
          <span className="typography-label-small">{t("addManualPeaks.submitOptions.routeHint")}</span>
          <Calendar size={14} style={{ marginLeft: 12 }} />
          <span className="typography-label-small">{t("addManualPeaks.submitOptions.dateHint")}</span>
        </div>

        <div className={styles["submit-options__peak-list"]}>
          {selectedPeaks.map((peak) => (
            <div key={peak.peak_id} className={styles["submit-options__peak-row"]}>
              <span className={`${styles["submit-options__peak-name"]} typography-body-medium`}>
                {getPeakName(peak.peak_id)}
              </span>
              <div className={styles["submit-options__peak-actions"]}>
                <button
                  className={`${styles["submit-options__icon-btn"]} ${
                    peak.route_id ? styles["submit-options__icon-btn--active-route"] : ""
                  }`}
                  onClick={() => onSelectRoute(peak.peak_id)}
                  aria-label="Assign route"
                  title="Assign route"
                >
                  <Route size={16} />
                </button>
                <button
                  className={`${styles["submit-options__icon-btn"]} ${
                    peak.date ? styles["submit-options__icon-btn--active-date"] : ""
                  }`}
                  onClick={() => onSelectDate(peak.peak_id)}
                  aria-label="Assign date"
                  title="Assign date"
                >
                  <Calendar size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles["submit-options__footer"]}>
          <button
            className={`${styles["submit-options__submit-btn"]} typography-button-large`}
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} />
                {t("addManualPeaks.submitting")}
              </>
            ) : (
              t("addManualPeaks.submit", { count: peakCount })
            )}
          </button>
        </div>
      </div>
    </AppModal>
  );
};
