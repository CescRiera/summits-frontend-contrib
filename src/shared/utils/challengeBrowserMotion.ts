const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const challengeBrowserBackdropTransition = {
  duration: 0.18,
  ease,
};

export const challengeBrowserBackdropExitTransition = {
  duration: 0.25,
  ease: [0.4, 0, 1, 1] as [number, number, number, number],
};

export const challengeBrowserSheetTransition = {
  type: "spring" as const,
  stiffness: 340,
  damping: 32,
  mass: 0.92,
};

export const challengeBrowserSheetExitTransition = {
  duration: 0.25,
  ease: [0.4, 0, 1, 1] as [number, number, number, number],
};

export const challengeBrowserDesktopTransition = {
  type: "spring" as const,
  stiffness: 310,
  damping: 28,
  mass: 0.9,
};

export const challengeBrowserItemTransition = {
  duration: 0.16,
  ease,
};
