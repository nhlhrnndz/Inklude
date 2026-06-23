import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Text style={styles.logo}>🎓</Text>
        <Text style={styles.title}>IncluEd</Text>
        <Text style={styles.tagline}>Inclusive Education for Everyone</Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.studentButton}
          onPress={() => router.push("/student")}
        >
          <Text style={styles.studentButtonText}>👤 I'm a Student</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.teacherButton}
          onPress={() => router.push("/teacher")}
        >
          <Text style={styles.teacherButtonText}>🏫 I'm a Teacher</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Designed for Deaf & Hard-of-Hearing Students
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 28,
  },
  logoArea: { alignItems: "center", marginTop: 40 },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 40, fontWeight: "bold", color: "#fff", letterSpacing: 2 },
  tagline: { fontSize: 14, color: "#888", marginTop: 8, textAlign: "center" },
  buttonGroup: { width: "100%", gap: 14 },
  studentButton: {
    backgroundColor: "#4f9eff",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  studentButtonText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  teacherButton: {
    backgroundColor: "#1e1e1e",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  teacherButtonText: { color: "#fff", fontSize: 17, fontWeight: "bold" },
  footer: { color: "#444", fontSize: 12, textAlign: "center" },
});
