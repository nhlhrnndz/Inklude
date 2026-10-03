// app/class/[id].tsx — class detail: sessions + people + support + experience
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

import ClassExperienceInsights from "../../components/ClassExperienceInsights";
import ClassPulse from "../../components/ClassPulse";
import {
  DateField,
  TimeField,
  todayString,
} from "../../components/DateTimePicker";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  ACCOMMODATION_TYPE_OPTIONS,
  AccommodationDecision,
  AccommodationRequest,
  AccommodationStatus,
  AccommodationType,
  ClassMember,
  ClassSession,
  ClassSummary,
  cancelAccommodationRequest,
  createAccommodationRequest,
  createClassSession,
  getClassAccommodationRequests,
  getClassDetails,
  getClassMembers,
  getMyAccommodationRequests,
  leaveClass,
  respondToAccommodationRequest,
} from "../../utils/api";
import { crossAlert } from "../../utils/crossAlert";

type Tab = "sessions" | "people" | "support" | "experience";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const NOTE_MAX = 300;
const REASON_MAX = 200;

const STATUS_LABEL: Record<AccommodationStatus, string> = {
  pending: "PENDING",
  approved: "APPROVED",
  declined: "DECLINED",
  discuss: "LET'S TALK",
  cancelled: "WITHDRAWN",
};

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
  const { id, tab: tabParam } = useLocalSearchParams<{
    id: string;
    tab?: string;
  }>();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isTeacher = user?.role === "teacher";

  const [cls, setCls] = useState<ClassSummary | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>(
    tabParam === "support" ? "support" : "sessions",
  );

  // A notification can open this screen straight on the support tab.
  useEffect(() => {
    if (tabParam === "support") setTab("support");
  }, [tabParam]);

  const [showForm, setShowForm] = useState(false);
  const [sTitle, setSTitle] = useState("");
  const [sDate, setSDate] = useState("");
  const [sStart, setSStart] = useState("");
  const [sEnd, setSEnd] = useState("");
  const [creating, setCreating] = useState(false);

  // Accommodation requests
  const [requests, setRequests] = useState<AccommodationRequest[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState<AccommodationType | null>(null);
  const [reqNote, setReqNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      if (isTeacher) {
        const data = await getClassAccommodationRequests(Number(id));
        setRequests(data.requests || []);
      } else {
        const data = await getMyAccommodationRequests(Number(id));
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Error loading accommodation requests:", err);
    }
  }, [id, isTeacher]);

  const load = useCallback(async () => {
    try {
      const [details, mem] = await Promise.all([
        getClassDetails(Number(id)),
        getClassMembers(Number(id)),
      ]);
      setCls(details.class);
      setSessions(details.sessions || []);
      setMembers(mem.members || []);
      // Requests load on their own so a failure here never hides the class.
      await loadRequests();
    } catch (err) {
      console.error("Error loading class:", err);
      setCls(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, loadRequests]);

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
    router.replace("/my-classes");
  };

  const handleCreateSession = async () => {
    const date = sDate.trim();
    const start = sStart.trim();
    const end = sEnd.trim();

    if (date || start || end) {
      if (!DATE_RE.test(date) || !TIME_RE.test(start)) {
        crossAlert(
          "Check the schedule",
          "Pick a date and a start time. Or leave all three empty to add an unscheduled session.",
        );
        return;
      }
      if (end && !TIME_RE.test(end)) {
        crossAlert("Check the schedule", "Pick a valid end time.");
        return;
      }
      if (end && end <= start) {
        crossAlert(
          "Check the schedule",
          "The end time must be later than the start time.",
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

  // ---- Student: send / withdraw a request ----
  const handleSubmitRequest = async () => {
    if (!reqType) {
      crossAlert("Choose one", "Pick the kind of support you need first.");
      return;
    }
    setSubmitting(true);
    try {
      await createAccommodationRequest(Number(id), {
        type: reqType,
        note: reqNote.trim() || undefined,
      });
      setReqType(null);
      setReqNote("");
      setShowRequestForm(false);
      await loadRequests();
      crossAlert("Request sent", "Your teacher has been notified.");
    } catch (error: any) {
      crossAlert(
        "Could not send",
        error.response?.data?.message || "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = (r: AccommodationRequest) => {
    crossAlert(
      "Withdraw this request?",
      `${r.typeLabel} — your teacher will no longer see it as open.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelAccommodationRequest(r.id);
              await loadRequests();
            } catch (error: any) {
              crossAlert(
                "Error",
                error.response?.data?.message || "Could not withdraw.",
              );
            }
          },
        },
      ],
    );
  };

  // ---- Teacher: approve / discuss / decline ----
  const handleRespond = async (
    r: AccommodationRequest,
    decision: AccommodationDecision,
  ) => {
    const reason = (reasons[r.id] || "").trim();
    if (decision !== "approved" && !reason) {
      crossAlert(
        "Add a short reason",
        "Write one line so the student understands your answer.",
      );
      return;
    }
    setRespondingId(r.id);
    try {
      await respondToAccommodationRequest(r.id, {
        decision,
        reason: reason || undefined,
      });
      setReasons((prev) => {
        const next = { ...prev };
        delete next[r.id];
        return next;
      });
      await load();
    } catch (error: any) {
      crossAlert(
        "Could not respond",
        error.response?.data?.message || "Please try again.",
      );
    } finally {
      setRespondingId(null);
    }
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

  const statusColor = (status: AccommodationStatus) => {
    switch (status) {
      case "approved":
        return colors.success;
      case "declined":
        return colors.danger;
      case "discuss":
        return colors.primary;
      default:
        return colors.disabled;
    }
  };

  const statusBadge = (status: AccommodationStatus) => (
    <View
      style={{
        backgroundColor: statusColor(status),
        borderRadius: radius.sm,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
      }}
    >
      <Text style={styles.badgeText}>{STATUS_LABEL[status]}</Text>
    </View>
  );

  const isOpen = (s: AccommodationStatus) => s === "pending" || s === "discuss";

  // Teacher: open requests first, then the answered ones.
  const sortedRequests = [...requests].sort((a, b) => {
    const ao = isOpen(a.status) ? 0 : 1;
    const bo = isOpen(b.status) ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  const supportLabel = isTeacher
    ? `Requests (${pendingCount})`
    : `Support${requests.some((r) => isOpen(r.status)) ? " •" : ""}`;

  const requestCardStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  };

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

          {/* Class Experience check-in (students). Shows itself only when the
              server says a before/after check-in is due; otherwise renders
              nothing. */}
          {!isTeacher && (
            <ClassPulse
              classId={id}
              containerStyle={{ marginBottom: spacing.lg }}
            />
          )}

          {/* Tabs (scroll sideways on narrow screens) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
              flexGrow: 0,
              borderBottomWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing.md,
            }}
          >
            {tabButton("sessions", `Sessions (${sessions.length})`)}
            {tabButton("people", `People (${members.length})`)}
            {tabButton("support", supportLabel)}
            {isTeacher && tabButton("experience", "Experience")}
          </ScrollView>

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
                      <DateField
                        value={sDate}
                        onChange={setSDate}
                        label="Session date"
                        placeholder="Pick a date (optional)"
                        minDate={todayString()}
                      />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TimeField
                          style={{ flex: 1 }}
                          value={sStart}
                          onChange={setSStart}
                          label="Start time"
                          placeholder="Start time"
                        />
                        <TimeField
                          style={{ flex: 1 }}
                          value={sEnd}
                          onChange={setSEnd}
                          label="End time"
                          placeholder="End time"
                        />
                      </View>
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: 11,
                          color: colors.textSecondary,
                          marginBottom: spacing.sm,
                        }}
                      >
                        Students are asked how they feel at the start time and
                        again at the end time, so set both.
                      </Text>
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

          {/* Support tab — student: request support. teacher: answer requests */}
          {tab === "support" && !isTeacher && (
            <View>
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginBottom: spacing.md,
                }}
              >
                Ask your teacher for support in this class. Only your teacher
                sees your request. They never see your support needs.
              </Text>

              {!showRequestForm ? (
                <TouchableOpacity
                  onPress={() => setShowRequestForm(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Request support"
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
                    + Request Support
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
                    marginBottom: spacing.lg,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.body.fontSize,
                      fontWeight: "700",
                      color: colors.text,
                      marginBottom: spacing.sm,
                    }}
                  >
                    What kind of support do you need?
                  </Text>

                  <View style={styles.chipWrap}>
                    {ACCOMMODATION_TYPE_OPTIONS.map((opt) => {
                      const selected = reqType === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => setReqType(opt.key)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected }}
                          accessibilityLabel={opt.label}
                          style={{
                            borderWidth: 1,
                            borderColor: selected
                              ? colors.primary
                              : colors.border,
                            backgroundColor: selected
                              ? colors.primary
                              : colors.secondaryBackground,
                            borderRadius: radius.round,
                            paddingVertical: 10,
                            paddingHorizontal: 14,
                            marginRight: 8,
                            marginBottom: 8,
                            minHeight: 44,
                            justifyContent: "center",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: typography.body.fontFamily,
                              fontSize: typography.body.fontSize,
                              fontWeight: "600",
                              color: selected ? "#FFFFFF" : colors.text,
                            }}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    style={[inputStyle, { minHeight: 80 }]}
                    value={reqNote}
                    onChangeText={setReqNote}
                    placeholder="Add a note (optional)"
                    placeholderTextColor={colors.placeholder}
                    multiline
                    maxLength={NOTE_MAX}
                    textAlignVertical="top"
                    accessibilityLabel="Note for your teacher"
                  />
                  <Text
                    style={{
                      alignSelf: "flex-end",
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginBottom: spacing.sm,
                    }}
                  >
                    {reqNote.length}/{NOTE_MAX}
                  </Text>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowRequestForm(false);
                        setReqType(null);
                        setReqNote("");
                      }}
                      disabled={submitting}
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
                      onPress={handleSubmitRequest}
                      disabled={submitting}
                      accessibilityRole="button"
                      accessibilityLabel="Send request"
                      style={{
                        flex: 1,
                        alignItems: "center",
                        padding: spacing.sm + 2,
                        borderRadius: radius.sm,
                        backgroundColor: colors.primary,
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      {submitting ? (
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
              )}

              {requests.length === 0 ? (
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  You haven't asked for any support in this class yet.
                </Text>
              ) : (
                requests.map((r) => (
                  <View key={r.id} style={requestCardStyle}>
                    <View style={styles.sessionHeader}>
                      <Text
                        style={{
                          flex: 1,
                          fontFamily: typography.body.fontFamily,
                          fontSize: 16,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        {r.typeLabel}
                      </Text>
                      {statusBadge(r.status)}
                    </View>
                    {r.note ? (
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: typography.body.fontSize,
                          color: colors.text,
                          marginTop: 6,
                        }}
                      >
                        {r.note}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginTop: 4,
                      }}
                    >
                      Sent {new Date(r.createdAt).toLocaleString()}
                    </Text>

                    {r.teacherResponse ? (
                      <View
                        style={{
                          backgroundColor: colors.secondaryBackground,
                          borderRadius: radius.sm,
                          padding: spacing.sm,
                          marginTop: spacing.sm,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: typography.caption.fontFamily,
                            fontSize: 11,
                            color: colors.textSecondary,
                            marginBottom: 2,
                          }}
                        >
                          Your teacher said
                        </Text>
                        <Text
                          style={{
                            fontFamily: typography.body.fontFamily,
                            fontSize: typography.body.fontSize,
                            color: colors.text,
                          }}
                        >
                          {r.teacherResponse}
                        </Text>
                      </View>
                    ) : null}

                    {isOpen(r.status) && (
                      <TouchableOpacity
                        onPress={() => handleCancelRequest(r)}
                        accessibilityRole="button"
                        accessibilityLabel={`Withdraw ${r.typeLabel} request`}
                        style={{
                          alignSelf: "flex-start",
                          marginTop: spacing.sm,
                          minHeight: 44,
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: typography.body.fontFamily,
                            fontWeight: "700",
                            color: colors.danger,
                          }}
                        >
                          Withdraw request
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {tab === "support" && isTeacher && (
            <View>
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginBottom: spacing.md,
                }}
              >
                Students ask for support here. You see the request only, never a
                student's support needs. Your reply is sent to them as a
                notification.
              </Text>

              {sortedRequests.length === 0 ? (
                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  No requests yet.
                </Text>
              ) : (
                sortedRequests.map((r) => {
                  const open = isOpen(r.status);
                  const busy = respondingId === r.id;
                  return (
                    <View
                      key={r.id}
                      style={[
                        requestCardStyle,
                        {
                          opacity: open ? 1 : 0.85,
                          borderColor: open ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.sessionHeader}>
                        <Text
                          style={{
                            flex: 1,
                            fontFamily: typography.body.fontFamily,
                            fontSize: 16,
                            fontWeight: "700",
                            color: colors.text,
                          }}
                        >
                          {r.typeLabel}
                        </Text>
                        {statusBadge(r.status)}
                      </View>
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          color: colors.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        {r.studentName} ·{" "}
                        {new Date(r.createdAt).toLocaleString()}
                      </Text>
                      {r.note ? (
                        <Text
                          style={{
                            fontFamily: typography.body.fontFamily,
                            fontSize: typography.body.fontSize,
                            color: colors.text,
                            marginTop: 6,
                          }}
                        >
                          {r.note}
                        </Text>
                      ) : null}

                      {r.teacherResponse ? (
                        <Text
                          style={{
                            fontFamily: typography.caption.fontFamily,
                            fontSize: typography.caption.fontSize,
                            color: colors.textSecondary,
                            marginTop: 6,
                          }}
                        >
                          Your reply: {r.teacherResponse}
                        </Text>
                      ) : null}

                      {open && (
                        <View style={{ marginTop: spacing.md }}>
                          <TextInput
                            style={inputStyle}
                            value={reasons[r.id] || ""}
                            onChangeText={(text) =>
                              setReasons((prev) => ({ ...prev, [r.id]: text }))
                            }
                            placeholder="One-line reason (needed to decline or discuss)"
                            placeholderTextColor={colors.placeholder}
                            maxLength={REASON_MAX}
                            accessibilityLabel="Reason for your answer"
                          />
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => handleRespond(r, "approved")}
                              disabled={busy}
                              accessibilityRole="button"
                              accessibilityLabel="Approve request"
                              style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 44,
                                borderRadius: radius.sm,
                                backgroundColor: colors.success,
                                opacity: busy ? 0.6 : 1,
                              }}
                            >
                              <Text style={styles.actionText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRespond(r, "discuss")}
                              disabled={busy}
                              accessibilityRole="button"
                              accessibilityLabel="Discuss request"
                              style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 44,
                                borderRadius: radius.sm,
                                backgroundColor: colors.primary,
                                opacity: busy ? 0.6 : 1,
                              }}
                            >
                              <Text style={styles.actionText}>Discuss</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleRespond(r, "declined")}
                              disabled={busy}
                              accessibilityRole="button"
                              accessibilityLabel="Decline request"
                              style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                minHeight: 44,
                                borderRadius: radius.sm,
                                backgroundColor: colors.danger,
                                opacity: busy ? 0.6 : 1,
                              }}
                            >
                              {busy ? (
                                <ActivityIndicator color="#FFFFFF" />
                              ) : (
                                <Text style={styles.actionText}>Decline</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Experience tab — teacher only: aggregate class experience */}
          {tab === "experience" && isTeacher && (
            <ClassExperienceInsights classId={Number(id)} />
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
  tabButton: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 18 },
  sessionHeader: { flexDirection: "row", alignItems: "center" },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
  actionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
