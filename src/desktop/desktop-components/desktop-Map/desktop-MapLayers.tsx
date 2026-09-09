import type { Map as MapboxMap, FilterSpecification } from "mapbox-gl";
import type {
  PeakListWithPeaks,
  UserPeaksWithGeoJSON,
  ListPeaksGeoJSONResponse,
} from "../../../shared/api/types";
import { PEAK_ICONS, SHELTER_ICONS, getElevationRangeFilter } from "./desktop-MapUtils.tsx";
import {
  applyPeakLabelPaint,
  createPeakLabelLayout,
  createPeakSymbolLayout,
  getPeakLabelPaint,
  getPeakLabelTheme,
} from "../../../shared/utils/mapboxPeakPresentation";

// Constants
const LAYER_VISIBILITY = {
  VISIBLE: "visible",
  NONE: "none",
} as const;

const LAYER_IDS = {
  TILE_PEAKS: ["peak-symbols", "peak-labels"],
  TILE_SHELTERS: ["shelter-symbols", "shelter-labels"],
  LIST_PEAKS: [
    "list-peaks-completed",
    "list-peaks-black",
    "list-peaks-burgundy",
    "list-peaks-red",
    "list-peaks-orange",
    "list-peaks-yellow",
    "list-peaks-green",
    "list-peaks-completed-labels",
    "list-peaks-black-labels",
    "list-peaks-burgundy-labels",
    "list-peaks-red-labels",
    "list-peaks-orange-labels",
    "list-peaks-yellow-labels",
    "list-peaks-green-labels",
  ],
  USER_PEAKS: ["user-peaks-symbols", "user-peaks-labels"],
} as const;

const SOURCE_IDS = {
  LIST_PEAKS: "list-peaks",
  USER_PEAKS: "user-peaks-source",
  PEAKS: "peaks-source",
  SHELTERS: "shelters-source",
} as const;

// Map styles
const MAP_STYLES = {
  OUTDOORS: "mapbox://styles/morris999/cmgzijuf7008n01qu8zwp3byu",
  SATELLITE: "mapbox://styles/mapbox/satellite-v9",
} as const;

// Projections
const PROJECTIONS = {
  MERCATOR: "mercator",
  GLOBE: "globe",
} as const;

const ELEVATION_RANGES = [
  { min: 8000, max: 99999, icon: "list_peak_black", layer: "list-peaks-black" },
  {
    min: 6000,
    max: 8000,
    icon: "list_peak_burgundy",
    layer: "list-peaks-burgundy",
  },
  { min: 4000, max: 6000, icon: "list_peak_red", layer: "list-peaks-red" },
  {
    min: 3000,
    max: 4000,
    icon: "list_peak_orange",
    layer: "list-peaks-orange",
  },
  {
    min: 2000,
    max: 3000,
    icon: "list_peak_yellow",
    layer: "list-peaks-yellow",
  },
  { min: 0, max: 2000, icon: "list_peak_green", layer: "list-peaks-green" },
] as const;

const DEFAULT_PADDING = 0.3;
const FIT_BOUNDS_OPTIONS = {
  padding: 10,
  duration: 1000,
  essential: true,
} as const;

const DEFAULT_VIEW = {
  center: [2.0, 42.0] as [number, number],
  zoom: 7,
  duration: 1000,
  essential: true,
} as const;

const STYLE_CHECK_INTERVAL = 100;
const SOURCE_CHECK_RETRIES = 5;
const SOURCE_CHECK_DELAY = 150;

interface BoundsCoordinates {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

/**
 * MapLayerManager handles all layer operations for the map
 * Provides clean abstraction for managing tile peaks, list peaks, and user peaks
 */
export class MapLayerManager {
  private map: MapboxMap;
  private isDestroyed = false;
  private currentStyle: string = MAP_STYLES.SATELLITE;
  private isGlobeEnabled: boolean = true;
  private elevationRange: [number, number] = [0, 8849];
  private currentUserPeaks: UserPeaksWithGeoJSON | null = null;
  private currentListPeaks: PeakListWithPeaks | null = null;
  private currentListGeoJson: ListPeaksGeoJSONResponse | null = null;
  private currentVisualizationMode: "tile" | "user" | "list" = "tile";
  private isNearbyPeaksEnabled: boolean = false;
  private listPeakBaseFilters: Map<string, FilterSpecification> = new Map();

  constructor(map: MapboxMap) {
    this.map = map;
    this.setupStyleLoadHandler();
  }

  /**
   * Setup style load handler to persist layers when style changes
   */
  private setupStyleLoadHandler(): void {
    this.map.on("style.load", () => {
      this.reinitializeLayers();
      this.configureFog();
    });
  }

