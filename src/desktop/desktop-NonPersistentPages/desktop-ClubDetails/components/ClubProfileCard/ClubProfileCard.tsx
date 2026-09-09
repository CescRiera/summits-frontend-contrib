import React from "react";
import { Lock, Shield, Users } from "lucide-react";
import { useI18n } from "../../../../../shared/context/I18nContext";
import { getLocationFromHierarchy } from "../../../../../shared/utils/adminHierarchy";
import { formatStatInteger } from "../../../../../mobile/utils/numberFormatting";
import styles from "./ClubProfileCard.module.css";
import type { ClubSummary } from "../../../../../shared/api/types/clubs";
import type { ClubActionState } from "../../../../../shared/utils/clubState";

interface ClubProfileCardProps {
  club: ClubSummary;
  actionState: ClubActionState;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  actionBusy: boolean;
  memberCount: number;
  distinctPeaks: number;
  isPrivateView?: boolean;
}

const ClubProfileCard: React.FC<ClubProfileCardProps> = ({
  club,
  actionState,
  onPrimaryAction,
  onSecondaryAction,
  actionBusy,
  memberCount,
  distinctPeaks,
  isPrivateView = false,
}) => {
  const { t } = useI18n();

  const getActionLabel = () => {
    switch (actionState.primaryAction) {
      case "sign_in": return t("clubs.actions.signInToJoin") || "Sign in to join";
      case "join": return t("clubs.actions.joinClub") || "Join club";
      case "request": return t("clubs.actions.requestToJoin") || "Request to join";
      case "pending": return t("clubs.actions.requestPending") || "Pending";
      case "leave": return t("clubs.actions.leaveClub") || "Leave club";
      case "edit": return t("clubs.actions.editClub") || "Edit club";
      default: return t("clubs.actions.viewClub") || "View club";
    }
  };

  return (
    <article className={`${styles["club-profile"]} ${isPrivateView ? styles["club-profile--private"] : ""}`}>
      <div className={styles["club-profile__cover"]} />
      <div className={styles["club-profile__logo-container"]}>
        {club.image ? (
          <img src={club.image} alt={club.name} className={styles["club-profile__logo"]} />
        ) : (
          <div className={styles["club-profile__logo-fallback"]}>
            <Users size={isPrivateView ? 40 : 32} />
          </div>
        )}
      </div>

      <div className={styles["club-profile__content"]}>
        <div className={styles["club-profile__badge-row"]}>
          <div className={styles["club-profile__badge-group"]}>
            <span className={`${styles["club-profile__badge"]} typography-desktop-label-small`}>
              {club.visibility === "private" ? <Lock size={12} /> : <Shield size={12} />}
              {club.visibility === "private"
                ? t("clubs.visibility.private") || "Private"
                : t("clubs.visibility.public") || "Public"}
            </span>
            {club.is_creator ? (
              <span className={`${styles["club-profile__badge"]} ${styles["club-profile__badge--highlight"]} typography-desktop-label-small`}>
                {t("clubs.badges.creator") || "Creator"}
              </span>
            ) : club.membership?.status === "accepted" ? (
              <span className={`${styles["club-profile__badge"]} typography-desktop-label-small`}>
                {t("clubs.badges.member") || "Member"}
              </span>
            ) : null}
          </div>

          {club.admin_hierarchy && (
            <span className={`${styles["club-profile__location"]} typography-desktop-label-small`}>
              {getLocationFromHierarchy(club.admin_hierarchy)}
            </span>
          )}
        </div>

        <h1 className={`${styles["club-profile__name"]} typography-desktop-title-large`}>
          {club.name}
        </h1>

        <div className={styles["club-profile__stats-row"]}>
          <div className={styles["club-profile__stat-item"]}>
            <span className={`${styles["club-profile__stat-label"]} typography-desktop-label-medium`}>
              {t("clubs.metrics.members") || "Members"}
            </span>
            <span className={`${styles["club-profile__stat-value"]} typography-desktop-title-medium`}>
              {formatStatInteger(memberCount)}
            </span>
          </div>
          <div className={styles["club-profile__stat-item"]}>
            <span className={`${styles["club-profile__stat-label"]} typography-desktop-label-medium`}>
              {t("clubs.metrics.peaks") || "Peaks"}
            </span>
            <span className={`${styles["club-profile__stat-value"]} typography-desktop-title-medium`}>
              {formatStatInteger(distinctPeaks)}
            </span>
          </div>
        </div>

        <div className={styles["club-profile__actions"]}>
          <button
            type="button"
            className={`${styles["club-profile__button-primary"]} typography-desktop-button-medium`}
            onClick={onPrimaryAction}
            disabled={actionBusy || actionState.primaryAction === "pending"}
          >
            {getActionLabel()}
          </button>

          {actionState.primaryAction === "pending" && (
            <button
              type="button"
              className={`${styles["club-profile__button-secondary"]} typography-desktop-button-medium`}
              onClick={onSecondaryAction}
              disabled={actionBusy}
            >
              {t("clubs.actions.cancelRequest") || "Cancel Request"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ClubProfileCard;
