import React from "react";
import { X } from "lucide-react";
import UnifiedSearchbar from "../desktop-UnifiedSearchbar/desktop-UnifiedSearchbar.tsx";
import UnifiedFilterSection, {
  type UnifiedFilterOption,
} from "../desktop-UnifiedFilterSection/desktop-UnifiedFilterSection.tsx";
import UnifiedOrderBy, {
  type OrderDirection,
  type OrderField,
} from "../desktop-UnifiedOrderBy/desktop-UnifiedOrderBy.tsx";
import OverlayHeader from "../../desktop-Overlay/desktop-OverlayHeader/desktop-OverlayHeader.tsx";
import OverlayInfoSection, {
  type StatItem,
} from "../../desktop-Overlay/desktop-OverlayInfoSection/desktop-OverlayInfoSection.tsx";
import styles from "./desktop-UnifiedControls.module.css";

type BaseFilters = {
  startDate: string | null;
  endDate: string | null;
  selectedCountry?: string | null;
  selectedRegion?: string | null;
  elevationRange?: [number, number];
};

type ControlsProps = {
  // header (optional - only for UserPeaks, UserSavedPeaks, UserRoutes)
  headerTitle?: string;
  headerRightContent?: React.ReactNode;
  headerSubtitle?: string;

  // info section (optional - only for UserPeaks, UserSavedPeaks, UserRoutes)
  infoDescription?: string;
  infoStats?: StatItem[];
  showMapButton?: boolean;
  onMapClick?: () => void;
  mapButtonLabel?: string;

  // search
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClear: () => void;

  // filters
  scope: "userPeaks" | "userSavedPeaks" | "userRoutes" | "userSavedShelters";
  t: (key: string, params?: Record<string, unknown>) => string;
  localFilters: BaseFilters;
  onUpdateFilters: (filters: Partial<BaseFilters>) => void;
  onClearFilters: () => void;
  availableCountries: UnifiedFilterOption[];
  availableRegions: UnifiedFilterOption[];
  includeElevation?: boolean;

  // order by
  orderLabel: string;
  orderValue: { field: OrderField; direction: OrderDirection };
  orderSections: Array<{
    title: string;
    options: { field: OrderField; direction: OrderDirection; label: string }[];
  }>;
  isOrderOpen: boolean;
  isOrderClosing?: boolean;
  onOrderToggle: () => void;
  onOrderChange: (field: OrderField, direction: OrderDirection) => void;
  orderDisabled?: boolean;
};

const UnifiedControls: React.FC<ControlsProps> = ({
  headerTitle,
  headerRightContent,
  headerSubtitle,
  infoDescription,
  infoStats,
  showMapButton = false,
  onMapClick,
  mapButtonLabel,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSearchClear,
  scope,
  t,
  localFilters,
  onUpdateFilters,
  onClearFilters,
  availableCountries,
  availableRegions,
  includeElevation = true,
  orderLabel,
  orderValue,
  orderSections,
  isOrderOpen,
  isOrderClosing = false,
  onOrderToggle,
  onOrderChange,
  orderDisabled = false,
}) => {
  const hasActiveFilters =
    !!localFilters.startDate ||
    !!localFilters.endDate ||
    !!localFilters.selectedCountry ||
    !!localFilters.selectedRegion ||
    (localFilters.elevationRange &&
      (localFilters.elevationRange[0] !== 0 ||
        localFilters.elevationRange[1] !== 8849));

  const hasHeader = !!headerTitle;

  return (
    <div className={styles["controls"]}>
      {/* Left Column */}
      <div className={styles["controls__left"]}>
        {hasHeader && headerTitle && (
          <OverlayHeader
            title={headerTitle}
            rightContent={headerRightContent}
            subtitle={headerSubtitle}
          />
        )}
        {hasHeader && infoDescription && (
          <OverlayInfoSection
            description={infoDescription}
            stats={infoStats}
            showMapButton={showMapButton}
            {...(onMapClick ? { onMapClick } : {})}
            {...(mapButtonLabel ? { mapButtonLabel } : {})}
          />
        )}
        <div className={styles["controls__search"]}>
          <UnifiedSearchbar
            value={searchValue}
            placeholder={searchPlaceholder}
            onChange={onSearchChange}
            onClear={onSearchClear}
          />
        </div>
        <div className={styles["controls__sort"]}>
          <UnifiedOrderBy
            isOpen={isOrderOpen}
            isClosing={isOrderClosing}
            disabled={orderDisabled}
            label={orderLabel}
            value={orderValue}
            sections={orderSections}
            onToggle={onOrderToggle}
            onChange={onOrderChange}
          />
        </div>
      </div>

      {/* Right Column */}
      <div className={styles["controls__right"]}>
        <div className={styles["controls__filters"]}>
          <div className={styles["controls__filters-header"]}>
            <h3 className="typography-desktop-title-small">
              {t(`${scope}.advancedFilters`)}
            </h3>
            {hasActiveFilters && (
              <button
                className={styles["controls__clear-button"]}
                onClick={onClearFilters}
                type="button"
              >
                <X size={16} />
                <span className="typography-desktop-label-medium">
                  {t(`${scope}.clearAll`)}
                </span>
              </button>
            )}
          </div>
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
      </div>
    </div>
  );
};

export default React.memo(UnifiedControls);
