//guidance-dashboard.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import {
  getDashboardStats,
  getGuidanceSIS,
  getStudents,
  SISStatus,
} from "../../utils/api";

const DISABILITY_FILTERS = [
  "All",
  "Deaf",
  "Hard of Hearing",
  "Non-Verbal",
  "Autism",
  "ADHD",
  "Dyslexia",
];

const COURSE_FILTERS = ["All", ...ALL_COURSES];

const SIS_FILTERS: {
  label: string;
  value: SISStatus | "all";
}[] = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Not Started",
    value: "not_started",
  },
  {
    label: "In Progress",
    value: "in_progress",
  },
  {
    label: "Completed",
    value: "completed",
  },
];

type Stats = {
  totalStudents: number;
  totalSessions: number;
  activeSessions: number;
  totalParticipations: number;
  profileCompletionRate: number;
};

type Student = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  disabilityTypes: string[];
  accessibilityPreferences: Record<string, boolean>;
  course?: string | null;
  yearLevel?: string | null;
  section?: string | null;
};

type SISRecord = {
  id?: number;
  userId?: number;
  studentId?: string;
  fullName?: string;
  status: SISStatus;
  updatedAt?: string;
};

type SISStatusMap = Record<number, SISStatus>;

type SISUpdatedMap = Record<number, string | undefined>;

type SISCounts = {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
};

type CourseSection = {
  title: string;
  college: string;
  data: Student[];
};

