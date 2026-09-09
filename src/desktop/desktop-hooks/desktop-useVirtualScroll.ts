import { useState, useEffect, useRef, useCallback } from "react";

interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  bufferSize?: number;
}

interface VirtualScrollResult {
  visibleStartIndex: number;
  visibleEndIndex: number;
  totalHeight: number;
  offsetY: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const useVirtualScroll = (
  itemCount: number,
  options: UseVirtualScrollOptions
): VirtualScrollResult => {
  const { itemHeight, containerHeight, bufferSize = 5 } = options;
  const scrollRef = useRef<HTMLDivElement>(null);

  const [scrollTop, setScrollTop] = useState(0);

  const visibleStartIndex = Math.max(
    0,
    Math.floor(scrollTop / itemHeight) - bufferSize
  );
  const visibleEndIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
  );

  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleStartIndex * itemHeight;

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);
  }, []);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll, { passive: true });
      return () => scrollElement.removeEventListener("scroll", handleScroll);
    }
    return undefined;
  }, [handleScroll]);

  return {
    visibleStartIndex,
    visibleEndIndex,
    totalHeight,
    offsetY,
    scrollRef,
  };
};
