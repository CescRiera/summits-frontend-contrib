import { Capacitor } from "@capacitor/core";
import { SafeArea } from "capacitor-plugin-safe-area";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Initialize safe area handling for Capacitor native apps
 * This should be called early in the app lifecycle, before React renders
 */
export const initializeCapacitorSafeArea = async () => {
  // Only run on native platforms
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Mark native runtime so CSS can adjust safe-area logic globally
    document.documentElement.classList.add("native-app");

    // Let the system handle the top inset (webview below status bar)
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

    // Match status bar icons to a light app chrome by default
    // Using black background to match app theme
    await StatusBar.setBackgroundColor({ color: "rgb(0, 0, 0)" }).catch(() => {});
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});

    // Provide bottom inset for devices with gesture/navigation areas
    const data = await SafeArea.getSafeAreaInsets().catch(() => null);
    if (data?.insets) {
      const topInset = data.insets.top ?? 0;
      const bottomInset = data.insets.bottom ?? 0;
      const leftInset = data.insets.left ?? 0;
      const rightInset = data.insets.right ?? 0;

      // Set CSS custom properties for safe area insets
      document.documentElement.style.setProperty(
        "--safe-area-top",
        `${topInset}px`
      );
      document.documentElement.style.setProperty(
        "--safe-area-bottom",
        `${bottomInset}px`
      );
      document.documentElement.style.setProperty(
        "--safe-area-left",
        `${leftInset}px`
      );
      document.documentElement.style.setProperty(
        "--safe-area-right",
        `${rightInset}px`
      );
    }
  } catch (error) {
    console.warn("Failed to initialize Capacitor safe area:", error);
  }
};

