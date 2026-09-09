import React from "react";
import styles from "./PeakCardShimmer.module.css";

interface PeakCardShimmerProps {
  height?: number;
}

const PeakCardShimmer: React.FC<PeakCardShimmerProps> = ({ height }) => {
  return (
    <div
      className={styles["shimmerCard"]}
      style={
        height ? { height: `${height}px` } : { width: "100%", height: "100%" }
      }
    >
      <div className={styles["shimmerOverlay"]}>
        <div className={styles["shimmerContent"]}>
          <div className={styles["shimmerIcon"]} />
          <div className={styles["shimmerText"]}>
            <div className={`${styles["shimmerTitle"]} typography-title-medium`} />
            <div className={styles["shimmerLocation"]} />
            <div className={styles["shimmerElevation"]} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeakCardShimmer;
