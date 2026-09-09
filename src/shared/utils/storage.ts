import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/**
 * Storage utility that uses Capacitor Preferences on native platforms
 * and localStorage on web platforms
 */
class Storage {
  private isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  async get(key: string): Promise<string | null> {
    if (this.isNative()) {
      try {
        const result = await Preferences.get({ key });
        return result.value;
      } catch (error) {
        console.warn(
          `[Storage] Failed to get key "${key}" from Preferences:`,
          error
        );
        return null;
      }
    } else {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn(
          `[Storage] Failed to get key "${key}" from localStorage:`,
          error
        );
        return null;
      }
    }
  }

  async set(key: string, value: string): Promise<void> {
    if (this.isNative()) {
      try {
        await Preferences.set({ key, value });
      } catch (error) {
        console.error(
          `[Storage] Failed to set key "${key}" in Preferences:`,
          error
        );
        throw error;
      }
    } else {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.error(
          `[Storage] Failed to set key "${key}" in localStorage:`,
          error
        );
        throw error;
      }
    }
  }

  async remove(key: string): Promise<void> {
    if (this.isNative()) {
      try {
        await Preferences.remove({ key });
      } catch (error) {
        console.warn(
          `[Storage] Failed to remove key "${key}" from Preferences:`,
          error
        );
      }
    } else {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(
          `[Storage] Failed to remove key "${key}" from localStorage:`,
          error
        );
      }
    }
  }

  async clear(): Promise<void> {
    if (this.isNative()) {
      try {
        await Preferences.clear();
      } catch (error) {
        console.warn(`[Storage] Failed to clear Preferences:`, error);
      }
    } else {
      try {
        localStorage.clear();
      } catch (error) {
        console.warn(`[Storage] Failed to clear localStorage:`, error);
      }
    }
  }
}

export const storage = new Storage();
