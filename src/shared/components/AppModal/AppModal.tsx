import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import styles from "./AppModal.module.css";

export type ModalVariant = "dialog" | "sheet" | "fullscreen";

interface AppModalProps {
  open: boolean;
  onClose?: (() => void) | undefined;
  variant?: ModalVariant | undefined;
  closeOnBackdrop?: boolean | undefined;
  closeOnEscape?: boolean | undefined;
  lockScroll?: boolean | undefined;
  titleId?: string | undefined;
  ariaLabel?: string | undefined;
  contentClassName?: string | undefined;
  hidden?: boolean | undefined;
  children: ReactNode;
}

// How long to wait for the exit animation before unmounting (must match CSS)
const EXIT_DURATION_MS = 300;

const AppModal = ({
  open,
  onClose,
  variant = "dialog",
  closeOnBackdrop = true,
  closeOnEscape = true,
  lockScroll = true,
  titleId,
  ariaLabel,
  contentClassName,
  hidden = false,
  children,
}: AppModalProps) => {
  // `mounted` controls whether the DOM node exists
  const [mounted, setMounted] = useState(false);
  // `visible` controls CSS open class (triggers transition)
  const [visible, setVisible] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useBodyScrollLock(mounted && lockScroll);

  // Notify pull-to-refresh hook when a modal opens/closes
  useEffect(() => {
    if (!mounted) return;

    window.dispatchEvent(new CustomEvent("app-modal-opened"));
    return () => {
      window.dispatchEvent(new CustomEvent("app-modal-closed"));
    };
  }, [mounted]);

  useEffect(() => {
    if (!onClose) return;
    const handleCloseAll = () => {
      onClose();
    };
    window.addEventListener("close-all-app-modals", handleCloseAll);
    return () => {
      window.removeEventListener("close-all-app-modals", handleCloseAll);
    };
  }, [onClose]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (open) {
      // 1. Mount the DOM node immediately
      setMounted(true);
      // 2. After one frame (16ms), add the visible class to trigger transition
      timerRef.current = setTimeout(() => {
        setVisible(true);
      }, 16);
    } else {
      // 1. Remove the visible class → CSS exit transition starts
      setVisible(false);
      // 2. After exit animation, unmount the DOM node
      timerRef.current = setTimeout(() => {
        setMounted(false);
      }, EXIT_DURATION_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!mounted || !closeOnEscape || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mounted, closeOnEscape, onClose]);

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (!closeOnBackdrop || !onClose) return;
      e.stopPropagation();
      onClose();
    },
    [closeOnBackdrop, onClose]
  );

  if (!mounted || typeof document === "undefined") return null;

  const isSheet = variant === "sheet";
  const base = isSheet ? "app-sheet" : "app-modal";

  const wrapClass = [
    styles[base],
    visible && styles[`${base}--open`],
    !visible && !open && styles[`${base}--closing`],
    !isSheet && variant === "fullscreen" && styles["app-modal--fullscreen"],
    hidden && styles[`${base}--hidden`],
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className={wrapClass} style={{ zIndex: 20000 }}>
      <div className={styles[`${base}__backdrop`]} onClick={handleBackdropClick} />
      <div className={styles[`${base}__viewport`]} onClick={handleBackdropClick}>
        <div
          className={[styles[`${base}__surface`], contentClassName ?? ""]
            .join(" ")
            .trim()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-label={ariaLabel}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AppModal;
