## Average Speed (Expo + React Native)

Track average speed between predefined road segments using GPS. The app auto-detects when you reach a segment start, measures until the finish, and displays live and final average speed. It also renders all known segments on the map with polylines that can follow actual roads.

### Features

- Auto-start/finish detection when near segment start/finish
- Live average speed while tracking; final average on finish
- All segments shown on map with markers and polylines
- Road-following polylines using precomputed paths (optional)
- Clean UI: hidden header, loading state before map shows location, on-map circular speed badge

### Tech Stack

- React Native (Expo)
- TypeScript
- Navigation: `expo-router`
- Location: `expo-location`
- Maps: `react-native-maps` (Google Maps SDK on native)
- Linting: `eslint` with `eslint-config-expo`

### Project Structure (high-level)

- `app/index.tsx`: main screen logic (location, phase, state, composition)
- `app/components/MapSection.tsx`: renders map, markers, polylines, speed badge
- `app/components/BottomInfo.tsx`: bottom info (live/final average, current speed)
- `constants/segments.ts`: segment definitions (start/finish and metadata)
- `constants/segments.paths.json`: optional precomputed road-following paths (generated)
- `constants/checkpoints.js`: legacy single start/finish checkpoints
- `scripts/fetch-routes.ts`: fetch road-following polylines from OSRM (demo server)
- `scripts/apply-routes.ts`: write a reviewable TS file with merged paths

### Getting Started

1. Install dependencies

```bash
npm install
```

2. Start in development

```bash
npm run start
# or: npm run ios / npm run android / npm run web
```

3. Location permissions

- iOS: Uses `NSLocationWhenInUseUsageDescription` (configured in `app.json`).
- Android: Uses `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` (configured).

### Maps configuration (production)

On native, `react-native-maps` uses the Google Maps SDKs. For production builds, add API keys and rebuild:

1. In Google Cloud, enable:

- “Maps SDK for Android”
- “Maps SDK for iOS”

2. Create platform-restricted API keys and add to `app.json`:

```json
{
  "expo": {
    "ios": { "config": { "googleMapsApiKey": "YOUR_IOS_MAPS_SDK_KEY" } },
    "android": {
      "config": { "googleMaps": { "apiKey": "YOUR_ANDROID_MAPS_SDK_KEY" } }
    }
  }
}
```

3. Rebuild the app (EAS or prebuild + native build).

Note: No Google Directions API is required at runtime unless you choose to fetch routes dynamically.

### Road-following polylines (free in dev, no runtime cost)

By default, polylines draw a straight line from start to finish. To follow the actual roads, we precompute paths via the free OSRM demo server and bundle them:

Commands:

```bash
# Fetch routes from OSRM demo server → saves JSON cache
npm run routes:fetch

# Merge cached paths into a reviewable TS output file
npm run routes:apply
```

Details:

- `routes:fetch` calls OSRM’s public demo (`router.project-osrm.org`) to get a GeoJSON route between each segment start/finish and writes `constants/segments.paths.json`.
- `routes:apply` generates `constants/segments.withPaths.ts` so you can inspect a TS version. We do not import that file directly by default.
- The app automatically reads `constants/segments.paths.json` and uses `segment.path` when present. No API calls at runtime; paths are bundled.
- OSRM demo is rate-limited; the script throttles requests.

If you prefer dynamic routing in production (e.g., Google Directions, Mapbox), you can implement a small service and cache results server-side. Note that Google Directions is a paid API.

### Common Scripts

```bash
npm run start          # Expo dev server
npm run ios            # Open iOS simulator
npm run android        # Open Android emulator
npm run web            # Web (map placeholder only)
npm run lint           # Lint
npm run routes:fetch   # Fetch road polylines (OSRM demo)
npm run routes:apply   # Generate TS file with merged paths
```

### Notes & Limitations

- Web build shows a placeholder; maps are for native.
- OSRM demo is best-effort; for reliability you can self-host OSRM or bake the fetched JSON into the repo.
- If the segments list becomes very large, consider clustering markers and lazy rendering.

### How it works (brief)

- On launch, the app requests location permission and fetches current location; the map only appears once ready.
- It watches location updates. When you move near a segment’s start, it switches to tracking and timestamps start time; when you reach the finish, it timestamps end time and computes average speed.
- Live average speed is computed from segment start to current position during tracking; final average speed is computed from start to finish.

### Questions?

If you have environment constraints, a preferred routing provider, or want us to embed precomputed paths directly into `constants/segments.ts` instead of a JSON sidecar, say which option you prefer.
