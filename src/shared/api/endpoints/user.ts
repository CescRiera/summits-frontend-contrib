import { api, getLanguage, ensureAuth } from "../client";
import type {
  UserDetails,
  InternalUserIdResponse,
  UserSavedPeaksRequest,
  UserSavedPeaksResponse,
  UserSavedSheltersRequest,
  UserSavedSheltersResponse,
  UserStatsResponse,
  StatsGraphResponse,
  CommunityPeaksResponse,
  CommunityUsersResponse,
  RecentCommunityPeaksResponse,
  RecentFollowingPeaksResponse,
  RecentFollowingRoutesResponse,
  ActivityCategoriesResponse,
  RealtimeSearchResponse,
  AdminSearchResponse,
} from "../types";

// User authentication and details
export const getUserDetails = async (): Promise<UserDetails> => {
  await ensureAuth();
  const response = await api.get("/api/user-data/getUserDetails");
  return response.data;
};

export const getInternalUserId = async (): Promise<InternalUserIdResponse> => {
  await ensureAuth();
  const response = await api.get("/api/user-data/getInternalUserId");
  return response.data;
};

// User peaks
export const getUserHasPeaks = async (): Promise<{ hasPeaks: boolean }> => {
  await ensureAuth();
  const response = await api.post("/api/user-data/getUserHasPeaks", {});
  return response.data;
};

export const getUserSavedPeaks = async (
  params: UserSavedPeaksRequest = {},
): Promise<UserSavedPeaksResponse> => {
  await ensureAuth();
  const language = getLanguage();
  const response = await api.post("/api/user-data/getUserSavedPeaks", {
    ...params,
    language: params.language || language,
  });
  return response.data;
};

// User statistics
export const getUserStats = async (
  userId?: string,
  admin_osm_ids?: number[],
): Promise<UserStatsResponse> => {
  const language = getLanguage();
  const response = await api.post("/api/user-data/getUserStats", {
    ...(userId && { userId }),
    language,
    ...(admin_osm_ids && admin_osm_ids.length > 0 && { admin_osm_ids }),
  });
  console.log("ewew21312q", response.data);
  return response.data;
};

export const getStatsGraph = async (
  userId?: string,
): Promise<StatsGraphResponse> => {
  const language = getLanguage();
  const response = await api.post("/api/user-data/getStatsGraph", {
    ...(userId && { userId }),
    language,
  });
  return response.data;
};

// Community data
export const getHighestCommunityPeaks = async (
  limit: number = 20,
  offset: number = 0,
  admin_osm_ids?: number[],
): Promise<CommunityPeaksResponse> => {
  const response = await api.post("/api/user-data/getHighestCommunityPeaks", {
    limit,
    offset,
    ...(admin_osm_ids && admin_osm_ids.length > 0 && { admin_osm_ids }),
  });
  return response.data;
};

export const getHighestCommunityUsers = async (
  params: {
    limit?: number;
    offset?: number;
    category_id?: number | null;
    sort_by?: string;
    admin_osm_ids?: number[];
  } = {},
): Promise<CommunityUsersResponse> => {
  const {
    limit = 20,
    offset = 0,
    category_id,
    sort_by = "total_distance_km",
    admin_osm_ids,
  } = params;

  const response = await api.post("/api/user-data/getHighestCommunityUsers", {
    limit,
    offset,
    category_id,
    sort_by,
    ...(admin_osm_ids && admin_osm_ids.length > 0 && { admin_osm_ids }),
  });
  console.log("ewewq", response.data);
  return response.data;
};



export const getHighestCommunityListUsers = async (
  listId: number,
  limit?: number,
  offset?: number,
) => {
  const response = await api.post(
    "/api/user-data/getHighestCommunityUsersList",
    {
      list_id: listId,
      limit,
      offset,
    },
  );
  console.log("ewew111q", response.data);
  return response.data;
};

export const getRecentCommunityPeaks =
  async (): Promise<RecentCommunityPeaksResponse> => {
    const response = await api.get("/api/user-data/getRecentCommunityPeaks");
    console.log("respoAAAnse", response.data)
    return response.data;
  };

// Following endpoints
export const getRecentFollowingPeaks =
  async (): Promise<RecentFollowingPeaksResponse> => {
    await ensureAuth();
    const response = await api.get("/api/user-data/getRecentFollowingPeaks");
    return response.data;
  };

export const getRecentFollowingRoutes =
  async (): Promise<RecentFollowingRoutesResponse> => {
    await ensureAuth();
    const response = await api.get("/api/user-data/getRecentFollowingRoutes");
    return response.data;
  };

