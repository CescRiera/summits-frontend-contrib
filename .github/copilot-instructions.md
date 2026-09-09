# Copilot Instructions for CIMSWeb

## Project Overview

**CIMSWeb** is a dual-platform web/mobile application for tracking and sharing mountain peak achievements. Built with React, TypeScript, and Capacitor, it serves desktop (web) and mobile (iOS/Android) users with a unified codebase.

**Key Technologies**: React 19 + TypeScript, Vite, Mapbox GL, Capacitor, Firebase, Socket.io, Framer Motion

## Architecture: Single Codebase, Dual Apps

The project uses **responsive component architecture** with mobile-first design:

```
src/
├── main.tsx              # Platform detection → MobileApp or DesktopApp
├── shared/               # Shared across both platforms
│   ├── api/              # Axios client, endpoints, types
│   ├── context/          # Auth, I18n, Analytics providers
│   ├── components/       # Shared UI (ErrorBoundary, etc)
│   └── utils/            # Services: routeAnimationService, websocket, etc
├── mobile/               # Mobile-only (PersistentPages, NonPersistentPages, components)
└── desktop/              # Desktop-only (prefix all with "desktop-")
```

**Platform Detection**: `useMobileDetection()` hook in `main.tsx` routes to appropriate app.

### Mobile (`src/mobile/`)
- **PersistentPages**: Always cached (Home, Explore, Map, Profile, LeaderBoard) via `react-activation` KeepAlive
- **NonPersistentPages**: Route overlays (PeakDetails, TermsOfService, etc.)
- **Navbar**: Bottom navigation, controlled by `NavbarVisibilityContext`
- Uses **overlay pattern** for modal-like UX

### Desktop (`src/desktop/`)
- **desktop-*** naming convention (e.g., `desktop-Home.tsx`, `desktop-PeakDetailsMap.tsx`)
- **Sidebar navigation**: 280px fixed sidebar with nested routes
- Desktop-specific components (desktop-PeakDetailsMap with map subcomponents)
- Typography uses `.typography-desktop-*` classes

## Core Patterns & Conventions

### Component Structure
**MANDATORY**: Every component = folder with `ComponentName.tsx` + `ComponentName.module.css`

```
src/mobile/components/MyComponent/
├── MyComponent.tsx         # JSX + logic
└── MyComponent.module.css  # BEM-named styles
```

### CSS Naming: BEM (Block Element Modifier)
```css
/* MANDATORY pattern */
.my-component { }                    /* block */
.my-component__header { }            /* element */
.my-component__button--primary { }   /* modifier */
.my-component--loading { }           /* state */
```

**Rules**: 
- ❌ No camelCase, no `:hover` styles, no `cursor` property
- ✅ Use BEM strictly in `.module.css` files

### Typography Classes
- Mobile: `.typography-title-large`, `.typography-body-small`, `.typography-label-medium`
- Desktop: `.typography-desktop-headline-large`, `.typography-desktop-body-medium`

### Icons
Use **lucide-react** exclusively: `import { Check, MapPin } from 'lucide-react'`

## API & Data Flow

### API Client (`src/shared/api/client.ts`)
- Base: Axios with Firebase token injection
- Interceptors add auth tokens + platform headers (`X-Platform`)
- Timeout: 30s, fallback to Firebase `currentUser.getIdToken()`

### API Endpoints (`src/shared/api/endpoints/`)
Organized by domain:
- `peaks.ts`: Peak details, weather, flora/fauna, infrastructure
- `user.ts`: Profile, auth, peak saves
- `routes.ts`: Route data, community routes
- `follows.ts`: Follow/unfollow users

**Example pattern**:
```typescript
export const getPeakBasic = async (peakId: number): Promise<PeakDetails> => {
  const response = await api.post("/api/peaks/getBasic", { peak_id: peakId });
  return response.data;
};
```

### Context Providers (`src/shared/context/`)
Wrap app in `main.tsx`:
- `AuthProvider`: Firebase auth + session token management
- `I18nProvider`: Language switching + translations from `src/shared/locales/*.json`
- `AnalyticsProvider`: Event tracking + page views

## Critical Services & Hooks

### RouteAnimationService (`src/shared/utils/routeAnimationService.ts`)
3D flyover animation with chase-cam. Singleton instance hides specific Mapbox layers (`nearby-peaks-symbols`, `peak-labels`, etc.) and renders animated route. **Large file** (2200+ lines) with video encoding.

**Entry hook**: `useRouteAnimation(map, routeId)` - handles lifecycle, cleanup, stats overlay

### DesktopRouteAnimationService
Parallel service for desktop with custom map interaction. Similar API.

### WebSocket Service (`src/shared/api/websocket.ts`)
Singleton for real-time updates (live user locations). Initialize on Auth login.

### useMobileDetection() Hook
Returns `boolean | null`. Detects viewport + Capacitor platform. Used in `main.tsx` to branch MobileApp vs DesktopApp.

## Peak Details Architecture

Peak data loads in stages:

1. **getPeakBasicName()**: Fast header display (name, coordinates)
2. **getPeakBasic()**: Full details (elevation, description, metadata)
3. **Sub-sections** (parallel): Weather, Flora/Fauna, Infrastructure, Community Info
   - Each has own loading state
   - Lazy load on scroll/tab selection
   - Gallery + WikilocRoute always render

