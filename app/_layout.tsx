// app/_layout.tsx
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

import { createToastConfig } from "../components/common/ToastConfig";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";

const PUBLIC_ROUTES = [
  "index",
  "role-select",
  "login",
  "register",
  "support-needs",
  "staff-login",
  "staff-register",
];

const ENTRY_ROUTES = ["index", "role-select"];

const STAFF_ROLES = ["teacher", "guidance"];

const ROLE_HOME: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  guidance: "/guidance-dashboard",
};

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Role of the last signed-in user, so we know who just logged out.
  const lastRoleRef = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;

    const currentRoute = (segments[0] as string) ?? "index";
    const inPublicRoute = PUBLIC_ROUTES.includes(currentRoute);
    const inEntryRoute = ENTRY_ROUTES.includes(currentRoute);

    if (!user && !inPublicRoute) {
      // Signed out from a protected screen:
      // teacher/guidance -> Staff Portal, everyone else -> landing page.
      const wasStaff =
        lastRoleRef.current !== null &&
        STAFF_ROLES.includes(lastRoleRef.current);
      router.replace((wasStaff ? "/staff-login" : "/") as any);
    } else if (user && inEntryRoute) {
      const home = ROLE_HOME[user.role] ?? "/";
      router.replace(home as any);
    }

    // Remember who is signed in (null once signed out).
    lastRoleRef.current = user?.role ?? null;
  }, [user, loading, segments]);

  if (loading) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      />

      <StatusBar style={isDark ? "light" : "dark"} />

      <Toast config={createToastConfig(colors)} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "AtkinsonHyperlegible-Regular": require("../assets/fonts/AtkinsonHyperlegible-Regular.ttf"),
    "AtkinsonHyperlegible-Bold": require("../assets/fonts/AtkinsonHyperlegible-Bold.ttf"),
    "AtkinsonHyperlegible-Italic": require("../assets/fonts/AtkinsonHyperlegible-Italic.ttf"),
    "AtkinsonHyperlegible-BoldItalic": require("../assets/fonts/AtkinsonHyperlegible-BoldItalic.ttf"),
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}