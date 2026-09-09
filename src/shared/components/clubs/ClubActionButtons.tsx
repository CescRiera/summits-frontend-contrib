import React from "react";
import type { ClubSummary } from "../../api/types/clubs";
import { useAnalytics } from "../../context/AnalyticsContext";
import {
  getClubActionLabelKey,
  getClubActionState,
  getClubSecondaryActionLabelKey,
} from "../../utils/clubState";

type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

interface ClubActionButtonsProps {
  club: Pick<ClubSummary, "visibility" | "membership" | "is_creator" | "restricted">;
  isAuthenticated: boolean;
  t: TranslateFn;
  onSignIn: () => void;
  onJoin: () => void | Promise<void>;
  onCancelRequest: () => void | Promise<void>;
  onLeave: () => void | Promise<void>;
  onEdit: () => void;
  disabled?: boolean;
  className?: string | undefined;
  primaryClassName?: string | undefined;
  secondaryClassName?: string | undefined;
}

const ClubActionButtons: React.FC<ClubActionButtonsProps> = ({
  club,
  isAuthenticated,
  t,
  onSignIn,
  onJoin,
  onCancelRequest,
  onLeave,
  onEdit,
  disabled = false,
  className,
  primaryClassName,
  secondaryClassName,
}) => {
  const { trackEvent } = useAnalytics();
  const actionState = getClubActionState(club, isAuthenticated);
  const secondaryLabelKey = getClubSecondaryActionLabelKey(actionState);

  const handlePrimaryAction = () => {
    trackEvent("button_click", `club_action_${actionState.primaryAction}`);
    switch (actionState.primaryAction) {
      case "sign_in":
        onSignIn();
        break;
      case "join":
      case "request":
        void onJoin();
        break;
      case "leave":
        void onLeave();
        break;
      case "edit":
        onEdit();
        break;
      case "pending":
      default:
        break;
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        className={primaryClassName}
        onClick={handlePrimaryAction}
        disabled={disabled || actionState.primaryAction === "pending"}
      >
        {t(getClubActionLabelKey(actionState.primaryAction))}
      </button>
      {secondaryLabelKey ? (
        <button
          type="button"
          className={secondaryClassName}
          onClick={() => {
            trackEvent("button_click", "club_action_cancel_request");
            void onCancelRequest();
          }}
          disabled={disabled}
        >
          {t(secondaryLabelKey)}
        </button>
      ) : null}
    </div>
  );
};

export default ClubActionButtons;
