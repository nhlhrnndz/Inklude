//app/(app)/guidance/student/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ReactNode, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import SupportReferralModal from "../../../../components/SupportReferralModal";
import { useAuth } from "../../../../context/AuthContext";
import { useTheme } from "../../../../context/ThemeContext";
import {
  Appointment,
  AppointmentStatus,
  completeFollowup,
  createStudentFollowup,
  Followup,
  FOLLOWUP_REASONS,
  FollowupReason,
  getGuidanceStudentSIS,
  getReferralClassesForStudent,
  getStudentDetail,
  getStudentFollowups,
  getStudentReferrals,
  ReferralClass,
  ReferralConcern,
  sendSupportReferral,
  SISData,
  SISStatus,
  SupportReferral,
} from "../../../../utils/api";

type StudentDetail = {
  student: {
    id: number;
    name: string;
    email: string;
    createdAt: string;
    disabilityTypes: string[];
    accessibilityPreferences: Record<string, boolean>;
    course?: string | null;
    yearLevel?: string | null;
    section?: string | null;
    age?: number | null;
    dateOfBirth?: string | null;
  };
  appointments: Appointment[];
  followups: Followup[];
  messageThread: {
    id: number;
    totalCount: number;
    unreadCount: number;
    lastMessage: string;
    lastSenderRole: "student" | "guidance";
    lastMessageAt: string;
  } | null;
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

const ROLE_HOME: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  guidance: "/guidance-dashboard",
};

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.sm + 2,
        }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: colors.text,
          }}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function Collapsible({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { colors, typography, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        marginBottom: spacing.md,
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${title}, ${open ? "collapse" : "expand"}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              fontWeight: "700",
              color: colors.text,
            }}
          >
            {title}
          </Text>
          {!!subtitle && (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {open && (
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingBottom: spacing.md,
          }}
        >
          {children}
        </View>
      )}
    </View>
  );
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [data, setData] = useState<StudentDetail | null>(null);
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [sisData, setSisData] = useState<SISData | null>(null);
  const [sisStatus, setSisStatus] = useState<SISStatus>("not_started");
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  // Add follow-up form
  const [showAdd, setShowAdd] = useState(false);
  const [fuReason, setFuReason] = useState<FollowupReason | null>(null);
  const [fuNote, setFuNote] = useState("");

  // Complete follow-up form
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completeNote, setCompleteNote] = useState("");

  const [saving, setSaving] = useState(false);

  // Support referrals (Week 7)
  const [referrals, setReferrals] = useState<SupportReferral[]>([]);
  const [showReferral, setShowReferral] = useState(false);
  const [referralClasses, setReferralClasses] = useState<ReferralClass[]>([]);
  const [loadingReferralClasses, setLoadingReferralClasses] = useState(false);
  const [sendingReferral, setSendingReferral] = useState(false);

  const loadReferrals = useCallback(async () => {
    try {
      const res = await getStudentReferrals(Number(id));
      setReferrals(res.referrals);
    } catch {
      // Keep the page usable if referrals fail to load
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadReferrals();
    }, [loadReferrals]),
  );

  const openReferralModal = async () => {
    setShowReferral(true);
    setLoadingReferralClasses(true);

    try {
      const res = await getReferralClassesForStudent(Number(id));
      setReferralClasses(res.classes);
    } catch (err: any) {
      setShowReferral(false);
      Toast.show({
        type: "error",
        text1: "Could not load classes",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoadingReferralClasses(false);
    }
  };

  const handleSendReferral = async (payload: {
    classId: number;
    concern: ReferralConcern;
    note: string;
  }) => {
    setSendingReferral(true);

    try {
      await sendSupportReferral({
        studentId: Number(id),
        classId: payload.classId,
        concern: payload.concern,
        note: payload.note || undefined,
      });

      setShowReferral(false);
      await loadReferrals();

      Toast.show({
        type: "success",
        text1: "Referral sent",
        text2: "The teacher and the student have been notified.",
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not send referral",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSendingReferral(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace((ROLE_HOME[user?.role ?? "guidance"] ?? "/") as any);
    }
  };

  // Loads on first open and again every time the screen regains focus,
  // so unread counts and appointment changes are fresh after coming back
  // from Messages or Appointments.
  const loadAll = useCallback(async () => {
    const studentId = Number(id);

    try {
      const [studentRes, sisRes] = await Promise.all([
        getStudentDetail(studentId),
        getGuidanceStudentSIS(studentId),
      ]);

      setData(studentRes);
      setFollowups(studentRes.followups ?? []);
      setSisData(sisRes.sis ?? null);
      setSisStatus(sisRes.status ?? "not_started");
      hasLoaded.current = true;
    } catch (err: any) {
      if (!hasLoaded.current) {
        Toast.show({
          type: "error",
          text1: "Failed to load student",
          text2: err.response?.data?.message ?? "Please try again.",
        });
        goBack();
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  /* ---------------------------- follow-ups ---------------------------- */

  const handleAddFollowup = async () => {
    if (!fuReason) {
      Toast.show({ type: "error", text1: "Choose a reason first." });
      return;
    }

    setSaving(true);
    try {
      await createStudentFollowup(Number(id), {
        reason: fuReason,
        note: fuNote.trim() || undefined,
      });
      const res = await getStudentFollowups(Number(id));
      setFollowups(res.followups);

      setShowAdd(false);
      setFuReason(null);
      setFuNote("");
      Toast.show({ type: "success", text1: "Follow-up added" });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not add follow-up",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteFollowup = async (followupId: number) => {
    setSaving(true);
    try {
      await completeFollowup(followupId, {
        note: completeNote.trim() || undefined,
      });
      const res = await getStudentFollowups(Number(id));
      setFollowups(res.followups);

      setCompletingId(null);
      setCompleteNote("");
      Toast.show({ type: "success", text1: "Follow-up completed" });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Could not complete follow-up",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------- formatting ---------------------------- */

  const getSISStatusLabel = (status: SISStatus) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      case "not_started":
      default:
        return "Not Started";
    }
  };

  const getSISStatusIcon = (status: SISStatus) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "in_progress":
        return "time-outline";
      case "not_started":
      default:
        return "ellipse-outline";
    }
  };

  const getSISStatusColors = (status: SISStatus) => {
    switch (status) {
      case "completed":
        return {
          background: colors.success + "18",
          border: colors.success,
          text: colors.success,
        };
      case "in_progress":
        return {
          background: colors.warning + "18",
          border: colors.warning,
          text: colors.warning,
        };
      case "not_started":
      default:
        return {
          background: colors.secondaryBackground,
          border: colors.border,
          text: colors.textSecondary,
        };
    }
  };

  const getAppointmentColors = (status: AppointmentStatus) => {
    switch (status) {
      case "pending":
        return { bg: colors.warning + "22", border: colors.warning };
      case "confirmed":
      case "rescheduled":
        return { bg: colors.success + "1A", border: colors.success };
      case "completed":
        return { bg: colors.primaryLight + "1A", border: colors.primary };
      default:
        return { bg: colors.secondaryBackground, border: colors.border };
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "Not provided";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString();
  };

  const formatDay = (value?: string | null) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatWhen = (date: string, time: string) => {
    const parsed = new Date(`${date}T${time}:00`);
    if (Number.isNaN(parsed.getTime())) return `${date} ${time}`;
    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const captionStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  };

  const bodyStyle = {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.text,
  };

  const cardStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  };

  const renderInfoRow = (
    label: string,
    value?: string | null,
    multiline = false,
  ) => {
    const displayValue =
      value && value.trim().length > 0 ? value : "Not provided";

    return (
      <View
        style={[
          styles.infoRow,
          {
            borderBottomColor: colors.border,
            paddingVertical: spacing.sm + 2,
          },
        ]}
      >
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginBottom: multiline ? 4 : 0,
            flex: multiline ? undefined : 0.42,
          }}
        >
          {label}
        </Text>

        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color:
              displayValue === "Not provided"
                ? colors.placeholder
                : colors.text,
            fontStyle: displayValue === "Not provided" ? "italic" : "normal",
            flex: multiline ? undefined : 0.58,
            textAlign: multiline ? "left" : "right",
            lineHeight: 20,
          }}
        >
          {displayValue}
        </Text>
      </View>
    );
  };

  const renderSISSection = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    children: ReactNode,
  ) => (
    <View
      style={[
        styles.sisSection,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          marginTop: spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.sisSectionHeader,
          {
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm + 2,
          },
        ]}
      >
        <Ionicons name={icon} size={19} color={colors.primary} />
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: colors.text,
            marginLeft: 8,
          }}
        >
          {title}
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.md }}>{children}</View>
    </View>
  );

  const renderActionButton = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void,
    opts?: { primary?: boolean; badge?: number },
  ) => (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: opts?.primary ? colors.primary : colors.surface,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 1,
      }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={opts?.primary ? "#FFFFFF" : colors.primary}
      />
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "700",
          color: opts?.primary ? "#FFFFFF" : colors.primary,
          marginLeft: 6,
        }}
      >
        {label}
      </Text>
      {!!opts?.badge && opts.badge > 0 && (
        <View
          style={{
            backgroundColor: colors.warning,
            borderRadius: radius.round,
            minWidth: 18,
            paddingHorizontal: 5,
            marginLeft: 6,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#000000" }}>
            {opts.badge}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  /* ------------------------------ loading ------------------------------ */

  if (loading || !data) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading student details"
        />
      </SafeAreaView>
    );
  }

  const { student, attendance, transcripts, appointments, messageThread } =
    data;

  const sisStatusColors = getSISStatusColors(sisStatus);
  const activeFollowups = followups.filter((f) => f.status === "active");
  const completedFollowups = followups.filter((f) => f.status === "completed");
  const preferenceEntries = Object.entries(student.accessibilityPreferences);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity
          onPress={goBack}
          style={[styles.backBtn, { marginBottom: spacing.md }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
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
            Back
          </Text>
        </TouchableOpacity>

        {/* Identity */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.secondaryBackground,
              borderRadius: radius.lg,
              borderColor: colors.border,
              paddingVertical: spacing.xl,
              marginBottom: spacing.md,
            },
          ]}
          accessibilityLabel={`${student.name}, ${student.email}`}
        >
          <View
            style={[
              styles.avatar,
              {
                borderRadius: radius.round,
                backgroundColor: colors.primary,
                marginBottom: spacing.sm,
              },
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

          <Text style={[captionStyle, { marginTop: 2 }]}>{student.email}</Text>

          {(student.course || student.yearLevel || student.section) && (
            <View style={{ alignItems: "center", marginTop: 10 }}>
              {!!student.course && (
                <Text style={[bodyStyle, { fontWeight: "600" }]}>
                  {student.course}
                </Text>
              )}
              {(student.yearLevel || student.section) && (
                <Text style={[captionStyle, { marginTop: 2 }]}>
                  {[student.yearLevel, student.section]
                    .filter(Boolean)
                    .join(" • ")}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: spacing.lg,
          }}
        >
          {renderActionButton(
            "Add follow-up",
            "flag-outline",
            () => setShowAdd(true),
            { primary: true },
          )}

          {renderActionButton(
            "Refer to teacher",
            "school-outline",
            openReferralModal,
          )}

          {!!messageThread &&
            renderActionButton(
              "Open messages",
              "chatbubbles-outline",
              () => router.push(`/guidance/message/${messageThread.id}` as any),
              { badge: messageThread.unreadCount },
            )}

          {renderActionButton("Appointments", "calendar-outline", () =>
            router.push("/guidance/appointments" as any),
          )}
        </View>

        {/* Follow-ups */}
        <Section title={`Follow-Ups (${activeFollowups.length} active)`}>
          {showAdd && (
            <View style={cardStyle}>
              <Text style={[bodyStyle, { fontWeight: "700" }]}>
                New follow-up
              </Text>
              <Text style={[captionStyle, { marginTop: 2 }]}>
                Visible to Guidance only. The student is not notified.
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: spacing.sm + 2,
                }}
              >
                {FOLLOWUP_REASONS.map((reason) => {
                  const active = fuReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => setFuReason(reason)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Reason: ${reason}`}
                      style={{
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active
                          ? colors.primary
                          : colors.surface,
                        borderRadius: radius.xl,
                        paddingHorizontal: spacing.sm + 4,
                        paddingVertical: spacing.sm,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          fontWeight: "600",
                          color: active ? "#FFFFFF" : colors.textSecondary,
                        }}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={{
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginTop: spacing.sm + 2,
                  minHeight: 70,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                }}
                value={fuNote}
                onChangeText={setFuNote}
                placeholder="Short note (optional)"
                placeholderTextColor={colors.placeholder}
                multiline
                maxLength={500}
                textAlignVertical="top"
                accessibilityLabel="Follow-up note"
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    setShowAdd(false);
                    setFuReason(null);
                    setFuNote("");
                  }}
                  disabled={saving}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={[
                    styles.formButton,
                    {
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={{ fontWeight: "700", color: colors.textSecondary }}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAddFollowup}
                  disabled={saving || !fuReason}
                  accessibilityRole="button"
                  accessibilityLabel="Save follow-up"
                  style={[
                    styles.formButton,
                    {
                      flex: 1.5,
                      borderColor: colors.primary,
                      borderRadius: radius.md,
                      backgroundColor: colors.primary,
                      opacity: saving || !fuReason ? 0.5 : 1,
                    },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
                      Save follow-up
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeFollowups.length === 0 && !showAdd && (
            <Text style={[captionStyle, { fontStyle: "italic" }]}>
              No active follow-ups.
            </Text>
          )}

          {activeFollowups.map((f) => (
            <View key={f.id} style={cardStyle}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={[bodyStyle, { fontWeight: "700" }]}>
                    {f.reason}
                  </Text>
                  <Text style={[captionStyle, { marginTop: 1 }]}>
                    Since {formatDay(f.createdAt)}
                    {f.createdByName ? ` • by ${f.createdByName}` : ""}
                  </Text>
                </View>

                {completingId !== f.id && (
                  <TouchableOpacity
                    onPress={() => {
                      setCompletingId(f.id);
                      setCompleteNote("");
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Mark ${f.reason} follow-up as done`}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.success,
                      borderRadius: radius.sm,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: typography.caption.fontSize,
                        fontWeight: "700",
                        color: colors.success,
                      }}
                    >
                      Mark done
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {!!f.note && (
                <Text style={[bodyStyle, { marginTop: 8, lineHeight: 20 }]}>
                  {f.note}
                </Text>
              )}

              {completingId === f.id && (
                <View style={{ marginTop: spacing.sm + 2 }}>
                  <TextInput
                    style={{
                      backgroundColor: colors.secondaryBackground,
                      borderColor: colors.border,
                      borderWidth: 1,
                      borderRadius: radius.md,
                      padding: spacing.sm + 4,
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.body.fontSize,
                      color: colors.text,
                    }}
                    value={completeNote}
                    onChangeText={setCompleteNote}
                    placeholder="How was it resolved? (optional)"
                    placeholderTextColor={colors.placeholder}
                    maxLength={255}
                    accessibilityLabel="Completion note"
                  />

                  <View
                    style={{ flexDirection: "row", gap: 10, marginTop: 10 }}
                  >
                    <TouchableOpacity
                      onPress={() => setCompletingId(null)}
                      disabled={saving}
                      accessibilityRole="button"
                      accessibilityLabel="Cancel"
                      style={[
                        styles.formButton,
                        {
                          borderColor: colors.border,
                          borderRadius: radius.md,
                          backgroundColor: colors.surface,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontWeight: "700",
                          color: colors.textSecondary,
                        }}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCompleteFollowup(f.id)}
                      disabled={saving}
                      accessibilityRole="button"
                      accessibilityLabel="Confirm follow-up completed"
                      style={[
                        styles.formButton,
                        {
                          flex: 1.5,
                          borderColor: colors.success,
                          borderRadius: radius.md,
                          backgroundColor: colors.success,
                          opacity: saving ? 0.5 : 1,
                        },
                      ]}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>
                          Confirm completed
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}

          {completedFollowups.length > 0 && (
            <Collapsible
              title={`Follow-up history (${completedFollowups.length})`}
              subtitle="Completed follow-ups are kept as a record."
            >
              {completedFollowups.map((f) => (
                <View
                  key={f.id}
                  style={{
                    paddingVertical: spacing.sm + 2,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text style={[bodyStyle, { fontWeight: "600" }]}>
                    {f.reason}
                  </Text>
                  <Text style={[captionStyle, { marginTop: 1 }]}>
                    {formatDay(f.createdAt)} → {formatDay(f.completedAt)}
                    {f.completedByName ? ` • ${f.completedByName}` : ""}
                  </Text>
                  {!!f.note && (
                    <Text style={[captionStyle, { marginTop: 4 }]}>
                      Note: {f.note}
                    </Text>
                  )}
                  {!!f.completionNote && (
                    <Text style={[captionStyle, { marginTop: 2 }]}>
                      Outcome: {f.completionNote}
                    </Text>
                  )}
                </View>
              ))}
            </Collapsible>
          )}
        </Section>

        {/* Teacher referrals */}
        <Section title={`Teacher Referrals (${referrals.length})`}>
          {referrals.length === 0 ? (
            <Text style={[captionStyle, { fontStyle: "italic" }]}>
              No referrals sent for this student.
            </Text>
          ) : (
            referrals.map((r) => {
              const badgeColors =
                r.status === "sent"
                  ? { bg: colors.warning + "22", border: colors.warning }
                  : r.status === "acknowledged"
                    ? {
                        bg: colors.primaryLight + "1A",
                        border: colors.primary,
                      }
                    : { bg: colors.success + "1A", border: colors.success };

              const statusLabel =
                r.status === "sent"
                  ? "Sent"
                  : r.status === "acknowledged"
                    ? "Acknowledged"
                    : "Replied";

              return (
                <View
                  key={r.id}
                  style={cardStyle}
                  accessibilityLabel={`Referral to ${r.teacherName} for ${r.classTitle}, ${r.concern}, ${statusLabel}`}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                      <Text style={[bodyStyle, { fontWeight: "700" }]}>
                        {r.concern}
                      </Text>
                      <Text style={[captionStyle, { marginTop: 1 }]}>
                        {r.classTitle} • {r.teacherName || "Teacher"} •{" "}
                        {formatDay(r.createdAt)}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: badgeColors.bg,
                        borderColor: badgeColors.border,
                        borderWidth: 1,
                        borderRadius: radius.sm,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  {!!r.note && (
                    <Text style={[captionStyle, { marginTop: 6 }]}>
                      Your note: {r.note}
                    </Text>
                  )}

                  {r.status === "responded" && !!r.teacherResponse && (
                    <View
                      style={{
                        backgroundColor: colors.secondaryBackground,
                        borderRadius: radius.sm,
                        padding: spacing.sm + 2,
                        marginTop: spacing.sm,
                      }}
                    >
                      <Text style={[captionStyle, { fontWeight: "700" }]}>
                        Teacher's reply • {formatDay(r.respondedAt)}
                      </Text>
                      <Text
                        style={[bodyStyle, { marginTop: 3, lineHeight: 20 }]}
                      >
                        {r.teacherResponse}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </Section>

        {/* Appointments */}
        <Section
          title={`Appointments (${appointments.length})`}
          right={
            <TouchableOpacity
              onPress={() => router.push("/guidance/appointments" as any)}
              accessibilityRole="button"
              accessibilityLabel="Open appointments"
              hitSlop={8}
            >
              <Text
                style={{
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                Manage
              </Text>
            </TouchableOpacity>
          }
        >
          {appointments.length === 0 ? (
            <Text style={[captionStyle, { fontStyle: "italic" }]}>
              No appointments yet.
            </Text>
          ) : (
            appointments.slice(0, 5).map((a) => {
              const badge = getAppointmentColors(a.status);
              const when =
                a.confirmedDate && a.confirmedTime
                  ? formatWhen(a.confirmedDate, a.confirmedTime)
                  : formatWhen(a.preferredDate, a.preferredTime);

              return (
                <View
                  key={a.id}
                  style={[
                    cardStyle,
                    { flexDirection: "row", alignItems: "center" },
                  ]}
                  accessibilityLabel={`${a.reason} appointment, ${a.status}, ${when}`}
                >
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text style={[bodyStyle, { fontWeight: "700" }]}>
                      {a.reason}
                    </Text>
                    <Text style={[captionStyle, { marginTop: 1 }]}>
                      {a.status === "pending" ? "Requested for " : ""}
                      {when}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: badge.bg,
                      borderColor: badge.border,
                      borderWidth: 1,
                      borderRadius: radius.sm,
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                    }}
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
              );
            })
          )}

          {appointments.length > 5 && (
            <Text style={captionStyle}>
              Showing the 5 most recent of {appointments.length}.
            </Text>
          )}
        </Section>

        {/* Messages */}
        <Section title="Messages">
          {messageThread ? (
            <TouchableOpacity
              onPress={() =>
                router.push(`/guidance/message/${messageThread.id}` as any)
              }
              accessibilityRole="button"
              accessibilityLabel={`Open conversation. ${messageThread.totalCount} messages, ${messageThread.unreadCount} unread.`}
              style={[
                cardStyle,
                { flexDirection: "row", alignItems: "center" },
              ]}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1, paddingRight: spacing.sm }}>
                <Text style={captionStyle}>
                  {messageThread.totalCount} message
                  {messageThread.totalCount === 1 ? "" : "s"}
                  {messageThread.lastMessageAt
                    ? ` • last ${formatDay(messageThread.lastMessageAt)}`
                    : ""}
                </Text>
                <Text style={[bodyStyle, { marginTop: 4 }]} numberOfLines={2}>
                  {messageThread.lastSenderRole === "guidance"
                    ? "Guidance: "
                    : "Student: "}
                  {messageThread.lastMessage}
                </Text>
              </View>

              {messageThread.unreadCount > 0 && (
                <View
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: radius.round,
                    minWidth: 22,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    alignItems: "center",
                    marginRight: spacing.sm,
                  }}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: "700",
                    }}
                  >
                    {messageThread.unreadCount}
                  </Text>
                </View>
              )}

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <Text style={[captionStyle, { fontStyle: "italic" }]}>
              This student hasn't sent any messages yet.
            </Text>
          )}
        </Section>

        {/* Needs & preferences (Guidance only) */}
        <Section title="Support Needs & Preferences">
          <Text style={[captionStyle, { marginBottom: spacing.sm }]}>
            Visible to Guidance only.
          </Text>

          <View style={[styles.tagRow, { gap: 6, marginBottom: spacing.md }]}>
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
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.primary,
                      fontWeight: "600",
                    }}
                  >
                    {type}
                  </Text>
                </View>
              ))
            ) : (
              <Text
                style={{
                  fontSize: typography.caption.fontSize,
                  color: colors.placeholder,
                  fontStyle: "italic",
                }}
              >
                No profile submitted
              </Text>
            )}
          </View>

          {preferenceEntries.length > 0 && (
            <View style={[styles.prefGrid, { gap: 8 }]}>
              {preferenceEntries.map(([key, value]) => (
                <View
                  key={key}
                  style={[
                    styles.prefChip,
                    {
                      borderRadius: radius.sm,
                      backgroundColor: value
                        ? colors.success + "1A"
                        : colors.secondaryBackground,
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
          )}
        </Section>

        {/* SIS */}
        <Section title="Student Information Sheet">
          <View
            style={[
              styles.sisStatusCard,
              {
                backgroundColor: sisStatusColors.background,
                borderColor: sisStatusColors.border,
                borderRadius: radius.md,
                padding: spacing.md,
              },
            ]}
            accessibilityLabel={`Student Information Sheet status: ${getSISStatusLabel(
              sisStatus,
            )}`}
          >
            <View style={styles.sisStatusIcon}>
              <Ionicons
                name={getSISStatusIcon(sisStatus) as any}
                size={28}
                color={sisStatusColors.text}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[bodyStyle, { fontWeight: "700" }]}>
                {getSISStatusLabel(sisStatus)}
              </Text>
              <Text style={[captionStyle, { marginTop: 3, lineHeight: 18 }]}>
                {sisStatus === "completed"
                  ? "The student's Student Information Sheet has been completed."
                  : sisStatus === "in_progress"
                    ? "The student has started the Student Information Sheet but has not completed it yet."
                    : "The student has not started the Student Information Sheet yet."}
              </Text>
            </View>
          </View>

          {sisData && (
            <View style={{ marginTop: spacing.md }}>
              <Collapsible
                title="View full SIS"
                subtitle={`Last updated ${formatDay(sisData.updatedAt) || "—"}`}
              >
                {renderSISSection(
                  "Personal Information",
                  "person-outline",
                  <>
                    {renderInfoRow("Student ID", sisData.studentId)}
                    {renderInfoRow("Full Name", sisData.fullName)}
                    {renderInfoRow(
                      "Date of Birth",
                      formatDate(sisData.dateOfBirth),
                    )}
                    {renderInfoRow("Sex", sisData.sex)}
                    {renderInfoRow("Civil Status", sisData.civilStatus)}
                    {renderInfoRow("Nationality", sisData.nationality)}
                  </>,
                )}

                {renderSISSection(
                  "Contact Information",
                  "call-outline",
                  <>
                    {renderInfoRow("Email", sisData.email)}
                    {renderInfoRow("Mobile Number", sisData.mobileNumber)}
                    {renderInfoRow(
                      "Current Address",
                      sisData.currentAddress,
                      true,
                    )}
                    {renderInfoRow(
                      "Permanent Address",
                      sisData.permanentAddress,
                      true,
                    )}
                  </>,
                )}

                {renderSISSection(
                  "Academic Information",
                  "school-outline",
                  <>
                    {renderInfoRow("Program / Course", sisData.programCourse)}
                    {renderInfoRow("Year Level", sisData.yearLevel)}
                    {renderInfoRow("Section / Block", sisData.sectionBlock)}
                    {renderInfoRow("Academic Year", sisData.academicYear)}
                  </>,
                )}

                {renderSISSection(
                  "Emergency Contact",
                  "alert-circle-outline",
                  <>
                    {renderInfoRow("Name", sisData.emergencyContactName)}
                    {renderInfoRow(
                      "Relationship",
                      sisData.emergencyContactRelationship,
                    )}
                    {renderInfoRow(
                      "Contact Number",
                      sisData.emergencyContactNumber,
                    )}
                    {renderInfoRow(
                      "Address",
                      sisData.emergencyContactAddress,
                      true,
                    )}
                  </>,
                )}

                {renderSISSection(
                  "Parent / Guardian",
                  "people-outline",
                  <>
                    {renderInfoRow("Name", sisData.parentGuardianName)}
                    {renderInfoRow(
                      "Relationship",
                      sisData.parentGuardianRelationship,
                    )}
                    {renderInfoRow("Contact", sisData.parentGuardianContact)}
                    {renderInfoRow(
                      "Occupation",
                      sisData.parentGuardianOccupation,
                    )}
                  </>,
                )}

                {renderSISSection(
                  "Communication & Support",
                  "chatbubble-ellipses-outline",
                  <>
                    {renderInfoRow(
                      "Preferred Communication",
                      sisData.preferredCommunicationMethod,
                    )}
                    {renderInfoRow(
                      "Learning / Communication Preferences",
                      sisData.learningCommunicationPreferences,
                      true,
                    )}
                    {renderInfoRow(
                      "Additional Support Notes",
                      sisData.additionalSupportNotes,
                      true,
                    )}
                  </>,
                )}
              </Collapsible>
            </View>
          )}
        </Section>

        {/* Class activity (collapsed by default) */}
        <Collapsible
          title="Class Activity"
          subtitle={`${attendance.length} session${
            attendance.length === 1 ? "" : "s"
          } attended • ${transcripts.length} transcript line${
            transcripts.length === 1 ? "" : "s"
          }`}
        >
          <Text
            style={[
              bodyStyle,
              { fontWeight: "700", marginTop: spacing.sm, marginBottom: 8 },
            ]}
          >
            Session Attendance ({attendance.length})
          </Text>

          {attendance.length === 0 ? (
            <Text style={[captionStyle, { fontStyle: "italic" }]}>
              No sessions attended yet.
            </Text>
          ) : (
            attendance.map((a) => (
              <View
                key={`${a.sessionId}-${a.joinedAt}`}
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.secondaryBackground,
                    borderColor: colors.border,
                    borderRadius: radius.sm + 2,
                    padding: 12,
                    marginBottom: 8,
                  },
                ]}
                accessibilityLabel={`${a.title}, taught by ${
                  a.teacherName
                }, status ${a.status}, joined ${new Date(
                  a.joinedAt,
                ).toLocaleString()}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[bodyStyle, { fontWeight: "600" }]}>
                    {a.title}
                  </Text>
                  <Text style={[captionStyle, { marginTop: 2 }]}>
                    Teacher: {a.teacherName} • Code: {a.sessionCode}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.placeholder,
                      marginTop: 4,
                    }}
                  >
                    Joined: {new Date(a.joinedAt).toLocaleString()}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      borderRadius: radius.sm,
                      backgroundColor:
                        a.status === "active"
                          ? colors.success + "1A"
                          : colors.surface,
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

          <Text
            style={[
              bodyStyle,
              { fontWeight: "700", marginTop: spacing.md, marginBottom: 8 },
            ]}
          >
            Caption Transcript History ({transcripts.length})
          </Text>

          {transcripts.length === 0 ? (
            <Text style={[captionStyle, { fontStyle: "italic" }]}>
              No transcripts yet.
            </Text>
          ) : (
            transcripts.map((t) => (
              <View
                key={t.id}
                style={{
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: radius.sm + 2,
                  padding: 12,
                  marginBottom: 8,
                }}
                accessibilityLabel={`Transcript from ${
                  t.sessionTitle
                }, ${new Date(t.createdAt).toLocaleString()}: ${t.text}`}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: colors.primary,
                    marginBottom: 4,
                  }}
                >
                  {t.sessionTitle} • {t.sessionCode}
                </Text>
                <Text
                  style={[captionStyle, { color: colors.text, lineHeight: 18 }]}
                >
                  {t.text}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.placeholder,
                    marginTop: 4,
                  }}
                >
                  {new Date(t.createdAt).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </Collapsible>
      </ScrollView>

      <SupportReferralModal
        visible={showReferral}
        studentName={student.name}
        classes={referralClasses}
        loadingClasses={loadingReferralClasses}
        sending={sendingReferral}
        onClose={() => setShowReferral(false)}
        onSend={handleSendReferral}
      />
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
  },

  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },

  formButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 12,
  },

  sisStatusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },

  sisStatusIcon: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  sisSection: {
    borderWidth: 1,
    overflow: "hidden",
  },

  sisSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
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
});
