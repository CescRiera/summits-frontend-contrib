// Common types used across all API endpoints

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResponse {
  current_page?: number;
  total_pages?: number;
  total_items?: number;
  items_per_page?: number;
  has_next_page?: boolean;
  has_prev_page?: boolean;
  limit?: number;
  offset?: number;
  next_offset?: number;
}

export interface LanguageParams {
  language?: string;
}

export interface UserParams {
  userId?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

// Admin Hierarchy Types (OSM-based)
export interface AdminHierarchyEntry {
  name: string;
  osm_id?: number;
}

/** Keys are admin level strings: "2" = Country, "4" = State/Region, "6" = County, "8"/"9"/"10" = City/Local */
export type AdminHierarchy = Record<string, AdminHierarchyEntry>;

export interface AdminArea {
  osm_id: number;
  level: number;
  name: string;
}

/** @deprecated Use AdminHierarchy instead */
export interface Country {
  id: number;
  name: string;
  name_en?: string;
  total_peaks?: number;
  regions?: Region[];
}

/** @deprecated Use AdminHierarchy instead */
export interface Region {
  id: number;
  name: string;
  name_en?: string;
  country_id?: number;
  peaks_count?: number;
}

export interface PeakBasic {
  id: number;
  name: string;
  name_en?: string;
  elevation: number;
  lat: number;
  lng: number;
  admin_hierarchy?: AdminHierarchy;
  image?: string;
  wikidata_id?: string;
  wikipedia?: string;
}

export interface User {
  id: number;
  name: string;
  image?: string;
  external_user_id?: string;
  external_username?: string;
  type?: "wikiloc" | "strava" | "garmin" | "default";
  completion_count?: number;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface FilterParams {
  admin_osm_ids?: number[];
  /** @deprecated Use admin_osm_ids instead */
  countryId?: number;
  /** @deprecated Use admin_osm_ids instead */
  regionId?: number;
  minElevation?: number;
  maxElevation?: number;
}
