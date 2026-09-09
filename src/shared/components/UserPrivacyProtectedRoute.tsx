import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserStats } from "../api/endpoints/user";
import { isFollowing } from "../api/endpoints/follows";
import AuthLoadingScreen from "./AuthLoadingScreen";

interface UserPrivacyProtectedRouteProps {
  children: React.ReactNode;
  userIdParam?: string; // Name of the route param containing userId (default: "id")
}

const UserPrivacyProtectedRoute: React.FC<UserPrivacyProtectedRouteProps> = ({
  children,
  userIdParam = "id",
}) => {
  const { user, authReady } = useAuth();
  const params = useParams<Record<string, string>>();
  const userId = params[userIdParam];

  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait for auth to be ready
    if (!authReady) {
      return;
    }

    // If no userId in params, require authentication (like ProtectedRoute)
    // This should only happen if UserPrivacyProtectedRoute is used incorrectly
    if (!userId) {
      setCanAccess(!!user);
      setLoading(false);
      return;
    }

    const userIdNum = parseInt(userId, 10);
    if (isNaN(userIdNum)) {
      setCanAccess(false);
      setLoading(false);
      return;
    }

    // If viewing own profile, allow access
    if (user?.internalUserId === userIdNum) {
      setCanAccess(true);
      setLoading(false);
      return;
    }

    // Check privacy and follow status
    const checkAccess = async () => {
      try {
        setLoading(true);
        const [stats, following] = await Promise.all([
          getUserStats(userId),
          user
            ? isFollowing({ user_id: userIdNum })
            : Promise.resolve({
                success: true,
                is_following: false,
                is_pending: false,
                status: null,
              }),
        ]);

        // Allow access if profile is public OR user is following
        const isPublic = !stats.is_private;
        const isFollowingUser = following.is_following;

        setCanAccess(isPublic || isFollowingUser);
      } catch (error) {
        console.error("Failed to check user privacy:", error);
        // On error, deny access to be safe
        setCanAccess(false);
      } finally {
        setLoading(false);
      }
    };

    void checkAccess();
  }, [authReady, userId, user, userIdParam]);

  // Wait for auth to be ready
  if (!authReady) {
    return <AuthLoadingScreen>{null}</AuthLoadingScreen>;
  }

  // If access denied, redirect to user's external profile
  if (canAccess === false && userId) {
    return <Navigate to={`/externalprofile/${userId}`} replace />;
  }

  // Fallback to home if no userId (shouldn't happen, but safety check)
  if (canAccess === false && !loading) {
    return <Navigate to="/" replace />;
  }

  // Allow access (render children immediately to avoid double loading screen)
  return <>{children}</>;
};

export default UserPrivacyProtectedRoute;

