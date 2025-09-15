import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// NOTE: react-native-maps is required dynamically on native only to avoid web bundling errors
import checkpoints from "../constants/checkpoints";
import segments from "../constants/segments";
import {
  Coordinates,
  haversineDistanceMeters,
  isNear,
  requestForegroundPermissionsAsync,
  watchHighAccuracyPosition,
} from "../hooks/location";

type Phase = "idle" | "waiting_start" | "tracking" | "finished";

export default function Index() {
  // Load react-native-maps only on native platforms
  let MapView: any = null;
  let Marker: any = null;
  let PROVIDER_GOOGLE: any = null;
  if (Platform.OS !== "web") {
    const rnMaps = require("react-native-maps");
    MapView = rnMaps.default;
    Marker = rnMaps.Marker;
    PROVIDER_GOOGLE = rnMaps.PROVIDER_GOOGLE;
  }
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [startTimeMs, setStartTimeMs] = useState<number | null>(null);
  const [endTimeMs, setEndTimeMs] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<any>(null);
  const didCenterRef = useRef<boolean>(false);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(0);

  const startPoint = checkpoints[0];
  const finishPoint = checkpoints[1];

  // Multi-segment state
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const activeSegment = useMemo(
    () => segments.find((s) => s.id === activeSegmentId) || null,
    [activeSegmentId]
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
      setPermissionGranted(granted);
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
          const seg = segments.find((s) =>
            isNear(
              { latitude: s.start.latitude, longitude: s.start.longitude },
              coords,
              s.radiusMeters ?? 30
            )
          );
          if (seg) {
            setActiveSegmentId(seg.id);
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
  }, [phase]);

  const reset = () => {
    setStartTimeMs(null);
    setEndTimeMs(null);
    setPhase("waiting_start");
  };

  const statusText = (() => {
    if (!permissionGranted) return "Location permission required";
    switch (phase) {
      case "waiting_start":
        return activeSegment
          ? `Waiting at ${activeSegment.name}`
          : "Waiting at Start";
      case "tracking":
        return activeSegment ? `Tracking ${activeSegment.name}` : "Tracking...";
      case "finished":
        return activeSegment
          ? `Finished ${activeSegment.name}`
          : "Reached Finish";
      default:
        return "Initializing";
    }
  })();

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
      <View style={styles.topBar}>
        <Text style={styles.status}>{statusText}</Text>
        <TouchableOpacity onPress={reset} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === "web" ? (
        <View style={[styles.map, styles.webPlaceholder]}>
          <Text style={styles.hintText}>
            Map not supported on web. Run on iOS/Android.
          </Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={initialRegion}
          showsUserLocation
          followsUserLocation
        >
          {activeSegment && (
            <>
              <Marker
                coordinate={{
                  latitude: activeSegment.start.latitude,
                  longitude: activeSegment.start.longitude,
                }}
                title={`${activeSegment.road}: Start`}
                description={activeSegment.name}
                pinColor="green"
              />
              <Marker
                coordinate={{
                  latitude: activeSegment.finish.latitude,
                  longitude: activeSegment.finish.longitude,
                }}
                title={`${activeSegment.road}: Finish`}
                description={activeSegment.name}
                pinColor="red"
              />
            </>
          )}
          <Marker
            coordinate={{
              latitude: startPoint.latitude,
              longitude: startPoint.longitude,
            }}
            title={startPoint.name}
            description="Start checkpoint"
            pinColor="green"
          />
          <Marker
            coordinate={{
              latitude: finishPoint.latitude,
              longitude: finishPoint.longitude,
            }}
            title={finishPoint.name}
            description="Finish checkpoint"
            pinColor="red"
          />
        </MapView>
      )}

      <View style={styles.bottomBar}>
        {phase === "finished" && avgKmH != null ? (
          <Text style={styles.avgText}>
            Average Speed: {avgKmH.toFixed(2)} km/h
          </Text>
        ) : activeSegment && phase === "tracking" && userCoords ? (
          <Text style={styles.avgText}>
            {activeSegment.name}: live avg{" "}
            {(() => {
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
              const seconds = startTimeMs
                ? (Date.now() - startTimeMs) / 1000
                : 0;
              const hours = seconds / 3600;
              const v = hours > 0 ? km / hours : 0;
              return v.toFixed(2);
            })()}{" "}
            km/h
          </Text>
        ) : (
          <Text style={styles.hintText}>Move to Start to begin tracking</Text>
        )}
        <Text style={styles.currentSpeed}>
          Current Speed: {currentSpeedKmh.toFixed(0)} km/h
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#f7f7f7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  status: { fontSize: 16, fontWeight: "600" },
  resetBtn: {
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetText: { fontSize: 14, fontWeight: "600" },
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
