import { api, getLanguage, ensureAuth } from "../client";
import type {
  RouteDetailsResponse,
  UserRoutesPaginationRequest,
  UserRoutesPaginationResponse,
  UserPeaksCountriesResponse,
  RecentCommunityRoutesResponse,
  AddRouteRequest,
  AddRouteResponse,
  DeleteRouteResponse,
} from "../types";

// Get route details
export const getRouteDetails = async (
  routeId: string,
  language?: string
): Promise<RouteDetailsResponse> => {
  const lang = language || getLanguage();
  const response = await api.post("/api/route-info/getRouteDetails", {
    routeId: routeId,
    language: lang,
  });
  return response.data;
};

// Get user routes with pagination
export const getUserRoutes = async (
  params: UserRoutesPaginationRequest,
  userId?: string
): Promise<UserRoutesPaginationResponse> => {
  const language = getLanguage();
  const response = await api.post("/api/route-info/getUserRoutes", {
    ...params,
    language,
    ...(userId && { userId }),
  });
  console.log("response2431421", response)
  return response.data;
};

// Get user peaks countries
export const getUserPeaksCountries =
  async (): Promise<UserPeaksCountriesResponse> => {
    await ensureAuth();
    const response = await api.get("/api/route-info/getUserPeaksCountries");
    return response.data;
  };

// Get recent community routes
export const getRecentCommunityRoutes =
  async (): Promise<RecentCommunityRoutesResponse> => {
    const response = await api.get("/api/user-data/getRecentCommunityRoutes");
    console.log("response2431421", response)
    return response.data;
  };

// Add custom route from GPX
export const addRoute = async (
  payload: AddRouteRequest
): Promise<AddRouteResponse> => {
  await ensureAuth();
  const response = await api.post("/api/route-info/addRoute", payload);
  return response.data;
};

// Delete custom route
export const deleteRoute = async (
  routeId: number
): Promise<DeleteRouteResponse> => {
  await ensureAuth();
  const response = await api.delete("/api/route-info/deleteRoute", {
    data: { routeId },
  });
  return response.data;
};
