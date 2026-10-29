import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../hooks/useAuth";
import { BeneficiaryScreen } from "../screens/BeneficiaryScreen";
import { ConfirmScreen } from "../screens/ConfirmScreen";
import { DestinationCountryScreen } from "../screens/DestinationCountryScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ReceiveScreen } from "../screens/ReceiveScreen";
import { TransferAmountScreen } from "../screens/TransferAmountScreen";
import { TransferResultScreen } from "../screens/TransferResultScreen";
import { TransferReviewScreen } from "../screens/TransferReviewScreen";
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
          <Stack.Screen name="TransferDestination" component={DestinationCountryScreen} />
          <Stack.Screen name="TransferBeneficiary" component={BeneficiaryScreen} />
          <Stack.Screen name="TransferAmount" component={TransferAmountScreen} />
          <Stack.Screen name="TransferReview" component={TransferReviewScreen} />
          <Stack.Screen name="TransferResult" component={TransferResultScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
