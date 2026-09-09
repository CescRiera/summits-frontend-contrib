import React, { useCallback, useEffect, useMemo, useState } from "react";
import AppModal from "../AppModal";
import styles from "./ClubLogoCropperModal.module.css";

const CROP_SIZE = 280;
const OUTPUT_SIZE = 640;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface DragState {
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startOffsetX: number;
  startOffsetY: number;
}

interface ClubLogoCropperModalProps {
  open: boolean;
  imageSrc: string | null;
  imageName: string;
  title: string;
  description: string;
  zoomLabel: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onComplete: (file: File, previewUrl: string) => void;
}

const loadImageElement = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const ClubLogoCropperModal: React.FC<ClubLogoCropperModalProps> = ({
  open,
  imageSrc,
  imageName,
  title,
  description,
  zoomLabel,
  cancelLabel,
  confirmLabel,
  onCancel,
  onComplete,
}) => {
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !imageSrc) return;
    let cancelled = false;

    void loadImageElement(imageSrc)
      .then((image) => {
        if (cancelled) return;
        setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
        setZoom(MIN_ZOOM);
        setOffsetX(0);
        setOffsetY(0);
      })
      .catch(() => {
        if (cancelled) return;
        setNaturalSize({ width: 0, height: 0 });
      });

    return () => {
      cancelled = true;
    };
  }, [open, imageSrc]);

  const displayMetrics = useMemo(() => {
    if (naturalSize.width <= 0 || naturalSize.height <= 0) return null;

    const baseScale = Math.max(
      CROP_SIZE / naturalSize.width,
      CROP_SIZE / naturalSize.height
    );
    const effectiveScale = baseScale * zoom;
    const width = naturalSize.width * effectiveScale;
    const height = naturalSize.height * effectiveScale;
    const maxOffsetX = Math.max(0, (width - CROP_SIZE) / 2);
    const maxOffsetY = Math.max(0, (height - CROP_SIZE) / 2);

    return {
      baseScale,
      effectiveScale,
      width,
      height,
      maxOffsetX,
      maxOffsetY,
    };
  }, [naturalSize.height, naturalSize.width, zoom]);

  const clampOffsets = useCallback(
    (nextX: number, nextY: number, nextZoom = zoom) => {
      if (naturalSize.width <= 0 || naturalSize.height <= 0) {
        return { x: 0, y: 0 };
      }

      const baseScale = Math.max(
        CROP_SIZE / naturalSize.width,
        CROP_SIZE / naturalSize.height
      );
      const effectiveScale = baseScale * nextZoom;
      const width = naturalSize.width * effectiveScale;
      const height = naturalSize.height * effectiveScale;
      const maxOffsetX = Math.max(0, (width - CROP_SIZE) / 2);
      const maxOffsetY = Math.max(0, (height - CROP_SIZE) / 2);

      return {
        x: clamp(nextX, -maxOffsetX, maxOffsetX),
        y: clamp(nextY, -maxOffsetY, maxOffsetY),
      };
    },
    [naturalSize.height, naturalSize.width, zoom]
  );

  const handleZoomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextZoom = Number(event.target.value);
    const clamped = clampOffsets(offsetX, offsetY, nextZoom);
    setZoom(nextZoom);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!displayMetrics) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startOffsetX: offsetX,
      startOffsetY: offsetY,
    });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startPointerX;
    const deltaY = event.clientY - dragState.startPointerY;
    const clamped = clampOffsets(
      dragState.startOffsetX + deltaX,
      dragState.startOffsetY + deltaY
    );
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  const clearDrag = () => {
    setDragState(null);
  };

  const handleConfirm = async () => {
    if (!imageSrc || !displayMetrics || isSaving) return;

    try {
      setIsSaving(true);
      const image = await loadImageElement(imageSrc);

      const sourceSize = CROP_SIZE / displayMetrics.effectiveScale;
      const rawSourceX =
        ((displayMetrics.width - CROP_SIZE) / 2 - offsetX) /
        displayMetrics.effectiveScale;
      const rawSourceY =
        ((displayMetrics.height - CROP_SIZE) / 2 - offsetY) /
        displayMetrics.effectiveScale;

      const sourceX = clamp(rawSourceX, 0, image.naturalWidth - sourceSize);
      const sourceY = clamp(rawSourceY, 0, image.naturalHeight - sourceSize);

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      const previewUrl = canvas.toDataURL("image/jpeg", 0.9);
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (nextBlob) => {
            if (!nextBlob) {
              reject(new Error("Failed to create cropped image"));
              return;
            }
            resolve(nextBlob);
          },
          "image/jpeg",
          0.9
        );
      });

      const fileName = imageName.replace(/\.[^.]+$/, "");
      const croppedFile = new File([blob], `${fileName}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      onComplete(croppedFile, previewUrl);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onCancel}
      variant="dialog"
      ariaLabel={title}
      contentClassName={styles["club-logo-cropper"]}
    >
      <div className={styles["club-logo-cropper__header"]}>
        <h3 className="typography-title-medium">{title}</h3>
        <p className="typography-body-small">{description}</p>
      </div>

      <div
        className={styles["club-logo-cropper__frame"]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={clearDrag}
        onPointerCancel={clearDrag}
      >
        {imageSrc && displayMetrics ? (
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            className={styles["club-logo-cropper__image"]}
            style={{
              width: `${displayMetrics.width}px`,
              height: `${displayMetrics.height}px`,
              left: `calc(50% + ${offsetX}px)`,
              top: `calc(50% + ${offsetY}px)`,
            }}
          />
        ) : null}
        <div className={styles["club-logo-cropper__mask"]} aria-hidden="true" />
      </div>

      <div className={styles["club-logo-cropper__controls"]}>
        <label className="typography-label-medium" htmlFor="club-logo-cropper-zoom">
          {zoomLabel}
        </label>
        <input
          id="club-logo-cropper-zoom"
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={handleZoomChange}
        />
      </div>

      <div className={styles["club-logo-cropper__actions"]}>
        <button
          type="button"
          className={`${styles["club-logo-cropper__button"]} ${styles["club-logo-cropper__button--secondary"]} typography-button-small`}
          onClick={onCancel}
          disabled={isSaving}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`${styles["club-logo-cropper__button"]} ${styles["club-logo-cropper__button--primary"]} typography-button-small`}
          onClick={handleConfirm}
          disabled={isSaving || !imageSrc}
        >
          {confirmLabel}
        </button>
      </div>
    </AppModal>
  );
};

export default ClubLogoCropperModal;
