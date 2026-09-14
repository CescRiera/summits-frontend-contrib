import React, { useState, useCallback, useRef, useEffect } from "react";
import styles from "./PeakChangeModal.module.css";
import AppModal from "../../../../shared/components/AppModal/AppModal";
import { submitPeakChange } from "../../../../shared/api/endpoints/peaks";
import { X, MapPin, Upload, Check } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PeakData {
  id: number;
  name: string;
  name_en?: string | null;
  elevation: number;
  lat?: number;
  lng?: number;
  wikipedia?: string | null;
  min_zoom_web?: number | null;
}

interface PeakChangeModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  peakData?: PeakData | null;
  initialCoords?: { lat: number; lng: number } | null;
  onRequestPickLocation?: () => void;
  showEntityTabs?: boolean;
  activeEntityTab?: "peak" | "shelter";
  onEntityTabChange?: (tab: "peak" | "shelter") => void;
  hidden?: boolean;
}

const MIN_ZOOM_OPTIONS = [
  { value: 1, label: "1 – World / continent (Everest, Mont blanc)" },
  { value: 2, label: "2 – World / continent" },
  { value: 3, label: "3 – World / continent" },
  { value: 4, label: "4 – Country / large region (Gran paradiso)" },
  { value: 5, label: "5 – Country / large region" },
  { value: 6, label: "6 – State / province (regional high points)" },
  { value: 7, label: "7 – State / province" },
  { value: 8, label: "8 – City / county (hike-able summits)" },
  { value: 9, label: "9 – City / county" },
  { value: 10, label: "10 – District / valley (minor hills)" },
  { value: 11, label: "11 – District / valley" },
  { value: 12, label: "12 – Neighborhood / local area" },
  { value: 13, label: "13 – Neighborhood / local area" },
  { value: 14, label: "14 – Neighborhood / local area" },
  { value: 15, label: "15 – Extreme close (obscure bumps)" },
];

