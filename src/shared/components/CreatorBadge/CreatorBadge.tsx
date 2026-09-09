import React, { useState } from "react";
import styles from "./CreatorBadge.module.css";

type CreatorBadgeProps = {
  name?: string | null;
  imageUrl?: string | null;
  className?: string | undefined;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  showLabel?: boolean;
};

const getInitial = (name?: string | null) => {
  const trimmed = name?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "?";
};

const CreatorBadge: React.FC<CreatorBadgeProps> = ({
  name,
  imageUrl,
  className = "",
  size = "sm",
  variant = "dark",
  showLabel = true,
}) => {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);

  const label = showLabel && name ? name : "";
  const fallbackInitial = getInitial(name);
  const showImage = !!imageUrl && imageUrl !== failedImageUrl;

  if (!name && !imageUrl) return null;

  const sizeTypographyClass =
    size === "lg"
      ? "typography-label-large"
      : size === "md"
      ? "typography-label-medium"
      : "typography-label-small";

  return (
    <div
      className={`${styles["creator-badge"]} ${styles[`creator-badge--${size}`]} ${styles[`creator-badge--${variant}`]}  ${className}`}
      title={name || "Creator"}
    >
      {showImage ? (
        <img
          className={styles["creator-badge__avatar"]}
          src={imageUrl}
          alt={name ? `Creator ${name}` : "Creator"}
          onError={() => {
            setFailedImageUrl(imageUrl);
          }}
        />
      ) : (
        <span className={`${styles["creator-badge__initials"]} typography-title-small`}>
          {fallbackInitial}
        </span>
      )}
      {label && (
        <span className={`${styles["creator-badge__label"]} ${sizeTypographyClass}`}>{label}</span>
      )}
    </div>
  );
};

export default CreatorBadge;
