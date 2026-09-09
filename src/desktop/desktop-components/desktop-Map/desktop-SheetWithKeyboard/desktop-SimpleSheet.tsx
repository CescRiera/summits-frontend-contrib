import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./desktop-SimpleSheet.module.css";
import { useUnitFormat } from "../../../../shared/hooks/useUnitFormat";

interface PeakData {
  name: string;
  name_en?: string | null;
  elevation: number;
}

interface SimpleSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  peakData?: PeakData | null;
}

// Detent positions (translateY values in pixels)
const DETENTS = {
  CLOSED: 0, // Fully hidden (translateY = 100dvh)
  DEFAULT: 50, // 65dvh visible (translateY = 50dvh)
  MAX: 95, // ~95dvh visible (translateY = 5dvh)
};

const VELOCITY_THRESHOLD = 0.5; // px/ms for fast drag (increased to be less aggressive)
const ANIMATION_DURATION = 500; // ms
const DIRECTION_THRESHOLD = 10; // pixels - minimum movement to determine direction

const SimpleSheet: React.FC<SimpleSheetProps> = ({
  isOpen,
  onClose,
  children,
  peakData,
}) => {
  // Sheet state
  const { formatMeters: formatElevation } = useUnitFormat();
  const [translateY, setTranslateY] = useState(100); // Start fully hidden (100dvh)
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch tracking for velocity calculation
  const [startY, setStartY] = useState(0);
  const [startX, setStartX] = useState(0);
  const [startTranslateY, setStartTranslateY] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [dragStarted, setDragStarted] = useState(false);

  // Refs
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const isDragHandleRef = useRef<boolean>(false);

  // Utility functions
  const getElevationColor = (elevation: number): string => {
    if (elevation >= 8000) return "#000000"; // black
    if (elevation >= 6000) return "#800020"; // burgundy
    if (elevation >= 4000) return "#FF0000"; // red
    if (elevation >= 3000) return "#FF8C00"; // orange
    if (elevation >= 2000) return "#FFD700"; // yellow
    if (elevation >= 1000) return "#008000"; // green
    return "#008000"; // green
  };

  const getElevationIcon = (elevation: number): string => {
    if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
    if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
    if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
    if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
    if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
    if (elevation >= 1000) return "/icons/altitude/ic_mountain_green.png";
    return "/icons/altitude/ic_mountain_green.png";
  };

  // Check if content is scrolled to top
  const isContentAtTop = useCallback(() => {
    return !contentRef.current || contentRef.current.scrollTop <= 0;
  }, []);

  // Calculate nearest detent (convert dvh to translateY values)
  const calculateNearestDetent = useCallback((currentTranslateY: number) => {
    const detentValues = {
      [DETENTS.CLOSED]: 100, // 100dvh (fully hidden)
      [DETENTS.DEFAULT]: 50, // 65dvh visible
      [DETENTS.MAX]: 5, // ~95dvh visible
    };

    const distances = {
      [DETENTS.CLOSED]: Math.abs(
        currentTranslateY - (detentValues[DETENTS.CLOSED] || 100)
      ),
      [DETENTS.DEFAULT]: Math.abs(
        currentTranslateY - (detentValues[DETENTS.DEFAULT] || 50)
      ),
      [DETENTS.MAX]: Math.abs(
        currentTranslateY - (detentValues[DETENTS.MAX] || 5)
      ),
    };

    let nearestDetent = DETENTS.DEFAULT;
    let minDistance = distances[DETENTS.DEFAULT] || Infinity;

    Object.entries(distances).forEach(([detent, distance]) => {
      if (distance < minDistance) {
        minDistance = distance;
        nearestDetent = Number(detent);
      }
    });

    return detentValues[nearestDetent] || 50;
  }, []);

  // Smooth animation to detent
  const snapTo = useCallback(
    (targetTranslateY: number) => {
      setIsAnimating(true);
      setTranslateY(targetTranslateY);

      setTimeout(() => {
        setIsAnimating(false);
        if (targetTranslateY >= 100) {
          onClose();
        }
      }, ANIMATION_DURATION);
    },
    [onClose]
  );

  // Animate to closed position then close (for programmatic close with animation)
  const closeWithAnimation = useCallback(() => {
    snapTo(100);
  }, [snapTo]);

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, isDragHandle: boolean = false) => {
      if (isAnimating) return;

      const touch = e.touches[0];
      if (!touch) return;

      const currentY = touch.clientY;
      const currentX = touch.clientX;
      const currentTime = Date.now();

      setStartY(currentY);
      setStartX(currentX);
      setStartTranslateY(translateY);
      setStartTime(currentTime);
      setDragStarted(false); // Reset drag started flag
      setIsDragging(true);
      isDragHandleRef.current = isDragHandle;
    },
    [isAnimating, translateY]
  );

  // Native touch move handler to avoid passive event listener issues
  const handleNativeTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || isAnimating) return;

      const touch = e.touches[0];
      if (!touch) return;

      const currentY = touch.clientY;
      const currentX = touch.clientX;

      // Calculate movement deltas
      const deltaY = currentY - startY;
      const deltaX = currentX - startX;
      const absDeltaY = Math.abs(deltaY);
      const absDeltaX = Math.abs(deltaX);

      // For content area (not handle), we need to be more careful about when to start dragging
      if (!dragStarted && !isDragHandleRef.current) {
        // Need minimum movement to determine direction
        if (
          absDeltaY < DIRECTION_THRESHOLD &&
          absDeltaX < DIRECTION_THRESHOLD
        ) {
          return; // Not enough movement yet
        }

        // If horizontal movement is greater than vertical, don't start dragging
        if (absDeltaX > absDeltaY) {
          return; // Don't start dragging for horizontal movements
        }

        const isScrollingUp = deltaY < 0; // Negative deltaY means moving up
        const isScrollingDown = deltaY > 0; // Positive deltaY means moving down

        // Check if we're at the default detent (50dvh) and trying to scroll up
        const isAtDefault = translateY >= 45 && translateY <= 55;
        if (isAtDefault && isScrollingUp) {
          // At default detent and scrolling up - let the content scroll naturally
          // Don't start sheet dragging, just return and let the browser handle scrolling
          return;
        }

        // Check if we're at the max detent (5dvh) and trying to scroll up
        const isAtMax = translateY <= 10;
        if (isAtMax && isScrollingUp) {
          // At max detent and scrolling up - let the content scroll naturally
          return;
        }

        // For downward drags on content, only allow if content is at top
        if (isScrollingDown && !isContentAtTop()) {
          // Content is not at top and user is dragging down - let content scroll naturally
          return;
        }

        // For all other cases (upward drags when appropriate, downward drags when content is at top), start dragging
        setDragStarted(true);
      } else if (!dragStarted && isDragHandleRef.current) {
        // Handle area always allows dragging in any direction
        setDragStarted(true);
      }

      // Only prevent default and handle dragging if we've actually started dragging
      if (dragStarted) {
        e.preventDefault();
        e.stopPropagation();

        const deltaVh = (deltaY / window.innerHeight) * 100;

        // Calculate new translateY position (clamp between 5dvh and 100dvh)
        const newTranslateY = Math.max(
          5,
          Math.min(100, startTranslateY + deltaVh)
        );

        // No need to track last position/time since we're not using velocity calculation

        // Update position in real-time
        setTranslateY(newTranslateY);
      } else {
        // Even if we haven't started dragging yet, prevent default for downward movements
        // when content is at top to prevent pull-to-refresh
        const isScrollingDown = deltaY > 0;
        if (isScrollingDown && isContentAtTop()) {
          e.preventDefault();
        }
      }
    },
    [
      isDragging,
      isAnimating,
      startY,
      startX,
      startTranslateY,
      dragStarted,
      translateY,
      isContentAtTop,
    ]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);

    // Only process drag end if we actually started dragging
    if (dragStarted) {
      // Calculate overall velocity from start to end
      const totalTime = Date.now() - startTime;
      const totalDistancePx =
        (translateY - startTranslateY) * (window.innerHeight / 100);
      const overallVelocity = totalTime > 0 ? totalDistancePx / totalTime : 0;

      // Fast downward drag = close
      if (overallVelocity > VELOCITY_THRESHOLD) {
        snapTo(100);
      }
      // Fast upward drag = expand
      else if (overallVelocity < -VELOCITY_THRESHOLD) {
        snapTo(5);
      }
      // Default = snap to nearest detent
      else {
        const nearestDetent = calculateNearestDetent(translateY);
        if (nearestDetent !== undefined) {
          snapTo(nearestDetent);
        }
      }
    }

    // Always reset drag state
    setDragStarted(false);
  }, [
    isDragging,
    dragStarted,
    translateY,
    startTranslateY,
    startTime,
    snapTo,
    calculateNearestDetent,
  ]);

  // Add native touch move listener to avoid passive event issues
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("touchmove", handleNativeTouchMove, {
        passive: false,
      });
      return () => {
        document.removeEventListener("touchmove", handleNativeTouchMove);
      };
    }
    return undefined;
  }, [isDragging, handleNativeTouchMove]);

  // Sync external isOpen prop with internal sheet state
  useEffect(() => {
    if (isOpen) {
      snapTo(50); // 65dvh visible
    } else {
      // Use animated close to match drag behavior
      closeWithAnimation();
    }
  }, [isOpen, snapTo, closeWithAnimation]);

  // Prevent body scroll when sheet is open to avoid pull-to-refresh issues
  useEffect(() => {
    if (isOpen) {
      // Store original overflow style
      const originalOverflow = document.body.style.overflow;
      const originalOverscrollBehavior = document.body.style.overscrollBehavior;

      // Prevent body scroll and pull-to-refresh
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "contain";

      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow;
        document.body.style.overscrollBehavior = originalOverscrollBehavior;
      };
    }
    return undefined;
  }, [isOpen]);

  // Don't render anything if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles["simple-sheet__container"]}>
      {/* Backdrop overlay */}

      {/* The actual sheet */}
      <div
        ref={sheetRef}
        className={styles["simple-sheet__sheet"]}
        style={{
          transform: `translateY(${translateY}dvh)`,
          transition: isAnimating
            ? `transform ${ANIMATION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
            : "none",
        }}
      >
        {/* Header with handle and peak info - entire header is draggable */}
        <div
          ref={handleRef}
          className={styles["sheetHeader"]}
          onTouchStart={(e) => handleTouchStart(e, true)}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles["sheetHandle"]} />
          {peakData && (
            <div className={styles["peakInfo"]}>
              <div
                className={`${styles["peakNames"]} typography-desktop-body-small`}
              >
                <div
                  className={`${styles["peakNameRow"]} typography-desktop-body-small`}
                >
                  <h1
                    className={`${styles["peakName"]} typography-desktop-body-small`}
                  >
                    {peakData.name || peakData.name_en}
                  </h1>
                  <div className={styles["elevationInfo"]}>
                    <img
                      src={getElevationIcon(peakData.elevation)}
                      alt="Elevation icon"
                      className={styles["elevationIcon"]}
                    />
                    <span
                      className={`${styles["elevationValue"]} typography-desktop-label-small`}
                      style={{
                        color: getElevationColor(peakData.elevation),
                      }}
                    >
                      {formatElevation(peakData.elevation)}
                    </span>
                  </div>
                </div>
                {peakData.name_en && peakData.name !== peakData.name_en && (
                  <span
                    className={`${styles["peakNameEn"]} typography-desktop-label-medium`}
                  >
                    {peakData.name_en}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable content area */}
        <div
          ref={contentRef}
          className={styles["simple-sheet__content-area"]}
          onTouchStart={(e) => {
            // Only start touch tracking for potential sheet dragging
            // The actual decision to drag vs scroll happens in handleNativeTouchMove
            handleTouchStart(e, false);
          }}
          onTouchEnd={handleTouchEnd}
        >
          {children || (
            <div style={{ padding: "24px", textAlign: "center" }}>
              Loading...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleSheet;
