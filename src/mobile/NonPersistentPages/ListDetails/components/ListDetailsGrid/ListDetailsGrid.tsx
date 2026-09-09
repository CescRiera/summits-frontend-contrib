import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { type PeakListDetailsResponse } from "../../../../../shared/api/types";
import { useAuth } from "../../../../../shared/context/AuthContext";
import { useI18n } from "../../../../../shared/context/I18nContext";
import LoginRequiredPopup from "../../../../components/LoginRequiredPopup/LoginRequiredPopup";
import { useListDetailsUI } from "../../hooks/useListDetailsUI";
import { SearchAndFilters } from "../SearchAndFilters/SearchAndFilters";
import { PeakGrid } from "../PeakGrid/PeakGrid";
import type { SortOption, FilterMode } from "../../types";
import styles from "./ListDetailsGrid.module.css";

interface ListDetailsGridProps {
  listData: PeakListDetailsResponse;
  onMapClick: () => void;
  onRankingClick: () => void;
}

const ListDetailsGrid: React.FC<ListDetailsGridProps> = ({
  listData,
  onMapClick,
  onRankingClick,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();

  // Initial state
  const initialSortOption: SortOption = {
    field: "elevation",
    direction: "desc",
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
  } = useListDetailsUI(initialSortOption, initialFilterMode, user);

  const handlePeakClick = useCallback(
    (peakId: number) => {
      navigate(`/peaks/${peakId}`);
    },
    [navigate]
  );

  // Check if user has completed any peaks in this list
  const hasCompletedPeaks = useMemo(() => {
    if (!user || !listData?.peaks) return false;
    return listData.peaks.some((peak) => peak.user?.completed === true);
  }, [user, listData?.peaks]);

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
        onMapClick={onMapClick}
        onRankingClick={onRankingClick}
        t={t}
      />

      {/* Peak Grid */}
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
  );
};

ListDetailsGrid.displayName = "ListDetailsGrid";

export default ListDetailsGrid;
