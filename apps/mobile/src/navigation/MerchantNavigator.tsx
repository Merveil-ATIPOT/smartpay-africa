import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";

import { MerchantTabBar } from "../components/MerchantChrome";
import { MerchantSpeedDial } from "../components/MerchantSpeedDial";
import { MerchantCreateInvoiceScreen } from "../screens/MerchantCreateInvoiceScreen";
import { MerchantDashboardScreen } from "../screens/MerchantDashboardScreen";
import { MerchantQrScreen } from "../screens/MerchantQrScreen";
import { MerchantReceiptScreen } from "../screens/MerchantReceiptScreen";
import { MerchantSalesAnalyticsScreen } from "../screens/MerchantSalesAnalyticsScreen";
import { MerchantSalesHistoryScreen } from "../screens/MerchantSalesHistoryScreen";
import { MerchantShopScreen } from "../screens/MerchantShopScreen";
import type { MerchantStackParamList, MerchantTabParamList } from "./types";

const Tabs = createBottomTabNavigator<MerchantTabParamList>();
const Stack = createNativeStackNavigator<MerchantStackParamList>();

function MerchantTabNavigator() {
  return (
    <Tabs.Navigator
      backBehavior="none"
      tabBar={(props) => <MerchantTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="MerchantHome" component={MerchantDashboardScreen} />
      <Tabs.Screen name="MerchantSalesAnalytics" component={MerchantSalesAnalyticsScreen} />
      <Tabs.Screen name="MerchantSalesHistory" component={MerchantSalesHistoryScreen} />
      <Tabs.Screen name="MerchantShop" component={MerchantShopScreen} />
    </Tabs.Navigator>
  );
}

export function MerchantNavigator() {
  return (
    <View style={styles.root}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MerchantTabs" component={MerchantTabNavigator} />
        <Stack.Screen name="MerchantCreateInvoice" component={MerchantCreateInvoiceScreen} />
        <Stack.Screen name="MerchantQr" component={MerchantQrScreen} />
        <Stack.Screen name="MerchantReceipt" component={MerchantReceiptScreen} />
      </Stack.Navigator>
      <MerchantSpeedDial />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
