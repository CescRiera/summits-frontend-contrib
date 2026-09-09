import type {
  Coordinates,
  AdminHierarchy,
  PaginationResponse,
} from "./common";

// Shelter Types
export type ShelterType = "alpine_hut" | "wilderness_hut" | "shelter";

// Basic shelter information (from getBasic)
export interface ShelterBasic {
  id: number;
  type: ShelterType;
  coordinates: Coordinates;
  name: string | null;
  name_en: string | null;
  elevation: number | null;
  admin_hierarchy: AdminHierarchy;
  wikidata_id: string | null;
  wikipedia: string | null;
  image: string | null;
  osm_id: number;
  osm_type: string;
  reverse_geocoding?: {
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
    continent?: string;
  };
  country_flag?: string | null;
  saved?: boolean;
}

// Description (from getDescription)
export interface ShelterDescription {
  shelter_id: number;
  description: string | null;
  language: string | null;
  lang_codes: string[];
  source: string | null;
  name: string | null;
}

// Image types (from getImages)
export interface ShelterImage {
  title: string;
  url: string;
  width: number | null;
  height: number | null;
  source: string;
}

export interface ShelterImagesResponse {
  shelter_id: number;
  shelter_name: string;
  coordinates: Coordinates;
  images: ShelterImage[];
  total_images: number;
  wikipedia_url: string | null;
  wikidata_id: string | null;
}

// Facilities (from getAdditionalInfo)
export interface ShelterFacilities {
  capacity: number | null;
  beds: number | null;
  toilets: string | null;
  drinking_water: string | null;
  shower: string | null;
  electricity: string | null;
  heating: string | null;
  fireplace: string | null;
  fee: string | null;
  wheelchair: string | null;
  pets: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  opening_hours: string | null;
  operator: string | null;
  internet_access: string | null;
  description: string | null;
}

export interface ShelterAdditionalInfo {
  shelter_id: number;
  shelter_name: string;
  coordinates: Coordinates;
  type: ShelterType;
  facilities: ShelterFacilities;
  tags: Record<string, string>;
}

// Nearby peaks (from getNearbyPeaks)
export interface ShelterNearbyPeak {
  id: number;
  name: string;
  elevation: number;
  distance_km: number;
  image: string | null;
}

export interface ShelterNearbyPeaksResponse {
  shelter_id: number;
  coordinates: Coordinates;
  nearby_peaks: ShelterNearbyPeak[];
}

// Nearby shelters (from getNearbyShelters)
export interface ShelterNearbyShelter {
  id: number;
  type: ShelterType;
  name: string;
  elevation: number | null;
  coordinates: Coordinates;
  distance_km: number;
  image: string | null;
}

export interface ShelterNearbySheltersResponse {
  shelter_id: number;
  coordinates: Coordinates;
  type: ShelterType;
  nearby_shelters: ShelterNearbyShelter[];
}

// Shelter weather (from /api/shelters/getWeather — user-created endpoint)
export interface ShelterWeatherData {
  shelter_id: number;
  shelter_name: string;
  coordinates: Coordinates;
  elevation: number;
  forecast_days: number;
  data_source: string;
  units: {
    predictability: string;
    precipitation: string;
    windspeed: string;
    precipitation_probability: string;
    relativehumidity: string;
    temperature: string;
    time: string;
    pressure: string;
    winddirection: string;
  };
  daily_forecast: Array<{
    date: string;
    sunrise: string;
    sunset: string;
    temperature: {
      min: number;
      max: number;
      mean: number;
      instant: number;
    };
    snow_fraction: number;
    wind: {
      speed_mean: number;
      speed_min: number;
      speed_max: number;
      direction: number;
    };
    humidity: {
      min: number;
      max: number;
      mean: number;
    };
    pressure: {
      mean: number;
      min: number;
      max: number;
    };
    pictocode: number;
    convective_precipitation: number;
    apparent_temperature: {
      min: number;
      max: number;
      mean: number;
    };
    precipitation: {
      amount: number;
      probability: number;
      hours: number;
    };
    rainSPOT: string;
    uvindex: number;
    predictability: number;
    predictability_class: number;
  }>;
  hourly_forecast: Array<{
    time: string;
    temperature: number;
    snow_fraction: number;
    wind: {
      speed: number;
      direction: number;
    };
    humidity: number;
    pressure: number;
    pictocode: number;
    convective_precipitation: number;
    apparent_temperature: number;
    precipitation: {
      amount: number;
      probability: number;
    };
    rainSPOT: string;
    uvindex: number;
    isdaylight: number;
  }>;
  api_credits_used: number;
}

// Search result type (from /api/search/searchRealTime)
export interface ShelterSearchResult {
  type: "shelter";
  shelter_type: ShelterType;
  id: number;
  name: string;
  name_en: string | null;
  elevation: number | null;
  lat: number;
  lng: number;
  image: string | null;
  admin_hierarchy: AdminHierarchy;
  relevance_score: number;
}

// User Saved Shelters Types
export interface UserSavedShelter {
  id: number;
  name: string | null;
  name_en: string | null;
  lat: number;
  lng: number;
  elevation: number | null;
  type?: ShelterType;
  shelter_type?: ShelterType;
  image: string | null;
  admin_hierarchy?: AdminHierarchy;
  saved_at: string;
}

export interface UserSavedSheltersRequest {
  page?: number;
  limit?: number;
  language?: string;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  admin_osm_ids?: number[];
  min_elevation?: number;
  max_elevation?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  type?: ShelterType | "";
}

export interface UserSavedSheltersResponse {
  success?: boolean;
  shelters: UserSavedShelter[];
  pagination?: PaginationResponse;
  total_shelters: number;
  user_authenticated: boolean;
  message?: string;
}
