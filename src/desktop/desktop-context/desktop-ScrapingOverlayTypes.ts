export interface ScrapingOverlayState {
  visible: boolean;
  message: string;
  type: "scraping" | "complete";
}

export interface ScrapingOverlayContextType {
  overlay: ScrapingOverlayState;
  showOverlay: (message: string, type: "scraping" | "complete") => void;
  hideOverlay: () => void;
}

export interface ScrapingCompletedEvent {
  message?: string;
  totalPeaks?: number;
  timestamp?: string;
}
