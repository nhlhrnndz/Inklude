// app/session/[id]/index.tsx — legacy screen. Sessions now live inside a
// class, so this just forwards to the class page.
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import { getSessionDetails } from "../../../utils/api";

const ROLE_HOME: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  guidance: "/guidance-dashboard",
};

export default function SessionRedirectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();

  const home = ROLE_HOME[user?.role ?? "student"] ?? "/";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getSessionDetails(Number(id));
        const classId = data.session?.classId;
        if (cancelled) return;
        router.replace((classId ? `/class/${classId}` : home) as any);
      } catch {
        if (!cancelled) router.replace(home as any);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, home, router]);

  return (
    <SafeAreaView
      style={[styles.centered, { backgroundColor: colors.background }]}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
});
