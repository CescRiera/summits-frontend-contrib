export const API_CONFIG = {
  BASE_URL: import.meta.env["VITE_BACKEND_URL"],
  WEBSOCKET_URL: import.meta.env["VITE_BACKEND_URL"],
  TIMEOUT: 30000,
  SCRAPING_TIMEOUT: 300000,
} as const;

export const getApiUrl = () => API_CONFIG.BASE_URL;
export const getWebSocketUrl = () => API_CONFIG.WEBSOCKET_URL;
