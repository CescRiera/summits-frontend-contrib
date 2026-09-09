import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRouteDetails } from "../api/endpoints/routes";
import { getUserStats } from "../api/endpoints/user";
import { isFollowing } from "../api/endpoints/follows";
import AuthLoadingScreen from "./AuthLoadingScreen";

interface RoutePrivacyProtectedRouteProps {
  children: React.ReactNode;
  routeIdParam?: string; // Name of the route param containing routeId (default: "routeId")
}

const RoutePrivacyProtectedRoute: React.FC<RoutePrivacyProtectedRouteProps> = ({
  children,
  routeIdParam = "routeId",
}) => {
  const { user, authReady } = useAuth();
  const params = useParams<Record<string, string>>();
  const routeId = params[routeIdParam];

  const [loading, setLoading] = useState(true);
  const [canAccess, setCanAccess] = useState<boolean | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<number | null>(null);

  useEffect(() => {
    // Wait for auth to be ready
    if (!authReady) {
      return;
    }

    // If no routeId, deny access
    if (!routeId) {
      setCanAccess(false);
      setLoading(false);
      return;
    }

    // Check privacy and follow status
    const checkAccess = async () => {
      try {
        setLoading(true);
        
        // First, get route details to find the owner
        const routeDetails = await getRouteDetails(routeId);
        
        // If route doesn't have user_id, allow access (public route or legacy data)
        if (!routeDetails.user_id) {
          setCanAccess(true);
          setLoading(false);
          return;
        }

        const userId = routeDetails.user_id;
        setOwnerUserId(userId);

        // If viewing own route, allow access
        if (user?.internalUserId === userId) {
          setCanAccess(true);
          setLoading(false);
          return;
        }

        // Check privacy and follow status
        const [stats, following] = await Promise.all([
          getUserStats(userId.toString()),
          user
            ? isFollowing({ user_id: userId })
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
        console.error("Failed to check route privacy:", error);
        // On error, deny access to be safe
        setCanAccess(false);
      } finally {
        setLoading(false);
      }
    };

    void checkAccess();
  }, [authReady, routeId, user, routeIdParam]);

  // Wait for auth to be ready
  if (!authReady) {
    return <AuthLoadingScreen>{null}</AuthLoadingScreen>;
  }

  // If access denied, redirect to user's external profile
  if (canAccess === false && ownerUserId) {
    return <Navigate to={`/externalprofile/${ownerUserId}`} replace />;
  }

  // Fallback to home if no ownerUserId (shouldn't happen, but safety check)
  if (canAccess === false && !loading) {
    return <Navigate to="/" replace />;
  }

  // Allow access (render children immediately to avoid double loading screen)
  return <>{children}</>;
};

export default RoutePrivacyProtectedRoute;





































