//teacher.tsx — Teacher dashboard: My Classes
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
import { ClassSummary, getMyClasses, getMyReferrals } from "../../utils/api";

export default function TeacherDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [openReferrals, setOpenReferrals] = useState(0);

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await getMyClasses();
      setClasses(data.classes || []);

      // Referrals are secondary: a failure here must not break the dashboard
      try {
        const refs = await getMyReferrals();
        setOpenReferrals(
          refs.referrals.filter((r) => r.status !== "responded").length,
        );
      } catch {
        setOpenReferrals(0);
      }
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

  const totalStudents = classes.reduce((sum, c) => sum + c.memberCount, 0);
  const liveNow = classes.filter((c) => c.isLive).length;
  const hasNoClasses = !loading && !error && classes.length === 0;

  const actionCardBase = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scroll}
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
        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight,
            color: colors.primary,
            textAlign: "center",
            marginTop: spacing.md,
          }}
          accessibilityRole="header"
        >
          IncluEd
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 4,
            marginBottom: spacing.xl,
          }}
        >
          Welcome, {user?.name || "Teacher"}
        </Text>

        <View
          style={[
            styles.actionGrid,
            { gap: spacing.md, marginBottom: spacing.xl },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.actionCard,
              actionCardBase,
              { borderColor: colors.border },
            ]}
            onPress={() => router.push("/create-session")}
            accessibilityRole="button"
            accessibilityLabel="Schedule Class. Create a new class"
          >
            <Ionicons
              name="add-circle-outline"
              size={28}
              color={colors.primary}
              style={{ marginBottom: spacing.sm }}
            />
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              Schedule Class
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Create a new class
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              actionCardBase,
              { borderColor: colors.primaryLight },
            ]}
            onPress={() => router.push("/my-classes")}
            accessibilityRole="button"
            accessibilityLabel="My Classes. Manage your classes"
          >
            <Ionicons
              name="albums-outline"
              size={28}
              color={colors.primary}
              style={{ marginBottom: spacing.sm }}
            />
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              My Classes
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Manage your classes
            </Text>
          </TouchableOpacity>
        </View>

        {openReferrals > 0 && (
          <TouchableOpacity
            style={[
              styles.referralBanner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.warning,
                borderRadius: radius.lg,
                padding: spacing.md,
                marginBottom: spacing.xl,
              },
            ]}
            onPress={() => router.push("/referrals" as any)}
            accessibilityRole="button"
            accessibilityLabel={`${openReferrals} Guidance support referral${
              openReferrals === 1 ? "" : "s"
            } waiting. Open referrals.`}
          >
            <Ionicons name="school-outline" size={24} color={colors.primary} />

            <View style={{ flex: 1, marginLeft: spacing.sm + 2 }}>
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {openReferrals} Guidance referral
                {openReferrals === 1 ? "" : "s"} waiting
              </Text>
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Guidance asked you to follow up with a student.
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {loading && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: spacing.xxl }}
            accessibilityLabel="Loading classes"
          />
        )}

        {!loading && error && (
          <View
            style={[
              styles.stateBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
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

        {hasNoClasses && (
          <View
            style={[
              styles.stateBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
              },
            ]}
          >
            <Ionicons
              name="albums-outline"
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
              No classes yet.
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              Schedule your first class to get started.
            </Text>
          </View>
        )}

        {!loading && !error && classes.length > 0 && (
          <View>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginBottom: spacing.sm,
              }}
            >
              {classes.length} class{classes.length === 1 ? "" : "es"} ·{" "}
              {totalStudents} student{totalStudents === 1 ? "" : "s"}
              {liveNow > 0 ? ` · ${liveNow} live now` : ""}
            </Text>
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
                marginBottom: spacing.md,
              }}
              accessibilityRole="header"
            >
              My Classes
            </Text>
            {classes.map((c) => (
              <ClassCard
                key={c.id}
                cls={c}
                showAccommodations
                onPress={() => router.push(`/class/${c.id}` as any)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  actionGrid: { flexDirection: "row" },
  actionCard: { flex: 1, borderWidth: 1 },
  referralBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  stateBox: { alignItems: "center", borderWidth: 1 },
});
