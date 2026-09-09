import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";

const isIOSNative = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

const firebaseConfig = {
  apiKey: import.meta.env['VITE_FIREBASE_API_KEY'],
  authDomain: import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'],
  projectId: import.meta.env['VITE_FIREBASE_PROJECT_ID'],
  storageBucket: import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'],
  messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'],
  appId: import.meta.env['VITE_FIREBASE_APP_ID'],
};

const existingApps = getApps();
const app = existingApps.length === 0 
  ? initializeApp(firebaseConfig)
  : existingApps[0];

const auth = getAuth(app);

// Set persistence only for web platforms - native iOS handles persistence automatically
// On iOS native, authentication uses the native Firebase SDK via Capacitor plugin
if (!isIOSNative) {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Silently fail if persistence can't be set
  });
}

export { auth };
