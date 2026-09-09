import React from "react";
import {
  Search,
  X,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  MapPin,
  List,
} from "lucide-react";
import type { SortOption, FilterMode } from "../../desktop-types.ts";
import styles from "./desktop-SearchAndFilters.module.css";

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
  t: (key: string, params?: Record<string, unknown>) => string;
};

export const SearchAndFilters: React.FC<SearchAndFiltersProps> = React.memo(
  ({
    searchQuery,
    sortOption,
    filterMode,
    isLoading,
    searchInputRef,
    onSearchChange,
    onSearchClear,
    onSortChange,
    onFilterChange,
    t,
  }) => {
    const isCompletedFilter = filterMode === "completed";

    return (
      <div className={styles["searchAndFilters"]}>
        {/* Search and Filters Row */}
        <div className={styles["searchAndFilters__topRow"]}>
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

          {/* Filter Buttons */}
          <div className={styles["searchAndFilters__filterGroup"]}>
            <span
              className={`${styles["searchAndFilters__groupLabel"]} typography-desktop-body-small`}
            >
              {t("listDetails.filters.label")}
            </span>
            <div className={styles["searchAndFilters__filterButtons"]}>
              <button
                className={`${styles["searchAndFilters__filterButton"]} ${
                  filterMode === "all"
                    ? styles["searchAndFilters__filterButton--active"]
                    : ""
                }`}
                onClick={() => onFilterChange("all")}
                disabled={isLoading}
              >
                <List size={16} />
                <span className="typography-body-medium">
                  {t("listDetails.filters.all")}
                </span>
              </button>
              <button
                className={`${styles["searchAndFilters__filterButton"]} ${
                  filterMode === "completed"
                    ? styles["searchAndFilters__filterButton--active"]
                    : ""
                }`}
                onClick={() => onFilterChange("completed")}
                disabled={isLoading}
              >
                <CheckCircle size={16} />
                <span className="typography-body-medium">
                  {t("listDetails.filters.completed")}
                </span>
              </button>
              <button
                className={`${styles["searchAndFilters__filterButton"]} ${
                  filterMode === "missing"
                    ? styles["searchAndFilters__filterButton--active"]
                    : ""
                }`}
                onClick={() => onFilterChange("missing")}
                disabled={isLoading}
              >
                <MapPin size={16} />
                <span className="typography-body-medium">
                  {t("listDetails.filters.missing")}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Sort Row */}
        <div className={styles["searchAndFilters__sortRow"]}>
          <div className={styles["searchAndFilters__sortGroup"]}>
            <span
              className={`${styles["searchAndFilters__groupLabel"]} typography-desktop-body-small`}
            >
              {t("listDetails.sorting.label")}
            </span>
            <div className={styles["searchAndFilters__sortButtons"]}>
              {/* Name Sort */}
              <div className={styles["searchAndFilters__sortField"]}>
                <span
                  className={`${styles["searchAndFilters__sortFieldLabel"]} typography-desktop-label-medium`}
                >
                  {t("listDetails.sorting.name")}
                </span>
                <div
                  className={styles["searchAndFilters__sortDirectionButtons"]}
                >
                  <button
                    className={`${styles["searchAndFilters__sortButton"]} ${
                      sortOption.field === "name" &&
                      sortOption.direction === "asc"
                        ? styles["searchAndFilters__sortButton--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("name", "asc")}
                    disabled={isLoading}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className={`${styles["searchAndFilters__sortButton"]} ${
                      sortOption.field === "name" &&
                      sortOption.direction === "desc"
                        ? styles["searchAndFilters__sortButton--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("name", "desc")}
                    disabled={isLoading}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>

              {/* Elevation Sort */}
              <div className={styles["searchAndFilters__sortField"]}>
                <span
                  className={`${styles["searchAndFilters__sortFieldLabel"]} typography-desktop-label-medium`}
                >
                  {t("listDetails.sorting.elevation")}
                </span>
                <div
                  className={styles["searchAndFilters__sortDirectionButtons"]}
                >
                  <button
                    className={`${styles["searchAndFilters__sortButton"]} ${
                      sortOption.field === "elevation" &&
                      sortOption.direction === "asc"
                        ? styles["searchAndFilters__sortButton--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("elevation", "asc")}
                    disabled={isLoading}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className={`${styles["searchAndFilters__sortButton"]} ${
                      sortOption.field === "elevation" &&
                      sortOption.direction === "desc"
                        ? styles["searchAndFilters__sortButton--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("elevation", "desc")}
                    disabled={isLoading}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>

              {/* Ascents Sort */}
              <div
                className={`${styles["searchAndFilters__sortField"]} ${
                  !isCompletedFilter
                    ? styles["searchAndFilters__sortField--disabled"]
                    : ""
                }`}
              >
                <span
                  className={`${styles["searchAndFilters__sortFieldLabel"]} typography-desktop-label-medium`}
                >
                  {t("listDetails.sorting.ascents")}
                </span>
                <div
                  className={styles["searchAndFilters__sortDirectionButtons"]}
                >
                  <button
                    className={`${styles["searchAndFilters__sortButton"]} ${
                      sortOption.field === "ascents" &&
                      sortOption.direction === "asc"
                        ? styles["searchAndFilters__sortButton--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("ascents", "asc")}
                    disabled={isLoading || !isCompletedFilter}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className={`${styles["searchAndFilters__sortButton"]} ${
                      sortOption.field === "ascents" &&
                      sortOption.direction === "desc"
                        ? styles["searchAndFilters__sortButton--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("ascents", "desc")}
                    disabled={isLoading || !isCompletedFilter}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>

              {/* Date Sort */}
              <div
                className={`${styles["searchAndFilters__sortField"]} ${
                  !isCompletedFilter
                    ? styles["searchAndFilters__sortField--disabled"]
                    : ""
                }`}
              >
                <span
                  className={`${styles["searchAndFilters__sortFieldLabel"]} typography-desktop-label-medium`}
                >
                  {t("listDetails.sorting.date")}
                </span>
                <div
                  className={styles["searchAndFilters__sortDirectionButtons"]}
                >
                  <button
                    className={`${styles["searchAndFilters__sortButton"]} ${
                      sortOption.field === "date" &&
                      sortOption.direction === "asc"
                        ? styles["searchAndFilters__sortButton--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("date", "asc")}
                    disabled={isLoading || !isCompletedFilter}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className={`${styles["searchAndFilters__sortButton"]} ${
                      sortOption.field === "date" &&
                      sortOption.direction === "desc"
                        ? styles["searchAndFilters__sortButton--active"]
                        : ""
                    }`}
                    onClick={() => onSortChange("date", "desc")}
                    disabled={isLoading || !isCompletedFilter}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
