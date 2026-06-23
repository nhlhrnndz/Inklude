import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function TeacherDashboard() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IncluEd</Text>
      <Text style={styles.subtitle}>Teacher Dashboard</Text>

      <View style={styles.cardContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/create-session")}
        >
          <Text style={styles.cardIcon}>📡</Text>
          <Text style={styles.cardTitle}>Create Session</Text>
          <Text style={styles.cardText}>
            Generate a session code for students
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/explore")}
        >
          <Text style={styles.cardIcon}>🎙️</Text>
          <Text style={styles.cardTitle}>Live Caption</Text>
          <Text style={styles.cardText}>
            Start broadcasting captions to students
          </Text>
        </TouchableOpacity>
      </View>
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
});
