import { useCallback, useRef } from "react";

export const useLatestSearchToken = () => {
  const latestSearchTokenRef = useRef(0);

  const nextSearchToken = useCallback(() => {
    latestSearchTokenRef.current += 1;
    return latestSearchTokenRef.current;
  }, []);

  const invalidateSearchToken = useCallback(() => {
    latestSearchTokenRef.current += 1;
  }, []);

  const isLatestSearchToken = useCallback(
    (token: number) => token === latestSearchTokenRef.current,
    []
  );

  return {
    nextSearchToken,
    invalidateSearchToken,
    isLatestSearchToken,
  };
};
