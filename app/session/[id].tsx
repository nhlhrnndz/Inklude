import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { endSession, getSessionDetails } from "../../utils/api";

interface Participant {
  id: number;
  name: string;
  email: string;
  joined_at: string;
}

interface Session {
  id: number;
  code: string;
  title: string;
  description: string;
  status: "active" | "ended";
  createdAt: string;
  endedAt: string | null;
  participants: Participant[];
}

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const data = await getSessionDetails(Number(id));
      setSession(data.session);
    } catch (error) {
      console.error("Error loading session:", error);
      Alert.alert("Error", "Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = () => {
    Alert.alert("End Session?", "Are you sure you want to end this session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: confirmEndSession,
      },
    ]);
  };

  const confirmEndSession = async () => {
    setEnding(true);
    try {
      await endSession(Number(id));
      Alert.alert("Success", "Session ended successfully");
      router.back();
    } catch (error) {
      console.error("Error ending session:", error);
      Alert.alert("Error", "Failed to end session");
    } finally {
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A6FA5" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Session not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isTeacher = user?.role === "teacher";
  const isActive = session.status === "active";

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Session Code</Text>
          <Text style={styles.code}>{session.code}</Text>
        </View>
        <View
          style={[styles.statusBadge, isActive ? styles.active : styles.ended]}
        >
          <Text style={styles.statusText}>
            {isActive ? "● LIVE" : "● ENDED"}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{session.title}</Text>
      {session.description && (
        <Text style={styles.description}>{session.description}</Text>
      )}

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{session.participants.length}</Text>
          <Text style={styles.statLabel}>Participants</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {new Date(session.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.statLabel}>Created</Text>
        </View>
      </View>

      {session.participants.length > 0 && (
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>Participants</Text>
          {session.participants.map((p) => (
            <View key={p.id} style={styles.participantItem}>
              <Text style={styles.participantName}>{p.name}</Text>
              <Text style={styles.participantTime}>
                Joined: {new Date(p.joined_at).toLocaleTimeString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {isTeacher && isActive && (
        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.endButtonText}>End Session</Text>
          )}
        </TouchableOpacity>
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
    marginBottom: 20,
  },
  backText: {
    color: "#4A6FA5",
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  codeContainer: {
    flex: 1,
  },
  codeLabel: {
    color: "#888",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  code: {
    color: "#4A6FA5",
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  active: {
    backgroundColor: "#1b5e20",
  },
  ended: {
    backgroundColor: "#4a4a4a",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#888",
    marginBottom: 20,
  },
  stats: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
  },
  participantsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  participantItem: {
    backgroundColor: "#1e1e1e",
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  participantName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  participantTime: {
    color: "#888",
    fontSize: 12,
  },
  endButton: {
    backgroundColor: "#e94560",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  endButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorText: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 16,
  },
  backLink: {
    color: "#4A6FA5",
    fontSize: 16,
  },
});
