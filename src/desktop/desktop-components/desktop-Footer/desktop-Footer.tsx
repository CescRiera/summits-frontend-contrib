import React from "react";
import { Link } from "react-router-dom";
import styles from "./desktop-Footer.module.css";
import { CURRENT_APP_VERSION } from "../../../shared/constants/appVersion";
import { useI18n } from "../../../shared/context/I18nContext";

const DesktopFooter: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className={styles["desktop-footer"]}>
      <div className={styles["desktop-footer__container"]}>
        <div className={styles["desktop-footer__links"]}>
          <Link
            to="/terms-of-service"
            className={`${styles["desktop-footer__link"]} typography-desktop-body-medium`}
          >
            Terms of Service
          </Link>
          <Link
            to="/privacy-policy"
            className={`${styles["desktop-footer__link"]} typography-desktop-body-medium`}
          >
            Privacy Policy
          </Link>
        </div>

        <div className={styles["desktop-footer__info"]}>
          <div
            className={`${styles["desktop-footer__copy"]} typography-desktop-label-medium`}
          >
            © 2026 SummitsTracker. All rights reserved.
          </div>
          <div
            className={`${styles["desktop-footer__meta"]} typography-desktop-label-medium`}
          >
            {t("profile.version")} {CURRENT_APP_VERSION}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default DesktopFooter;
