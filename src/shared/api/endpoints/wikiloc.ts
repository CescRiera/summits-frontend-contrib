import { api, ensureAuth } from "../client";

export const wikilocImport = async (params: {
  wikilocUserId?: string;
  wikilocProfileUrl?: string;
}) => {
  await ensureAuth();
  const response = await api.post("/api/wikiloc/import", params);
  return response.data;
};
