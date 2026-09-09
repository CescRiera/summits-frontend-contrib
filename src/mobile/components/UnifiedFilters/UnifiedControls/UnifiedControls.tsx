import React from "react";
import UnifiedSearchbar from "../UnifiedSearchbar/UnifiedSearchbar";
import UnifiedFiltersTrigger from "../UnifiedFiltersTrigger/UnifiedFiltersTrigger";
import UnifiedOrderBy, {
  type OrderDirection,
  type OrderField,
} from "../UnifiedOrderBy/UnifiedOrderBy";
import styles from "./UnifiedControls.module.css";

type ControlsProps = {
  // search
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClear: () => void;

  // filters button
  filtersLabel: string;
  hasActiveFilters: boolean;
  onOpenFilters: () => void;

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
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSearchClear,
  filtersLabel,
  hasActiveFilters,
  onOpenFilters,
  orderLabel,
  orderValue,
  orderSections,
  isOrderOpen,
  isOrderClosing = false,
  onOrderToggle,
  onOrderChange,
  orderDisabled = false,
}) => {
  return (
    <div className={styles["controls"]}>
      <UnifiedSearchbar
        value={searchValue}
        placeholder={searchPlaceholder}
        onChange={onSearchChange}
        onClear={onSearchClear}
      />

      <div className={styles["controls__row"]}>
        <UnifiedFiltersTrigger
          label={filtersLabel}
          hasActiveFilters={hasActiveFilters}
          onClick={onOpenFilters}
        />

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
  );
};

export default React.memo(UnifiedControls);
