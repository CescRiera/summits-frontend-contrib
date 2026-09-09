import type { PaginationResponse, User, AdminHierarchy } from "./common";
import type {
  PeakSearchResult,
  AdminSearchResult,
  MountainRangeSearchResult,
} from "./peaks";
import type { ClubSearchResult, ClubVisibility } from "./clubs";
import type { ShelterSearchResult } from "./shelters";

// User Data Types
export interface UserDetails {
  uid: string;
  email?: string;
  type?: "wikiloc" | "strava" | "garmin" | "default";
  externalUserId?: string;
  externalUsername?: string;
  language?: string;
  createdAt?: string;
  updatedAt?: string;
  rank?: string;
  total_saved_peaks?: number;
  total_saved_shelters?: number;
  total_user_peaks?: number;
  image?: string;
  is_private?: boolean;
  notifications_enabled?: boolean;
}

export interface InternalUserIdResponse {
  success: boolean;
  user_id: number;
}

// User Peaks Types
export interface UserPeak {
  id: number;
  name: string;
  name_en: string | null;
  lat: number;
  lng: number;
  elevation: number;
  wikidata_id: string;
  wikipedia: string;
  image: string;
  admin_hierarchy?: AdminHierarchy;

  user: {
    completed: boolean;
    count: number;
    routes: Array<{
      id: number;
      name: string;
      date: string;
    }>;
  };
}

export interface UserPeaksRequest {
  page?: number | undefined;
  limit?: number | undefined;
  userId?: string | undefined;
  language?: string | undefined;
  searchQuery?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  admin_osm_ids?: number[] | undefined;
  min_elevation?: number | undefined;
  max_elevation?: number | undefined;
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
  selectedCountry?: string | null | undefined;
  selectedRegion?: string | null | undefined;
}

export interface UserPeaksResponse {
  success: boolean;
  peaks: UserPeak[];
  pagination: PaginationResponse;
  filters?: {
    searchQuery?: string;
    startDate?: string;
    endDate?: string;
    admin_osm_ids?: number[];
    min_elevation?: number;
    max_elevation?: number;
    sortBy?: string;
    sortOrder?: string;
  };
  user_id?: number | string;
  user_name?: string;
  user_image?: string;
  total_peaks: number;
  user_authenticated: boolean;
  message?: string;
  requestId?: string;
  processingTime?: string;
  timestamp?: string;
}

// User Saved Peaks Types
export interface UserSavedPeak {
  id: number;
  name: string;
  name_en: string | null;
  lat: number;
  lng: number;
  elevation: number;
  image: string;
  admin_hierarchy?: AdminHierarchy;
  saved_at: string;
}

export interface UserSavedPeaksRequest {
  page?: number | undefined;
  limit?: number | undefined;
  language?: string | undefined;
  searchQuery?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  admin_osm_ids?: number[] | undefined;
  min_elevation?: number | undefined;
  max_elevation?: number | undefined;
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
}

export interface UserSavedPeaksResponse {
  success?: boolean;
  peaks: UserSavedPeak[];
  pagination?: PaginationResponse;
  filters?: {
    searchQuery?: string;
    startDate?: string;
    endDate?: string;
    admin_osm_ids?: number[];
    min_elevation?: number;
    max_elevation?: number;
    sortBy?: string;
    sortOrder?: string;
  };
  total_peaks: number;
  message?: string;
  user_authenticated: boolean;
  requestId?: string;
  processingTime?: string;
  timestamp?: string;
}

// User Statistics Types
export interface UserStatsByActivityItem {
  activity_type: string;
  total_routes: number;
  total_distance_km: number;
  total_elevation_gain: number;
  total_time_seconds: number;
  total_moving_time_seconds: number;
  total_peaks: number;
}

