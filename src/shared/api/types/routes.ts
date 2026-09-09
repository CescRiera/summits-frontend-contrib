import type { PeakBasic, AdminHierarchy } from "./common";

// Route Types
export interface RouteCoordinate {
  lat: number;
  lng: number;
  elevation: number;
  timestamp: string | null;
}

export interface CompletedPeak extends PeakBasic {
  admin_hierarchy?: AdminHierarchy;
}

export interface RouteProperties {
  date: string;
  distance: string;
  elevation_gain: number;
  time?: string;
  moving_time?: string;
  activity_type: string;
  peaks: CompletedPeak[];
  nearby_peaks: CompletedPeak[];
  route_url?: string;
  strava_activity_id?: string;
  strava_url?: string;
  photos_count?: number;
  [key: string]: string | number | boolean | undefined | CompletedPeak[];
}

export interface Route {
  id: string;
  name: string;
  coordinates: RouteCoordinate[];
  completed_peaks: CompletedPeak[];
  properties: RouteProperties;
}

export interface RouteDetailsResponse {
  success: boolean;
  route: Route;
  provider: "strava" | "wikiloc" | "garmin" | "default" | "manual";
  user_id?: number;
  user_name?: string;
}

// Manual Route Management Types
export interface AddRouteRequest {
  name: string;
  gpx: string;
}

export interface AddRouteResponse {
  success: boolean;
  routeId: number;
  message: string;
  peaksDetected: number;
  processingTime: number;
}

export interface DeleteRouteRequest {
  routeId: number;
}

export interface DeleteRouteResponse {
  success: boolean;
  message: string;
  processingTime: number;
}

// User Routes Types
export interface UserRoute {
  id: string;
  name: string;
  route_id: string;
  activity_type: string;
  distance: string | null;
  elevation_gain: number | null;
  time: string | null;
  moving_time: string | null;
  date: string;
  route_url: string;
  device_model?: string;
  images: string[];
  peaks: Array<{
    id: string;
    name: string;
    name_en: string;
    lat: number;
    lng: number;
    elevation: number;
    image: string;
    admin_hierarchy?: AdminHierarchy;
    ascent_count: number;
  }>;
  peaks_count: number;
}

export interface UserRoutesResponse {
  success: boolean;
  routes: UserRoute[];
  statistics: {
    total_routes: number;
    total_peaks: number;
    provider: string;
  };
}

export interface UserRoutesPaginationRequest {
  page: number;
  limit: number;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  admin_osm_ids?: number[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface UserRoutesPaginationResponse {
  success: boolean;
  routes: UserRoute[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_routes: number;
    routes_per_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
  filters: {
    startDate?: string;
    endDate?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  };
  statistics: {
    total_routes: number;
    total_peaks: number;
    provider: string;
  };
  user_name?: string;
  user_image?: string;
}

// User Peaks Countries Types (New Admin Hierarchy)
export interface AdminAreaWithCount {
  admin_hierarchy: AdminHierarchy;
  peaks_count: number;
}

/** @deprecated Use AdminAreaWithCount instead */
export interface CountryWithRegions {
  id: number;
  name: string;
  regions: Array<{
    id: number;
    name: string;
    peaks_count: number;
  }>;
  total_peaks: number;
}

export interface UserPeaksCountriesResponse {
  success: boolean;
  admin_areas: AdminAreaWithCount[];
  /** @deprecated Use admin_areas instead */
  countries?: CountryWithRegions[];
  statistics: {
    total_countries: number;
    total_regions: number;
    total_peaks: number;
    provider: string;
  };
  requestId: string;
  processingTime: number;
  timestamp: string;
}

// Recent Community Routes Types
export interface RecentCommunityRoute {
  id: number;
  name: string;
  route_id: string;
  activity_type: string;
  distance: number;
  elevation_gain: number;
  time: string;
  moving_time: string;
  date: string;
  route_url: string;
  device_model?: string;
  user: {
    id: number;
    name: string;
    image: string;
  };
  images: Array<{
    url: string;
    order: number;
  }>;
  peaks_count: number;
  peaks?: Array<{
    id: number;
    name: string;
    name_en: string;
    elevation: number;
    image: string;
    lat: number;
    lng: number;
  }>;
  coordinates?: {
    type: "LineString";
    coordinates: [number, number][];
  };
}

export interface RecentCommunityRoutesResponse {
  routes: RecentCommunityRoute[];
  total: number;
  message: string;
}
