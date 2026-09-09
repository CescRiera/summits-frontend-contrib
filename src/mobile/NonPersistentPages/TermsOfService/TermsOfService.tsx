import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../../shared/context/I18nContext";
import styles from "./TermsOfService.module.css";

const TermsOfService: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className={styles["terms-of-service"]}>
      <div className={styles["terms-of-service__header"]}>
        <button
          className={styles["terms-of-service__back-button"]}
          onClick={handleBack}
          aria-label="Go back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className={`${styles["terms-of-service__title"]} typography-headline-medium`}>
          {t("terms.title")}
        </h1>
      </div>
      <div className={styles["terms-of-service__content"]}>
        <div className={styles["terms-of-service__text"]}>
          <p className={`${styles["terms-of-service__last-updated"]} typography-body-small`}>
            {t("terms.lastUpdated")}
          </p>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.introduction.title")}
            </h2>
            <p className="typography-body-medium">{t("terms.introduction.content")}</p>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.dataCollection.title")}
            </h2>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.dataCollection.whatData.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.dataCollection.whatData.intro")}</p>
            <h4 className={`${styles["terms-of-service__sub-subsection-title"]} typography-title-medium`}>
              {t("terms.dataCollection.whatData.fromWikiloc")}
            </h4>
            <ul>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.wikiloc.activity")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.wikiloc.timestamps")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.wikiloc.elevation")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.wikiloc.routeNames")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.wikiloc.activityTypes")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.wikiloc.profile")}</li>
            </ul>
            <h4 className={`${styles["terms-of-service__sub-subsection-title"]} typography-title-medium`}>
              {t("terms.dataCollection.whatData.fromStrava")}
            </h4>
            <ul>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.strava.activity")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.strava.timestamps")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.strava.elevation")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.strava.coordinates")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.strava.activityTypes")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.strava.profile")}</li>
            </ul>
            <h4 className={`${styles["terms-of-service__sub-subsection-title"]} typography-title-medium`}>
              {t("terms.dataCollection.whatData.fromGarmin")}
            </h4>
            <ul>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.garmin.activity")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.garmin.gps")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.garmin.elevation")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.garmin.summaries")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.garmin.location")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.whatData.garmin.profile")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.dataCollection.howWeUse.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.dataCollection.howWeUse.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.dataCollection.howWeUse.identifyPeaks")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.howWeUse.trackProgress")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.howWeUse.displayHistory")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.howWeUse.calculateStats")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.howWeUse.enableSharing")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.howWeUse.leaderboards")}</li>
              <li className="typography-body-medium">{t("terms.dataCollection.howWeUse.analyzeRoutes")}</li>
            </ul>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.thirdParty.title")}
            </h2>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.thirdParty.compliance.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.thirdParty.compliance.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.thirdParty.compliance.readAgree")}</li>
              <li className="typography-body-medium">{t("terms.thirdParty.compliance.apiTerms")}</li>
              <li className="typography-body-medium">{t("terms.thirdParty.compliance.devPolicies")}</li>
              <li className="typography-body-medium">{t("terms.thirdParty.compliance.noCredentials")}</li>
              <li className="typography-body-medium">{t("terms.thirdParty.compliance.secureTokens")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.thirdParty.scope.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.thirdParty.scope.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.thirdParty.scope.readStore")}</li>
              <li className="typography-body-medium">{t("terms.thirdParty.scope.analyzeTransform")}</li>
            </ul>
            <p className="typography-body-medium">{t("terms.thirdParty.scope.notDo.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.thirdParty.scope.notDo.modify")}</li>
              <li className="typography-body-medium">{t("terms.thirdParty.scope.notDo.share")}</li>
              <li className="typography-body-medium">{t("terms.thirdParty.scope.notDo.sell")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.thirdParty.revocation.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.thirdParty.revocation.content")}</p>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.dataStorage.title")}
            </h2>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.dataStorage.retention.title")}
            </h3>
            <ul>
              <li className="typography-body-medium">{t("terms.dataStorage.retention.active")}</li>
              <li className="typography-body-medium">{t("terms.dataStorage.retention.deleted")}</li>
              <li className="typography-body-medium">{t("terms.dataStorage.retention.matching")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.dataStorage.security.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.dataStorage.security.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.dataStorage.security.encryption")}</li>
              <li className="typography-body-medium">{t("terms.dataStorage.security.access")}</li>
              <li className="typography-body-medium">{t("terms.dataStorage.security.infrastructure")}</li>
              <li className="typography-body-medium">{t("terms.dataStorage.security.updates")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.dataStorage.location.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.dataStorage.location.content")}</p>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.dataSharing.title")}
            </h2>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.dataSharing.public.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.dataSharing.public.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.dataSharing.public.statistics")}</li>
              <li className="typography-body-medium">{t("terms.dataSharing.public.username")}</li>
              <li className="typography-body-medium">{t("terms.dataSharing.public.rankings")}</li>
              <li className="typography-body-medium">{t("terms.dataSharing.public.profile")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.dataSharing.private.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.dataSharing.private.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.dataSharing.private.routes")}</li>
              <li className="typography-body-medium">{t("terms.dataSharing.private.elevation")}</li>
              <li className="typography-body-medium">{t("terms.dataSharing.private.times")}</li>
              <li className="typography-body-medium">{t("terms.dataSharing.private.email")}</li>
              <li className="typography-body-medium">{t("terms.dataSharing.private.followers")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.dataSharing.thirdParties.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.dataSharing.thirdParties.noSell")}</p>
            <p className="typography-body-medium">{t("terms.dataSharing.thirdParties.aggregated")}</p>
            <p className="typography-body-medium">{t("terms.dataSharing.thirdParties.shareWith")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.dataSharing.thirdParties.serviceProviders")}</li>
              <li className="typography-body-medium">{t("terms.dataSharing.thirdParties.authorities")}</li>
              <li className="typography-body-medium">{t("terms.dataSharing.thirdParties.safety")}</li>
            </ul>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.rights.title")}
            </h2>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.rights.correction.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.rights.correction.content")}</p>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.rights.deletion.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.rights.deletion.content")}</p>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.rights.privacy.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.rights.privacy.content")}</p>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.accuracy.title")}
            </h2>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.accuracy.peakIdentification.title")}
            </h3>
            <ul>
              <li className="typography-body-medium">{t("terms.accuracy.peakIdentification.algorithmic")}</li>
              <li className="typography-body-medium">{t("terms.accuracy.peakIdentification.errors")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.accuracy.routeData.title")}
            </h3>
            <ul>
              <li className="typography-body-medium">{t("terms.accuracy.routeData.accuracy")}</li>
              <li className="typography-body-medium">{t("terms.accuracy.routeData.incomplete")}</li>
              <li className="typography-body-medium">{t("terms.accuracy.routeData.delays")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.accuracy.warranty.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.accuracy.warranty.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.accuracy.warranty.accuracy")}</li>
              <li className="typography-body-medium">{t("terms.accuracy.warranty.reliability")}</li>
              <li className="typography-body-medium">{t("terms.accuracy.warranty.uptime")}</li>
            </ul>
            <p className="typography-body-medium">{t("terms.accuracy.warranty.disclaimer")}</p>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.changes.title")}
            </h2>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.changes.modifications.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.changes.modifications.content")}</p>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.changes.continuedUse.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.changes.continuedUse.content")}</p>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.termination.title")}
            </h2>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.termination.serviceTermination.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.termination.serviceTermination.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.termination.serviceTermination.violation")}</li>
              <li className="typography-body-medium">{t("terms.termination.serviceTermination.fraudulent")}</li>
              <li className="typography-body-medium">{t("terms.termination.serviceTermination.legal")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.termination.effect.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.termination.effect.content")}</p>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.indemnification.title")}
            </h2>
            <p className="typography-body-medium">{t("terms.indemnification.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.indemnification.violations")}</li>
              <li className="typography-body-medium">{t("terms.indemnification.platformPolicies")}</li>
              <li className="typography-body-medium">{t("terms.indemnification.misuse")}</li>
              <li className="typography-body-medium">{t("terms.indemnification.disputes")}</li>
            </ul>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.liability.title")}
            </h2>
            <p className="typography-body-medium">{t("terms.liability.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.liability.asIs")}</li>
              <li className="typography-body-medium">{t("terms.liability.notLiable")}</li>
              <li className="typography-body-medium">{t("terms.liability.platformDowntime")}</li>
            </ul>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.disputes.title")}
            </h2>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.disputes.governingLaw.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.disputes.governingLaw.content")}</p>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.disputes.resolution.title")}
            </h3>
            <ul>
              <li className="typography-body-medium">{t("terms.disputes.resolution.negotiation")}</li>
              <li className="typography-body-medium">{t("terms.disputes.resolution.mediation")}</li>
              <li className="typography-body-medium">{t("terms.disputes.resolution.arbitration")}</li>
            </ul>
            <h3 className={`${styles["terms-of-service__subsection-title"]} typography-title-medium`}>
              {t("terms.disputes.classAction.title")}
            </h3>
            <p className="typography-body-medium">{t("terms.disputes.classAction.content")}</p>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.contact.title")}
            </h2>
            <p className="typography-body-medium">{t("terms.contact.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.contact.email")}</li>
              <li className="typography-body-medium">{t("terms.contact.website")}</li>
              <li className="typography-body-medium">{t("terms.contact.support")}</li>
            </ul>
          </section>
          <section className={styles["terms-of-service__section"]}>
            <h2 className={`${styles["terms-of-service__section-title"]} typography-title-large`}>
              {t("terms.acknowledgment.title")}
            </h2>
            <p className="typography-body-medium">{t("terms.acknowledgment.intro")}</p>
            <ul>
              <li className="typography-body-medium">{t("terms.acknowledgment.read")}</li>
              <li className="typography-body-medium">{t("terms.acknowledgment.consent")}</li>
              <li className="typography-body-medium">{t("terms.acknowledgment.capacity")}</li>
              <li className="typography-body-medium">{t("terms.acknowledgment.comply")}</li>
              <li className="typography-body-medium">{t("terms.acknowledgment.responsible")}</li>
            </ul>
            <p className={`${styles["terms-of-service__footer"]} typography-label-medium`}>
              {t("terms.acknowledgment.footer")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
