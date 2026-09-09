export const APP_NAME = "Summits";

export const APPLE_APP_STORE_ID = "6756274802";
export const IOS_APP_STORE_URL =
  "https://apps.apple.com/us/app/summits/id6756274802";

export const ANDROID_APP_PACKAGE_ID = "com.summitstracker.summits";
export const GOOGLE_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.summitstracker.summits";

export const IOS_SMART_APP_BANNER_CONTENT =
  "app-id=6756274802, app-argument=summitstracker://";

export const getNativeStoreUrl = (platform: "ios" | "android"): string =>
  platform === "ios" ? IOS_APP_STORE_URL : GOOGLE_PLAY_STORE_URL;
