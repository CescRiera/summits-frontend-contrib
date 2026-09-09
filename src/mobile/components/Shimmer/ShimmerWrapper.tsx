import React from "react";
import Shimmer from "./Shimmer";

interface ShimmerWrapperProps {
  children: React.ReactNode;
  isLoading: boolean;
  hasData: boolean;
}

const ShimmerWrapper: React.FC<ShimmerWrapperProps> = ({
  children,
  isLoading,
  hasData,
}) => {
  // If still loading, show shimmer
  if (isLoading) {
    return <Shimmer />;
  }

  // If no data after loading, don't render anything
  if (!hasData) {
    return null;
  }

  // Show content normally
  return <>{children}</>;
};

export default ShimmerWrapper;
