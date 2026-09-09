import { api } from "../client";

export interface OpenSessionResponse {
  session_id: number;
}

export interface SetEventResponse {
  message: string;
  event_id: number;
}

/**
 * Open a new analytics session
 * @param os - Operating system identifier (e.g., "Windows 10", "macOS 14.0", "Linux", "iOS 17.0", "Android 13")
 * @param device - Device type identifier (e.g., "Desktop", "Mobile", "Tablet", "Smart TV")
 * @returns Session ID for use in subsequent event tracking
 */
export const openSession = async (
  os: string,
  device: string
): Promise<OpenSessionResponse> => {
  // The api interceptor will automatically add Authorization header if token exists
  const response = await api.post<OpenSessionResponse>(
    "/api/analytics/openSession",
    {
      os,
      device,
    }
  );
  return response.data;
};

/**
 * Record an analytics event for a session
 * @param sessionId - Session ID returned from openSession endpoint
 * @param type - Event type/name (e.g., "button_click", "page_view", "form_submit", "search_query")
 * @param value - Optional event value/data - can be any string or JSON stringified data
 * @returns Event ID
 */
export const setEvent = async (
  sessionId: number,
  type: string,
  value?: string
): Promise<SetEventResponse> => {
  const response = await api.post<SetEventResponse>("/api/analytics/setEvent", {
    session_id: sessionId,
    type,
    ...(value !== undefined && { value }),
  });
  return response.data;
};
