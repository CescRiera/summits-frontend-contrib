export type SortField = "date" | "peaks";
export type SortDirection = "asc" | "desc";

export type SortOption = {
  field: SortField;
  direction: SortDirection;
};

export type FilterState = {
  searchQuery: string;
  startDate: string | null;
  endDate: string | null;
  admin_osm_ids: number[];
  admin_names: string[];
};

export const ROUTES_PER_PAGE = 50;
