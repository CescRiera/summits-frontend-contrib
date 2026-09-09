import type { AdminHierarchy } from "./common";
import type { ShelterType } from "./shelters";

// Discovery (explore feed) types — /api/discovery/

export type DiscoveryMode = "all" | "peaks" | "shelters";

export interface DiscoveryPeak {
  id: number;
  name: string;
  name_en?: string | null;
  elevation: number | null;
  lat: number;
  lng: number;
  image?: string | null;
  admin_hierarchy?: AdminHierarchy | null;
}

export interface DiscoveryShelter {
  id: number;
  name: string | null;
  name_en: string | null;
  elevation: number | null;
  lat: number;
  lng: number;
  image: string | null;
  admin_hierarchy?: AdminHierarchy | null;
  shelter_type: ShelterType;
}

export interface DiscoveryPagination {
  current_page?: number;
  has_next: boolean;
  has_next_page?: boolean;
  total_items?: number;
  peaks_limit?: number;
  shelters_limit?: number;
  shelter_cursor?: string | number | null;
}

export interface DiscoveryResponse {
  peaks: DiscoveryPeak[];
  shelters: DiscoveryShelter[];
  pagination?: DiscoveryPagination;
}