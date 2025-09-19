import React from "react";
import { StyleSheet, Text, View } from "react-native";

type LatLng = { latitude: number; longitude: number };

type Props = {
  phase: "idle" | "waiting_start" | "tracking" | "finished";
  avgKmH: number | null;
  activeSegmentName: string | null;
  userCoords: LatLng | null;
  startTimeMs: number | null;
  computeLiveAverage: () => number;
};

export default function StatsBar({
  phase,
  avgKmH,
  activeSegmentName,
  userCoords,
  startTimeMs,
  computeLiveAverage,
}: Props) {
  return (
    <View style={styles.bottomBar}>
      {phase === "finished" && avgKmH != null ? (
        <Text style={styles.avgText}>
          Average Speed: {avgKmH.toFixed(2)} km/h
        </Text>
      ) : activeSegmentName && phase === "tracking" && userCoords ? (
        <Text style={styles.avgText}>
          {activeSegmentName}: live avg {computeLiveAverage().toFixed(2)} km/h
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    padding: 16,
    backgroundColor: "#f7f7f7",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e0e0e0",
  },
  avgText: { fontSize: 18, fontWeight: "700" },
});
