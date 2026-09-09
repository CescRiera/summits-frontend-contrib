import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { type PeakListDetailsResponse } from "../../../../../shared/api/types";
import { useAuth } from "../../../../../shared/context/AuthContext";
import { useI18n } from "../../../../../shared/context/I18nContext";
import LoginRequiredPopup from "../../../../desktop-components/desktop-LoginRequiredPopup/desktop-LoginRequiredPopup.tsx";
import { useListDetailsUI } from "../../desktop-hooks/desktop-useListDetailsUI.ts";
import { SearchAndFilters } from "../desktop-SearchAndFilters/desktop-SearchAndFilters.tsx";
import { PeakGrid } from "../desktop-PeakGrid/desktop-PeakGrid.tsx";
import type { SortOption, FilterMode } from "../../desktop-types.ts";
import styles from "./desktop-ListDetailsGrid.module.css";

interface ListDetailsGridProps {
  listData: PeakListDetailsResponse;
}

const ListDetailsGrid: React.FC<ListDetailsGridProps> = ({ listData }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  // Initial state
  const initialSortOption: SortOption = {
    field: "name",
    direction: "asc",
  };
  const initialFilterMode: FilterMode = "all";

  // Custom hooks
  const {
    sortOption,
    filterMode,
    searchQuery,
    isTransitioning,
    isSortDropdownOpen,
    isFilterDropdownOpen,
    isLoading,
    showLoginPopup,
    loginPopupMessage,
    sortDropdownRef,
    filterDropdownRef,
    searchInputRef,
    handleSortChange,
    handleFilterChange,
    handleSearchChange,
    handleSearchClear,
    handleSortDropdownToggle,
    handleFilterDropdownToggle,
    handleCloseLoginPopup,
  } = useListDetailsUI(
    initialSortOption,
    initialFilterMode,
    user,
    listData?.user_authenticated
  );

  const handlePeakClick = useCallback(
    (peakId: number) => {
      navigate(`/peaks/${peakId}`);
    },
    [navigate]
  );

  // Check if user has completed any peaks in this list
  // Use user_authenticated from listData (works when viewing another user's list)
  const hasCompletedPeaks = useMemo(() => {
    if (!listData?.user_authenticated || !listData?.peaks) return false;
    return listData.peaks.some((peak) => peak.user?.completed === true);
  }, [listData?.user_authenticated, listData?.peaks]);

  return (
    <div className={styles["listDetailsGrid"]}>
      {/* Login Required Popup */}
      <LoginRequiredPopup
        isOpen={showLoginPopup}
        onClose={handleCloseLoginPopup}
        message={loginPopupMessage}
      />

      {/* Search and Filters */}
      <SearchAndFilters
        searchQuery={searchQuery}
        sortOption={sortOption}
        filterMode={filterMode}
        isSortDropdownOpen={isSortDropdownOpen}
        isFilterDropdownOpen={isFilterDropdownOpen}
        isLoading={isLoading}
        sortDropdownRef={sortDropdownRef}
        filterDropdownRef={filterDropdownRef}
        searchInputRef={searchInputRef}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        onSortChange={handleSortChange}
        onFilterChange={handleFilterChange}
        onSortDropdownToggle={handleSortDropdownToggle}
        onFilterDropdownToggle={handleFilterDropdownToggle}
        t={t}
      />

      {/* Peak Grid */}
      <div className={styles["listDetailsGrid__peaksContainer"]}>
        <PeakGrid
          listData={listData}
          sortOption={sortOption}
          filterMode={filterMode}
          searchQuery={searchQuery}
          isLoading={isLoading}
          isTransitioning={isTransitioning}
          onPeakClick={handlePeakClick}
          hasCompletedPeaks={hasCompletedPeaks}
          t={t}
        />
      </div>
    </div>
  );
};

ListDetailsGrid.displayName = "ListDetailsGrid";

export default ListDetailsGrid;
