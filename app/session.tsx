import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export default function CreateSession() {
  const [code, setCode] = useState("");
  const [started, setStarted] = useState(false);
  const router = useRouter();

  const handleGenerate = () => {
    setCode(generateCode());
    setStarted(false);
  };

  const handleStart = () => {
    setStarted(true);
    setTimeout(() => router.push("/explore"), 1000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Session</Text>
      <Text style={styles.subtitle}>
        Generate a code and share it with your students
      </Text>

      {code ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Session Code</Text>
          <Text style={styles.codeText}>{code}</Text>
          <Text style={styles.codeHint}>
            Share this code with your students
          </Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
        <Text style={styles.generateButtonText}>🎲 Generate Code</Text>
      </TouchableOpacity>

      {code && !started && (
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>▶ Start Session</Text>
        </TouchableOpacity>
      )}

      {started && <Text style={styles.startingText}>Starting session...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 32,
    textAlign: "center",
  },
  codeBox: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    marginBottom: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#4f9eff",
  },
  codeLabel: { color: "#4f9eff", fontSize: 13, marginBottom: 8 },
  codeText: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "bold",
    letterSpacing: 10,
  },
  codeHint: { color: "#888", fontSize: 12, marginTop: 10 },
  generateButton: {
    backgroundColor: "#333",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  generateButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  startButton: {
    backgroundColor: "#4f9eff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  startButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  startingText: { color: "#4caf50", marginTop: 20, fontSize: 15 },
});
