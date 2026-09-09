import React from "react";
import styles from "./desktop-Shimmer.module.css";

interface ShimmerProps {
  className?: string;
  style?: React.CSSProperties;
}

const EMPTY_STYLE: React.CSSProperties = {};

const Shimmer: React.FC<ShimmerProps> = ({
  className = "",
  style = EMPTY_STYLE,
}) => {
  return (
    <div style={{ padding: 16 }}>
      <div
        className={`${styles["shimmer"]} ${className}`}
        style={{
          height: "200px",
          width: "100%",
          borderRadius: "12px",
          padding: "16px",
          boxSizing: "border-box",
          ...style,
        }}
      />
    </div>
  );
};

export default Shimmer;
