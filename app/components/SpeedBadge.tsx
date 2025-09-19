import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  valueKmh: number;
  top?: number;
  right?: number;
  glowDanger?: boolean;
};

export default function SpeedBadge({
  valueKmh,
  top = 64,
  right = 16,
  glowDanger = false,
}: Props) {
  return (
    <View pointerEvents="none" style={[styles.badgeContainer, { top, right }]}>
      <View style={[styles.badge, glowDanger && styles.badgeDanger]}>
        <Text style={styles.badgeValue}>
          {Math.max(0, Math.round(valueKmh))}
        </Text>
        <Text style={styles.badgeUnit}>km/h</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: "absolute",
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
  badgeDanger: {
    backgroundColor: "rgba(211, 47, 47, 0.92)",
    shadowColor: "#d32f2f",
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  badgeValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  badgeUnit: {
    color: "#e3f2fd",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "700",
  },
});
