import { api, ensureAuth } from "../client";
import type {
  FollowUserRequest,
  FollowUserResponse,
  UnfollowUserRequest,
  UnfollowUserResponse,
  AcceptFollowRequestRequest,
  AcceptFollowRequestResponse,
  RejectFollowRequestRequest,
  RejectFollowRequestResponse,
  GetFollowersResponse,
  GetFollowingResponse,
  GetPendingFollowRequestsResponse,
  GetFollowCountsResponse,
  IsFollowingResponse,
  GetFollowSuggestionsResponse,
  FollowsQueryParams,
} from "../types";

// Follow a user
export const followUser = async (
  params: FollowUserRequest
): Promise<FollowUserResponse> => {
  await ensureAuth();
  const response = await api.post("/api/follows/followUser", params);
  return response.data;
};

// Unfollow a user
export const unfollowUser = async (
  params: UnfollowUserRequest
): Promise<UnfollowUserResponse> => {
  await ensureAuth();
  const response = await api.post("/api/follows/unfollowUser", params);
  return response.data;
};

// Accept follow request
export const acceptFollowRequest = async (
  params: AcceptFollowRequestRequest
): Promise<AcceptFollowRequestResponse> => {
  await ensureAuth();
  const response = await api.post("/api/follows/acceptFollowRequest", params);
  return response.data;
};

// Reject follow request
export const rejectFollowRequest = async (
  params: RejectFollowRequestRequest
): Promise<RejectFollowRequestResponse> => {
  await ensureAuth();
  const response = await api.post("/api/follows/rejectFollowRequest", params);
  return response.data;
};

// Get followers
export const getFollowers = async (
  params: FollowsQueryParams & { user_id?: number } = {}
): Promise<GetFollowersResponse> => {
  // Auth is optional for this endpoint
  try {
    await ensureAuth();
  } catch {
    // Proceed without auth if it fails
  }
  const response = await api.post("/api/follows/getFollowers", params);
  return response.data;
};

// Get following
export const getFollowing = async (
  params: FollowsQueryParams & { user_id?: number } = {}
): Promise<GetFollowingResponse> => {
  // Auth is optional for this endpoint
  try {
    await ensureAuth();
  } catch {
    // Proceed without auth if it fails
  }
  const response = await api.post("/api/follows/getFollowing", params);
  return response.data;
};

// Get pending follow requests
export const getPendingFollowRequests = async (
  params: Omit<FollowsQueryParams, "status"> = {}
): Promise<GetPendingFollowRequestsResponse> => {
  await ensureAuth();
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.append("limit", params.limit.toString());
  if (params.offset) queryParams.append("offset", params.offset.toString());

  const queryString = queryParams.toString();
  const url = `/api/follows/getPendingFollowRequests${
    queryString ? `?${queryString}` : ""
  }`;

  const response = await api.get(url);
  return response.data;
};

// Get follow counts
export const getFollowCounts = async (params: {
  user_id: number;
}): Promise<GetFollowCountsResponse> => {
  try {
    await ensureAuth();
  } catch {
    // Proceed without auth if it fails
  }
  const response = await api.post("/api/follows/getFollowCounts", params);
  return response.data;
};

// Check if following a user
export const isFollowing = async (params: {
  user_id: number;
}): Promise<IsFollowingResponse> => {
  await ensureAuth();
  const response = await api.get(`/api/follows/isFollowing/${params.user_id}`);

  return response.data;
};

// Get follow suggestions
export const getFollowSuggestions = async (
  limit: number = 10
): Promise<GetFollowSuggestionsResponse> => {
  await ensureAuth();
  const response = await api.get(
    `/api/follows/getFollowSuggestions?limit=${limit}`
  );
  return response.data;
};

// Toggle privacy setting
export const togglePrivacy = async (): Promise<{
  success: boolean;
  message: string;
  is_private: boolean;
}> => {
  await ensureAuth();
  const response = await api.post<{
    success: boolean;
    message: string;
    is_private: boolean;
  }>("/api/follows/togglePrivacy");
  return response.data;
};
