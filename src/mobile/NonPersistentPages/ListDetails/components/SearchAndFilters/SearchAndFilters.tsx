import React from "react";
import {
  Search,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  CheckCircle,
  MapPin,
  List,
  Loader2,
  SlidersHorizontal,
  Map,
  Trophy,
} from "lucide-react";
import type { SortOption, FilterMode } from "../../types";
import styles from "./SearchAndFilters.module.css";

type SearchAndFiltersProps = {
  searchQuery: string;
  sortOption: SortOption;
  filterMode: FilterMode;
  isSortDropdownOpen: boolean;
  isFilterDropdownOpen: boolean;
  isLoading: boolean;
  sortDropdownRef: React.RefObject<HTMLDivElement | null>;
  filterDropdownRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchClear: () => void;
  onSortChange: (
    field: SortOption["field"],
    direction: SortOption["direction"]
  ) => void;
  onFilterChange: (mode: FilterMode) => void;
  onSortDropdownToggle: () => void;
  onFilterDropdownToggle: () => void;
  onMapClick?: () => void;
  onRankingClick?: () => void;
  t: (key: string, params?: Record<string, unknown>) => string;
};

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = React.memo(
  ({
    searchQuery,
    sortOption,
    filterMode,
    isSortDropdownOpen,
    isFilterDropdownOpen,
    isLoading,
    sortDropdownRef,
    filterDropdownRef,
    searchInputRef,
    onSearchChange,
    onSearchClear,
    onSortChange,
    onFilterChange,
    onSortDropdownToggle,
    onFilterDropdownToggle,
    onMapClick,
    onRankingClick,
    t,
  }) => {
    return (
      <div className={styles["searchAndFilters"]}>
        {/* Action Buttons - Ranking and Map */}
        {(onMapClick || onRankingClick) && (
          <div className={styles["searchAndFilters__actions"]}>
            {onRankingClick && (
              <button
                className={`${styles["searchAndFilters__actionBtn"]} ${styles["searchAndFilters__actionBtn--secondary"]} typography-button-medium`}
                onClick={onRankingClick}
                type="button"
              >
                <Trophy size={18}  />
                {t("common.ranking") || "Ranking"}
              </button>
            )}
            {onMapClick && (
              <button
                className={`${styles["searchAndFilters__actionBtn"]} ${styles["searchAndFilters__actionBtn--primary"]} typography-button-medium`}
                onClick={onMapClick}
                type="button"
              >
                <Map size={18}  />
                {t("common.map") || "Map"}
              </button>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className={styles["searchAndFilters__searchWrapper"]}>
          <div className={styles["searchAndFilters__searchInputContainer"]}>
            <Search
              size={18}
              className={styles["searchAndFilters__searchIcon"]}
            />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t("listDetails.search.placeholder")}
              value={searchQuery}
              onChange={onSearchChange}
              className={styles["searchAndFilters__searchInput"]}
            />
            {searchQuery && (
              <button
                onClick={onSearchClear}
                className={styles["searchAndFilters__searchClearButton"]}
                type="button"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className={styles["searchAndFilters__dropdownsRow"]}>
          {/* Sort Dropdown */}
          <div
            className={styles["searchAndFilters__sortDropdown"]}
            ref={sortDropdownRef}
            data-dropdown
          >
            <button
              className={styles["searchAndFilters__dropdownButton"]}
              onClick={onSortDropdownToggle}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2
                  size={18}
                  className={styles["searchAndFilters__loadingSpinner"]}
                />
              ) : (
                <ArrowUpDown size={18} />
              )}
              <span>
                {sortOption.field === "name"
                  ? t("listDetails.sorting.name")
                  : sortOption.field === "elevation"
                  ? t("listDetails.sorting.elevation")
                  : sortOption.field === "ascents"
                  ? t("listDetails.sorting.ascents")
                  : t("listDetails.sorting.date")}
                {sortOption.direction === "asc" ? (
                  <ArrowUp size={16} style={{ marginLeft: "8px" }} />
                ) : (
                  <ArrowDown size={16} style={{ marginLeft: "8px" }} />
                )}
              </span>
              <ChevronDown
                size={16}
                className={`${
                  isSortDropdownOpen
                    ? styles["searchAndFilters__chevronRotated"]
                    : ""
                } ${
                  isLoading ? styles["searchAndFilters__chevronHidden"] : ""
                }`}
              />
            </button>

            {isSortDropdownOpen && (
              <div className={styles["searchAndFilters__dropdownMenu"]}>
                <div className={styles["searchAndFilters__dropdownSection"]}>
                  <div
                    className={`${styles["searchAndFilters__dropdownTitle"]} typography-title-small`}
                  >
                    {t("listDetails.sorting.name")}
                  </div>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      sortOption.field === "name" &&
                      sortOption.direction === "asc"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("name", "asc")}
                  >
                    <span className="typography-body-small">
                      {t("listDetails.sortingOptions.nameAsc")}
                    </span>
                    <ArrowUp
                      size={16}
                      className={styles["searchAndFilters__arrow"]}
                    />
                  </button>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      sortOption.field === "name" &&
                      sortOption.direction === "desc"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("name", "desc")}
                  >
                    <span className="typography-body-small">
                      {t("listDetails.sortingOptions.nameDesc")}
                    </span>
                    <ArrowDown
                      size={16}
                      className={styles["searchAndFilters__arrow"]}
                    />
                  </button>
                </div>

                <div className={styles["searchAndFilters__dropdownSection"]}>
                  <div
                    className={`${styles["searchAndFilters__dropdownTitle"]} typography-title-small`}
                  >
                    {t("listDetails.sorting.elevation")}
                  </div>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      sortOption.field === "elevation" &&
                      sortOption.direction === "asc"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("elevation", "asc")}
                  >
                    <span className="typography-body-small">
                      {t("listDetails.sortingOptions.elevationAsc")}
                    </span>
                    <ArrowUp
                      size={16}
                      className={styles["searchAndFilters__arrow"]}
                    />
                  </button>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      sortOption.field === "elevation" &&
                      sortOption.direction === "desc"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("elevation", "desc")}
                  >
                    <span className="typography-body-small">
                      {t("listDetails.sortingOptions.elevationDesc")}
                    </span>
                    <ArrowDown
                      size={16}
                      className={styles["searchAndFilters__arrow"]}
                    />
                  </button>
                </div>

                <div className={styles["searchAndFilters__dropdownSection"]}>
                  <div
                    className={`${styles["searchAndFilters__dropdownTitle"]} typography-title-small`}
                  >
                    {t("listDetails.sorting.ascents")}
                  </div>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      filterMode !== "completed"
                        ? styles["searchAndFilters__dropdownItem--disabled"]
                        : ""
                    } ${
                      sortOption.field === "ascents" &&
                      sortOption.direction === "desc"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("ascents", "desc")}
                    disabled={filterMode !== "completed"}
                  >
                    <span className="typography-body-small">
                      {t("listDetails.sortingOptions.ascentsMost")}
                    </span>
                    <ArrowDown
                      size={16}
                      className={styles["searchAndFilters__arrow"]}
                    />
                  </button>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      filterMode !== "completed"
                        ? styles["searchAndFilters__dropdownItem--disabled"]
                        : ""
                    } ${
                      sortOption.field === "ascents" &&
                      sortOption.direction === "asc"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("ascents", "asc")}
                    disabled={filterMode !== "completed"}
                  >
                    <span className="typography-body-small">
                      {t("listDetails.sortingOptions.ascentsLeast")}
                    </span>
                    <ArrowUp
                      size={16}
                      className={styles["searchAndFilters__arrow"]}
                    />
                  </button>
                </div>

                <div className={styles["searchAndFilters__dropdownSection"]}>
                  <div
                    className={`${styles["searchAndFilters__dropdownTitle"]} typography-title-small`}
                  >
                    {t("listDetails.sorting.date")}
                  </div>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      filterMode !== "completed"
                        ? styles["searchAndFilters__dropdownItem--disabled"]
                        : ""
                    } ${
                      sortOption.field === "date" &&
                      sortOption.direction === "desc"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("date", "desc")}
                    disabled={filterMode !== "completed"}
                  >
                    <span className="typography-body-small">
                      {t("listDetails.sortingOptions.dateNewest")}
                    </span>
                    <ArrowDown
                      size={16}
                      className={styles["searchAndFilters__arrow"]}
                    />
                  </button>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      filterMode !== "completed"
                        ? styles["searchAndFilters__dropdownItem--disabled"]
                        : ""
                    } ${
                      sortOption.field === "date" &&
                      sortOption.direction === "asc"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("date", "asc")}
                    disabled={filterMode !== "completed"}
                  >
                    <span className="typography-body-small">
                      {t("listDetails.sortingOptions.dateOldest")}
                    </span>
                    <ArrowUp
                      size={16}
                      className={styles["searchAndFilters__arrow"]}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter Dropdown */}
          <div
            className={styles["searchAndFilters__filterDropdown"]}
            ref={filterDropdownRef}
            data-dropdown
          >
            <button
              className={`${styles["searchAndFilters__dropdownButton"]} ${
                filterMode === "all"
                  ? styles["searchAndFilters__dropdownButton--all"]
                  : filterMode === "completed"
                  ? styles["searchAndFilters__dropdownButton--completed"]
                  : styles["searchAndFilters__dropdownButton--missing"]
              }`}
              onClick={onFilterDropdownToggle}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2
                  size={18}
                  className={styles["searchAndFilters__loadingSpinner"]}
                />
              ) : (
                <SlidersHorizontal size={18} />
              )}
              <span>
                {filterMode === "all"
                  ? t("listDetails.filters.all")
                  : filterMode === "completed"
                  ? t("listDetails.filters.completed")
                  : t("listDetails.filters.missing")}
              </span>
              <ChevronDown
                size={16}
                className={`${
                  isFilterDropdownOpen
                    ? styles["searchAndFilters__chevronRotated"]
                    : ""
                } ${
                  isLoading ? styles["searchAndFilters__chevronHidden"] : ""
                }`}
              />
            </button>

            {isFilterDropdownOpen && (
              <div className={styles["searchAndFilters__dropdownMenu"]}>
                <div className={styles["searchAndFilters__dropdownSection"]}>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      styles["searchAndFilters__dropdownItem--all"]
                    } ${
                      filterMode === "all"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onFilterChange("all")}
                  >
                    <List
                      size={16}
                      className={styles["searchAndFilters__filterIcon"]}
                    />
                    <span className="typography-body-small">
                      {t("listDetails.filters.all")}
                    </span>
                  </button>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      styles["searchAndFilters__dropdownItem--completed"]
                    } ${
                      filterMode === "completed"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onFilterChange("completed")}
                  >
                    <CheckCircle
                      size={16}
                      className={styles["searchAndFilters__filterIcon"]}
                    />
                    <span className="typography-body-small">
                      {t("listDetails.filters.completed")}
                    </span>
                  </button>
                  <button
                    className={`${styles["searchAndFilters__dropdownItem"]} ${
                      styles["searchAndFilters__dropdownItem--missing"]
                    } ${
                      filterMode === "missing"
                        ? styles["searchAndFilters__dropdownItem--active"]
                        : ""
                    }`}
                    onClick={() => onFilterChange("missing")}
                  >
                    <MapPin
                      size={16}
                      className={styles["searchAndFilters__filterIcon"]}
                    />
                    <span className="typography-body-small">
                      {t("listDetails.filters.missing")}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
