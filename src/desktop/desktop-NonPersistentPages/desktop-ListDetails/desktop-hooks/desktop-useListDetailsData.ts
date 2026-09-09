import { useState, useEffect, useCallback, useRef } from "react";
import { getPeakListDetails } from "../../../../shared/api/endpoints/peakLists";
import type { PeakListDetailsResponse } from "../../../../shared/api/types";

export const useListDetailsData = (id: string | undefined, userId?: string) => {
  const [listData, setListData] = useState<PeakListDetailsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFirstLoad = useRef(true);

  const fetchListDetails = useCallback(async () => {
    if (!id) {
      setError("Invalid list ID");
      setLoading(false);
      return;
    }

    try {
      if (isFirstLoad.current) {
        setLoading(true);
      }
      setError(null);
      const data = await getPeakListDetails(parseInt(id), userId);
      setListData(data);
      isFirstLoad.current = false;
    } catch (err) {
      console.error("Error fetching list details:", err);
      setError("Failed to load list details");
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    fetchListDetails();
  }, [fetchListDetails]);

  return {
    listData,
    loading,
    error,
    refetch: fetchListDetails,
  };
};
