import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { subscribeToPush, unsubscribeFromPush } from "../api/endpoints/pushNotifications";

// Subscription identifier returned from native push registration
export type NotificationSubscription = string;

class PushNotificationManager {
  private nativeToken: string | null = null;
  // Cache for permission status to reduce excessive API calls
  private permissionCache: {
    status: "granted" | "denied" | "prompt" | null;
    timestamp: number;
  } = { status: null, timestamp: 0 };
  private readonly PERMISSION_CACHE_TTL = 1000; // Cache for 1 second
  // Registration state tracking to prevent duplicate registrations
  private isRegistering: boolean = false;
  private registrationPromise: Promise<string> | null = null;
  private tokenWaiters: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];

  /**
   * Check if we're running on a Capacitor native platform
   */
  private checkIsNative(): boolean {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  /**
   * Detect iOS APNs environment (development/sandbox vs production)
   * 
   * Note: The environment matches the aps-environment in App.entitlements:
   * - "development" → APNs sandbox (for development builds)
   * - "production" → APNs production (for TestFlight/App Store builds)
   * 
   * IMPORTANT: This must match the aps-environment value in ios/App/App/App.entitlements
   * 
   * Current configuration: PRODUCTION (for App Store submission)
   * - App.entitlements: aps-environment = "production"
   * - This method returns: 'production'
   * - Backend should use: api.push.apple.com (production endpoint)
   * 
   * For development builds, change both:
   * 1. App.entitlements: Set aps-environment to "development"
   * 2. This method: Return 'development'
   * 3. Backend will use: api.sandbox.push.apple.com (sandbox endpoint)
   */
  private getIOSEnvironment(): 'development' | 'production' {
    // PRODUCTION CONFIGURATION - For App Store/TestFlight builds
    // Matches App.entitlements aps-environment = "production"
    return 'production';
    
    // For development builds, change to:
    // return 'development';
  }

  /**
   * Initialize the appropriate notification system based on platform
   * On native platforms, this calls register() to get a token if permission is already granted
   */
  async initialize(): Promise<boolean> {
    const isNativePlatform = this.checkIsNative();

    if (!isNativePlatform) {
      return false;
    }

    // Native platform - use Capacitor PushNotifications
    try {
      // Register for push notifications - this will get a token if permission is already granted
      // On OPPO devices, the dialog may not show but registration can still succeed
      await PushNotifications.register();
      return true;
    } catch (error) {
      console.error("Error initializing native push notifications:", error);
      return false;
    }
  }

  /**
   * Request notification permission
   * Returns true if permission is granted, false otherwise
   */
  async requestPermission(): Promise<boolean> {
    // Always check if we're on native platform dynamically
    const isNativePlatform = this.checkIsNative();

    if (isNativePlatform) {
      // On native platforms, check current permission status first
      try {
        const status = await PushNotifications.checkPermissions();

        // If already granted, return true
        if (status.receive === "granted") {
          // Update cache
          this.permissionCache = { status: "granted", timestamp: Date.now() };
          return true;
        }

        // If denied, return false
        if (status.receive === "denied") {
          // Update cache
          this.permissionCache = { status: "denied", timestamp: Date.now() };
          return false;
        }

        // Check if we're on iOS - iOS requires requestPermissions() before register()
        const platform = Capacitor.getPlatform();
        const isIOS = platform === "ios";

        if (isIOS) {
          // On iOS, we need to explicitly request permissions first
          try {
            const permissionResult = await PushNotifications.requestPermissions();
            
            if (permissionResult.receive === "granted") {
              await PushNotifications.register();
              this.permissionCache = { status: "granted", timestamp: Date.now() };
              return true;
            } else {
              const result = permissionResult.receive === "denied" ? "denied" : "prompt";
              this.permissionCache = { status: result, timestamp: Date.now() };
              return false;
            }
          } catch (error) {
            this.permissionCache = { status: "prompt", timestamp: Date.now() };
            return false;
          }
        } else {
          // Android - try to request permission by calling register()
        // This will trigger the permission dialog on Android 13+ if not already shown
        // Note: On some devices (like OPPO), the permission dialog may not be able to be shown
        // even if the system notification switch is on. In that case, the user needs to grant
        // permission manually in device settings.
        try {
          await PushNotifications.register();
          // Wait a bit for the permission dialog to be processed
          // On OPPO devices, this may fail silently, so we check status after
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Check again after register()
          const newStatus = await PushNotifications.checkPermissions();
          const granted = newStatus.receive === "granted";

          // Update cache
          this.permissionCache = {
            status: granted
              ? "granted"
              : newStatus.receive === "denied"
              ? "denied"
              : "prompt",
            timestamp: Date.now(),
          };


          return granted;
        } catch (registerError) {
          // register() may fail if permission is denied or on some devices (like OPPO)
          const finalStatus = await PushNotifications.checkPermissions();
          const granted = finalStatus.receive === "granted";

          // Update cache
          this.permissionCache = {
            status: granted
              ? "granted"
              : finalStatus.receive === "denied"
              ? "denied"
              : "prompt",
            timestamp: Date.now(),
          };


          return granted;
          }
        }
      } catch (error) {
        this.permissionCache = { status: "prompt", timestamp: Date.now() };
        return false;
      }
    }

    this.permissionCache = { status: "denied", timestamp: Date.now() };
    return false;
  }

  /**
   * Wait for token to be available (set by permanent listeners in capacitorPushNotifications.ts)
   * Uses polling to check for token since we rely on centralized listeners
   */
  private async waitForToken(timeoutMs: number = 10000): Promise<string> {
    // If token is already available, return it immediately
    if (this.nativeToken) {
      return this.nativeToken;
    }

    // If registration is already in progress, wait for that promise
    if (this.registrationPromise) {
      return this.registrationPromise;
    }

    // Otherwise, poll for token (set by permanent listeners)
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = 100; // Check every 100ms
      
      const timeout = setTimeout(() => {
        const index = this.tokenWaiters.findIndex(w => w.timeout === timeout);
        if (index !== -1) {
          this.tokenWaiters.splice(index, 1);
        }
        reject(new Error("Timeout waiting for push notification token"));
      }, timeoutMs);

      const checkToken = () => {
        if (this.nativeToken) {
          clearTimeout(timeout);
          const index = this.tokenWaiters.findIndex(w => w.timeout === timeout);
          if (index !== -1) {
            this.tokenWaiters.splice(index, 1);
          }
          resolve(this.nativeToken!);
          return;
        }

        if (Date.now() - startTime < timeoutMs) {
          setTimeout(checkToken, checkInterval);
        }
      };

      this.tokenWaiters.push({ resolve, reject, timeout });
      checkToken();
    });
  }

  /**
   * Notify all waiters that a token is available
   * Called by capacitorPushNotifications.ts when token is received
   */
  notifyTokenReceived(token: string): void {
    this.nativeToken = token;
    // Resolve all waiting promises
    this.tokenWaiters.forEach(waiter => {
      clearTimeout(waiter.timeout);
      waiter.resolve(token);
    });
    this.tokenWaiters = [];
    this.registrationPromise = null;
    this.isRegistering = false;
  }

  /**
   * Notify all waiters of a registration error
   * Called by capacitorPushNotifications.ts when registration fails
   */
  notifyRegistrationError(error: Error): void {
    // Reject all waiting promises
    this.tokenWaiters.forEach(waiter => {
      clearTimeout(waiter.timeout);
      waiter.reject(error);
    });
    this.tokenWaiters = [];
    this.registrationPromise = null;
    this.isRegistering = false;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<NotificationSubscription> {
    // Always check if we're on native platform dynamically
    const isNativePlatform = this.checkIsNative();

    if (!isNativePlatform) {
      throw new Error("Push notifications are only supported on native platforms.");
    }

    // Native platform - token is received via permanent listeners in capacitorPushNotifications.ts
    // If we already have a token, use it immediately
    if (this.nativeToken) {
      const platform = Capacitor.getPlatform() as "ios" | "android";
      const environment = platform === "ios" ? this.getIOSEnvironment() : undefined;
      
      try {
        await subscribeToPush(this.nativeToken, platform, environment);
      } catch (error: any) {
        throw error;
      }
      return this.nativeToken;
    }

    // Ensure registration is triggered if not already in progress
    if (!this.isRegistering) {
      try {
        this.isRegistering = true;
        const permissionStatus = await PushNotifications.checkPermissions();
        if (permissionStatus.receive === "granted") {
          await PushNotifications.register();
        } else {
          throw new Error("Permission not granted");
        }
      } catch (error: any) {
        this.isRegistering = false;
        throw error;
      }
    }

    // Wait for token to be available (set by permanent listeners)
    const token = await this.waitForToken(10000);

    // Clear permission cache since we got a token (permission was granted)
    this.clearPermissionCache();

    try {
      const platform = Capacitor.getPlatform() as "ios" | "android";
      const environment = platform === "ios" ? this.getIOSEnvironment() : undefined;
      
      await subscribeToPush(token, platform, environment);
      return token;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<void> {
    // Always check if we're on native platform dynamically
    const isNativePlatform = this.checkIsNative();

    if (!isNativePlatform) {
      return;
    }

    // Native platform - unregister and clear token
    try {
      if (this.nativeToken) {
        const platform = Capacitor.getPlatform() as "ios" | "android";
        await unsubscribeFromPush(this.nativeToken, platform);
        this.nativeToken = null;
      }
      // Note: Capacitor doesn't have an explicit unsubscribe method
      // The token is cleared when the app is uninstalled
    } catch (error) {
      console.error(
        "Error unsubscribing from native push notifications:",
        error
      );
      throw error;
    }
  }

  /**
   * Check if currently subscribed to push notifications
   */
  async isSubscribed(): Promise<boolean> {
    // Always check if we're on native platform dynamically
    const isNativePlatform = this.checkIsNative();

    if (!isNativePlatform) {
      return false;
    }

    // Native platform - check if we have a token
    if (this.nativeToken) {
      return true;
    }
    // Try to get current token
    try {
      const status = await PushNotifications.checkPermissions();
      return status.receive === "granted";
    } catch {
      return false;
    }
  }

  /**
   * Get current permission status
   * Uses caching to reduce excessive API calls
   * On native platforms, having a token is the source of truth for granted permission
   */
  async getPermissionStatus(): Promise<"granted" | "denied" | "prompt"> {
    const now = Date.now();

    // Always check if we're on native platform dynamically
    const isNativePlatform = this.checkIsNative();

    // On native platforms, if we have a token, permission is definitely granted
    if (isNativePlatform && this.nativeToken) {
      this.permissionCache = { status: "granted", timestamp: now };
      return "granted";
    }

    // Check cache (if valid and recent)
    if (
      this.permissionCache.status !== null &&
      now - this.permissionCache.timestamp < this.PERMISSION_CACHE_TTL
    ) {
      return this.permissionCache.status;
    }

    if (!isNativePlatform) {
      const result = "denied";
      this.permissionCache = { status: result, timestamp: now };
      return result;
    }

    try {
      const status = await PushNotifications.checkPermissions();

      let result: "granted" | "denied" | "prompt";
      if (status.receive === "granted") {
        result = "granted";
      } else if (status.receive === "denied") {
        result = "denied";
      } else {
        // For "prompt" or any other state, return "prompt" to allow user to request permission
        result = "prompt";
      }

      // Update cache
      this.permissionCache = { status: result, timestamp: now };
      return result;
    } catch (error) {
      const result = "prompt";
      this.permissionCache = { status: result, timestamp: now };
      return result;
    }
  }

  /**
   * Clear the permission cache (useful after permission changes)
   */
  clearPermissionCache(): void {
    this.permissionCache = { status: null, timestamp: 0 };
  }

  /**
   * Check if notifications are supported on this platform
   */
  isSupported(): boolean {
    // Push notifications are only supported on native platforms in this build
    return this.checkIsNative();
  }

}

export default new PushNotificationManager();
