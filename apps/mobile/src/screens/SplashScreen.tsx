import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line } from "react-native-svg";

import { SmartPayLogo } from "../components/SmartPayLogo";
import { SPLASH_TAGLINE } from "../lib/authEntry";
import { markSplashPlayed, splashHoldMs } from "../lib/splashSequence";
import { colors, spacing } from "../theme";

const STAGE = 280;
const CX = STAGE / 2;
const CY = STAGE / 2;
const NODES = [
  { x: 58, y: 72, color: "#FE9821", r: 4 },
  { x: 222, y: 64, color: "#70FDA7", r: 3.5 },
  { x: 236, y: 168, color: "#FE9821", r: 3 },
  { x: 48, y: 188, color: "#70FDA7", r: 3.5 },
  { x: 140, y: 236, color: "#FFFFFF", r: 4 },
] as const;
const LINKS: [number, number][] = [
  [0, 4],
  [1, 4],
  [2, 4],
  [3, 4],
  [0, 1],
];

type Props = {
  playAnimation: boolean;
  onFinished: () => void;
};

export function SplashScreen({ playAnimation, onFinished }: Props) {
  const logoOpacity = useRef(new Animated.Value(playAnimation ? 0 : 1)).current;
  const logoScale = useRef(new Animated.Value(playAnimation ? 0.86 : 1)).current;
  const haloOpacity = useRef(new Animated.Value(playAnimation ? 0 : 0.9)).current;
  const haloScale = useRef(new Animated.Value(playAnimation ? 0.82 : 1.08)).current;
  const netOpacity = useRef(new Animated.Value(playAnimation ? 0 : 1)).current;
  const textOpacity = useRef(new Animated.Value(playAnimation ? 0 : 1)).current;
  const ringSpin = useRef(new Animated.Value(0)).current;
  const nodePulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      markSplashPlayed();
      onFinished();
    };

    let reduceMotion = false;
    let holdTimer: ReturnType<typeof setTimeout> | undefined;
    let ringLoop: Animated.CompositeAnimation | undefined;
    let pulseLoop: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    const safetyTimer = setTimeout(finish, splashHoldMs(false, !playAnimation) + 800);

    const run = async () => {
      try {
        reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      } catch {
        reduceMotion = false;
      }
      if (cancelled) {
        return;
      }

      const hold = splashHoldMs(reduceMotion, !playAnimation);
      holdTimer = setTimeout(finish, Math.max(hold, 0));

      if (!playAnimation || reduceMotion) {
        logoOpacity.setValue(1);
        logoScale.setValue(1);
        haloOpacity.setValue(0.85);
        haloScale.setValue(1.08);
        netOpacity.setValue(reduceMotion ? 0.35 : 1);
        textOpacity.setValue(1);
        return;
      }

      try {
        ringLoop = Animated.loop(
          Animated.timing(ringSpin, {
            toValue: 1,
            duration: 12000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        );
        pulseLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(nodePulse, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(nodePulse, {
              toValue: 0.4,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        );
        ringLoop.start();
        pulseLoop.start();

        Animated.sequence([
          Animated.parallel([
            Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
            Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 58, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(haloOpacity, { toValue: 1, duration: 520, useNativeDriver: true }),
            Animated.timing(haloScale, { toValue: 1.12, duration: 720, useNativeDriver: true }),
            Animated.timing(netOpacity, { toValue: 1, duration: 640, useNativeDriver: true }),
          ]),
          Animated.timing(textOpacity, { toValue: 1, duration: 560, useNativeDriver: true }),
        ]).start();
      } catch {
        logoOpacity.setValue(1);
        textOpacity.setValue(1);
      }
    };

    void run();

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      if (holdTimer) {
        clearTimeout(holdTimer);
      }
      ringLoop?.stop();
      pulseLoop?.stop();
    };
  }, [
    playAnimation,
    onFinished,
    logoOpacity,
    logoScale,
    haloOpacity,
    haloScale,
    netOpacity,
    textOpacity,
    ringSpin,
    nodePulse,
  ]);

  const ringRotate = ringSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View style={styles.glowOrange} pointerEvents="none" />
      <View style={styles.glowGreen} pointerEvents="none" />
      <View style={styles.center}>
        <View style={styles.stage}>
          <Animated.View style={[styles.halo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
          <Animated.View style={[styles.net, { opacity: netOpacity }]}>
            <Svg width={STAGE} height={STAGE}>
              {LINKS.map(([a, b]) => (
                <Line
                  key={`${a}-${b}`}
                  x1={NODES[a].x}
                  y1={NODES[a].y}
                  x2={NODES[b].x}
                  y2={NODES[b].y}
                  stroke="rgba(255,255,255,0.35)"
                  strokeDasharray="4 6"
                  strokeWidth={1}
                />
              ))}
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.ringWrap, { transform: [{ rotate: ringRotate }] }]}>
            <Svg width={STAGE} height={STAGE}>
              <Circle
                cx={CX}
                cy={CY}
                r={108}
                fill="none"
                stroke="rgba(254,152,33,0.45)"
                strokeDasharray="7 11"
                strokeWidth={1.4}
              />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.nodes, { opacity: nodePulse }]}>
            <Svg width={STAGE} height={STAGE}>
              {NODES.map((node) => (
                <Circle key={`${node.x}-${node.y}`} cx={node.x} cy={node.y} r={node.r} fill={node.color} />
              ))}
            </Svg>
          </Animated.View>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
            <SmartPayLogo size={132} framed />
          </Animated.View>
        </View>
        <Animated.View style={[styles.copy, { opacity: textOpacity }]}>
          <Text style={styles.title}>SmartPay Africa</Text>
          <Text style={styles.subtitle}>{SPLASH_TAGLINE}</Text>
        </Animated.View>
      </View>
      <Animated.Text style={[styles.regtest, { opacity: textOpacity }]}>Démonstration Regtest</Animated.Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.stitchNavy,
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    overflow: "hidden",
  },
  glowOrange: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(254,152,33,0.16)",
  },
  glowGreen: {
    position: "absolute",
    right: -70,
    top: "32%",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(112,253,167,0.1)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  stage: {
    width: STAGE,
    height: STAGE,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(254,152,33,0.22)",
  },
  net: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ringWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  nodes: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    color: "#D9E3FB",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
  regtest: {
    color: colors.stitchPeach,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
