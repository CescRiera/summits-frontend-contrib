import React from "react";
import { useOptionalOverlayContext } from "../desktop-OverlayContext.tsx";
import styles from "./desktop-OverlayBreadcrumbs.module.css";

// Helper function to get overlay title
const getOverlayTitle = (overlay: {
  type: string;
  id?: string;
  name?: string;
}): string => {
  // If name is provided, use it with appropriate suffix
  if (overlay.name) {
    switch (overlay.type) {
      case "peak":
        return overlay.name;
      case "list":
        // For lists, the name is already formatted as "Name (list name)" or just "list name"
        return overlay.name;
      case "club":
        return overlay.name;
      case "edit-club":
        return overlay.name;
      case "userpeaks":
        // Name is already the user name, format as "Name Peaks"
        return `${overlay.name} Peaks`;
      case "userroutes":
        // Name is already the user name, format as "Name Routes"
        return `${overlay.name} Routes`;
      case "userstats":
        return `${overlay.name} Profile`;
      case "route":
        return overlay.name;
      default:
        return overlay.name;
    }
  }

  // Fallback to generic titles
  switch (overlay.type) {
    case "peak":
      return "Peak Details";
    case "list":
      return "List Details";
    case "clubs-root":
      return "Clubs";
    case "club":
      return "Club Details";
    case "create-club":
      return "Create Club";
    case "edit-club":
      return "Edit Club";
    case "userpeaks-root":
      return "User Peaks";
    case "userpeaks":
      return "User Peaks";
    case "saved-peaks-root":
      return "Saved Peaks";
    case "saved-shelters-root":
      return "Saved Shelters";
    case "userroutes-root":
      return "User Routes";
    case "userroutes":
      return "User Routes";
    case "route":
      return "Route Details";

    case "userstats":
      return "External Profile";
    case "add-manual-peaks":
      return "Add Manual Peaks";
    default:
      return "Details";
  }
};

const OverlayBreadcrumbs: React.FC = () => {
  const overlayContext = useOptionalOverlayContext();

  if (!overlayContext || overlayContext.overlayStack.length === 0) {
    return null;
  }

  const { overlayStack, handleNavigateToOverlay } = overlayContext;

  return (
    <nav className={styles["overlay-breadcrumbs"]} aria-label="Breadcrumb">
      <ol className={styles["overlay-breadcrumbs__list"]}>
        {overlayStack.map((overlay, index) => {
          const isLast = index === overlayStack.length - 1;
          const title = getOverlayTitle(overlay);

          return (
            <li key={overlay.instanceKey} className={styles["overlay-breadcrumbs__item"]}>
              {isLast ? (
                <span
                  className={`${styles["overlay-breadcrumbs__current"]} typography-desktop-body-small`}
                  aria-current="page"
                >
                  {title}
                </span>
              ) : (
                <>
                  <button
                    className={`${styles["overlay-breadcrumbs__link"]} typography-desktop-body-medium`}
                    onClick={() => handleNavigateToOverlay(index)}
                    type="button"
                  >
                    {title}
                  </button>
                  <span
                    className={styles["overlay-breadcrumbs__separator"]}
                    aria-hidden="true"
                  >
                    &gt;
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default OverlayBreadcrumbs;
