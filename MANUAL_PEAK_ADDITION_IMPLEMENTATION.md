# Manual Peak Addition Feature - Implementation Summary

**Status**: ✅ Core implementation complete  
**Date**: January 27, 2026  
**Scope**: Full feature plan with foundational code for both mobile and desktop platforms

---

## Overview

A complete feature implementation for **Manual Peak Addition** that allows users to discover, select, and add multiple peaks to their profile. The feature includes:

- **Shared state management** via custom hook
- **Extended Discovery API** with peak name search
- **New API endpoint** for bulk peak addition
- **Route association flow** (bottom sheet on mobile, modal on desktop)
- **Dual platform UX**: List/Map toggle on mobile, two-column layout on desktop
- **Comprehensive translation support** for both platforms
- **Entry points** from User Peaks pages

---

## Architecture & File Structure

### Shared Layer (`src/shared/`)

#### 1. **useManualPeakSelection Hook**

**File**: `src/shared/hooks/useManualPeakSelection.ts`

Custom React hook managing multi-peak selection state:

- Tracks selected peaks with their route associations
- Manages filter state (query, country, region, elevation range)
- Provides bulk submission payload preparation
- Key methods:
  - `togglePeakSelection(peakId)` - toggle peak selection
  - `associateRoute(peakId, routeId)` - associate/disassociate peak with route
  - `updateFilter(key, value)` - update individual filter
  - `getSubmissionPayload()` - prepare API payload

**State Structure**:

```typescript
interface SelectedManualPeak {
  peak_id: number;
  route_id: number | null; // null = standalone, otherwise route ID
}

interface ManualPeakFilters {
  query: string; // Peak name search (min 2 chars)
  country_id: string | null;
  region_id: string | null;
  min_elevation: number | null;
  max_elevation: number | null;
}
```

#### 2. **Extended Discovery API**

**File**: `src/shared/api/endpoints/peaks.ts`

Updated `discoverPeaks()` function:

- Added `query` parameter for peak name search (minimum 2 characters)
- Only sends query to backend if length >= 2
- Request body:
  ```typescript
  {
    page: number,
    limit: number,
    query?: string,           // NEW: Peak name search
    min_elevation?: number,
    max_elevation?: number,
    country_id?: string | string[],
    region_id?: string | string[],
    exclude_ids?: string[]
  }
  ```

#### 3. **New addManualPeaks Endpoint**

**File**: `src/shared/api/endpoints/user.ts`

New endpoint function:

```typescript
export const addManualPeaks = async (
  peaks: Array<{
    peak_id: number;
    route_id: number | null;
  }>,
) => await api.post("/api/user-data/addManualPeaks", { peaks });
```

---

### Mobile Implementation (`src/mobile/`)

#### 1. **Main AddManualPeaks Page**

**Files**:

- `src/mobile/NonPersistentPages/AddManualPeaks/AddManualPeaks.tsx`
- `src/mobile/NonPersistentPages/AddManualPeaks/AddManualPeaks.module.css`

Features:

- **View Mode Toggle**: Segmented control at top (List / Map)
- **Dual View Modes**:
  - **List Mode**: Collapsible filters + scrollable peak list with checkboxes
  - **Map Mode**: Minimal map with elevation markers (Mapbox GL placeholder)
- **Infinite Scroll**: Loads more peaks when user reaches bottom
- **Route Association**: Per-peak prompt via bottom sheet
- **Sticky Footer**: "Add Selected Peaks" button with count badge
- **Optimistic UI**: Updates state immediately, rollback on error
- **Error Handling**: User-friendly error messages with retry

**Entry Point**: `navigate("/addManualPeaks")`

#### 2. **Route Association Bottom Sheet**

**Files**:

- `src/mobile/components/RouteAssociation/RouteAssociationBottomSheet.tsx`
- `src/mobile/components/RouteAssociation/RouteAssociationBottomSheet.module.css`

