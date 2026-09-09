export default {
  appId: "com.summitstracker.summits",
  appName: "Summits",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
  plugins: {
    App: {
      // Custom URL scheme for deep linking
      customUrlScheme: "summitstracker",
    },
    PushNotifications: {
      // Show notification banner, badge, and play sound when app is in foreground
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#000000",
      overlaysWebView: false,
    },
    SafeArea: {
      backgroundColor: "#000000",
    },
  },
};
