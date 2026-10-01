// app/(app)/my-classes.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ClassCard from "../../components/ClassCard";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { ClassSummary, getMyClasses } from "../../utils/api";

export default function MyClassesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isTeacher = user?.role === "teacher";

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await getMyClasses();
      setClasses(data.classes || []);
    } catch (err) {
      console.error("Error loading classes:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleBack = () => {
    router.replace(isTeacher ? "/teacher" : "/student");
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          accessibilityLabel="Loading classes"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <TouchableOpacity
          style={[styles.backButton, { marginBottom: spacing.md }]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: colors.primary,
              fontSize: typography.body.fontSize,
              marginLeft: 6,
            }}
          >
            Back
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight,
            color: colors.text,
            marginBottom: 4,
          }}
          accessibilityRole="header"
        >
          My Classes
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.lg,
          }}
        >
          {isTeacher
            ? "Your classes and their sessions"
            : "Classes you've joined"}
        </Text>

        <TouchableOpacity
          onPress={() => router.push(isTeacher ? "/create-session" : "/join")}
          accessibilityRole="button"
          accessibilityLabel={isTeacher ? "Schedule a class" : "Join a class"}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.md,
            padding: spacing.md,
            alignItems: "center",
            marginBottom: spacing.lg,
          }}
        >
          <Text
            style={{
              fontFamily: typography.button.fontFamily,
              fontSize: typography.button.fontSize,
              fontWeight: typography.button.fontWeight,
              color: "#FFFFFF",
            }}
          >
            {isTeacher ? "+ Schedule Class" : "+ Join Class"}
          </Text>
        </TouchableOpacity>

        {error && (
          <View
            style={[
              styles.stateBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <Ionicons
              name="cloud-offline-outline"
              size={32}
              color={colors.textSecondary}
            />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
                textAlign: "center",
                marginTop: spacing.sm,
              }}
            >
              We couldn't load your classes.
            </Text>
            <TouchableOpacity
              onPress={load}
              accessibilityRole="button"
              accessibilityLabel="Retry loading classes"
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                marginTop: spacing.md,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontWeight: "700",
                  color: "#FFFFFF",
                }}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && classes.length === 0 && (
          <View style={[styles.empty, { paddingVertical: spacing.xxl }]}>
            <Ionicons
              name="albums-outline"
              size={64}
              color={colors.textSecondary}
              style={{ marginBottom: spacing.md }}
            />
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                fontWeight: "700",
                color: colors.text,
                marginBottom: spacing.sm,
              }}
            >
              No Classes Yet
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              {isTeacher
                ? "Schedule your first class to get started"
                : "Join a class using a class code to get started"}
            </Text>
          </View>
        )}

        {classes.map((c) => (
          <ClassCard
            key={c.id}
            cls={c}
            showAccommodations={isTeacher}
            onPress={() => router.push(`/class/${c.id}` as any)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    minHeight: 44,
  },
  stateBox: { alignItems: "center", borderWidth: 1 },
  empty: { alignItems: "center", justifyContent: "center" },
});