**Mobile**: Stacked in NonPersistentPages overlay
**Desktop**: Tabbed map subcomponents (GalleryMap, DescriptionMap, FloraFaunaMap, InfrastructureMap)

## Build & Development

### Commands
```bash
npm run dev              # Vite dev server (localhost:5173)
npm run build           # TSC + Vite build → dist/
npm run lint            # ESLint check
npm run test            # Jest + SWC
npm run test:watch      # Jest watch mode
npm run prefix:desktop  # Prefix desktop components (dry-run only)
npm run check:translations  # Validate i18n keys
npm run cap:sync        # Sync Capacitor files (iOS/Android)
npm run cap:open:ios    # Open iOS Xcode project
npm run cap:open:android # Open Android project
```

### Key Files
- `tsconfig.json`: Root TS config
- `vite.config.ts`: Vite + PWA setup (6 MB cache limit, offline support)
- `jest.config.js`: Vitest with SWC transform, CSS module mocking
- `capacitor.config.ts`: Native app config

## Translations & Localization

Translation files in `src/shared/locales/`:
```
├── en.json
├── ca.json (Catalan)
├── es.json
└── fr.json
```

Access via `useI18n()` hook:
```typescript
const { t, setLanguage } = useI18n();
<p>{t("home.title")}</p>
```

**Rule**: Always add translations to `.json` files, never hardcode strings.

## Map & Geospatial

- **Mapbox GL**: `mapbox-gl@3.13.0`, vector tiles for peaks/routes
- **Capacitor Geolocation**: Native GPS access
- **Route animation**: Calculates elevation profiles, camera motion from coordinates + elevation

## State Management & Caching

- **React Query**: Tanstack Query for API caching (check package.json imports)
- **react-activation**: KeepAlive pages preserve component state across navigation
- **Context API**: Auth, I18n, Analytics, MapContext (peak markers, route data)
- **localStorage/IndexedDB**: Session tokens, user preferences (push notifications)

## Testing

- **Jest + SWC**: Fast TypeScript test runner
- CSS modules mocked via `identity-obj-proxy`
- Test files: `**/__tests__/**/*.ts(x)` or `**/*.test.ts(x)`

## Debugging & Development Tools

- **Vite HMR**: Fast refresh on file changes
- **Debug env vars**: `VITE_DEBUG_AUTH=1` for auth logging
- **Capacitor DevTools**: Native debugging via Android Studio / Xcode
- **Service Worker**: PWA caching (6 MB limit), offline support, Google Fonts cached
- **Firebase Console**: Auth, Firestore monitoring

## Common Workflows

### Adding a New Peak Feature
1. Add endpoint in `src/shared/api/endpoints/peaks.ts`
2. Add type in `src/shared/api/types/peaks.ts`
3. Create PeakDetails subcomponent in `src/mobile/NonPersistentPages/PeakDetails/` + `src/desktop/desktop-NonPersistentPages/desktop-PeakDetails/`
4. Style with `.module.css` using BEM naming
5. Use `useI18n()` for strings, add translations to `.json` files
6. Add route animation if needed (hide/show map layers)

### Adding a New Page
1. Create `Page.tsx` + `Page.module.css` in PersistentPages (mobile) or desktop-PersistentPages (desktop)
2. Add route in MobileApp.tsx / DesktopApp.tsx
3. Register in Navbar.tsx / desktop-Navbar.tsx
4. Wrap with KeepAlive if persistent caching needed

### Dual App Implementation
- Write shared logic in `src/shared/`
- Platform-specific UI: `src/mobile/` vs `src/desktop/desktop-*`
- Use `useAuth()`, `useI18n()` from shared context
- Import mobile/desktop components conditionally via platform detection

## Known Gotchas

1. **Desktop component naming**: Prefix ALL with `desktop-` (e.g., `desktop-LoginRegister.tsx`) - enforced by linter
2. **Mapbox layer IDs**: Animation hides specific layers - check `LAYERS_TO_HIDE` in routeAnimationService before adding new map layers
3. **React 19 compatibility**: Form reset behavior changed - use `ref.current?.reset()` explicitly
4. **Service Worker**: Capacitor builds don't use SW - check `isCapacitorNative` before initializing
5. **Capacitor token management**: Auth token stored in secure storage - don't use localStorage for sensitive data
6. **BEM CSS**: Single mistake breaks styling - double-check class names match module.css exports

## External Integrations

- **Firebase**: Auth (Google, Strava, Wikiloc OAuth), Firestore (user data)
- **Strava & Wikiloc APIs**: OAuth + route scraping for activity tracking
- **Mapbox**: Vector tiles, terrain elevation, geocoding
- **Open Street Map**: Infrastructure/POI data (indoor mapping)
- **iNaturalist**: Flora/fauna observations via API
- **Socket.io**: Real-time user activity streams
- **Vercel**: Deployment (see `vercel.json`)

## File Size Optimization

- **6 MB PWA cache limit**: Monitor with Vite visualizer (`npm run build`)
- **FFmpeg WASM**: Included for video encoding (route recordings)
- **Code splitting**: Vite chunks routes automatically
- **Image optimization**: Use `webp`/`avif` formats where possible

---

**Last updated**: January 2026 | For questions, check cursor rules in `.cursor/rules/`
