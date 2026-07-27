import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getMySessions } from "../../utils/api";

interface Session {
  id: number;
  code: string;
  title: string;
  description: string;
  status: "active" | "ended";
  createdAt: string;
  endedAt: string | null;
  participantCount: number;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setError(false);
    try {
      const data = await getMySessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Error loading sessions:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const activeSessions = sessions.filter((s) => s.status === "active");
  const endedSessions = sessions.filter((s) => s.status === "ended");
  const hasNoSessions =
    !loading && !error && activeSessions.length === 0 && endedSessions.length === 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
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

        <View style={[styles.actionGrid, { gap: spacing.md, marginBottom: spacing.xl }]}>
          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
              },
            ]}
            onPress={() => router.push("/create-session")}
            accessibilityRole="button"
            accessibilityLabel="Create Session. Start a new class session"
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
              Create Session
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Start a new class session
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.primaryLight,
                borderRadius: radius.lg,
                padding: spacing.lg,
              },
            ]}
            onPress={() => router.push("/my-sessions")}
            accessibilityRole="button"
            accessibilityLabel="View Sessions. Manage your sessions"
          >
            <Ionicons
              name="list-outline"
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
              View Sessions
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              Manage your sessions
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: spacing.xxl }}
            accessibilityLabel="Loading sessions"
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
                marginTop: spacing.md,
              },
            ]}
          >
            <Ionicons name="cloud-offline-outline" size={32} color={colors.textSecondary} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
                textAlign: "center",
                marginTop: spacing.sm,
              }}
            >
              We couldn't load your sessions.
            </Text>
            <TouchableOpacity
              style={[
                styles.retryButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.lg,
                  marginTop: spacing.md,
                },
              ]}
              onPress={loadSessions}
              accessibilityRole="button"
              accessibilityLabel="Retry loading sessions"
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

        {hasNoSessions && (
          <View
            style={[
              styles.stateBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.lg,
                padding: spacing.lg,
                marginTop: spacing.md,
              },
            ]}
          >
            <Ionicons name="albums-outline" size={32} color={colors.textSecondary} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
                textAlign: "center",
                marginTop: spacing.sm,
              }}
            >
              No sessions yet.
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
              Create your first class session to get started.
            </Text>
          </View>
        )}

        {!loading && !error && activeSessions.length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
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
              Active Sessions
            </Text>
            {activeSessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                  },
                ]}
                onPress={() => router.push(`/session/${session.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${session.title}, code ${session.code}, live, ${session.participantCount} participants`}
              >
                <View style={styles.sessionHeader}>
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      color: colors.primary,
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    #{session.code}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: colors.success, borderRadius: radius.sm },
                    ]}
                  >
                    <Text style={styles.badgeText}>LIVE</Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                    marginTop: 4,
                    marginBottom: 4,
                  }}
                >
                  {session.title}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      color: colors.textSecondary,
                      fontSize: typography.caption.fontSize,
                      marginLeft: 4,
                    }}
                  >
                    {session.participantCount} participants
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && !error && endedSessions.length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
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
              Past Sessions
            </Text>
            {endedSessions.slice(0, 3).map((session) => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.sessionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    opacity: 0.7,
                  },
                ]}
                onPress={() => router.push(`/session/${session.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${session.title}, code ${session.code}, ended, ${session.participantCount} participants`}
              >
                <View style={styles.sessionHeader}>
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      color: colors.primary,
                      fontSize: 14,
                      fontWeight: "700",
                    }}
                  >
                    #{session.code}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: colors.disabled, borderRadius: radius.sm },
                    ]}
                  >
                    <Text style={styles.badgeText}>ENDED</Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                    marginTop: 4,
                    marginBottom: 4,
                  }}
                >
                  {session.title}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      color: colors.textSecondary,
                      fontSize: typography.caption.fontSize,
                      marginLeft: 4,
                    }}
                  >
                    {session.participantCount} participants
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  actionGrid: {
    flexDirection: "row",
  },
  actionCard: {
    flex: 1,
    borderWidth: 1,
  },
  stateBox: {
    alignItems: "center",
    borderWidth: 1,
  },
  retryButton: {
    alignItems: "center",
  },
  sessionCard: {
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});