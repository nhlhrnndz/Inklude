import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const PRIMARY = "#8B0000";

export default function RoleSelectScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Continue as</Text>

        <Text style={styles.subtitle}>
          Choose your role to continue using IncluEd.
        </Text>
      </View>

      <View style={styles.cardContainer}>
        {/* Student */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/login",
              params: { role: "student" },
            })
          }
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>S</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Student</Text>

            <Text style={styles.cardDescription}>
              Access learning tools, AI communication, classroom sessions, and
              accessibility features.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        {/* Faculty */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/login",
              params: { role: "teacher" },
            })
          }
        >
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>F</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Faculty</Text>

            <Text style={styles.cardDescription}>
              Create classroom sessions, manage accessibility support, and
              communicate with students.
            </Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  header: {
    marginBottom: 40,
    alignItems: "center",
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: PRIMARY,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },

  cardContainer: {
    gap: 18,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 22,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FDECEC",
    justifyContent: "center",
    alignItems: "center",
  },

  iconText: {
    fontSize: 22,
    fontWeight: "700",
    color: PRIMARY,
  },

  cardContent: {
    flex: 1,
    marginLeft: 18,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },

  cardDescription: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },

  arrow: {
    fontSize: 30,
    color: PRIMARY,
    fontWeight: "300",
  },
});