// app/class/[id].tsx — class page (Google Classroom style)
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
import SessionDocuments from "../../components/SessionDocuments";
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
  enterSession,
  getClassAccommodationRequests,
  getClassAnnouncements,
  getClassDetails,
  getClassMembers,
  getMyAccommodationRequests,
  leaveClass,
  openClassSession,
  postAnnouncement,
  respondToAccommodationRequest,
} from "../../utils/api";
import { formatMeetingSchedule } from "../../utils/classSchedule";
import { crossAlert } from "../../utils/crossAlert";

type Tab =
  | "announcements"
  | "people"
  | "support"
  | "experience"
  | "documents"
  | "classwork";

type ClassAnnouncement = {
  id: number;
  title: string;
  body: string;
  deadline: string | null;
  createdAt: string;
};

const NOTE_MAX = 300;
const REASON_MAX = 200;
const TITLE_MAX = 150;
const BODY_MAX = 2000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const STATUS_LABEL: Record<AccommodationStatus, string> = {
  pending: "PENDING",
  approved: "APPROVED",
  declined: "DECLINED",
  discuss: "LET'S TALK",
  cancelled: "WITHDRAWN",
};

export default function ClassDetailScreen() {
  const router = useRouter();
  const { id, tab: tabParam } = useLocalSearchParams<{
    id: string;
    tab?: string;
  }>();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const isTeacher = user?.role === "teacher";
  const classId = Number(id);

  const [cls, setCls] = useState<ClassSummary | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goingLive, setGoingLive] = useState(false);
  const [tab, setTab] = useState<Tab>(
    tabParam === "support" ? "support" : "announcements",
  );

  // A notification can open this screen straight on the support tab.
  useEffect(() => {
    if (tabParam === "support") setTab("support");
  }, [tabParam]);

  // Announcements
  const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annDate, setAnnDate] = useState("");
  const [annTime, setAnnTime] = useState("");
  const [posting, setPosting] = useState(false);

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
      const data = isTeacher
        ? await getClassAccommodationRequests(classId)
        : await getMyAccommodationRequests(classId);
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Error loading accommodation requests:", err);
    }
  }, [classId, isTeacher]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await getClassAnnouncements(classId);
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error("Error loading announcements:", err);
    }
  }, [classId]);

  const load = useCallback(async () => {
    try {
      const [details, mem] = await Promise.all([
        getClassDetails(classId),
        getClassMembers(classId),
      ]);
      setCls(details.class);
      setSessions(details.sessions || []);
      setMembers(mem.members || []);
      await Promise.all([loadRequests(), loadAnnouncements()]);
    } catch (err) {
      console.error("Error loading class:", err);
      setCls(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, loadRequests, loadAnnouncements]);

  useFocusEffect(
    useCallback(() => {
      load();

      // Keep "Join live class" up to date: quietly re-check the class every
      // 4 seconds while this screen is open.
      const timer = setInterval(async () => {
        try {
          const details = await getClassDetails(classId);
          setCls(details.class);
          setSessions(details.sessions || []);
        } catch {
          // ignore, the next check will try again
        }
      }, 4000);

      return () => clearInterval(timer);
    }, [load, classId]),
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/my-classes");
  };

  // ---- Go Live (teacher) / Join live (student) ----
  const handleGoLive = async () => {
    setGoingLive(true);
    try {
      const res = await openClassSession(classId);
      router.push(`/session/${res.sessionId}/live` as any);
    } catch (error: any) {
      crossAlert(
        "Could not go live",
        error.response?.data?.message || "Please try again.",
      );
    } finally {
      setGoingLive(false);
    }
  };

  const handleJoinLive = async () => {
    if (!cls?.liveSessionId) return;
    setGoingLive(true);
    try {
      await enterSession(cls.liveSessionId);
      router.push(`/session/${cls.liveSessionId}/live` as any);
    } catch (error: any) {
      crossAlert(
        "Can't join",
        error.response?.data?.message || "Could not join the live class.",
      );
    } finally {
      setGoingLive(false);
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
              await leaveClass(classId);
              router.replace("/my-classes" as any);
            } catch {
              crossAlert("Error", "Could not leave the class.");
            }
          },
        },
      ],
    );
  };

  // ---- Teacher: post an announcement ----
  const handlePostAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) {
      crossAlert("Missing details", "Please enter both a title and a message.");
      return;
    }

    let deadline: string | undefined;
    if (annDate || annTime) {
      if (!DATE_RE.test(annDate) || !TIME_RE.test(annTime)) {
        crossAlert(
          "Check the deadline",
          "Pick both a date and a time, or clear them.",
        );
        return;
      }
      deadline = `${annDate} ${annTime}`;
    }

    setPosting(true);
    try {
      const res = await postAnnouncement({
        title: annTitle.trim(),
        body: annBody.trim(),
        classId,
        deadline,
      } as any);
      setAnnTitle("");
      setAnnBody("");
      setAnnDate("");
      setAnnTime("");
      await loadAnnouncements();

      const count: number = res?.recipientCount ?? 0;
      crossAlert(
        "Announcement posted",
        count === 0
          ? "No students have joined this class yet."
          : `Sent to ${count} student${count === 1 ? "" : "s"}${
              deadline ? " and added to their calendars." : "."
            }`,
      );
    } catch (error: any) {
      crossAlert(
        "Could not post",
        error.response?.data?.message || "Please try again.",
      );
    } finally {
      setPosting(false);
    }
  };

  // ---- Student: send / withdraw a request ----
  const handleSubmitRequest = async () => {
    if (!reqType) {
      crossAlert("Choose one", "Pick the kind of support you need first.");
      return;
    }
    setSubmitting(true);
    try {
      await createAccommodationRequest(classId, {
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

  // ---- shared styles ----
  const body = {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.text,
  };
  const caption = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.textSecondary,
  };
  const inputStyle = {
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    ...body,
  };
  const cardStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  };

  const bigButton = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    onPress: () => void,
    opts: { color?: string; busy?: boolean; outline?: boolean } = {},
  ) => {
    const bg = opts.color ?? colors.primary;
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={opts.busy}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 52,
          borderRadius: radius.md,
          backgroundColor: opts.outline ? "transparent" : bg,
          borderWidth: opts.outline ? 1 : 0,
          borderColor: bg,
          opacity: opts.busy ? 0.6 : 1,
          marginBottom: spacing.lg,
        }}
      >
        {opts.busy ? (
          <ActivityIndicator color={opts.outline ? bg : "#FFFFFF"} />
        ) : (
          <>
            <Ionicons
              name={icon}
              size={20}
              color={opts.outline ? bg : "#FFFFFF"}
            />
            <Text
              style={{
                marginLeft: spacing.sm,
                fontFamily: typography.button.fontFamily,
                fontSize: typography.button.fontSize,
                fontWeight: "700",
                color: opts.outline ? bg : "#FFFFFF",
              }}
            >
              {label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const tabButton = (key: Tab, label: string) => (
    <TouchableOpacity
      key={key}
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

  // Next scheduled meeting (not live, not ended)
  const nextMeeting = sessions
    .filter(
      (s) =>
        s.status === "active" &&
        !s.isLive &&
        s.scheduledStart &&
        new Date(s.scheduledStart).getTime() > Date.now(),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledStart as string).getTime() -
        new Date(b.scheduledStart as string).getTime(),
    )[0];

  const nextMeetingText = nextMeeting
    ? new Date(nextMeeting.scheduledStart as string).toLocaleString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const archived = cls.status !== "active";

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
            <Text style={[body, { color: colors.primary, marginLeft: 6 }]}>
              Back
            </Text>
          </TouchableOpacity>

          {/* Banner: name, code, students */}
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
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  flex: 1,
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
              {cls.isLive && (
                <View
                  style={{
                    backgroundColor: colors.success,
                    borderRadius: radius.sm,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginLeft: 8,
                  }}
                >
                  <Text style={styles.badgeText}>● LIVE</Text>
                </View>
              )}
            </View>

            {cls.description ? (
              <Text
                style={[body, { color: colors.textSecondary, marginTop: 4 }]}
              >
                {cls.description}
              </Text>
            ) : null}
            {!isTeacher && cls.teacherName ? (
              <Text style={[caption, { marginTop: 4 }]}>
                Teacher: {cls.teacherName}
              </Text>
            ) : null}

            {cls.schedule ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: spacing.sm,
                }}
              >
                <Ionicons
                  name="repeat-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[
                    caption,
                    { color: colors.primary, fontWeight: "700", marginLeft: 6 },
                  ]}
                >
                  {formatMeetingSchedule(cls.schedule)}
                </Text>
              </View>
            ) : null}
            {nextMeetingText ? (
              <Text style={[caption, { marginTop: 4 }]}>
                Next meeting: {nextMeetingText}
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

          {/* Go Live (teacher) / Join live (student) */}
          {!archived &&
            isTeacher &&
            bigButton(
              cls.isLive ? "Return to live class" : "Go Live",
              "mic-outline",
              handleGoLive,
              { busy: goingLive },
            )}
          {!archived &&
            !isTeacher &&
            cls.isLive &&
            cls.liveSessionId &&
            bigButton("Join live class", "mic-outline", handleJoinLive, {
              color: colors.success,
              busy: goingLive,
            })}

          {archived && (
            <View style={[cardStyle, { marginBottom: spacing.lg }]}>
              <Text style={caption}>This class is archived.</Text>
            </View>
          )}

          {/* Class Experience check-in (students). Renders nothing unless due. */}
          {!isTeacher && (
            <ClassPulse
              classId={id}
              containerStyle={{ marginBottom: spacing.lg }}
            />
          )}

          {/* Tabs */}
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
            {tabButton("announcements", "Announcements")}
            {tabButton("people", `People (${members.length})`)}
            {tabButton("support", supportLabel)}
            {isTeacher && tabButton("experience", "Experience")}
            {tabButton("documents", "Documents")}
            {isTeacher && tabButton("classwork", "Exams & assignments")}
          </ScrollView>

          {/* Announcements */}
          {tab === "announcements" && (
            <View>
              {isTeacher && !archived && (
                <View style={[cardStyle, { marginBottom: spacing.lg }]}>
                  <TextInput
                    style={inputStyle}
                    value={annTitle}
                    onChangeText={setAnnTitle}
                    placeholder="Announcement title"
                    placeholderTextColor={colors.placeholder}
                    maxLength={TITLE_MAX}
                    accessibilityLabel="Announcement title"
                  />
                  <TextInput
                    style={[inputStyle, { minHeight: 100 }]}
                    value={annBody}
                    onChangeText={setAnnBody}
                    placeholder="Write an announcement to this class..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    maxLength={BODY_MAX}
                    textAlignVertical="top"
                    accessibilityLabel="Announcement message"
                  />

                  <Text
                    style={[
                      caption,
                      { fontWeight: "700", marginBottom: spacing.xs },
                    ]}
                  >
                    DEADLINE (OPTIONAL)
                  </Text>
                  <Text
                    style={[
                      caption,
                      { fontSize: 11, marginBottom: spacing.sm },
                    ]}
                  >
                    If you set one, it appears on every student's calendar.
                  </Text>
                  <DateField
                    value={annDate}
                    onChange={setAnnDate}
                    label="Deadline date"
                    placeholder="Pick a date (optional)"
                    minDate={todayString()}
                  />
                  <TimeField
                    value={annTime}
                    onChange={setAnnTime}
                    label="Deadline time"
                    placeholder="Pick a time (optional)"
                  />
                  {!!(annDate || annTime) && (
                    <TouchableOpacity
                      onPress={() => {
                        setAnnDate("");
                        setAnnTime("");
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
                        style={[
                          body,
                          { fontWeight: "700", color: colors.primary },
                        ]}
                      >
                        Clear deadline
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handlePostAnnouncement}
                    disabled={posting}
                    accessibilityRole="button"
                    accessibilityLabel="Post announcement to this class"
                    accessibilityState={{ disabled: posting }}
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: radius.sm,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: spacing.sm,
                      opacity: posting ? 0.6 : 1,
                    }}
                  >
                    {posting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[body, { fontWeight: "700", color: "#FFFFFF" }]}
                      >
                        Post to class
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {announcements.length === 0 ? (
                <Text style={[body, { color: colors.textSecondary }]}>
                  {isTeacher
                    ? "You haven't posted any announcements to this class yet."
                    : "No announcements yet."}
                </Text>
              ) : (
                announcements.map((a) => (
                  <View key={a.id} style={cardStyle}>
                    <Text style={[body, { fontWeight: "700" }]}>{a.title}</Text>
                    <Text style={[caption, { fontSize: 11, marginTop: 2 }]}>
                      {new Date(a.createdAt).toLocaleString()}
                    </Text>
                    {a.deadline ? (
                      <Text
                        style={[
                          caption,
                          {
                            fontSize: 11,
                            fontWeight: "700",
                            color: colors.primary,
                            marginTop: 2,
                          },
                        ]}
                      >
                        Deadline: {new Date(a.deadline).toLocaleString()}
                      </Text>
                    ) : null}
                    <Text style={[body, { marginTop: 6 }]}>{a.body}</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* People */}
          {tab === "people" && (
            <View>
              {members.length === 0 ? (
                <Text style={[body, { color: colors.textSecondary }]}>
                  No students have joined this class yet. Share the class code{" "}
                  {cls.code}.
                </Text>
              ) : (
                members.map((m) => (
                  <View
                    key={m.id}
                    style={[
                      cardStyle,
                      { flexDirection: "row", alignItems: "center" },
                    ]}
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
                      <Text style={[body, { fontWeight: "600" }]}>
                        {m.displayName}
                        {m.id === user?.id ? " (You)" : ""}
                      </Text>
                      <Text style={caption}>
                        Joined {new Date(m.joinedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Support — student: request support */}
          {tab === "support" && !isTeacher && (
            <View>
              <Text style={[caption, { marginBottom: spacing.md }]}>
                Ask your teacher for support in this class. Only your teacher
                sees your request. They never see your support needs.
              </Text>

              {!showRequestForm ? (
                bigButton("+ Request Support", "hand-left-outline", () =>
                  setShowRequestForm(true),
                )
              ) : (
                <View style={[cardStyle, { marginBottom: spacing.lg }]}>
                  <Text
                    style={[
                      body,
                      { fontWeight: "700", marginBottom: spacing.sm },
                    ]}
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
                            style={[
                              body,
                              {
                                fontWeight: "600",
                                color: selected ? "#FFFFFF" : colors.text,
                              },
                            ]}
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
                      style={[
                        styles.halfButton,
                        { borderColor: colors.border, borderWidth: 1 },
                      ]}
                    >
                      <Text
                        style={[
                          body,
                          { fontWeight: "700", color: colors.textSecondary },
                        ]}
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmitRequest}
                      disabled={submitting}
                      accessibilityRole="button"
                      accessibilityLabel="Send request"
                      style={[
                        styles.halfButton,
                        {
                          backgroundColor: colors.primary,
                          opacity: submitting ? 0.6 : 1,
                        },
                      ]}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text
                          style={[
                            body,
                            { fontWeight: "700", color: "#FFFFFF" },
                          ]}
                        >
                          Send
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {requests.length === 0 ? (
                <Text style={[body, { color: colors.textSecondary }]}>
                  You haven't asked for any support in this class yet.
                </Text>
              ) : (
                requests.map((r) => (
                  <View key={r.id} style={cardStyle}>
                    <View style={styles.rowCenter}>
                      <Text style={[body, { flex: 1, fontWeight: "700" }]}>
                        {r.typeLabel}
                      </Text>
                      {statusBadge(r.status)}
                    </View>
                    {r.note ? (
                      <Text style={[body, { marginTop: 6 }]}>{r.note}</Text>
                    ) : null}
                    <Text style={[caption, { fontSize: 11, marginTop: 4 }]}>
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
                          style={[caption, { fontSize: 11, marginBottom: 2 }]}
                        >
                          Your teacher said
                        </Text>
                        <Text style={body}>{r.teacherResponse}</Text>
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
                          style={[
                            body,
                            { fontWeight: "700", color: colors.danger },
                          ]}
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

          {/* Requests — teacher: answer */}
          {tab === "support" && isTeacher && (
            <View>
              <Text style={[caption, { marginBottom: spacing.md }]}>
                Students ask for support here. You see the request only, never a
                student's support needs. Your reply is sent to them as a
                notification.
              </Text>

              {sortedRequests.length === 0 ? (
                <Text style={[body, { color: colors.textSecondary }]}>
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
                        cardStyle,
                        {
                          opacity: open ? 1 : 0.85,
                          borderColor: open ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View style={styles.rowCenter}>
                        <Text style={[body, { flex: 1, fontWeight: "700" }]}>
                          {r.typeLabel}
                        </Text>
                        {statusBadge(r.status)}
                      </View>
                      <Text style={[caption, { marginTop: 2 }]}>
                        {r.studentName} ·{" "}
                        {new Date(r.createdAt).toLocaleString()}
                      </Text>
                      {r.note ? (
                        <Text style={[body, { marginTop: 6 }]}>{r.note}</Text>
                      ) : null}
                      {r.teacherResponse ? (
                        <Text style={[caption, { marginTop: 6 }]}>
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
                            {(
                              [
                                ["Approve", "approved", colors.success],
                                ["Discuss", "discuss", colors.primary],
                                ["Decline", "declined", colors.danger],
                              ] as [string, AccommodationDecision, string][]
                            ).map(([label, decision, bg]) => (
                              <TouchableOpacity
                                key={decision}
                                onPress={() => handleRespond(r, decision)}
                                disabled={busy}
                                accessibilityRole="button"
                                accessibilityLabel={`${label} request`}
                                style={{
                                  flex: 1,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  minHeight: 44,
                                  borderRadius: radius.sm,
                                  backgroundColor: bg,
                                  opacity: busy ? 0.6 : 1,
                                }}
                              >
                                <Text style={styles.actionText}>{label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Experience — teacher */}
          {tab === "experience" && isTeacher && (
            <ClassExperienceInsights classId={classId} />
          )}

          {/* Documents — class level */}
          {tab === "documents" && (
            <SessionDocuments classId={classId} isTeacher={isTeacher} />
          )}

          {/* Exams & assignments — teacher */}
          {tab === "classwork" && isTeacher && (
            <View>
              <Text style={[caption, { marginBottom: spacing.md }]}>
                Post an exam or assignment. It lands on every enrolled student's
                calendar and sends them a notification.
              </Text>
              {bigButton("Post exam or assignment", "create-outline", () =>
                router.push(`/class-calendar/${id}` as any),
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
  tabButton: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 18 },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "bold" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
  halfButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 8,
  },
  actionText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
