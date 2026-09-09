import { api, ensureAuth } from "../client";
import type {
  ClubActivityRequest,
  ClubActivityResponse,
  ClubCollectionResponse,
  ClubDetailsResponse,
  ClubLeaderboardRequest,
  ClubLeaderboardResponse,
  ClubMembersRequest,
  ClubMembersResponse,
  ClubPendingRequestsRequest,
  ClubPendingRequestsResponse,
  ClubPeriodSummaryRequest,
  ClubPeriodSummaryResponse,
  ClubsBrowseRequest,
  ClubsLeaderboardRequest,
  CreateClubRequest,
  GetMyClubsResponse,
  UpdateClubRequest,
} from "../types/clubs";

const appendFormValue = (
  formData: FormData,
  key: string,
  value: string | number | null | undefined
) => {
  if (value === undefined) return;
  if (value === null) {
    formData.append(key, "");
    return;
  }
  formData.append(key, String(value));
};

export const createClub = async (
  data: CreateClubRequest
): Promise<{
  success: boolean;
  club: ClubDetailsResponse["club"];
  message: string;
}> => {
  await ensureAuth();
  const formData = new FormData();
  formData.append("name", data.name);
  formData.append("description", data.description);
  formData.append("visibility", data.visibility);
  formData.append("image", data.image);
  if (data.admin_osm_id !== undefined) {
    formData.append("admin_osm_id", String(data.admin_osm_id));
  }
  if (data.admin_level !== undefined) {
    formData.append("admin_level", String(data.admin_level));
  }

  const response = await api.post("/api/clubs/createClub", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const updateClub = async (
  data: UpdateClubRequest
): Promise<{
  success: boolean;
  club?: ClubDetailsResponse["club"];
  message: string;
}> => {
  await ensureAuth();
  const formData = new FormData();
  formData.append("club_id", String(data.club_id));
  appendFormValue(formData, "name", data.name);
  appendFormValue(formData, "description", data.description);
  appendFormValue(formData, "visibility", data.visibility);
  if (data.image) {
    formData.append("image", data.image);
  }
  appendFormValue(formData, "admin_osm_id", data.admin_osm_id);
  appendFormValue(formData, "admin_level", data.admin_level);

  const response = await api.post("/api/clubs/updateClub", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const deleteClub = async (
  clubId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  const response = await api.post("/api/clubs/deleteClub", {
    club_id: clubId,
  });
  return response.data;
};

export const getClubDetails = async (
  clubId: number
): Promise<ClubDetailsResponse> => {
  const response = await api.post("/api/clubs/getClubDetails", {
    club_id: clubId,
  });
  console.log("getClubDetails", response.data);
  return response.data;
};

export const getMyClubs = async (): Promise<GetMyClubsResponse> => {
  await ensureAuth();
  const response = await api.post("/api/clubs/getMyClubs", {});
  console.log("getMyClubs", response.data);
  return response.data;
};

export const getUserClubs = async (userId: string | number): Promise<GetMyClubsResponse> => {
  const response = await api.post("/api/clubs/getUserClubs", { user_id: userId });
  console.log("getUserClubs", response.data);
  return response.data;
};

export const getClubs = async (
  params: ClubsBrowseRequest = {}
): Promise<ClubCollectionResponse> => {
  const response = await api.post("/api/clubs/getClubs", params);
  console.log("getClubs", response.data);
  return response.data;
};

export const joinClub = async (
  clubId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  const response = await api.post("/api/clubs/joinClub", {
    club_id: clubId,
  });
  return response.data;
};

export const cancelClubJoinRequest = async (
  clubId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  const response = await api.post("/api/clubs/cancelJoinRequest", {
    club_id: clubId,
  });
  return response.data;
};

export const leaveClub = async (
  clubId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  const response = await api.post("/api/clubs/leaveClub", {
    club_id: clubId,
  });
  return response.data;
};

export const removeClubMember = async (
  clubId: number,
  userId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  const response = await api.post("/api/clubs/removeMember", {
    club_id: clubId,
    user_id: userId,
  });
  return response.data;
};

export const getClubMembers = async (
  params: ClubMembersRequest
): Promise<ClubMembersResponse> => {
  const response = await api.post("/api/clubs/getClubMembers", params);
  console.log("getClubMembers", response.data)
  return response.data;
};

export const getClubPendingRequests = async (
  params: ClubPendingRequestsRequest
): Promise<ClubPendingRequestsResponse> => {
  const response = await api.post("/api/clubs/getPendingJoinRequests", params);
  return response.data;
};

export const acceptClubJoinRequest = async (
  clubId: number,
  userId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  const response = await api.post("/api/clubs/acceptJoinRequest", {
    club_id: clubId,
    user_id: userId,
  });
  return response.data;
};

export const rejectClubJoinRequest = async (
  clubId: number,
  userId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  const response = await api.post("/api/clubs/rejectJoinRequest", {
    club_id: clubId,
    user_id: userId,
  });
  return response.data;
};

export const getClubLeaderboard = async (
  params: ClubLeaderboardRequest
): Promise<ClubLeaderboardResponse> => {
  const response = await api.post("/api/clubs/getClubLeaderboard", params);
  console.log("getClubLeaderboard", response.data);
  return response.data;
};

export const getClubStats = async (
  clubId: number
): Promise<ClubDetailsResponse["stats"]> => {
  const response = await api.post("/api/clubs/getClubStats", {
    club_id: clubId,
  });
  console.log("getClubStats", response.data);
  return response.data.stats ?? response.data;
};

export const getClubsLeaderboard = async (
  params: ClubsLeaderboardRequest = {}
): Promise<ClubCollectionResponse> => {
  const response = await api.post("/api/clubs/getClubsLeaderboard", params);
  console.log("getClubsLeaderboard", response.data);
  return response.data;
  
};

export const getClubActivity = async (
  params: ClubActivityRequest
): Promise<ClubActivityResponse> => {
  const response = await api.post("/api/clubs/getClubActivity", params);
  console.log("getClubActivity", response.data);
  return response.data;
};

export const getClubPeriodSummary = async (
  params: ClubPeriodSummaryRequest
): Promise<ClubPeriodSummaryResponse> => {
  const response = await api.post("/api/clubs/getClubPeriodSummary", params);
  console.log("getClubPeriodSummary", response.data);
  return response.data;
};

export const cancelJoinRequest = cancelClubJoinRequest;
export const removeMember = removeClubMember;
export const acceptJoinRequest = acceptClubJoinRequest;
export const rejectJoinRequest = rejectClubJoinRequest;