Features:

- Shows: "Does this peak belong to an existing route?"
- Fetches user's routes on load
- Route list expandable to show peak count
- YES: Select route → confirm association
- NO: Add as standalone (route_id = null)
- Returns selected route_id or null to main flow

**UX**: Bottom sheet slides up, blocks interaction until confirmed/cancelled

#### 3. **Sub-Components**

**PeakFilters** (`components/PeakFilters.tsx` + CSS)

- Collapsible filter panel
- Search field (min 2 chars)
- Elevation range (min/max)
- Country & Region dropdowns
- Clear filters button
- Active filter badge

**AddManualPeaksList** (`components/AddManualPeaksList.tsx` + CSS)

- Scrollable list of peaks
- Checkbox (circle icon) for selection
- Peak name, elevation, region metadata
- Route association indicator (badge)
- Tap to initiate route association

**AddManualPeaksMap** (`components/AddManualPeaksMap.tsx` + CSS)

- Placeholder for Mapbox GL integration
- Should render:
  - Tile layer
  - Elevation-colored markers
  - Marker tap → select peak + route association prompt
  - Highlight selected markers

#### 4. **Entry Point**

**File**: `src/mobile/NonPersistentPages/UserPeaks/UserPeaks.tsx` (modified)

Added "Add Peaks" button (only visible for current user):

```tsx
{
  !id && (
    <div className={styles["userPeaks__add-peaks-button"]}>
      <button onClick={() => navigate("/addManualPeaks")}>
        {t("userPeaks.addPeaks")}
      </button>
    </div>
  );
}
```

---

### Desktop Implementation (`src/desktop/`)

#### 1. **Main AddManualPeaks Page**

**Files**:

- `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/desktop-AddManualPeaks.tsx`
- `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/desktop-AddManualPeaks.module.css`

Features:

- **Two-Column Layout**:
  - Left: Filters (always visible) + scrollable peak list
  - Right: Interactive map
- **Header**: Title, subtitle, close button
- **Peak List**: Checkbox selection, synchronized with map
- **Map Markers**: Click to select/deselect, synced with list
- **Infinite Scroll**: In left column for peaks list
- **Route Association**: Modal dialog (centered overlay)
- **Sticky Footer**: Selected count + "Add Peaks" CTA
- **Power User Focused**: Efficient multi-selection workflow

**Entry Point**: `navigate("/addManualPeaks")`

#### 2. **Route Association Modal**

**Files**:

- `src/desktop/desktop-components/desktop-RouteAssociation/desktop-RouteAssociationModal.tsx`
- `src/desktop/desktop-components/desktop-RouteAssociation/desktop-RouteAssociationModal.module.css`

Features:

- Modal dialog (500px max width, centered, 80vh max height)
- Route selection with checkbox-style selection
- Route metadata (name, date, peak count)
- Hover states for better UX
- YES/NO buttons
- X close button
- Smooth backdrop overlay

#### 3. **Sub-Components**

**desktop-PeakFilters** (`components/desktop-PeakFilters.tsx` + CSS)

- Always-visible sidebar filters
- Same filter options as mobile
- Clean, compact design for desktop
- Clear filters button

**desktop-AddManualPeaksList** (`components/desktop-AddManualPeaksList.tsx` + CSS)

- Scrollable list in left column
- Checkbox selection (circle/check icons)
- Hover highlight states
- Left border indicator for selected items
- Peak info (name, elevation, region)
- Route association indicator

**desktop-AddManualPeaksMap** (`components/desktop-AddManualPeaksMap.tsx` + CSS)

- Placeholder for Mapbox GL integration
- Full right column layout
- Should render:
  - Tile layer
  - Elevation-colored markers
  - Marker click → select peak + open route modal
  - Highlight selected markers

#### 4. **Entry Point**

**File**: `src/desktop/desktop-NonPersistentPages/desktop-UserPeaks/desktop-UserPeaks.tsx` (modified)

