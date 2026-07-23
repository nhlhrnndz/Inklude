import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function StartScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>

      <View style={styles.content}>

        {/* Replace this with your IncluEd logo later */}
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>IncluEd</Text>
        </View>

        <Text style={styles.title}>Welcome to IncluEd</Text>

        <Text style={styles.subtitle}>
          An Inclusive Education Support System that empowers accessible
          learning and communication for every BatStateU student.
        </Text>

      </View>

      <View style={styles.bottomContainer}>

        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.85}
          onPress={() => router.push("/role-select")}
        >
          <Text style={styles.buttonText}>
            Get Started
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Batangas State University • ARASOF–Nasugbu
        </Text>

      </View>

    </View>
  );
}

const PRIMARY = "#8B0000";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    paddingVertical: 70,
  },

  content: {
    alignItems: "center",
    marginTop: 40,
  },

  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 35,
  },

  logoText: {
    color: PRIMARY,
    fontSize: 22,
    fontWeight: "700",
  },

  title: {
    fontSize: 34,
    fontWeight: "700",
    color: PRIMARY,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 18,
    fontSize: 16,
    lineHeight: 25,
    color: "#555",
    textAlign: "center",
    paddingHorizontal: 10,
  },

  bottomContainer: {
    alignItems: "center",
  },

  button: {
    backgroundColor: PRIMARY,
    width: "100%",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",

    elevation: 4,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  footer: {
    marginTop: 24,
    fontSize: 13,
    color: "#888",
    textAlign: "center",
  },
});