import React, { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Send,
  Mail,
} from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import { useNavigate } from "react-router-dom";
import { contactDeveloper } from "../../../shared/api/endpoints/user";
import { useAuth } from "../../../shared/context/AuthContext";
import { useAnalytics } from "../../../shared/context/AnalyticsContext";
import styles from "./Help.module.css";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const Help: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();
  const [openItems, setOpenItems] = useState<string[]>([]); // Initially collapsed
  const [email, setEmail] = useState(() => {
    if (user?.email && !user.email.endsWith("@summitstracker.com")) {
      return user.email;
    }
    return "";
  });
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleBack = () => {
    trackEvent("navigation", "help_back");
    navigate(-1);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || !email.trim()) return;

    trackEvent("contact", "help_submit_attempt");
    setIsLoading(true);
    try {
      await contactDeveloper({
        email: email.trim(),
        subject: subject.trim(),
        text: message.trim(),
      });
      setEmail("");
      setSubject("");
      setMessage("");
      setShowSuccess(true);
      trackEvent("contact", "help_submit_success");
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      trackEvent("contact", "help_submit_failed");
      console.error("Failed to send message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    trackEvent(
      "interaction",
      `help_faq_${openItems.includes(id) ? "collapse" : "expand"}_${id}`
    );
    setOpenItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };


  const faqItems: FAQItem[] = [
    {
      id: "1",
      question: t("help.faq.newPeaks.question"),
      answer: t("help.faq.newPeaks.answer"),
    },
    {
      id: "2",
      question: t("help.faq.incorrectPeaks.question"),
      answer: t("help.faq.incorrectPeaks.answer"),
    },
    {
      id: "3",
      question: t("help.faq.missingRoutes.question"),
      answer: t("help.faq.missingRoutes.answer"),
    },
    {
      id: "4",
      question: t("help.faq.historicalData.question"),
      answer: t("help.faq.historicalData.answer"),
    },
  ];

  return (
    <div className={styles["help-page"]}>
      <button className={styles["help-page__back-button"]} onClick={handleBack}>
        <ArrowLeft size={20} />
      </button>

      <div className={styles["help-page__header"]}>
        <h1 className={`${styles["help-page__title"]} typography-title-medium`}>
          {t("profile.helpTutorials")}
        </h1>
      </div>

      <div className={styles["help-page__faq"]}>
        {faqItems.map((item) => (
          <div key={item.id} className={styles["help-page__faq-item"]}>
            <button
              className={styles["help-page__faq-question"]}
              onClick={() => toggleItem(item.id)}
            >
              <span
                className={`${styles["help-page__faq-question-text"]} typography-title-medium`}
              >
                {item.question}
              </span>
              {openItems.includes(item.id) ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
            <div
              className={`${styles["help-page__faq-answer"]} ${
                openItems.includes(item.id)
                  ? styles["help-page__faq-answer--open"]
                  : ""
              }`}
            >
              <p className="typography-body-medium">{item.answer}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contact Form Section */}
      <div className={styles["help-page__contact"]}>
        <h2
          className={`${styles["help-page__contact-title"]} typography-title-medium`}
        >
          {t("contact.getInTouchWithMe") || "Get in Touch"}
        </h2>
        {showSuccess ? (
          <div className={styles["help-page__contact-success"]}>
            <div className={styles["help-page__contact-success-icon"]}>
              <Send size={32} />
            </div>
            <div
              className={`${styles["help-page__contact-success-message"]} typography-body-medium`}
            >
              {t("profile.messageSentSuccessfully") ||
                "Message sent successfully!"}
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleContactSubmit}
            className={styles["help-page__contact-form"]}
          >
            <div className={styles["help-page__contact-field"]}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${styles["help-page__contact-input"]} typography-body-small`}
                placeholder={t("contact.emailPlaceholder") || "Email"}
                required
              />
            </div>
            <div className={styles["help-page__contact-field"]}>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`${styles["help-page__contact-input"]} typography-body-small`}
                placeholder={t("profile.subjectPlaceholder") || "Subject"}
                required
              />
            </div>
            <div className={styles["help-page__contact-field"]}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${styles["help-page__contact-textarea"]} typography-body-small`}
                placeholder={t("profile.messagePlaceholder") || "Message"}
                rows={6}
                required
              />
            </div>
            <button
              type="submit"
              className={`${styles["help-page__contact-button"]} typography-button-medium`}
              disabled={
                isLoading || !subject.trim() || !message.trim() || !email.trim()
              }
            >
              {isLoading && (
                <span className={styles["help-page__contact-loading"]}></span>
              )}
              <Mail size={18} />
              {t("profile.sendMessage") || "Send Message"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Help;
