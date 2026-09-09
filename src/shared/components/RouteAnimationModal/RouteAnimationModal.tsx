import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Video,
  RotateCcw,
  Pause,
  Play,
  Plus,
  Minus,
  Download,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./RouteAnimationModal.module.css";
import AppModal from "../AppModal";
import {
  RouteAnimationService,
  downloadVideo,
  isVideoRecordingSupported,
  type AnimationStats,
} from "../../utils/routeAnimationService";
import type { RouteCoordinate } from "../../api/types/routes";
import type { Map as MapboxMap } from "mapbox-gl";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Media } from "@capacitor-community/media";
import {
  formatDistanceValue,
  formatMetersValue,
} from "../../../mobile/utils/numberFormatting";

export interface RouteAnimationModalProps {
  /** Modal mode: show modal for idle/error states */
  isOpen?: boolean;
  onClose?: () => void;
  /** Map instance (required for standalone mode) */
  map?: MapboxMap | null;
  /** Route coordinates (required for standalone mode) */
  coordinates?: RouteCoordinate[];
  routeName?: string;
  /** Total route distance in km */
  totalDistance?: number;
  /** Total elevation gain in meters */
  totalElevation?: number;
  /** Translation function */
  t: (key: string) => string;
  /** Whether this is desktop version */
  isDesktop?: boolean;
  /** Callback when animation state changes (for hiding/showing UI) */
  onAnimationStateChange?: (isAnimating: boolean) => void;
  /** External state mode: use these props when using with useRouteAnimation hook */
  isAnimating?: boolean;
  isPaused?: boolean;
  isComplete?: boolean;
  currentSpeed?: number;
  stats?: AnimationStats;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onSpeedIncrease?: () => void;
  onSpeedDecrease?: () => void;
  onShare?: () => Promise<boolean> | void;
  onWatchAgain?: () => void;
  onCompletionCancel?: () => void;
  /** Video blob for sharing/downloading (used in external mode) */
  videoBlob?: Blob | null;
  /** Whether to render in a portal (true) or inline (false). Default true for mobile, false for desktop */
  usePortal?: boolean;
}

type AnimationState = "idle" | "preparing" | "animating" | "complete" | "error";
const EMPTY_COORDINATES: RouteCoordinate[] = [];

