import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./SimpleSheet.module.css";
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
  variant?: "default" | "short";
  type?: "peak" | "shelter";
}

const VELOCITY_THRESHOLD = 0.5;
const ANIMATION_DURATION = 500;
const DIRECTION_THRESHOLD = 10;
const DETENT_TOLERANCE = 5;
const CLOSED_TRANSLATE_Y = 100;

const SimpleSheet: React.FC<SimpleSheetProps> = ({
  isOpen,
  onClose,
  children,
  peakData,
  variant = "default",
  type = "peak",
}) => {
  const isShort = variant === "short";
  const { formatMeters } = useUnitFormat();

  // Detent positions (translateY values in pixels)
  const closedDetent = CLOSED_TRANSLATE_Y;
  const defaultDetent = isShort ? 60 : 50; // 40dvh visible if short, else 50dvh
  const maxDetent = isShort ? 15 : 5; // 85dvh visible max if short, else 95dvh

  const CLOSED_DETENT = 0;
  const DEFAULT_DETENT = 1;
  const MAX_DETENT = 2;
  // Sheet state
  const [translateY, setTranslateY] = useState(CLOSED_TRANSLATE_Y); // Start fully hidden (100dvh)
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
  const modalOpenRef = useRef<boolean>(false);

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

  // Match drag thresholds to the active variant's detents.
  const isNearDetent = useCallback((currentTranslateY: number, detent: number) => {
    return Math.abs(currentTranslateY - detent) <= DETENT_TOLERANCE;
  }, []);

  // Calculate nearest detent (convert dvh to translateY values)
  const calculateNearestDetent = useCallback((currentTranslateY: number) => {
    const distances = {
      [CLOSED_DETENT]: Math.abs(currentTranslateY - closedDetent),
      [DEFAULT_DETENT]: Math.abs(currentTranslateY - defaultDetent),
      [MAX_DETENT]: Math.abs(currentTranslateY - maxDetent),
    };

    let nearestDetent = DEFAULT_DETENT;
    let minDistance = distances[DEFAULT_DETENT];

    if (distances[CLOSED_DETENT] < minDistance) {
      minDistance = distances[CLOSED_DETENT];
      nearestDetent = CLOSED_DETENT;
    }
    if (distances[MAX_DETENT] < minDistance) {
      minDistance = distances[MAX_DETENT];
      nearestDetent = MAX_DETENT;
    }

    if (nearestDetent === CLOSED_DETENT) return closedDetent;
    if (nearestDetent === MAX_DETENT) return maxDetent;
    return defaultDetent;
  }, [closedDetent, defaultDetent, maxDetent]);

  // Smooth animation to detent
  const snapTo = useCallback(
    (targetTranslateY: number) => {
      setIsAnimating(true);
      setTranslateY(targetTranslateY);

      setTimeout(() => {
        setIsAnimating(false);
        if (targetTranslateY >= closedDetent) {
          onClose();
        }
      }, ANIMATION_DURATION);
    },
    [closedDetent, onClose]
  );

  // Animate to closed position then close (for programmatic close with animation)
  const closeWithAnimation = useCallback(() => {
    snapTo(closedDetent);
  }, [closedDetent, snapTo]);

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

  // Listen for modal open/close events from AppModal
  useEffect(() => {
    const onOpen = () => { modalOpenRef.current = true; };
    const onClose = () => { modalOpenRef.current = false; };
    window.addEventListener("app-modal-opened", onOpen);
    window.addEventListener("app-modal-closed", onClose);
    return () => {
      window.removeEventListener("app-modal-opened", onOpen);
      window.removeEventListener("app-modal-closed", onClose);
    };
  }, []);

  // Native touch move handler to avoid passive event listener issues
  const handleNativeTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || isAnimating) return;
      if (modalOpenRef.current) return;

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

        const isAtDefault = isNearDetent(translateY, defaultDetent);
        if (isAtDefault && isScrollingUp) {
          // At default detent and scrolling up - let the content scroll naturally
          // Don't start sheet dragging, just return and let the browser handle scrolling
          return;
        }

        const isAtMax = isNearDetent(translateY, maxDetent);
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

        // Clamp to the active variant's expansion and closed bounds.
        const newTranslateY = Math.max(
          maxDetent,
          Math.min(closedDetent, startTranslateY + deltaVh)
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
      closedDetent,
      defaultDetent,
      isNearDetent,
      isContentAtTop,
      maxDetent,
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
        snapTo(closedDetent);
      }
      // Fast upward drag = expand
      else if (overallVelocity < -VELOCITY_THRESHOLD) {
        snapTo(maxDetent);
      }
      // Default = snap to nearest detent
      else {
        const nearestDetentValue = calculateNearestDetent(translateY);
        snapTo(nearestDetentValue);
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
    closedDetent,
    maxDetent,
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
    console.log("[SimpleSheet] isOpen changed:", isOpen, "| peakData:", peakData?.name);
    if (isOpen) {
      snapTo(defaultDetent);
    } else {
      // Use animated close to match drag behavior
      closeWithAnimation();
    }
  }, [isOpen, snapTo, closeWithAnimation, defaultDetent, peakData]);

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

  console.log("[SimpleSheet] rendering: translateY =", translateY, "| isAnimating =", isAnimating, "| defaultDetent =", defaultDetent, "| closedDetent =", closedDetent);

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
              <div className={`${styles["peakNames"]} typography-title-medium`}>
                <div
                  className={`${styles["peakNameRow"]} typography-title-medium`}
                >
                  <h1
                    className={`${styles["peakName"]} typography-title-medium`}
                  >
                    {peakData.name || peakData.name_en}
                  </h1>
                  <div className={styles["elevationInfo"]}>
                    {type === "peak" ? (
                      <>
                        <img
                          src={getElevationIcon(peakData.elevation)}
                          alt="Elevation icon"
                          className={styles["elevationIcon"]}
                        />
                        <span
                          className={`${styles["elevationValue"]} typography-title-medium`}
                          style={{
                            color: getElevationColor(peakData.elevation),
                          }}
                        >
                          {formatMeters(peakData.elevation)}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`${styles["elevationValue"]} typography-title-medium`}
                        style={{ color: "var(--c-gray-700)" }}
                      >
                        {formatMeters(peakData.elevation)}
                      </span>
                    )}
                  </div>
                </div>
                {peakData.name_en && peakData.name !== peakData.name_en && (
                  <span
                    className={`${styles["peakNameEn"]} typography-title-small`}
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
