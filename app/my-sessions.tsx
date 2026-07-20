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

export default function MySessionsScreen() {
  const router = useRouter();
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

  const activeSessions = sessions.filter((s) => s.status === "active");
  const endedSessions = sessions.filter((s) => s.status === "ended");

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A6FA5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>My Sessions</Text>
      <Text style={styles.subtitle}>
        View and manage all your class sessions
      </Text>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No Sessions Yet</Text>
          <Text style={styles.emptyText}>
            Create your first session to get started
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/create-session")}
          >
            <Text style={styles.createButtonText}>Create Session</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {activeSessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Active Sessions ({activeSessions.length})
              </Text>
              {activeSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={styles.sessionCard}
                  onPress={() => router.push(`/session/${session.id}`)}
                >
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionCodeContainer}>
                      <Text style={styles.codeLabel}>Code</Text>
                      <Text style={styles.sessionCode}>{session.code}</Text>
                    </View>
                    <View style={styles.activeBadge}>
                      <Text style={styles.badgeText}>● LIVE</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  {session.description && (
                    <Text style={styles.sessionDescription} numberOfLines={1}>
                      {session.description}
                    </Text>
                  )}
                  <View style={styles.sessionFooter}>
                    <Text style={styles.participantCount}>
                      👥 {session.participantCount} participants
                    </Text>
                    <Text style={styles.sessionDate}>
                      {new Date(session.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {endedSessions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Past Sessions ({endedSessions.length})
              </Text>
              {endedSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[styles.sessionCard, styles.endedSession]}
                  onPress={() => router.push(`/session/${session.id}`)}
                >
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionCodeContainer}>
                      <Text style={styles.codeLabel}>Code</Text>
                      <Text style={styles.sessionCode}>{session.code}</Text>
                    </View>
                    <View style={styles.endedBadge}>
                      <Text style={styles.badgeText}>ENDED</Text>
                    </View>
                  </View>
                  <Text style={styles.sessionTitle}>{session.title}</Text>
                  {session.description && (
                    <Text style={styles.sessionDescription} numberOfLines={1}>
                      {session.description}
                    </Text>
                  )}
                  <View style={styles.sessionFooter}>
                    <Text style={styles.participantCount}>
                      👥 {session.participantCount} participants
                    </Text>
                    <Text style={styles.sessionDate}>
                      {session.endedAt
                        ? `Ended ${new Date(session.endedAt).toLocaleDateString()}`
                        : new Date(session.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    padding: 24,
    paddingTop: 60,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f0f0f",
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    color: "#4A6FA5",
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 24,
  },
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
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sessionCodeContainer: {
    flex: 1,
  },
  codeLabel: {
    color: "#888",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sessionCode: {
    color: "#4A6FA5",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  sessionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sessionDescription: {
    color: "#888",
    fontSize: 13,
    marginBottom: 8,
  },
  sessionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  participantCount: {
    color: "#888",
    fontSize: 13,
  },
  sessionDate: {
    color: "#666",
    fontSize: 12,
  },
  activeBadge: {
    backgroundColor: "#1b5e20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  endedBadge: {
    backgroundColor: "#4a4a4a",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: "#4A6FA5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
