import React, { useState, useCallback, useRef, useEffect } from "react";
import styles from "./ShelterChangeModal.module.css";
import AppModal from "../../../../shared/components/AppModal/AppModal";
import { submitShelterChange } from "../../../../shared/api/endpoints/shelters";
import { X, MapPin, Upload, Check } from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ShelterType } from "../../../../shared/api/types";

interface ShelterData {
  id: number;
  name?: string | null;
  name_en?: string | null;
  shelter_type?: ShelterType | null;
  elevation?: number | null;
  lat?: number;
  lng?: number;
  wikipedia?: string | null;
}

interface ShelterChangeModalProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  shelterData?: ShelterData | null;
  initialCoords?: { lat: number; lng: number } | null;
  onRequestPickLocation?: () => void;
  showEntityTabs?: boolean;
  activeEntityTab?: "peak" | "shelter";
  onEntityTabChange?: (tab: "peak" | "shelter") => void;
  hidden?: boolean;
}

const SHELTER_TYPE_OPTIONS: ShelterType[] = [
  "alpine_hut",
  "wilderness_hut",
  "shelter",
];

const YES_NO_TAG_KEYS = [
  "toilets",
  "drinking_water",
  "fireplace",
  "heating",
  "electricity",
  "shower",
  "kitchen",
  "lit",
  "outdoor_seating",
  "picnic_table",
  "bench",
  "covered",
  "pets",
  "dog",
] as const;

const NUMBER_TAG_KEYS = ["capacity", "beds"] as const;

const SELECT_TAG_OPTIONS: Record<string, string[]> = {
  internet_access: ["yes", "no", "wifi"],
  smoking: ["yes", "no", "outside", "isolated"],
};

const TEXT_TAG_KEYS = ["website"] as const;

const TEXTAREA_TAG_KEYS = ["description"] as const;

type TagValues = Record<string, string>;

