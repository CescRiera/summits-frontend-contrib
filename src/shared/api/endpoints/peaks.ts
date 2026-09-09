import { api, getLanguage, ensureAuth } from "../client";
import type {
  PeakDetails,
  PeakBasicName,
  PeakDescription,
  PeakImagesResponse,
  WeatherData,
  FloraFaunaData,
  InfrastructureData,
  PeakAdditionalInfo,
  PeakCommunityInfo,
  UserPeakInfoResponse,
  DiscoveryMode,
  DiscoveryResponse,
  ShelterType,
} from "../types";

// Basic peak information
export const getPeakBasic = async (peakId: number): Promise<PeakDetails> => {
  const response = await api.post("/api/peaks/getBasic", { peak_id: peakId });
  return response.data;
};

// Basic peak name for fast header display
export const getPeakBasicName = async (
  peakId: number,
  includeAuth: boolean = false,
): Promise<PeakBasicName> => {
  const response = await api.post("/api/peaks/getBasicName", {
    peak_id: peakId,
    includeAuth,
  });
  return response.data;
};

// Peak description
export const getPeakDescription = async (
  peakId: number,
  language?: string,
): Promise<PeakDescription> => {
  const response = await api.post("/api/peaks/getDescription", {
    peak_id: peakId,
    language: language,
  });
  return response.data;
};

// Peak images
export const getPeakImages = async (
  peakId: number,
): Promise<PeakImagesResponse> => {
  const response = await api.post("/api/peaks/getImages", { peak_id: peakId });
  return response.data;
};

// Peak weather
export const getPeakWeather = async (
  peakId: number,
  days: number = 7,
  language?: string,
): Promise<WeatherData> => {
  const lang = language || getLanguage();
  const response = await api.post("/api/peaks/getWeather", {
    peak_id: peakId,
    days,
    language: lang,
  });
  return response.data;
};

// Peak flora and fauna
export const getPeakFloraFauna = async (
  peakId: number,
  radius: number = 5,
  language?: string,
): Promise<FloraFaunaData> => {
  const lang = language || getLanguage();
  const response = await api.post("/api/peaks/getFloraFauna", {
    peak_id: peakId,
    radius,
    language: lang,
  });
  return response.data;
};

// Peak infrastructure
export const getPeakInfrastructure = async (
  peakId: number,
  radius: number = 5000,
  language: string = "en",
): Promise<InfrastructureData> => {
  const response = await api.post("/api/peaks/getInfrastructure", {
    peak_id: peakId,
    radius,
    language,
  });
  console.log("getPeakInfrastructure response:", response.data);
  return response.data;
};

// Peak additional info (nearby peaks)
export const getPeakAdditionalInfo = async (
  peakId: number,
): Promise<PeakAdditionalInfo> => {
  const response = await api.post("/api/peaks/getAdditionalInfo", {
    peak_id: peakId,
  });
  return response.data;
};

// Peak community info
export const getPeakCommunityInfo = async (
  peakId: number,
  page?: number,
  limit?: number,
): Promise<PeakCommunityInfo> => {
  const response = await api.post("/api/peaks/getCommunityInfo", {
    peak_id: peakId,
    ...(page != null && { page }),
    ...(limit != null && { limit }),
  });
  return response.data;
};

// Search peaks


// Discover peaks
export const discoverPeaks = async (
  params: {
    page?: number;
    limit?: number;
    query?: string; // Peak name search (minimum 2 characters)
    min_elevation?: number;
    max_elevation?: number;
    admin_osm_ids?: number[];
    /** @deprecated Use admin_osm_ids instead */
    country_id?: string | string[];
    /** @deprecated Use admin_osm_ids instead */
    region_id?: string | string[];
    exclude_ids?: string[];
    mode?: DiscoveryMode;
    shelter_types?: ShelterType[];
    exclude_shelter_ids?: string[] | number[];
    shelter_cursor?: string | number | null;
    order_by?: string;
    order_direction?: "asc" | "desc";
  } = {},
): Promise<DiscoveryResponse> => {
  const {
    page = 1,
    limit = 31,
    query,
    min_elevation,
    max_elevation,
    admin_osm_ids,
    country_id,
    region_id,
    exclude_ids,
    mode,
    shelter_types,
    exclude_shelter_ids,
    shelter_cursor,
    order_by,
    order_direction,
  } = params;
  const response = await api.post("/api/discovery/", {
    page,
    limit,
    ...(query && query.length >= 2 && { query }),
    min_elevation,
    max_elevation,
    ...(admin_osm_ids && admin_osm_ids.length > 0
      ? { admin_osm_ids }
      : {
          ...(country_id && { country_id }),
          ...(region_id && { region_id }),
        }),
    exclude_ids,
    ...(mode && { mode }),
    ...(shelter_types && shelter_types.length > 0 && { shelter_types }),
    ...(exclude_shelter_ids &&
      exclude_shelter_ids.length > 0 && { exclude_shelter_ids }),
    ...(shelter_cursor != null && { shelter_cursor }),
    ...(order_by && { order_by }),
    ...(order_direction && { order_direction }),
  });
  return response.data;
};
// Submit a peak change petition (create or edit)
export const submitPeakChange = async (
  formData: FormData,
): Promise<{
  success: boolean;
  message: string;
  status: string;
  pending_id: number;
  type: string;
}> => {
  const response = await api.post("/api/peaks/submitPeakChange", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Add peak image
export const addPeakImage = async (
  peakId: number,
  image: File,
): Promise<{
  success: boolean;
  message: string;
  status: string;
  pending_id: number;
  image_url: string;
  peak_id: number;
}> => {
  const formData = new FormData();
  formData.append("peak_id", peakId.toString());
  formData.append("image", image);

  const response = await api.post("/api/peaks/addImage", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Get user's peak info with ascensions
export const getUserPeakInfo = async (
  peakId: number,
): Promise<UserPeakInfoResponse> => {
  await ensureAuth();
  const response = await api.post("/api/peaks/getUserPeakInfo", {
    peak_id: peakId,
  });
  return response.data;
};
