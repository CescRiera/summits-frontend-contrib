/**
 * Smoothly scrolls a container horizontally by a specified amount
 * @param element - The scrollable element
 * @param direction - "left" or "right"
 * @param scrollAmount - Amount in pixels to scroll (default: 300)
 * @param duration - Animation duration in milliseconds (default: 300)
 */
export const smoothScrollHorizontal = (
  element: HTMLElement | null,
  direction: "left" | "right",
  scrollAmount: number = 300,
  duration: number = 300
): void => {
  if (!element) return;

  const startPosition = element.scrollLeft;
  const targetPosition =
    startPosition + (direction === "left" ? -scrollAmount : scrollAmount);
  const startTime = performance.now();

  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-in-out cubic function for smooth animation
    const ease =
      progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

    element.scrollLeft =
      startPosition + (targetPosition - startPosition) * ease;

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  };

  requestAnimationFrame(animateScroll);
};

