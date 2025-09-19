import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
// NOTE: react-native-maps is required dynamically on native only to avoid web bundling errors
import { checkpoints } from "../constants/checkpoints";
import { segments } from "../constants/segments";
import {
  Coordinates,
  haversineDistanceMeters,
  isNear,
  requestForegroundPermissionsAsync,
  watchHighAccuracyPosition,
} from "../hooks/location";
import MapSection from "./components/MapSection";
import StatsBar from "./components/StatsBar";
// Load limits sidecar (optional)
const segmentLimits: Record<
  string,
  { maxAvgKmH?: number; recommendedAvgKmH?: number }
> = (() => {
  try {
    return require("../constants/segment-limits.json");
  } catch {
    return {} as any;
  }
})();
const segmentPaths: Record<string, { latitude: number; longitude: number }[]> =
  (() => {
    try {
      return require("../constants/segments.paths.json");
    } catch {
      return {} as any;
    }
  })();
const segmentsWithPaths = segments.map((s) => {
  const key = `${s.road}|${s.name}`;
  const path = (segmentPaths as any)[key];
  return path && Array.isArray(path) && path.length >= 2 ? { ...s, path } : s;
});

type Phase = "idle" | "waiting_start" | "tracking" | "finished";

export default function Index() {
  // Load react-native-maps only on native platforms
  let MapView: any = null;
  let Marker: any = null;
  let PROVIDER_GOOGLE: any = null;
  let Polyline: any = null;
  if (Platform.OS !== "web") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rnMaps = require("react-native-maps");
    MapView = rnMaps.default;
    Marker = rnMaps.Marker;
    PROVIDER_GOOGLE = rnMaps.PROVIDER_GOOGLE;
    Polyline = rnMaps.Polyline;
  }
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [startTimeMs, setStartTimeMs] = useState<number | null>(null);
  const [endTimeMs, setEndTimeMs] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<any>(null);
  const didCenterRef = useRef<boolean>(false);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);
  const [isMapReady, setIsMapReady] = useState<boolean>(false);

  const startPoint = checkpoints[0];
  const finishPoint = checkpoints[1];

  // Multi-segment state
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(
    null
  );
  const activeSegment = useMemo(
    () =>
      activeSegmentIndex != null ? segmentsWithPaths[activeSegmentIndex] : null,
    [activeSegmentIndex]
  );

  const distanceMeters = useMemo(() => {
    return haversineDistanceMeters(
      { latitude: startPoint.latitude, longitude: startPoint.longitude },
      { latitude: finishPoint.latitude, longitude: finishPoint.longitude }
    );
  }, [startPoint, finishPoint]);

  const timeSeconds = useMemo(() => {
    if (startTimeMs == null || endTimeMs == null) return null;
    return (endTimeMs - startTimeMs) / 1000;
  }, [startTimeMs, endTimeMs]);

  const avgKmH = useMemo(() => {
    if (timeSeconds == null || timeSeconds <= 0) return null;
    const km = distanceMeters / 1000;
    const hours = timeSeconds / 3600;
    return km / hours;
  }, [timeSeconds, distanceMeters]);

  useEffect(() => {
    (async () => {
      const granted = await requestForegroundPermissionsAsync();
      setPhase("waiting_start");
      if (!granted) return;

      // Center on current location once
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const { latitude, longitude, speed } = current.coords;
        const coords = { latitude, longitude };
        setUserCoords(coords);
        setIsMapReady(true);
        const kmh =
          typeof speed === "number" && !Number.isNaN(speed)
            ? Math.max(0, speed * 3.6)
            : 0;
        setCurrentSpeedKmh(kmh);
        if (Platform.OS !== "web" && mapRef.current && !didCenterRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            },
            700
          );
          didCenterRef.current = true;
        }
      } catch {}

      const sub = await watchHighAccuracyPosition((loc) => {
        const { latitude, longitude } = loc.coords;
        const coords = { latitude, longitude };
        setUserCoords(coords);
        if (!isMapReady) setIsMapReady(true);
        const speed = loc.coords.speed; // meters/second
        const kmh =
          typeof speed === "number" && !Number.isNaN(speed)
            ? Math.max(0, speed * 3.6)
            : 0;
        setCurrentSpeedKmh(kmh);

        if (Platform.OS !== "web" && mapRef.current && !didCenterRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude,
              longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            },
            500
          );
          didCenterRef.current = true;
        }

        // Single hardcoded checkpoint support (legacy/mvp)
        if (
          !activeSegment &&
          phase === "waiting_start" &&
          isNear(startPoint, coords, 30)
        ) {
          setStartTimeMs((prev) => prev ?? Date.now());
          setPhase("tracking");
        }

        if (
          !activeSegment &&
          phase === "tracking" &&
          isNear(finishPoint, coords, 30)
        ) {
          setEndTimeMs((prev) => prev ?? Date.now());
          setPhase("finished");
        }

        // Multi-segment auto-detection
        if (!activeSegment && phase === "waiting_start") {
          const idx = segmentsWithPaths.findIndex((s) =>
            isNear(
              { latitude: s.start.latitude, longitude: s.start.longitude },
              coords,
              s.radiusMeters ?? 30
            )
          );
          if (idx >= 0) {
            setActiveSegmentIndex(idx);
            setStartTimeMs((prev) => prev ?? Date.now());
            setPhase("tracking");
          }
        }

        if (activeSegment && phase === "tracking") {
          const reachedFinish = isNear(
            {
              latitude: activeSegment.finish.latitude,
              longitude: activeSegment.finish.longitude,
            },
            coords,
            activeSegment.radiusMeters ?? 30
          );
          if (reachedFinish) {
            setEndTimeMs((prev) => prev ?? Date.now());
            setPhase("finished");
          }
        }
      });

      watchSubRef.current = sub;
    })();

    return () => {
      watchSubRef.current?.remove();
      watchSubRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Removed manual reset UI for a cleaner top area

  // top status removed

  const initialRegion = userCoords
    ? {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : {
        latitude: startPoint.latitude,
        longitude: startPoint.longitude,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };

  return (
    <View style={styles.container}>
      {/* Top bar removed for a cleaner look */}

      {!isMapReady ? (
        <View style={[styles.map, styles.webPlaceholder]}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12 }}>Locating…</Text>
        </View>
      ) : Platform.OS === "web" ? (
        <View style={[styles.map, styles.webPlaceholder]}>
          <Text style={styles.hintText}>
            Map not supported on web. Run on iOS/Android.
          </Text>
        </View>
      ) : (
        <MapSection
          MapView={MapView}
          Marker={Marker}
          Polyline={Polyline}
          PROVIDER_GOOGLE={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          segments={segmentsWithPaths}
          activeSegment={activeSegment}
          startPoint={startPoint}
          finishPoint={finishPoint}
          mapRef={mapRef}
          phase={phase}
          currentSpeedKmh={currentSpeedKmh}
          badgeTop={96}
          badgeRight={16}
          limitsMap={segmentLimits}
        />
      )}

      <StatsBar
        phase={phase}
        avgKmH={avgKmH}
        activeSegmentName={activeSegment ? activeSegment.name : null}
        userCoords={userCoords}
        startTimeMs={startTimeMs}
        computeLiveAverage={() => {
          if (!activeSegment || !userCoords || !startTimeMs) return 0;
          const km =
            haversineDistanceMeters(
              {
                latitude: activeSegment.start.latitude,
                longitude: activeSegment.start.longitude,
              },
              {
                latitude: userCoords.latitude,
                longitude: userCoords.longitude,
              }
            ) / 1000;
          const seconds = startTimeMs ? (Date.now() - startTimeMs) / 1000 : 0;
          const hours = seconds / 3600;
          const v = hours > 0 ? km / hours : 0;
          return v;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  // top bar removed
  map: { flex: 1 },
  webPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    padding: 16,
    backgroundColor: "#f7f7f7",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
  },
  avgText: { fontSize: 18, fontWeight: "700" },
  hintText: { fontSize: 14, color: "#666" },
  currentSpeed: { marginTop: 8, fontSize: 14, fontWeight: "600" },
});
