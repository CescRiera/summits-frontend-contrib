import { api, ensureAuth } from "../client";

export interface ToggleNotificationResponse {
  enabled: boolean;
}

// Subscribe to push notifications (requires auth)
export async function subscribeToPush(
  token: string,
  platform: "ios" | "android",
  environment?: "development" | "production"
): Promise<void> {
  await ensureAuth();

  // Native platform - send token, platform, and environment (for iOS)
  const bundleId = "com.summitstracker.summits";

  // Verify token format before sending
  if (platform === "ios") {
    if (!token || typeof token !== "string") {
      throw new Error(`Invalid iOS token: expected string, got ${typeof token}`);
    }
    if (!/^[0-9A-Fa-f]+$/.test(token)) {
      throw new Error("Invalid iOS token format: not hexadecimal");
    }
    if (!bundleId) {
      throw new Error("Bundle ID is required for iOS push notifications");
    }
  }

  const payload: Record<string, string> = {
    token,
    platform,
  };

  if (platform === "ios" && environment) {
    payload["environment"] = environment;
  }

  if (platform === "ios" && bundleId) {
    payload["bundleId"] = bundleId;
  }

  await api.post("/api/push-notifications/subscribe", payload);
}

// Unsubscribe from push notifications (requires auth)
export async function unsubscribeFromPush(
  token: string,
  platform: "ios" | "android"
): Promise<void> {
  await ensureAuth();

  await api.post("/api/push-notifications/unsubscribe", {
    token,
    platform,
  });
}

// Toggle notification preference (requires auth)
export const toggleNotificationPreference = async (
  enabled: boolean
): Promise<ToggleNotificationResponse> => {
  await ensureAuth();
  const response = await api.post("/api/push-notifications/toggle", { enabled });
  return response.data;
};
