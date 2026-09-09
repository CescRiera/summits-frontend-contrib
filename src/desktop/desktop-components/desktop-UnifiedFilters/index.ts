export { default as UnifiedControls } from "./desktop-UnifiedControls/desktop-UnifiedControls.tsx";
export { default as UnifiedSearchbar } from "./desktop-UnifiedSearchbar/desktop-UnifiedSearchbar.tsx";
export {
  default as UnifiedOrderBy,
  type OrderField,
  type OrderDirection,
} from "./desktop-UnifiedOrderBy/desktop-UnifiedOrderBy.tsx";
export {
  default as UnifiedFilterSection,
  type UnifiedFilterOption,
} from "./desktop-UnifiedFilterSection/desktop-UnifiedFilterSection.tsx";
export { default as SimpleCalendar } from "./desktop-SimpleCalendar/desktop-SimpleCalendar.tsx";

// Deprecated - kept for backward compatibility
/** @deprecated Use UnifiedControls with direct filter props instead */
export { default as UnifiedFiltersTrigger } from "./desktop-UnifiedFiltersTrigger/desktop-UnifiedFiltersTrigger.tsx";
/** @deprecated Use UnifiedControls with direct filter props instead */
export { default as UnifiedFiltersPopup } from "./desktop-UnifiedFiltersPopup/desktop-UnifiedFiltersPopup.tsx";


