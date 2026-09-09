import { api, getLanguage, ensureAuth } from "../client";
import type {
  PeakListsBasicResponse,
  PeakListDetailsResponse,
  PeakListsWithPeaksResponse,
  UserPeaksWithGeoJSONResponse,
  UserPeaksResponse,
  UserPeaksRequest,
  CreatePeakListRequest,
  UpdatePeakListRequest,
  WorldPeaksGeoJSONResponse,
  WorldChallengeStatsResponse,
  RegionBoundariesResponse,
  AdminArea,
} from "../types";

const appendOptionalFormValue = (
  formData: FormData,
  key: string,
  value: string | number | boolean | null | undefined
) => {
  if (value === undefined) return;
  if (value === null) {
    formData.append(key, "");
    return;
  }
  formData.append(key, String(value));
};

// Get world peaks GeoJSON for World Challenge
export const getWorldListPeaksGeoJson = async (
  admin_osm_ids?: number[],
): Promise<WorldPeaksGeoJSONResponse> => {
  console.log("admin_osm_ids", admin_osm_ids)
  const response = await api.post("/api/peak-lists/getWorldListPeaksGeoJson", {
    admin_osm_ids,
  });

  console.log("Responsee12", response.data)
  return response.data;
};

// Get world challenge stats (lightweight)
export const getWorldChallengeStats = async (
  admin_osm_ids?: number[],
): Promise<WorldChallengeStatsResponse> => {
  const response = await api.post("/api/peak-lists/getWorldChallengeStats", {
    admin_osm_ids,
  });
  return response.data;
};

// Get region boundaries (only needed when admin filters are active)
export const getRegionBoundaries = async (
  admin_osm_ids: number[],
): Promise<RegionBoundariesResponse> => {
  const response = await api.post("/api/peak-lists/getRegionBoundaries", {
    admin_osm_ids,
  });
  return response.data;
};

// Get peak lists with peaks
export const getPeakListsWithPeaks = async (
  userId?: string
): Promise<PeakListsWithPeaksResponse> => {
  const language = getLanguage();
  const response = await api.post("/api/peak-lists/getListsWithPeaks", {
    ...(userId && { userId }),
    language,
  });
  console.log("getListsWithPeaks", response.data);
  return response.data;
};

// Get list peaks geojson
export const getListPeaksGeoJson = async (
  listId: number,
  userId?: number
): Promise<any> => {
  const response = await api.post("/api/peak-lists/getListPeaksGeoJson", {
    list_id: listId,
    ...(userId && { userId }),
  });
  return response.data;
};



// Get user peaks map
export const getUserPeaksMap =
  async (): Promise<UserPeaksWithGeoJSONResponse> => {
    await ensureAuth();
    const response = await api.get("/api/peak-lists/getUserPeaksMap");
    return response.data;
  };

// Get peak list details
export const getPeakListDetails = async (
  listId: number,
  userId?: string
): Promise<PeakListDetailsResponse> => {
  const language = getLanguage();
  const response = await api.post("/api/peak-lists/getListDetails", {
    list_id: listId,
    language,
    ...(userId && { userId }),
  });
  console.log("uaweawe", response.data)
  return response.data;
};

// Get basic peak lists
export const getPeakListsBasic = async (): Promise<PeakListsBasicResponse> => {
  const language = getLanguage();
  const response = await api.post("/api/peak-lists/getPeakLists", { language });
  return response.data;
};

// Get user peaks for peak lists
export const getAllUserPeaks = async (
  params: UserPeaksRequest = {}
): Promise<UserPeaksResponse> => {
  const language = getLanguage();
  const response = await api.post("/api/peak-lists/getUserPeaks", {
    ...params,
    language: params.language || language,
  });
  console.log("getUserPeaks", response.data);
  return response.data;
};

// Get countries (admin level 2)
export const getCountries = async (): Promise<AdminArea[]> => {
  const response = await api.post("/api/locations/countries", {});
  return response.data.countries;
};

// Get children admin areas (drill-down)
export const getAdminChildren = async (parentOsmId: number): Promise<AdminArea[]> => {
  const response = await api.post("/api/locations/adminChildren", { parent_osm_id: parentOsmId });
  return response.data.children;
};