export interface UserStatsResponse {
  rank: number;
  totals: {
    global: {
      total_routes: number;
      total_distance_km: number;
      total_elevation_gain: number;
      total_time_seconds: number;
      total_moving_time_seconds: number;
      total_peaks: number;
      rank_total_users: number;
    };
    by_activity: UserStatsByActivityItem[];
  };
  peaks_per_list: Array<{
    list_id: number;
    list_name: string;
    total_peaks: number;
    user_completed: number;
    percent_completed: number;
    primary_image: string | null;
    start_date?: string | null;
    end_date?: string | null;
    max_duration?: number | null;
    creator_id?: number | null;
    creator_name?: string | null;
    creator_image?: string | null;
    /** @deprecated Use creator_id instead */
    created_by?: number | null;
  }>;
  user_id: number;
  user_name?: string;
  user_image?: string;
  is_private?: boolean;
}

export interface StatsGraphRoutePoint {
  id: number;
  name: string;
  date: string;
  elevation_gain: number;
  time: string;
  moving_time: string;
  distance: number;
  peaks: number;
  activity_type: string;
}

export interface StatsGraphResponse {
  routes: StatsGraphRoutePoint[];
  total: number;
  user_id: number;
}

// Community Types
export interface CommunityPeak {
  id: number;
  name: string;
  name_en: string | null;
  lat: number;
  lng: number;
  elevation: number;
  admin_hierarchy?: AdminHierarchy;
  count: number;
  user_id?: number;
  user_name?: string;
  user_image?: string;
  image_url?: string;
  image?: string;
  all_user_ids?: number[];
  all_users?: User[];
  unique_users: number;
  users: User[];
}

export interface CommunityPeaksResponse {
  peaks: CommunityPeak[];
  total: number;
  total_count: number;
  has_more: boolean;
  pagination: PaginationResponse;
}

export interface CommunityUserStats {
  user_id: number;
  user_name: string;
  user_image: string;
  activity_type: string;
  total_routes: number;
  total_distance_km: number;
  total_elevation_gain: number;
  total_time_seconds: number;
  total_moving_time_seconds: number;
  total_peaks: number;
  total_time_formatted: string;
  total_moving_time_formatted: string;
  regional_peaks?: number;
}

export interface CommunityUsersResponse {
  users: CommunityUserStats[];
  total: number;
  total_count: number;
  has_more: boolean;
  activity_type?: string;
  sort_by: string;
  pagination: PaginationResponse;
}

export interface RecentCommunityPeak {
  id: number;
  name: string;
  name_en: string;
  lat: number;
  lng: number;
  elevation: number;
  image: string;
  admin_hierarchy?: AdminHierarchy;
  most_recent_date: string;
  user: {
    id: number;
    name: string;
    image: string;
    completion_count: number;
  };
}

export interface RecentCommunityPeaksResponse {
  peaks: RecentCommunityPeak[];
  total: number;
  message: string;
}

// Following Types
export interface RecentFollowingPeak {
  id: number;
  name: string;
  name_en: string;
  lat: number;
  lng: number;
  elevation: number;
  image: string;
  admin_hierarchy?: AdminHierarchy;
  most_recent_date: string;
  user: {
    id: number;
    name: string;
    image: string;
    completion_count: number;
  };
}

export interface RecentFollowingPeaksResponse {
  peaks: RecentFollowingPeak[];
  total: number;
  message: string;
}

