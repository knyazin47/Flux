// Flame icon using Ionicons.
// active=false → gray (daily goal not reached)
// active=true  → orange with glow shadow (daily goal met)

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  active?: boolean;
  size?: number;
}

export function FlameIcon({ active = false, size = 32 }: Props) {
  return (
    <View style={active ? [s.wrapper, s.glow] : s.wrapper}>
      <Ionicons
        name="flame"
        size={size}
        color={active ? "#F97316" : "#CBD5E1"}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
});
