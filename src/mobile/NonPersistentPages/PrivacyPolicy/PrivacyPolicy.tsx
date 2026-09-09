import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import styles from "./PrivacyPolicy.module.css";

const PrivacyPolicy: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className={styles["privacy-policy"]}>
      <div className={styles["privacy-policy__header"]}>
        <button
          className={styles["privacy-policy__back-button"]}
          onClick={handleBack}
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className={`${styles["privacy-policy__title"]} typography-headline-medium`}>
          {t("privacy.title")}
        </h1>
      </div>
      <div className={styles["privacy-policy__content"]}>
        <div className={styles["privacy-policy__text"]}>
          <p className={`${styles["privacy-policy__last-updated"]} typography-body-small`}>
            {t("privacy.lastUpdated")}
          </p>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.introduction.title")}
            </h2>
            <p className="typography-body-medium">{t("privacy.introduction.content")}</p>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.dataController.title")}
            </h2>
            <p className="typography-body-medium">{t("privacy.dataController.content")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataController.email")}</li>
              <li className="typography-body-medium">{t("privacy.dataController.website")}</li>
            </ul>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.dataCollection.title")}
            </h2>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataCollection.personalData.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataCollection.personalData.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataCollection.personalData.account")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.personalData.profile")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.personalData.preferences")}</li>
            </ul>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataCollection.activityData.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataCollection.activityData.intro")}</p>
            <h4 className={`${styles["privacy-policy__sub-subsection-title"]} typography-title-medium`}>
              {t("privacy.dataCollection.activityData.fromWikiloc")}
            </h4>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.wikiloc.activity")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.wikiloc.timestamps")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.wikiloc.elevation")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.wikiloc.routeNames")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.wikiloc.activityTypes")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.wikiloc.profile")}</li>
            </ul>
            <h4 className={`${styles["privacy-policy__sub-subsection-title"]} typography-title-medium`}>
              {t("privacy.dataCollection.activityData.fromStrava")}
            </h4>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.strava.activity")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.strava.timestamps")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.strava.elevation")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.strava.coordinates")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.strava.activityTypes")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.strava.profile")}</li>
            </ul>
            <h4 className={`${styles["privacy-policy__sub-subsection-title"]} typography-title-medium`}>
              {t("privacy.dataCollection.activityData.fromGarmin")}
            </h4>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.garmin.activity")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.garmin.gps")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.garmin.elevation")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.garmin.summaries")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.garmin.location")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.activityData.garmin.profile")}</li>
            </ul>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataCollection.technicalData.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataCollection.technicalData.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataCollection.technicalData.device")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.technicalData.ip")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.technicalData.browser")}</li>
              <li className="typography-body-medium">{t("privacy.dataCollection.technicalData.logs")}</li>
            </ul>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.dataUsage.title")}
            </h2>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataUsage.purposes.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataUsage.purposes.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataUsage.purposes.service")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.purposes.peakIdentification")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.purposes.progress")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.purposes.statistics")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.purposes.community")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.purposes.communication")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.purposes.improvement")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.purposes.security")}</li>
            </ul>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataUsage.legalBasis.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataUsage.legalBasis.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataUsage.legalBasis.consent")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.legalBasis.contract")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.legalBasis.legitimate")}</li>
              <li className="typography-body-medium">{t("privacy.dataUsage.legalBasis.legal")}</li>
            </ul>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.dataSharing.title")}
            </h2>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataSharing.thirdParties.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataSharing.thirdParties.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataSharing.thirdParties.serviceProviders")}</li>
              <li className="typography-body-medium">{t("privacy.dataSharing.thirdParties.analytics")}</li>
              <li className="typography-body-medium">{t("privacy.dataSharing.thirdParties.cloud")}</li>
            </ul>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataSharing.publicData.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataSharing.publicData.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataSharing.publicData.statistics")}</li>
              <li className="typography-body-medium">{t("privacy.dataSharing.publicData.username")}</li>
              <li className="typography-body-medium">{t("privacy.dataSharing.publicData.rankings")}</li>
              <li className="typography-body-medium">{t("privacy.dataSharing.publicData.profile")}</li>
            </ul>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataSharing.legal.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataSharing.legal.content")}</p>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.dataStorage.title")}
            </h2>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataStorage.location.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataStorage.location.content")}</p>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataStorage.retention.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataStorage.retention.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataStorage.retention.active")}</li>
              <li className="typography-body-medium">{t("privacy.dataStorage.retention.deleted")}</li>
              <li className="typography-body-medium">{t("privacy.dataStorage.retention.legal")}</li>
            </ul>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.dataStorage.security.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.dataStorage.security.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.dataStorage.security.encryption")}</li>
              <li className="typography-body-medium">{t("privacy.dataStorage.security.access")}</li>
              <li className="typography-body-medium">{t("privacy.dataStorage.security.infrastructure")}</li>
              <li className="typography-body-medium">{t("privacy.dataStorage.security.updates")}</li>
            </ul>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.userRights.title")}
            </h2>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.userRights.access.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.userRights.access.content")}</p>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.userRights.rectification.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.userRights.rectification.content")}</p>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.userRights.erasure.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.userRights.erasure.content")}</p>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.userRights.restriction.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.userRights.restriction.content")}</p>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.userRights.portability.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.userRights.portability.content")}</p>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.userRights.objection.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.userRights.objection.content")}</p>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.userRights.withdraw.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.userRights.withdraw.content")}</p>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.userRights.complaint.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.userRights.complaint.content")}</p>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.cookies.title")}
            </h2>
            <p className="typography-body-medium">{t("privacy.cookies.intro")}</p>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.cookies.types.title")}
            </h3>
            <ul>
              <li className="typography-body-medium">{t("privacy.cookies.types.essential")}</li>
              <li className="typography-body-medium">{t("privacy.cookies.types.analytics")}</li>
              <li className="typography-body-medium">{t("privacy.cookies.types.functional")}</li>
            </ul>
            <h3 className={`${styles["privacy-policy__subsection-title"]} typography-title-medium`}>
              {t("privacy.cookies.management.title")}
            </h3>
            <p className="typography-body-medium">{t("privacy.cookies.management.content")}</p>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.children.title")}
            </h2>
            <p className="typography-body-medium">{t("privacy.children.content")}</p>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.international.title")}
            </h2>
            <p className="typography-body-medium">{t("privacy.international.content")}</p>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.changes.title")}
            </h2>
            <p className="typography-body-medium">{t("privacy.changes.content")}</p>
          </section>
          <section className={styles["privacy-policy__section"]}>
            <h2 className={`${styles["privacy-policy__section-title"]} typography-title-large`}>
              {t("privacy.contact.title")}
            </h2>
            <p className="typography-body-medium">{t("privacy.contact.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("privacy.contact.email")}</li>
              <li className="typography-body-medium">{t("privacy.contact.website")}</li>
              <li className="typography-body-medium">{t("privacy.contact.support")}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

















