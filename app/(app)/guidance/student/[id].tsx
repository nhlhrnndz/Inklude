import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "../../../../context/AuthContext";
import { useTheme } from "../../../../context/ThemeContext";
import { getStudentDetail } from "../../../../utils/api";

type StudentDetail = {
  student: {
    id: number;
    name: string;
    email: string;
    createdAt: string;
    disabilityTypes: string[];
    accessibilityPreferences: Record<string, boolean>;
  };
  attendance: {
    sessionId: number;
    sessionCode: string;
    title: string;
    status: string;
    teacherName: string;
    joinedAt: string;
    leftAt: string | null;
  }[];
  transcripts: {
    id: number;
    text: string;
    createdAt: string;
    sessionTitle: string;
    sessionCode: string;
  }[];
};

// Maps each role to its dashboard route. Used so "Back to Dashboard"
// always returns the user to their own dashboard instead of relying
// on router.back(), which just pops whatever happens to be sitting
// underneath on the native stack (and can be stale after a logout
// or role switch — see Sidebar.tsx's logout handler).
const ROLE_HOME: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  guidance: "/guidance-dashboard",
};

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getStudentDetail(Number(id));
        setData(res);
      } catch (err: any) {
        Toast.show({
          type: "error",
          text1: "Failed to load student",
          text2: err.response?.data?.message ?? "Please try again.",
        });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const goToDashboard = () => {
    router.replace((ROLE_HOME[user?.role ?? "guidance"] ?? "/") as any);
  };

  if (loading || !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading student details"
        />
      </SafeAreaView>
    );
  }

  const { student, attendance, transcripts } = data;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        <TouchableOpacity
          onPress={goToDashboard}
          style={[styles.backBtn, { marginBottom: spacing.md }]}
          accessibilityRole="button"
          accessibilityLabel="Back to dashboard"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: colors.primary,
              fontWeight: "600",
              fontSize: typography.body.fontSize,
              marginLeft: 6,
            }}
          >
            Back to Dashboard
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.secondaryBackground,
              borderRadius: radius.lg,
              borderColor: colors.border,
              paddingVertical: spacing.xl,
              marginBottom: spacing.lg,
            },
          ]}
          accessibilityLabel={`${student.name}, ${student.email}${
            student.disabilityTypes.length > 0
              ? `, tags: ${student.disabilityTypes.join(", ")}`
              : ", no profile submitted"
          }`}
        >
          <View
            style={[
              styles.avatar,
              { borderRadius: radius.round, backgroundColor: colors.primary, marginBottom: spacing.sm },
            ]}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontWeight: "700",
                fontFamily: typography.h2.fontFamily,
                fontSize: typography.h2.fontSize,
              }}
            >
              {student.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: colors.text,
            }}
            accessibilityRole="header"
          >
            {student.name}
          </Text>
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 2,
              marginBottom: 12,
            }}
          >
            {student.email}
          </Text>

          <View style={[styles.tagRow, { gap: 6, paddingHorizontal: 16 }]}>
            {student.disabilityTypes.length > 0 ? (
              student.disabilityTypes.map((type) => (
                <View
                  key={type}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: colors.primaryLight + "1A",
                      borderRadius: radius.sm,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
                    {type}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: typography.caption.fontSize, color: colors.placeholder, fontStyle: "italic" }}>
                No profile submitted
              </Text>
            )}
          </View>
        </View>

        {Object.keys(student.accessibilityPreferences).length > 0 && (
          <View style={{ marginBottom: spacing.xl }}>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "700",
                color: colors.text,
                marginBottom: spacing.sm + 2,
              }}
              accessibilityRole="header"
            >
              Accessibility Preferences
            </Text>
            <View style={[styles.prefGrid, { gap: 8 }]}>
              {Object.entries(student.accessibilityPreferences).map(([key, value]) => (
                <View
                  key={key}
                  style={[
                    styles.prefChip,
                    {
                      borderRadius: radius.sm,
                      backgroundColor: value ? colors.success + "1A" : colors.secondaryBackground,
                      borderColor: value ? colors.success : colors.border,
                    },
                  ]}
                  accessibilityLabel={`${key}: ${value ? "on" : "off"}`}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: value ? colors.success : colors.textSecondary,
                    }}
                  >
                    {key} {value ? "✓" : "✕"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ marginBottom: spacing.xl }}>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "700",
              color: colors.text,
              marginBottom: spacing.sm + 2,
            }}
            accessibilityRole="header"
          >
            Session Attendance ({attendance.length})
          </Text>
          {attendance.length === 0 ? (
            <Text style={{ fontSize: typography.caption.fontSize, color: colors.textSecondary, fontStyle: "italic" }}>
              No sessions attended yet.
            </Text>
          ) : (
            attendance.map((a) => (
              <View
                key={`${a.sessionId}-${a.joinedAt}`}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.sm + 2,
                    padding: 12,
                    marginBottom: 8,
                  },
                ]}
                accessibilityLabel={`${a.title}, taught by ${a.teacherName}, status ${a.status}, joined ${new Date(a.joinedAt).toLocaleString()}`}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.body.fontSize,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {a.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    Teacher: {a.teacherName} • Code: {a.sessionCode}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.placeholder, marginTop: 4 }}>
                    Joined: {new Date(a.joinedAt).toLocaleString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      borderRadius: radius.sm,
                      backgroundColor: a.status === "active" ? colors.success + "1A" : colors.secondaryBackground,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: colors.text,
                      textTransform: "capitalize",
                    }}
                  >
                    {a.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "700",
              color: colors.text,
              marginBottom: spacing.sm + 2,
            }}
            accessibilityRole="header"
          >
            Caption Transcript History ({transcripts.length})
          </Text>
          {transcripts.length === 0 ? (
            <Text style={{ fontSize: typography.caption.fontSize, color: colors.textSecondary, fontStyle: "italic" }}>
              No transcripts yet.
            </Text>
          ) : (
            transcripts.map((t) => (
              <View
                key={t.id}
                style={[
                  styles.transcriptRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.sm + 2,
                    padding: 12,
                    marginBottom: 8,
                  },
                ]}
                accessibilityLabel={`Transcript from ${t.sessionTitle}, ${new Date(t.createdAt).toLocaleString()}: ${t.text}`}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary, marginBottom: 4 }}>
                  {t.sessionTitle} • {t.sessionCode}
                </Text>
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.text,
                    lineHeight: 18,
                  }}
                >
                  {t.text}
                </Text>
                <Text style={{ fontSize: 11, color: colors.placeholder, marginTop: 4 }}>
                  {new Date(t.createdAt).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  profileCard: {
    alignItems: "center",
    borderWidth: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  prefGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  prefChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    borderWidth: 1,
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  transcriptRow: {
    borderWidth: 1,
  },
});