import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthNative } from "../capacitor-plugins/firebase-auth-native";

export const registerFirebaseUser = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
};

// Check if we're on iOS native platform
const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

/**
 * Creates a User-like object from native SDK user data
 */
const createUserFromNative = (nativeUser: {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}): User => {
  // Create a minimal User object that matches Firebase JS SDK User interface
  // This is a compatibility layer for the native SDK
  return {
    uid: nativeUser.uid,
    email: nativeUser.email,
    emailVerified: nativeUser.emailVerified,
    // Add other required User properties with defaults
    displayName: null,
    photoURL: null,
    phoneNumber: null,
    providerData: [],
    metadata: {} as any,
    providerId: "firebase",
    isAnonymous: false,
    refreshToken: "",
    tenantId: null,
    delete: async () => {},
    getIdToken: async (forceRefresh?: boolean) => {
      const options = forceRefresh !== undefined ? { forceRefresh } : {};
      const result = await FirebaseAuthNative.getIdToken(options);
      return result.token;
    },
    getIdTokenResult: async (forceRefresh?: boolean) => {
      const options = forceRefresh !== undefined ? { forceRefresh } : {};
      const tokenResult = await FirebaseAuthNative.getIdToken(options);
      // Return a minimal token result
      return {
        token: tokenResult.token,
        authTime: new Date().toISOString(),
        issuedAtTime: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 3600000).toISOString(),
        signInProvider: "password",
        signInSecondFactor: null,
        claims: {},
      } as any;
    },
    reload: async () => {},
    toJSON: () => ({}),
  } as User;
};

export const loginFirebaseUser = async (email: string, password: string) => {
  // Use native SDK on iOS
  if (isIOSNative) {
    const result = await FirebaseAuthNative.signInWithEmail({ email, password });
    return createUserFromNative(result.user);
  }
  
  // Use JS SDK on web/Android
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const loginWithCustomToken = async (customToken: string) => {
  // Use native SDK on iOS for session persistence
  if (isIOSNative) {
    const result = await FirebaseAuthNative.signInWithCustomToken({ token: customToken });
    return createUserFromNative(result.user);
  }
  
  // Use JS SDK on web/Android
  const userCredential = await signInWithCustomToken(auth, customToken);
  return userCredential.user;
};

export const logoutFirebaseUser = async () => {
  if (isIOSNative) {
    await FirebaseAuthNative.signOut();
  } else {
    await signOut(auth);
  }
};

export const getIdToken = async (user: User | null) => {
  if (!user) return null;
  
  if (isIOSNative) {
    const result = await FirebaseAuthNative.getIdToken({ forceRefresh: false });
    return result.token;
  } else {
    return await user.getIdToken();
  }
};