const PeakChangeModal: React.FC<PeakChangeModalProps> = ({
  open,
  onClose,
  mode,
  peakData,
  initialCoords,
  onRequestPickLocation,
  showEntityTabs = false,
  activeEntityTab = "peak",
  onEntityTabChange,
  hidden = false,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [name, setName] = useState(peakData?.name || "");
  const [nameEn, setNameEn] = useState(peakData?.name_en || "");
  const [lat, setLat] = useState(String(initialCoords?.lat ?? peakData?.lat ?? ""));
  const [lng, setLng] = useState(String(initialCoords?.lng ?? peakData?.lng ?? ""));
  const [elevation, setElevation] = useState(String(peakData?.elevation ?? ""));
  const [minZoomWeb, setMinZoomWeb] = useState(String(peakData?.min_zoom_web ?? ""));
  const [wikipedia, setWikipedia] = useState(peakData?.wikipedia || "");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [pickerLat, setPickerLat] = useState("");
  const [pickerLng, setPickerLng] = useState("");

  useEffect(() => {
    if (open && !hidden) {
      trackEvent("interaction", `peak_change_${mode}_open`);
      setSuccess(false);
      setError(null);
    }
  }, [open, hidden, mode, trackEvent]);

  useEffect(() => {
    if (!initialCoords) return;
    setLat(String(initialCoords.lat));
    setLng(String(initialCoords.lng));
  }, [initialCoords]);

  // Initialize embedded map picker
  useEffect(() => {
    if (!showMapPicker || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.invalidateSize();
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [51.5, -0.09],
      zoom: 5,
      attributionControl: false,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setPickerLat(lat.toFixed(6));
      setPickerLng(lng.toFixed(6));
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current!.getLatLng();
          setPickerLat(pos.lat.toFixed(6));
          setPickerLng(pos.lng.toFixed(6));
        });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [showMapPicker]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);

    const formData = new FormData();
    formData.append("type", mode);

    if (mode === "edit") {
      if (!peakData?.id) {
        setError(t("peakChange.errorPeakIdMissing"));
        return;
      }
      formData.append("peak_id", String(peakData.id));
      if (name) formData.append("name", name);
      if (nameEn) formData.append("name_en", nameEn);
      if (lat) formData.append("lat", lat);
      if (lng) formData.append("lng", lng);
      if (elevation) formData.append("elevation", elevation);
      if (wikipedia) formData.append("wikipedia", wikipedia);
      if (minZoomWeb) formData.append("min_zoom_web", minZoomWeb);
    } else {
      if (!name) {
        setError(t("peakChange.errorNameRequired"));
        return;
      }
      if (!lat || !lng) {
        setError(t("peakChange.errorCoordinatesRequired"));
        return;
      }
      if (!elevation) {
        setError(t("peakChange.errorElevationRequired"));
        return;
      }
      if (!minZoomWeb) {
        setError(t("peakChange.errorMinZoomRequired"));
        return;
      }
      formData.append("name", name);
      if (nameEn) formData.append("name_en", nameEn);
      formData.append("lat", lat);
      formData.append("lng", lng);
      formData.append("elevation", elevation);
      formData.append("min_zoom_web", minZoomWeb);
      if (wikipedia) formData.append("wikipedia", wikipedia);
    }

    if (reason) formData.append("reason", reason);
    if (email) formData.append("email", email);
    if (image) formData.append("image", image);

    setSubmitting(true);
    const analyticsPrefix = `peak_change_${mode}`;
    trackEvent("interaction", `${analyticsPrefix}_submit`);
    try {
      await submitPeakChange(formData);
      trackEvent("interaction", `${analyticsPrefix}_success`);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("peakChange.errorGeneric");
      setError(msg);
      trackEvent("interaction", `${analyticsPrefix}_failed`);
    } finally {
      setSubmitting(false);
    }
  }, [mode, peakData, name, nameEn, lat, lng, elevation, minZoomWeb, wikipedia, reason, email, image, t]);

  const isCreate = mode === "create";

  return (
    <AppModal open={open} onClose={handleClose} variant="fullscreen" hidden={hidden} contentClassName={styles["peak-change-modal"]}>
      {success ? (
        <div className={styles["peak-change-modal__success-msg"]}>
          <h2 className={`${styles["peak-change-modal__success-title"]} typography-title-medium`}>
            {t("peakChange.successTitle")}
          </h2>
          <p className={`${styles["peak-change-modal__success-text"]} typography-body-medium`}>
            {t("peakChange.successMessage")}
          </p>
          <p className={`${styles["peak-change-modal__success-subtext"]} typography-body-small`}>
            {t("peakChange.successSubmessage")}
          </p>
          <button
            className={`${styles["peak-change-modal__submit-btn"]} typography-button-large`}
            onClick={handleClose}
            style={{ marginTop: 24 }}
          >
            {t("peakChange.close")}
          </button>
        </div>
      ) : (
        <>
          <div className={styles["peak-change-modal__header"]}>
            <h2 className={`${styles["peak-change-modal__header-title"]} typography-title-medium`}>
              {isCreate ? t("peakChange.createTitle") : t("peakChange.editTitle")}
            </h2>
            <button className={styles["peak-change-modal__close-btn"]} onClick={handleClose} aria-label={t("peakChange.close")}>
              <X size={20} />
            </button>
          </div>

          {showEntityTabs && (
            <div className={styles["peak-change-modal__tabs"]}>
              <button
                type="button"
                className={`${styles["peak-change-modal__tab"]} typography-button-medium ${activeEntityTab === "peak" ? styles["peak-change-modal__tab--active"] : ""}`}
                onClick={() => onEntityTabChange?.("peak")}
              >
                {t("peakChange.tabPeak")}
              </button>
              <button
                type="button"
                className={`${styles["peak-change-modal__tab"]} typography-button-medium ${activeEntityTab === "shelter" ? styles["peak-change-modal__tab--active"] : ""}`}
                onClick={() => onEntityTabChange?.("shelter")}
              >
                {t("peakChange.tabShelter")}
              </button>
            </div>
          )}

          <div className={styles["peak-change-modal__form"]}>
            {error && <div className={`${styles["peak-change-modal__error-msg"]} typography-body-small`}>{error}</div>}

            <div className={styles["peak-change-modal__field-group"]}>
              <label className={`${styles["peak-change-modal__label"]} ${styles["peak-change-modal__label--required"]} typography-label-medium`}>
                {t("peakChange.name")}
              </label>
              <input
                className={`${styles["peak-change-modal__input"]} typography-body-small`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("peakChange.namePlaceholder")}
              />
            </div>

            <div className={styles["peak-change-modal__field-group"]}>
              <label className={`${styles["peak-change-modal__label"]} typography-label-medium`}>
                {t("peakChange.englishName")}
              </label>
              <input
                className={`${styles["peak-change-modal__input"]} typography-body-small`}
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t("peakChange.englishNamePlaceholder")}
              />
            </div>

            <div className={styles["peak-change-modal__field-group"]}>
              <label className={`${styles["peak-change-modal__label"]} ${!isCreate ? "" : styles["peak-change-modal__label--required"]} typography-label-medium`}>
                {t("peakChange.coordinates")}
              </label>
              <div className={styles["peak-change-modal__coord-row"]}>
                <div className={styles["peak-change-modal__coord-field"]}>
                    <input
                      className={`${styles["peak-change-modal__input"]} typography-body-small`}
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder={t("peakChange.latitude")}
                    />
                  </div>
                  <div className={styles["peak-change-modal__coord-field"]}>
                    <input
                      className={`${styles["peak-change-modal__input"]} typography-body-small`}
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder={t("peakChange.longitude")}
                    />
                </div>
              </div>
              {onRequestPickLocation ? (
                <button
                  type="button"
                  className={`${styles["peak-change-modal__pick-map-btn"]} typography-label-medium`}
                  onClick={onRequestPickLocation}
                >
                  <MapPin size={16} />
                  {t("peakChange.pickOnMap")}
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles["peak-change-modal__pick-map-btn"]} typography-label-medium`}
                  onClick={() => setShowMapPicker(true)}
                >
                  <MapPin size={16} />
                  {t("peakChange.pickOnMap")}
                </button>
              )}
              {!isCreate && (
                <span className={`${styles["peak-change-modal__helper-text"]} typography-label-medium`}>
                  {t("peakChange.coordsEditHint")}
                </span>
              )}

              {showMapPicker && (
                <div className={styles["peak-change-modal__map-picker"]}>
                  <div ref={mapContainerRef} className={styles["peak-change-modal__map-container"]} />
                  <div className={styles["peak-change-modal__map-picker-actions"]}>
                    <button
                      type="button"
                      className={`${styles["peak-change-modal__cancel-coords-btn"]} typography-button-medium`}
                      onClick={() => setShowMapPicker(false)}
                    >
                      <X size={16} />
                      {t("peakChange.close")}
                    </button>
                    {pickerLat && pickerLng && (
                      <button
                        type="button"
                        className={`${styles["peak-change-modal__accept-coords-btn"]} typography-button-medium`}
                        onClick={() => {
                          setLat(pickerLat);
                          setLng(pickerLng);
                          setShowMapPicker(false);
                        }}
                      >
                        <Check size={16} />
                        {t("peakChange.acceptLocation")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={styles["peak-change-modal__field-group"]}>
              <label className={`${styles["peak-change-modal__label"]} ${styles["peak-change-modal__label--required"]} typography-label-medium`}>
                {t("peakChange.elevation")}
              </label>
              <input
                className={`${styles["peak-change-modal__input"]} typography-body-small`}
                type="number"
                value={elevation}
                onChange={(e) => setElevation(e.target.value)}
                placeholder={t("peakChange.elevationPlaceholder")}
              />
            </div>

            {isCreate && (
              <div className={styles["peak-change-modal__field-group"]}>
                <label className={`${styles["peak-change-modal__label"]} ${styles["peak-change-modal__label--required"]} typography-label-medium`}>
                  {t("peakChange.minZoomLevel")}
                </label>
                <select
                  className={`${styles["peak-change-modal__select"]} typography-body-small`}
                  value={minZoomWeb}
                  onChange={(e) => setMinZoomWeb(e.target.value)}
                >
                  <option value="">{t("peakChange.selectVisibility")}</option>
                  {MIN_ZOOM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className={`${styles["peak-change-modal__helper-text"]} typography-label-medium`}>
                  {t("peakChange.minZoomHelp")}
                </span>
              </div>
            )}

            <div className={styles["peak-change-modal__field-group"]}>
              <label className={`${styles["peak-change-modal__label"]} typography-label-medium`}>
                {t("peakChange.wikipediaUrl")}
              </label>
              <input
                className={`${styles["peak-change-modal__input"]} typography-body-small`}
                type="url"
                value={wikipedia}
                onChange={(e) => setWikipedia(e.target.value)}
                placeholder={t("peakChange.wikipediaPlaceholder")}
              />
            </div>

            <div className={styles["peak-change-modal__field-group"]}>
              <label className={`${styles["peak-change-modal__label"]} typography-label-medium`}>
                {t("peakChange.reason")}
              </label>
              <textarea
                className={`${styles["peak-change-modal__textarea"]} typography-body-small`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("peakChange.reasonPlaceholder")}
              />
            </div>

            <div className={styles["peak-change-modal__field-group"]}>
              <label className={`${styles["peak-change-modal__label"]} typography-label-medium`}>
                {t("peakChange.email")}
              </label>
              <input
                className={`${styles["peak-change-modal__input"]} typography-body-small`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("peakChange.emailPlaceholder")}
              />
              <span className={`${styles["peak-change-modal__helper-text"]} typography-label-medium`}>
                {t("peakChange.emailHelp")}
              </span>
            </div>

            <div className={styles["peak-change-modal__field-group"]}>
              <label className={`${styles["peak-change-modal__label"]} typography-label-medium`}>
                {t("peakChange.image")}
              </label>
              <div className={styles["peak-change-modal__file-upload-wrapper"]}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className={styles["peak-change-modal__file-input-hidden"]}
                  id="peak-image-upload"
                />
                <label htmlFor="peak-image-upload" className={`${styles["peak-change-modal__file-upload-btn"]} typography-label-medium`}>
                  <Upload size={16} />
                  {image ? image.name : t("peakChange.chooseImage")}
                </label>
                {image && (
                  <button
                    type="button"
                    className={styles["peak-change-modal__file-remove-btn"]}
                    onClick={() => {
                      setImage(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    aria-label="Remove image"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

          </div>

          <div className={styles["peak-change-modal__footer"]}>
            <button
              className={`${styles["peak-change-modal__submit-btn"]} typography-button-large`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? t("peakChange.submitting") : isCreate ? t("peakChange.submitCreate") : t("peakChange.submitEdit")}
            </button>
          </div>
        </>
      )}
    </AppModal>
  );
};

export default PeakChangeModal;
