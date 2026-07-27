import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getDashboardStats, getStudents } from "../../utils/api";

const DISABILITY_FILTERS = [
  "All",
  "Deaf",
  "Hard of Hearing",
  "Non-Verbal",
  "Autism",
  "ADHD",
  "Dyslexia",
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
};

export default function GuidanceDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, typography, spacing, radius } = useTheme();

  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    setError(false);
    try {
      const statsRes = await getDashboardStats();
      setStats(statsRes.stats);

      const studentsRes = await getStudents({
        disability: activeFilter === "All" ? undefined : activeFilter,
        search: search.trim() || undefined,
      });
      setStudents(studentsRes.students);
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
  }, [activeFilter, search]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

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

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={[
        styles.studentCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md - 2,
          marginBottom: spacing.sm,
        },
      ]}
      onPress={() => router.push(`/guidance/student/${item.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.email}${
        item.disabilityTypes.length > 0
          ? `, tags: ${item.disabilityTypes.join(", ")}`
          : ", no profile yet"
      }`}
    >
      <View
        style={[
          styles.studentAvatar,
          { borderRadius: radius.round, backgroundColor: colors.primary, marginRight: spacing.sm + 2 },
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
        >
          {item.email}
        </Text>
        <View style={[styles.tagRow, { gap: 6, marginTop: 6 }]}>
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
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "600" }}>
                  {type}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 11, color: colors.placeholder, fontStyle: "italic" }}>
              No profile yet
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingHorizontal: spacing.lg, paddingTop: spacing.sm + 4, paddingBottom: spacing.sm },
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
          style={{ marginTop: 60 }}
          accessibilityLabel="Loading dashboard"
        />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStudent}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 40 }}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          ListHeaderComponent={
            <>
              {stats && (
                <View
                  style={[
                    styles.statsRow,
                    { gap: 10, marginTop: spacing.sm + 4, marginBottom: spacing.md },
                  ]}
                >
                  {renderStatCard("Students", stats.totalStudents)}
                  {renderStatCard("Sessions", stats.totalSessions)}
                  {renderStatCard("Active Now", stats.activeSessions)}
                  {renderStatCard("Profiles Done", `${stats.profileCompletionRate}%`)}
                </View>
              )}

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
                    marginBottom: spacing.sm + 4,
                  },
                ]}
                placeholder="Search students by name or email"
                placeholderTextColor={colors.placeholder}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={loadData}
                returnKeyType="search"
                accessibilityLabel="Search students by name or email"
              />

              <FlatList
                horizontal
                data={DISABILITY_FILTERS}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: spacing.md }}
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
                          borderColor: isActive ? colors.primary : colors.border,
                          backgroundColor: isActive ? colors.primary : colors.surface,
                          marginRight: 8,
                        },
                      ]}
                      onPress={() => setActiveFilter(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter: ${item}`}
                      accessibilityState={{ selected: isActive }}
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
                  <Ionicons name="cloud-offline-outline" size={28} color={colors.textSecondary} />
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
                    <Text style={{ fontFamily: typography.body.fontFamily, fontWeight: "700", color: "#FFFFFF" }}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !error ? (
              <Text
                style={{
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginTop: 40,
                }}
              >
                No students found.
              </Text>
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
  header: {
    // dynamic values applied inline
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  statCard: {
    flexBasis: "47%",
    borderWidth: 1,
  },
  searchInput: {
    borderWidth: 1,
  },
  filterChip: {
    borderWidth: 1,
  },
  stateBox: {
    alignItems: "center",
    borderWidth: 1,
  },
  retryButton: {
    alignItems: "center",
  },
  studentCard: {
    flexDirection: "row",
    borderWidth: 1,
    alignItems: "center",
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
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
});