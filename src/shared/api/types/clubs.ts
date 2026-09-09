import type { AdminHierarchy, PaginationResponse } from "./common";

export type ClubVisibility = "public" | "private";
export type ClubMembershipStatus = "accepted" | "pending" | "rejected";
export type ClubRole = "creator" | "member";

export type ClubBrowseSortBy =
  | "most_users"
  | "most_peaks"
  | "newest"
  | "oldest";

export type ClubMembersSortBy =
  | "most_peaks"
  | "recent_activity"
  | "joined_at"
  | "name";

export type ClubLeaderboardMetric =
  | "distinct_peaks"
  | "total_ascents"
  | "highest_peak"
  | "recent_distinct_peaks";

export type ClubPeriodSummarySortBy =
  | "distinct_peaks"
  | "total_ascents"
  | "total_elevation_gain"
  | "total_routes"
  | "total_distance_km"
  | "total_time_seconds"
  | "total_moving_time_seconds"
  | "active_days";

export type ClubActivityFilter = "all_routes" | "with_peaks";

export type ClubsLeaderboardSortBy =
  | "most_users"
  | "most_peaks"
  | "most_active_last_30d"
  | "newest"
  | "most_distance"
  | "most_elevation"
  | "most_time";

export interface ClubCreator {
  id: number;
  name: string | null;
  image: string | null;
}

export interface ClubMembership {
  status: ClubMembershipStatus;
  role: ClubRole;
  requested_at: string | null;
  joined_at: string | null;
  responded_at: string | null;
}

export interface ClubSummary {
  id: number;
  name: string;
  description: string;
  image: string | null;
  visibility: ClubVisibility;
  created_at: string;
  updated_at: string | null;
  creator: ClubCreator;
  member_count: number;
  distinct_peak_count?: number;
  total_distance_km?: number;
  total_elevation_gain?: number;
  total_moving_time?: number;
  membership: ClubMembership | null;
  is_creator: boolean | null;
  restricted: boolean;
  admin_hierarchy?: AdminHierarchy;
}

export type ClubDetails = ClubSummary;

export interface ClubStatsTopMember {
  user_id: number;
  user_name: string;
  user_image: string | null;
  distinct_peak_count: number;
}

export interface ClubStats {
  member_count: number;
  distinct_peak_count: number;
  total_ascents: number;
  active_members_30d: number;
  top_member: ClubStatsTopMember | null;
}

export interface ClubChallengeItem {
  list_id: number;
  name?: string | null;
  list_name?: string | null;
  description: string;
  primary_image: string | null;
  images: string[];
  creator_id?: number | null;
  creator_name?: string | null;
  creator_image?: string | null;
  club_id?: number | null;
  club_name?: string | null;
  club_image?: string | null;
  club_visibility?: ClubVisibility | null;
  has_club_access?: boolean;
  is_private?: boolean;
  is_following?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  max_duration?: number | null;
  total_peaks?: number;
  user_completed?: number;
}

export interface ClubDetailsResponse {
  club: ClubDetails;
  challenges?: ClubChallengeItem[];
  stats: ClubStats | null;
}

export interface ClubMember {
  user_id: number;
  user_name: string;
  user_image: string | null;
  role: ClubRole;
  joined_at: string | null;
  distinct_peak_count: number;
  highest_peak_elevation: number | null;
  recent_activity_at: string | null;
}

export interface ClubPendingRequest {
  user_id: number;
  user_name: string;
  user_image: string | null;
  requested_at: string | null;
}

export interface ClubLeaderboardRow {
  rank: number;
  user_id: number;
  user_name: string;
  user_image: string | null;
  role: ClubRole;
  joined_at: string | null;
  distinct_peak_count: number;
  total_ascents: number;
  highest_peak_elevation: number | null;
  recent_activity_at: string | null;
  recent_distinct_peak_count: number;
}

export interface ClubActivityItem {
  route_id: number;
  route_name: string;
  activity_date: string;
  distance: number;
  elevation_gain: number;
  time_seconds: number;
  moving_time_seconds: number;
  route_image?: string | null;
  user: {
    id: number;
    name: string;
    image: string | null;
  };
  peaks: Array<{
    id: number;
    name: string;
    name_en: string | null;
    elevation: number;
    image: string | null;
    lat: number;
    lng: number;
  }>;
  coordinates?: {
    type: "LineString";
    coordinates: [number, number][];
  };
}

export interface ClubPeriodSummaryTopMember {
  user_id: number;
  user_name: string;
  user_image: string | null;
  distinct_peaks: number;
  total_elevation_gain: number;
  total_routes: number;
}

