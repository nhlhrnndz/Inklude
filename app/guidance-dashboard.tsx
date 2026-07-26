import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

import { useAuth } from "../context/AuthContext";
import Colors from "../theme/colors";
import Typography from "../theme/typography";
import { getDashboardStats, getStudents } from "../utils/api";

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
  const { logout, user } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const statsRes = await getDashboardStats();
      setStats(statsRes.stats);

      const studentsRes = await getStudents({
        disability: activeFilter === "All" ? undefined : activeFilter,
        search: search.trim() || undefined,
      });
      setStudents(studentsRes.students);
    } catch (err: any) {
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

  const handleLogout = async () => {
    await logout();
    router.replace("/role-select");
  };

  const renderStatCard = (label: string, value: number | string) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={styles.studentCard}
      onPress={() => router.push(`/guidance/student/${item.id}`)}
    >
      <View style={styles.studentAvatar}>
        <Text style={styles.studentAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentEmail}>{item.email}</Text>
        <View style={styles.tagRow}>
          {item.disabilityTypes.length > 0 ? (
            item.disabilityTypes.map((type) => (
              <View key={type} style={styles.tag}>
                <Text style={styles.tagText}>{type}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noProfileText}>No profile yet</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Guidance Dashboard</Text>
          <Text style={styles.subtitle}>
            Welcome, {user?.name || "Counselor"}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.primary}
          style={{ marginTop: 60 }}
        />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStudent}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          ListHeaderComponent={
            <>
              {stats && (
                <View style={styles.statsRow}>
                  {renderStatCard("Students", stats.totalStudents)}
                  {renderStatCard("Sessions", stats.totalSessions)}
                  {renderStatCard("Active Now", stats.activeSessions)}
                  {renderStatCard(
                    "Profiles Done",
                    `${stats.profileCompletionRate}%`,
                  )}
                </View>
              )}

              <TextInput
                style={styles.searchInput}
                placeholder="Search students by name or email"
                placeholderTextColor={Colors.placeholder}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={loadData}
                returnKeyType="search"
              />

              <FlatList
                horizontal
                data={DISABILITY_FILTERS}
                keyExtractor={(item) => item}
                showsHorizontalScrollIndicator={false}
                style={styles.filterList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      activeFilter === item && styles.filterChipActive,
                    ]}
                    onPress={() => setActiveFilter(item)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        activeFilter === item && styles.filterChipTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No students found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  logoutText: {
    color: Colors.error,
    fontWeight: "600",
    fontSize: Typography.caption,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
    marginBottom: 16,
  },
  statCard: {
    flexBasis: "47%",
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: Typography.h2,
    fontWeight: "700",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchInput: {
    backgroundColor: Colors.secondaryBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: Typography.body,
    color: Colors.text,
    marginBottom: 12,
  },
  filterList: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  studentCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 10,
    alignItems: "center",
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  studentAvatarText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: Typography.body,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: Typography.body,
    fontWeight: "700",
    color: Colors.text,
  },
  studentEmail: {
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  tag: {
    backgroundColor: "#FFF5F5",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
  },
  noProfileText: {
    fontSize: 11,
    color: Colors.placeholder,
    fontStyle: "italic",
  },
  emptyText: {
    textAlign: "center",
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: Typography.body,
  },
});
