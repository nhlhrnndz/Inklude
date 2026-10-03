// app/session/[id]/summary.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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

import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import {
  getPulseSummary,
  getQuietStudents,
  PulseSummary,
  QuietStudent,
  QuietStudentsResponse,
  sendCheckin,
} from "../../../utils/checkinApi";

const TEMPLATES = [
  "Hey, noticed you were quiet today. Everything okay?",
  "Just checking in — let me know if you need anything.",
  "Great to see you in class today.",
];

const MESSAGE_MAX = 500;

export default function SessionSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [data, setData] = useState<QuietStudentsResponse | null>(null);
  const [pulse, setPulse] = useState<PulseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<QuietStudent | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getQuietStudents(Number(id));
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Could not load the summary.");
    } finally {
      setLoading(false);
    }

    try {
      const p = await getPulseSummary(Number(id));
      setPulse(p.summary);
    } catch {
      // The pulse card is optional; ignore failures.
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(`/session/${id}` as any);
  };

  const openComposer = (student: QuietStudent) => {
    setTarget(student);
    setMessage(TEMPLATES[0]);
  };

  const closeComposer = () => {
    if (sending) return;
    setTarget(null);
    setMessage("");
  };

  const handleSend = async () => {
    if (!target || !message.trim()) return;

    setSending(true);
    try {
      await sendCheckin({
        studentId: target.id,
        sessionId: Number(id),
        message: message.trim(),
      });

      setData((prev) =>
        prev
          ? {
              ...prev,
              quietStudents: prev.quietStudents.map((s) =>
                s.id === target.id ? { ...s, checkedIn: true } : s,
              ),
            }
          : prev,
      );

      Toast.show({
        type: "success",
        text1: "Check-in sent",
        text2: `${target.name} will get a notification.`,
      });

      setTarget(null);
      setMessage("");
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not send check-in",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  if (user && user.role !== "teacher") {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <Text
          style={{ color: colors.text, fontFamily: typography.body.fontFamily }}
        >
          Only the session's teacher can view this summary.
        </Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          accessibilityLabel="Loading summary"
        />
      </SafeAreaView>
    );
  }

  const quiet = data?.quietStudents ?? [];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
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
          Session Summary
        </Text>

        {data && (
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.textSecondary,
              marginTop: 4,
              marginBottom: spacing.lg,
            }}
          >
            {data.session.title} • {data.participantCount} joined
          </Text>
        )}

        {error && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.lg,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
              }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Class pulse (aggregate only) */}
        <Text
          style={[
            styles.sectionTitle,
            {
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.text,
              marginBottom: spacing.sm,
            },
          ]}
          accessibilityRole="header"
        >
          Class Pulse
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
            },
          ]}
        >
          {!pulse || pulse.responded === 0 ? (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
              }}
            >
              No answers yet. Students are asked before and after class.
            </Text>
          ) : pulse.hidden || !pulse.counts ? (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
              }}
            >
              {pulse.responded} response{pulse.responded === 1 ? "" : "s"} so
              far. The breakdown appears once at least 5 students answer, to
              keep answers anonymous.
            </Text>
          ) : (
            <View style={styles.pulseRow}>
              {[
                { emoji: "😀", label: "Good", n: pulse.counts.happy },
                { emoji: "😐", label: "Okay", n: pulse.counts.okay },
                { emoji: "😞", label: "Difficult", n: pulse.counts.sad },
              ].map((p) => (
                <View
                  key={p.label}
                  style={styles.pulseItem}
                  accessibilityLabel={`${p.label}: ${p.n}`}
                >
                  <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
                  <Text
                    style={{
                      fontFamily: typography.h2.fontFamily,
                      fontSize: typography.h2.fontSize,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {p.n}
                  </Text>
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize,
                      color: colors.textSecondary,
                    }}
                  >
                    {p.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quiet students */}
        {data && (
          <>
            <Text
              style={[
                styles.sectionTitle,
                {
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                  marginBottom: spacing.sm,
                },
              ]}
              accessibilityRole="header"
            >
              {quiet.length === 0
                ? "Everyone joined in today"
                : `${quiet.length} student${
                    quiet.length === 1 ? " was" : "s were"
                  } quiet today`}
            </Text>

            {quiet.length === 0 ? (
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                }}
              >
                Everyone who joined tapped "I'm here" at least once.
              </Text>
            ) : (
              quiet.map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.studentRow,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.md,
                      marginBottom: spacing.sm,
                    },
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {s.name}
                    </Text>
                    {s.quietStreak > 1 && (
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          color: colors.warning,
                          marginTop: 2,
                        }}
                      >
                        Quiet in the last {s.quietStreak} sessions in a row
                      </Text>
                    )}
                  </View>

                  {s.checkedIn ? (
                    <View style={styles.sentBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={colors.success}
                      />
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          fontWeight: "700",
                          color: colors.success,
                          marginLeft: 4,
                        }}
                      >
                        Checked in
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => openComposer(s)}
                      accessibilityRole="button"
                      accessibilityLabel={`Send check-in to ${s.name}`}
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: radius.sm,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontWeight: "700",
                          color: "#FFFFFF",
                          fontSize: typography.caption.fontSize,
                        }}
                      >
                        Send check-in
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Check-in composer */}
      <Modal
        visible={!!target}
        transparent
        animationType="slide"
        onRequestClose={closeComposer}
      >
        <KeyboardAvoidingView
          style={styles.modalWrap}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                padding: spacing.lg,
              },
            ]}
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
              Check in with {target?.name}
            </Text>

            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 4,
                marginBottom: spacing.sm,
              }}
            >
              Pick a template, then edit it if you like.
            </Text>

            {TEMPLATES.map((t) => {
              const active = message === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setMessage(t)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active
                      ? colors.primaryLight + "1A"
                      : colors.surface,
                    borderRadius: radius.md,
                    padding: spacing.sm + 2,
                    marginBottom: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.caption.fontSize,
                      color: colors.text,
                    }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TextInput
              style={{
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.sm + 2,
                minHeight: 80,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
                marginTop: spacing.xs,
              }}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={MESSAGE_MAX}
              textAlignVertical="top"
              placeholder="Write your message..."
              placeholderTextColor={colors.placeholder}
              accessibilityLabel="Check-in message"
            />

            <View style={[styles.actions, { marginTop: spacing.md, gap: 10 }]}>
              <TouchableOpacity
                onPress={closeComposer}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={{
                  flex: 1,
                  alignItems: "center",
                  padding: spacing.md,
                  borderRadius: radius.md,
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
                onPress={handleSend}
                disabled={sending || !message.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send check-in"
                style={{
                  flex: 1,
                  alignItems: "center",
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: colors.primary,
                  opacity: sending || !message.trim() ? 0.5 : 1,
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontWeight: "700",
                      color: "#FFFFFF",
                    }}
                  >
                    Send
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  sectionTitle: { fontWeight: "700" },
  card: { borderWidth: 1 },
  pulseRow: { flexDirection: "row", justifyContent: "space-around" },
  pulseItem: { alignItems: "center" },
  studentRow: { flexDirection: "row", alignItems: "center", borderWidth: 1 },
  sentBadge: { flexDirection: "row", alignItems: "center" },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  actions: { flexDirection: "row" },
});
