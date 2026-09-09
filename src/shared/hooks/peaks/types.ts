export type SortField = "name" | "elevation" | "date" | "ascents";
export type SortDirection = "asc" | "desc";
export type SortOption = {
  field: SortField;
  direction: SortDirection;
};

export type FilterState = {
  // Date range filters
  startDate: string | null;
  endDate: string | null;
  // Elevation filters
  elevationRange: [number, number];
  // Location filters
  admin_osm_ids: number[];
  admin_names: string[];
  // For desktop legacy filters (if needed)
  selectedCountry?: string | null;
  selectedRegion?: string | null;
  // Search query
  searchQuery?: string;
};

export const PEAKS_PER_PAGE = 100;
