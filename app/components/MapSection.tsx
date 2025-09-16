import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

type LatLng = { latitude: number; longitude: number };

type Segment = {
  road: string;
  name: string;
  start: LatLng;
  finish: LatLng;
  radiusMeters?: number;
  path?: LatLng[];
};

type Props = {
  MapView: any;
  Marker: any;
  Polyline: any;
  PROVIDER_GOOGLE: any;
  initialRegion: any;
  segments: Segment[];
  activeSegment: Segment | null;
  startPoint: LatLng & { name?: string };
  finishPoint: LatLng & { name?: string };
  mapRef: any;
  phase: "idle" | "waiting_start" | "tracking" | "finished";
  speedBadgeValue: number | null;
};

export default function MapSection({
  MapView,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  initialRegion,
  segments,
  activeSegment,
  startPoint,
  finishPoint,
  mapRef,
  phase,
  speedBadgeValue,
}: Props) {
  if (Platform.OS === "web") return null;

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      provider={PROVIDER_GOOGLE}
      initialRegion={initialRegion}
      showsUserLocation
      followsUserLocation
    >
      {/* Segment polylines */}
      {segments.map((s, index) => (
        <Polyline
          key={`${s.road}-${s.name}-line-${index}`}
          coordinates={
            s.path && s.path.length >= 2 ? s.path : [s.start, s.finish]
          }
          strokeColor="#d32f2f"
          strokeWidth={3}
        />
      ))}
      {segments.map((s, index) => (
        <React.Fragment key={`${s.road}-${s.name}-${index}`}>
          <Marker
            key={`${s.road}-${s.name}-start-${index}`}
            coordinate={{
              latitude: s.start.latitude,
              longitude: s.start.longitude,
            }}
            title={`${s.road}: Start`}
            description={s.name}
            pinColor="red"
            tracksViewChanges={false}
          />
          <Marker
            key={`${s.road}-${s.name}-finish-${index}`}
            coordinate={{
              latitude: s.finish.latitude,
              longitude: s.finish.longitude,
            }}
            title={`${s.road}: Finish`}
            description={s.name}
            pinColor="red"
            tracksViewChanges={false}
          />
        </React.Fragment>
      ))}

      {activeSegment && (
        <>
          <Marker
            coordinate={{
              latitude: activeSegment.start.latitude,
              longitude: activeSegment.start.longitude,
            }}
            title={`${activeSegment.road}: Start`}
            description={activeSegment.name}
            pinColor="red"
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
        pinColor="red"
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

      {/* On-map circular speed badge */}
      {speedBadgeValue != null && (
        <View pointerEvents="none" style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeValue}>{speedBadgeValue.toFixed(1)}</Text>
            <Text style={styles.badgeUnit}>km/h</Text>
          </View>
        </View>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(25, 118, 210, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  badgeUnit: {
    color: "#e3f2fd",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "700",
  },
});
