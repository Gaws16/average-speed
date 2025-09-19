import React from "react";
import { Platform, StyleSheet } from "react-native";
import MapMarkers from "./MapMarkers";
import MapPolylines from "./MapPolylines";
import SpeedBadge from "./SpeedBadge";

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
  currentSpeedKmh: number;
  badgeTop?: number;
  badgeRight?: number;
  limitsMap?: Record<
    string,
    { maxAvgKmH?: number; recommendedAvgKmH?: number }
  >;
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
  currentSpeedKmh,
  badgeTop = 64,
  badgeRight = 16,
  limitsMap,
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
      <MapPolylines Polyline={Polyline} segments={segments} />
      <MapMarkers
        Marker={Marker}
        segments={segments}
        activeSegment={activeSegment as any}
        startPoint={startPoint}
        finishPoint={finishPoint}
      />

      <SpeedBadge
        valueKmh={currentSpeedKmh}
        top={badgeTop}
        right={badgeRight}
        glowDanger={(() => {
          if (!activeSegment || !limitsMap) return false;
          const k = `${activeSegment.road}|${activeSegment.name}`;
          const max = limitsMap[k]?.maxAvgKmH;
          return typeof max === "number" && currentSpeedKmh > max;
        })()}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  // styles for badge moved to SpeedBadge
});