export interface ClubPeriodSummaryMetrics {
  member_count: number;
  active_members: number;
  total_routes: number;
  distinct_peaks: number;
  total_ascents: number;
  total_distance_km: number;
  total_elevation_gain: number;
  total_time_seconds: number;
  total_moving_time_seconds: number;
  active_days: number;
  highest_peak_elevation: number | null;
  top_member: ClubPeriodSummaryTopMember | null;
}

export interface ClubPeriodMember {
  rank: number;
  user_id: number;
  user_name: string;
  user_image: string | null;
  role: ClubRole;
  joined_at: string | null;
  distinct_peaks: number;
  total_ascents: number;
  highest_peak_elevation: number | null;
  total_routes: number;
  total_distance_km: number;
  total_elevation_gain: number;
  total_time_seconds: number;
  total_moving_time_seconds: number;
  active_days: number;
  recent_activity_at: string | null;
}

export interface ClubPeriodSummaryCategory {
  id: number;
  name: string;
}

export interface ClubCollectionResponse {
  clubs: ClubSummary[];
  total: number;
  total_count: number;
  total_countries?: number;
  has_more: boolean;
  pagination: PaginationResponse;
}

export interface ClubMembersResponse {
  members: ClubMember[];
  total: number;
  total_count: number;
  has_more: boolean;
  pagination: PaginationResponse;
}

export interface ClubPendingRequestsResponse {
  requests: ClubPendingRequest[];
  total: number;
  total_count: number;
  has_more: boolean;
  pagination: PaginationResponse;
}

export interface ClubLeaderboardResponse {
  leaderboard: ClubLeaderboardRow[];
  total: number;
  total_count: number;
  has_more: boolean;
  pagination: PaginationResponse;
}

export interface ClubActivityResponse {
  activity: ClubActivityItem[];
  total: number;
  total_count: number;
  has_more: boolean;
  pagination: PaginationResponse;
  filter?: ClubActivityFilter;
}

export interface ClubPeriodSummaryResponse {
  club_id: number;
  date_from: string | null;
  date_to: string | null;
  sort_by: ClubPeriodSummarySortBy;
  categories?: ClubPeriodSummaryCategory[];
  summary: ClubPeriodSummaryMetrics;
  members: ClubPeriodMember[];
  total: number;
  total_count: number;
  has_more: boolean;
  pagination: PaginationResponse;
}

export interface GetMyClubsResponse {
  clubs?: ClubSummary[];
  created_clubs?: ClubSummary[];
  joined_clubs?: ClubSummary[];
  pending_clubs?: ClubSummary[];
}

export interface ClubSearchResult extends ClubSummary {
  type: "club";
  relevance_score: number;
}

export interface ClubsBrowseRequest {
  visibility?: ClubVisibility;
  search?: string;
  sort_by?: ClubBrowseSortBy;
  admin_osm_ids?: number[];
  limit?: number;
  offset?: number;
}

export interface ClubsLeaderboardRequest {
  visibility?: ClubVisibility;
  sort_by?: ClubsLeaderboardSortBy;
  admin_osm_ids?: number[];
  date_from?: string | null;
  date_to?: string | null;
  limit?: number;
  offset?: number;
}

export interface ClubMembersRequest {
  club_id: number;
  search?: string;
  sort_by?: ClubMembersSortBy;
  limit?: number;
  offset?: number;
}

export interface ClubLeaderboardRequest {
  club_id: number;
  metric?: ClubLeaderboardMetric;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface ClubActivityRequest {
  club_id: number;
  filter?: ClubActivityFilter;
  limit?: number;
  offset?: number;
}

export interface ClubPeriodSummaryRequest {
  club_id: number;
  date_from: string | null;
  date_to: string | null;
  sort_by?: ClubPeriodSummarySortBy;
  category_id?: number | null;
  only_with_peaks?: boolean;
  limit?: number;
  offset?: number;
}

export interface ClubPendingRequestsRequest {
  club_id: number;
  limit?: number;
  offset?: number;
}

export interface CreateClubRequest {
  name: string;
  description: string;
  visibility: ClubVisibility;
  image: File;
  admin_osm_id?: number | string;
  admin_level?: number | string;
}

export interface UpdateClubRequest {
  club_id: number;
  name?: string;
  description?: string;
  visibility?: ClubVisibility;
  image?: File;
  admin_osm_id?: number | string | null;
  admin_level?: number | string | null;
}
