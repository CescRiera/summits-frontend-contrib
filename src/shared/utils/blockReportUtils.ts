/**
 * Utility functions for managing blocked users and reported content
 * Uses API when user is logged in, localStorage when not logged in
 */

import {
  blockUser as apiBlockUser,
  unblockUser as apiUnblockUser,
  getBlockedUsers as apiGetBlockedUsers,
  reportContent as apiReportContent,
} from "../api/endpoints/blockReport";
import { getAuthToken } from "../../mobile/sessionToken";

const BLOCKED_USERS_KEY = "cims_blocked_users";
const REPORTED_CONTENT_KEY = "cims_reported_content";

export interface BlockedUser {
  userId: number;
  userName: string;
  blockedAt: string;
}

export interface ReportedContent {
  contentId: number;
  contentType: "route" | "user"; // Routes and users can be reported
  userId: number;
  reportedAt: string;
  reason?: string;
}

/**
 * Check if user is logged in by checking for auth token
 */
const isLoggedIn = (): boolean => {
  const token = getAuthToken();
  return token !== null && token !== undefined && token !== "";
};

/**
 * Get all blocked users (from API if logged in, localStorage if not)
 */
export const getBlockedUsers = async (): Promise<BlockedUser[]> => {
  if (isLoggedIn()) {
    try {
      const response = await apiGetBlockedUsers();
      return response.blocked_users.map((u) => ({
        userId: u.user_id,
        userName: u.user_name,
        blockedAt: u.blocked_at,
      }));
    } catch (error) {
      console.error("Error fetching blocked users from API:", error);
      // Fallback to localStorage on error
      return getBlockedUsersLocal();
    }
  }
  return getBlockedUsersLocal();
};

/**
 * Get blocked users from localStorage
 */
const getBlockedUsersLocal = (): BlockedUser[] => {
  try {
    const stored = localStorage.getItem(BLOCKED_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading blocked users from localStorage:", error);
    return [];
  }
};

/**
 * Check if a user is blocked (synchronous check using localStorage cache)
 * For async check, use getBlockedUsers() and check the result
 */
export const isUserBlocked = (userId: number): boolean => {
  const blockedUsers = getBlockedUsersLocal();
  return blockedUsers.some((user) => user.userId === userId);
};

/**
 * Check if a user is blocked (async, checks API if logged in)
 */
export const isUserBlockedAsync = async (userId: number): Promise<boolean> => {
  const blockedUsers = await getBlockedUsers();
  return blockedUsers.some((user) => user.userId === userId);
};

/**
 * Block a user (uses API if logged in, localStorage if not)
 */
export const blockUser = async (
  userId: number,
  userName: string
): Promise<void> => {
  if (isLoggedIn()) {
    try {
      await apiBlockUser({ user_id: userId });
      // Also update localStorage as cache
      blockUserLocal(userId, userName);
    } catch (error) {
      console.error("Error blocking user via API:", error);
      // Fallback to localStorage on error
      blockUserLocal(userId, userName);
    }
  } else {
    blockUserLocal(userId, userName);
  }
};

/**
 * Block a user in localStorage
 */
const blockUserLocal = (userId: number, userName: string): void => {
  try {
    const blockedUsers = getBlockedUsersLocal();
    if (!blockedUsers.some((user) => user.userId === userId)) {
      blockedUsers.push({
        userId,
        userName,
        blockedAt: new Date().toISOString(),
      });
      localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(blockedUsers));
    }
  } catch (error) {
    console.error("Error blocking user in localStorage:", error);
  }
};

/**
 * Unblock a user (uses API if logged in, localStorage if not)
 */
export const unblockUser = async (userId: number): Promise<void> => {
  if (isLoggedIn()) {
    try {
      await apiUnblockUser({ user_id: userId });
      // Also update localStorage as cache
      unblockUserLocal(userId);
    } catch (error) {
      console.error("Error unblocking user via API:", error);
      // Fallback to localStorage on error
      unblockUserLocal(userId);
    }
  } else {
    unblockUserLocal(userId);
  }
};

/**
 * Unblock a user in localStorage
 */
