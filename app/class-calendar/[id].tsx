// app/class-calendar/[id].tsx
//
// Teacher: post exams and assignments for a class. Each post lands on every
// enrolled student's calendar and sends them a notification.
// Open it with: router.push(`/class-calendar/${classId}` as any)

import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { crossAlert } from "../../utils/crossAlert";
import {
    ClassPost,
    createClassPost,
    deleteClassPost,
    getClassPosts,
} from "../../utils/scheduleApi";

type PostType = "exam" | "assignment";

const pad = (n: number) => String(n).padStart(2, "0");

// Accepts "8:30 AM", "8:30am", "14:00", "9 pm"
function parseTime(input: string): { h: number; m: number } | null {
  const s = input.trim().toLowerCase().replace(/\./g, "");
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (m > 59) return null;

  if (meridiem) {
    if (h < 1 || h > 12) return null;
    if (meridiem === "pm" && h < 12) h += 12;
    if (meridiem === "am" && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }

  return { h, m };
}

// "2026-10-15" -> a real calendar date, or null
function parseDate(input: string): { y: number; mo: number; d: number } | null {
  const m = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const check = new Date(y, mo - 1, d);
  if (
    check.getFullYear() !== y ||
    check.getMonth() !== mo - 1 ||
    check.getDate() !== d
  ) {
    return null;
  }
  return { y, mo, d };
}

function buildLocal(
  date: { y: number; mo: number; d: number },
  time: { h: number; m: number },
) {
  return `${date.y}-${pad(date.mo)}-${pad(date.d)} ${pad(time.h)}:${pad(
    time.m,
  )}:00`;
}

function fmtWhen(iso: string, type: PostType) {
  const d = new Date(iso);
  const day = d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return type === "assignment" ? `Due ${day}, ${time}` : `${day}, ${time}`;
}

export default function ClassCalendarScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const classId = Number(id);
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [posts, setPosts] = useState<ClassPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<PostType>("exam");
  const [title, setTitle] = useState("");
  const [dateText, setDateText] = useState("");
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async () => {
    if (!classId) return;
    try {
      const data = await getClassPosts(classId);
      setPosts(data.posts || []);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not load posts",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handlePost = async () => {
    if (!title.trim()) {
      Toast.show({ type: "error", text1: "Add a title first." });
      return;
    }

    const date = parseDate(dateText);
    if (!date) {
      Toast.show({
        type: "error",
        text1: "Check the date",
        text2: "Use the format YYYY-MM-DD, like 2026-10-15.",
      });
      return;
    }

    const start = parseTime(startText);
    if (!start) {
      Toast.show({
        type: "error",
        text1: type === "exam" ? "Check the start time" : "Check the due time",
        text2: 'Use a format like "8:30 AM" or "14:00".',
      });
      return;
    }

    let endTime: string | undefined;
    if (type === "exam") {
      const end = parseTime(endText);
      if (!end) {
        Toast.show({
          type: "error",
          text1: "Check the end time",
          text2: 'Use a format like "10:00 AM" or "16:00".',
        });
        return;
      }
      if (end.h * 60 + end.m <= start.h * 60 + start.m) {
        Toast.show({
          type: "error",
          text1: "End time must be after the start time.",
        });
        return;
      }
      endTime = buildLocal(date, end);
    }

    const startTime = buildLocal(date, start);
    if (new Date(startTime.replace(" ", "T")).getTime() <= Date.now()) {
      Toast.show({ type: "error", text1: "Choose a time in the future." });
      return;
    }

    setSaving(true);
    try {
      const res = await createClassPost(classId, {
        type,
        title: title.trim(),
        startTime,
        endTime,
        location: type === "exam" ? location.trim() || undefined : undefined,
      });

      Toast.show({
        type: "success",
        text1: `${type === "exam" ? "Exam" : "Assignment"} posted`,
        text2:
          res.recipientCount === 0
            ? "No students have joined this class yet. They'll get it when they join."
            : `Added to ${res.recipientCount} student${
                res.recipientCount === 1 ? "" : "s"
              }' calendars.`,
      });

      setTitle("");
      setDateText("");
      setStartText("");
      setEndText("");
      setLocation("");
      load();
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not post",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (post: ClassPost) => {
    crossAlert(
      `Remove this ${post.type}?`,
      `"${post.title}" will be removed from every student's calendar.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteClassPost(post.id);
              load();
            } catch (err: any) {
              Toast.show({
                type: "error",
                text1: "Could not remove it",
                text2: err.response?.data?.message ?? "Please try again.",
              });
            }
          },
        },
      ],
    );
  };

  const inputStyle = {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.text,
    minHeight: 48,
  } as const;

  const labelStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.xs,
  };

  const typeChip = (label: string, value: PostType) => {
    const selected = type === value;
    return (
      <TouchableOpacity
        key={value}
        onPress={() => setType(value)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={{
          flex: 1,
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected
            ? colors.primary
            : colors.secondaryBackground,
        }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: selected ? "#FFFFFF" : colors.text,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (user && user.role !== "teacher") {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            textAlign: "center",
            padding: spacing.lg,
          }}
        >
          Only teachers can post exams and assignments.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: spacing.xxl,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: spacing.md }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.primary,
                fontWeight: "600",
                marginLeft: spacing.sm,
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
            Exams & assignments
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginBottom: spacing.lg,
            }}
          >
            Posts appear on every enrolled student's calendar and send them a
            notification.
          </Text>

          {/* Form */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: spacing.lg,
              marginBottom: spacing.xl,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                gap: spacing.sm,
                marginBottom: spacing.sm,
              }}
            >
              {typeChip("Exam", "exam")}
              {typeChip("Assignment", "assignment")}
            </View>

            <Text style={labelStyle}>Title *</Text>
            <TextInput
              style={inputStyle}
              value={title}
              onChangeText={setTitle}
              placeholder={
                type === "exam" ? "e.g. Midterm exam" : "e.g. Project proposal"
              }
              placeholderTextColor={colors.placeholder}
              maxLength={150}
              accessibilityLabel="Title"
            />

            <Text style={labelStyle}>Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={inputStyle}
              value={dateText}
              onChangeText={setDateText}
              placeholder="2026-10-15"
              placeholderTextColor={colors.placeholder}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              accessibilityLabel="Date"
            />

            {type === "exam" ? (
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>Starts *</Text>
                  <TextInput
                    style={inputStyle}
                    value={startText}
                    onChangeText={setStartText}
                    placeholder="8:00 AM"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="characters"
                    accessibilityLabel="Start time"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>Ends *</Text>
                  <TextInput
                    style={inputStyle}
                    value={endText}
                    onChangeText={setEndText}
                    placeholder="10:00 AM"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="characters"
                    accessibilityLabel="End time"
                  />
                </View>
              </View>
            ) : (
              <>
                <Text style={labelStyle}>Due time *</Text>
                <TextInput
                  style={inputStyle}
                  value={startText}
                  onChangeText={setStartText}
                  placeholder="11:59 PM"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="characters"
                  accessibilityLabel="Due time"
                />
              </>
            )}

            {type === "exam" && (
              <>
                <Text style={labelStyle}>Room (optional)</Text>
                <TextInput
                  style={inputStyle}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Room 204"
                  placeholderTextColor={colors.placeholder}
                  maxLength={150}
                  accessibilityLabel="Room"
                />
              </>
            )}

            <TouchableOpacity
              onPress={handlePost}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={`Post ${type}`}
              style={{
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: 14,
                minHeight: 52,
                alignItems: "center",
                justifyContent: "center",
                marginTop: spacing.sm,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontFamily: typography.button.fontFamily,
                    fontSize: typography.button.fontSize,
                    fontWeight: "700",
                  }}
                >
                  Post {type === "exam" ? "exam" : "assignment"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Existing posts */}
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
            Posted so far
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : posts.length === 0 ? (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
              }}
            >
              Nothing posted yet.
            </Text>
          ) : (
            posts.map((p) => {
              const past = new Date(p.endTime).getTime() < Date.now();
              return (
                <View
                  key={p.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    marginBottom: spacing.sm,
                    opacity: past ? 0.6 : 1,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: 11,
                        fontWeight: "700",
                        color:
                          p.type === "exam" ? colors.error : colors.primary,
                      }}
                    >
                      {p.type === "exam" ? "EXAM" : "ASSIGNMENT"}
                      {past ? " · PAST" : ""}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        fontWeight: "700",
                        color: colors.text,
                        marginTop: 2,
                      }}
                    >
                      {p.title}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {fmtWhen(p.startTime, p.type)}
                      {p.location ? ` · ${p.location}` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(p)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${p.title}`}
                    hitSlop={8}
                    style={{
                      width: 44,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={22}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    alignSelf: "flex-start",
  },
});
