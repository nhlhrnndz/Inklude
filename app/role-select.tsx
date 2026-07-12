import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function RoleSelectScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.logoArea}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.tagline}>Choose your role to continue</Text>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.studentButton}
          onPress={() =>
            router.push({ pathname: "/login", params: { role: "student" } })
          }
        >
          <Text style={styles.studentButtonText}>👤 I'm a Student</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.teacherButton}
          onPress={() =>
            router.push({ pathname: "/login", params: { role: "teacher" } })
          }
        >
          <Text style={styles.teacherButtonText}>🏫 I'm a Teacher</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  logoArea: { alignItems: "center", marginBottom: 60 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff" },
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
});
