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

export default function MySessionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isTeacher = user?.role === "teacher";

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

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Loading sessions" />
      </SafeAreaView>
    );
  }

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
        <TouchableOpacity
          style={[styles.backButton, { marginBottom: spacing.md }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
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
          My Sessions
        </Text>
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            marginBottom: spacing.xl,
          }}
        >
          View and manage all your class sessions
        </Text>

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
              <Text style={{ fontFamily: typography.body.fontFamily, fontWeight: "700", color: "#FFFFFF" }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!error && sessions.length === 0 ? (
          <View style={[styles.emptyState, { paddingVertical: spacing.xxl }]}>
            <Ionicons name="albums-outline" size={64} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                fontWeight: "700",
                color: colors.text,
                marginBottom: spacing.sm,
              }}
            >
              No Sessions Yet
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.textSecondary,
                marginBottom: isTeacher ? spacing.xl : 0,
                textAlign: "center",
              }}
            >
              {isTeacher
                ? "Create your first session to get started"
                : "Join a session using a class code to get started"}
            </Text>
            {isTeacher && (
              <TouchableOpacity
                style={[
                  styles.createButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.xl,
                    paddingVertical: spacing.md - 2,
                  },
                ]}
                onPress={() => router.push("/create-session")}
                accessibilityRole="button"
                accessibilityLabel="Create a new session"
              >
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    color: "#FFFFFF",
                    fontSize: typography.body.fontSize,
                    fontWeight: "700",
                  }}
                >
                  Create Session
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {activeSessions.length > 0 && (
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
                  Active Sessions ({activeSessions.length})
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
                    <View style={[styles.sessionHeader, { marginBottom: spacing.sm }]}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: typography.caption.fontFamily,
                            color: colors.textSecondary,
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Code
                        </Text>
                        <Text
                          style={{
                            fontFamily: typography.title.fontFamily,
                            color: colors.primary,
                            fontSize: 18,
                            fontWeight: "700",
                            letterSpacing: 1,
                          }}
                        >
                          {session.code}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: colors.success, borderRadius: radius.sm },
                        ]}
                      >
                        <Text style={styles.badgeText}>● LIVE</Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        color: colors.text,
                        fontSize: 16,
                        fontWeight: "600",
                        marginBottom: 4,
                      }}
                    >
                      {session.title}
                    </Text>
                    {session.description ? (
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          color: colors.textSecondary,
                          fontSize: typography.caption.fontSize,
                          marginBottom: spacing.sm,
                        }}
                        numberOfLines={1}
                      >
                        {session.description}
                      </Text>
                    ) : null}
                    <View style={styles.sessionFooter}>
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
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          color: colors.textSecondary,
                          fontSize: 12,
                        }}
                      >
                        {new Date(session.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {endedSessions.length > 0 && (
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
                  Past Sessions ({endedSessions.length})
                </Text>
                {endedSessions.map((session) => (
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
                    <View style={[styles.sessionHeader, { marginBottom: spacing.sm }]}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontFamily: typography.caption.fontFamily,
                            color: colors.textSecondary,
                            fontSize: 10,
                            textTransform: "uppercase",
                            letterSpacing: 1,
                          }}
                        >
                          Code
                        </Text>
                        <Text
                          style={{
                            fontFamily: typography.title.fontFamily,
                            color: colors.primary,
                            fontSize: 18,
                            fontWeight: "700",
                            letterSpacing: 1,
                          }}
                        >
                          {session.code}
                        </Text>
                      </View>
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
                        marginBottom: 4,
                      }}
                    >
                      {session.title}
                    </Text>
                    {session.description ? (
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          color: colors.textSecondary,
                          fontSize: typography.caption.fontSize,
                          marginBottom: spacing.sm,
                        }}
                        numberOfLines={1}
                      >
                        {session.description}
                      </Text>
                    ) : null}
                    <View style={styles.sessionFooter}>
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
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          color: colors.textSecondary,
                          fontSize: 12,
                        }}
                      >
                        {session.endedAt
                          ? `Ended ${new Date(session.endedAt).toLocaleDateString()}`
                          : new Date(session.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
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
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  stateBox: {
    alignItems: "center",
    borderWidth: 1,
  },
  retryButton: {
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
  },
  createButton: {
    alignItems: "center",
  },
  sessionCard: {
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sessionFooter: {
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