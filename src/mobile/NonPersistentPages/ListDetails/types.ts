export type SortField = "name" | "elevation" | "date" | "ascents";
export type SortDirection = "asc" | "desc";

export type SortOption = {
  field: SortField;
  direction: SortDirection;
};

export type FilterMode = "all" | "completed" | "missing";

export type ListDetailsUIState = {
  sortOption: SortOption;
  filterMode: FilterMode;
  searchQuery: string;
  isTransitioning: boolean;
  isSortDropdownOpen: boolean;
  isFilterDropdownOpen: boolean;
  isLoading: boolean;
  showLoginPopup: boolean;
  loginPopupMessage: string;
};
