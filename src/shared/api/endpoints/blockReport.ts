import { api, ensureAuth } from "../client";

export interface BlockUserRequest {
  user_id: number;
}

export interface BlockUserResponse {
  success: boolean;
  message?: string;
}

export interface UnblockUserRequest {
  user_id: number;
}

export interface UnblockUserResponse {
  success: boolean;
  message?: string;
}

export interface GetBlockedUsersResponse {
  blocked_users: Array<{
    user_id: number;
    user_name: string;
    blocked_at: string;
  }>;
}

export interface ReportContentRequest {
  content_id: number;
  content_type: "route" | "user"; // Routes and users can be reported
  user_id: number;
  reason?: string;
}

export interface ReportContentResponse {
  success: boolean;
  message?: string;
}

// Block a user (requires authentication)
export const blockUser = async (
  params: BlockUserRequest
): Promise<BlockUserResponse> => {
  await ensureAuth();
  const response = await api.post("/api/user/block", params);
  return response.data;
};

// Unblock a user (requires authentication)
export const unblockUser = async (
  params: UnblockUserRequest
): Promise<UnblockUserResponse> => {
  await ensureAuth();
  const response = await api.post("/api/user/unblock", params);
  return response.data;
};

// Get blocked users (requires authentication)
export const getBlockedUsers = async (): Promise<GetBlockedUsersResponse> => {
  await ensureAuth();
  const response = await api.get("/api/user/blocked");
  return response.data;
};

// Report content (works without authentication - can be anonymous)
export const reportContent = async (
  params: ReportContentRequest
): Promise<ReportContentResponse> => {
  // Try API if user is logged in, otherwise will fall back to localStorage in utility
  try {
    const response = await api.post("/api/content/report", params);
    return response.data;
  } catch (error: any) {
    // If 401/403, user is not authenticated - that's okay for reporting
    // The utility function will handle localStorage fallback
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      throw error; // Let utility handle the fallback
    }
    throw error;
  }
};

