import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  COLLEGES,
  getCollegeForCourse,
} from "../../../constants/courses";
import { useTheme } from "../../../context/ThemeContext";
import { getStudents } from "../../../utils/api";

type Student = {
  id: number;
  name: string;
  email: string;
  disabilityTypes: string[];
  accessibilityPreferences?: Record<string, unknown>;
  course?: string | null;
  yearLevel?: string | null;
  section?: string | null;
  sisStatus?: "completed" | "in_progress" | "not_started";
  flags?: {
    needsHelp: boolean;
    followupNeeded?: boolean;
  };
};

type Screen = "colleges" | "students";

type SisFilter = "" | "complete" | "incomplete";
type FollowupFilter = "" | "needed";

const SUPPORT_CATEGORIES = [
  "Deaf",
  "Hard of Hearing",
  "Non-Verbal",
  "Autism",
  "ADHD",
  "Dyslexia",
];

const YEAR_LEVELS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
];

function normalizeStudents(data: any): Student[] {
  if (!Array.isArray(data?.students)) {
    return [];
  }

  return data.students.map((student: any) => ({
    id: Number(student.id),
    name: String(student.name || ""),
    email: String(student.email || ""),
    disabilityTypes: Array.isArray(student.disabilityTypes)
      ? student.disabilityTypes
      : [],
    accessibilityPreferences:
      student.accessibilityPreferences || {},
    course: student.course ?? null,
    yearLevel: student.yearLevel ?? null,
    section: student.section ?? null,
    sisStatus:
      student.sisStatus === "completed" ||
      student.sisStatus === "in_progress" ||
      student.sisStatus === "not_started"
        ? student.sisStatus
        : "not_started",
    flags: {
      needsHelp: Boolean(student.flags?.needsHelp),
      followupNeeded: Boolean(student.flags?.followupNeeded),
    },
  }));
}

function getStudentCollege(student: Student) {
  return getCollegeForCourse(student.course);
}

function getSisLabel(status?: Student["sisStatus"]) {
  if (status === "completed") return "SIS Complete";
  if (status === "in_progress") return "SIS In Progress";
  return "SIS Incomplete";
}

