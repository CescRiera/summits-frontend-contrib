// Elevation color and icon logic
export const getElevationColor = (elevation: number) => {
  if (elevation >= 8000) return "#000000";
  if (elevation >= 6000) return "#480001";
  if (elevation >= 4000) return "#ff0000";
  if (elevation >= 3000) return "#ff7300";
  if (elevation >= 2000) return "#ffbb00";
  return "#00ae21";
};

export const getElevationIcon = (elevation: number) => {
  if (elevation >= 8000) return "/icons/altitude/ic_mountain_black.png";
  if (elevation >= 6000) return "/icons/altitude/ic_mountain_burgundy.png";
  if (elevation >= 4000) return "/icons/altitude/ic_mountain_red.png";
  if (elevation >= 3000) return "/icons/altitude/ic_mountain_orange.png";
  if (elevation >= 2000) return "/icons/altitude/ic_mountain_yellow.png";
  return "/icons/altitude/ic_mountain_green.png";
};

// Improved fuzzy search function for peak names
export const fuzzySearch = (query: string, text: string | null | undefined): boolean => {
  if (!query || !query.trim()) return true;
  if (!text) return false;

  const normalizedQuery = query.toLowerCase().trim();
  const normalizedText = text.toLowerCase();

  // Direct substring match (highest priority)
  if (normalizedText.includes(normalizedQuery)) return true;

  // Word boundary match - check if query matches at word boundaries
  const words = normalizedText.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(normalizedQuery) || word.includes(normalizedQuery)) {
      return true;
    }
  }

  // More strict fuzzy match: require at least 70% of characters to match in order
  // and the first character must match
  if (normalizedQuery.length < 3) {
    return false; // Don't do fuzzy matching for very short queries
  }

  if (normalizedText[0] !== normalizedQuery[0]) {
    return false; // First character must match
  }

  let queryIndex = 0;
  let matchCount = 0;

  for (
    let i = 0;
    i < normalizedText.length && queryIndex < normalizedQuery.length;
    i++
  ) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      queryIndex++;
      matchCount++;
    }
  }

  // Require at least 70% of characters to match
  const matchRatio = matchCount / normalizedQuery.length;
  return queryIndex === normalizedQuery.length && matchRatio >= 0.7;
};