  /**
   * Reinitialize all layers after style change
   */
  private async reinitializeLayers(): Promise<void> {
    if (!this.isValid()) return;

    const styleReady = await this.waitForStyle();
    if (!styleReady) return;

    // Load all peak icons
    await this.loadAllIcons();

    // Add vector source for tile peaks
    if (!this.map.getSource(SOURCE_IDS.PEAKS)) {
      const tileserverUrl = import.meta.env["VITE_TILESERVER_URL"];
      this.map.addSource(SOURCE_IDS.PEAKS, {
        type: "vector",
        tiles: [`${tileserverUrl}/peaks_tiles/{z}/{x}/{y}.pbf`],
        maxzoom: 15,
      });
    }

    // Add tile peak layers (but don't set visibility yet)
    this.addTilePeakLayers();

    // Add vector source for shelter tiles
    if (!this.map.getSource(SOURCE_IDS.SHELTERS)) {
      const tileserverUrl = import.meta.env["VITE_TILESERVER_URL"];
      this.map.addSource(SOURCE_IDS.SHELTERS, {
        type: "vector",
        tiles: [`${tileserverUrl}/shelters_tiles/{z}/{x}/{y}.pbf`],
        maxzoom: 15,
      });
    }

    // Add shelter layers
    this.addShelterLayers();

    // Update label styling based on current base style (e.g., satellite)
    this.updatePeakLabelPaintForStyle();

    // Restore layers based on current visualization mode (don't fit bounds during style change)
    switch (this.currentVisualizationMode) {
      case "user":
        if (this.currentUserPeaks) {
          await this.addUserPeaksSource(this.currentUserPeaks, false); // false = don't fit bounds
        }
        break;
      case "list":
        if (this.currentListPeaks && this.currentListGeoJson) {
          await this.addListPeaksSource(this.currentListPeaks, this.currentListGeoJson, false); // false = don't fit bounds
        }
        break;
      case "tile":
      default:
        // No additional layers needed for tile mode
        break;
    }

    // Reapply current elevation range filter to all layers
    this.setElevationRange(this.elevationRange);

    // Restore the correct layer visibility based on current mode
    this.restoreVisualizationMode();
  }

  /**
   * Load all peak icons into the map
   */
  private async loadAllIcons(): Promise<void> {
    const iconPromises = [
      ...Object.entries(PEAK_ICONS).map(([key, url]) =>
        this.loadMapImage(key, url)
      ),
      ...Object.entries(SHELTER_ICONS).map(([key, url]) =>
        this.loadMapImage(key, url)
      ),
    ];
    await Promise.all(iconPromises);
  }

  /**
   * Load a single image into the map
   */
  private async loadMapImage(imageId: string, imageUrl: string): Promise<void> {
    if (this.map.hasImage(imageId)) return;

    return new Promise((resolve) => {
      this.map.loadImage(imageUrl, (err, img) => {
        if (!err && img && !this.map.hasImage(imageId)) {
          try {
            this.map.addImage(imageId, img);
          } catch {
            // Ignore duplicate add errors
          }
        }
        resolve();
      });
    });
  }

  /**
   * Add tile peak layers
   */
  private addTilePeakLayers(): void {
    if (!this.isValid()) return;

    const filter = getElevationRangeFilter(
      this.elevationRange[0],
      this.elevationRange[1]
    );

    // Add peak symbols layer
    if (!this.map.getLayer("peak-symbols")) {
      this.map.addLayer({
        id: "peak-symbols",
        type: "symbol",
        source: SOURCE_IDS.PEAKS,
        "source-layer": "peaks",
        layout: createPeakSymbolLayout({
          family: "tile",
          iconImage: [
            "match",
            ["get", "peak_type"],
            "peak_black",
            "peak_black",
            "peak_red",
            "peak_red",
            "peak_orange",
            "peak_orange",
            "peak_yellow",
            "peak_yellow",
            "peak_green",
            "peak_green",
            "peak_burgundy",
            "peak_burgundy",
            "peak_gray",
            "peak_gray",
            "peak_gray",
          ],
          symbolSortKey: ["get", "elevation"],
          visibility: "none",
        }),
        filter,
      });
    }

    // Add peak labels layer
    if (!this.map.getLayer("peak-labels")) {
      this.map.addLayer({
        id: "peak-labels",
        type: "symbol",
        source: SOURCE_IDS.PEAKS,
        "source-layer": "peaks",
        layout: createPeakLabelLayout({
          family: "tile",
          symbolSortKey: ["get", "elevation"],
          visibility: "none",
        }),
        paint: getPeakLabelPaint(getPeakLabelTheme(this.currentStyle)),
        filter,
      });
    }
  }

