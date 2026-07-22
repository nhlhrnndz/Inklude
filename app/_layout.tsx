import { Stack } from "expo-router";
import Toast from "react-native-toast-message";

import { AuthProvider } from "../context/AuthContext";
import { toastConfig } from "../components/common/ToastConfig";
import Colors from "../theme/colors";

export default function RootLayout() {
  return (
    <AuthProvider>
      <>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.background,
            },
            headerTintColor: Colors.primary,
            headerTitleStyle: {
              fontWeight: "700",
              color: Colors.primary,
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: Colors.background,
            },
          }}
        />

        <Toast config={toastConfig} />
      </>
    </AuthProvider>
  );
}