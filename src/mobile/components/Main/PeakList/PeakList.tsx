import React from "react";
import styles from "./PeakList.module.css";
import PeakItem from "./PeakItem";
import EmptyState from "../EmptyState/EmptyState";

interface Peak {
  id: string;
  name: string;
  ele?: number;
  region?: string;
  country?: string;
  image?: string;
  // ...other fields
}

interface PeakListProps {
  peaks: Peak[];
  viewMode: "grid" | "list";
  searchQuery: string;
}

const PeakList: React.FC<PeakListProps> = ({
  peaks,
  viewMode,
  searchQuery,
}) => {
  if (!peaks || peaks.length === 0) {
    return <EmptyState searchQuery={searchQuery} />;
  }
  return (
    <div
      className={
        viewMode === "grid"
          ? styles["peak-list__grid"]
          : styles["peak-list__list"]
      }
    >
      {peaks.map((peak) => (
        <div key={peak.id} className="typography-body-medium">
          <PeakItem peak={peak} />
        </div>
      ))}
    </div>
  );
};

export default PeakList;
