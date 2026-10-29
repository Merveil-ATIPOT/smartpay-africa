import { StyleSheet, View } from "react-native";

import { colors } from "../theme";

/** Motif Stitch : points ambre discrets sur le fond navy. */
export function DotLattice({ rows = 14, cols = 18 }: { rows?: number; cols?: number }) {
  const dots = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      dots.push(
        <View
          key={`${row}-${col}`}
          style={[styles.dot, { top: 8 + row * 16, left: 8 + col * 16 }]}
        />,
      );
    }
  }
  return <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>{dots}</View>;
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.stitchOrange,
    opacity: 0.18,
  },
});
