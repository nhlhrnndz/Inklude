import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import Toast from "react-native-toast-message";

import { createToastConfig } from "../components/common/ToastConfig";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";

// All screens reachable without being logged in.
const PUBLIC_ROUTES = ["index", "role-select", "login", "register"];

// Entry screens only — if a user is already authenticated and lands
// here (e.g. app reopened with a stored token), we redirect them
// straight to their dashboard. login/register are deliberately
// excluded: they already do their own post-action navigation
// (including the /accessibility first-time-profile case), so this
// effect must not race against that.
const ENTRY_ROUTES = ["index", "role-select"];

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

  useEffect(() => {
    if (loading) return;

    const currentRoute = (segments[0] as string) ?? "index";
    const inPublicRoute = PUBLIC_ROUTES.includes(currentRoute);
    const inEntryRoute = ENTRY_ROUTES.includes(currentRoute);

    if (!user && !inPublicRoute) {
      // Not logged in, trying to view a protected dashboard/screen.
      router.replace("/");
    } else if (user && inEntryRoute) {
      // Already logged in but sitting on Get Started / role-select
      // (e.g. app reopened with a stored session) — skip straight
      // to their dashboard.
      const home = ROLE_HOME[user.role] ?? "/";
      router.replace(home as any);
    }
    // Note: user is on "login" or "register" — do nothing here.
    // Those screens navigate themselves after a successful action.
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
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}