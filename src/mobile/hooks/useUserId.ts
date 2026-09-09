import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../shared/context/AuthContext";
import { getInternalUserId } from "../../shared/api/endpoints/user";

export const useUserId = () => {
  const { user, idToken } = useAuth();
  const [internalUserId, setInternalUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInternalUserId = useCallback(async () => {
    if (!user || !idToken) {
      setInternalUserId(null);
      setError(null);
      return;
    }

    // If we already have the internal user ID from the user object, use it
    if (user.internalUserId) {
      setInternalUserId(user.internalUserId);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getInternalUserId();
      if (response.success) {
        setInternalUserId(response.user_id);
      } else {
        setError("Failed to get internal user ID");
      }
    } catch (err) {
      console.error("[useUserId] Error fetching internal user ID:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch internal user ID"
      );
    } finally {
      setLoading(false);
    }
  }, [user, idToken]);

  useEffect(() => {
    fetchInternalUserId();
  }, [fetchInternalUserId]);

  return {
    internalUserId,
    loading,
    error,
    refetch: fetchInternalUserId,
  };
};
