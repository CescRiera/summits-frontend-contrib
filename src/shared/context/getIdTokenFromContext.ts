import { useAuth } from "./AuthContext";

// This function should be called inside a React component or hook
export function getIdTokenFromContext() {
  try {
    // This will only work in a React context (not outside components)
    const { idToken } = useAuth();
    return idToken;
  } catch {
    return null;
  }
}



























































