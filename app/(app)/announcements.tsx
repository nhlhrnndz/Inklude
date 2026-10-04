// app/(app)/announcements.tsx
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
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

import {
  DateField,
  TimeField,
  todayString,
} from "../../components/DateTimePicker";
import { COLLEGES } from "../../constants/courses";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  getMyAnnouncements,
  getMySessions,
  postAnnouncement,
} from "../../utils/api";

const TITLE_MAX = 150;
const BODY_MAX = 2000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

type Session = {
  id: number;
  code: string;
  title: string;
  status: "active" | "ended";
};

type Announcement = {
  id: number;
  audience: "session" | "all_students" | "college";
  audienceLabel: string | null;
  sessionId: number | null;
  sessionTitle: string | null;
  title: string;
  body: string;
  deadline: string | null;
  createdAt: string;
};

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isTeacher = user?.role === "teacher";
  const canPost = isTeacher || user?.role === "guidance";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("");
  const [audienceMode, setAudienceMode] = useState<"all" | "college">("all");
  const [selectedColleges, setSelectedColleges] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [history, setHistory] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [annRes, sessRes] = await Promise.all([
        getMyAnnouncements(),
        isTeacher ? getMySessions() : Promise.resolve(null),
      ]);

      setHistory(annRes.announcements ?? []);

      if (sessRes) {
        // Active sessions first, keep newest-first order within each group
        const list: Session[] = [...(sessRes.sessions ?? [])].sort((a, b) =>
          a.status === b.status ? 0 : a.status === "active" ? -1 : 1,
        );
        setSessions(list);
        setSelectedSessionId((prev) => prev ?? list[0]?.id ?? null);
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Failed to load announcements",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }, [isTeacher]);

  useEffect(() => {
    if (canPost) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [canPost, loadData]);

  const handlePost = async () => {
    if (!title.trim() || !body.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing details",
        text2: "Please enter both a title and a message.",
      });
      return;
    }
    if (isTeacher && !selectedSessionId) {
      Toast.show({
        type: "error",
        text1: "Choose a session",
        text2: "Select which session this announcement is for.",
      });
      return;
    }

    if (
      !isTeacher &&
      audienceMode === "college" &&
      selectedColleges.length === 0
    ) {
      Toast.show({
        type: "error",
        text1: "Choose a college",
        text2: "Pick at least one college, or switch to All students.",
      });
      return;
    }

    // Deadline is optional, but if one half is filled the other is needed.
    let deadline: string | undefined;
    if (deadlineDate || deadlineTime) {
      if (!DATE_RE.test(deadlineDate) || !TIME_RE.test(deadlineTime)) {
        Toast.show({
          type: "error",
          text1: "Check the deadline",
          text2: "Pick both a date and a time, or clear them.",
        });
        return;
      }
      deadline = `${deadlineDate} ${deadlineTime}`;
    }

    setPosting(true);
    try {
      const res = await postAnnouncement({
        title: title.trim(),
        body: body.trim(),
        sessionId: isTeacher ? (selectedSessionId ?? undefined) : undefined,
        deadline,
        ...(!isTeacher && audienceMode === "college"
          ? {
              audience: "college",
              colleges: selectedColleges,
              courses: COLLEGES.filter((c) =>
                selectedColleges.includes(c.code),
              ).flatMap((c) => c.courses),
            }
          : {}),
      } as any);

      const count: number = res.recipientCount ?? 0;
      Toast.show({
        type: "success",
        text1: "Announcement posted",
        text2:
          count === 0
            ? isTeacher
              ? "No students have joined this session yet."
              : "No students match that audience yet."
            : `Sent to ${count} student${count === 1 ? "" : "s"}${
                deadline ? " and added to their calendars." : "."
              }`,
      });

      setTitle("");
      setBody("");
      setDeadlineDate("");
      setDeadlineTime("");

      const annRes = await getMyAnnouncements();
      setHistory(annRes.announcements ?? []);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not post announcement",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setPosting(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.secondaryBackground,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontFamily: typography.body.fontFamily,
      fontSize: typography.body.fontSize,
      color: colors.text,
    },
  ];

  const labelStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: "700" as const,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: spacing.md,
  };

  if (!canPost) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
        edges={["left", "right", "bottom"]}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
            textAlign: "center",
            padding: spacing.lg,
          }}
        >
          Only teachers and guidance counselors can post announcements.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: colors.text,
            }}
            accessibilityRole="header"
          >
            Post Announcement
          </Text>

          {isTeacher ? (
            <>
              <Text style={labelStyle}>SEND TO STUDENTS IN</Text>
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : sessions.length === 0 ? (
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  Create a session first, then you can post announcements to it.
                </Text>
              ) : (
                <View style={[styles.chipRow, { gap: spacing.sm }]}>
                  {sessions.map((s) => {
                    const selected = s.id === selectedSessionId;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setSelectedSessionId(s.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${s.title}, code ${s.code}, ${s.status === "active" ? "live" : "ended"}`}
                        accessibilityState={{ selected }}
                        style={[
                          styles.chip,
                          {
                            borderColor: selected
                              ? colors.primary
                              : colors.border,
                            backgroundColor: selected
                              ? colors.primary
                              : colors.surface,
                            borderRadius: radius.md,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontFamily: typography.body.fontFamily,
                            fontSize: typography.caption.fontSize,
                            fontWeight: "700",
                            color: selected ? "#FFFFFF" : colors.text,
                          }}
                        >
                          {s.title}
                        </Text>
                        <Text
                          style={{
                            fontFamily: typography.caption.fontFamily,
                            fontSize: 11,
                            color: selected ? "#FFFFFF" : colors.textSecondary,
                            marginTop: 2,
                          }}
                        >
                          #{s.code} · {s.status === "active" ? "Live" : "Ended"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <View
              style={[
                styles.infoBox,
                {
                  backgroundColor: colors.primaryLight + "1A",
                  borderColor: colors.primary,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginTop: spacing.md,
                },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.primary}
              />
              <Text
                style={{
                  flex: 1,
                  marginLeft: spacing.sm,
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.text,
                }}
              >
                {audienceMode === "all"
                  ? "This announcement will be sent to all students."
                  : selectedColleges.length === 0
                    ? "Choose which colleges should receive this."
                    : `This announcement will go to students in: ${selectedColleges.join(", ")}.`}
              </Text>
            </View>
          )}

          {!isTeacher && (
            <>
              <Text style={labelStyle}>AUDIENCE</Text>
              <View style={[styles.chipRow, { gap: spacing.sm }]}>
                {(
                  [
                    { key: "all", label: "All students" },
                    { key: "college", label: "By college" },
                  ] as const
                ).map((opt) => {
                  const selected = audienceMode === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setAudienceMode(opt.key)}
                      accessibilityRole="button"
                      accessibilityLabel={opt.label}
                      accessibilityState={{ selected }}
                      style={[
                        styles.chip,
                        {
                          minHeight: 44,
                          justifyContent: "center",
                          borderColor: selected
                            ? colors.primary
                            : colors.border,
                          backgroundColor: selected
                            ? colors.primary
                            : colors.surface,
                          borderRadius: radius.md,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: typography.caption.fontSize,
                          fontWeight: "700",
                          color: selected ? "#FFFFFF" : colors.text,
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {audienceMode === "college" && (
                <View
                  style={[
                    styles.chipRow,
                    { gap: spacing.sm, marginTop: spacing.sm },
                  ]}
                >
                  {COLLEGES.map((college) => {
                    const selected = selectedColleges.includes(college.code);
                    return (
                      <TouchableOpacity
                        key={college.code}
                        onPress={() =>
                          setSelectedColleges((prev) =>
                            prev.includes(college.code)
                              ? prev.filter((c) => c !== college.code)
                              : [...prev, college.code],
                          )
                        }
                        accessibilityRole="checkbox"
                        accessibilityLabel={college.code}
                        accessibilityState={{ checked: selected }}
                        style={[
                          styles.chip,
                          {
                            minHeight: 44,
                            justifyContent: "center",
                            borderColor: selected
                              ? colors.primary
                              : colors.border,
                            backgroundColor: selected
                              ? colors.primary
                              : colors.surface,
                            borderRadius: radius.md,
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontFamily: typography.body.fontFamily,
                            fontSize: typography.caption.fontSize,
                            fontWeight: "700",
                            color: selected ? "#FFFFFF" : colors.text,
                          }}
                        >
                          {college.code}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          <Text style={labelStyle}>TITLE</Text>
          <TextInput
            style={inputStyle}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Quiz moved to Friday"
            placeholderTextColor={colors.placeholder}
            maxLength={TITLE_MAX}
            accessibilityLabel="Announcement title"
          />

          <Text style={labelStyle}>MESSAGE</Text>
          <TextInput
            style={[inputStyle, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder="Write your announcement..."
            placeholderTextColor={colors.placeholder}
            multiline
            maxLength={BODY_MAX}
            textAlignVertical="top"
            accessibilityLabel="Announcement message"
          />
          <Text
            style={{
              alignSelf: "flex-end",
              marginTop: 4,
              fontFamily: typography.caption.fontFamily,
              fontSize: 11,
              color: colors.placeholder,
            }}
          >
            {body.length}/{BODY_MAX}
          </Text>

          <Text style={labelStyle}>DEADLINE (OPTIONAL)</Text>
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: 11,
              color: colors.textSecondary,
              marginBottom: spacing.sm,
            }}
          >
            If you set one, it appears on every recipient's calendar.
          </Text>
          <DateField
            value={deadlineDate}
            onChange={setDeadlineDate}
            label="Deadline date"
            placeholder="Pick a date (optional)"
            minDate={todayString()}
          />
          <TimeField
            value={deadlineTime}
            onChange={setDeadlineTime}
            label="Deadline time"
            placeholder="Pick a time (optional)"
          />
          {!!(deadlineDate || deadlineTime) && (
            <TouchableOpacity
              onPress={() => {
                setDeadlineDate("");
                setDeadlineTime("");
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear deadline"
              style={{
                alignSelf: "flex-start",
                minHeight: 44,
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                Clear deadline
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handlePost}
            disabled={posting}
            accessibilityRole="button"
            accessibilityLabel="Post announcement"
            accessibilityState={{ disabled: posting }}
            style={[
              styles.postButton,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.md,
                paddingVertical: spacing.md,
                marginTop: spacing.md,
                opacity: posting ? 0.6 : 1,
              },
            ]}
          >
            {posting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="megaphone-outline" size={20} color="#FFFFFF" />
                <Text
                  style={{
                    marginLeft: spacing.sm,
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    fontWeight: "700",
                    color: "#FFFFFF",
                  }}
                >
                  Post Announcement
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              marginTop: spacing.xl,
              marginBottom: spacing.md,
            }}
            accessibilityRole="header"
          >
            Recent Announcements
          </Text>

          {!loading && history.length === 0 && (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
              }}
            >
              You haven't posted any announcements yet.
            </Text>
          )}

          {history.map((a) => (
            <View
              key={a.id}
              style={[
                styles.historyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {a.title}
              </Text>
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: 11,
                  color: colors.primary,
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                {a.audience === "all_students"
                  ? "All students"
                  : a.audience === "college"
                    ? `Colleges: ${a.audienceLabel ?? ""}`
                    : (a.sessionTitle ?? "Session")}{" "}
                · {new Date(a.createdAt).toLocaleString()}
              </Text>
              {a.deadline ? (
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: 11,
                    fontWeight: "700",
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Deadline: {new Date(a.deadline).toLocaleString()}
                </Text>
              ) : null}
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: 6,
                }}
                numberOfLines={3}
              >
                {a.body}
              </Text>
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  chip: {
    borderWidth: 1,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
  },
  bodyInput: {
    minHeight: 140,
  },
  postButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  historyCard: {
    borderWidth: 1,
  },
});
