import React, { useState } from "react";
import {
  HelpCircle,
  Globe,
  LogOut,
  Trash2,
  DollarSign,
  Download,
} from "lucide-react";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";
import LogoutPopup from "./desktop-ProfilePopups/desktop-LogoutPopup/desktop-LogoutPopup.tsx";
import LanguageChangePopup from "./desktop-ProfilePopups/desktop-LanguageChangePopup/desktop-LanguageChangePopup.tsx";
import DeleteAccountPopup from "./desktop-ProfilePopups/desktop-DeleteAccountPopup/desktop-DeleteAccountPopup.tsx";
import ContactDeveloperPopup from "./desktop-ProfilePopups/desktop-ContactDeveloperPopup/desktop-ContactDeveloperPopup.tsx";
import DonatePopup from "./desktop-ProfilePopups/desktop-DonatePopup/desktop-DonatePopup.tsx";
import WikilocImportPopup from "./desktop-ProfilePopups/desktop-WikilocImportPopup/desktop-WikilocImportPopup.tsx";
import PrivacyToggle from "./desktop-PrivacyToggle.tsx";
import styles from "./desktop-ProfileMenu.module.css";

interface ProfileMenuProps {
  onLogout: () => void;
  onDeleteAccount: () => void;
  isPrivate: boolean;
  onPrivacyChange: (isPrivate: boolean) => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  onLogout,
  onDeleteAccount,
  isPrivate,
  onPrivacyChange,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [showDeleteAccountPopup, setShowDeleteAccountPopup] = useState(false);
  const [showContactPopup, setShowContactPopup] = useState(false);
  const [showDonatePopup, setShowDonatePopup] = useState(false);
  const [showWikilocImportPopup, setShowWikilocImportPopup] = useState(false);

  const handleHelp = () => {
    trackEvent("button_click", "profile_desktop_menu_help");
    setShowContactPopup(true);
  };

  const handleLogout = () => {
    trackEvent("button_click", "profile_desktop_menu_logout_confirm");
    onLogout();
  };

  const firstMenuItems = [
    {
      icon: <Globe size={20} />,
      label: t("profile.changeLanguage"),
      onClick: () => {
        trackEvent("button_click", "profile_desktop_menu_language");
        setShowLanguagePopup(true);
      },
      className: styles["menu-item"],
    },
    {
      icon: <Download size={20} />,
      label: t("profile.wikilocImport"),
      onClick: () => {
        trackEvent("button_click", "profile_desktop_menu_wikiloc_import");
        setShowWikilocImportPopup(true);
      },
      className: styles["menu-item"],
    },
    {
      icon: <HelpCircle size={20} />,
      label: t("profile.helpTutorials"),
      onClick: handleHelp,
      className: styles["menu-item"],
    },
    {
      icon: <DollarSign size={20} />,
      label: t("profile.donate"),
      onClick: () => {
        trackEvent("button_click", "profile_desktop_menu_donate");
        setShowDonatePopup(true);
      },
      className: styles["menu-item"],
    },
  ];

  const secondMenuItems = [
    {
      icon: <LogOut size={20} />,
      label: t("profile.logout"),
      onClick: () => setShowLogoutPopup(true),
      className: `${styles["menu-item"]} ${styles["menu-item--logout"]}`,
    },
    {
      icon: <Trash2 size={20} />,
      label: t("profile.deleteAccount"),
      onClick: () => setShowDeleteAccountPopup(true),
      className: `${styles["menu-item"]} ${styles["menu-item--danger"]}`,
    },
  ];

  return (
    <>
      <div className={styles["profile-menus"]}>
        <div className={styles["profile-menu"]}>
          <PrivacyToggle
            isPrivate={isPrivate}
            onPrivacyChange={onPrivacyChange}
          />
          {firstMenuItems.map((item, index) => (
            <button
              key={index}
              className={item.className}
              onClick={item.onClick}
            >
              <div className={styles["menu-item__icon"]}>{item.icon}</div>
              <span
                className={`${styles["menu-item__label"]} typography-desktop-label-large`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>

        <div className={styles["profile-menu"]}>
          {secondMenuItems.map((item, index) => (
            <button
              key={index}
              className={item.className}
              onClick={item.onClick}
            >
              <div className={styles["menu-item__icon"]}>{item.icon}</div>
              <span
                className={`${styles["menu-item__label"]} typography-desktop-label-large`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <LogoutPopup
        isOpen={showLogoutPopup}
        onClose={() => setShowLogoutPopup(false)}
        onConfirm={handleLogout}
      />

      <LanguageChangePopup
        isOpen={showLanguagePopup}
        onClose={() => setShowLanguagePopup(false)}
      />

      <DeleteAccountPopup
        isOpen={showDeleteAccountPopup}
        onClose={() => setShowDeleteAccountPopup(false)}
        onConfirm={onDeleteAccount}
      />

      <ContactDeveloperPopup
        isOpen={showContactPopup}
        onClose={() => setShowContactPopup(false)}
      />

      <DonatePopup
        isOpen={showDonatePopup}
        onClose={() => setShowDonatePopup(false)}
      />

      <WikilocImportPopup
        isOpen={showWikilocImportPopup}
        onClose={() => setShowWikilocImportPopup(false)}
      />
    </>
  );
};

export default ProfileMenu;
