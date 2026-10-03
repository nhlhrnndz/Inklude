//guidance-dashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { ALL_COURSES, getCollegeCodeForCourse } from "../../constants/courses";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLiveRefresh } from "../../hooks/useLiveRefresh";
import {
  getGuidanceDashboard,
  getStudents,
  GuidanceDashboardSummary,
} from "../../utils/api";

type Student = {
  id: number;
  name: string;
  email: string;
  course?: string | null;
  yearLevel?: string | null;
  section?: string | null;
};

type CourseSection = {
  title: string;
  college: string;
  data: Student[];
};

function formatWhen(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return `${date} ${time}`;

  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Small card wrapper used by every dashboard section                  */
/* ------------------------------------------------------------------ */
function SummaryCard({
  title,
  icon,
  badge,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  actionLabel?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardIcon,
            {
              backgroundColor: colors.primaryLight + "18",
              borderRadius: radius.md,
            },
          ]}
        >
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>

        <Text
          style={{
            flex: 1,
            marginLeft: spacing.sm,
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
            color: colors.text,
          }}
          accessibilityRole="header"
        >
          {title}
        </Text>

        {!!badge && badge > 0 && (
          <View
            style={{
              backgroundColor: colors.warning + "22",
              borderColor: colors.warning,
              borderWidth: 1,
              borderRadius: radius.round,
              paddingHorizontal: 9,
              paddingVertical: 2,
              minWidth: 26,
              alignItems: "center",
            }}
            accessibilityLabel={`${badge} need attention`}
          >
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              {badge}
            </Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: spacing.sm + 2 }}>{children}</View>

      {!!actionLabel && !!onAction && (
        <TouchableOpacity
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            marginTop: spacing.sm + 2,
          }}
          hitSlop={8}
        >
          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              fontWeight: "700",
              color: colors.primary,
            }}
          >
            {actionLabel}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={colors.primary}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function GuidanceDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [summary, setSummary] = useState<GuidanceDashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const summaryKeyRef = useRef("");

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const studentsReqRef = useRef(0);

  const [search, setSearch] = useState("");
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ------------------------------ data ------------------------------ */

  const loadSummary = useCallback(async (showErrors = false) => {
    try {
      const res = await getGuidanceDashboard();
      const key = JSON.stringify(res);

      // Only re-render when something actually changed
      if (key !== summaryKeyRef.current) {
        summaryKeyRef.current = key;
        setSummary(res);
      }
      setSummaryError(false);
    } catch (err: any) {
      if (summaryKeyRef.current === "") {
        setSummaryError(true);
      }
      if (showErrors) {
        Toast.show({
          type: "error",
          text1: "Failed to load dashboard",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    }
  }, []);

  // Refreshes on focus, when an appointment notification arrives over the
  // socket, and every 20s while the screen is open.
  useLiveRefresh(() => loadSummary(false), {
    sourceType: "appointment",
    intervalMs: 20000,
  });

  const loadStudents = useCallback(async (term: string) => {
    const reqId = ++studentsReqRef.current;

    try {
      const res = await getStudents({ search: term.trim() || undefined });
      if (reqId === studentsReqRef.current) {
        setStudents(res.students ?? []);
      }
    } catch (err: any) {
      if (reqId === studentsReqRef.current) {
        Toast.show({
          type: "error",
          text1: "Failed to load students",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    } finally {
      if (reqId === studentsReqRef.current) {
        setStudentsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadStudents(search), search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadStudents]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSummary(true), loadStudents(search)]);
    setRefreshing(false);
  };

  /* ---------------------------- derived ----------------------------- */

  const incompleteSet = useMemo(
    () => new Set<number>(summary?.sis.incompleteStudentIds ?? []),
    [summary],
  );

  const visibleStudents = useMemo(() => {
    if (!incompleteOnly) return students;
    return students.filter((s) => incompleteSet.has(s.id));
  }, [students, incompleteOnly, incompleteSet]);

  // Students grouped by course, ordered by the official BSU ARASOF list.
  // Students without a course land in a trailing "No Course Set" section.
  const groupedSections: CourseSection[] = useMemo(() => {
    const groups = new Map<string, Student[]>();

    visibleStudents.forEach((student) => {
      const key =
        student.course && student.course.trim()
          ? student.course
          : "No Course Set";

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(student);
    });

    const orderedCourses = ALL_COURSES.filter((course) => groups.has(course));
    const extraCourses = Array.from(groups.keys()).filter(
      (key) => key !== "No Course Set" && !ALL_COURSES.includes(key),
    );

    const sections: CourseSection[] = [...orderedCourses, ...extraCourses].map(
      (course) => ({
        title: course,
        college: getCollegeCodeForCourse(course),
        data: groups.get(course) ?? [],
      }),
    );

    if (groups.has("No Course Set")) {
      sections.push({
        title: "No Course Set",
        college: "",
        data: groups.get("No Course Set") ?? [],
      });
    }

    return sections;
  }, [visibleStudents]);

  const sisPercent =
    summary && summary.sis.total > 0
      ? Math.round((summary.sis.completed / summary.sis.total) * 100)
      : 0;

  /* ----------------------------- styles ----------------------------- */

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

  const emptyText = (text: string) => (
    <Text style={[captionStyle, { fontStyle: "italic" }]}>{text}</Text>
  );

  /* ------------------------------ rows ------------------------------ */

  const renderCourseSectionHeader = ({
    section,
  }: {
    section: CourseSection;
  }) => (
    <View
      style={[
        styles.courseSectionHeader,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          paddingVertical: spacing.sm,
        },
      ]}
    >
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          fontWeight: "700",
          color: colors.text,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {section.title}
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {!!section.college && (
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: radius.sm,
              backgroundColor: colors.secondaryBackground,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: colors.textSecondary,
              }}
            >
              {section.college}
            </Text>
          </View>
        )}

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            fontWeight: "700",
            color: colors.primary,
          }}
        >
          {section.data.length}
        </Text>
      </View>
    </View>
  );

  const renderStudent = ({ item }: { item: Student }) => {
    const sisIncomplete = incompleteSet.has(item.id);
    const detail = [item.yearLevel, item.section].filter(Boolean).join(" • ");

    return (
      <TouchableOpacity
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
        onPress={() => router.push(`/guidance/student/${item.id}`)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.email}${
          sisIncomplete ? ", SIS incomplete" : ""
        }`}
      >
        <View
          style={[
            styles.avatar,
            {
              borderRadius: radius.round,
              backgroundColor: colors.primary,
              marginRight: spacing.sm + 2,
            },
          ]}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[bodyStyle, { fontWeight: "700" }]} numberOfLines={1}>
            {item.name}
          </Text>

          <Text style={[captionStyle, { marginTop: 1 }]} numberOfLines={1}>
            {item.email}
          </Text>

          {!!detail && (
            <Text
              style={[
                captionStyle,
                {
                  fontSize: typography.caption.fontSize - 1,
                  color: colors.placeholder,
                  marginTop: 1,
                },
              ]}
              numberOfLines={1}
            >
              {detail}
            </Text>
          )}
        </View>

        {sisIncomplete && (
          <View
            style={{
              backgroundColor: colors.warning + "18",
              borderColor: colors.warning,
              borderWidth: 1,
              borderRadius: radius.sm,
              paddingHorizontal: 7,
              paddingVertical: 3,
              marginRight: spacing.sm,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              SIS incomplete
            </Text>
          </View>
        )}

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  /* ----------------------------- header ----------------------------- */

  const renderHeader = () => {
    if (!summary) return null;

    const { appointments, followups, messages, announcements, sis } = summary;

    return (
      <>
        {/* Appointments */}
        <SummaryCard
          title="Appointments"
          icon="calendar-outline"
          badge={appointments.pendingCount}
          actionLabel="Manage appointments"
          onAction={() => router.push("/guidance/appointments" as any)}
        >
          <Text style={[bodyStyle, { fontWeight: "700" }]}>
            {appointments.pendingCount === 0
              ? "No pending requests"
              : `${appointments.pendingCount} pending request${
                  appointments.pendingCount === 1 ? "" : "s"
                }`}
          </Text>

          <View style={{ marginTop: spacing.sm }}>
            {appointments.next ? (
              <>
                <Text style={captionStyle}>NEXT APPOINTMENT</Text>
                <Text style={[bodyStyle, { marginTop: 2 }]}>
                  {appointments.next.studentName} • {appointments.next.reason}
                </Text>
                <Text style={[captionStyle, { marginTop: 1 }]}>
                  {formatWhen(appointments.next.date, appointments.next.time)}
                  {appointments.upcomingCount > 1
                    ? `  (+${appointments.upcomingCount - 1} more upcoming)`
                    : ""}
                </Text>
              </>
            ) : (
              emptyText("No upcoming appointments.")
            )}
          </View>
        </SummaryCard>

        {/* Follow-ups */}
        <SummaryCard
          title="Active Follow-Ups"
          icon="flag-outline"
          badge={followups.activeCount}
        >
          {followups.items.length === 0
            ? emptyText(
                "No active follow-ups. Add one from a student's profile.",
              )
            : followups.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    router.push(`/guidance/student/${item.studentId}`)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${item.studentName}, ${item.reason}. Open profile.`}
                  style={[styles.listRow, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[bodyStyle, { fontWeight: "600" }]}>
                      {item.studentName}
                    </Text>
                    <Text style={[captionStyle, { marginTop: 1 }]}>
                      {item.reason} • since {formatDay(item.createdAt)}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}

          {followups.activeCount > followups.items.length && (
            <Text style={[captionStyle, { marginTop: spacing.sm }]}>
              and {followups.activeCount - followups.items.length} more
            </Text>
          )}
        </SummaryCard>

        {/* Recent messages */}
        <SummaryCard
          title="Recent Messages"
          icon="chatbubbles-outline"
          badge={messages.unreadTotal}
          actionLabel="Open inbox"
          onAction={() => router.push("/guidance/messages" as any)}
        >
          {messages.threads.length === 0
            ? emptyText("No messages yet.")
            : messages.threads.map((thread) => (
                <TouchableOpacity
                  key={thread.id}
                  onPress={() =>
                    router.push(`/guidance/message/${thread.id}` as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${thread.studentName}${
                    thread.unreadCount > 0
                      ? `, ${thread.unreadCount} unread`
                      : ""
                  }. ${thread.lastMessage}`}
                  style={[styles.listRow, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text
                      style={[
                        bodyStyle,
                        {
                          fontWeight: thread.unreadCount > 0 ? "700" : "600",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {thread.studentName}
                    </Text>
                    <Text
                      style={[captionStyle, { marginTop: 1 }]}
                      numberOfLines={1}
                    >
                      {thread.lastMessage}
                    </Text>
                  </View>

                  {thread.unreadCount > 0 && (
                    <View
                      style={{
                        backgroundColor: colors.primary,
                        borderRadius: radius.round,
                        minWidth: 22,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 11,
                          fontWeight: "700",
                        }}
                      >
                        {thread.unreadCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
        </SummaryCard>

        {/* Announcements */}
        <SummaryCard
          title="Announcements"
          icon="megaphone-outline"
          actionLabel="Manage announcements"
          onAction={() => router.push("/announcements" as any)}
        >
          {announcements.length === 0
            ? emptyText("You haven't posted any announcements yet.")
            : announcements.map((a) => (
                <View
                  key={a.id}
                  style={[styles.listRow, { borderBottomColor: colors.border }]}
                >
                  <Text
                    style={[bodyStyle, { flex: 1, paddingRight: spacing.sm }]}
                    numberOfLines={1}
                  >
                    {a.title}
                  </Text>
                  <Text style={captionStyle}>{formatDay(a.createdAt)}</Text>
                </View>
              ))}
        </SummaryCard>

        {/* SIS completion (single compact card) */}
        <SummaryCard title="SIS Completion" icon="document-text-outline">
          <View style={styles.sisHeaderRow}>
            <Text style={captionStyle}>
              {sis.completed} of {sis.total} students completed
            </Text>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "700",
                color: colors.primary,
              }}
            >
              {sisPercent}%
            </Text>
          </View>

          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: colors.secondaryBackground,
                borderRadius: radius.round,
                marginTop: spacing.sm,
              },
            ]}
            accessibilityLabel={`SIS completion: ${sisPercent}%`}
          >
            <View
              style={{
                height: "100%",
                width: `${sisPercent}%`,
                backgroundColor: colors.success,
                borderRadius: radius.round,
              }}
            />
          </View>

          <Text style={[captionStyle, { marginTop: spacing.sm }]}>
            {sis.inProgress} in progress • {sis.notStarted} not started
          </Text>

          {sis.total - sis.completed > 0 && (
            <TouchableOpacity
              onPress={() => setIncompleteOnly((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ selected: incompleteOnly }}
              accessibilityLabel={
                incompleteOnly
                  ? "Show all students"
                  : "Show only students with incomplete SIS"
              }
              style={{
                alignSelf: "flex-start",
                marginTop: spacing.sm + 2,
                borderWidth: 1,
                borderColor: incompleteOnly ? colors.primary : colors.border,
                backgroundColor: incompleteOnly
                  ? colors.primary
                  : colors.surface,
                borderRadius: radius.xl,
                paddingHorizontal: spacing.sm + 6,
                paddingVertical: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: incompleteOnly ? "#FFFFFF" : colors.textSecondary,
                }}
              >
                {incompleteOnly
                  ? "Showing incomplete only • Clear"
                  : `Show incomplete (${sis.total - sis.completed})`}
              </Text>
            </TouchableOpacity>
          )}
        </SummaryCard>

        {/* Students list header + search */}
        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: typography.body.fontSize + 2,
            fontWeight: "700",
            color: colors.text,
            marginTop: spacing.sm,
            marginBottom: spacing.sm,
          }}
          accessibilityRole="header"
        >
          Students ({summary.totalStudents})
        </Text>

        <TextInput
          style={{
            backgroundColor: colors.secondaryBackground,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: radius.sm + 2,
            paddingHorizontal: spacing.sm + 6,
            paddingVertical: spacing.sm + 2,
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.text,
            marginBottom: spacing.sm,
          }}
          placeholder="Search by name or email"
          placeholderTextColor={colors.placeholder}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          accessibilityLabel="Search students by name or email"
        />
      </>
    );
  };

  /* ------------------------------ render ----------------------------- */

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm + 4,
          paddingBottom: spacing.sm,
        }}
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
          Guidance Dashboard
        </Text>

        <Text style={[captionStyle, { marginTop: 2 }]}>
          Welcome, {user?.name || "Counselor"}
        </Text>
      </View>

      {!summary && !summaryError ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading dashboard"
        />
      ) : !summary && summaryError ? (
        <View style={{ alignItems: "center", padding: spacing.lg }}>
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={colors.textSecondary}
          />
          <Text
            style={[bodyStyle, { marginTop: spacing.sm, textAlign: "center" }]}
          >
            We couldn't load the dashboard.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSummaryError(false);
              loadSummary(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Retry loading dashboard"
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              marginTop: spacing.md,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={groupedSections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStudent}
          renderSectionHeader={renderCourseSectionHeader}
          stickySectionHeadersEnabled
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 40,
          }}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={
            studentsLoading ? (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginTop: spacing.lg }}
                accessibilityLabel="Loading students"
              />
            ) : (
              <View
                style={{
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={28}
                  color={colors.textSecondary}
                />
                <Text
                  style={[
                    bodyStyle,
                    {
                      fontWeight: "700",
                      textAlign: "center",
                      marginTop: spacing.sm,
                    },
                  ]}
                >
                  {incompleteOnly
                    ? "No students with an incomplete SIS"
                    : "No students found"}
                </Text>
                <Text
                  style={[captionStyle, { textAlign: "center", marginTop: 4 }]}
                >
                  {search
                    ? "Try a different search."
                    : incompleteOnly
                      ? "Everyone here has completed their SIS."
                      : "Students will appear here once they register."}
                </Text>
                {incompleteOnly && (
                  <TouchableOpacity
                    onPress={() => setIncompleteOnly(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Show all students"
                    style={{
                      borderWidth: 1,
                      borderColor: colors.primary,
                      borderRadius: radius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm,
                      marginTop: spacing.md,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        color: colors.primary,
                        fontSize: typography.caption.fontSize,
                      }}
                    >
                      Show all students
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  sisHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  progressTrack: {
    height: 9,
    width: "100%",
    overflow: "hidden",
  },

  courseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },

  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },

  avatar: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