const ShelterChangeModal: React.FC<ShelterChangeModalProps> = ({
  open,
  onClose,
  mode,
  shelterData,
  initialCoords,
  onRequestPickLocation,
  showEntityTabs = false,
  activeEntityTab = "peak",
  onEntityTabChange,
  hidden = false,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [name, setName] = useState(shelterData?.name || "");
  const [nameEn, setNameEn] = useState(shelterData?.name_en || "");
  const [shelterType, setShelterType] = useState(
    shelterData?.shelter_type || ""
  );
  const [lat, setLat] = useState(
    String(initialCoords?.lat ?? shelterData?.lat ?? "")
  );
  const [lng, setLng] = useState(
    String(initialCoords?.lng ?? shelterData?.lng ?? "")
  );
  const [elevation, setElevation] = useState(
    String(shelterData?.elevation ?? "")
  );
  const [wikipedia, setWikipedia] = useState(shelterData?.wikipedia || "");
  const [tags, setTags] = useState<TagValues>({});
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
      trackEvent("interaction", `shelter_change_${mode}_open`);
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

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      setImage(file);
    },
    []
  );

  const handleTagChange = useCallback((key: string, value: string) => {
    setTags((prev) => {
      const next = { ...prev };
      if (value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);

    const formData = new FormData();
    formData.append("type", mode);

    if (mode === "edit") {
      if (!shelterData?.id) {
        setError(t("shelterChange.errorShelterIdMissing"));
        return;
      }
      formData.append("shelter_id", String(shelterData.id));
      if (name) formData.append("name", name);
      if (nameEn) formData.append("name_en", nameEn);
      if (shelterType) formData.append("shelter_type", shelterType);
      if (lat) formData.append("lat", lat);
      if (lng) formData.append("lng", lng);
      if (elevation) formData.append("elevation", elevation);
      if (wikipedia) formData.append("wikipedia", wikipedia);
    } else {
      if (!name) {
        setError(t("shelterChange.errorNameRequired"));
        return;
      }
      if (!shelterType) {
        setError(t("shelterChange.errorTypeRequired"));
        return;
      }
      if (!lat || !lng) {
        setError(t("shelterChange.errorCoordinatesRequired"));
        return;
      }
      formData.append("name", name);
      if (nameEn) formData.append("name_en", nameEn);
      formData.append("shelter_type", shelterType);
      formData.append("lat", lat);
      formData.append("lng", lng);
      if (elevation) formData.append("elevation", elevation);
      if (wikipedia) formData.append("wikipedia", wikipedia);
    }

    if (Object.keys(tags).length > 0) {
      formData.append("tags", JSON.stringify(tags));
    }
    if (reason) formData.append("reason", reason);
    if (email) formData.append("email", email);
    if (image) formData.append("image", image);

    setSubmitting(true);
    const analyticsPrefix = `shelter_change_${mode}`;
    trackEvent("interaction", `${analyticsPrefix}_submit`);
    try {
      await submitShelterChange(formData);
      trackEvent("interaction", `${analyticsPrefix}_success`);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("shelterChange.errorGeneric");
      setError(msg);
      trackEvent("interaction", `${analyticsPrefix}_failed`);
    } finally {
      setSubmitting(false);
    }
  }, [
    mode,
    shelterData,
    name,
    nameEn,
    shelterType,
    lat,
    lng,
    elevation,
    wikipedia,
    tags,
    reason,
    email,
    image,
    t,
    trackEvent,
  ]);

  const isCreate = mode === "create";

  const renderTagSelect = (key: string, value: string, onChange: (v: string) => void) => (
    <div className={styles["shelter-change-modal__tag-field"]} key={key}>
      <label className={`${styles["shelter-change-modal__tag-label"]} typography-label-medium`}>
        {t(`shelterChange.tags.${key}`)}
      </label>
      <select
        className={`${styles["shelter-change-modal__select"]} typography-body-small`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">--</option>
        {SELECT_TAG_OPTIONS[key]?.map((opt) => (
          <option key={opt} value={opt}>
            {t(`shelterChange.tagValues.${opt}`)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <AppModal open={open} onClose={handleClose} variant="dialog" hidden={hidden} contentClassName={styles["shelter-change-modal"]}>
      {success ? (
        <div className={styles["shelter-change-modal__success-msg"]}>
          <h2 className={`${styles["shelter-change-modal__success-title"]} typography-title-medium`}>
            {t("shelterChange.successTitle")}
          </h2>
          <p className={`${styles["shelter-change-modal__success-text"]} typography-body-medium`}>
            {t("shelterChange.successMessage")}
          </p>
          <p className={`${styles["shelter-change-modal__success-subtext"]} typography-body-small`}>
            {t("shelterChange.successSubmessage")}
          </p>
          <button
            className={`${styles["shelter-change-modal__submit-btn"]} typography-button-large`}
            onClick={handleClose}
            style={{ marginTop: 24 }}
          >
            {t("shelterChange.close")}
          </button>
        </div>
      ) : (
        <>
          <div className={styles["shelter-change-modal__header"]}>
            <h2 className={`${styles["shelter-change-modal__header-title"]} typography-title-medium`}>
              {isCreate ? t("shelterChange.createTitle") : t("shelterChange.editTitle")}
            </h2>
            <button className={styles["shelter-change-modal__close-btn"]} onClick={handleClose} aria-label={t("shelterChange.close")}>
              <X size={20} />
            </button>
          </div>

          {showEntityTabs && (
            <div className={styles["shelter-change-modal__tabs"]}>
              <button
                type="button"
                className={`${styles["shelter-change-modal__tab"]} typography-button-medium ${activeEntityTab === "peak" ? styles["shelter-change-modal__tab--active"] : ""}`}
                onClick={() => onEntityTabChange?.("peak")}
              >
                {t("shelterChange.tabPeak")}
              </button>
              <button
                type="button"
                className={`${styles["shelter-change-modal__tab"]} typography-button-medium ${activeEntityTab === "shelter" ? styles["shelter-change-modal__tab--active"] : ""}`}
                onClick={() => onEntityTabChange?.("shelter")}
              >
                {t("shelterChange.tabShelter")}
              </button>
            </div>
          )}

          <div className={styles["shelter-change-modal__form"]}>
            {error && <div className={`${styles["shelter-change-modal__error-msg"]} typography-body-small`}>{error}</div>}

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} ${styles["shelter-change-modal__label--required"]} typography-label-medium`}>
                {t("shelterChange.name")}
              </label>
              <input
                className={`${styles["shelter-change-modal__input"]} typography-body-small`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("shelterChange.namePlaceholder")}
              />
            </div>

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} typography-label-medium`}>
                {t("shelterChange.englishName")}
              </label>
              <input
                className={`${styles["shelter-change-modal__input"]} typography-body-small`}
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder={t("shelterChange.englishNamePlaceholder")}
              />
            </div>

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} ${isCreate ? styles["shelter-change-modal__label--required"] : ""} typography-label-medium`}>
                {t("shelterChange.shelterType")}
              </label>
              <select
                className={`${styles["shelter-change-modal__select"]} typography-body-small`}
                value={shelterType}
                onChange={(e) => setShelterType(e.target.value)}
              >
                <option value="">{t("shelterChange.selectType")}</option>
                {SHELTER_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {t(`shelterDetails.type.${type}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} ${!isCreate ? "" : styles["shelter-change-modal__label--required"]} typography-label-medium`}>
                {t("shelterChange.coordinates")}
              </label>
              <div className={styles["shelter-change-modal__coord-row"]}>
                <div className={styles["shelter-change-modal__coord-field"]}>
                    <input
                      className={`${styles["shelter-change-modal__input"]} typography-body-small`}
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder={t("shelterChange.latitude")}
                    />
                  </div>
                  <div className={styles["shelter-change-modal__coord-field"]}>
                    <input
                      className={`${styles["shelter-change-modal__input"]} typography-body-small`}
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder={t("shelterChange.longitude")}
                    />
                </div>
              </div>
              {onRequestPickLocation ? (
                <button
                  type="button"
                  className={`${styles["shelter-change-modal__pick-map-btn"]} typography-label-medium`}
                  onClick={onRequestPickLocation}
                >
                  <MapPin size={16} />
                  {t("shelterChange.pickOnMap")}
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles["shelter-change-modal__pick-map-btn"]} typography-label-medium`}
                  onClick={() => setShowMapPicker(true)}
                >
                  <MapPin size={16} />
                  {t("shelterChange.pickOnMap")}
                </button>
              )}
              {!isCreate && (
                <span className={`${styles["shelter-change-modal__helper-text"]} typography-label-medium`}>
                  {t("shelterChange.coordsEditHint")}
                </span>
              )}

              {showMapPicker && (
                <div className={styles["shelter-change-modal__map-picker"]}>
                  <div ref={mapContainerRef} className={styles["shelter-change-modal__map-container"]} />
                  <div className={styles["shelter-change-modal__map-picker-actions"]}>
                    <button
                      type="button"
                      className={`${styles["shelter-change-modal__cancel-coords-btn"]} typography-button-medium`}
                      onClick={() => setShowMapPicker(false)}
                    >
                      <X size={16} />
                      {t("shelterChange.close")}
                    </button>
                    {pickerLat && pickerLng && (
                      <button
                        type="button"
                        className={`${styles["shelter-change-modal__accept-coords-btn"]} typography-button-medium`}
                        onClick={() => {
                          setLat(pickerLat);
                          setLng(pickerLng);
                          setShowMapPicker(false);
                        }}
                      >
                        <Check size={16} />
                        {t("shelterChange.acceptLocation")}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} typography-label-medium`}>
                {t("shelterChange.elevation")}
              </label>
              <input
                className={`${styles["shelter-change-modal__input"]} typography-body-small`}
                type="number"
                value={elevation}
                onChange={(e) => setElevation(e.target.value)}
                placeholder={t("shelterChange.elevationPlaceholder")}
              />
            </div>

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} typography-label-medium`}>
                {t("shelterChange.wikipediaUrl")}
              </label>
              <input
                className={`${styles["shelter-change-modal__input"]} typography-body-small`}
                type="url"
                value={wikipedia}
                onChange={(e) => setWikipedia(e.target.value)}
                placeholder={t("shelterChange.wikipediaPlaceholder")}
              />
            </div>

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} typography-label-medium`}>
                {t("shelterChange.tagsTitle")}
              </label>
              <div className={styles["shelter-change-modal__tags-section"]}>
                <p className={`${styles["shelter-change-modal__tags-title"]} typography-label-small`}>
                  {t("shelterChange.tagsHint")}
                </p>
                <div className={styles["shelter-change-modal__tags-grid"]}>
                  {YES_NO_TAG_KEYS.map((key) => (
                    <div className={styles["shelter-change-modal__tag-field"]} key={key}>
                      <label className={`${styles["shelter-change-modal__tag-label"]} typography-label-medium`}>
                        {t(`shelterChange.tags.${key}`)}
                      </label>
                      <select
                        className={`${styles["shelter-change-modal__select"]} typography-body-small`}
                        value={tags[key] || ""}
                        onChange={(e) => handleTagChange(key, e.target.value)}
                      >
                        <option value="">--</option>
                        <option value="yes">{t("shelterChange.tagValues.yes")}</option>
                        <option value="no">{t("shelterChange.tagValues.no")}</option>
                      </select>
                    </div>
                  ))}
                  {NUMBER_TAG_KEYS.map((key) => (
                    <div className={styles["shelter-change-modal__tag-field"]} key={key}>
                      <label className={`${styles["shelter-change-modal__tag-label"]} typography-label-medium`}>
                        {t(`shelterChange.tags.${key}`)}
                      </label>
                      <input
                        className={`${styles["shelter-change-modal__input"]} typography-body-small`}
                        type="number"
                        value={tags[key] || ""}
                        onChange={(e) => handleTagChange(key, e.target.value)}
                      />
                    </div>
                  ))}
                  {Object.keys(SELECT_TAG_OPTIONS).map((key) =>
                    renderTagSelect(key, tags[key] || "", (v) => handleTagChange(key, v))
                  )}
                  {TEXT_TAG_KEYS.map((key) => (
                    <div className={`${styles["shelter-change-modal__tag-field"]} ${styles["shelter-change-modal__tag-field--wide"]}`} key={key}>
                      <label className={`${styles["shelter-change-modal__tag-label"]} typography-label-medium`}>
                        {t(`shelterChange.tags.${key}`)}
                      </label>
                      <input
                        className={`${styles["shelter-change-modal__input"]} typography-body-small`}
                        type="url"
                        value={tags[key] || ""}
                        onChange={(e) => handleTagChange(key, e.target.value)}
                        placeholder={t("shelterChange.tags.websitePlaceholder")}
                      />
                    </div>
                  ))}
                  {TEXTAREA_TAG_KEYS.map((key) => (
                    <div className={`${styles["shelter-change-modal__tag-field"]} ${styles["shelter-change-modal__tag-field--wide"]}`} key={key}>
                      <label className={`${styles["shelter-change-modal__tag-label"]} typography-label-medium`}>
                        {t(`shelterChange.tags.${key}`)}
                      </label>
                      <textarea
                        className={`${styles["shelter-change-modal__textarea"]} typography-body-small`}
                        value={tags[key] || ""}
                        onChange={(e) => handleTagChange(key, e.target.value)}
                        placeholder={t("shelterChange.tags.descriptionPlaceholder")}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} typography-label-medium`}>
                {t("shelterChange.reason")}
              </label>
              <textarea
                className={`${styles["shelter-change-modal__textarea"]} typography-body-small`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("shelterChange.reasonPlaceholder")}
              />
            </div>

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} typography-label-medium`}>
                {t("shelterChange.email")}
              </label>
              <input
                className={`${styles["shelter-change-modal__input"]} typography-body-small`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("shelterChange.emailPlaceholder")}
              />
              <span className={`${styles["shelter-change-modal__helper-text"]} typography-label-medium`}>
                {t("shelterChange.emailHelp")}
              </span>
            </div>

            <div className={styles["shelter-change-modal__field-group"]}>
              <label className={`${styles["shelter-change-modal__label"]} typography-label-medium`}>
                {t("shelterChange.image")}
              </label>
              <div className={styles["shelter-change-modal__file-upload-wrapper"]}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className={styles["shelter-change-modal__file-input-hidden"]}
                  id="shelter-image-upload"
                />
                <label htmlFor="shelter-image-upload" className={`${styles["shelter-change-modal__file-upload-btn"]} typography-label-medium`}>
                  <Upload size={16} />
                  {image ? image.name : t("shelterChange.chooseImage")}
                </label>
                {image && (
                  <button
                    type="button"
                    className={styles["shelter-change-modal__file-remove-btn"]}
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

          <div className={styles["shelter-change-modal__footer"]}>
            <button
              className={`${styles["shelter-change-modal__submit-btn"]} typography-button-large`}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? t("shelterChange.submitting") : isCreate ? t("shelterChange.submitCreate") : t("shelterChange.submitEdit")}
            </button>
          </div>
        </>
      )}
    </AppModal>
  );
};

export default ShelterChangeModal;