export default function GuidanceDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sisStatuses, setSisStatuses] = useState<SISStatusMap>({});
  const [sisUpdatedAt, setSisUpdatedAt] = useState<SISUpdatedMap>({});

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeCourseFilter, setActiveCourseFilter] = useState("All");
  const [activeSISFilter, setActiveSISFilter] = useState<SISStatus | "all">(
    "all",
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setError(false);

    try {
      /*
       * Load SIS without the selected SIS status filter.
       *
       * This is intentional:
       * the summary cards must always represent the
       * current student population instead of changing
       * their totals when the user taps a status filter.
       */
      const [statsRes, studentsRes, sisRes] = await Promise.all([
        getDashboardStats(),

        getStudents({
          disability: activeFilter === "All" ? undefined : activeFilter,
          course: activeCourseFilter === "All" ? undefined : activeCourseFilter,
          search: search.trim() || undefined,
        }),

        getGuidanceSIS({
          search: search.trim() || undefined,
        }),
      ]);

      setStats(statsRes.stats);
      setStudents(studentsRes.students);

      const statusMap: SISStatusMap = {};
      const updatedMap: SISUpdatedMap = {};

      const sisRecords: SISRecord[] = Array.isArray(sisRes)
        ? sisRes
        : Array.isArray(sisRes?.students)
          ? sisRes.students
          : Array.isArray(sisRes?.sis)
            ? sisRes.sis
            : [];

      sisRecords.forEach((record) => {
        if (typeof record.userId === "number" && record.status) {
          statusMap[record.userId] = record.status;

          updatedMap[record.userId] = record.updatedAt;
        }
      });

      setSisStatuses(statusMap);
      setSisUpdatedAt(updatedMap);
    } catch (err: any) {
      setError(true);

      Toast.show({
        type: "error",
        text1: "Failed to load dashboard",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, activeCourseFilter, search]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const getSISStatus = (studentId: number): SISStatus => {
    return sisStatuses[studentId] ?? "not_started";
  };

  /*
   * SIS totals are calculated from the currently
   * loaded student population.
   *
   * A student without an SIS record is treated as
   * "not_started".
   */
  const sisCounts: SISCounts = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let notStarted = 0;

    students.forEach((student) => {
      const status = getSISStatus(student.id);

      if (status === "completed") {
        completed += 1;
      } else if (status === "in_progress") {
        inProgress += 1;
      } else {
        notStarted += 1;
      }
    });

    return {
      total: students.length,
      completed,
      inProgress,
      notStarted,
    };
  }, [students, sisStatuses]);

  /*
   * Apply the selected SIS status locally.
   *
   * This gives us a reliable UI filter even when the
   * backend returns SIS records separately from students.
   */
  const visibleStudents = useMemo(() => {
    if (activeSISFilter === "all") {
      return students;
    }

    return students.filter(
      (student) => getSISStatus(student.id) === activeSISFilter,
    );
  }, [students, sisStatuses, activeSISFilter]);

  /*
   * Group the visible students by course so guidance can see the
   * separation between programs at a glance. Courses are ordered
   * following the official BSU ARASOF college list; students who
   * haven't completed Basic Information yet land in a trailing
   * "No Course Set" section instead of disappearing.
   */
  const groupedSections: CourseSection[] = useMemo(() => {
    const groups = new Map<string, Student[]>();

    visibleStudents.forEach((student) => {
      const key =
        student.course && student.course.trim()
          ? student.course
          : "No Course Set";

      if (!groups.has(key)) {
        groups.set(key, []);
      }

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

  const completionPercentage =
    sisCounts.total > 0
      ? Math.round((sisCounts.completed / sisCounts.total) * 100)
      : 0;

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

  const getSISStatusDescription = (status: SISStatus) => {
    switch (status) {
      case "completed":
        return "The student has completed the SIS.";

      case "in_progress":
        return "The student has started the SIS but has not completed it.";

      case "not_started":
      default:
        return "The student has not started the SIS yet.";
    }
  };

  const getSISActionText = (status: SISStatus) => {
    switch (status) {
      case "completed":
        return "Review submitted information.";

      case "in_progress":
        return "Follow up when appropriate.";

      case "not_started":
      default:
        return "Student may need a reminder to begin.";
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

  const getCurrentSISFilterLabel = () => {
    if (activeSISFilter === "all") {
      return "All students";
    }

    return (
      SIS_FILTERS.find((filter) => filter.value === activeSISFilter)?.label ??
      "All students"
    );
  };

  const formatUpdatedDate = (value?: string) => {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderStatCard = (label: string, value: number | string) => (
    <View
      key={label}
      style={[
        styles.statCard,
        {
          backgroundColor: colors.secondaryBackground,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.sm + 2,
        },
      ]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text
        style={{
          fontFamily: typography.h2.fontFamily,
          fontSize: typography.h2.fontSize,
          fontWeight: "700",
          color: colors.primary,
        }}
      >
        {value}
      </Text>

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          color: colors.textSecondary,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );

  const renderSISStatCard = (
    label: string,
    value: number,
    status: SISStatus,
  ) => {
    const statusColors = getSISStatusColors(status);

    const isActive = activeSISFilter === status;

    return (
      <TouchableOpacity
        key={label}
        activeOpacity={0.8}
        onPress={() => {
          setActiveSISFilter(isActive ? "all" : status);
        }}
        style={[
          styles.sisStatCard,
          {
            backgroundColor: isActive
              ? statusColors.background
              : colors.surface,
            borderColor: isActive ? statusColors.border : colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}. Tap to ${
          isActive
            ? "show all students"
            : `show ${label.toLowerCase()} students`
        }.`}
        accessibilityState={{
          selected: isActive,
        }}
      >
        <View style={[styles.sisStatTopRow]}>
          <View
            style={[
              styles.sisStatIcon,
              {
                backgroundColor: statusColors.background,
                borderRadius: radius.round,
              },
            ]}
          >
            <Ionicons
              name={getSISStatusIcon(status) as any}
              size={18}
              color={statusColors.text}
            />
          </View>

          {isActive && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={statusColors.text}
            />
          )}
        </View>

        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            fontWeight: "700",
            color: colors.text,
            marginTop: spacing.sm,
          }}
        >
          {value}
        </Text>

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            fontWeight: "600",
            color: colors.text,
            marginTop: 2,
          }}
        >
          {label}
        </Text>

        <Text
          numberOfLines={2}
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize - 1,
            color: colors.textSecondary,
            marginTop: 4,
            lineHeight: typography.caption.fontSize + 4,
          }}
        >
          {status === "completed"
            ? "Ready to review"
            : status === "in_progress"
              ? "Needs completion"
              : "Needs to begin"}
        </Text>
      </TouchableOpacity>
    );
  };

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
    const sisStatus = getSISStatus(item.id);

    const sisColors = getSISStatusColors(sisStatus);

    const updatedDate = formatUpdatedDate(sisUpdatedAt[item.id]);

    return (
      <TouchableOpacity
        style={[
          styles.studentCard,
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
        accessibilityLabel={`${item.name}, ${item.email}, SIS ${getSISStatusLabel(
          sisStatus,
        )}`}
      >
        <View
          style={[
            styles.studentAvatar,
            {
              borderRadius: radius.round,
              backgroundColor: colors.primary,
              marginRight: spacing.sm + 2,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              color: "#FFFFFF",
              fontWeight: "700",
              fontSize: typography.body.fontSize,
            }}
          >
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.studentInfo}>
          <View style={styles.studentNameRow}>
            <View
              style={{
                flex: 1,
                paddingRight: spacing.sm,
              }}
            >
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {item.name}
              </Text>

              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: 1,
                }}
                numberOfLines={1}
              >
                {item.email}
              </Text>

              {(item.yearLevel || item.section) && (
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize - 1,
                    color: colors.placeholder,
                    marginTop: 1,
                  }}
                  numberOfLines={1}
                >
                  {[item.yearLevel, item.section].filter(Boolean).join(" • ")}
                </Text>
              )}
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: sisColors.background,
                borderColor: sisColors.border,
                borderRadius: radius.sm,
                marginTop: spacing.sm,
              },
            ]}
          >
            <Ionicons
              name={getSISStatusIcon(sisStatus) as any}
              size={14}
              color={sisColors.text}
            />

            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                fontWeight: "700",
                color: sisColors.text,
                marginLeft: 5,
              }}
            >
              SIS {getSISStatusLabel(sisStatus)}
            </Text>
          </View>

          <Text
            style={{
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            {getSISStatusDescription(sisStatus)}
          </Text>

          {updatedDate && (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize - 1,
                color: colors.placeholder,
                marginTop: 4,
              }}
            >
              Last updated: {updatedDate}
            </Text>
          )}

          <View
            style={[
              styles.studentBottomRow,
              {
                marginTop: spacing.sm,
              },
            ]}
          >
            <View
              style={[
                styles.tagRow,
                {
                  gap: 6,
                  flex: 1,
                  paddingRight: spacing.sm,
                },
              ]}
            >
              {item.disabilityTypes.length > 0 ? (
                item.disabilityTypes.map((type) => (
                  <View
                    key={type}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: colors.primaryLight + "1A",
                        borderColor: colors.primary,
                        borderRadius: radius.sm,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
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
                    fontSize: 11,
                    color: colors.placeholder,
                    fontStyle: "italic",
                  }}
                >
                  No profile yet
                </Text>
              )}
            </View>

            <View
              style={[
                styles.viewSISAction,
                {
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                View SIS
              </Text>

              <Ionicons
                name="arrow-forward"
                size={14}
                color={colors.primary}
                style={{
                  marginLeft: 4,
                }}
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm + 4,
            paddingBottom: spacing.sm,
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
          Guidance Dashboard
        </Text>

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 2,
          }}
        >
          Welcome, {user?.name || "Counselor"}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{
            marginTop: 60,
          }}
          accessibilityLabel="Loading dashboard"
        />
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
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          ListHeaderComponent={
            <>
              {/* Existing Dashboard Statistics */}
              {stats && (
                <View
                  style={[
                    styles.statsRow,
                    {
                      gap: 10,
                      marginTop: spacing.sm + 4,
                      marginBottom: spacing.lg,
                    },
                  ]}
                >
                  {renderStatCard("Students", stats.totalStudents)}

                  {renderStatCard("Sessions", stats.totalSessions)}

                  {renderStatCard("Active Now", stats.activeSessions)}

                  {renderStatCard(
                    "Profiles Done",
                    `${stats.profileCompletionRate}%`,
                  )}
                </View>
              )}

              {/* SIS Completion Tracking */}
              <View
                style={[
                  styles.sisTrackingCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    marginBottom: spacing.lg,
                  },
                ]}
              >
                {/* Section Header */}
                <View style={styles.sectionHeaderRow}>
                  <View
                    style={[
                      styles.sectionIcon,
                      {
                        backgroundColor: colors.primaryLight + "18",
                        borderRadius: radius.md,
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </View>

                  <View
                    style={{
                      flex: 1,
                      marginLeft: spacing.sm,
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
                      SIS Completion
                    </Text>

                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        color: colors.textSecondary,
                        marginTop: 2,
                        lineHeight: typography.caption.fontSize + 5,
                      }}
                    >
                      Track each student's Student Information Sheet progress.
                    </Text>
                  </View>
                </View>

                {/* Status Explanation */}
                <View
                  style={[
                    styles.infoBox,
                    {
                      backgroundColor: colors.secondaryBackground,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                      padding: spacing.sm + 2,
                      marginTop: spacing.md,
                    },
                  ]}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={colors.primary}
                  />

                  <Text
                    style={{
                      flex: 1,
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize,
                      color: colors.textSecondary,
                      marginLeft: 7,
                      lineHeight: typography.caption.fontSize + 5,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      Status guide:{" "}
                    </Text>
                    Completed means the SIS was submitted. In Progress means the
                    student has started it. Not Started means no SIS information
                    has been submitted yet.
                  </Text>
                </View>

                {/* Completion Overview */}
                <View
                  style={{
                    marginTop: spacing.md,
                  }}
                >
                  <View style={styles.completionHeader}>
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      Overall completion
                    </Text>

                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.body.fontSize,
                        fontWeight: "700",
                        color: colors.primary,
                      }}
                    >
                      {completionPercentage}%
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
                    accessibilityLabel={`SIS completion: ${completionPercentage}%`}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${completionPercentage}%`,
                          backgroundColor: colors.success,
                          borderRadius: radius.round,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize - 1,
                      color: colors.textSecondary,
                      marginTop: 5,
                    }}
                  >
                    {sisCounts.completed} of {sisCounts.total} students have
                    completed their SIS.
                  </Text>
                </View>

                {/* SIS Status Cards */}
                <View
                  style={[
                    styles.sisStatsRow,
                    {
                      gap: 8,
                      marginTop: spacing.md,
                    },
                  ]}
                >
                  {renderSISStatCard(
                    "Completed",
                    sisCounts.completed,
                    "completed",
                  )}

                  {renderSISStatCard(
                    "In Progress",
                    sisCounts.inProgress,
                    "in_progress",
                  )}

                  {renderSISStatCard(
                    "Not Started",
                    sisCounts.notStarted,
                    "not_started",
                  )}
                </View>
              </View>

              {/* Search */}
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 6,
                }}
              >
                Find a Student
              </Text>

              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: colors.secondaryBackground,
                    borderColor: colors.border,
                    borderRadius: radius.sm + 2,
                    paddingHorizontal: spacing.sm + 6,
                    paddingVertical: spacing.sm + 2,
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    color: colors.text,
                    marginBottom: spacing.md,
                  },
                ]}
                placeholder="Search by name or email"
                placeholderTextColor={colors.placeholder}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={loadData}
                returnKeyType="search"
                accessibilityLabel="Search students by name or email"
              />

              {/* Profile Filters */}
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 6,
                }}
              >
                Profile Filter
              </Text>

              <FlatList
                horizontal
                data={DISABILITY_FILTERS}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                style={{
                  marginBottom: spacing.md,
                }}
                renderItem={({ item }) => {
                  const isActive = activeFilter === item;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        {
                          paddingHorizontal: spacing.sm + 6,
                          paddingVertical: spacing.sm,
                          borderRadius: radius.xl,
                          borderColor: isActive
                            ? colors.primary
                            : colors.border,
                          backgroundColor: isActive
                            ? colors.primary
                            : colors.surface,
                          marginRight: 8,
                        },
                      ]}
                      onPress={() => setActiveFilter(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Profile filter: ${item}`}
                      accessibilityState={{
                        selected: isActive,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          fontWeight: "600",
                          color: isActive ? "#FFFFFF" : colors.textSecondary,
                        }}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Course Filters */}
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 6,
                }}
              >
                Course Filter
              </Text>

              <FlatList
                horizontal
                data={COURSE_FILTERS}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                style={{
                  marginBottom: spacing.md,
                }}
                renderItem={({ item }) => {
                  const isActive = activeCourseFilter === item;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        {
                          paddingHorizontal: spacing.sm + 6,
                          paddingVertical: spacing.sm,
                          borderRadius: radius.xl,
                          borderColor: isActive
                            ? colors.primary
                            : colors.border,
                          backgroundColor: isActive
                            ? colors.primary
                            : colors.surface,
                          marginRight: 8,
                        },
                      ]}
                      onPress={() => setActiveCourseFilter(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Course filter: ${item}`}
                      accessibilityState={{
                        selected: isActive,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          fontWeight: "600",
                          color: isActive ? "#FFFFFF" : colors.textSecondary,
                        }}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* SIS Status Filters */}
              <View style={styles.sisFilterHeader}>
                <View>
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    SIS Status Filter
                  </Text>

                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize - 1,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    Choose a status to narrow the student list.
                  </Text>
                </View>

                {activeSISFilter !== "all" && (
                  <TouchableOpacity
                    onPress={() => setActiveSISFilter("all")}
                    accessibilityRole="button"
                    accessibilityLabel="Clear SIS status filter"
                    style={{
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 5,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        fontWeight: "700",
                        color: colors.primary,
                      }}
                    >
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                horizontal
                data={SIS_FILTERS}
                keyExtractor={(item) => item.value}
                showsHorizontalScrollIndicator={false}
                style={{
                  marginTop: spacing.sm,
                  marginBottom: spacing.md,
                }}
                renderItem={({ item }) => {
                  const isActive = activeSISFilter === item.value;

                  return (
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        {
                          paddingHorizontal: spacing.sm + 8,
                          paddingVertical: spacing.sm,
                          borderRadius: radius.xl,
                          borderColor: isActive
                            ? colors.primary
                            : colors.border,
                          backgroundColor: isActive
                            ? colors.primary
                            : colors.surface,
                          marginRight: 8,
                        },
                      ]}
                      onPress={() => setActiveSISFilter(item.value)}
                      accessibilityRole="button"
                      accessibilityLabel={`SIS status filter: ${item.label}`}
                      accessibilityState={{
                        selected: isActive,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                          fontWeight: "600",
                          color: isActive ? "#FFFFFF" : colors.textSecondary,
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />

              {/* Current View */}
              <View
                style={[
                  styles.currentViewCard,
                  {
                    backgroundColor: colors.secondaryBackground,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: spacing.sm + 2,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <View style={styles.currentViewIcon}>
                  <Ionicons
                    name="funnel-outline"
                    size={17}
                    color={colors.primary}
                  />
                </View>

                <View
                  style={{
                    flex: 1,
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize - 1,
                      color: colors.textSecondary,
                    }}
                  >
                    CURRENT VIEW
                  </Text>

                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.body.fontSize,
                      fontWeight: "700",
                      color: colors.text,
                      marginTop: 1,
                    }}
                  >
                    {getCurrentSISFilterLabel()}
                    {activeCourseFilter !== "All"
                      ? ` • ${activeCourseFilter}`
                      : ""}
                  </Text>
                </View>

                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  {visibleStudents.length}
                </Text>
              </View>

              {/* Action Guidance */}
              {activeSISFilter !== "all" && (
                <View
                  style={[
                    styles.actionHint,
                    {
                      backgroundColor:
                        getSISStatusColors(activeSISFilter).background,
                      borderColor: getSISStatusColors(activeSISFilter).border,
                      borderRadius: radius.md,
                      padding: spacing.sm + 2,
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  <Ionicons
                    name={getSISStatusIcon(activeSISFilter) as any}
                    size={18}
                    color={getSISStatusColors(activeSISFilter).text}
                  />

                  <View
                    style={{
                      flex: 1,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {getSISStatusLabel(activeSISFilter)} students
                    </Text>

                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        color: colors.textSecondary,
                        marginTop: 2,
                        lineHeight: typography.caption.fontSize + 4,
                      }}
                    >
                      {getSISActionText(activeSISFilter)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Error */}
              {error && students.length === 0 && (
                <View
                  style={[
                    styles.stateBox,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.lg,
                      padding: spacing.lg,
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  <Ionicons
                    name="cloud-offline-outline"
                    size={28}
                    color={colors.textSecondary}
                  />

                  <Text
                    style={{
                      fontFamily: typography.body.fontFamily,
                      fontSize: typography.body.fontSize,
                      color: colors.text,
                      textAlign: "center",
                      marginTop: spacing.sm,
                    }}
                  >
                    We couldn't load the dashboard.
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.retryButton,
                      {
                        backgroundColor: colors.primary,
                        borderRadius: radius.md,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.lg,
                        marginTop: spacing.md,
                      },
                    ]}
                    onPress={loadData}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading dashboard"
                  >
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontWeight: "700",
                        color: "#FFFFFF",
                      }}
                    >
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !error ? (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    padding: spacing.lg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.emptyIcon,
                    {
                      backgroundColor: colors.secondaryBackground,
                      borderRadius: radius.round,
                    },
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={30}
                    color={colors.textSecondary}
                  />
                </View>

                <Text
                  style={{
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    fontWeight: "700",
                    color: colors.text,
                    textAlign: "center",
                    marginTop: spacing.sm,
                  }}
                >
                  {activeSISFilter === "all"
                    ? "No students found"
                    : `No ${getSISStatusLabel(
                        activeSISFilter,
                      ).toLowerCase()} students`}
                </Text>

                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.textSecondary,
                    textAlign: "center",
                    marginTop: 4,
                    lineHeight: typography.caption.fontSize + 5,
                  }}
                >
                  {activeSISFilter === "all"
                    ? "Try changing your search, profile, or course filter."
                    : "Try selecting another SIS status or clearing the current filters."}
                </Text>

                {(activeSISFilter !== "all" ||
                  activeCourseFilter !== "All") && (
                  <TouchableOpacity
                    onPress={() => {
                      setActiveSISFilter("all");
                      setActiveCourseFilter("All");
                    }}
                    style={[
                      styles.clearFilterButton,
                      {
                        borderColor: colors.primary,
                        borderRadius: radius.md,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        marginTop: spacing.md,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Show all students"
                  >
                    <Text
                      style={{
                        fontFamily: typography.caption.fontFamily,
                        fontSize: typography.caption.fontSize,
                        fontWeight: "700",
                        color: colors.primary,
                      }}
                    >
                      Show All Students
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
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

  header: {},

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  statCard: {
    flexBasis: "47%",
    borderWidth: 1,
  },

  /*
   * SIS Tracking
   */
  sisTrackingCard: {
    borderWidth: 1,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
  },

  completionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  progressTrack: {
    height: 9,
    width: "100%",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    minWidth: 0,
  },

  sisStatsRow: {
    flexDirection: "row",
  },

  sisStatCard: {
    flex: 1,
    borderWidth: 1,
    minWidth: 0,
  },

  sisStatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sisStatIcon: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },

  /*
   * Search / filters
   */
  searchInput: {
    borderWidth: 1,
  },

  filterChip: {
    borderWidth: 1,
  },

  sisFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  currentViewCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },

  currentViewIcon: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  actionHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
  },

  /*
   * Course grouping
   */
  courseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },

  /*
   * Student cards
   */
  studentCard: {
    flexDirection: "row",
    borderWidth: 1,
    alignItems: "flex-start",
  },

  studentAvatar: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },

  studentInfo: {
    flex: 1,
  },

  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  studentBottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  viewSISAction: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },

  /*
   * Empty / error states
   */
  stateBox: {
    alignItems: "center",
    borderWidth: 1,
  },

  retryButton: {
    alignItems: "center",
  },

  emptyState: {
    alignItems: "center",
    borderWidth: 1,
    marginTop: 4,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    justifyContent: "center",
    alignItems: "center",
  },

  clearFilterButton: {
    borderWidth: 1,
  },
});
