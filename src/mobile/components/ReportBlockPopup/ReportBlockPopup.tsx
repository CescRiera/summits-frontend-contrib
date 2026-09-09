import React, { useEffect, useState } from "react";
import { X, Flag, Ban, Check } from "lucide-react";
import { useI18n } from "../../../shared/context/I18nContext";
import AppModal from "../../../shared/components/AppModal";
import {
  blockUser,
  unblockUser,
  isUserBlocked,
  reportContent,
} from "../../../shared/utils/blockReportUtils";
import styles from "./ReportBlockPopup.module.css";

interface ReportBlockPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  contentType?: "route" | "user"; // Routes and users can be reported
  contentId?: number;
  onBlockChange?: () => void;
}

const ReportBlockPopup: React.FC<ReportBlockPopupProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  contentType,
  contentId,
  onBlockChange,
}) => {
  const { t } = useI18n();
  const [isBlocked, setIsBlocked] = useState(false);
  const [actionCompleted, setActionCompleted] = useState(false);

  // Check if user is already blocked
  useEffect(() => {
    if (isOpen) {
      setIsBlocked(isUserBlocked(userId));
      setActionCompleted(false);
    }
  }, [isOpen, userId]);

  const handleReport = async () => {
    if (contentType && contentId) {
      await reportContent(contentId, contentType, userId);
    }
    setActionCompleted(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleBlock = async () => {
    if (isBlocked) {
      await unblockUser(userId);
      setIsBlocked(false);
    } else {
      await blockUser(userId, userName);
      setIsBlocked(true);
    }
    setActionCompleted(true);
    if (onBlockChange) {
      onBlockChange();
    }
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      ariaLabel={t("reportBlock.actionCompleted")}
      contentClassName={styles["report-block-popup__popup"]}
    >
        <button
          className={styles["report-block-popup__close-button"]}
          onClick={onClose}
          aria-label="Close popup"
        >
          <X size={20} />
        </button>

        <div className={styles["report-block-popup__content"]}>
          {actionCompleted ? (
            <>
              <div className={styles["report-block-popup__icon-container"]}>
                <div className={styles["report-block-popup__icon"]}>
                  <Check size={24} />
                </div>
              </div>
              <h2
                className={`${styles["report-block-popup__title"]} typography-title-medium`}
              >
                {isBlocked
                  ? t("reportBlock.userBlocked")
                  : contentType === "route"
                  ? t("reportBlock.contentReported")
                  : contentType === "user"
                  ? t("reportBlock.userReported")
                  : t("reportBlock.actionCompleted")}
              </h2>
              <p
                className={`${styles["report-block-popup__message"]} typography-body-medium`}
              >
                {isBlocked
                  ? t("reportBlock.userBlockedMessage", { userName })
                  : contentType === "route"
                  ? t("reportBlock.contentReportedMessage")
                  : contentType === "user"
                  ? t("reportBlock.userReportedMessage")
                  : t("reportBlock.actionCompletedMessage")}
              </p>
            </>
          ) : (
            <>
              <h2
                className={`${styles["report-block-popup__title"]} typography-title-medium`}
              >
                {userName}
              </h2>

              <div className={styles["report-block-popup__button-container"]}>
                {contentType && contentId && (
                  <button
                    className={`${styles["report-block-popup__button"]} ${styles["report-block-popup__button--report"]} typography-button-medium`}
                    onClick={handleReport}
                  >
                    <Flag size={16} />
                    {contentType === "route"
                      ? t("reportBlock.reportContent")
                      : t("reportBlock.reportUser")}
                  </button>
                )}

                <button
                  className={`${styles["report-block-popup__button"]} ${
                    isBlocked
                      ? styles["report-block-popup__button--unblock"]
                      : styles["report-block-popup__button--block"]
                  } typography-button-medium`}
                  onClick={handleBlock}
                >
                  <Ban size={16} />
                  {isBlocked
                    ? t("reportBlock.unblockUser")
                    : t("reportBlock.blockUser")}
                </button>
              </div>

              <p
                className={`${styles["report-block-popup__info"]} typography-body-small`}
              >
                {isBlocked
                  ? t("reportBlock.unblockInfo")
                  : t("reportBlock.blockInfo")}
              </p>
            </>
          )}
        </div>
    </AppModal>
  );
};

export default ReportBlockPopup;

