import { api, getLanguage } from "../client";
import type {
  ShelterBasic,
  ShelterDescription,
  ShelterImagesResponse,
  ShelterAdditionalInfo,
  ShelterNearbyPeaksResponse,
  ShelterNearbySheltersResponse,
  ShelterWeatherData,
} from "../types";

// Basic shelter information
export const getShelterBasic = async (
  shelterId: number,
): Promise<ShelterBasic> => {
  const response = await api.post("/api/shelters/getBasic", {
    shelter_id: shelterId,
  });
  return response.data;
};

// Shelter description (Wikipedia/Wikidata)
export const getShelterDescription = async (
  shelterId: number,
  language?: string,
): Promise<ShelterDescription> => {
  const lang = language || getLanguage();
  const response = await api.post("/api/shelters/getDescription", {
    shelter_id: shelterId,
    language: lang,
  });
  return response.data;
};

// Shelter images
export const getShelterImages = async (
  shelterId: number,
): Promise<ShelterImagesResponse> => {
  const response = await api.post("/api/shelters/getImages", {
    shelter_id: shelterId,
  });
  return response.data;
};

// Shelter additional info (facilities from OSM tags)
export const getShelterAdditionalInfo = async (
  shelterId: number,
): Promise<ShelterAdditionalInfo> => {
  const response = await api.post("/api/shelters/getAdditionalInfo", {
    shelter_id: shelterId,
  });
  console.log("hoqweq", response); 
  return response.data;
};

// Nearby peaks
export const getShelterNearbyPeaks = async (
  shelterId: number,
  radius: number = 10000,
  limit: number = 10,
): Promise<ShelterNearbyPeaksResponse> => {
  const response = await api.post("/api/shelters/getNearbyPeaks", {
    shelter_id: shelterId,
    radius,
    limit,
  });
  return response.data;
};

// Nearby shelters
export const getShelterNearbyShelters = async (
  shelterId: number,
  radius: number = 10000,
  type?: string,
  limit: number = 10,
): Promise<ShelterNearbySheltersResponse> => {
  const response = await api.post("/api/shelters/getNearbyShelters", {
    shelter_id: shelterId,
    radius,
    ...(type && { type }),
    limit,
  });
  return response.data;
};

// Shelter weather (user-created backend endpoint)
export const getShelterWeather = async (
  shelterId: number,
  days: number = 7,
  language?: string,
): Promise<ShelterWeatherData> => {
  const lang = language || getLanguage();
  const response = await api.post("/api/shelters/getWeather", {
    shelter_id: shelterId,
    days,
    language: lang,
  });
  return response.data;
};

// Submit a shelter change petition (create or edit)
export const submitShelterChange = async (
  formData: FormData,
): Promise<{
  success: boolean;
  message: string;
  status: string;
  pending_id: number;
  type: string;
}> => {
  const response = await api.post(
    "/api/shelters/submitShelterChange",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

// Add/replace shelter image
export const addShelterImage = async (
  shelterId: number,
  image: File,
): Promise<{
  success: boolean;
  message: string;
  status: string;
  pending_id: number;
  image_url: string;
  shelter_id: number;
}> => {
  const formData = new FormData();
  formData.append("shelter_id", shelterId.toString());
  formData.append("image", image);
  const response = await api.post("/api/shelters/addImage", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