const unblockUserLocal = (userId: number): void => {
  try {
    const blockedUsers = getBlockedUsersLocal();
    const filtered = blockedUsers.filter((user) => user.userId !== userId);
    localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error unblocking user in localStorage:", error);
  }
};

/**
 * Get all reported content from localStorage
 */
export const getReportedContent = (): ReportedContent[] => {
  try {
    const stored = localStorage.getItem(REPORTED_CONTENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading reported content:", error);
    return [];
  }
};

/**
 * Report content (routes or users can be reported)
 * Works for both logged in and anonymous users
 */
export const reportContent = async (
  contentId: number,
  contentType: "route" | "user",
  userId: number,
  reason?: string
): Promise<void> => {
  // Always try API first (it accepts anonymous reports)
  try {
    const request: {
      content_id: number;
      content_type: "route" | "user";
      user_id: number;
      reason?: string;
    } = {
      content_id: contentId,
      content_type: contentType,
      user_id: userId,
    };
    if (reason !== undefined) {
      request.reason = reason;
    }
    await apiReportContent(request);
    // Also store in localStorage as cache/backup
    reportContentLocal(contentId, contentType, userId, reason);
  } catch (error) {
    console.error("Error reporting content via API:", error);
    // Fallback to localStorage on error (works for anonymous users)
    reportContentLocal(contentId, contentType, userId, reason);
  }
};

/**
 * Report content in localStorage (routes or users)
 */
const reportContentLocal = (
  contentId: number,
  contentType: "route" | "user",
  userId: number,
  reason?: string
): void => {
  try {
    const reportedContent = getReportedContent();
    if (
      !reportedContent.some(
        (item) =>
          item.contentId === contentId &&
          item.contentType === contentType &&
          item.userId === userId
      )
    ) {
      const content: {
        contentId: number;
        contentType: "route" | "user";
        userId: number;
        reportedAt: string;
        reason?: string;
      } = {
        contentId,
        contentType,
        userId,
        reportedAt: new Date().toISOString(),
      };
      if (reason !== undefined) {
        content.reason = reason;
      }
      reportedContent.push(content);
      localStorage.setItem(
        REPORTED_CONTENT_KEY,
        JSON.stringify(reportedContent)
      );
    }
  } catch (error) {
    console.error("Error reporting content in localStorage:", error);
  }
};

/**
 * Check if content is reported (routes or users)
 */
export const isContentReported = (
  contentId: number,
  contentType: "route" | "user",
  userId: number
): boolean => {
  const reportedContent = getReportedContent();
  return reportedContent.some(
    (item) =>
      item.contentId === contentId &&
      item.contentType === contentType &&
      item.userId === userId
  );
};

/**
 * Filter out blocked users from an array of items with user property (async)
 */
export const filterBlockedUsers = async <T extends { user: { id: number } }>(
  items: T[]
): Promise<T[]> => {
  const blockedUsers = await getBlockedUsers();
  const blockedUserIds = new Set(blockedUsers.map((u) => u.userId));
  return items.filter((item) => !blockedUserIds.has(item.user.id));
};

/**
 * Filter out blocked users synchronously (uses localStorage cache)
 */
export const filterBlockedUsersSync = <T extends { user: { id: number } }>(
  items: T[]
): T[] => {
  const blockedUsers = getBlockedUsersLocal();
  const blockedUserIds = new Set(blockedUsers.map((u) => u.userId));
  return items.filter((item) => !blockedUserIds.has(item.user.id));
};

/**
 * Get user display info (name and image), showing "Blocked User" if blocked
 * @param getTranslation Optional function to get translated "Blocked User" text
 */
export const getUserDisplayInfo = (
  userId: number,
  userName: string,
  userImage: string | null | undefined,
  getTranslation?: (key: string) => string
): { name: string; image: string | null } => {
  if (isUserBlocked(userId)) {
    return {
      name: getTranslation
        ? getTranslation("reportBlock.blockedUser")
        : "Blocked User",
      image: null,
    };
  }
  return {
    name: userName,
    image: userImage || null,
  };
};

