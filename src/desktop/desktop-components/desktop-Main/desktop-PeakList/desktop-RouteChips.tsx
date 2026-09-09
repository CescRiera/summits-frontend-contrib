import React from "react";
import styles from "./desktop-RouteChips.module.css";

const RouteChips: React.FC<{ routes: string[] }> = ({ routes }) => {
  if (!routes || routes.length === 0) return null;
  return (
    <div className={styles["route-chips"]}>
      {routes.map((route, idx) => (
        <span
          key={idx}
          className={styles["route-chips__chip"] + " typography-desktop-label-medium"}
        >
          {route}
        </span>
      ))}
    </div>
  );
};

export default RouteChips;
