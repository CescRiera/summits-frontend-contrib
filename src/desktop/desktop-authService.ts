import { auth } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";

export const registerFirebaseUser = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
};

export const loginFirebaseUser = async (email: string, password: string) => {
  console.log("[Firebase Auth] Attempting to sign in with email:", email);
  
  // Add timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Firebase sign-in timeout after 10 seconds"));
    }, 10000);
  });

  try {
    const signInPromise = signInWithEmailAndPassword(auth, email, password);
    const userCredential = await Promise.race([signInPromise, timeoutPromise]) as any;
    console.log("[Firebase Auth] Sign in successful:", userCredential.user?.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error("[Firebase Auth] Sign in error:", {
      code: error?.code,
      message: error?.message,
      error: error
    });
    throw error;
  }
};

export const logoutFirebaseUser = async () => {
  await signOut(auth);
};

export const getIdToken = async (user: User | null) => {
  if (!user) return null;
  return await user.getIdToken();
};