  private addShelterLayers(): void {
    if (!this.isValid()) return;

    const filter = getElevationRangeFilter(
      this.elevationRange[0],
      this.elevationRange[1]
    );

    if (!this.map.getLayer("shelter-symbols")) {
      this.map.addLayer({
        id: "shelter-symbols",
        type: "symbol",
        source: SOURCE_IDS.SHELTERS,
        "source-layer": "shelters",
        layout: createPeakSymbolLayout({
          family: "tile",
          iconImage: [
            "match",
            ["get", "shelter_type"],
            "alpine_hut",
            "shelter_alpine_hut",
            "wilderness_hut",
            "shelter_wilderness_hut",
            "shelter",
            "shelter_shelter",
            "basic_hut",
            "shelter_shelter",
            "weather_shelter",
            "shelter_shelter",
            "lean_to",
            "shelter_shelter",
            "shelter_default",
          ],
          symbolSortKey: ["get", "elevation"],
          visibility: "visible",
        }),
        filter,
      });
    }

    if (!this.map.getLayer("shelter-labels")) {
      this.map.addLayer({
        id: "shelter-labels",
        type: "symbol",
        source: SOURCE_IDS.SHELTERS,
        "source-layer": "shelters",
        layout: createPeakLabelLayout({
          family: "tile",
          symbolSortKey: ["get", "elevation"],
          visibility: "visible",
        }),
        paint: getPeakLabelPaint(getPeakLabelTheme(this.currentStyle)),
        filter,
      });
    }
  }

  private restoreVisualizationMode(): void {
    if (!this.isValid()) return;

    const tileVisibility =
      this.currentVisualizationMode === "tile" || this.isNearbyPeaksEnabled
        ? LAYER_VISIBILITY.VISIBLE
        : LAYER_VISIBILITY.NONE;

    const shelterVisibility = tileVisibility;

    switch (this.currentVisualizationMode) {
      case "user":
        this.setLayersVisibility(LAYER_IDS.TILE_PEAKS, tileVisibility);
        this.setLayersVisibility(LAYER_IDS.TILE_SHELTERS, shelterVisibility);
        this.setLayersVisibility(
          LAYER_IDS.USER_PEAKS,
          LAYER_VISIBILITY.VISIBLE
        );
        this.setLayersVisibility(LAYER_IDS.LIST_PEAKS, LAYER_VISIBILITY.NONE);
        break;
      case "list":
        this.setLayersVisibility(LAYER_IDS.TILE_PEAKS, tileVisibility);
        this.setLayersVisibility(LAYER_IDS.TILE_SHELTERS, shelterVisibility);
        this.setLayersVisibility(LAYER_IDS.USER_PEAKS, LAYER_VISIBILITY.NONE);
        this.setLayersVisibility(
          LAYER_IDS.LIST_PEAKS,
          LAYER_VISIBILITY.VISIBLE
        );
        break;
      case "tile":
      default:
        this.setLayersVisibility(
          LAYER_IDS.TILE_PEAKS,
          LAYER_VISIBILITY.VISIBLE
        );
        this.setLayersVisibility(
          LAYER_IDS.TILE_SHELTERS,
          LAYER_VISIBILITY.VISIBLE
        );
        this.setLayersVisibility(LAYER_IDS.USER_PEAKS, LAYER_VISIBILITY.NONE);
        this.setLayersVisibility(LAYER_IDS.LIST_PEAKS, LAYER_VISIBILITY.NONE);
        break;
    }

    // Update filters to handle potential peak duplication
    this.updateTileLayerFilters();
  }

  /**
   * Set if nearby peaks (tile layer) should be enabled
   */
  public setNearbyPeaksEnabled(enabled: boolean): void {
    this.isNearbyPeaksEnabled = enabled;
    this.restoreVisualizationMode();
    // updateTileLayerFilters is called inside restoreVisualizationMode
  }

  /**
   * Destroy the manager and clean up resources
   */
  destroy(): void {
    this.isDestroyed = true;
  }

  /**
   * Configure fog settings based on current style
   */
  private configureFog(): void {
    if (!this.isValid()) return;

    try {
      if (this.currentStyle.includes("satellite")) {
        // Dark fog for satellite mode
        this.map.setFog({
          color: "rgb(186, 210, 235)", // Lower atmosphere
          "high-color": "rgb(36, 92, 223)", // Upper atmosphere
          "horizon-blend": 0.02, // Atmosphere thickness (default 0.2 at low zooms)
          "space-color": "rgb(11, 11, 25)", // Background color
          "star-intensity": 0.6, // Background star brightness (default 0.35 at low zooms)
        });
      } else {
        // Default fog for outdoors mode
        this.map.setFog({
          color: "rgb(186, 210, 235)", // Lower atmosphere
          "high-color": "rgb(36, 92, 223)", // Upper atmosphere
          "horizon-blend": 0.02, // Atmosphere thickness
          "space-color": "rgb(11, 11, 25)", // Background color
          "star-intensity": 0.6, // Background star brightness
        });
      }

      // Also ensure label paint matches current style
      this.updatePeakLabelPaintForStyle();
    } catch (error) {
      console.warn("Failed to configure fog:", error);
    }
  }

