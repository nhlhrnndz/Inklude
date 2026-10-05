//app/(app)/guidance/students.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { COLLEGES, getCollegeForCourse } from "../../../constants/courses";
import { useTheme } from "../../../context/ThemeContext";
import { getStudents } from "../../../utils/api";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

type Student = {
  id: number;
  name: string;
  email: string;
  disabilityTypes: string[];
  course?: string | null;
  yearLevel?: string | null;
  section?: string | null;
  flags?: { needsHelp: boolean };
};

type CollegeBucket = {
  code: string;
  name: string;
  count: number;
};

type YearBucket = {
  year: string;
  count: number;
};

type ViewLevel = "colleges" | "years" | "students";

const ALL_CODE = "ALL";
const NOT_SET_YEAR = "Not Set";

export default function GuidanceStudentsScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const [view, setView] = useState<ViewLevel>("colleges");
  const [selectedCollege, setSelectedCollege] = useState<CollegeBucket | null>(
    null,
  );
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadStudents = async () => {
    setError(false);

    try {
      const res = await getStudents({});
      setStudents(res.students ?? []);
    } catch (err: any) {
      setError(true);

      Toast.show({
        type: "error",
        text1: "Failed to load students",
        text2: err.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // "All Students" always includes everyone, matched course or not — this
  // is where old free-text course values (saved before the dropdown
  // existed) stay reachable. The real college tiles only count students
  // whose course exactly matches that college's official list.
  const collegeBuckets: CollegeBucket[] = useMemo(() => {
    const allBucket: CollegeBucket = {
      code: ALL_CODE,
      name: "Every student, regardless of course",
      count: students.length,
    };

    const collegeTiles = COLLEGES.map((college) => ({
      code: college.code,
      name: college.name,
      count: students.filter(
        (s) => getCollegeForCourse(s.course)?.code === college.code,
      ).length,
    }));

    return [allBucket, ...collegeTiles];
  }, [students]);

  const studentsInSelectedCollege = useMemo(() => {
    if (!selectedCollege) {
      return [];
    }

    if (selectedCollege.code === ALL_CODE) {
      return students;
    }

    return students.filter(
      (s) => getCollegeForCourse(s.course)?.code === selectedCollege.code,
    );
  }, [students, selectedCollege]);

  const yearBuckets: YearBucket[] = useMemo(() => {
    const buckets = YEAR_LEVELS.map((year) => ({
      year,
      count: studentsInSelectedCollege.filter((s) => s.yearLevel === year)
        .length,
    }));

    const notSetCount = studentsInSelectedCollege.filter(
      (s) => !s.yearLevel || !s.yearLevel.trim(),
    ).length;

    if (notSetCount > 0) {
      buckets.push({ year: NOT_SET_YEAR, count: notSetCount });
    }

    return buckets;
  }, [studentsInSelectedCollege]);

  const studentsInSelectedYear = useMemo(() => {
    if (!selectedYear) {
      return [];
    }

    const base =
      selectedYear === NOT_SET_YEAR
        ? studentsInSelectedCollege.filter(
            (s) => !s.yearLevel || !s.yearLevel.trim(),
          )
        : studentsInSelectedCollege.filter((s) => s.yearLevel === selectedYear);

    const term = search.trim().toLowerCase();

    const filtered = !term
      ? base
      : base.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.email.toLowerCase().includes(term),
        );

    // Students who told a teacher they need help go first. The sort is
    // stable, so everyone else keeps the server's course / name order.
    return [...filtered].sort(
      (a, b) => Number(!!b.flags?.needsHelp) - Number(!!a.flags?.needsHelp),
    );
  }, [studentsInSelectedCollege, selectedYear, search]);

  const handleSelectCollege = (bucket: CollegeBucket) => {
    setSelectedCollege(bucket);
    setView("years");
  };

  const handleSelectYear = (bucket: YearBucket) => {
    setSelectedYear(bucket.year);
    setSearch("");
    setView("students");
  };

  const handleBack = () => {
    if (view === "students") {
      setView("years");
      setSelectedYear(null);
      setSearch("");
      return;
    }

    if (view === "years") {
      setView("colleges");
      setSelectedCollege(null);
      return;
    }
  };

  const collegeLabel = (code: string) => (code === ALL_CODE ? "All" : code);

  const headerTitle = () => {
    if (view === "colleges") return "Students by College";
    if (view === "years")
      return selectedCollege ? collegeLabel(selectedCollege.code) : "";
    return `${
      selectedCollege ? collegeLabel(selectedCollege.code) : ""
    } • ${selectedYear ?? ""}`;
  };

  const headerSubtitle = () => {
    if (view === "colleges") {
      return "Tap a college to browse its students by year level.";
    }
    if (view === "years") {
      return selectedCollege?.name ?? "";
    }
    return "Tap a student to view their record.";
  };

  const renderGridBox = (
    key: string,
    label: string,
    sublabel: string | undefined,
    count: number,
    onPress: () => void,
    highlighted?: boolean,
  ) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} students`}
      style={[
        styles.gridBox,
        {
          backgroundColor: highlighted
            ? colors.primaryLight + "18"
            : colors.secondaryBackground,
          borderColor: highlighted ? colors.primary : colors.border,
          borderRadius: radius.lg,
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
        numberOfLines={1}
      >
        {label}
      </Text>

      {!!sublabel && (
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize - 1,
            color: colors.textSecondary,
            marginTop: 4,
            textAlign: "center",
          }}
          numberOfLines={2}
        >
          {sublabel}
        </Text>
      )}

      <View
        style={[
          styles.countPill,
          {
            backgroundColor: colors.primary,
            borderRadius: radius.round,
            marginTop: spacing.sm,
          },
        ]}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontWeight: "700",
            fontSize: 12,
          }}
        >
          {count} student{count === 1 ? "" : "s"}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderStudentRow = ({ item }: { item: Student }) => {
    const needsHelp = !!item.flags?.needsHelp;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/guidance/student/${item.id}`)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.email}${
          needsHelp ? ", needs help" : ""
        }`}
        style={[
          styles.studentRow,
          {
            backgroundColor: colors.surface,
            borderColor: needsHelp ? colors.warning : colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            marginBottom: spacing.sm,
          },
        ]}
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

          {!!item.course && (
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize - 1,
                color: colors.placeholder,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {item.course}
              {item.section ? ` • Section ${item.section}` : ""}
            </Text>
          )}
        </View>

        {needsHelp && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: colors.warning + "22",
              borderColor: colors.warning,
              borderWidth: 1,
              borderRadius: radius.sm,
              paddingHorizontal: 8,
              paddingVertical: 3,
              marginRight: spacing.sm,
            }}
          >
            <Ionicons
              name="alert-circle"
              size={13}
              color={colors.warning}
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              Needs help
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

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading students"
        />
      </SafeAreaView>
    );
  }

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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {view !== "colleges" && (
            <TouchableOpacity
              onPress={handleBack}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={{ marginRight: 10 }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
          )}

          <Text
            style={{
              fontFamily: typography.title.fontFamily,
              fontSize: typography.title.fontSize,
              fontWeight: "700",
              color: colors.text,
            }}
            accessibilityRole="header"
          >
            {headerTitle()}
          </Text>
        </View>

        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            marginTop: 4,
          }}
        >
          {headerSubtitle()}
        </Text>
      </View>

      {error && students.length === 0 ? (
        <View style={{ alignItems: "center", padding: spacing.lg }}>
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={colors.textSecondary}
          />
          <Text
            style={{
              color: colors.text,
              marginTop: spacing.sm,
              textAlign: "center",
            }}
          >
            We couldn't load the student list.
          </Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              loadStudents();
            }}
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
      ) : view === "colleges" ? (
        <FlatList
          key="colleges-grid"
          data={collegeBuckets}
          keyExtractor={(item) => item.code}
          numColumns={3}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadStudents();
          }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 40,
          }}
          columnWrapperStyle={{ gap: spacing.sm, marginBottom: spacing.sm }}
          renderItem={({ item }) =>
            renderGridBox(
              item.code,
              collegeLabel(item.code),
              undefined,
              item.count,
              () => handleSelectCollege(item),
              item.code === ALL_CODE,
            )
          }
        />
      ) : view === "years" ? (
        <FlatList
          key="years-grid"
          data={yearBuckets}
          keyExtractor={(item) => item.year}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 40,
          }}
          columnWrapperStyle={{ gap: spacing.sm, marginBottom: spacing.sm }}
          renderItem={({ item }) =>
            renderGridBox(item.year, item.year, undefined, item.count, () =>
              handleSelectYear(item),
            )
          }
          ListEmptyComponent={
            <Text
              style={{
                color: colors.textSecondary,
                textAlign: "center",
                marginTop: 40,
              }}
            >
              No students in this college yet.
            </Text>
          }
        />
      ) : (
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
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
              marginBottom: spacing.md,
            }}
            placeholder="Search by name or email"
            placeholderTextColor={colors.placeholder}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search students by name or email"
          />

          <FlatList
            key="students-list"
            data={studentsInSelectedYear}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderStudentRow}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListEmptyComponent={
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginTop: 40,
                }}
              >
                {search
                  ? "No students match your search."
                  : "No students in this year level yet."}
              </Text>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gridBox: {
    flex: 1,
    minHeight: 120,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
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
