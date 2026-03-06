// Custom horizontal slider component.
// Works without @react-native-community/slider or reanimated.
// Uses PanResponder + ref-based width measurement.

import React, { useRef, useState } from "react";
import { View, Text, PanResponder, StyleSheet } from "react-native";

const THUMB = 24;

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  /** Format the value label shown below the slider */
  formatLabel?: (v: number) => string;
  trackColor?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  color = "#F97316",
  formatLabel,
  trackColor = "#E2E8F0",
}: SliderProps) {
  // Keep refs for stable closure in PanResponder (created once via useRef)
  const info = useRef({ width: 0, pageX: 0 });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const minRef = useRef(min);
  const maxRef = useRef(max);
  const stepRef = useRef(step);
  const valueRef = useRef(value);
  minRef.current = min;
  maxRef.current = max;
  stepRef.current = step;
  valueRef.current = value;

  const trackRef = useRef<View>(null);
  // containerWidth in state so that onLayout triggers a re-render,
  // making fillWidth and thumbLeft correct immediately after mount.
  const [containerWidth, setContainerWidth] = useState(0);

  const calcValue = (pageX: number): number => {
    const { width, pageX: ox } = info.current;
    if (width === 0) return valueRef.current;
    const ratio = Math.max(0, Math.min(1, (pageX - ox) / width));
    const raw = minRef.current + ratio * (maxRef.current - minRef.current);
    const stepped = Math.round(raw / stepRef.current) * stepRef.current;
    return Math.max(minRef.current, Math.min(maxRef.current, stepped));
  };

  const measureAndUpdate = (pageX: number) => {
    trackRef.current?.measure((_x, _y, w, _h, px) => {
      info.current = { width: w, pageX: px };
      onChangeRef.current(calcValue(pageX));
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => measureAndUpdate(e.nativeEvent.pageX),
      onPanResponderMove: (e) => onChangeRef.current(calcValue(e.nativeEvent.pageX)),
    })
  ).current;

  // Pixel positions — derived from containerWidth state (triggers re-render after layout)
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const fillWidth = containerWidth * pct;
  const thumbLeft = containerWidth * pct - THUMB / 2;

  return (
    <View style={ss.wrapper} {...panResponder.panHandlers}>
      <View
        style={ss.hitArea}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          info.current.width = w;
          setContainerWidth(w); // triggers re-render so fill/thumb appear correctly
          trackRef.current?.measure((_x, _y, _w, _h, px) => {
            info.current.pageX = px;
          });
        }}
      >
        {/* Track */}
        <View
          ref={trackRef}
          style={[ss.track, { backgroundColor: trackColor }]}
        >
          <View
            style={[ss.fill, { width: fillWidth, backgroundColor: color }]}
          />
        </View>

        {/* Thumb */}
        <View
          style={[
            ss.thumb,
            {
              left: thumbLeft,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      </View>

      {formatLabel && (
        <Text style={[ss.label, { color }]}>{formatLabel(value)}</Text>
      )}
    </View>
  );
}

const ss = StyleSheet.create({
  wrapper: { paddingVertical: 4 },
  hitArea: {
    height: THUMB + 16,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "visible",
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  thumb: {
    position: "absolute",
    top: (THUMB + 16) / 2 - THUMB / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  label: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
});
