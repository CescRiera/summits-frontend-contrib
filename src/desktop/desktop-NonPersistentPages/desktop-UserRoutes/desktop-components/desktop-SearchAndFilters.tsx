import React from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { SortOption } from "../desktop-types.ts";
import styles from "../desktop-UserRoutes.module.css";

type SearchAndFiltersProps = {
  searchQuery: string;
  sortOption: SortOption;
  isSortDropdownOpen: boolean;
  isSortDropdownClosing: boolean;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onOpenFilters: () => void;
  onSortDropdownToggle: () => void;
  onSortChange: (field: "date" | "peaks", direction: "asc" | "desc") => void;
  t: (key: string, params?: Record<string, unknown>) => string;
};

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = React.memo(
  ({
    searchQuery,
    sortOption,
    isSortDropdownOpen,
    isSortDropdownClosing,
    onSearchChange,
    onClearSearch,
    onOpenFilters,
    onSortDropdownToggle,
    onSortChange,
    t,
  }) => {
    const handleSortChange = React.useCallback(
      (field: "date" | "peaks", direction: "asc" | "desc") => {
        onSortChange(field, direction);
      },
      [onSortChange]
    );

    return (
      <>
        <div className={styles["userRoutes__search-wrapper"]}>
          <div className={styles["userRoutes__search-input-container"]}>
            <Search size={18} className={styles["userRoutes__search-icon"]} />
            <input
              type="text"
              placeholder={t("userRoutes.searchPlaceholder")}
              value={searchQuery}
              onChange={onSearchChange}
              className={styles["userRoutes__search-input"]}
            />
            {searchQuery && (
              <button
                onClick={onClearSearch}
                className={styles["userRoutes__search-clear-button"]}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className={styles["userRoutes__dropdowns-row"]}>
          <button
            className={styles["userRoutes__filter-button"]}
            onClick={onOpenFilters}
          >
            <SlidersHorizontal size={16} />
            <span className="typography-desktop-button-medium">
              {t("userRoutes.filters")}
            </span>
          </button>

          <div className={styles["userRoutes__sort-dropdown"]} data-dropdown>
            <button
              className={styles["userRoutes__dropdown-button"]}
              onClick={onSortDropdownToggle}
            >
              <ArrowUpDown size={18} />
              <span className="typography-desktop-button-medium">
                {sortOption.field === "peaks"
                  ? t("userRoutes.peaks")
                  : t("userRoutes.date")}
              </span>
              {sortOption.direction === "asc" ? (
                <ArrowUp size={16} />
              ) : (
                <ArrowDown size={16} />
              )}
            </button>

            {(isSortDropdownOpen || isSortDropdownClosing) && (
              <div
                className={`${styles["userRoutes__dropdown-menu"]} ${
                  isSortDropdownClosing
                    ? styles["userRoutes__dropdown-menu--closing"]
                    : ""
                }`}
              >
                <div className={styles["userRoutes__dropdown-section"]}>
                  <div
                    className={`${styles["userRoutes__dropdown-title"]} typography-desktop-body-small`}
                  >
                    {t("userRoutes.sortBy")}
                  </div>
                  <button onClick={() => handleSortChange("date", "desc")}>
                    <span className="typography-desktop-body-small">
                      {t("userRoutes.sortOptions.dateNewest")}
                    </span>
                  </button>
                  <button onClick={() => handleSortChange("date", "asc")}>
                    <span className="typography-desktop-body-small">
                      {t("userRoutes.sortOptions.dateOldest")}
                    </span>
                  </button>
                  <button onClick={() => handleSortChange("peaks", "desc")}>
                    <span className="typography-desktop-body-small">
                      {t("userRoutes.sortOptions.peaksMost")}
                    </span>
                  </button>
                  <button onClick={() => handleSortChange("peaks", "asc")}>
                    <span className="typography-desktop-body-small">
                      {t("userRoutes.sortOptions.peaksLeast")}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);