Added "Add Peaks" button (only visible for current user):

```tsx
{
  !id && (
    <div className={styles["userPeaks__add-peaks-button"]}>
      <button onClick={() => navigate("/addManualPeaks")}>
        {t("userPeaks.addPeaks")}
      </button>
    </div>
  );
}
```

---

## Translations

**File**: `src/shared/locales/en.json`

Added sections:

```json
{
  "userPeaks": {
    "addPeaks": "Add Peaks"
  },
  "addManualPeaks": {
    "title": "Add Manual Peaks",
    "subtitle": "...",
    "listView": "List",
    "mapView": "Map",
    "filters": "Filters",
    "peakName": "Peak name"
    // ... (28 keys total)
  },
  "routeAssociation": {
    "title": "Associate with Route",
    "subtitle": "Does '{peakName}' belong to an existing route?"
    // ... (8 keys total)
  }
}
```

**Next Steps**: Add corresponding translations to other language files (ca.json, es.json, fr.json)

---

## User Flow

### Complete User Journey

1. **Entry**: User taps "Add Peaks" button on User Peaks page
2. **Discovery**:
   - Mobile: Starts in List view with filters
   - Desktop: Two-column layout
3. **Search & Filter**: User refines peaks using query + elevation + location
4. **Selection**:
   - Tap/click peak checkbox to select
   - Selected peaks highlighted visually
5. **Route Association** (per peak):
   - Bottom sheet/modal opens: "Does this peak belong to a route?"
   - User chooses YES → select from route list → confirm
   - User chooses NO → peak added as standalone
6. **Submission**:
   - User taps "Add Selected Peaks"
   - API call to `POST /api/user-data/addManualPeaks` with payload
   - Optimistic UI update
   - Success → navigate back to User Peaks
   - Error → show message, allow retry
7. **Confirmation**: New peaks appear in user's peak list

---

## State Management Flow

```
Main Page Component
  ├─ useManualPeakSelection hook
  │  ├─ selectedPeaks: SelectedManualPeak[]
  │  ├─ filters: ManualPeakFilters
  │  └─ methods: togglePeakSelection, associateRoute, etc.
  │
  ├─ discoverPeaks API call
  │  └─ peaks: DiscoveryPeak[]
  │
  ├─ List/Map View Toggle (mobile only)
  │
  ├─ Render Sub-Components
  │  ├─ PeakFilters → updateFilter()
  │  ├─ PeaksList → togglePeakSelection()
  │  └─ Map → onPeakSelect()
  │
  └─ Route Association Modal/Sheet
     ├─ Peak info: { peakId, peakName }
     └─ Result: associateRoute(peakId, routeId)
```

---

## API Contract

### Discovery Endpoint (Enhanced)

```
POST /api/discovery/
Request:
{
  page: 1,
  limit: 30-50,
  query?: "mount everest",    // NEW - min 2 chars, optional
  country_id?: "np",
  region_id?: "sagarmatha",
  min_elevation?: 5000,
  max_elevation?: 10000,
  exclude_ids?: ["1", "2"]
}

Response:
{
  peaks: [
    {
      id: 1,
      name: "Mount Everest",
      elevation: 8849,
      lat: 27.9881,
      lng: 86.9250,
      region_name: "Sagarmatha",
      country_name: "Nepal"
    }
  ]
}
```

### New Endpoint: Add Manual Peaks

```
POST /api/user-data/addManualPeaks
Authorization: Bearer {token}
Request:
{
  peaks: [
    { peak_id: 1, route_id: null },
    { peak_id: 2, route_id: 123 },
    { peak_id: 3, route_id: null }
  ]
}

Response:
{
  success: true,
  added_count: 3,
  message: "3 peaks added successfully"
}
```

---

## Component Dependencies

