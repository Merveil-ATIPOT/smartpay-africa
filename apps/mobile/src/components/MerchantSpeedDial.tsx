import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  MERCHANT_SPEED_DIAL_ITEMS,
  readMerchantLocation,
  runMerchantSpeedDialAction,
  speedDialVisibleOn,
  type MerchantSpeedDialId,
} from "../lib/merchantNavigation";
import type { AppStackParamList } from "../navigation/types";
import { colors, shadow } from "../theme";

const TAB_BAR_SPACE = 64;

function useMerchantLocation() {
  return useNavigationState((state) => readMerchantLocation(state));
}

export function MerchantSpeedDial() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const location = useMerchantLocation();
  const [open, setOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  if (!speedDialVisibleOn(location)) {
    return null;
  }

  function setMenu(next: boolean) {
    setOpen(next);
    Animated.spring(progress, {
      toValue: next ? 1 : 0,
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }

  function onSelect(id: MerchantSpeedDialId) {
    setMenu(false);
    runMerchantSpeedDialAction(navigation, id, location);
  }

  const compact = width < 360;
  const bottom = Math.max(insets.bottom, 8) + TAB_BAR_SPACE + 12;
  const rotation = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le menu de navigation"
          onPress={() => setMenu(false)}
          style={styles.dismiss}
        />
      ) : null}
      <View pointerEvents="box-none" style={[styles.anchor, { bottom, right: Math.max(insets.right, compact ? 12 : 16) }]}>
        {MERCHANT_SPEED_DIAL_ITEMS.map((item, index) => {
          const offset = MERCHANT_SPEED_DIAL_ITEMS.length - index;
          const translateY = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [10 * offset, 0],
          });
          return (
            <Animated.View
              key={item.id}
              pointerEvents={open ? "auto" : "none"}
              style={[styles.actionWrap, { opacity: progress, transform: [{ translateY }] }]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.label}
                hitSlop={6}
                onPress={() => onSelect(item.id)}
                style={styles.action}
              >
                <Ionicons name={item.icon} size={18} color={colors.navy} />
                <Text style={styles.actionLabel}>{item.label}</Text>
              </Pressable>
            </Animated.View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Navigation rapide"
          accessibilityState={{ expanded: open }}
          hitSlop={8}
          onPress={() => setMenu(!open)}
          style={styles.fab}
        >
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="add" size={28} color={colors.white} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dismiss: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 24, 40, 0.28)",
  },
  anchor: {
    position: "absolute",
    alignItems: "flex-end",
    gap: 10,
  },
  actionWrap: { alignItems: "flex-end" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 24,
    minHeight: 48,
    minWidth: 168,
    ...shadow.card,
  },
  actionLabel: { color: colors.navy, fontWeight: "700", fontSize: 14 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.stitchOrange,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.fab,
  },
});
