/*
  Dev script: fetch road-following polylines for segments using OSRM demo server
  Usage: npx ts-node scripts/fetch-routes.ts (or add an npm script)
  Note: OSRM demo has rate limits. Cache outputs to avoid repeat calls.
*/

import fs from "fs";
import path from "path";
import { segments as baseSegments } from "../constants/segments";

type LatLng = { latitude: number; longitude: number };

async function fetchRoutePath(
  start: LatLng,
  finish: LatLng
): Promise<LatLng[] | null> {
  const coords = `${start.longitude},${start.latitude};${finish.longitude},${finish.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const geometry = json?.routes?.[0]?.geometry;
  if (!geometry || !geometry.coordinates) return null;
  // GeoJSON is [lon, lat]
  const pathLatLng: LatLng[] = geometry.coordinates.map(
    (c: [number, number]) => ({ latitude: c[1], longitude: c[0] })
  );
  return pathLatLng;
}

async function main() {
  const outFile = path.resolve(__dirname, "../constants/segments.paths.json");
  const cache: Record<string, LatLng[]> = fs.existsSync(outFile)
    ? JSON.parse(fs.readFileSync(outFile, "utf8"))
    : {};

  const results: Record<string, LatLng[]> = { ...cache };

  for (const s of baseSegments) {
    const key = `${s.road}|${s.name}`;
    if (results[key]) continue;
    try {
      const pathLatLng = await fetchRoutePath(s.start, s.finish);
      if (pathLatLng && pathLatLng.length >= 2) {
        results[key] = pathLatLng;
        console.log(`Fetched: ${key} (${pathLatLng.length} points)`);
        // Be nice to the demo server
        await new Promise((r) => setTimeout(r, 250));
      } else {
        console.warn(`No route for ${key}`);
      }
    } catch (e) {
      console.warn(`Error fetching ${key}:`, e);
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`Saved routes to ${outFile}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