export const getRecentUserPeaks =
  async (): Promise<RecentFollowingPeaksResponse> => {
    await ensureAuth();
    const response = await api.get("/api/user-data/getRecentUserPeaks");
    return response.data;
  };

export const getRecentUserRoutes =
  async (): Promise<RecentFollowingRoutesResponse> => {
    await ensureAuth();
    const response = await api.get("/api/user-data/getRecentUserRoutes");
    return response.data;
  };

// Activity categories
export const getCategories = async (): Promise<ActivityCategoriesResponse> => {
  const language = getLanguage();
  const response = await api.post("/api/user-data/getCategories", {
    language,
  });
  return response.data;
};

// Search
export const searchUsers = async (query: string) => {
  const response = await api.post("/api/search/searchUsers", { query });
  return response.data;
};

export const searchRealtime = async (
  q: string,
): Promise<RealtimeSearchResponse> => {
  const response = await api.post("/api/search/searchRealTime", {
    q,
  });

  return response.data;
};

export const searchAdmin = async (
  q: string,
  limit: number = 20
): Promise<AdminSearchResponse> => {
  const response = await api.post("/api/search/searchAdmin", {
    q,
    limit,
  });

  return response.data;
};

// User preferences
export const setLanguage = async (language: string) => {
  await ensureAuth();
  const response = await api.post("/api/user-data/setLanguage", { language });
  return response.data;
};

// Peak saving
export const savePeak = async (peakId: number) => {
  await ensureAuth();
  const response = await api.post("/api/user-data/savePeak", {
    peak_id: peakId,
  });
  return response.data;
};

export const unsavePeak = async (peakId: number) => {
  await ensureAuth();
  const response = await api.post("/api/user-data/unsavePeak", {
    peak_id: peakId,
  });
  return response.data;
};

// Shelter saving
export const saveShelter = async (shelterId: number) => {
  await ensureAuth();
  const response = await api.post("/api/user-data/saveShelter", {
    shelter_id: shelterId,
  });
  return response.data;
};

export const unsaveShelter = async (shelterId: number) => {
  await ensureAuth();
  const response = await api.post("/api/user-data/unsaveShelter", {
    shelter_id: shelterId,
  });
  return response.data;
};

export const getUserSavedShelters = async (
  params: UserSavedSheltersRequest = {},
): Promise<UserSavedSheltersResponse> => {
  await ensureAuth();
  const language = getLanguage();
  const response = await api.post("/api/user-data/getUserSavedShelters", {
    ...params,
    language: params.language || language,
  });
  return response.data;
};

// Add manual peaks
export const addManualPeaks = async (
  peaks: Array<{
    peak_id: number;
    route_id: number | null;
    date?: string | null; // YYYY-MM-DD for manual route creation
  }>,
) => {
  await ensureAuth();
  const response = await api.post("/api/user-data/addManualPeaks", {
    peaks,
  });
  return response.data;
};

// Authentication
// Email existence check
export const emailExists = async (
  email: string,
): Promise<{ exists: boolean }> => {
  const response = await api.post("/api/auth/emailExists", { email });
  return response.data;
};

export const login = async (email: string, password: string) => {
  const response = await api.post("/api/auth/login", { email, password });
  return response.data;
};

export const register = async (
  email: string,
  password: string,
  type: "wikiloc" | "strava" | "garmin" | "default",
  externalUserId?: string,
  options?: {
    externalUsername?: string;
    name?: string;
    image?: string;
    language?: string;
    notifications_enabled?: boolean;
  },
) => {
  if (type !== "default" && !externalUserId) {
    throw new Error("externalUserId is required for provider registrations");
  }
  const language =
    options?.language || localStorage.getItem("language") || "en";
  const payload: Record<string, unknown> = {
    email,
    password,
    type,
    language,
  };
  if (externalUserId) payload["externalUserId"] = externalUserId;
  if (options?.externalUsername)
    payload["externalUsername"] = options.externalUsername;
  if (options?.name) payload["name"] = options.name;
  if (options?.image) payload["image"] = options.image;
  if (typeof options?.notifications_enabled === "boolean")
    payload["notifications_enabled"] = options.notifications_enabled;

  const response = await api.post("/api/auth/register", payload);
  return response.data;
};

export const logout = async () => {
  await api.post("/api/auth/logout");
};

// Contact developer
export const contactDeveloper = async (params: {
  email: string;
  subject: string;
  text: string;
  language?: string;
}) => {
  const payload = {
    ...params,
  };
  const response = await api.post("/api/auth/contactDeveloper", payload);
  return response.data;
};