export interface RecentFollowingRoute {
  id: number;
  name: string;
  route_id: string;
  activity_type: string;
  distance: number;
  elevation_gain: number;
  time: string; // HH:MM:SS format
  moving_time: string; // HH:MM:SS format
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

export interface RecentFollowingRoutesResponse {
  routes: RecentFollowingRoute[];
  total: number;
  message: string;
}

// Activity Categories Types
export interface ActivityCategory {
  id: number;
  name: string;
}

export interface ActivityCategoriesResponse {
  categories: ActivityCategory[];
  total: number;
}

// Search Types
export interface UserSearchResult {
  type: "user";
  id: number;
  name: string;
  wikiloc_user_id: string;
  image: string;
  total_peaks: number;
  relevance_score: number;
}

export interface RealtimeSearchResponse {
  results: (
    | PeakSearchResult
    | UserSearchResult
    | AdminSearchResult
    | MountainRangeSearchResult
    | ClubSearchResult
    | ShelterSearchResult
  )[];
  query: string;
  total: number;
}

export interface AdminSearchResponse {
  results: AdminSearchResult[];
  query: string;
  total: number;
  search_type: "admin_only";
}

// Peak Lists Types
export interface PeakListChallengeConstraints {
  start_date?: string | null;
  end_date?: string | null;
  max_duration?: number | null;
}

export interface PeakListCreatorInfo {
  creator_id?: number | null;
  creator_name?: string | null;
  creator_image?: string | null;
  /** @deprecated Use creator_id instead */
  created_by?: number | null;
}

export interface PeakListClubInfo {
  club_id?: number | null;
  club_name?: string | null;
  club_image?: string | null;
  club_visibility?: ClubVisibility | null;
  has_club_access?: boolean;
}

export interface PeakListUser {
  user_id: number;
  user_name: string;
  user_image: string;
  user_completed: number;
  percent_completed: number;
  total_peaks_in_list: number;
  is_completed?: boolean;
  time_seconds?: number;
}

export interface PeakList
  extends PeakListChallengeConstraints,
    PeakListCreatorInfo,
    PeakListClubInfo {
  list_id: number;
  list_name: string;
  description: string;
  total_peaks: number;
  primary_image: string | null;
  images: string[];
  users: PeakListUser[];
  total: number;
  total_count: number;
  has_more: boolean;
  pagination: PaginationResponse;
}

export interface PeakListsResponse {
  lists: PeakList[];
}

export interface PeakListBasicItem
  extends PeakListChallengeConstraints,
    PeakListCreatorInfo,
    PeakListClubInfo {
  list_id: number;
  name?: string;
  list_name?: string;
  description: string;
  primary_image: string | null;
  images: string[];
  is_following?: boolean;
  is_private?: boolean;
  num_peaks?: number;
  total_peaks?: number;
}

export interface PeakListsBasicResponse {
  lists: PeakListBasicItem[];
  total: number;
  language: string;
}

export interface PeakListDetailsPeak {
  id: number;
  name: string;
  name_en: string | null;
  lat: number;
  lng: number;
  elevation: number;
  wikidata_id: string;
  wikipedia: string;
  image: string;
  admin_hierarchy?: AdminHierarchy;
  user?: {
    completed: boolean;
    count: number;
    routes: Array<{
      id: number;
      name: string;
      date: string;
    }>;
  };
}

export interface PeakListDetailsResponse {
  list_id: number;
  list_name: string;
  description: string;
  primary_image: string | null;
  images: string[];
  peaks: PeakListDetailsPeak[];
  total_peaks: number;
  user_authenticated?: boolean;
  total_user_peaks?: number;
  message: string;
  user_name?: string;
  user_image?: string;
  is_private?: boolean;
  is_following?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  max_duration?: number | null;
  creator_id?: number | null;
  creator_name?: string | null;
  creator_image?: string | null;
  club_id?: number | null;
  club?: {
    id: number;
    name: string;
    image: string | null;
    visibility: ClubVisibility | null;
  } | null;
  /** @deprecated Use creator_id instead */
  created_by?: number | null;
}

export interface PeakListWithPeaks
  extends PeakListChallengeConstraints,
    PeakListCreatorInfo,
    PeakListClubInfo {
  list_id: number;
  list_name: string;
  description: string;
  num_peaks: number;
  primary_image: string | null;
  images: string[];
  user_completed: number;
  total_community_peaks?: number;
  user_authenticated?: boolean;
  is_following?: boolean;
  geojson?: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: {
        type: "Point";
        coordinates: [number, number];
      };
      properties: {
        id: number;
        name: string;
        elevation: number;
        completed: boolean;
      };
    }>;
  };
}

export interface ListPeaksGeoJSONResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: {
      id: number;
      name: string;
      elevation: number;
      completed: boolean;
      image?: string;
    };
  }>;
}

export interface PeakListsWithPeaksResponse {
  lists: PeakListWithPeaks[];
  all_peaks: number;
  total_lists: number;
  total_user_peaks?: number;
  total_community_peaks?: number;
  user_authenticated?: boolean;
  message: string;
}

export interface PeakMapData {
  id: number;
  name: string;
  name_en: string | null;
  elevation: number;
  admin_hierarchy?: AdminHierarchy;
  image_url: string | null;
  user_data?: {
    completed: boolean;
    ascent_count: number;
    routes: unknown[];
    route_names: string[];
    route_dates: string[];
  };
  user_authenticated?: boolean;
}

export interface UserPeaksWithGeoJSON {
  user_id: number;
  total_peaks: number;
  user_authenticated: boolean;
  geojson: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: {
        type: "Point";
        coordinates: [number, number];
      };
      properties: {
        id: number;
        name: string;
        name_en: string | null;
        elevation: number;
        completed: boolean;
      };
    }>;
  };
}

export interface UserPeaksWithGeoJSONResponse {
  geojson: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: {
        type: "Point";
        coordinates: [number, number];
      };
      properties: {
        id: number;
        name: string;
        name_en: string | null;
        elevation: number;
        completed: boolean;
      };
    }>;
  };
  total_peaks: number;
  message: string;
}

export interface CreatePeakListRequest {
  name: string;
  description: string;
  peak_ids: number[];
  is_private: boolean;
  club_id?: number | null;
  language?: string;
  image?: File;
  start_date?: string | null;
  end_date?: string | null;
  max_duration?: number | null;
}

export interface UpdatePeakListRequest {
  leading_list_id?: number | string;
  list_id: number;
  name?: string;
  description?: string;
  peak_ids?: number[];
  is_private?: boolean;
  club_id?: number | null;
  image?: File;
  start_date?: string | null;
  end_date?: string | null;
  max_duration?: number | null;
}

export interface DeletePeakListRequest {
  list_id: number;
}

// World Challenge Types
export interface WorldPeaksStats {
  total_peaks: number;
  community_peaks: number;
  user_peaks: number;
}

export interface RegionBoundary {
  osm_id: number;
  name: string;
  level: number;
  geojson: any;
}

export interface WorldPeaksGeoJSONResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: {
      id: number;
      name: string;
      elevation: number;
      completed: boolean;
    };
  }>;
}

export interface WorldChallengeStatsResponse {
  total_peaks: number;
  community_peaks: number;
  user_peaks: number;
}

export interface RegionBoundariesResponse {
  boundaries: RegionBoundary[];
}

// Peak Info & Ascension Types
export interface PeakAscension {
  route_id: number | null;
  route_name: string | null;
  route_date: string | null;
  is_manual: boolean | null;
  distance: number | null;
  elevation_gain: number | null;
  time: string | null;
  moving_time: string | null;
  route_url: string | null;
  device_model: string | null;
}

export interface UserPeakInfoResponse {
  peak: {
    id: number;
    name: string;
    name_en: string | null;
    lat: number;
    lng: number;
    elevation: number;
    image: string | null;
    admin_osm_id: string | null;
    admin_level: number | null;
    admin_hierarchy: string | null;
  };
  total_ascensions: number;
  ascensions: PeakAscension[];
  unlinked_count: number;
}

export interface LinkPeakAscensionResponse {
  success: boolean;
  linked_to: "route" | "manual_route";
  route_id: number;
  route_name: string;
  route_date: string;
  message: string;
}

export interface DeletePeakAscensionResponse {
  success: boolean;
  deleted: boolean;
  peak_removed: boolean;
  remaining_ascensions: number;
  message: string;
}
