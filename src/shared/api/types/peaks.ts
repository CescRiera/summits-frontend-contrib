import type { PeakBasic, Coordinates, AdminHierarchy } from "./common";

// Peak Details Types
export interface PeakDetails extends PeakBasic {
  coordinates: Coordinates;
  reverse_geocoding?: {
    city?: string;
    region?: string;
    country?: string;
    country_code?: string;
    continent?: string;
  };
  country_flag?: string;
}

export interface PeakBasicName {
  name: string;
  name_en: string;
  wikidata_id: boolean;
  coordinates: Coordinates;
  saved?: boolean;
}

export interface PeakDescription {
  peak_id: number;
  description: string;
  language: string;
  lang_codes: string[];
  source?: string;
  name?: string;
}

export interface PeakImage {
  url: string;
  title: string;
  source: string;
}

export interface PeakImagesResponse {
  images: PeakImage[];
}

// Weather Types
export interface WeatherUnits {
  predictability: string;
  precipitation: string;
  windspeed: string;
  precipitation_probability: string;
  relativehumidity: string;
  temperature: string;
  time: string;
  pressure: string;
  winddirection: string;
}

export interface WeatherTemperature {
  min: number;
  max: number;
  mean: number;
  instant: number;
}

export interface WeatherWind {
  speed_mean: number;
  speed_min: number;
  speed_max: number;
  direction: number;
}

export interface WeatherHumidity {
  min: number;
  max: number;
  mean: number;
}

export interface WeatherPressure {
  mean: number;
  min: number;
  max: number;
}

export interface WeatherApparentTemperature {
  min: number;
  max: number;
  mean: number;
}

export interface WeatherPrecipitation {
  amount: number;
  probability: number;
  hours: number;
}

export interface WeatherDailyForecast {
  date: string;
  sunrise: string;
  sunset: string;
  temperature: WeatherTemperature;
  snow_fraction: number;
  wind: WeatherWind;
  humidity: WeatherHumidity;
  pressure: WeatherPressure;
  pictocode: number;
  convective_precipitation: number;
  apparent_temperature: WeatherApparentTemperature;
  precipitation: WeatherPrecipitation;
  rainSPOT: string;
  uvindex: number;
  predictability: number;
  predictability_class: number;
}

export interface WeatherHourlyForecast {
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
}

export interface WeatherData {
  peak_id: number;
  peak_name: string;
  coordinates: Coordinates;
  elevation: number;
  forecast_days: number;
  data_source: string;
  units: WeatherUnits;
  daily_forecast: WeatherDailyForecast[];
  hourly_forecast: WeatherHourlyForecast[];
  api_credits_used: number;
}

// Flora & Fauna Types
export interface FloraFaunaObservation {
  name: string;
  common_name?: string;
  photo_url?: string;
}

export interface FloraFaunaData {
  biodiversity_data: {
    iNaturalist_observations: {
      categories: Record<string, FloraFaunaObservation[]>;
    };
    ecological_context?: {
      elevation_zone: string;
      biodiversity_notes: string;
    };
  };
}

// Infrastructure Types
export interface InfrastructureImage {
  title: string;
  url: string;
  width?: number;
  height?: number;
  source?: string;
}

export interface InfrastructureItem {
  id: number;
  shelter_id?: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  image?: InfrastructureImage;
}

export interface PeakInfrastructure {
  huts: InfrastructureItem[];
  shelters: InfrastructureItem[];
  natural_features: InfrastructureItem[];
  drinking_water: InfrastructureItem[];
  other: InfrastructureItem[];
}

export interface InfrastructureData {
  peak_id: number;
  peak_name: string;
  coordinates: Coordinates;
  infrastructure: PeakInfrastructure;
}

// Additional Info Types
export interface NearbyPeak {
  id: number;
  name: string;
  elevation: number;
  distance_km: number;
  image?: string | null;
}

export interface PeakAdditionalInfo {
  nearby_peaks: NearbyPeak[];
}

// Community Info Types
export interface PeakCommunityUser {
  id: number;
  name: string;
  image: string;
  completion_count: number;
  last_completed_at: string;
  club_ids?: number[];
  is_club_related?: boolean;
}

export interface CurrentUserInfo {
  completed: boolean;
  completion_count: number;
  last_completed_at: string;
}

export interface PeakCommunityRoutePeak {
  name: string;
  elevation: number;
}

export interface PeakCommunityRouteUser {
  id: number;
  name: string;
  image: string;
  club_ids?: number[];
  is_club_related?: boolean;
}

export interface PeakCommunityRoute {
  id: number;
  name: string;
  distance: number;
  elevation_gain: number;
  time: string;
  date?: string;
  image?: string;
  number_of_peaks: number;
  peaks: PeakCommunityRoutePeak[];
  user?: PeakCommunityRouteUser;
  club_ids?: number[];
  is_club_related?: boolean;
}

export interface PeakCommunityPagination {
  page: number;
  limit: number;
  total_routes: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PeakCommunityClubScopedInfo {
  available?: boolean;
  member_of_club_ids?: number[];
  member_of_club_names?: string[];
  total_completions?: number;
  unique_users?: number;
  users?: PeakCommunityUser[];
  routes?: PeakCommunityRoute[];
}

export interface PeakCommunityInfo {
  peak_id: number;
  peak_name: string;
  coordinates: Coordinates;
  total_completions: number;
  unique_users: number;
  users: PeakCommunityUser[];
  current_user?: CurrentUserInfo;
  routes: PeakCommunityRoute[];
  pagination?: PeakCommunityPagination;
  club_context?: PeakCommunityClubScopedInfo;
}

// Search Types
export interface PeakSearchResult {
  type: "peak";
  id: number;
  name: string;
  name_en: string | null;
  elevation: number;
  lat: number;
  lng: number;
  admin_hierarchy?: AdminHierarchy;
  relevance_score: number;
  image: string;
}

export interface AdminSearchResult {
  type: "admin";
  id: number;
  name: string;
  name_only?: string;
  parent_name?: string;
  lat: number;
  lng: number;
  image?: string | null;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  } | GeoJSON.Feature | GeoJSON.FeatureCollection;
  admin_level: number;
  relevance_score: number;
}

export interface MountainRangeSearchResult {
  type: "mountain_range";
  id: number;
  name: string;
  name_en?: string | null;
  lat: number;
  lng: number;
  geometry:
    | {
        type: "MultiPolygon";
        coordinates: number[][][][];
      }
    | {
        type: "Polygon";
        coordinates: number[][][];
      }
    | {
        type: "LineString";
        coordinates: number[][];
      }
    | {
        type: "MultiLineString";
        coordinates: number[][][];
      }
    | GeoJSON.Feature
    | GeoJSON.FeatureCollection;
  relevance_score: number;
}

export interface PeakSearchResponse {
  results: PeakSearchResult[];
  query: string;
  total: number;
}
