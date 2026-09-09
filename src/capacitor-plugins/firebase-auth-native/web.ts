import { WebPlugin } from "@capacitor/core";
import type { FirebaseAuthNativePlugin } from "./definitions";

export class FirebaseAuthNativeWeb
  extends WebPlugin
  implements FirebaseAuthNativePlugin
{
  async signInWithEmail(_options: {
    email: string;
    password: string;
  }): Promise<{
    user: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
    };
  }> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }

  async signOut(): Promise<void> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }

  async signInWithCustomToken(_options: {
    token: string;
  }): Promise<{
    user: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
    };
  }> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }

  async getIdToken(_options?: {
    forceRefresh?: boolean;
  }): Promise<{ token: string }> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }

  async refreshTokenOnAppLaunch(): Promise<{ token: string }> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }

  async restoreAuthSession(_options: { idToken: string }): Promise<void> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }

  async getCurrentUser(): Promise<{
    user: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
    } | null;
  }> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }

  async addAuthStateListener(): Promise<{ listenerId: string }> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }

  async removeAuthStateListener(_options: {
    listenerId: string;
  }): Promise<void> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }

  async clearNotificationBadges(): Promise<void> {
    throw new Error(
      "FirebaseAuthNative is not available on web platform. Use Firebase JS SDK instead."
    );
  }
}
