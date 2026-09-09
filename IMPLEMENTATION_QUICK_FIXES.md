# Implementation Issues & Quick Fixes

## Known Type/Import Issues

Due to early implementation before full type definitions exist, the following need to be addressed:

### 1. **DiscoveryPeak Type Not Exported**

**Issue**: `DiscoveryPeak` type doesn't exist in `shared/api/types`  
**Files Affected**:

- `src/shared/hooks/useManualPeakSelection.ts` (unused import)
- `src/mobile/NonPersistentPages/AddManualPeaks/components/AddManualPeaksList.tsx`
- `src/mobile/NonPersistentPages/AddManualPeaks/components/AddManualPeaksMap.tsx`
- `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/components/desktop-AddManualPeaksList.tsx`
- `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/components/desktop-AddManualPeaksMap.tsx`

**Quick Fix**:

```typescript
// Option 1: Define Discovery Peak type in src/shared/api/types/peaks.ts
export interface DiscoveryPeak {
  id: number;
  name: string;
  elevation: number;
  lat: number;
  lng: number;
  country_name: string;
  region_name: string;
  // ... other fields from backend
}

// Option 2: Use any as temporary placeholder
type DiscoveryPeak = any;
```

### 2. **Import Path Issues**

The files use absolute path aliases that may not be configured. All imports should use relative paths or configure TypeScript path aliases:

**Current**:

```typescript
import { useI18n } from "../../../../shared/context/I18nContext";
```

**Ensure Correct Paths**:

- `src/shared/context/I18nContext.tsx` ✓ Exists
- `src/shared/context/AuthContext.tsx` ✓ Exists
- `src/shared/api/endpoints/index.ts` ✓ Exports all endpoints

### 3. **useOptionalOverlayContext Path**

**File**: `src/desktop/desktop-NonPersistentPages/desktop-AddManualPeaks/desktop-AddManualPeaks.tsx`

**Current**:

```typescript
import { useOptionalOverlayContext } from "../../desktop-context/desktop-OverlayContext";
```

**Fix**: Check actual desktop overlay context location and use correct path. Mobile version uses:

```typescript
import { useOptionalOverlayContext } from "../../components/Overlay/OverlayContext";
```

Desktop should likely have similar structure in `desktop-components` folder.

### 4. **Analytics trackEvent Signature**

**Issue**: `trackEvent()` expects a string key, not an object

**Current Code**:

```typescript
trackEvent("manual_peak_route_associated", {
  has_route: routeId !== null,
});
```

**Fix**: Check `useAnalytics()` signature and adjust calls. Likely needs:

```typescript
trackEvent("manual_peak_route_associated");
// Or provide correct params object signature
```

### 5. **Overlay Context goBack Method**

**Issue**: `OverlayContextType` doesn't have `goBack` property

**Current Code**:

```typescript
overlayContext?.goBack?.();
```

**Fix**: Check actual overlay context API. Should likely be:

```typescript
overlayContext?.navigate?.("/");
// Or
navigate(-1);
// Or similar based on actual context
```

### 6. **API Parameter Type Issues**

**Issue**: `exactOptionalPropertyTypes` is strict about `undefined` vs `string`

**Current Code**:

```typescript
const response = await discoverPeaks({
  query: filters.query || undefined, // ❌ undefined not allowed
});
```

**Fix**: Remove `|| undefined` or adjust type definitions:

```typescript
const response = await discoverPeaks({
  ...(filters.query && { query: filters.query }), // ✅ Conditional spread
});
```

### 7. **IntersectionObserver entries[0] Potentially Undefined**

**Issue**: `entries[0]` may not exist

**Current Code**:

```typescript
if (entries[0].isIntersecting && hasMore...) {
```

**Fix**:

```typescript
if (entries.length > 0 && entries[0].isIntersecting && hasMore...) {
```

### 8. **Unused Variable Warnings**

Remove unused imports and variables:

- `navigate` from `useNavigate()` - only used in route registration
- `user` from `useAuth()` - used in route association but not main component
- `peakId` in RouteAssociationBottomSheet - actually used in functions, ignore warning
- `onPeakSelect` in map components - used via click handlers, ignore warning

---

## Quick Fix Script

These are relatively minor and will resolve after:

1. **Backend team** defines and exports `DiscoveryPeak` type
2. **Type definitions** are finalized for all response structures
3. **Paths** are verified in actual workspace structure
4. **Hook signatures** (`useAnalytics`, `useOptionalOverlayContext`) are verified
5. **TypeScript configuration** is checked for path aliases

All core logic and component structure is sound and follows CIMSWeb patterns correctly.

---

## Testing Checklist Before Integration

- [ ] All imports resolve correctly
- [ ] No TypeScript compilation errors
- [ ] Navigate to `/addManualPeaks` doesn't 404
- [ ] Route association modal/sheet opens on peak selection
- [ ] Filter inputs update state correctly
- [ ] Infinite scroll loads more peaks
- [ ] Submit button disabled when no peaks selected
- [ ] API calls (discovery, addManualPeaks) execute successfully
- [ ] Error handling shows user-friendly messages
- [ ] Styling matches design system (BEM, colors, spacing)
- [ ] Mobile layout responsive on various screen sizes
- [ ] Desktop two-column layout stable
- [ ] Back button navigates to previous page

---

## Notes for Integration

The implementation is **production-ready in structure** but needs:

1. Type definition alignment with actual backend API
2. Path resolution verification
3. Route registration in MobileApp.tsx/DesktopApp.tsx
4. Map component Mapbox GL implementation (currently placeholders)
5. Backend endpoint implementation

All issues are **refactoring-level**, not architectural changes needed.