```
AddManualPeaks (Main)
  ├─ useManualPeakSelection (hook)
  ├─ useI18n (shared context)
  ├─ useAuth (shared context)
  ├─ useAnalytics (shared context)
  ├─ useOptionalOverlayContext (mobile/desktop specific)
  ├─ discoverPeaks (API)
  ├─ addManualPeaks (API)
  ├─ getUserRoutes (API - via RouteAssociation)
  ├─ PeakFilters (sub-component)
  ├─ PeaksList (sub-component)
  ├─ PeaksMap (sub-component)
  └─ RouteAssociation (modal/sheet)
       └─ getUserRoutes (API)
```

---

## CSS Architecture

All components follow BEM naming convention:

### Mobile

- `.add-manual-peaks` (main container)
- `.add-manual-peaks__view-toggle` (segmented control)
- `.add-manual-peaks__content` (flex container)
- `.add-manual-peaks__footer` (sticky button area)
- `.peak-filters__*` (filter subcomponent)
- `.add-manual-peaks-list__*` (list subcomponent)
- `.add-manual-peaks-map__*` (map subcomponent)
- `.route-association__*` (bottom sheet)

### Desktop

- `.desktop-add-manual-peaks` (main container)
- `.desktop-add-manual-peaks__container` (two-column grid)
- `.desktop-add-manual-peaks__left` (filter + list column)
- `.desktop-add-manual-peaks__right` (map column)
- `.desktop-add-manual-peaks__footer` (sticky footer)
- `.desktop-peak-filters__*` (filter subcomponent)
- `.desktop-add-manual-peaks-list__*` (list subcomponent)
- `.desktop-add-manual-peaks-map__*` (map subcomponent)
- `.desktop-route-association-modal__*` (modal overlay)

---

## Implementation Status

### ✅ Completed

- [x] Shared state management hook (`useManualPeakSelection`)
- [x] Extended Discovery API with query parameter
- [x] New addManualPeaks endpoint definition
- [x] Route Association components (mobile + desktop)
- [x] Mobile AddManualPeaks main page
- [x] Mobile sub-components (Filters, List, Map)
- [x] Desktop AddManualPeaks main page
- [x] Desktop sub-components (Filters, List, Map)
- [x] Entry buttons on UserPeaks pages (mobile + desktop)
- [x] CSS modules with BEM naming
- [x] Translation keys (English)
- [x] Navigation integration

### 🔄 In Progress / Not Yet Implemented

- [ ] Route registration in MobileApp.tsx and DesktopApp.tsx
- [ ] Map integration (Mapbox GL implementation for list/map sync)
- [ ] Backend endpoint implementation (`/api/user-data/addManualPeaks`)
- [ ] Route discovery optimization (countries/regions dynamic loading)
- [ ] Internationalization for other languages (ca, es, fr)
- [ ] Error tracking and analytics
- [ ] Loading state refinement
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Mobile A/B testing (List vs Map default view)

---

## Notes for Backend Team

1. **New Endpoint Required**: `POST /api/user-data/addManualPeaks`

   - Accept array of `{ peak_id, route_id }`
   - Validate peak IDs exist
   - Validate route IDs (if provided) belong to current user
   - Insert manual peak records with route associations
   - Return success response with count

2. **Discovery API Enhancement**:

   - Add `query` parameter to `/api/discovery/`
   - Perform full-text search on peak names
   - Return results matching search + other filters

3. **Data Integrity**:
   - Prevent duplicate manual peaks for same user
   - Soft delete support for undo functionality (future)
   - Index on (user_id, peak_id) for quick lookups

---

## Notes for Frontend Integration

1. **Route Registration**:

   - Add route `/addManualPeaks` to both MobileApp.tsx and DesktopApp.tsx
   - Wrap with OverlayContext for mobile
   - Use NonPersistentPages pattern

2. **Map Integration**:

   - Replace placeholder divs with actual Mapbox GL implementation
   - Use existing MapLayers.tsx patterns for elevation colors
   - Sync map selection with list state via props

