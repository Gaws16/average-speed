/*
  Dev script: merge fetched OSRM paths into constants/segments.ts on disk.
  This writes a new file constants/segments.withPaths.ts so you can review diffs.
*/

import fs from "fs";
import path from "path";
import { segments as baseSegments, Segment } from "../constants/segments";

type LatLng = { latitude: number; longitude: number };

const pathsFile = path.resolve(__dirname, "../constants/segments.paths.json");
const outFile = path.resolve(__dirname, "../constants/segments.withPaths.ts");

function buildTsFile(segments: (Segment & { path?: LatLng[] })[]): string {
  const header = `export type Segment = ${
    fs
      .readFileSync(path.resolve(__dirname, "../constants/segments.ts"), "utf8")
      .match(/export type Segment = [\s\S]*?};/)![0]
  }

export const segments: Segment[] = [\n`;

  const body = segments
    .map((s) => {
      const pathStr = s.path
        ? `,\n  path: [\n${s.path
            .map(
              (p) =>
                `    { latitude: ${p.latitude}, longitude: ${p.longitude} }`
            )
            .join(",\n")}\n  ]`
        : "";
      return `  {\n    id: ${JSON.stringify(s.id)},\n    road: ${JSON.stringify(
        s.road
      )},\n    name: ${JSON.stringify(s.name)},\n    start: { latitude: ${
        s.start.latitude
      }, longitude: ${s.start.longitude} },\n    finish: { latitude: ${
        s.finish.latitude
      }, longitude: ${s.finish.longitude} }${pathStr}\n  }`;
    })
    .join(",\n");

  const footer = `\n];\n\nexport default segments;\n`;
  return header + body + footer;
}

function main() {
  if (!fs.existsSync(pathsFile)) {
    console.error("No segments.paths.json found. Run fetch-routes first.");
    process.exit(1);
  }
  const routes: Record<string, LatLng[]> = JSON.parse(
    fs.readFileSync(pathsFile, "utf8")
  );

  const merged: (Segment & { path?: LatLng[] })[] = baseSegments.map((s) => {
    const key = `${s.road}|${s.name}`;
    const pathPoints = routes[key];
    return pathPoints ? { ...s, path: pathPoints } : s;
  });

  const ts = buildTsFile(merged);
  fs.writeFileSync(outFile, ts);
  console.log(
    `Wrote ${outFile}. Review and replace constants/segments.ts when ready.`
  );
}

main();
