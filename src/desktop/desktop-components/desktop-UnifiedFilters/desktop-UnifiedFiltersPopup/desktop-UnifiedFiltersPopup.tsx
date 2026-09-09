import React from "react";
import { X } from "lucide-react";
import UnifiedFilterSection, {
  type UnifiedFilterOption,
} from "../desktop-UnifiedFilterSection/desktop-UnifiedFilterSection.tsx";
import AppModal from "../../../../shared/components/AppModal";
import styles from "./desktop-UnifiedFiltersPopup.module.css";

type BaseFilters = {
  startDate: string | null;
  endDate: string | null;
  selectedCountry: string | null;
  selectedRegion: string | null;
  elevationRange?: [number, number];
};

type UnifiedFiltersPopupProps = {
  isOpen: boolean;
  scope: "userPeaks" | "userSavedPeaks" | "userRoutes";
  t: (key: string, params?: Record<string, unknown>) => string;
  localFilters: BaseFilters;
  availableCountries: UnifiedFilterOption[];
  availableRegions: UnifiedFilterOption[];
  includeElevation?: boolean;
  onClose: () => void;
  onUpdateFilters: (filters: Partial<BaseFilters>) => void;
  onClearFilters: () => void;
  onApplyFilters: () => void;
};

const UnifiedFiltersPopup: React.FC<UnifiedFiltersPopupProps> = ({
  isOpen,
  scope,
  t,
  localFilters,
  availableCountries,
  availableRegions,
  includeElevation = true,
  onClose,
  onUpdateFilters,
  onClearFilters,
  onApplyFilters,
}) => {
  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="sheet"
      contentClassName={styles["popup__container"]}
      ariaLabel={t(`${scope}.advancedFilters`)}
    >
      <div>
        <div className={styles["popup__header"]}>
          <h3 className="typography-desktop-body-small">
            {t(`${scope}.advancedFilters`)}
          </h3>
          <button className={styles["popup__close"]} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles["popup__content"]}>
          <UnifiedFilterSection
            scope={scope}
            t={t}
            localFilters={localFilters}
            onUpdateFilters={onUpdateFilters}
            availableCountries={availableCountries}
            availableRegions={availableRegions}
            includeElevation={includeElevation}
          />
        </div>

        <div className={styles["popup__footer"]}>
          <button
            className={`${styles["popup__buttonSecondary"]} typography-desktop-button-medium`}
            onClick={onClearFilters}
          >
            {t(`${scope}.clearAll`)}
          </button>
          <button
            className={`${styles["popup__buttonPrimary"]} typography-desktop-button-medium`}
            onClick={onApplyFilters}
          >
            {t(`${scope}.applyFilters`)}
          </button>
        </div>
      </div>
    </AppModal>
  );
};

export default React.memo(UnifiedFiltersPopup);
