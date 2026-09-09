import React from "react";
import { X } from "lucide-react";
import UnifiedFilterSection, {
  type AdminLevel,
} from "../UnifiedFilterSection/UnifiedFilterSection";
import AppModal from "../../../../shared/components/AppModal";
import styles from "./UnifiedFiltersPopup.module.css";

type BaseFilters = {
  startDate: string | null;
  endDate: string | null;
  admin_osm_ids?: number[];
  elevationRange?: [number, number];
};

type UnifiedFiltersPopupProps = {
  isOpen: boolean;
  scope: "userPeaks" | "userSavedPeaks" | "userRoutes" | "userSavedShelters";
  t: (key: string, params?: Record<string, unknown>) => string;
  localFilters: BaseFilters;
  adminLevels: AdminLevel[];
  onAdminLevelChange: (index: number, id: number | null) => void;
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
  adminLevels,
  onAdminLevelChange,
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
      <div className={styles["popup__header"]}>
        <h3 className="typography-title-medium">
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
          adminLevels={adminLevels}
          onAdminLevelChange={onAdminLevelChange}
          includeElevation={includeElevation}
        />
      </div>

      <div className={styles["popup__footer"]}>
        <button
          className={`${styles["popup__buttonSecondary"]} typography-button-medium`}
          onClick={onClearFilters}
        >
          {t(`${scope}.clearAll`)}
        </button>
        <button
          className={`${styles["popup__buttonPrimary"]} typography-button-medium`}
          onClick={onApplyFilters}
        >
          {t(`${scope}.applyFilters`)}
        </button>
      </div>
    </AppModal>
  );
};

export default React.memo(UnifiedFiltersPopup);
