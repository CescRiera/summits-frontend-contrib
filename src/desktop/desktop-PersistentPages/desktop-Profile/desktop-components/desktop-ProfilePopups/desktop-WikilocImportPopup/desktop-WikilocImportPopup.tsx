import React, { useCallback, useEffect, useState } from "react";
import { Download, Search, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useI18n } from "../../../../../../shared/context/I18nContext";
import { useAnalytics } from "../../../../../../shared/context/AnalyticsContext";
import { useAuth } from "../../../../../../shared/context/AuthContext";
import { searchUsers } from "../../../../../../shared/api/endpoints/user";
import { wikilocImport } from "../../../../../../shared/api/endpoints/wikiloc";
import { websocketService } from "../../../../../../shared/api/websocket";
import AppModal from "../../../../../../shared/components/AppModal";
import styles from "./desktop-WikilocImportPopup.module.css";

interface WikilocUser {
  id: string;
  name: string;
  avatar?: string;
  username?: string;
  trailCount?: number;
}

interface WikilocImportPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportStatus =
  | "idle"
  | "searching"
  | "importing"
  | "import_started"
  | "import_queued"
  | "already_in_progress"
  | "server_busy"
  | "completed"
  | "error";

const DesktopWikilocImportPopup: React.FC<WikilocImportPopupProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const { trackEvent } = useAnalytics();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [wikilocUsers, setWikilocUsers] = useState<WikilocUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<WikilocUser | null>(null);
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [, setJobId] = useState<number | null>(null);

  const reset = useCallback(() => {
    setSearchQuery("");
    setWikilocUsers([]);
    setSelectedUser(null);
    setStatus("idle");
    setStatusMessage("");
    setProgressMessage("");
    setJobId(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    reset();
    trackEvent("popup_view", "desktop_wikiloc_import_popup");
  }, [isOpen, reset, trackEvent]);

  useEffect(() => {
    if (!isOpen || !user?.externalUserId) return;

    const handleProgress = (data: {
      message?: string;
      phase?: string;
      processedRoutes?: number;
      totalRoutes?: number;
      currentRouteName?: string;
      timestamp?: string;
    }) => {
      if (data?.message) {
        setProgressMessage(data.message);
      }
    };

    const handleCompleted = (data: {
      message?: string;
      totalPeaks?: number;
      processedRoutes?: number;
      totalRoutes?: number;
      timestamp?: string;
    }) => {
      setStatus("completed");
      const count = data?.processedRoutes ?? data?.totalRoutes ?? 0;
      setStatusMessage(t("profile.wikilocImportCompleted", { count: String(count) }));
      setProgressMessage("");
    };

    const socket = websocketService.socket;
    if (!socket) return;

    socket.on("scraping-progress", handleProgress);
    socket.on("scraping-completed", handleCompleted);

    return () => {
      socket.off("scraping-progress", handleProgress);
      socket.off("scraping-completed", handleCompleted);
    };
  }, [isOpen, user?.externalUserId, t]);

  const handleSearch = async () => {
    trackEvent("button_click", "desktop_wikiloc_import_search");
    if (!searchQuery.trim()) {
      setStatus("error");
      setStatusMessage(t("profile.wikilocEnterUsername"));
      return;
    }
    setStatus("searching");
    setWikilocUsers([]);
    setSelectedUser(null);
    setStatusMessage("");
    try {
      const data = await searchUsers(searchQuery.trim());
      setWikilocUsers(data.users || []);
      if (!data.users || data.users.length === 0) {
        setStatus("error");
        setStatusMessage(t("profile.wikilocNoUsersFound"));
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("error");
      setStatusMessage(t("profile.wikilocSearchFailed"));
    }
  };

  const handleSelectUser = (wikilocUser: WikilocUser) => {
    trackEvent("interaction", `desktop_wikiloc_import_select_user_${wikilocUser.id}`);
    setSelectedUser(wikilocUser);
    setWikilocUsers([]);
    setStatus("idle");
    setStatusMessage("");
  };

  const handleImport = async () => {
    if (!selectedUser) return;
    trackEvent("button_click", "desktop_wikiloc_import_submit");
    setStatus("importing");
    setStatusMessage("");
    setProgressMessage("");
    try {
      const result = await wikilocImport({ wikilocUserId: selectedUser.id });
      if (result.source === "import_started") {
        setStatus("import_started");
        setJobId(result.jobId ?? null);
        setStatusMessage(t("profile.wikilocImportStarted"));
      } else if (result.source === "import_queued") {
        setStatus("import_queued");
        setJobId(result.jobId ?? null);
        setStatusMessage(
          t("profile.wikilocImportQueued", { position: String(result.position ?? "?") })
        );
      } else if (result.source === "import_already_in_progress") {
        setStatus("already_in_progress");
        setStatusMessage(t("profile.wikilocImportAlreadyInProgress"));
      } else if (result.isQueueFull) {
        setStatus("server_busy");
        setStatusMessage(t("profile.wikilocImportServerBusy"));
      } else {
        setStatus("error");
        setStatusMessage(result.error || t("profile.wikilocImportError"));
      }
    } catch (err: any) {
      setStatus("error");
      if (err?.response?.data?.isQueueFull) {
        setStatus("server_busy");
        setStatusMessage(t("profile.wikilocImportServerBusy"));
      } else if (err?.response?.data?.error) {
        setStatusMessage(err.response.data.error);
      } else {
        setStatusMessage(t("profile.wikilocImportError"));
      }
    }
  };

  const handleClose = () => {
    trackEvent("button_click", "desktop_wikiloc_import_popup_close");
    onClose();
  };

  const renderStatusIcon = () => {
    switch (status) {
      case "import_started":
      case "import_queued":
      case "already_in_progress":
        return <Clock className={styles["wikiloc-popup__status-icon"]} />;
      case "completed":
        return <CheckCircle className={styles["wikiloc-popup__status-icon--success"]} />;
      case "error":
      case "server_busy":
        return <AlertCircle className={styles["wikiloc-popup__status-icon--error"]} />;
      default:
        return null;
    }
  };

  const isImporting = status === "importing" || status === "import_started" || status === "import_queued" || status === "already_in_progress";

  return (
    <AppModal
      open={isOpen}
      onClose={() => {
        trackEvent("button_click", "desktop_wikiloc_import_popup_overlay_close");
        onClose();
      }}
      variant="dialog"
      contentClassName={styles["wikiloc-popup__content"]}
      ariaLabel={t("profile.wikilocImportTitle")}
    >
      <div className={styles["wikiloc-popup__header"]}>
        <h2 className={`${styles["wikiloc-popup__title"]} typography-desktop-title-medium`}>
          {t("profile.wikilocImportTitle")}
        </h2>
        <p className={`${styles["wikiloc-popup__description"]} typography-desktop-body-small`}>
          {t("profile.wikilocImportDescription")}
        </p>
      </div>

      <div className={styles["wikiloc-popup__search-section"]}>
        <div className={styles["wikiloc-popup__search-row"]}>
          <input
            className={`${styles["wikiloc-popup__input"]} typography-desktop-label-medium`}
            type="text"
            placeholder={t("profile.wikilocImportSearchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            disabled={isImporting}
          />
          <button
            className={styles["wikiloc-popup__search-btn"]}
            type="button"
            onClick={handleSearch}
            disabled={status === "searching" || isImporting}
          >
            <Search size={18} />
          </button>
        </div>

        {selectedUser && (
          <div className={styles["wikiloc-popup__selected-user"]}>
            <span className="typography-desktop-body-small">
              {t("profile.wikilocSelectedUser", { name: selectedUser.name })}
            </span>
            <button
              type="button"
              className={`${styles["wikiloc-popup__clear-btn"]} typography-desktop-label-small`}
              onClick={() => {
                setSelectedUser(null);
                setWikilocUsers([]);
                setStatus("idle");
                setStatusMessage("");
              }}
              disabled={isImporting}
            >
              {t("common.clear")}
            </button>
          </div>
        )}

        {wikilocUsers.length > 0 && !selectedUser && (
          <div className={styles["wikiloc-popup__results"]}>
            <span className={`${styles["wikiloc-popup__results-label"]} typography-desktop-body-small`}>
              {t("profile.wikilocSelectUser")}
            </span>
            {wikilocUsers.map((wikilocUser) => (
              <button
                key={wikilocUser.id}
                type="button"
                className={styles["wikiloc-popup__user-item"]}
                onClick={() => handleSelectUser(wikilocUser)}
              >
                <span className="typography-desktop-title-small">
                  {wikilocUser.username ? `@${wikilocUser.username}` : wikilocUser.name}
                </span>
                {wikilocUser.trailCount && (
                  <span className={`${styles["wikiloc-popup__trails"]} typography-desktop-body-small`}>
                    {t("auth.wikiloc.trails")}: {wikilocUser.trailCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {statusMessage && (
        <div className={`${styles["wikiloc-popup__status"]} typography-desktop-body-small`}>
          {renderStatusIcon()}
          <span>{statusMessage}</span>
        </div>
      )}

      {progressMessage && (
        <div className={`${styles["wikiloc-popup__progress"]} typography-desktop-body-small`}>
          {progressMessage}
        </div>
      )}

      <div className={styles["wikiloc-popup__actions"]}>
        <button
          className={`${styles["wikiloc-popup__button"]} ${styles["wikiloc-popup__button--secondary"]} typography-desktop-button-medium`}
          onClick={handleClose}
        >
          {t("common.close")}
        </button>
        {!isImporting && status !== "completed" && (
          <button
            className={`${styles["wikiloc-popup__button"]} typography-desktop-button-medium`}
            onClick={handleImport}
            disabled={!selectedUser}
          >
            <Download size={18} />
            {t("profile.wikilocImportButton")}
          </button>
        )}
      </div>
    </AppModal>
  );
};

export default DesktopWikilocImportPopup;
