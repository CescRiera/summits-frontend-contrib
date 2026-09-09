// Follows API Types

export interface FollowUserRequest {
  following_id: number;
}

export interface FollowUserResponse {
  success: boolean;
  message: string;
  status?: "pending" | "accepted" | "rejected";
  follow_id?: string;
}

export interface UnfollowUserRequest {
  following_id: number;
}

export interface UnfollowUserResponse {
  success: boolean;
  message: string;
}

export interface AcceptFollowRequestRequest {
  follower_id: number;
}

export interface AcceptFollowRequestResponse {
  success: boolean;
  message: string;
}

export interface RejectFollowRequestRequest {
  follower_id: number;
}

export interface RejectFollowRequestResponse {
  success: boolean;
  message: string;
}

export interface FollowUser {
  follower_id: number;
  following_id: number;
  status: "accepted" | "pending" | "rejected";
  created_at: string;
  updated_at: string;
  name: string;
  image: string;
  type: "wikiloc" | "strava" | "garmin" | "default";
  external_user_id: string;
}

export interface GetFollowersResponse {
  success: boolean;
  followers: FollowUser[];
  count: number;
}

export interface GetFollowingResponse {
  success: boolean;
  following: FollowUser[];
  count: number;
}

export interface GetPendingFollowRequestsResponse {
  success: boolean;
  pending_requests: FollowUser[];
  count: number;
}

export interface GetFollowCountsResponse {
  success: boolean;
  followers_count: number;
  following_count: number;
}

export interface IsFollowingResponse {
  success: boolean;
  is_following: boolean;
  is_pending: boolean;
  status: "accepted" | "pending" | "rejected" | null;
}

export interface FollowSuggestion {
  id: number;
  name: string;
  image: string;
  type: "wikiloc" | "strava" | "garmin" | "default";
  external_user_id: string;
  followers_count: number;
}

export interface GetFollowSuggestionsResponse {
  success: boolean;
  suggestions: FollowSuggestion[];
  count: number;
}

export interface FollowsQueryParams {
  status?: "accepted" | "pending" | "rejected";
  limit?: number;
  offset?: number;
}
