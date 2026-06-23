import { useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const QUICK_PHRASES = [
  "Yes",
  "No",
  "Thank you",
  "Question",
  "Repeat please",
  "I understand",
];

export default function TextToSpeech() {
  const [text, setText] = useState("");
  const [spoken, setSpoken] = useState("");

  const handleSpeak = (msg?: string) => {
    const toSpeak = msg || text;
    if (!toSpeak.trim()) return;
    setSpoken(toSpeak);
    setText("");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Text to Speech</Text>
      <Text style={styles.subtitle}>Type a message or use quick phrases</Text>

      {spoken ? (
        <View style={styles.spokenBox}>
          <Text style={styles.spokenLabel}>🔊 Speaking:</Text>
          <Text style={styles.spokenText}>{spoken}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Type your message here..."
        placeholderTextColor="#888"
        value={text}
        onChangeText={setText}
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity
        style={styles.speakButton}
        onPress={() => handleSpeak()}
      >
        <Text style={styles.speakButtonText}>🔊 Speak</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>Quick Phrases</Text>
      <View style={styles.phraseGrid}>
        {QUICK_PHRASES.map((phrase) => (
          <TouchableOpacity
            key={phrase}
            style={styles.phraseButton}
            onPress={() => handleSpeak(phrase)}
          >
            <Text style={styles.phraseText}>{phrase}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f0f0f",
    padding: 24,
    paddingTop: 20,
    flexGrow: 1,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#aaa", marginBottom: 24 },
  spokenBox: {
    backgroundColor: "#1a2e1a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2e5e2e",
  },
  spokenLabel: { color: "#4caf50", fontSize: 12, marginBottom: 4 },
  spokenText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  input: {
    backgroundColor: "#1e1e1e",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#333",
    textAlignVertical: "top",
    minHeight: 100,
    marginBottom: 16,
  },
  speakButton: {
    backgroundColor: "#4f9eff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 28,
  },
  speakButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  sectionLabel: { color: "#aaa", fontSize: 13, marginBottom: 12 },
  phraseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  phraseButton: {
    backgroundColor: "#1e1e1e",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  phraseText: { color: "#fff", fontSize: 14 },
});
