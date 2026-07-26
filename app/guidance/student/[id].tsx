import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

import Colors from "../../../theme/colors";
import Typography from "../../../theme/typography";
import { getStudentDetail } from "../../../utils/api";

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

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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

  if (loading || !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  const { student, attendance, transcripts } = data;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back to Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {student.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.email}>{student.email}</Text>

          <View style={styles.tagRow}>
            {student.disabilityTypes.length > 0 ? (
              student.disabilityTypes.map((type) => (
                <View key={type} style={styles.tag}>
                  <Text style={styles.tagText}>{type}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noProfileText}>No profile submitted</Text>
            )}
          </View>
        </View>

        {Object.keys(student.accessibilityPreferences).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accessibility Preferences</Text>
            <View style={styles.prefGrid}>
              {Object.entries(student.accessibilityPreferences).map(
                ([key, value]) => (
                  <View
                    key={key}
                    style={[
                      styles.prefChip,
                      value ? styles.prefChipOn : styles.prefChipOff,
                    ]}
                  >
                    <Text
                      style={[
                        styles.prefChipText,
                        value ? styles.prefChipTextOn : styles.prefChipTextOff,
                      ]}
                    >
                      {key} {value ? "✓" : "✕"}
                    </Text>
                  </View>
                ),
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Session Attendance ({attendance.length})
          </Text>
          {attendance.length === 0 ? (
            <Text style={styles.emptyText}>No sessions attended yet.</Text>
          ) : (
            attendance.map((a) => (
              <View key={`${a.sessionId}-${a.joinedAt}`} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{a.title}</Text>
                  <Text style={styles.rowSubtitle}>
                    Teacher: {a.teacherName} • Code: {a.sessionCode}
                  </Text>
                  <Text style={styles.rowMeta}>
                    Joined: {new Date(a.joinedAt).toLocaleString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    a.status === "active"
                      ? styles.statusActive
                      : styles.statusEnded,
                  ]}
                >
                  <Text style={styles.statusText}>{a.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Caption Transcript History ({transcripts.length})
          </Text>
          {transcripts.length === 0 ? (
            <Text style={styles.emptyText}>No transcripts yet.</Text>
          ) : (
            transcripts.map((t) => (
              <View key={t.id} style={styles.transcriptRow}>
                <Text style={styles.transcriptSession}>
                  {t.sessionTitle} • {t.sessionCode}
                </Text>
                <Text style={styles.transcriptText}>{t.text}</Text>
                <Text style={styles.rowMeta}>
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
    backgroundColor: Colors.background,
  },
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    color: Colors.primary,
    fontWeight: "600",
    fontSize: Typography.body,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 16,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: Typography.h2,
  },
  name: {
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.text,
  },
  email: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  tag: {
    backgroundColor: "#FFF5F5",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  noProfileText: {
    fontSize: Typography.caption,
    color: Colors.placeholder,
    fontStyle: "italic",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: Typography.body,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 10,
  },
  prefGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  prefChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  prefChipOn: {
    backgroundColor: "#F0FDF4",
    borderColor: Colors.success,
  },
  prefChipOff: {
    backgroundColor: Colors.secondaryBackground,
    borderColor: Colors.border,
  },
  prefChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  prefChipTextOn: {
    color: Colors.success,
  },
  prefChipTextOff: {
    color: Colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  rowTitle: {
    fontSize: Typography.body,
    fontWeight: "600",
    color: Colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  rowMeta: {
    fontSize: 11,
    color: Colors.placeholder,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: "#F0FDF4",
  },
  statusEnded: {
    backgroundColor: Colors.secondaryBackground,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
    textTransform: "capitalize",
  },
  transcriptRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  transcriptSession: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: Typography.caption,
    color: Colors.text,
    lineHeight: 18,
  },
  emptyText: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
});
