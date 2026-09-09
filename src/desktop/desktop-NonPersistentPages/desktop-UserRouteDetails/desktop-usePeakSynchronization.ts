import { useCallback, useRef, useEffect, useMemo } from "react";
import type { Swiper as SwiperType } from "swiper";

interface UsePeakSynchronizationProps {
  selectedPeakId: number | null;
  onPeakSelect: (peakId: number) => void;
  peaks: Array<{
    id: string | number;
    lng?: number;
    lat?: number;
    name?: string;
  }>;
  onFlyToPeak?: (peak: { lng?: number; lat?: number; name?: string }) => void; // Callback for flyTo
}

export const usePeakSynchronization = ({
  selectedPeakId,
  onPeakSelect,
  peaks,
  onFlyToPeak,
}: UsePeakSynchronizationProps) => {
  const swiperRef = useRef<SwiperType | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const isUpdatingFromSwiper = useRef(false);
  const isUpdatingFromMap = useRef(false);

  /**
   * Find the index of the selected peak - memoized for performance
   */
  const selectedIndex = useMemo((): number => {
    if (!selectedPeakId) return 0;
    const index = peaks.findIndex((peak) => Number(peak.id) === selectedPeakId);
    return index >= 0 ? index : 0;
  }, [selectedPeakId, peaks]);

  /**
   * Handle swiper slide change
   */
  const handleSwiperSlideChange = useCallback(
    (swiper: SwiperType) => {

      if (isUpdatingFromMap.current) {
        return;
      }

      isUpdatingFromSwiper.current = true;
      const activeIndex = swiper.activeIndex;
      const peak = peaks[activeIndex];


      if (peak) {
        onPeakSelect(Number(peak.id));

        // Call the flyTo callback if provided
        if (onFlyToPeak) {
          onFlyToPeak(peak);
        }
      }

      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingFromSwiper.current = false;
      }, 100);
    },
    [peaks, onPeakSelect, onFlyToPeak]
  );

  /**
   * Handle map peak click
   */
  const handleMapPeakClick = useCallback(
    (peakId: number) => {
      if (isUpdatingFromSwiper.current) {
        return;
      }

      isUpdatingFromMap.current = true;
      onPeakSelect(peakId);

      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingFromMap.current = false;
      }, 100);
    },
    [onPeakSelect]
  );

  /**
   * Update swiper when selected peak changes from map
   */
  useEffect(() => {
    if (swiperRef.current && selectedPeakId && !isUpdatingFromSwiper.current) {
      if (swiperRef.current.activeIndex !== selectedIndex) {
        swiperRef.current.slideTo(selectedIndex, 300);
      }
    }
  }, [selectedPeakId, selectedIndex]);

  /**
   * Set swiper reference
   */
  const setSwiperRef = useCallback((swiper: SwiperType | null) => {
    swiperRef.current = swiper;
  }, []);

  /**
   * Set map reference for potential future use
   */
  const setMapRef = useCallback((map: mapboxgl.Map | null) => {
    mapRef.current = map;
  }, []);

  return {
    handleSwiperSlideChange,
    handleMapPeakClick,
    setSwiperRef,
    setMapRef,
    getSelectedIndex: () => selectedIndex, // Provide getter for backward compatibility
  };
};
