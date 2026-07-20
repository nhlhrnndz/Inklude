import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getMySessions } from "../utils/api";

interface Session {
  id: number;
  code: string;
  title: string;
  description: string;
  status: "active" | "ended";
  createdAt: string;
  endedAt: string | null;
  participantCount: number;
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await getMySessions();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error("Error loading sessions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/role-select");
  };

  const activeSessions = sessions.filter((s) => s.status === "active");
  const endedSessions = sessions.filter((s) => s.status === "ended");

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Text style={styles.title}>IncluEd</Text>
      <Text style={styles.subtitle}>Welcome, {user?.name || "Teacher"} 👨‍🏫</Text>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push("/create-session")}
        >
          <Text style={styles.actionIcon}>📚</Text>
          <Text style={styles.actionTitle}>Create Session</Text>
          <Text style={styles.actionText}>Start a new class session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.viewSessionsCard]}
          onPress={() => router.push("/my-sessions")}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionTitle}>View Sessions</Text>
          <Text style={styles.actionText}>Manage your sessions</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#e94560" style={styles.loader} />
      ) : (
        <>
          {activeSessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Sessions</Text>
              {activeSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => router.push(`/session/${session.id}`)}
                >
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionCode}>#{session.code}</Text>
                    <View style={styles.activeBadge}>
                      <Text style={styles.badgeText}>LIVE</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionMeta}>
                    👥 {session.participantCount} participants
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {endedSessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Past Sessions</Text>
              {endedSessions.slice(0, 3).map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[styles.sessionCard, styles.endedSession]}
                  onPress={() => router.push(`/session/${session.id}`)}
                >
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionCode}>#{session.code}</Text>
                    <View style={styles.endedBadge}>
                      <Text style={styles.badgeText}>ENDED</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  <Text style={styles.sessionMeta}>
                    👥 {session.participantCount} participants
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    padding: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
    color: "#fff",
    marginBottom: 4,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: "#888",
  },
  actionGrid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  viewSessionsCard: {
    borderColor: "#4A6FA5",
  },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  actionText: { marginTop: 4, color: "#888", fontSize: 13 },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  sessionCard: {
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    marginBottom: 10,
  },
  endedSession: {
    opacity: 0.6,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  sessionCode: {
    color: "#4A6FA5",
    fontSize: 14,
    fontWeight: "bold",
  },
  sessionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sessionMeta: {
    color: "#888",
    fontSize: 13,
  },
  activeBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  endedBadge: {
    backgroundColor: "#666",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  loader: {
    marginTop: 40,
  },
  logoutBtn: {
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e94560",
    alignItems: "center",
    marginBottom: 40,
  },
  logoutText: { color: "#e94560", fontWeight: "bold", fontSize: 15 },
});
