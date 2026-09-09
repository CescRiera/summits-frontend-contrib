import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import styles from "./Gallery.module.css";
import { getPeakImages, addPeakImage } from "../../../../shared/api/endpoints/peaks";
import type { PeakImage } from "../../../../shared/api/types";
import useEmblaCarousel from "embla-carousel-react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import ShimmerWrapper from "../../../components/Shimmer/ShimmerWrapper";
import { useI18n } from "../../../../shared/context/I18nContext";
import { Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  usePeakDetailsAnalytics,
  usePeakDetailsView,
} from "../../../../shared/hooks/usePeakDetailsAnalytics";

type GalleryProps = {
  peakId: number;
};

const Gallery: React.FC<GalleryProps> = ({ peakId }) => {
  const [images, setImages] = useState<PeakImage[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: "" });
  const { t } = useI18n();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { trackSectionEvent } = usePeakDetailsAnalytics(
    "mobile",
    "gallery",
    peakId
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });

  useEffect(() => {
    if (!peakId) return;
    setLoading(true);
    getPeakImages(peakId)
      .then((data) => {
        setImages(data.images || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [peakId]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const openLightbox = (index: number) => {
    trackSectionEvent("interaction", "open_lightbox", index);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxSlides = images.map((image) => ({
    src: image.url,
    alt: image.title,
    title: image.title,
  }));

  usePeakDetailsView("mobile", "gallery", !loading, peakId);

  const handleAddImageClick = (action = "add_image_click") => {
    trackSectionEvent("button_click", action);
    fileInputRef.current?.click();
  };

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast({ show: false, message: "" });
    }, 3000);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const result = await addPeakImage(peakId, file);
      if (result.success) {
        trackSectionEvent("interaction", "upload_success");
        showToast(t("gallery.addImageSuccess"));
      } else {
        trackSectionEvent("interaction", "upload_failed");
        showToast(result.message || t("gallery.addImageError"));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      trackSectionEvent("interaction", "upload_failed");
      showToast(t("gallery.addImageError"));
    } finally {
      setUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  return (
    <ShimmerWrapper isLoading={loading} hasData={true}>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      {ReactDOM.createPortal(
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: -20 }}
              exit={{ opacity: 0, y: 50 }}
              className={styles["gallery__toast"]}
            >
              <span className="typography-body-medium">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {!loading && images.length === 0 ? (
        <div className={styles["gallery--empty"]}>
          <button
            className={styles["gallery__add-button"]}
            onClick={() => handleAddImageClick()}
            disabled={uploading}
          >
            {uploading ? (
              <div className="spinner" style={{ width: 24, height: 24 }} />
            ) : (
              <>
                <Camera size={32} />
                <span className="typography-body-medium">
                  {t("gallery.addImage")}
                </span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className={styles["gallery__swiper-container"]}>
          <div className={styles["embla"]} ref={emblaRef}>
            <div className={styles["embla__container"]}>
              {images.map((image, idx) => (
                <div key={idx} className={styles["embla__slide"]}>
                  <div
                    className={styles["gallery__slide-content"]}
                    onClick={() => openLightbox(idx)}
                    role="button"
                    tabIndex={0}
                    aria-label="Open image gallery"
                    style={{ outline: "none" }}
                  >
                    <img
                      src={image.url}
                      alt={image.title}
                      loading="lazy"
                      className={styles["gallery__slide-image"]}
                    />
                    {idx === 0 && (
                      <button
                        className={styles["gallery__replace-button"]}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddImageClick("replace_image_click");
                        }}
                        disabled={uploading}
                      >
                        <Camera size={16} />
                        <span className="typography-label-medium">
                          {t("gallery.replaceImage")}
                        </span>
                      </button>
                    )}
                    <div className={styles["gallery__slide-overlay"]}>
                      <div className={styles["gallery__slide-info"]}>
                        <span
                          className={`${styles["gallery__slide-title"]} typography-title-medium`}
                        >
                          {image.title}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles["image-counter"]} typography-body-small`}>
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}

      <div
        className={
          "fade-lightbox" + (lightboxOpen ? " fade-lightbox--open" : "")
        }
      >
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxSlides}
          render={{
            slideHeader: ({ slide }) => (
              <div
                style={{
                  textAlign: "left",
                  fontWeight: 500,
                  fontSize: 16,
                  color: "rgb(255, 255, 255)",
                  background: "rgba(0, 0, 0, 0.5)",
                  position: "absolute",
                  top: 16,
                  left: 16,
                  right: 64,
                  zIndex: 10,
                }}
              >
                {(slide as any).title}
              </div>
            ),
          }}
          styles={{
            container: { zIndex: 3000, top: "env(safe-area-inset-top)" },
          }}
        />
      </div>
    </ShimmerWrapper>
  );
};

export default Gallery;
