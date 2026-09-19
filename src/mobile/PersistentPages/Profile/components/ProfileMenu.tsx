import React, { useState } from "react";
import {
  HelpCircle,
  Globe,
  LogOut,
  Trash2,
  MessageSquare,
  Ruler,
  Download,
} from "lucide-react";
import MountainIcon from "../../../../shared/components/MountainIcon/MountainIcon";
import { useI18n } from "../../../../shared/context/I18nContext";
import { useAnalytics } from "../../../../shared/context/AnalyticsContext";
import LogoutPopup from "./ProfilePopups/LogoutPopup/LogoutPopup";
import LanguageChangePopup from "./ProfilePopups/LanguageChangePopup/LanguageChangePopup";
import UnitSystemPopup from "./ProfilePopups/UnitSystemPopup/UnitSystemPopup";
import DeleteAccountPopup from "./ProfilePopups/DeleteAccountPopup/DeleteAccountPopup";
import HelpPopup from "./ProfilePopups/HelpPopup/HelpPopup";
import SuggestionsPopup from "./ProfilePopups/SuggestionsPopup/SuggestionsPopup";
import ContributePopup from "./ProfilePopups/ContributePopup/ContributePopup";
import WikilocImportPopup from "./ProfilePopups/WikilocImportPopup/WikilocImportPopup";
import PrivacyToggle from "./PrivacyToggle";
import NotificationToggle from "./NotificationToggle";
import HomeHeader from "../../../components/Main/HomeHeader/HomeHeader";
import type { UserDetails } from "../../../../shared/api/types";
import styles from "./ProfileMenu.module.css";

interface ProfileMenuProps {
  onLogout: () => void;
  onDeleteAccount: () => void;
  isPrivate: boolean;
  onPrivacyChange: (isPrivate: boolean) => void;
  userDetails?: UserDetails | null;
  onRefreshUserDetails?: () => Promise<void>;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  onLogout,
  onDeleteAccount,
  isPrivate,
  onPrivacyChange,
  userDetails,
  onRefreshUserDetails,
}) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [showDeleteAccountPopup, setShowDeleteAccountPopup] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [showSuggestionsPopup, setShowSuggestionsPopup] = useState(false);
  const [showContributePopup, setShowContributePopup] = useState(false);
  const [showUnitSystemPopup, setShowUnitSystemPopup] = useState(false);
  const [showWikilocImportPopup, setShowWikilocImportPopup] = useState(false);

  const handleHelp = () => {
    trackEvent("button_click", "profile_menu_help");
    setShowHelpPopup(true);
  };

  const handleLogout = () => {
    trackEvent("button_click", "profile_menu_logout_confirm");
    onLogout();
  };

  const firstMenuItems = [
    {
      icon: <Globe size={20} />,
      label: t("profile.changeLanguage"),
      onClick: () => {
        trackEvent("button_click", "profile_menu_language");
        setShowLanguagePopup(true);
      },
      className: styles["menu-item"],
    },
    {
      icon: <Ruler size={20} />,
      label: t("profile.unitSystem"),
      onClick: () => {
        trackEvent("button_click", "profile_menu_unit_system");
        setShowUnitSystemPopup(true);
      },
      className: styles["menu-item"],
    },
    {
      icon: <Download size={20} />,
      label: t("profile.wikilocImport"),
      onClick: () => {
        trackEvent("button_click", "profile_menu_wikiloc_import");
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
      icon: <MessageSquare size={20} />,
      label: t("profile.sendSuggestionsReportErrors"),
      onClick: () => {
        trackEvent("button_click", "profile_menu_suggestions");
        setShowSuggestionsPopup(true);
      },
      className: styles["menu-item"],
    },
    {
      icon: <MountainIcon size={20} />,
      label: t("profile.contribute"),
      onClick: () => {
        trackEvent("button_click", "profile_menu_contribute");
        setShowContributePopup(true);
      },
      className: styles["menu-item"],
    },
  ];

  const secondMenuItems = [
    {
      icon: <LogOut size={20} />,
      label: t("profile.logout"),
      onClick: () => {
        trackEvent("button_click", "profile_menu_logout");
        setShowLogoutPopup(true);
      },
      className: `${styles["menu-item"]} ${styles["menu-item--logout"]}`,
    },
    {
      icon: <Trash2 size={20} />,
      label: t("profile.deleteAccount"),
      onClick: () => {
        trackEvent("button_click", "profile_menu_delete_account");
        setShowDeleteAccountPopup(true);
      },
      className: `${styles["menu-item"]} ${styles["menu-item--danger"]}`,
    },
  ];

  return (
    <>
      <HomeHeader title={t("profile.accountSettings")} />

    <div className={styles["profile-menus"]}>
      <div className={styles["profile-menu"]}>
          <NotificationToggle 
            userDetails={userDetails} 
            onRefreshUserDetails={onRefreshUserDetails}
          />
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
                className={`${styles["menu-item__label"]} typography-label-large`}
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
                className={`${styles["menu-item__label"]} typography-label-large`}
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

      <UnitSystemPopup
        isOpen={showUnitSystemPopup}
        onClose={() => setShowUnitSystemPopup(false)}
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

      <SuggestionsPopup
        isOpen={showSuggestionsPopup}
        onClose={() => setShowSuggestionsPopup(false)}
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