// Delete account
export const deleteAccount = async () => {
  await ensureAuth();
  const response = await api.delete("/api/auth/deleteAccount");
  return response.data;
};

// User highest peaks and routes
export const getHighestUserPeaks = async (userId?: string) => {
  const language = getLanguage();
  const response = await api.post("/api/user-data/getHighestUserPeaks", {
    ...(userId && { userId }),
    language,
  });
  return response.data;
};

export const getHighestUserRoutes = async (userId?: string) => {
  const language = getLanguage();
  const response = await api.post("/api/user-data/getHighestUserRoutes", {
    ...(userId && { userId }),
    language,
  });
  return response.data;
};

// Email verification
export const verifyEmail = async (
  email: string,
  code: string,
): Promise<void> => {
  await api.post("/api/auth/verify-email", {
    email,
    code,
  });
  // If we get here without throwing, it's a 200 response = success
};

// Resend verification code
export const resendVerificationCode = async (
  email: string,
): Promise<{ message: string }> => {
  const response = await api.post("/api/auth/resend-verification-code", {
    email,
  });
  return response.data;
};

// Forgot password
export const forgotPassword = async (
  email: string,
  language?: string,
): Promise<{ success: boolean; message?: string }> => {
  const lang = language || getLanguage();
  const response = await api.post("/api/auth/forgot-password", {
    email,
    language: lang,
  });
  return response.data;
};

// Reset password
export const resetPassword = async (
  email: string,
  code: string,
  newPassword: string,
): Promise<{ success: boolean; message?: string; error?: string }> => {
  const response = await api.post("/api/auth/reset-password", {
    email,
    code,
    newPassword,
  });
  return response.data;
};

// Resend password reset code
export const resendPasswordResetCode = async (
  email: string,
): Promise<{ message: string }> => {
  const response = await api.post("/api/auth/resend-password-reset-code", {
    email,
  });
  return response.data;
};

// Update profile image
export const updateProfileImage = async (
  imageFile: File,
): Promise<{
  success: boolean;
  image_url?: string;
  error?: string;
  message?: string;
}> => {
  await ensureAuth();
  const formData = new FormData();
  formData.append("image", imageFile);
  const response = await api.post(
    "/api/user-data/uploadProfileImage",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};

/**
 * Delete a manually added peak from user's profile
 * @param peakId ID of the peak to delete
 */
export const deleteManualPeak = async (
  peakId: number,
): Promise<{
  success: boolean;
  deleted_peak: {
    user_id: number;
    peak_id: number;
  };
  message: string;
}> => {
  await ensureAuth();
  const response = await api.delete(`/api/user-data/deletePeak/${peakId}`);
  return response.data;
};

/**
 * Update user's name
 * @param name New name for the user
 */
export const updateUserName = async (
  name: string,
): Promise<{
  success: boolean;
  name: string;
  message: string;
}> => {
  await ensureAuth();
  const response = await api.post("/api/user-data/updateUserName", { name });
  return response.data;
};

/**
 * Link an unlinked peak ascension to a date or existing route
 * @param peakId ID of the peak
 * @param options Either { routeId } or { date }
 */
export const linkPeakAscension = async (
  peakId: number,
  options: { routeId: number; oldRouteId?: number } | { date: string; oldRouteId?: number },
): Promise<{
  success: boolean;
  linked_to: "route" | "manual_route";
  route_id: number;
  route_name: string;
  route_date: string;
  message: string;
}> => {
  await ensureAuth();
  const body: Record<string, unknown> = { peak_id: peakId };
  if ("routeId" in options) {
    body["route_id"] = options.routeId;
  } else {
    body["date"] = options.date;
  }
  if (options.oldRouteId != null) {
    body["old_route_id"] = options.oldRouteId;
  }
  const response = await api.post("/api/user-data/linkPeakAscension", body);
  return response.data;
};

/**
 * Delete a peak ascension or the entire peak
 * @param peakId ID of the peak
 * @param routeId Optional route ID to delete a specific ascension
 */
export const deletePeakAscension = async (
  peakId: number,
  routeId?: number,
): Promise<{
  success: boolean;
  deleted: boolean;
  peak_removed: boolean;
  remaining_ascensions: number;
  message: string;
}> => {
  await ensureAuth();
  const params = routeId != null ? `?route_id=${routeId}` : "";
  const response = await api.delete(
    `/api/user-data/deletePeak/${peakId}${params}`,
  );
  return response.data;
};
