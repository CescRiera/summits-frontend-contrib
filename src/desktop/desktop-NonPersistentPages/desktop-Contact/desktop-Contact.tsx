import React, { useState } from "react";
import { Mail, Phone, Send, Lightbulb } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { contactDeveloper } from "../../../shared/api/endpoints/user";
import styles from "./desktop-Contact.module.css";

const Contact: React.FC = () => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { user } = useAuth();
  
  const [email, setEmail] = useState(() => {
    if (user?.email && !user.email.endsWith("@summitstracker.com")) {
      return user.email;
    }
    return "";
  });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"contact" | "suggestion">("contact");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (messageType === "suggestion") {
      if (!message.trim() || !email.trim()) return;
    } else {
      if (!subject.trim() || !message.trim() || !email.trim()) return;
    }

    setIsLoading(true);
    trackEvent("form_submit", `contact_${messageType}`);
    try {
      await contactDeveloper({
        email: email.trim(),
        subject: messageType === "suggestion" ? "SUGGESTIONS" : subject.trim(),
        text: message.trim(),
      });
      trackEvent("form_submit", `contact_${messageType}_success`);
      setEmail("");
      setSubject("");
      setMessage("");
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      trackEvent("form_submit", `contact_${messageType}_error`);
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={styles["contact-page"]}>
      <div className={styles["contact-page__container"]}>
        <div className={styles["contact-page__wrapper"]}>
          {/* Left Column - Contact Info */}
          <div className={styles["contact-page__info"]}>
            <span className={`${styles["contact-page__label"]} typography-desktop-label-medium`}>
              {t("navigation.contact")}
            </span>
            <h2 className={`${styles["contact-page__title"]} typography-desktop-headline-medium`}>
              {t("contact.getInTouchWithMe")}
            </h2>
            <p className={`${styles["contact-page__description"]} typography-desktop-body-medium`}>
              {t("profile.contactDeveloperMessage")}
            </p>

            {/* Contact Items */}
            <div className={styles["contact-page__contact-item"]}>
              <div className={styles["contact-page__icon-box"]}>
                <Phone size={32} />
              </div>
              <div className={styles["contact-page__contact-content"]}>
                <h4 className={`${styles["contact-page__contact-title"]} typography-desktop-title-medium`}>
                  {t("contact.phoneNumber")}
                </h4>
                <p className={`${styles["contact-page__contact-text"]} typography-desktop-body-small`}>
                  +34 644748764
                </p>
              </div>
            </div>

            <div className={styles["contact-page__contact-item"]}>
              <div className={styles["contact-page__icon-box"]}>
                <Mail size={32} />
              </div>
              <div className={styles["contact-page__contact-content"]}>
                <h4 className={`${styles["contact-page__contact-title"]} typography-desktop-title-medium`}>
                  {t("contact.emailAddress")}
                </h4>
                <p className={`${styles["contact-page__contact-text"]} typography-desktop-body-small`}>
                  cesc.riera@summitstracker.com
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className={styles["contact-page__form-column"]}>
            <div className={styles["contact-page__form-card"]}>
              {/* Type Selector */}
              <div className={styles["contact-page__type-selector"]}>
                <button
                  type="button"
                  className={`${styles["contact-page__type-button"]} ${
                    messageType === "contact" ? styles["contact-page__type-button--active"] : ""
                  }`}
                  onClick={() => {
                    setMessageType("contact");
                    setEmail("");
                    setSubject("");
                    setMessage("");
                  }}
                >
                  <Mail size={18} />
                  <span className="typography-desktop-label-medium">
                    {t("profile.contactDeveloper")}
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles["contact-page__type-button"]} ${
                    messageType === "suggestion" ? styles["contact-page__type-button--active"] : ""
                  }`}
                  onClick={() => {
                    setMessageType("suggestion");
                    setEmail("");
                    setSubject("");
                    setMessage("");
                  }}
                >
                  <Lightbulb size={18} />
                  <span className="typography-desktop-label-medium">
                    {t("profile.sendSuggestionsReportErrors")}
                  </span>
                </button>
              </div>

              <div className={styles["contact-page__form-wrapper"]}>
                {showSuccess ? (
                  <div className={styles["contact-page__success"]}>
                    <div className={styles["contact-page__success-icon"]}>
                      <Send size={32} />
                    </div>
                    <div className={`${styles["contact-page__success-message"]} typography-desktop-title-medium`}>
                      {messageType === "suggestion"
                        ? t("profile.suggestionSentSuccessfully")
                        : t("profile.messageSentSuccessfully")}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className={styles["contact-page__form"]}>
                    <div className={styles["contact-page__field"]}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${styles["contact-page__input"]} typography-body-medium`}
                        placeholder={t("contact.emailPlaceholder") || "Email"}
                        required
                      />
                    </div>

                    {messageType === "contact" ? (
                      <div className={styles["contact-page__field"]}>
                        <input
                          type="text"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className={`${styles["contact-page__input"]} typography-body-medium`}
                          placeholder={t("profile.subjectPlaceholder")}
                          required
                        />
                      </div>
                    ) : (
                      <div className={styles["contact-page__field"]} style={{ visibility: "hidden", height: "52px" }}>
                        <input
                          type="text"
                          className={`${styles["contact-page__input"]} typography-body-medium`}
                          disabled
                        />
                      </div>
                    )}

                    <div className={styles["contact-page__field"]}>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className={`${styles["contact-page__textarea"]} typography-body-medium`}
                        placeholder={
                          messageType === "suggestion"
                            ? t("profile.suggestionPlaceholder")
                            : t("profile.messagePlaceholder")
                        }
                        rows={6}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className={`${styles["contact-page__button"]} typography-desktop-button-medium`}
                      disabled={
                        isLoading ||
                        !message.trim() ||
                        !email.trim() ||
                        (messageType === "contact" && !subject.trim())
                      }
                    >
                      {isLoading && (
                        <span className={styles["contact-page__loading-spinner"]}></span>
                      )}
                      {messageType === "suggestion"
                        ? t("profile.sendSuggestion")
                        : t("profile.sendMessage")}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
