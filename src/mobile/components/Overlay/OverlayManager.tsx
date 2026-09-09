import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./OverlayManager.module.css";

type OverlayEntry = {
  key: string;
  hidden: boolean;
};

type OverlayContextValue = {
  open: (key: string) => void;
  close: (key: string) => void;
  bringToTop: (key: string) => void;
  has: (key: string) => boolean;
  topKey: () => string | undefined;
  getContainerForKey: (key: string) => HTMLElement | null;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function useOverlayManager(): OverlayContextValue {
  const ctx = useContext(OverlayContext);
  if (!ctx)
    throw new Error("useOverlayManager must be used within OverlayProvider");
  return ctx;
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<OverlayEntry[]>([]);
  const containersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const stackRef = useRef<OverlayEntry[]>(stack);
  stackRef.current = stack;

  const open = useCallback((key: string) => {
    setStack((prev) => {
      // If exists, just bring to top and update node
      const idx = prev.findIndex((e) => e.key === key);
      if (idx !== -1) {
        const updated = prev.map(
          (e, i): OverlayEntry =>
            i === idx
              ? { key: e.key, hidden: false }
              : { key: e.key, hidden: true }
        );
        const entry = updated[idx] as OverlayEntry;
        const without: OverlayEntry[] = updated.filter((_, i) => i !== idx);
        return [...without, entry];
      }
      const next: OverlayEntry[] = prev.map((e) => ({
        key: e.key,
        hidden: true,
      }));
      next.push({ key, hidden: false });
      return next;
    });
  }, []);

  const close = useCallback((key: string) => {
    setStack((prev) => {
      const next = prev.filter((e) => e.key !== key);
      if (next.length > 0) {
        // Unhide new top
        const top = next[next.length - 1] as OverlayEntry;
        next[next.length - 1] = { ...top, hidden: false };
      }
      return next;
    });
    queueMicrotask(() => {
      containersRef.current.delete(key);
    });
  }, []);

  const bringToTop = useCallback((key: string) => {
    setStack((prev) => {
      const idx = prev.findIndex((e) => e.key === key);
      if (idx === -1) return prev;
      const updated: OverlayEntry[] = prev.map(
        (e): OverlayEntry => ({ key: e.key, hidden: true })
      );
      const entry = updated[idx] as OverlayEntry;
      const without: OverlayEntry[] = updated.filter((_, i) => i !== idx);
      return [...without, { key: entry.key, hidden: false }];
    });
  }, []);

  const has = useCallback(
    (key: string) => stackRef.current.some((e) => e.key === key),
    []
  );
  const topKey = useCallback(() => stackRef.current.at(-1)?.key, []);
  const getContainerForKey = useCallback(
    (key: string) => containersRef.current.get(key) ?? null,
    []
  );

  const value = useMemo<OverlayContextValue>(
    () => ({ open, close, bringToTop, has, topKey, getContainerForKey }),
    [open, close, bringToTop, has, topKey, getContainerForKey]
  );

  return (
    <OverlayContext.Provider value={value}>
      {children}
      <div className={styles["overlay-root"]} aria-live="polite">
        {stack.map((entry) => (
          <div
            key={entry.key}
            className={`${styles["overlay-root__page"]} ${
              entry.hidden ? styles["overlay-root__page--hidden"] : ""
            }`}
            ref={(el) => {
              if (!el) return;
              const container = containersRef.current.get(entry.key);
              if (!container) {
                containersRef.current.set(entry.key, el as HTMLDivElement);
              } else if (container !== el) {
                el.replaceWith(container);
              }
            }}
          />
        ))}
      </div>
    </OverlayContext.Provider>
  );
}

export function OverlayRouteBridge({
  overlayKey,
  children,
}: {
  overlayKey: string;
  children: ReactNode;
}) {
  const { open, close, bringToTop, getContainerForKey } = useOverlayManager();
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    open(overlayKey);
    bringToTop(overlayKey);
    const el = getContainerForKey(overlayKey);
    setContainer(el);
  }, [overlayKey, open, bringToTop, getContainerForKey]);
  useEffect(() => () => close(overlayKey), [overlayKey, close]);
  if (!container) return null;
  return createPortal(children, container);
}