  /**
   * Adjust `peak-labels` and `list-peaks-labels` paint properties based on current base style
   * Satellite: white text with black halo; Outdoors: dark text with white halo
   */
  private updatePeakLabelPaintForStyle(): void {
    if (!this.isValid()) return;

    // Update tile peak labels
    if (this.map.getLayer("peak-labels")) {
      try {
        applyPeakLabelPaint(this.map, "peak-labels", this.currentStyle);
      } catch (error) {
        console.warn("Failed to update peak-labels paint for style:", error);
      }
    }

    // Update shelter labels
    if (this.map.getLayer("shelter-labels")) {
      try {
        applyPeakLabelPaint(this.map, "shelter-labels", this.currentStyle);
      } catch (error) {
        console.warn("Failed to update shelter-labels paint for style:", error);
      }
    }

    // Update all list peak label layers
    const listLabelLayers = [
      "list-peaks-completed-labels",
      "list-peaks-black-labels",
      "list-peaks-burgundy-labels",
      "list-peaks-red-labels",
      "list-peaks-orange-labels",
      "list-peaks-yellow-labels",
      "list-peaks-green-labels",
    ];

    listLabelLayers.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        try {
          applyPeakLabelPaint(this.map, layerId, this.currentStyle);
        } catch (error) {
          console.warn(`Failed to update ${layerId} paint for style:`, error);
        }
      }
    });

    // Update user peaks labels
    if (this.map.getLayer("user-peaks-labels")) {
      try {
        applyPeakLabelPaint(this.map, "user-peaks-labels", this.currentStyle);
      } catch (error) {
        console.warn(
          "Failed to update user-peaks-labels paint for style:",
          error
        );
      }
    }
  }

  /**
   * Check if the manager is still valid
   */
  private isValid(): boolean {
    return !this.isDestroyed && this.map && !this.map._removed;
  }

  /**
   * Wait for map style to be loaded
   */
  private async waitForStyle(): Promise<boolean> {
    if (!this.isValid()) return false;

    if (this.map.isStyleLoaded()) return true;

    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;

      const checkStyle = () => {
        if (!this.isValid() || attempts >= maxAttempts) {
          resolve(false);
          return;
        }

        if (this.map.isStyleLoaded()) {
          resolve(true);
        } else {
          attempts++;
          setTimeout(checkStyle, STYLE_CHECK_INTERVAL);
        }
      };

      checkStyle();
    });
  }

  /**
   * Set visibility for multiple layers
   */
  private setLayersVisibility(
    layerIds: readonly string[],
    visibility: (typeof LAYER_VISIBILITY)[keyof typeof LAYER_VISIBILITY]
  ): void {
    if (!this.isValid()) return;

    layerIds.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        try {
          this.map.setLayoutProperty(layerId, "visibility", visibility);
        } catch (error) {
          console.warn(`Failed to set visibility for layer ${layerId}:`, error);
        }
      }
    });
  }

  /**
   * Remove layers safely
   */
  private removeLayers(layerIds: readonly string[]): void {
    if (!this.isValid()) return;

    layerIds.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        try {
          this.map.removeLayer(layerId);
        } catch (error) {
          console.warn(`Failed to remove layer ${layerId}:`, error);
        }
      }
    });
  }

  /**
   * Remove source safely
   */
  private removeSource(sourceId: string): void {
    if (!this.isValid()) return;

    if (this.map.getSource(sourceId)) {
      try {
        this.map.removeSource(sourceId);
      } catch (error) {
        console.warn(`Failed to remove source ${sourceId}:`, error);
      }
    }
  }

  /**
   * Calculate bounds from features
   */
  private calculateBounds(
    features: GeoJSON.Feature[]
  ): BoundsCoordinates | null {
    if (!features || features.length === 0) return null;

    const bounds: BoundsCoordinates = {
      minLng: Infinity,
      maxLng: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity,
    };

    features.forEach((feature) => {
      if (feature.geometry?.type === "Point") {
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates;
        if (
          Array.isArray(coordinates) &&
          typeof coordinates[0] === "number" &&
          typeof coordinates[1] === "number"
        ) {
          const lng = coordinates[0];
          const lat = coordinates[1];
          bounds.minLng = Math.min(bounds.minLng, lng);
          bounds.maxLng = Math.max(bounds.maxLng, lng);
          bounds.minLat = Math.min(bounds.minLat, lat);
          bounds.maxLat = Math.max(bounds.maxLat, lat);
        }
      }
    });

    // Validate bounds
    if (
      bounds.minLng === Infinity ||
      bounds.maxLng === -Infinity ||
      bounds.minLat === Infinity ||
      bounds.maxLat === -Infinity
    ) {
      return null;
    }

    return bounds;
  }

  /**
   * Calculate padding for map bounds
   */
  private calculateMapPadding(): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } {
    // Round all values to integers
    return {
      top: Math.round(16), // Small margin
      right: Math.round(16),
      bottom: Math.round(16),
      left: Math.round(16), // Small margin
    };
  }

  /**
   * Fit map to bounds with padding
   */
  private fitToBounds(bounds: BoundsCoordinates): void {
    if (!this.isValid()) return;

    const mapPadding = this.calculateMapPadding();

    const lngPadding = Math.max(
      0.1,
      (bounds.maxLng - bounds.minLng) * DEFAULT_PADDING
    );
    const latPadding = Math.max(
      0.1,
      (bounds.maxLat - bounds.minLat) * DEFAULT_PADDING
    );

    const mapBounds: [[number, number], [number, number]] = [
      [bounds.minLng - lngPadding, bounds.minLat - latPadding],
      [bounds.maxLng + lngPadding, bounds.maxLat + latPadding],
    ];

    try {
      this.map.fitBounds(mapBounds, {
        ...FIT_BOUNDS_OPTIONS,
        padding: mapPadding,
      });
    } catch (error) {
      console.warn("Failed to fit bounds:", error);
    }
  }

  /**
   * Wait for source to be loaded
   */
  private async waitForSource(sourceId: string): Promise<boolean> {
    if (!this.isValid()) return false;

    return new Promise((resolve) => {
      let attempts = 0;

      const checkSource = () => {
        if (!this.isValid() || attempts >= SOURCE_CHECK_RETRIES) {
          resolve(false);
          return;
        }

        if (this.map.isSourceLoaded(sourceId)) {
          resolve(true);
        } else {
          attempts++;
          setTimeout(checkSource, SOURCE_CHECK_DELAY);
        }
      };

      checkSource();
    });
  }

  /**
   * Unified method to set active filter (tile, user-peaks, or list-detail)
   * This is the main entry point for switching between filter modes
   */
  public async setActiveFilter(
    filterState:
      | { type: "tile" }
      | { type: "user-peaks"; data: UserPeaksWithGeoJSON | null }
      | { type: "list-detail"; data: PeakListWithPeaks | null; geojson?: ListPeaksGeoJSONResponse | null },
    shouldFitBounds: boolean = false
  ): Promise<void> {
    if (!this.isValid()) return;

    const styleReady = await this.waitForStyle();
    if (!styleReady) return;


    switch (filterState.type) {
      case "tile":
        // Show tile peaks and shelters, hide everything else
        this.currentVisualizationMode = "tile";
        this.restoreVisualizationMode();
        break;

      case "user-peaks":
        if (!filterState.data) {
          console.warn("[MapLayerManager] No user peaks data provided");
          return;
        }
        // Hide list peaks, show user peaks
        this.hideListPeaks();
        await this.addUserPeaksSource(filterState.data, shouldFitBounds);
        this.currentVisualizationMode = "user";
        this.restoreVisualizationMode();
        this.updateTileLayerFilters();
        break;

      case "list-detail":
        if (!filterState.data || !filterState.geojson) {
          console.warn("[MapLayerManager] Missing list data or GeoJSON");
          return;
        }
        // Hide user peaks, show list peaks
        this.hideUserPeaks();
        await this.addListPeaksSource(filterState.data, filterState.geojson, shouldFitBounds);
        this.currentVisualizationMode = "list";
        this.restoreVisualizationMode();
        this.updateTileLayerFilters();
        break;
    }
  }

  // Public methods for tile peaks
  public hideTilePeaks(): void {
    this.setLayersVisibility(LAYER_IDS.TILE_PEAKS, LAYER_VISIBILITY.NONE);
  }

  public showTilePeaks(): void {
    this.setLayersVisibility(LAYER_IDS.TILE_PEAKS, LAYER_VISIBILITY.VISIBLE);
    this.currentVisualizationMode = "tile";
  }

  // Public methods for list peaks
  public async addListPeaksSource(
    list: PeakListWithPeaks,
    geojson: ListPeaksGeoJSONResponse,
    fitBounds: boolean = true
  ): Promise<void> {
    if (!this.isValid()) return;

    const styleReady = await this.waitForStyle();
    if (!styleReady) return;

    // Store current list peaks and geojson for persistence
    this.currentListPeaks = list;
    this.currentListGeoJson = geojson;

    // Clean up existing list peaks
    this.removeLayers(LAYER_IDS.LIST_PEAKS);
    this.removeSource(SOURCE_IDS.LIST_PEAKS);

    // Add new source
    try {
      this.map.addSource(SOURCE_IDS.LIST_PEAKS, {
        type: "geojson",
        data: geojson,
      });
    } catch (error) {
      console.warn("Failed to add list peaks source:", error);
      return;
    }

    // Add completed peaks layer
    const completedBaseFilter: FilterSpecification = [
      "==",
      ["get", "completed"],
      true,
    ];
    this.listPeakBaseFilters.set("list-peaks-completed", completedBaseFilter);

    this.map.addLayer({
      id: "list-peaks-completed",
      type: "symbol",
      source: SOURCE_IDS.LIST_PEAKS,
      layout: createPeakSymbolLayout({
        family: "map",
        iconImage: "list_peak_user",
        iconIgnorePlacement: true,
        symbolSortKey: ["get", "elevation"],
        visibility: LAYER_VISIBILITY.VISIBLE,
      }),
      filter: [
        "all",
        getElevationRangeFilter(this.elevationRange[0], this.elevationRange[1]),
        completedBaseFilter,
      ],
    });

    // Add elevation-based layers (reversed order to have higher elevation on top)
    [...ELEVATION_RANGES].reverse().forEach(({ min, max, icon, layer }) => {
      const baseFilter: FilterSpecification = [
        "all",
        [">=", ["get", "elevation"], min],
        ["<", ["get", "elevation"], max],
        ["==", ["get", "completed"], false],
      ];
      this.listPeakBaseFilters.set(layer, baseFilter);

      this.map.addLayer({
        id: layer,
        type: "symbol",
        source: SOURCE_IDS.LIST_PEAKS,
        layout: createPeakSymbolLayout({
          family: "map",
          iconImage: icon,
          symbolSortKey: ["get", "elevation"],
          visibility: LAYER_VISIBILITY.VISIBLE,
        }),
        filter: [
          "all",
          getElevationRangeFilter(
            this.elevationRange[0],
            this.elevationRange[1]
          ),
          baseFilter,
        ],
      });
    });

    // Add elevation-based label layers (higher elevation on top)
    [...ELEVATION_RANGES].reverse().forEach(({ min, max, layer }) => {
      const labelBaseFilter: FilterSpecification = [
        "all",
        [">=", ["get", "elevation"], min],
        ["<", ["get", "elevation"], max],
        ["==", ["get", "completed"], false],
      ];
      this.listPeakBaseFilters.set(`${layer}-labels`, labelBaseFilter);

      this.map.addLayer({
        id: `${layer}-labels`,
        type: "symbol",
        source: SOURCE_IDS.LIST_PEAKS,
        layout: createPeakLabelLayout({
          family: "map",
          symbolSortKey: ["get", "elevation"],
          textIgnorePlacement: false,
          textOptional: true,
          visibility: LAYER_VISIBILITY.VISIBLE,
        }),
        paint: getPeakLabelPaint(getPeakLabelTheme(this.currentStyle)),
        filter: [
          "all",
          getElevationRangeFilter(
            this.elevationRange[0],
            this.elevationRange[1]
          ),
          labelBaseFilter,
        ],
      });
    });

    // Add completed peaks labels layer (always on top)
    const completedLabelsBaseFilter: FilterSpecification = [
      "==",
      ["get", "completed"],
      true,
    ];
    this.listPeakBaseFilters.set(
      "list-peaks-completed-labels",
      completedLabelsBaseFilter
    );

    this.map.addLayer({
      id: "list-peaks-completed-labels",
      type: "symbol",
      source: SOURCE_IDS.LIST_PEAKS,
      layout: createPeakLabelLayout({
        family: "map",
        symbolSortKey: ["get", "elevation"],
        textIgnorePlacement: false,
        textOptional: true,
        visibility: LAYER_VISIBILITY.VISIBLE,
      }),
      paint: getPeakLabelPaint(getPeakLabelTheme(this.currentStyle)),
      filter: [
        "all",
        getElevationRangeFilter(this.elevationRange[0], this.elevationRange[1]),
        completedLabelsBaseFilter,
      ],
    });

    // Move completed layer to top
    if (this.map.getLayer("list-peaks-completed")) {
      this.map.moveLayer("list-peaks-completed");
    }

    // Set visualization mode and optionally fit bounds after source is loaded
    this.currentVisualizationMode = "list";
    if (fitBounds) {
      const sourceLoaded = await this.waitForSource(SOURCE_IDS.LIST_PEAKS);
      if (sourceLoaded) {
        const bounds = this.calculateBounds(geojson.features);
        if (bounds) {
          this.fitToBounds(bounds);
        }
      }
    }
  }

  public removeListPeaks(): void {
    this.removeLayers(LAYER_IDS.LIST_PEAKS);
    this.removeSource(SOURCE_IDS.LIST_PEAKS);
    this.currentListPeaks = null;
    // Clear stored base filters
    this.listPeakBaseFilters.clear();
    // Reset to tile mode if we were in list mode
    if (this.currentVisualizationMode === "list") {
      this.currentVisualizationMode = "tile";
    }
  }

  public showListPeaks(): void {
    this.setLayersVisibility(LAYER_IDS.LIST_PEAKS, LAYER_VISIBILITY.VISIBLE);
    this.currentVisualizationMode = "list";
  }

  public hideListPeaks(): void {
    this.setLayersVisibility(LAYER_IDS.LIST_PEAKS, LAYER_VISIBILITY.NONE);
  }

  // Public methods for user peaks
  public async addUserPeaksSource(
    userPeaks: UserPeaksWithGeoJSON,
    fitBounds: boolean = true
  ): Promise<void> {
    if (!this.isValid()) return;

    const styleReady = await this.waitForStyle();
    if (!styleReady) return;

    // Store current user peaks for persistence
    this.currentUserPeaks = userPeaks;

    // Clean up existing user peaks
    this.removeLayers(LAYER_IDS.USER_PEAKS);
    this.removeSource(SOURCE_IDS.USER_PEAKS);

    // Add new source
    try {
      this.map.addSource(SOURCE_IDS.USER_PEAKS, {
        type: "geojson",
        data: userPeaks.geojson,
      });
    } catch (error) {
      console.warn("Failed to add user peaks source:", error);
      return;
    }

    // Add user peaks layer
    this.map.addLayer({
      id: "user-peaks-symbols",
      type: "symbol",
      source: SOURCE_IDS.USER_PEAKS,
      layout: createPeakSymbolLayout({
        family: "map",
        iconImage: "list_peak_user",
        symbolSortKey: ["get", "elevation"],
        visibility: LAYER_VISIBILITY.VISIBLE,
      }),
      filter: getElevationRangeFilter(
        this.elevationRange[0],
        this.elevationRange[1]
      ),
    });

    // Add user peaks labels layer
    this.map.addLayer({
      id: "user-peaks-labels",
      type: "symbol",
      source: SOURCE_IDS.USER_PEAKS,
      layout: createPeakLabelLayout({
        family: "map",
        symbolSortKey: ["get", "elevation"],
        textIgnorePlacement: false,
        textOptional: true,
        visibility: LAYER_VISIBILITY.VISIBLE,
      }),
      paint: getPeakLabelPaint(getPeakLabelTheme(this.currentStyle)),
      filter: getElevationRangeFilter(
        this.elevationRange[0],
        this.elevationRange[1]
      ),
    });

    // Set visualization mode and optionally fit bounds to user peaks
    this.currentVisualizationMode = "user";
    if (fitBounds) {
      const bounds = this.calculateBounds(userPeaks.geojson.features);
      if (bounds) {
        this.fitToBounds(bounds);
      }
    }
  }

  public showUserPeaks(): void {
    this.setLayersVisibility(LAYER_IDS.USER_PEAKS, LAYER_VISIBILITY.VISIBLE);
    this.currentVisualizationMode = "user";
  }

  public hideUserPeaks(): void {
    this.setLayersVisibility(LAYER_IDS.USER_PEAKS, LAYER_VISIBILITY.NONE);
  }

  public removeUserPeaks(): void {
    this.removeLayers(LAYER_IDS.USER_PEAKS);
    this.removeSource(SOURCE_IDS.USER_PEAKS);
    this.currentUserPeaks = null;
    // Reset to tile mode if we were in user mode
    if (this.currentVisualizationMode === "user") {
      this.currentVisualizationMode = "tile";
    }
  }

  public async fitBoundsToUserPeaksPublic(
    userPeaks: UserPeaksWithGeoJSON
  ): Promise<void> {
    if (!this.isValid()) return;

    const bounds = this.calculateBounds(userPeaks.geojson.features);
    if (bounds) {
      this.fitToBounds(bounds);
    }
  }

  // Reset to default view
  public resetToDefaultView(): void {
    if (!this.isValid()) return;

    try {
      this.map.flyTo(DEFAULT_VIEW);
    } catch (error) {
      console.warn("Failed to reset view:", error);
    }
  }

  // Style and projection management
  public async setMapStyle(style: "outdoors" | "satellite"): Promise<void> {
    if (!this.isValid()) return;

    const newStyle =
      style === "satellite" ? MAP_STYLES.SATELLITE : MAP_STYLES.OUTDOORS;

    if (this.currentStyle !== newStyle) {
      this.currentStyle = newStyle;
      try {
        this.map.setStyle(newStyle);
        // Configure fog immediately after style change
        this.configureFog();
        // Ensure labels reflect new style promptly
        this.updatePeakLabelPaintForStyle();
      } catch (error) {
        console.warn("Failed to set map style:", error);
      }
    }
  }

  public setGlobeProjection(enabled: boolean): void {
    if (!this.isValid()) return;

    this.isGlobeEnabled = enabled;
    const projection = enabled ? PROJECTIONS.GLOBE : PROJECTIONS.MERCATOR;

    try {
      this.map.setProjection(projection);
    } catch (error) {
      console.warn("Failed to set projection:", error);
    }
  }

  public getCurrentStyle(): string {
    return this.currentStyle;
  }

  public setCurrentStyle(style: string): void {
    this.currentStyle = style;
  }

  public isGlobeProjectionEnabled(): boolean {
    return this.isGlobeEnabled;
  }

  public setElevationRange(range: [number, number]): void {
    this.elevationRange = range;
    this.updateTileLayerFilters();

    if (!this.isValid()) return;

    // Check if this is the default range (show all peaks)
    const isDefaultRange = range[0] === 0 && range[1] === 8849;
    const filter = isDefaultRange
      ? null
      : getElevationRangeFilter(range[0], range[1]);

    // Update user peaks
    if (this.map.getLayer("user-peaks-symbols")) {
      this.map.setFilter("user-peaks-symbols", filter);
    }
    if (this.map.getLayer("user-peaks-labels")) {
      this.map.setFilter("user-peaks-labels", filter);
    }

    // Update shelter layers
    if (this.map.getLayer("shelter-symbols")) {
      this.map.setFilter("shelter-symbols", filter);
    }
    if (this.map.getLayer("shelter-labels")) {
      this.map.setFilter("shelter-labels", filter);
    }

    // Update list peaks with stored base filters
    const listPeakLayers = [
      "list-peaks-completed",
      "list-peaks-black",
      "list-peaks-burgundy",
      "list-peaks-red",
      "list-peaks-orange",
      "list-peaks-yellow",
      "list-peaks-green",
    ];

    listPeakLayers.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        const baseFilter = this.listPeakBaseFilters.get(layerId);
        if (baseFilter) {
          if (filter) {
            // Combine user elevation filter with layer base filter
            const combinedFilter = ["all", filter, baseFilter];
            this.map.setFilter(layerId, combinedFilter);
          } else {
            // No elevation filter, just use the base filter
            this.map.setFilter(layerId, baseFilter);
          }
        } else {
          // No base filter stored, apply elevation filter (or null if default range)
          this.map.setFilter(layerId, filter);
        }
      }
    });

    // Update list peak labels with stored base filters
    const listPeakLabelLayers = [
      "list-peaks-completed-labels",
      "list-peaks-black-labels",
      "list-peaks-burgundy-labels",
      "list-peaks-red-labels",
      "list-peaks-orange-labels",
      "list-peaks-yellow-labels",
      "list-peaks-green-labels",
    ];

    listPeakLabelLayers.forEach((layerId) => {
      if (this.map.getLayer(layerId)) {
        const baseFilter = this.listPeakBaseFilters.get(layerId);
        if (baseFilter) {
          if (filter) {
            // Combine user elevation filter with layer base filter
            const combinedFilter = ["all", filter, baseFilter];
            this.map.setFilter(layerId, combinedFilter);
          } else {
            // No elevation filter, just use the base filter
            this.map.setFilter(layerId, baseFilter);
          }
        } else {
          // No base filter stored, apply elevation filter (or null if default range)
          this.map.setFilter(layerId, filter);
        }
      }
    });
  }

  /**
   * Update tile layer filters to include elevation range and exclude user peaks if needed
   */
  private updateTileLayerFilters(): void {
    if (!this.isValid()) return;

    // 1. Get base elevation filter
    let elevationFilter: any = null;
    if (this.elevationRange[0] !== 0 || this.elevationRange[1] !== 8849) {
      elevationFilter = getElevationRangeFilter(
        this.elevationRange[0],
        this.elevationRange[1]
      );
    }

    // 2. Determine exclusion filter (completed/list peaks)
    // We exclude peaks that are already being shown by the active layer (user or list)
    let exclusionFilter: any = null;
    let idsToExclude: number[] = [];

    if (this.isNearbyPeaksEnabled) {
      if (this.currentVisualizationMode === "user" && this.currentUserPeaks) {
        // Exclude all peaks that are currently being shown by the user peaks layer
        idsToExclude = this.currentUserPeaks.geojson.features
          .map((f) => Number(f.properties.id))
          .filter((id) => !isNaN(id));
      } else if (this.currentVisualizationMode === "list" && this.currentListGeoJson) {
        // Exclude all peaks that are part of the current list to avoid duplication
        idsToExclude = this.currentListGeoJson.features.map((f) => f.properties.id);
      }
    }

    if (idsToExclude.length > 0) {
      // Use literal array for exclusion, checking all common ID property names
      // We also check for string IDs just in case the tile server returns them as strings
      exclusionFilter = [
        "!",
        [
          "any",
          ["in", ["id"], ["literal", idsToExclude]],
          ["in", ["get", "id"], ["literal", idsToExclude]],
          ["in", ["get", "peak_id"], ["literal", idsToExclude]],
          ["in", ["to-number", ["get", "id"]], ["literal", idsToExclude]],
          ["in", ["to-number", ["get", "peak_id"]], ["literal", idsToExclude]],
        ],
      ];
    }

    // 3. Combine filters
    let finalFilter: any = null;
    if (elevationFilter && exclusionFilter) {
      finalFilter = ["all", elevationFilter, exclusionFilter];
    } else if (elevationFilter) {
      finalFilter = elevationFilter;
    } else if (exclusionFilter) {
      finalFilter = exclusionFilter;
    }

    // 4. Apply to layers
    if (this.map.getLayer("peak-symbols")) {
      this.map.setFilter("peak-symbols", finalFilter);
    }
    if (this.map.getLayer("peak-labels")) {
      this.map.setFilter("peak-labels", finalFilter);
    }
    if (this.map.getLayer("shelter-symbols")) {
      this.map.setFilter("shelter-symbols", finalFilter);
    }
    if (this.map.getLayer("shelter-labels")) {
      this.map.setFilter("shelter-labels", finalFilter);
    }
  }
}
