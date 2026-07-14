import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function StudentDashboard() {
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/role-select");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IncluEd</Text>
      <Text style={styles.subtitle}>Welcome, {user?.name || "Student"} 👤</Text>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/join")}
        >
          <Text style={styles.cardIcon}>🔑</Text>
          <Text style={styles.cardTitle}>Join Session</Text>
          <Text style={styles.cardText}>Enter class session code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/explore")}
        >
          <Text style={styles.cardIcon}>📝</Text>
          <Text style={styles.cardTitle}>Live Caption</Text>
          <Text style={styles.cardText}>
            View real-time classroom subtitles
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/tts")}
        >
          <Text style={styles.cardIcon}>🔊</Text>
          <Text style={styles.cardTitle}>Text to Speech</Text>
          <Text style={styles.cardText}>Speak using typed messages</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#0f0f0f",
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    textAlign: "center",
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    color: "#888",
  },
  cardContainer: { gap: 14 },
  card: {
    backgroundColor: "#1e1e1e",
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  cardIcon: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  cardText: { marginTop: 4, color: "#888", fontSize: 13 },
  logoutBtn: {
    marginTop: 24,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e94560",
    alignItems: "center",
  },
  logoutText: { color: "#e94560", fontWeight: "bold", fontSize: 15 },
});
