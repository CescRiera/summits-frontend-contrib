import type { AdminSearchResult } from "../api/types";
import type { AdminArea } from "../api/types/common";

export interface SearchSelectedAdminLevel {
  options: AdminArea[];
  selectedId: number | null;
  loading: boolean;
  selectedName: string | null;
}

const normalizeAdminName = (value?: string | null): string =>
  value?.trim().toLowerCase() ?? "";

const splitAdminName = (value: string): string[] =>
  value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

const findAdminOptionByName = (
  options: AdminArea[],
  name?: string | null
): AdminArea | null => {
  const normalizedName = normalizeAdminName(name);
  if (!normalizedName) return null;

  return (
    options.find(
      (option) => normalizeAdminName(option.name) === normalizedName
    ) || null
  );
};

const ensureAdminOption = (
  options: AdminArea[],
  injectedOption: AdminArea
): AdminArea[] => {
  if (options.some((option) => option.osm_id === injectedOption.osm_id)) {
    return options;
  }

  return [injectedOption, ...options];
};

const getAdminBreadcrumb = (
  result: AdminSearchResult
): { displayName: string; ancestors: string[] } => {
  const fullNameParts = splitAdminName(result.name);
  const preferredDisplayName = result.name_only?.trim();
  const displayName =
    preferredDisplayName || fullNameParts[0] || result.name.trim();

  let ancestorParts: string[] = [];

  if (preferredDisplayName) {
    const matchingIndex = fullNameParts.findIndex(
      (part) =>
        normalizeAdminName(part) === normalizeAdminName(preferredDisplayName)
    );

    if (matchingIndex >= 0) {
      ancestorParts = fullNameParts.filter((_, index) => index !== matchingIndex);
    } else if (fullNameParts.length > 1) {
      ancestorParts = fullNameParts.slice(1);
    }
  } else if (fullNameParts.length > 1) {
    ancestorParts = fullNameParts.slice(1);
  }

  const ancestors = ancestorParts.slice().reverse();
  const normalizedParentName = normalizeAdminName(result.parent_name);

  if (
    normalizedParentName &&
    !ancestors.some(
      (ancestor) => normalizeAdminName(ancestor) === normalizedParentName
    )
  ) {
    ancestors.push(result.parent_name!.trim());
  }

  return { displayName, ancestors };
};

export const buildAdminLevelsFromSearchResult = async (
  result: AdminSearchResult,
  currentCountryOptions: AdminArea[],
  loadCountries: () => Promise<AdminArea[]>,
  loadChildren: (parentOsmId: number) => Promise<AdminArea[]>
): Promise<SearchSelectedAdminLevel[]> => {
  const countries =
    currentCountryOptions.length > 0
      ? currentCountryOptions
      : await loadCountries();
  const { displayName, ancestors } = getAdminBreadcrumb(result);

  const levels: SearchSelectedAdminLevel[] = [];
  let currentOptions = countries;

  for (const ancestorName of ancestors) {
    const matchedAncestor = findAdminOptionByName(currentOptions, ancestorName);
    if (!matchedAncestor) break;

    levels.push({
      options: currentOptions,
      selectedId: matchedAncestor.osm_id,
      loading: false,
      selectedName: matchedAncestor.name,
    });

    currentOptions = await loadChildren(matchedAncestor.osm_id);
  }

  const matchedTarget =
    currentOptions.find((option) => option.osm_id === result.id) ||
    findAdminOptionByName(currentOptions, displayName);

  const selectedTarget: AdminArea =
    matchedTarget || {
      osm_id: result.id,
      level: result.admin_level,
      name: displayName,
    };

  levels.push({
    options: ensureAdminOption(currentOptions, selectedTarget),
    selectedId: selectedTarget.osm_id,
    loading: false,
    selectedName: selectedTarget.name,
  });

  try {
    const children = await loadChildren(result.id);
    if (children.length > 0) {
      levels.push({
        options: children,
        selectedId: null,
        loading: false,
        selectedName: null,
      });
    }
  } catch (error) {
    console.error("Failed to load admin children from search selection:", error);
  }

  return levels;
};
