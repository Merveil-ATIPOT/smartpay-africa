import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";

import { ActivityScreen } from "../screens/ActivityScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ScannerScreen } from "../screens/ScannerScreen";
import { ServicesScreen } from "../screens/ServicesScreen";
import { colors, shadow } from "../theme";
import type { TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();

function ScannerFab() {
  return (
    <View style={styles.fab}>
      <Ionicons name="qr-code" size={26} color={colors.white} />
    </View>
  );
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: "ACCUEIL",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "wallet" : "wallet-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActivityScreen}
        options={{
          tabBarLabel: "ACTIVITÉ",
          tabBarIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          tabBarLabel: "SCANNER",
          tabBarIcon: () => <ScannerFab />,
        }}
      />
      <Tab.Screen
        name="Services"
        component={ServicesScreen}
        options={{
          tabBarLabel: "SERVICES",
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={22} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "PROFIL",
          tabBarIcon: ({ color }) => <Ionicons name="shield-outline" size={22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 72,
    paddingTop: 8,
    backgroundColor: colors.white,
    borderTopColor: colors.border,
  },
  label: { fontSize: 9, fontWeight: "700", marginBottom: 8 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
    ...shadow.fab,
  },
});
