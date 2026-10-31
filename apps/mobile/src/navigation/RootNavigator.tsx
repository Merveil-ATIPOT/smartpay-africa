import { useCallback, useRef, useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../hooks/useAuth";
import { canLeaveSplash, hasPlayedSplashThisProcess } from "../lib/splashSequence";
import { BeneficiaryScreen } from "../screens/BeneficiaryScreen";
import { ConfirmScreen } from "../screens/ConfirmScreen";
import { DestinationCountryScreen } from "../screens/DestinationCountryScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { ReceiveScreen } from "../screens/ReceiveScreen";
import { SplashScreen } from "../screens/SplashScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { TransferAmountScreen } from "../screens/TransferAmountScreen";
import { TransferResultScreen } from "../screens/TransferResultScreen";
import { TransferReviewScreen } from "../screens/TransferReviewScreen";
import { AssistantChatScreen } from "../screens/AssistantChatScreen";
import { AssistantHomeScreen } from "../screens/AssistantHomeScreen";
import { MerchantNavigator } from "./MerchantNavigator";
import { TabNavigator } from "./TabNavigator";
import type { AppStackParamList } from "./types";

const Stack = createNativeStackNavigator<AppStackParamList>();

export function RootNavigator() {
  const { loading, user } = useAuth();
  const playThisLaunch = useRef(!hasPlayedSplashThisProcess());
  const [animationDone, setAnimationDone] = useState(!playThisLaunch.current);

  const onSplashFinished = useCallback(() => {
    setAnimationDone(true);
  }, []);

  if (!canLeaveSplash(!loading, animationDone)) {
    return <SplashScreen playAnimation={playThisLaunch.current} onFinished={onSplashFinished} />;
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
          <Stack.Screen name="Merchant" component={MerchantNavigator} />
          <Stack.Screen name="AssistantHome" component={AssistantHomeScreen} />
          <Stack.Screen name="AssistantChat" component={AssistantChatScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