/** @deprecated Use getAdminChildren instead */
export const getRegions = async (gid_0: string) => {
  const response = await api.post("/api/locations/regions", { gid_0 });
  return response.data.regions;
};

// Create a new peak list
export const createPeakList = async (
  data: CreatePeakListRequest
): Promise<{ success: boolean; list_id: number; message: string }> => {
  await ensureAuth();

  if (data.image) {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("peak_ids", JSON.stringify(data.peak_ids));
    formData.append("is_private", String(data.is_private));
    formData.append("language", data.language || "en");
    appendOptionalFormValue(formData, "club_id", data.club_id);
    appendOptionalFormValue(formData, "start_date", data.start_date);
    appendOptionalFormValue(formData, "end_date", data.end_date);
    appendOptionalFormValue(formData, "max_duration", data.max_duration);
    formData.append("image", data.image);

    const response = await api.post("/api/peak-lists/createList", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  const payload: {
    name: string;
    description: string;
    peak_ids: number[];
    is_private: boolean;
    club_id?: number | null;
    language: string;
    start_date?: string | null;
    end_date?: string | null;
    max_duration?: number | null;
  } = {
    name: data.name,
    description: data.description,
    peak_ids: data.peak_ids,
    is_private: data.is_private,
    language: data.language || "en",
  };
  if (data.club_id !== undefined) payload.club_id = data.club_id;
  if (data.start_date !== undefined) payload.start_date = data.start_date;
  if (data.end_date !== undefined) payload.end_date = data.end_date;
  if (data.max_duration !== undefined) payload.max_duration = data.max_duration;

  const response = await api.post("/api/peak-lists/createList", payload);
  return response.data;
};

// Update an existing peak list
export const updatePeakList = async (
  data: UpdatePeakListRequest
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();

  if (data.image) {
    const formData = new FormData();
    formData.append("list_id", data.list_id.toString());
    if (data.name) formData.append("name", data.name);
    if (data.description) formData.append("description", data.description);
    if (data.peak_ids) formData.append("peak_ids", JSON.stringify(data.peak_ids));
    if (data.is_private !== undefined)
      formData.append("is_private", String(data.is_private));
    appendOptionalFormValue(formData, "club_id", data.club_id);
    if (data.leading_list_id !== undefined)
      formData.append("leading_list_id", String(data.leading_list_id));
    appendOptionalFormValue(formData, "start_date", data.start_date);
    appendOptionalFormValue(formData, "end_date", data.end_date);
    appendOptionalFormValue(formData, "max_duration", data.max_duration);
    formData.append("image", data.image);

    const response = await api.post("/api/peak-lists/updateList", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }

  const payload: {
    list_id: number;
    name?: string;
    description?: string;
    peak_ids?: number[];
    is_private?: boolean;
    club_id?: number | null;
    start_date?: string | null;
    end_date?: string | null;
    max_duration?: number | null;
    leading_list_id?: number | string;
  } = {
    list_id: data.list_id,
  };
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.peak_ids !== undefined) payload.peak_ids = data.peak_ids;
  if (data.is_private !== undefined) payload.is_private = data.is_private;
  if (data.club_id !== undefined) payload.club_id = data.club_id;
  if (data.start_date !== undefined) payload.start_date = data.start_date;
  if (data.end_date !== undefined) payload.end_date = data.end_date;
  if (data.max_duration !== undefined) payload.max_duration = data.max_duration;
  if (data.leading_list_id !== undefined) payload.leading_list_id = data.leading_list_id;

  const response = await api.post("/api/peak-lists/updateList", payload);
  return response.data;
};

// Delete a peak list
export const deletePeakList = async (
  listId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  const response = await api.post("/api/peak-lists/deleteList", { list_id: listId });
  return response.data;
};

// Follow a peak list
export const followPeakList = async (
  listId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  const response = await api.post("/api/peak-lists/follow", { list_id: listId });
  return response.data;
};

// Unfollow a peak list
export const unfollowPeakList = async (
  listId: number
): Promise<{ success: boolean; message: string }> => {
  await ensureAuth();
  console.log("list_id", listId)
  const response = await api.post("/api/peak-lists/unfollow", { list_id: listId });
  console.log("Response unfollowPeakList", response.data);
  return response.data;
};
