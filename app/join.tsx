import { useRouter } from "expo-router";
import { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function JoinSession() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    if (code.trim().length < 4) {
      Alert.alert("Invalid Code", "Please enter a valid session code.");
      return;
    }
    Alert.alert("Joined!", `You joined session: ${code.toUpperCase()}`, [
      { text: "Go to Live Caption", onPress: () => router.push("/explore") },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Session</Text>
      <Text style={styles.subtitle}>
        Enter the session code from your teacher
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. ABCD12"
        placeholderTextColor="#888"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        maxLength={6}
      />

      <TouchableOpacity style={styles.button} onPress={handleJoin}>
        <Text style={styles.buttonText}>Join</Text>
      </TouchableOpacity>
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
  input: {
    width: "100%",
    backgroundColor: "#1e1e1e",
    color: "#fff",
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 6,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  button: {
    backgroundColor: "#4f9eff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