3. **Testing Checklist**:

   - Test filter combinations (query + elevation + country)
   - Test infinite scroll loading
   - Test peak selection toggle
   - Test route association flow (no route, with route, error states)
   - Test bulk submission
   - Test error handling and retries
   - Test on various screen sizes (mobile, tablet, desktop)

4. **Performance**:
   - Memoize sub-components to avoid re-renders
   - Debounce search input (500ms)
   - Lazy load map only in map view
   - Virtualize long peak lists (future optimization)

---

## Files Created/Modified Summary

### Created Files (19)

1. `src/shared/hooks/useManualPeakSelection.ts`
2. `src/mobile/NonPersistentPages/AddManualPeaks/AddManualPeaks.tsx`
3. `src/mobile/NonPersistentPages/AddManualPeaks/AddManualPeaks.module.css`
4. `src/mobile/NonPersistentPages/AddManualPeaks/components/PeakFilters.tsx`
5. `src/mobile/NonPersistentPages/AddManualPeaks/components/PeakFilters.module.css`
6. `src/mobile/NonPersistentPages/AddManualPeaks/components/AddManualPeaksList.tsx`
7. `src/mobile/NonPersistentPages/AddManualPeaks/components/AddManualPeaksList.module.css`
8. `src/mobile/NonPersistentPages/AddManualPeaks/components/AddManualPeaksMap.tsx`
9. `src/mobile/NonPersistentPages/AddManualPeaks/components/AddManualPeaksMap.module.css`
10. `src/mobile/components/RouteAssociation/RouteAssociationBottomSheet.tsx`
11. `src/mobile/components/RouteAssociation/RouteAssociationBottomSheet.module.css`
12. `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/desktop-AddManualPeaks.tsx`
13. `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/desktop-AddManualPeaks.module.css`
14. `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/components/desktop-PeakFilters.tsx`
15. `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/components/desktop-PeakFilters.module.css`
16. `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/components/desktop-AddManualPeaksList.tsx`
17. `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/components/desktop-AddManualPeaksList.module.css`
18. `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/components/desktop-AddManualPeaksMap.tsx`
19. `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/components/desktop-AddManualPeaksMap.module.css`
20. `src/desktop/desktop-components/desktop-RouteAssociation/desktop-RouteAssociationModal.tsx`
21. `src/desktop/desktop-components/desktop-RouteAssociation/desktop-RouteAssociationModal.module.css`

### Modified Files (4)

1. `src/shared/api/endpoints/peaks.ts` - Added query parameter to discoverPeaks
2. `src/shared/api/endpoints/user.ts` - Added addManualPeaks endpoint
3. `src/shared/locales/en.json` - Added translation keys
4. `src/mobile/NonPersistentPages/UserPeaks/UserPeaks.tsx` - Added entry button
5. `src/mobile/NonPersistentPages/UserPeaks/UserPeaks.module.css` - Added button styles
6. `src/desktop/desktop-NonPersistentPages/desktop-UserPeaks/desktop-UserPeaks.tsx` - Added entry button
7. `src/desktop/desktop-NonPersistentPages/desktop-UserPeaks/desktop-UserPeaks.module.css` - Added button styles

---

## Next Steps

1. **Backend Implementation**: Implement the new `/api/user-data/addManualPeaks` endpoint
2. **Route Registration**: Add routes to MobileApp.tsx and DesktopApp.tsx
3. **Map Integration**: Implement Mapbox GL rendering in map components
4. **Translation Completion**: Add keys to ca.json, es.json, fr.json
5. **Testing**: QA across all platforms and filter combinations
6. **Performance Optimization**: Profile and optimize as needed
7. **Analytics**: Track feature usage and conversion metrics
8. **Accessibility**: Ensure WCAG 2.1 AA compliance

---

**Implementation completed**: January 27, 2026  
**Ready for**: Backend integration & Route registration
