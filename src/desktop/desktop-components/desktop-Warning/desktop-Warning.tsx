import React, { useEffect, useState } from "react";
import { useI18n } from "../../../shared/context/I18nContext";
import QRCode from "qrcode";
import styles from "./desktop-Warning.module.css";
import {
  GOOGLE_PLAY_STORE_URL,
  IOS_APP_STORE_URL,
} from "../../../shared/constants/storeLinks";

const DesktopWarning: React.FC = () => {
  const { t } = useI18n();
  const [androidQrUrl, setAndroidQrUrl] = useState<string>("");
  const [iosQrUrl, setIosQrUrl] = useState<string>("");

  const ANDROID_URL = GOOGLE_PLAY_STORE_URL;
  const IOS_URL = IOS_APP_STORE_URL;

  useEffect(() => {
    const generateQRCodes = async () => {
      try {
        // Generate Android QR Code
        const androidDataUrl = await QRCode.toDataURL(ANDROID_URL, {
          width: 200,
          margin: 2,
          color: {
            dark: "000000",
            light: "#ffffff00",
          },
        });
        setAndroidQrUrl(androidDataUrl);

        // Generate iOS QR Code
        const iosDataUrl = await QRCode.toDataURL(IOS_URL, {
          width: 200,
          margin: 2,
          color: {
            dark: "000000",
            light: "#ffffff00",
          },
        });
        setIosQrUrl(iosDataUrl);
      } catch (error) {
        console.error("Error generating QR codes:", error);
      }
    };

    void generateQRCodes();
  }, []);

  const handleStoreClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <div className={styles["desktop-warning"]}>
      {/* Left Section - Phone Mockup */}
      <div className={styles["desktop-warning__left-section"]}>
        <img
          src="/images/phone_mockup.png"
          alt="Phone Mockup"
          className={styles["desktop-warning__phone-mockup"]}
        />
      </div>

      {/* Right Section - Content and QR Codes */}
      <div className={styles["desktop-warning__right-section"]}>
        <h2
          className={`${styles["desktop-warning__title"]} typography-desktop-headline-large`}
        >
          {t("desktopWarning.title")}
        </h2>
        <p
          className={`${styles["desktop-warning__subtitle"]} typography-desktop-body-medium`}
        >
          {t("desktopWarning.mobileSubtitle")}
        </p>

        {/* QR Codes and Stores Section */}
        <div className={styles["desktop-warning__qr-stores-container"]}>
          {/* Android */}
          {androidQrUrl && (
            <div className={styles["desktop-warning__qr-store-item"]}>
              <div className={styles["desktop-warning__qr-wrapper"]}>
                <img
                  src={androidQrUrl}
                  alt="Android QR Code"
                  className={styles["desktop-warning__qr-image"]}
                />
              </div>
              <button
                onClick={() => handleStoreClick(ANDROID_URL)}
                className={styles["desktop-warning__store-badge"]}
              >
                <img
                  src="/images/available_android.png"
                  alt="Download on Google Play"
                  className={styles["desktop-warning__store-image"]}
                />
              </button>
            </div>
          )}

          {/* iOS */}
          {iosQrUrl && (
            <div className={styles["desktop-warning__qr-store-item"]}>
              <div className={styles["desktop-warning__qr-wrapper"]}>
                <img
                  src={iosQrUrl}
                  alt="iOS QR Code"
                  className={styles["desktop-warning__qr-image"]}
                />
              </div>
              <button
                onClick={() => handleStoreClick(IOS_URL)}
                className={styles["desktop-warning__store-badge"]}
              >
                <img
                  src="/images/available_ios.png"
                  alt="Download on App Store"
                  className={styles["desktop-warning__store-image"]}
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesktopWarning;
