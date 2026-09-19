import React, { useState } from "react";
import {
  HelpCircle,
  Globe,
  LogOut,
  Trash2,
  Download,
} from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";
import LogoutPopup from "./desktop-ProfilePopups/desktop-LogoutPopup/desktop-LogoutPopup.tsx";
import LanguageChangePopup from "./desktop-ProfilePopups/desktop-LanguageChangePopup/desktop-LanguageChangePopup.tsx";
import DeleteAccountPopup from "./desktop-ProfilePopups/desktop-DeleteAccountPopup/desktop-DeleteAccountPopup.tsx";
import HelpPopup from "./desktop-ProfilePopups/desktop-HelpPopup/desktop-HelpPopup.tsx";
import ContributePopup from "./desktop-ProfilePopups/desktop-ContributePopup/desktop-ContributePopup.tsx";
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
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showContributePopup, setShowContributePopup] = useState(false);
  const [showWikilocImportPopup, setShowWikilocImportPopup] = useState(false);

  const handleHelp = () => {
    trackEvent("button_click", "profile_desktop_menu_help");
    setShowHelpPopup(true);
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
      icon: <MountainIcon size={20} />,
      label: t("profile.contribute"),
      onClick: () => {
        trackEvent("button_click", "profile_desktop_menu_contribute");
        setShowContributePopup(true);
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

      <HelpPopup
        isOpen={showHelpPopup}
        onClose={() => setShowHelpPopup(false)}
      />

      <ContributePopup
        isOpen={showContributePopup}
        onClose={() => setShowContributePopup(false)}
      />

      <WikilocImportPopup
        isOpen={showWikilocImportPopup}
        onClose={() => setShowWikilocImportPopup(false)}
      />
    </>
  );
};

export default ProfileMenu;
