import React from "react";
import { Link } from "react-router-dom";
import styles from "./Footer.module.css";
import { CURRENT_APP_VERSION } from "../../../shared/constants/appVersion";
import { useI18n } from "../../../shared/context/I18nContext";

const Footer: React.FC = () => {
  const { t } = useI18n();

  return (
    <footer className={styles["mobile-footer"]}>
      <div className={styles["mobile-footer__container"]}>
        <div className={styles["mobile-footer__links"]}>
          <Link to="/terms-of-service" className={`${styles["mobile-footer__link"]} typography-body-small`}>
            Terms of Service
          </Link>
          <Link to="/privacy-policy" className={`${styles["mobile-footer__link"]} typography-body-small`}>
            Privacy Policy
          </Link>
        </div>

        <div className={styles["mobile-footer__bottom"]}>
          <div className={`${styles["mobile-footer__copy"]} typography-body-small`}>
            © 2026 SummitsTracker. All rights reserved.
          </div>
          <div className={`${styles["mobile-footer__meta"]} typography-body-small`}>
            {t("profile.version")} {CURRENT_APP_VERSION}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
