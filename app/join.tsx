import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { joinSessionByCode } from "../utils/api";

export default function JoinSessionScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      Alert.alert("Error", "Please enter a session code");
      return;
    }

    setLoading(true);
    try {
      const response = await joinSessionByCode(trimmedCode);
      Alert.alert("Success! 🎉", `Joined "${response.session.title}"`, [
        {
          text: "View Session",
          onPress: () => router.push(`/session/${response.session.id}`),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Failed to Join",
        error.response?.data?.message || "Invalid session code",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Join Session</Text>
      <Text style={styles.subtitle}>
        Enter your teacher's 6-character session code
      </Text>

      <TextInput
        style={styles.codeInput}
        placeholder="e.g. A1B2C3"
        placeholderTextColor="#666"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        maxLength={6}
        textAlign="center"
      />

      <TouchableOpacity
        style={styles.joinButton}
        onPress={handleJoin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.joinButtonText}>Join Session</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: "#4A6FA5",
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 32,
  },
  codeInput: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    borderRadius: 10,
    padding: 20,
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: "#4A6FA5",
    marginBottom: 24,
  },
  joinButton: {
    backgroundColor: "#4CAF50",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