export default function GuidanceStudentsScreen() {
  const router = useRouter();

  const {
    colors,
    typography,
    spacing,
    radius,
    a11y,
    reduceMotion,
  } = useTheme();

  const [screen, setScreen] = useState<Screen>("colleges");

  const [selectedCollege, setSelectedCollege] = useState<string | null>(
    null,
  );

  const [students, setStudents] = useState<Student[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [yearFilter, setYearFilter] = useState("");
  const [needFilter, setNeedFilter] = useState("");

  const [sisFilter, setSisFilter] = useState<SisFilter>("");
  const [followupFilter, setFollowupFilter] =
    useState<FollowupFilter>("");

  const [sort, setSort] = useState<"name_asc">("name_asc");

  const [filtersOpen, setFiltersOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const requestIdRef = useRef(0);

  /*
   * Debounce search.
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  /*
   * Reset search/filter state when moving back to colleges.
   */
  const resetDirectoryState = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setYearFilter("");
    setNeedFilter("");
    setSisFilter("");
    setFollowupFilter("");
    setSort("name_asc");
    setFiltersOpen(false);
  }, []);

  /*
   * Fetch students from the server.
   *
   * IMPORTANT:
   * The actual search/filtering is performed by the backend.
   */
  const loadStudents = useCallback(
    async (isRefresh = false) => {
      const requestId = ++requestIdRef.current;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const data = await getStudents({
          college: selectedCollege || undefined,
          q: debouncedSearch || undefined,
          year: yearFilter || undefined,
          need: needFilter || undefined,
          sis: sisFilter || undefined,
          followup: followupFilter || undefined,
          sort,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        setStudents(normalizeStudents(data));
      } catch (err) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        console.error("Guidance students load error:", err);

        setStudents([]);
        setError(
          "Unable to load students right now. Please try again.",
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      selectedCollege,
      debouncedSearch,
      yearFilter,
      needFilter,
      sisFilter,
      followupFilter,
      sort,
    ],
  );

  /*
   * Initial load and every server-side filter change.
   */
  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  /*
   * College counts are grouped from the server-filtered search
   * results. This is grouping/display logic, not filtering.
   */
  const collegeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    COLLEGES.forEach((college) => {
      counts[college.code] = 0;
    });

    students.forEach((student) => {
      const college = getStudentCollege(student);

      if (college) {
        counts[college.code] =
          (counts[college.code] || 0) + 1;
      }
    });

    return counts;
  }, [students]);

  /*
   * Search on the first screen is global.
   *
   * If the user searches, display the matching students directly
   * instead of forcing them to select a college first.
   */
  const globalSearchResults =
    screen === "colleges" && debouncedSearch.length > 0
      ? students
      : [];

  const activeFilterCount =
    Number(Boolean(yearFilter)) +
    Number(Boolean(needFilter)) +
    Number(Boolean(sisFilter)) +
    Number(Boolean(followupFilter));

  const selectedCollegeInfo = useMemo(
    () =>
      COLLEGES.find(
        (college) => college.code === selectedCollege,
      ) ?? null,
    [selectedCollege],
  );

  const clearFilters = useCallback(() => {
    setYearFilter("");
    setNeedFilter("");
    setSisFilter("");
    setFollowupFilter("");
    setSort("name_asc");
  }, []);

  const openCollege = useCallback(
    (collegeCode: string) => {
      setSelectedCollege(collegeCode);
      setScreen("students");
      setSearch("");
      setDebouncedSearch("");
      setYearFilter("");
      setNeedFilter("");
      setSisFilter("");
      setFollowupFilter("");
      setSort("name_asc");
      setFiltersOpen(false);
    },
    [],
  );

  const goBackToColleges = useCallback(() => {
    setScreen("colleges");
    setSelectedCollege(null);
    resetDirectoryState();
  }, [resetDirectoryState]);

  const openStudent = useCallback(
    (studentId: number) => {
      router.push(`/guidance/student/${studentId}`);
    },
    [router],
  );

  const renderStudent = useCallback(
    ({ item }: { item: Student }) => {
      const college = getStudentCollege(item);

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open student ${item.name}`}
          onPress={() => openStudent(item.id)}
          style={({ pressed }) => [
            styles.studentCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
              marginBottom: spacing.sm,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.avatar,
              {
                width: a11y.largerButtons ? 52 : 46,
                height: a11y.largerButtons ? 52 : 46,
                borderRadius: radius.round,
                backgroundColor: colors.secondaryBackground,
              },
            ]}
          >
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                lineHeight: typography.title.lineHeight,
                fontWeight: typography.title.fontWeight,
                color: colors.primary,
              }}
            >
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.studentMain}>
            <View style={styles.nameRow}>
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontFamily: typography.title.fontFamily,
                  fontSize: typography.title.fontSize,
                  lineHeight: typography.title.lineHeight,
                  fontWeight: typography.title.fontWeight,
                  color: colors.text,
                }}
              >
                {item.name}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </View>

            <Text
              numberOfLines={1}
              style={{
                marginTop: spacing.xs,
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                lineHeight: typography.caption.lineHeight,
                fontWeight: typography.caption.fontWeight,
                color: colors.textSecondary,
              }}
            >
              {item.email}
            </Text>

            <View
              style={[
                styles.detailRow,
                { marginTop: spacing.sm },
              ]}
            >
              {item.course ? (
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    lineHeight: typography.caption.lineHeight,
                    fontWeight: typography.caption.fontWeight,
                    color: colors.text,
                  }}
                >
                  {item.course}
                </Text>
              ) : (
                <Text
                  style={{
                    flex: 1,
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    lineHeight: typography.caption.lineHeight,
                    fontWeight: typography.caption.fontWeight,
                    color: colors.textSecondary,
                  }}
                >
                  Course not set
                </Text>
              )}
            </View>

            <View
              style={[
                styles.metaRow,
                { marginTop: spacing.xs },
              ]}
            >
              {item.yearLevel ? (
                <Text
                  style={{
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    lineHeight: typography.caption.lineHeight,
                    fontWeight: typography.caption.fontWeight,
                    color: colors.textSecondary,
                  }}
                >
                  {item.yearLevel}
                  {item.section ? ` • ${item.section}` : ""}
                </Text>
              ) : null}

              {college ? (
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    marginLeft: spacing.sm,
                    fontFamily: typography.small.fontFamily,
                    fontSize: typography.small.fontSize,
                    lineHeight: typography.small.lineHeight,
                    fontWeight: typography.small.fontWeight,
                    color: colors.textSecondary,
                    textAlign: "right",
                  }}
                >
                  {college.code}
                </Text>
              ) : null}
            </View>

            <View
              style={[
                styles.badgeRow,
                { marginTop: spacing.sm },
              ]}
            >
              <View
                style={{
                  borderRadius: radius.round,
                  backgroundColor:
                    item.sisStatus === "completed"
                      ? colors.success
                      : colors.secondaryBackground,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.xs,
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.small.fontFamily,
                    fontSize: typography.small.fontSize,
                    lineHeight: typography.small.lineHeight,
                    fontWeight: typography.small.fontWeight,
                    color:
                      item.sisStatus === "completed"
                        ? colors.surface
                        : colors.textSecondary,
                  }}
                >
                  {getSisLabel(item.sisStatus)}
                </Text>
              </View>

              {item.flags?.followupNeeded ? (
                <View
                  style={{
                    marginLeft: spacing.xs,
                    borderRadius: radius.round,
                    backgroundColor: colors.warning,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.small.fontFamily,
                      fontSize: typography.small.fontSize,
                      lineHeight: typography.small.lineHeight,
                      fontWeight: typography.small.fontWeight,
                      color: colors.surface,
                    }}
                  >
                    Follow-up
                  </Text>
                </View>
              ) : null}

              {item.flags?.needsHelp ? (
                <View
                  style={{
                    marginLeft: spacing.xs,
                    borderRadius: radius.round,
                    backgroundColor: colors.error,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: typography.small.fontFamily,
                      fontSize: typography.small.fontSize,
                      lineHeight: typography.small.lineHeight,
                      fontWeight: typography.small.fontWeight,
                      color: colors.surface,
                    }}
                  >
                    Needs help
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      );
    },
    [
      a11y.largerButtons,
      colors,
      openStudent,
      radius,
      spacing,
      typography,
    ],
  );

  const renderCollege = useCallback(
    ({ item }: { item: (typeof COLLEGES)[number] }) => {
      const count = collegeCounts[item.code] || 0;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.name}, ${count} students`}
          onPress={() => openCollege(item.code)}
          style={({ pressed }) => [
            styles.collegeCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: radius.lg,
              padding: spacing.md,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.collegeIcon,
              {
                width: 46,
                height: 46,
                borderRadius: radius.md,
                backgroundColor: colors.secondaryBackground,
              },
            ]}
          >
            <Ionicons
              name="school-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <Text
            style={{
              marginTop: spacing.sm,
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              lineHeight: typography.title.lineHeight,
              fontWeight: typography.title.fontWeight,
              color: colors.text,
            }}
          >
            {item.code}
          </Text>

          <Text
            numberOfLines={3}
            style={{
              marginTop: spacing.xs,
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              lineHeight: typography.caption.lineHeight,
              fontWeight: typography.caption.fontWeight,
              color: colors.textSecondary,
            }}
          >
            {item.name}
          </Text>

          <Text
            style={{
              marginTop: spacing.sm,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              lineHeight: typography.body.lineHeight,
              fontWeight: typography.body.fontWeight,
              color: colors.primary,
            }}
          >
            {count} {count === 1 ? "student" : "students"}
          </Text>
        </Pressable>
      );
    },
    [
      collegeCounts,
      colors,
      openCollege,
      radius,
      spacing,
      typography,
    ],
  );

  const renderEmpty = useCallback(
    (message: string) => (
      <View
        style={[
          styles.empty,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.xl,
          },
        ]}
      >
        <Ionicons
          name="people-outline"
          size={40}
          color={colors.textSecondary}
        />

        <Text
          style={{
            marginTop: spacing.md,
            fontFamily: typography.title.fontFamily,
            fontSize: typography.title.fontSize,
            lineHeight: typography.title.lineHeight,
            fontWeight: typography.title.fontWeight,
            color: colors.text,
            textAlign: "center",
          }}
        >
          No students found
        </Text>

        <Text
          style={{
            marginTop: spacing.xs,
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            lineHeight: typography.body.lineHeight,
            fontWeight: typography.body.fontWeight,
            color: colors.textSecondary,
            textAlign: "center",
          }}
        >
          {message}
        </Text>
      </View>
    ),
    [colors, radius, spacing, typography],
  );

  const filterButton = (
  key: string,
  label: string,
  active: boolean,
  onPress: () => void,
) => (
  <Pressable
    key={key}
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={({ pressed }) => [
      styles.filterChip,
      {
        borderColor: active
          ? colors.primary
          : colors.border,
        backgroundColor: active
          ? colors.primary
          : colors.surface,
        borderRadius: radius.round,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.75 : 1,
      },
    ]}
  >
    <Text
      style={{
        fontFamily: typography.caption.fontFamily,
        fontSize: typography.caption.fontSize,
        lineHeight: typography.caption.lineHeight,
        fontWeight: "600",
        color: active
          ? colors.surface
          : colors.text,
      }}
    >
      {label}
    </Text>
  </Pressable>
);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: spacing.md,
            borderBottomColor: colors.divider,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.headerTop}>
          {screen === "students" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to colleges"
              onPress={goBackToColleges}
              hitSlop={10}
              style={[
                styles.backButton,
                {
                  minWidth: a11y.largerButtons ? 48 : 40,
                  minHeight: a11y.largerButtons ? 48 : 40,
                  borderRadius: radius.round,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={colors.text}
              />
            </Pressable>
          ) : null}

          <View
            style={{
              flex: 1,
              marginLeft:
                screen === "students" ? spacing.sm : 0,
            }}
          >
            <Text
              style={{
                fontFamily: typography.h1.fontFamily,
                fontSize: typography.h1.fontSize,
                lineHeight: typography.h1.lineHeight,
                fontWeight: typography.h1.fontWeight,
                color: colors.text,
              }}
            >
              Students
            </Text>

            <Text
              style={{
                marginTop: spacing.xs,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                lineHeight: typography.body.lineHeight,
                fontWeight: typography.body.fontWeight,
                color: colors.textSecondary,
              }}
            >
              {screen === "colleges"
                ? "Browse students by college or search across all colleges."
                : selectedCollegeInfo?.name ||
                  "Students in selected college"}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              marginTop: spacing.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              minHeight: a11y.largerButtons ? 52 : 46,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={21}
            color={colors.textSecondary}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={
              screen === "colleges"
                ? "Search students across all colleges"
                : "Search students in this college"
            }
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            accessible
            accessibilityLabel="Search students"
            style={{
              flex: 1,
              marginLeft: spacing.sm,
              paddingVertical: spacing.sm,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              lineHeight: typography.body.lineHeight,
              fontWeight: typography.body.fontWeight,
              color: colors.text,
            }}
          />

          {search.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch("")}
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? (
        <View
          style={{
            marginHorizontal: spacing.lg,
            marginTop: spacing.md,
            padding: spacing.md,
            borderRadius: radius.md,
            backgroundColor: colors.secondaryBackground,
            borderWidth: 1,
            borderColor: colors.error,
          }}
        >
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              lineHeight: typography.body.lineHeight,
              fontWeight: typography.body.fontWeight,
              color: colors.error,
            }}
          >
            {error}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => loadStudents(true)}
            style={{
              marginTop: spacing.sm,
              alignSelf: "flex-start",
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.round,
              backgroundColor: colors.primary,
            }}
          >
            <Text
              style={{
                fontFamily: typography.button.fontFamily,
                fontSize: typography.button.fontSize,
                lineHeight: typography.button.lineHeight,
                fontWeight: typography.button.fontWeight,
                color: colors.surface,
              }}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      ) : null}

      {loading && students.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={{
              marginTop: spacing.md,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              lineHeight: typography.body.lineHeight,
              fontWeight: typography.body.fontWeight,
              color: colors.textSecondary,
            }}
          >
            Loading students...
          </Text>
        </View>
      ) : screen === "colleges" ? (
        debouncedSearch.length > 0 ? (
          <FlatList
            data={globalSearchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderStudent}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.xxl,
              flexGrow:
                globalSearchResults.length === 0 ? 1 : undefined,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadStudents(true)}
              />
            }
            ListHeaderComponent={
              <View
                style={{
                  marginBottom: spacing.md,
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    fontSize: typography.title.fontSize,
                    lineHeight: typography.title.lineHeight,
                    fontWeight: typography.title.fontWeight,
                    color: colors.text,
                  }}
                >
                  Search results
                </Text>

                <Text
                  style={{
                    marginTop: spacing.xs,
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    lineHeight: typography.caption.lineHeight,
                    fontWeight: typography.caption.fontWeight,
                    color: colors.textSecondary,
                  }}
                >
                  {globalSearchResults.length}{" "}
                  {globalSearchResults.length === 1
                    ? "student"
                    : "students"}{" "}
                  found
                </Text>
              </View>
            }
            ListEmptyComponent={renderEmpty(
              "Try a different name or email address.",
            )}
          />
        ) : (
          <FlatList
            data={COLLEGES}
            keyExtractor={(item) => item.code}
            renderItem={renderCollege}
            numColumns={Platform.OS === "web" ? 3 : 2}
            key={Platform.OS === "web" ? "three" : "two"}
            columnWrapperStyle={{
              gap: spacing.md,
            }}
            contentContainerStyle={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.xxl,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadStudents(true)}
              />
            }
            ListHeaderComponent={
              <View
                style={{
                  marginBottom: spacing.md,
                }}
              >
                <Text
                  style={{
                    fontFamily: typography.title.fontFamily,
                    fontSize: typography.title.fontSize,
                    lineHeight: typography.title.lineHeight,
                    fontWeight: typography.title.fontWeight,
                    color: colors.text,
                  }}
                >
                  Colleges
                </Text>

                <Text
                  style={{
                    marginTop: spacing.xs,
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    lineHeight: typography.caption.lineHeight,
                    fontWeight: typography.caption.fontWeight,
                    color: colors.textSecondary,
                  }}
                >
                  Select a college to view its students.
                </Text>
              </View>
            }
          />
        )
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStudent}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxl,
            flexGrow: students.length === 0 ? 1 : undefined,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadStudents(true)}
            />
          }
          ListHeaderComponent={
            <View>
              <View
                style={[
                  styles.filterHeader,
                  {
                    marginBottom: spacing.sm,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: typography.title.fontFamily,
                      fontSize: typography.title.fontSize,
                      lineHeight: typography.title.lineHeight,
                      fontWeight: typography.title.fontWeight,
                      color: colors.text,
                    }}
                  >
                    Students
                  </Text>

                  <Text
                    style={{
                      marginTop: spacing.xs,
                      fontFamily: typography.caption.fontFamily,
                      fontSize: typography.caption.fontSize,
                      lineHeight: typography.caption.lineHeight,
                      fontWeight: typography.caption.fontWeight,
                      color: colors.textSecondary,
                    }}
                  >
                    {students.length}{" "}
                    {students.length === 1
                      ? "student"
                      : "students"}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    expanded: filtersOpen,
                  }}
                  onPress={() =>
                    setFiltersOpen((value) => !value)
                  }
                  style={{
                    minHeight: a11y.largerButtons ? 48 : 40,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.round,
                    borderWidth: 1,
                    borderColor:
                      activeFilterCount > 0
                        ? colors.primary
                        : colors.border,
                    backgroundColor:
                      activeFilterCount > 0
                        ? colors.secondaryBackground
                        : colors.surface,
                  }}
                >
                  <Ionicons
                    name="options-outline"
                    size={19}
                    color={colors.primary}
                  />

                  <Text
                    style={{
                      marginLeft: spacing.xs,
                      fontFamily: typography.button.fontFamily,
                      fontSize: typography.button.fontSize,
                      lineHeight: typography.button.lineHeight,
                      fontWeight: typography.button.fontWeight,
                      color: colors.text,
                    }}
                  >
                    Filters
                  </Text>

                  {activeFilterCount > 0 ? (
                    <View
                      style={{
                        marginLeft: spacing.xs,
                        minWidth: 22,
                        height: 22,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: radius.round,
                        backgroundColor: colors.primary,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.small.fontFamily,
                          fontSize: typography.small.fontSize,
                          lineHeight: typography.small.lineHeight,
                          fontWeight: "700",
                          color: colors.surface,
                        }}
                      >
                        {activeFilterCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>

              {filtersOpen ? (
                <View
                  style={[
                    styles.filterPanel,
                    {
                      marginBottom: spacing.md,
                      padding: spacing.md,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: typography.button.fontFamily,
                      fontSize: typography.button.fontSize,
                      lineHeight: typography.button.lineHeight,
                      fontWeight: typography.button.fontWeight,
                      color: colors.text,
                    }}
                  >
                    Year level
                  </Text>

                  <View
                    style={[
                      styles.chipWrap,
                      { marginTop: spacing.sm },
                    ]}
                  >
                    {filterButton(
  "year-all",
  "All",
  yearFilter === "",
  () => setYearFilter(""),
)}

{YEAR_LEVELS.map((year) =>
  filterButton(
    `year-${year}`,
    year,
    yearFilter === year,
    () => setYearFilter(year),
  ),
)}
                  </View>

                  <Text
                    style={{
                      marginTop: spacing.md,
                      fontFamily: typography.button.fontFamily,
                      fontSize: typography.button.fontSize,
                      lineHeight: typography.button.lineHeight,
                      fontWeight: typography.button.fontWeight,
                      color: colors.text,
                    }}
                  >
                    Support category
                  </Text>

                  <View
                    style={[
                      styles.chipWrap,
                      { marginTop: spacing.sm },
                    ]}
                  >
                    {filterButton(
  "need-all",
  "All",
  needFilter === "",
  () => setNeedFilter(""),
)}

{SUPPORT_CATEGORIES.map((need) =>
  filterButton(
    `need-${need}`,
    need,
    needFilter === need,
    () => setNeedFilter(need),
  ),
)}
                  </View>

                  <Text
                    style={{
                      marginTop: spacing.md,
                      fontFamily: typography.button.fontFamily,
                      fontSize: typography.button.fontSize,
                      lineHeight: typography.button.lineHeight,
                      fontWeight: typography.button.fontWeight,
                      color: colors.text,
                    }}
                  >
                    SIS status
                  </Text>

                  <View
                    style={[
                      styles.chipWrap,
                      { marginTop: spacing.sm },
                    ]}
                  >
                    {filterButton(
  "sis-all",
  "All",
  sisFilter === "",
  () => setSisFilter(""),
)}

{filterButton(
  "sis-complete",
  "Complete",
  sisFilter === "complete",
  () => setSisFilter("complete"),
)}

{filterButton(
  "sis-incomplete",
  "Incomplete",
  sisFilter === "incomplete",
  () => setSisFilter("incomplete"),
)}
                  </View>

                  <Text
                    style={{
                      marginTop: spacing.md,
                      fontFamily: typography.button.fontFamily,
                      fontSize: typography.button.fontSize,
                      lineHeight: typography.button.lineHeight,
                      fontWeight: typography.button.fontWeight,
                      color: colors.text,
                    }}
                  >
                    Follow-up
                  </Text>

                  <View
                    style={[
                      styles.chipWrap,
                      { marginTop: spacing.sm },
                    ]}
                  >
                    {filterButton(
  "followup-all",
  "All",
  followupFilter === "",
  () => setFollowupFilter(""),
)}

{filterButton(
  "followup-needed",
  "Follow-up needed",
  followupFilter === "needed",
  () => setFollowupFilter("needed"),
)}
                  </View>

                  <Text
                    style={{
                      marginTop: spacing.md,
                      fontFamily: typography.button.fontFamily,
                      fontSize: typography.button.fontSize,
                      lineHeight: typography.button.lineHeight,
                      fontWeight: typography.button.fontWeight,
                      color: colors.text,
                    }}
                  >
                    Sort
                  </Text>

                  <View
                    style={[
                      styles.chipWrap,
                      { marginTop: spacing.sm },
                    ]}
                  >
                    {filterButton(
  "sort-name-asc",
  "Name A–Z",
  sort === "name_asc",
  () => setSort("name_asc"),
)}
                  </View>

                  {activeFilterCount > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={clearFilters}
                      style={{
                        alignSelf: "flex-start",
                        marginTop: spacing.md,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: radius.round,
                        backgroundColor:
                          colors.secondaryBackground,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.button.fontFamily,
                          fontSize: typography.button.fontSize,
                          lineHeight: typography.button.lineHeight,
                          fontWeight: typography.button.fontWeight,
                          color: colors.primary,
                        }}
                      >
                        Clear filters
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={renderEmpty(
            activeFilterCount > 0
              ? "Try changing or clearing the filters."
              : "There are no students in this college yet.",
          )}
        />
      )}

      {loading && students.length > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.loadingOverlay,
            {
              backgroundColor: colors.background,
            },
          ]}
        >
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
  },

  collegeCard: {
    flex: 1,
    minHeight: 190,
    marginBottom: 16,
    borderWidth: 1,
  },

  collegeIcon: {
    alignItems: "center",
    justifyContent: "center",
  },

  studentCard: {
    flexDirection: "row",
    borderWidth: 1,
  },

  avatar: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  studentMain: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },

  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  filterPanel: {
    borderWidth: 1,
  },

  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterChip: {
    borderWidth: 1,
  },

  empty: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
});