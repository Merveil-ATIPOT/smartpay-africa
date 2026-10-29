import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../hooks/useAuth";
import { ConfirmScreen } from "../screens/ConfirmScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ReceiveScreen } from "../screens/ReceiveScreen";
import { colors } from "../theme";
import { TabNavigator } from "./TabNavigator";
import type { AppStackParamList } from "./types";

const Stack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.gray }}>
        <ActivityIndicator color={colors.orange} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen name="Confirm" component={ConfirmScreen} />
          <Stack.Screen name="Receive" component={ReceiveScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