const RouteAnimationModal: React.FC<RouteAnimationModalProps> = ({
  isOpen = false,
  onClose,
  map,
  coordinates = EMPTY_COORDINATES,
  routeName = "Route",
  totalDistance = 0,
  totalElevation = 0,
  t: tProp,
  isDesktop = false,
  onAnimationStateChange,
  // External state mode props
  isAnimating: externalIsAnimating,
  isPaused: externalIsPaused = false,
  isComplete: externalIsComplete,
  currentSpeed: externalCurrentSpeed,
  stats: externalStats,
  onCancel: externalOnCancel,
  onPause: externalOnPause,
  onResume: externalOnResume,
  onSpeedIncrease: externalOnSpeedIncrease,
  onSpeedDecrease: externalOnSpeedDecrease,
  onShare: externalOnShare,
  onWatchAgain: externalOnWatchAgain,
  onCompletionCancel: externalOnCompletionCancel,
  usePortal = true,
}) => {
  const t = tProp || ((key: string) => key.split(".").pop() || key);
  const isExternalMode = externalIsAnimating !== undefined;

  // Internal state (for standalone mode)
  const [animationState, setAnimationState] = useState<AnimationState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(1);
  const [stats, setStats] = useState<AnimationStats>({
    currentDistance: 0,
    currentElevation: 0,
    totalDistance: totalDistance,
    totalElevation: totalElevation,
  });
  const [showToast, setShowToast] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const animationServiceRef = useRef<RouteAnimationService | null>(null);
  const onAnimationStateChangeRef = useRef(onAnimationStateChange);

  const isSupported = isVideoRecordingSupported();

  // Keep refs updated
  useEffect(() => {
    onAnimationStateChangeRef.current = onAnimationStateChange;
  }, [onAnimationStateChange]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Reset state when modal opens (standalone mode)
  useEffect(() => {
    if (isOpen && !isExternalMode) {
      setAnimationState("idle");
      setErrorMessage(null);
      setCurrentSpeed(1);
      setStats({
        currentDistance: 0,
        currentElevation: 0,
        totalDistance: totalDistance,
        totalElevation: totalElevation,
      });
    }
  }, [isOpen, totalDistance, totalElevation, isExternalMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationServiceRef.current?.running) {
        animationServiceRef.current.cancel();
      }
    };
  }, []);

  // Notify parent when animation state changes (standalone mode)
  useEffect(() => {
    if (!isExternalMode && onAnimationStateChangeRef.current) {
      const isAnimating =
        animationState === "preparing" || animationState === "animating";
      onAnimationStateChangeRef.current(isAnimating);
    }
  }, [animationState, isExternalMode]);

  // Save video to gallery helper (for mobile - saves to gallery, web downloads)
  const saveVideoToGallery = useCallback(
    async (blob: Blob, filename: string): Promise<boolean> => {
      const isNative = Capacitor.isNativePlatform();

      try {
        if (isNative) {
          // Write blob to file in chunks to avoid OutOfMemoryError
          // Each chunk is written separately to avoid large data in Capacitor bridge
          const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks - larger for speed, still safe for bridge
          const blobSize = blob.size;
          const totalChunks = Math.ceil(blobSize / CHUNK_SIZE);

          const fileExtension = ".mp4";
          const fullFilename = filename.endsWith(fileExtension)
            ? filename
            : `${filename}${fileExtension}`;
          const tempPath = `temp/${fullFilename}`;

          // Process and write blob in chunks
          for (let i = 0; i < totalChunks; i++) {
            const start = i * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, blobSize);
            const chunk = blob.slice(start, end);

            // Convert chunk to base64
            const chunkBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === "string") {
                  const base64Data = reader.result.split(",")[1];
                  if (base64Data) {
                    resolve(base64Data);
                  } else {
                    reject(
                      new Error("Failed to extract base64 data from chunk")
                    );
                  }
                } else {
                  reject(new Error("Failed to convert chunk to base64"));
                }
              };
              reader.onerror = reject;
              reader.readAsDataURL(chunk);
            });

            // Write first chunk, append rest
            if (i === 0) {
              await Filesystem.writeFile({
                path: tempPath,
                data: chunkBase64,
                directory: Directory.Cache,
                recursive: true, // Create parent directories if needed
              });
            } else {
              await Filesystem.appendFile({
                path: tempPath,
                data: chunkBase64,
                directory: Directory.Cache,
              });
            }
          }

          // Get the file URI
          const fileInfo = await Filesystem.getUri({
            path: tempPath,
            directory: Directory.Cache,
          });

          // Get albums to find Camera album identifier (required on Android)
          const albumsResponse = await Media.getAlbums();

          // Filter out smart albums - they can't accept content
          const regularAlbums = albumsResponse.albums.filter(
            (album) => album.type !== "smart"
          );

          const cameraAlbum = regularAlbums.find(
            (album) => album.name === "Camera" || album.name === "DCIM"
          );

          // Use Camera album if found, otherwise use first regular album or create one
          let albumIdentifier: string;
          if (cameraAlbum) {
            albumIdentifier = cameraAlbum.identifier;
          } else if (regularAlbums.length > 0) {
            const firstAlbum = regularAlbums[0];
            if (!firstAlbum) {
              throw new Error("No albums available");
            }
            albumIdentifier = firstAlbum.identifier;
          } else {
            // Create Camera album if none exists
            await Media.createAlbum({ name: "Camera" });
            const albumsAfterCreate = await Media.getAlbums();
            // Filter smart albums from the newly fetched list too
            const regularAlbumsAfterCreate = albumsAfterCreate.albums.filter(
              (album) => album.type !== "smart"
            );
            const newCameraAlbum = regularAlbumsAfterCreate.find(
              (album) => album.name === "Camera"
            );
            if (!newCameraAlbum) {
              throw new Error("Failed to create or find Camera album");
            }
            albumIdentifier = newCameraAlbum.identifier;
          }

          // Pass file path instead of base64 data URL (avoids memory issues)
          await Media.saveVideo({
            path: fileInfo.uri,
            albumIdentifier: albumIdentifier,
          });
          return true;
        }

        // For web platform, just download
        downloadVideo(blob, filename);
        return true;
      } catch (error) {
        console.error("[RouteAnimation] Error saving video:", error);
        downloadVideo(blob, filename);
        return false;
      }
    },
    []
  );

  // Download video helper (for desktop - direct download with toast)
  const handleDownload = useCallback((blob: Blob, filename: string) => {
    downloadVideo(blob, filename);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  }, []);

  // Handle download button click
  const handleDownloadClick = useCallback(async () => {
    if (isSharing) return; // Prevent multiple clicks

    setIsSharing(true);
    try {
      const isNative = Capacitor.isNativePlatform();

      // In external mode, call parent's onShare handler (which handles native vs web)
      if (isExternalMode && externalOnShare) {
        const result = await externalOnShare();
        // Check if result is a boolean (success indicator)
        if (result === true) {
          // Show success toast
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
          }, 3000);
        }
        return;
      }

      // Standalone mode: use local videoBlob
      if (!videoBlob) {
        return;
      }

      const sanitizedName = routeName.replace(/[^a-zA-Z0-9-_]/g, "_");
      const filename = `${sanitizedName}-animation`;

      if (isNative) {
        // Native platform: save to gallery
        const success = await saveVideoToGallery(videoBlob, filename);
        if (success) {
          // Show success toast
          setShowToast(true);
          setTimeout(() => {
            setShowToast(false);
          }, 3000);
        }
      } else {
        // Web platform (desktop or mobile web): download
        handleDownload(videoBlob, filename);
      }
    } finally {
      setIsSharing(false);
    }
  }, [
    videoBlob,
    routeName,
    handleDownload,
    saveVideoToGallery,
    isExternalMode,
    externalOnShare,
    isSharing,
  ]);

  // Standalone mode: start animation
  const handleStartAnimation = useCallback(async () => {
    if (!map || !coordinates.length) {
      setErrorMessage(t("routeAnimation.errorNoRoute"));
      setAnimationState("error");
      return;
    }

    setAnimationState("preparing");
    setCurrentSpeed(1);
    onClose?.();

    try {
      const isMobile = !isDesktop;
      let lastProgressUpdate = 0;
      const PROGRESS_THROTTLE_MS = 100;

      animationServiceRef.current = new RouteAnimationService(
        map,
        coordinates,
        {
          routeName: routeName,
          isMobile: isMobile,
          t: t,
          onProgress: (p) => {
            const now = Date.now();
            if (now - lastProgressUpdate >= PROGRESS_THROTTLE_MS) {
              lastProgressUpdate = now;
              if (p > 0) {
                setAnimationState("animating");
              }
            }
          },
          onStatsUpdate: (newStats) => {
            requestAnimationFrame(() => {
              setStats(newStats);
            });
          },
          onSpeedUpdate: (speed) => {
            setCurrentSpeed(speed);
          },
          onComplete: async (blob) => {
            setAnimationState("complete");
            setVideoBlob(blob);
            // Don't auto-share/download, let user choose
          },
          onError: (error) => {
            setErrorMessage(error.message);
            setAnimationState("error");
          },
          onCancel: () => {
            setAnimationState("idle");
          },
        }
      );

      await animationServiceRef.current.start();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t("routeAnimation.errorUnknown")
      );
      setAnimationState("error");
    }
  }, [map, coordinates, t, routeName, isDesktop, onClose, saveVideoToGallery]);

  // Standalone mode: cancel
  const handleCancel = useCallback(() => {
    if (animationServiceRef.current?.running) {
      animationServiceRef.current.cancel();
    }
    setAnimationState("idle");
  }, []);

  // Standalone mode: close modal
  const handleClose = useCallback(() => {
    if (animationServiceRef.current?.running) {
      animationServiceRef.current.cancel();
    }
    onClose?.();
  }, [onClose]);

  // Determine current state and values
  const isAnimating = isExternalMode
    ? externalIsAnimating
    : animationState === "preparing" || animationState === "animating";
  const isPaused = isExternalMode ? externalIsPaused : false;
  const isComplete = isExternalMode ? externalIsComplete : false;
  const showModal = isExternalMode
    ? false
    : isOpen &&
      !isAnimating &&
      (animationState === "idle" || animationState === "error");
  const currentSpeedValue = isExternalMode
    ? externalCurrentSpeed ?? 1
    : currentSpeed;
  const currentStats = isExternalMode
    ? externalStats ?? {
        currentDistance: 0,
        currentElevation: 0,
        totalDistance: totalDistance,
        totalElevation: totalElevation,
      }
    : stats;

  // Typography classes
  const typographyTitle = isDesktop
    ? "typography-desktop-title-large"
    : "typography-title-large";
  const typographyBody = isDesktop
    ? "typography-desktop-body-medium"
    : "typography-body-medium";
  const typographyButton = isDesktop
    ? "typography-desktop-button-medium"
    : "typography-button-medium";

  if (!isMounted) {
    return null;
  }

  const overlayContent = (
    <>
      {/* Modal View (idle/error states) */}
      {showModal && (
        <AppModal
          open={showModal}
          onClose={handleClose}
          variant="dialog"
          ariaLabel={t("routeAnimation.title")}
          contentClassName={`${styles["route-animation-modal__content"]} ${
            isDesktop ? styles["route-animation-modal__content--desktop"] : ""
          }`}
        >
              <div className={styles["route-animation-modal__header"]}>
                <div className={styles["route-animation-modal__title-row"]}>
                  <Video
                    size={24}
                    className={styles["route-animation-modal__icon"]}
                  />
                  <h2
                    className={`${styles["route-animation-modal__title"]} ${typographyTitle}`}
                  >
                    {t("routeAnimation.title")}
                  </h2>
                </div>
                <button
                  className={styles["route-animation-modal__close"]}
                  onClick={handleClose}
                  aria-label={t("common.close")}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles["route-animation-modal__body"]}>
                {!isSupported ? (
                  <div className={styles["route-animation-modal__message"]}>
                    <p className={typographyBody}>
                      {t("routeAnimation.notSupported")}
                    </p>
                  </div>
                ) : animationState === "idle" ? (
                  <div className={styles["route-animation-modal__message"]}>
                    <p className={typographyBody}>
                      {t("routeAnimation.description")}
                    </p>
                    <div
                      className={styles["route-animation-modal__speed-info"]}
                    >
                      <p
                        className={`${styles["route-animation-modal__hint"]} typography-body-small`}
                      >
                        {t("routeAnimation.speedHint") ||
                          "Use the +/- buttons during recording to adjust speed: 1x → 3x → 5x → 10x → 0.5x → 1x"}
                      </p>
                      <p
                        className={`${styles["route-animation-modal__hint"]} typography-body-small`}
                      >
                        {t("routeAnimation.durationHint") ||
                          "Video duration depends on the speeds you choose"}
                      </p>
                    </div>
                  </div>
                ) : animationState === "error" ? (
                  <div className={styles["route-animation-modal__error"]}>
                    <p className={typographyBody}>
                      {t("routeAnimation.error")}
                    </p>
                    {errorMessage && (
                      <p
                        className={`${styles["route-animation-modal__error-message"]} typography-body-small`}
                      >
                        {errorMessage}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <div className={styles["route-animation-modal__actions"]}>
                {animationState === "idle" && isSupported && (
                  <>
                    <button
                      className={`${styles["route-animation-modal__button"]} ${styles["route-animation-modal__button--secondary"]} ${typographyButton}`}
                      onClick={handleClose}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      className={`${styles["route-animation-modal__button"]} ${styles["route-animation-modal__button--primary"]} ${typographyButton}`}
                      onClick={handleStartAnimation}
                    >
                      <Video size={16} />
                      {t("routeAnimation.start")}
                    </button>
                  </>
                )}

                {animationState === "error" && (
                  <>
                    <button
                      className={`${styles["route-animation-modal__button"]} ${styles["route-animation-modal__button--secondary"]} ${typographyButton}`}
                      onClick={handleClose}
                    >
                      {t("common.close")}
                    </button>
                    <button
                      className={`${styles["route-animation-modal__button"]} ${styles["route-animation-modal__button--primary"]} ${typographyButton}`}
                      onClick={handleStartAnimation}
                    >
                      {t("routeAnimation.retry")}
                    </button>
                  </>
                )}

                {!isSupported && (
                  <button
                    className={`${styles["route-animation-modal__button"]} ${styles["route-animation-modal__button--secondary"]} ${typographyButton}`}
                    onClick={handleClose}
                  >
                    {t("common.close")}
                  </button>
                )}
              </div>
        </AppModal>
      )}

      {/* Recording/Completion Overlay - stays visible, only buttons change */}
      <AnimatePresence>
        {(isAnimating || isComplete) && (
          <motion.div
            className={`${styles["route-animation-overlay"]} ${
              !usePortal ? styles["route-animation-overlay--inline"] : ""
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className={styles["route-animation-overlay__card"]}
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className={styles["route-animation-overlay__stats"]}>
                <div className={styles["route-animation-overlay__stat"]}>
                  <span
                    className={`${styles["route-animation-overlay__stat-label"]} typography-button-small`}
                  >
                    {t("routeAnimation.elevationGain") || "Elevation Gain"}
                  </span>
                  <span
                    className={`${styles["route-animation-overlay__stat-value"]} typography-display-medium`}
                  >
                    {formatMetersValue(
                      isComplete
                        ? currentStats.totalElevation
                        : currentStats.currentElevation
                    )}
                  </span>
                  <span
                    className={`${styles["route-animation-overlay__stat-unit"]} typography-label-large`}
                  >
                    m
                  </span>
                </div>
                <div
                  className={styles["route-animation-overlay__stat-divider"]}
                />
                <div className={styles["route-animation-overlay__stat"]}>
                  <span
                    className={`${styles["route-animation-overlay__stat-label"]} typography-button-small`}
                  >
                    {t("routeAnimation.distance") || "Distance"}
                  </span>
                  <span
                    className={`${styles["route-animation-overlay__stat-value"]} typography-display-medium`}
                  >
                    {formatDistanceValue(
                      isComplete
                        ? currentStats.totalDistance
                        : currentStats.currentDistance
                    )}
                  </span>
                  <span
                    className={`${styles["route-animation-overlay__stat-unit"]} typography-label-large`}
                  >
                    km
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Bottom controls row - changes based on completion state */}
            <motion.div
              className={`${styles["route-animation-overlay__controls"]} ${
                isComplete
                  ? styles["route-animation-overlay__controls--center"]
                  : styles["route-animation-overlay__controls--space-between"]
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              {isComplete ? (
                /* Completion buttons: Cancel, Watch Again, Share */
                <>
                  <motion.button
                    onClick={
                      isExternalMode && externalOnCompletionCancel
                        ? externalOnCompletionCancel
                        : isExternalMode && externalOnCancel
                        ? externalOnCancel
                        : handleCancel
                    }
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`${styles["route-animation-overlay__button"]} ${styles["route-animation-overlay__button--completion"]} ${styles["route-animation-overlay__button--completion-cancel"]}`}
                  >
                    <X size={24} />
                  </motion.button>

                  {isExternalMode && externalOnWatchAgain && (
                    <motion.button
                      onClick={externalOnWatchAgain}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`${styles["route-animation-overlay__button"]} ${styles["route-animation-overlay__button--completion"]} ${styles["route-animation-overlay__button--completion-cancel"]}`}
                    >
                      <RotateCcw size={24} />
                    </motion.button>
                  )}

                  {isExternalMode && externalOnShare && (
                    <motion.button
                      onClick={isSharing ? undefined : handleDownloadClick}
                      disabled={isSharing}
                      whileHover={!isSharing ? { scale: 1.1 } : {}}
                      whileTap={!isSharing ? { scale: 0.9 } : {}}
                      className={`${styles["route-animation-overlay__button"]} ${styles["route-animation-overlay__button--completion"]} ${styles["route-animation-overlay__button--completion-cancel"]}`}
                      aria-label={
                        Capacitor.isNativePlatform()
                          ? t("routeAnimation.save") || "Save to Gallery"
                          : t("routeAnimation.download")
                      }
                      aria-disabled={isSharing}
                    >
                      {isSharing ? (
                        <Loader2
                          size={24}
                          className={
                            styles["route-animation-overlay__button--spinning"]
                          }
                        />
                      ) : (
                        <Download size={24} />
                      )}
                    </motion.button>
                  )}
                  {!isExternalMode && videoBlob && (
                    <motion.button
                      onClick={isSharing ? undefined : handleDownloadClick}
                      disabled={isSharing}
                      whileHover={!isSharing ? { scale: 1.1 } : {}}
                      whileTap={!isSharing ? { scale: 0.9 } : {}}
                      className={`${styles["route-animation-overlay__button"]} ${styles["route-animation-overlay__button--completion"]} ${styles["route-animation-overlay__button--completion-cancel"]}`}
                      aria-label={
                        Capacitor.isNativePlatform()
                          ? t("routeAnimation.save") || "Save to Gallery"
                          : t("routeAnimation.download")
                      }
                      aria-disabled={isSharing}
                    >
                      {isSharing ? (
                        <Loader2
                          size={24}
                          className={
                            styles["route-animation-overlay__button--spinning"]
                          }
                        />
                      ) : (
                        <Download size={24} />
                      )}
                    </motion.button>
                  )}
                </>
              ) : (
                /* Recording buttons: Pause/Play, Cancel, Speed */
                <>
                  <div
                    className={
                      styles["route-animation-overlay__controls-group"]
                    }
                  >
                    {/* Pause/Play button */}
                    {externalOnPause && externalOnResume && (
                      <motion.button
                        onClick={isPaused ? externalOnResume : externalOnPause}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`${styles["route-animation-overlay__button"]} ${styles["route-animation-overlay__button--recording"]}`}
                      >
                        {isPaused ? <Play size={20} /> : <Pause size={20} />}
                      </motion.button>
                    )}

                    {/* Cancel button */}
                    <motion.button
                      onClick={isExternalMode ? externalOnCancel : handleCancel}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`${styles["route-animation-overlay__button"]} ${styles["route-animation-overlay__button--recording"]}`}
                    >
                      <X size={20} />
                    </motion.button>
                  </div>

                  {/* Speed controls - right (with +/- buttons) */}
                  {(externalOnSpeedIncrease || externalOnSpeedDecrease) && (
                    <div
                      className={
                        styles["route-animation-overlay__speed-controls"]
                      }
                    >
                      <motion.button
                        onClick={externalOnSpeedDecrease}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`${styles["route-animation-overlay__button"]} ${styles["route-animation-overlay__button--speed-control"]}`}
                        aria-label="Decrease speed"
                      >
                        <Minus size={18} />
                      </motion.button>
                      <motion.button
                        className={`${styles["route-animation-overlay__button"]} ${styles["route-animation-overlay__button--speed"]} typography-button-medium`}
                        disabled
                        style={{ cursor: "default" }}
                      >
                        {currentSpeedValue}x
                      </motion.button>
                      <motion.button
                        onClick={externalOnSpeedIncrease}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className={`${styles["route-animation-overlay__button"]} ${styles["route-animation-overlay__button--speed-control"]}`}
                        aria-label="Increase speed"
                      >
                        <Plus size={18} />
                      </motion.button>
                    </div>
                  )}
                  {!externalOnSpeedIncrease && !externalOnSpeedDecrease && (
                    <motion.div
                      className={styles["route-animation-overlay__speed"]}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span
                        className={`${styles["route-animation-overlay__speed-label"]} typography-button-small`}
                      >
                        {t("routeAnimation.speed") || "Speed"}
                      </span>
                      <span
                        className={`${styles["route-animation-overlay__speed-value"]} typography-display-small`}
                      >
                        {currentSpeedValue}x
                      </span>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast notification for download */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            className={styles["route-animation-toast"]}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles["route-animation-toast__content"]}>
              <Download size={20} />
              <span className={typographyBody}>
                {Capacitor.isNativePlatform()
                  ? t("routeAnimation.videoSavedToGallery") ||
                    "Video saved to your gallery"
                  : t("routeAnimation.videoDownloaded") || "Video downloaded"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (usePortal) {
    return createPortal(overlayContent, document.body);
  }

  return overlayContent;
};

export default RouteAnimationModal;
