import { api, ensureAuth } from "../client";

// Scrape user data
export const scrapeUserData = async (forceRefresh: boolean = false) => {
  console.log("📡 [API] Calling /api/scrape/scrapeUserData endpoint", {
    forceRefresh,
    timestamp: new Date().toISOString(),
  });
  await ensureAuth();
  const response = await api.post("/api/scrape/scrapeUserData", {
    forceRefresh,
  });
  return response.data;
};
