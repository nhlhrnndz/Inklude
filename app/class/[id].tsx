// app/class/[id].tsx — class detail: sessions + people
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
    ClassMember,
    ClassSession,
    ClassSummary,
    createClassSession,
    getClassDetails,
    getClassMembers,
    leaveClass,
} from "../../utils/api";
import { crossAlert } from "../../utils/crossAlert";

type Tab = "sessions" | "people";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function formatSchedule(s: ClassSession) {
  if (!s.scheduledStart) return "Not scheduled";
  const start = new Date(s.scheduledStart);
  let text = start.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  if (s.scheduledEnd) {
    text += ` – ${new Date(s.scheduledEnd).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return text;
}

export default function ClassDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isTeacher = user?.role === "teacher";

  const [cls, setCls] = useState<ClassSummary | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("sessions");

  const [showForm, setShowForm] = useState(false);
  const [sTitle, setSTitle] = useState("");
  const [sDate, setSDate] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [details, mem] = await Promise.all([
        getClassDetails(Number(id)),
        getClassMembers(Number(id)),
      ]);
      setCls(details.class);
      setSessions(details.sessions || []);
      setMembers(mem.members || []);
    } catch (err) {
      console.error("Error loading class:", err);
      setCls(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(isTeacher ? "/my-classes" : "/my-classes");
  };

  const handleCreateSession = async () => {
    const date = sDate.trim();
    const start = sStart.trim();
    const end = sEnd.trim();

    if (date || start || end) {
      if (
        !DATE_RE.test(date) ||
        !TIME_RE.test(start) ||
        (end && !TIME_RE.test(end))
      ) {
        crossAlert(
          "Check the schedule",
          "Use date YYYY-MM-DD (e.g. 2026-10-08) and time HH:MM in 24-hour format (e.g. 08:00). Or leave all three empty to add an unscheduled session.",
        );
        return;
      }
    }

    setCreating(true);
    try {
      await createClassSession(Number(id), {
        title: sTitle.trim() || undefined,
        scheduledStart: date ? `${date} ${start}` : undefined,
        scheduledEnd: date && end ? `${date} ${end}` : undefined,
      });
      setSTitle("");
      setSDate("");
      setSStart("");
      setSEnd("");
      setShowForm(false);
      await load();
    } catch (error: any) {
      crossAlert(
        "Error",
        error.response?.data?.message || "Failed to add session",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleLeave = () => {
    crossAlert(
      "Leave this class?",
      "You can rejoin later with the class code.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveClass(Number(id));
              router.replace("/my-classes" as any);
            } catch {
              crossAlert("Error", "Could not leave the class.");
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!cls) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.text,
            marginBottom: spacing.md,
          }}
        >
          Class not found
        </Text>
        <TouchableOpacity onPress={goBack} accessibilityRole="button">
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: colors.primary,
              fontSize: typography.body.fontSize,
            }}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const inputStyle = {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.text,
  };

  const tabButton = (key: Tab, label: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        tab === key && {
          borderBottomColor: colors.primary,
          borderBottomWidth: 2,
        },
      ]}
      onPress={() => setTab(key)}
      accessibilityRole="tab"
      accessibilityState={{ selected: tab === key }}
    >
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          fontWeight: "700",
          color: tab === key ? colors.primary : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
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
            onPress={goBack}
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

          {/* Banner */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.lg,
            }}
          >
            <Text
              style={{
                fontFamily: typography.h2.fontFamily,
                fontSize: typography.h2.fontSize,
                lineHeight: typography.h2.lineHeight,
                fontWeight: typography.h2.fontWeight,
                color: colors.text,
              }}
              accessibilityRole="header"
            >
              {cls.title}
            </Text>
            {cls.description ? (
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                {cls.description}
              </Text>
            ) : null}
            {!isTeacher && cls.teacherName ? (
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                Teacher: {cls.teacherName}
              </Text>
            ) : null}

            <View style={[styles.bannerMeta, { marginTop: spacing.md }]}>
              <View>
                <Text
                  style={[styles.metaLabel, { color: colors.textSecondary }]}
                >
                  Class code
                </Text>
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    color: colors.primary,
                    fontSize: 22,
                    fontWeight: "700",
                    letterSpacing: 2,
                  }}
                  selectable
                >
                  {cls.code}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[styles.metaLabel, { color: colors.textSecondary }]}
                >
                  Students
                </Text>
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    color: colors.text,
                    fontSize: 22,
                    fontWeight: "700",
                  }}
                >
                  {cls.memberCount}
                </Text>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View
            style={[
              styles.tabBar,
              { borderColor: colors.border, marginBottom: spacing.md },
            ]}
          >
            {tabButton("sessions", `Sessions (${sessions.length})`)}
            {tabButton("people", `People (${members.length})`)}
          </View>

          {/* Sessions tab */}
          {tab === "sessions" && (
            <View>
              {isTeacher && (
                <View style={{ marginBottom: spacing.lg }}>
                  {!showForm ? (
                    <TouchableOpacity
                      onPress={() => setShowForm(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Add a session"
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        alignItems: "center",
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
                        + Add Session
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: radius.md,
                        padding: spacing.md,
                      }}
                    >
                      <TextInput
                        style={inputStyle}
                        value={sTitle}
                        onChangeText={setSTitle}
                        placeholder="Session title (optional)"
                        placeholderTextColor={colors.placeholder}
                        accessibilityLabel="Session title"
                      />
                      <TextInput
                        style={inputStyle}
                        value={sDate}
                        onChangeText={setSDate}
                        placeholder="Date YYYY-MM-DD (optional)"
                        placeholderTextColor={colors.placeholder}
                        autoCapitalize="none"
                        accessibilityLabel="Session date"
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TextInput
                          style={[inputStyle, { flex: 1 }]}
                          value={sStart}
                          onChangeText={setSStart}
                          placeholder="Start HH:MM"
                          placeholderTextColor={colors.placeholder}
                          autoCapitalize="none"
                          accessibilityLabel="Start time"
                        />
                        <TextInput
                          style={[inputStyle, { flex: 1 }]}
                          value={sEnd}
                          onChangeText={setSEnd}
                          placeholder="End HH:MM"
                          placeholderTextColor={colors.placeholder}
                          autoCapitalize="none"
                          accessibilityLabel="End time"
                        />
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => setShowForm(false)}
                          disabled={creating}
                          accessibilityRole="button"
                          style={{
                            flex: 1,
                            alignItems: "center",
                            padding: spacing.sm + 2,
                            borderRadius: radius.sm,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: typography.body.fontFamily,
                              fontWeight: "700",
                              color: colors.textSecondary,
                            }}
                          >
                            Cancel
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleCreateSession}
                          disabled={creating}
                          accessibilityRole="button"
                          style={{
                            flex: 1,
                            alignItems: "center",
                            padding: spacing.sm + 2,
                            borderRadius: radius.sm,
                            backgroundColor: colors.primary,
                            opacity: creating ? 0.6 : 1,
                          }}
                        >
                          {creating ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Text
                              style={{
                                fontFamily: typography.body.fontFamily,
                                fontWeight: "700",
                                color: "#FFFFFF",
                              }}
                            >
                              Add
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {sessions.length === 0 ? (
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  {isTeacher
                    ? "No sessions yet. Add one for your next meeting."
                    : "No sessions yet. Your teacher will add one soon."}
                </Text>
              ) : (
                sessions.map((s) => {
                  const ended = s.status === "ended";
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => router.push(`/session/${s.id}` as any)}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.title}, ${formatSchedule(s)}, ${
                        ended ? "ended" : s.isLive ? "live" : "open"
                      }`}
                      style={{
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: radius.md,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                        opacity: ended ? 0.8 : 1,
                      }}
                    >
                      <View style={styles.sessionHeader}>
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: typography.body.fontFamily,
                            fontSize: 16,
                            fontWeight: "600",
                            color: colors.text,
                          }}
                          numberOfLines={1}
                        >
                          {s.title}
                        </Text>
                        <View
                          style={{
                            backgroundColor: ended
                              ? colors.disabled
                              : s.isLive
                                ? colors.success
                                : colors.primary,
                            borderRadius: radius.sm,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            marginLeft: 8,
                          }}
                        >
                          <Text style={styles.badgeText}>
                            {ended ? "ENDED" : s.isLive ? "● LIVE" : "OPEN"}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          color: colors.textSecondary,
                          marginTop: 4,
                        }}
                      >
                        {formatSchedule(s)} · {s.participantCount} present
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* People tab */}
          {tab === "people" && (
            <View>
              {members.length === 0 ? (
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  No students have joined this class yet.
                </Text>
              ) : (
                members.map((m) => (
                  <View
                    key={m.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: m.avatarColor,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: spacing.md,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                        {m.initials}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: typography.body.fontSize,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {m.displayName}
                        {m.id === user?.id ? " (You)" : ""}
                      </Text>
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          color: colors.textSecondary,
                        }}
                      >
                        Joined {new Date(m.joinedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {!isTeacher && (
            <TouchableOpacity
              onPress={handleLeave}
              accessibilityRole="button"
              accessibilityLabel="Leave class"
              style={{
                backgroundColor: colors.disabled,
                borderRadius: radius.md,
                padding: spacing.md,
                alignItems: "center",
                marginTop: spacing.xl,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
                Leave Class
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  bannerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 20 },
  sessionHeader: { flexDirection: "row", alignItems: "center" },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
});
