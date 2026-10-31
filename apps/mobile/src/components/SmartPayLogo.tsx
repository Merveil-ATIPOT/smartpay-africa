import { Image, StyleSheet, View } from "react-native";

import logo from "../../assets/Logo_SmartPay_Africa.png";

export function SmartPayLogo({
  size = 96,
  framed = false,
}: {
  size?: number;
  framed?: boolean;
}) {
  const image = (
    <Image
      source={logo}
      accessibilityLabel="Logo SmartPay Africa"
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
  if (!framed) {
    return image;
  }
  const frame = size + 20;
  return (
    <View style={[styles.frame, { width: frame, height: frame, borderRadius: frame / 2 }]}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
