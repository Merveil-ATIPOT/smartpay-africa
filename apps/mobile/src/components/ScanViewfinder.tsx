import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { SCAN_FRAME_SIZE, SCAN_LINE_HEIGHT, scanLineTravelRange } from "../lib/scanLine";
import { colors } from "../theme";

export function ScanViewfinder() {
  const travel = useRef(new Animated.Value(0)).current;
  const [frameHeight, setFrameHeight] = useState(SCAN_FRAME_SIZE);
  const { from, to } = useMemo(() => scanLineTravelRange(frameHeight), [frameHeight]);

  useEffect(() => {
    travel.setValue(0);
    const timing = { duration: 1600, easing: Easing.linear, useNativeDriver: true } as const;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(travel, { ...timing, toValue: 1 }),
        Animated.timing(travel, { ...timing, toValue: 0 }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      travel.stopAnimation();
    };
  }, [travel, frameHeight]);

  const translateY = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [from, to],
  });

  return (
    <View style={styles.box} pointerEvents="none">
      <Corner top left color={colors.stitchOrange} />
      <Corner top right color={colors.stitchGreenGlow} />
      <Corner bottom left color={colors.stitchGreenGlow} />
      <Corner bottom right color={colors.stitchOrange} />
      <View
        style={styles.inner}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.height);
          if (next > 0 && next !== frameHeight) {
            setFrameHeight(next);
          }
        }}
      >
        <Animated.View style={[styles.laserWrap, { transform: [{ translateY }] }]}>
          <LinearGradient
            colors={[colors.stitchOrange, colors.stitchGreenGlow, colors.stitchOrange]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.laser}
          />
        </Animated.View>
        <Ionicons name="qr-code-outline" size={64} color="rgba(255,255,255,0.22)" />
        <Text style={styles.align}>ALIGNER LA FACTURE</Text>
      </View>
    </View>
  );
}

function Corner({
  top,
  bottom,
  left,
  right,
  color,
}: {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  color: string;
}) {
  return (
    <View
      style={[
        styles.corner,
        top && { top: -2 },
        bottom && { bottom: -2 },
        left && { left: -2 },
        right && { right: -2 },
      ]}
    >
      <View
        style={[
          styles.cornerGlow,
          top && left && { borderTopLeftRadius: 16, top: -4, left: -4 },
          top && right && { borderTopRightRadius: 16, top: -4, right: -4 },
          bottom && left && { borderBottomLeftRadius: 16, bottom: -4, left: -4 },
          bottom && right && { borderBottomRightRadius: 16, bottom: -4, right: -4 },
          { backgroundColor: color },
        ]}
      />
      <View
        style={[
          styles.cornerStroke,
          {
            borderColor: color,
            borderTopWidth: top ? 3.5 : 0,
            borderBottomWidth: bottom ? 3.5 : 0,
            borderLeftWidth: left ? 3.5 : 0,
            borderRightWidth: right ? 3.5 : 0,
            borderTopLeftRadius: top && left ? 16 : 0,
            borderTopRightRadius: top && right ? 16 : 0,
            borderBottomLeftRadius: bottom && left ? 16 : 0,
            borderBottomRightRadius: bottom && right ? 16 : 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  inner: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  laserWrap: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    height: SCAN_LINE_HEIGHT,
    zIndex: 2,
  },
  laser: {
    height: 2,
    borderRadius: 2,
    shadowColor: colors.stitchOrange,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  align: {
    marginTop: 6,
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    zIndex: 3,
  },
  cornerGlow: {
    position: "absolute",
    width: 28,
    height: 28,
    opacity: 0.38,
  },
  cornerStroke: {
    width: 32,
    height: 32,
  },
});
