import ScreenContainer from "@/components/common/ScreenContainer";
import Colors from "@/theme/colors";
import Radius from "@/theme/radius";
import Spacing from "@/theme/spacing";
import Typography from "@/theme/typography";
import * as Speech from "expo-speech";
import React, { useEffect, useState } from "react";
import {
  Platform,
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
  "Thank You",
  "May I Ask A Question?",
  "Repeat Please",
];

export default function TTSScreen() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(
    undefined,
  );
  const [rate, setRate] = useState(1.0); // speed: 0.1 - 2.0
  const [pitch, setPitch] = useState(1.0); // pitch: 0.5 - 2.0
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    Speech.getAvailableVoicesAsync().then((available) => {
      setVoices(available);
      const defaultEnglish = available.find((v) =>
        v.language?.startsWith("en"),
      );
      if (defaultEnglish) setSelectedVoice(defaultEnglish.identifier);
    });
  }, []);

  const speak = (value: string) => {
    if (!value.trim()) return;
    Speech.stop();
    setSpeaking(true);
    Speech.speak(value, {
      voice: selectedVoice,
      rate,
      pitch,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const stopSpeaking = () => {
    Speech.stop();
    setSpeaking(false);
  };

  const adjustRate = (delta: number) => {
    setRate((prev) => Math.min(2.0, Math.max(0.1, +(prev + delta).toFixed(1))));
  };

  const adjustPitch = (delta: number) => {
    setPitch((prev) =>
      Math.min(2.0, Math.max(0.5, +(prev + delta).toFixed(1))),
    );
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Text to Speech</Text>

        <TextInput
          style={styles.input}
          placeholder="Type a message to speak..."
          placeholderTextColor={Colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
        />

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.speakButton, speaking && styles.speakButtonDisabled]}
            onPress={() => speak(text)}
            disabled={speaking}
          >
            <Text style={styles.speakButtonText}>
              {speaking ? "Speaking..." : "🔊 Speak"}
            </Text>
          </TouchableOpacity>

          {speaking && (
            <TouchableOpacity style={styles.stopButton} onPress={stopSpeaking}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionLabel}>Quick Phrases</Text>
        <View style={styles.phraseGrid}>
          {QUICK_PHRASES.map((phrase) => (
            <TouchableOpacity
              key={phrase}
              style={styles.phraseButton}
              onPress={() => speak(phrase)}
              disabled={speaking}
            >
              <Text style={styles.phraseButtonText}>{phrase}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Speed: {rate.toFixed(1)}x</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjustRate(-0.1)}
          >
            <Text style={styles.controlButtonText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjustRate(0.1)}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Pitch: {pitch.toFixed(1)}</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjustPitch(-0.1)}
          >
            <Text style={styles.controlButtonText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => adjustPitch(0.1)}
          >
            <Text style={styles.controlButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {voices.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Voice</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {voices
                .filter((v) => v.language?.startsWith("en"))
                .map((v) => (
                  <TouchableOpacity
                    key={v.identifier}
                    style={[
                      styles.voiceChip,
                      selectedVoice === v.identifier &&
                        styles.voiceChipSelected,
                    ]}
                    onPress={() => setSelectedVoice(v.identifier)}
                  >
                    <Text
                      style={[
                        styles.voiceChipText,
                        selectedVoice === v.identifier &&
                          styles.voiceChipTextSelected,
                      ]}
                    >
                      {v.name || v.identifier}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </>
        )}

        {Platform.OS === "android" && voices.length === 0 && (
          <Text style={styles.hint}>
            No extra voices found on this device — default system voice will be
            used.
          </Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  heading: {
    fontSize: Typography.h2,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: Typography.body,
    color: Colors.text,
    textAlignVertical: "top",
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  speakButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  speakButtonDisabled: {
    opacity: 0.6,
  },
  speakButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: Typography.body,
  },
  stopButton: {
    backgroundColor: Colors.error,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  stopButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: Typography.title,
    fontWeight: "600",
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  phraseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  phraseButton: {
    backgroundColor: Colors.secondaryBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  phraseButtonText: {
    color: Colors.text,
    fontSize: Typography.body,
  },
  controlRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.secondaryBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonText: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
  },
  voiceChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.round,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.sm,
  },
  voiceChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  voiceChipText: {
    color: Colors.text,
    fontSize: Typography.caption,
  },
  voiceChipTextSelected: {
    color: "#fff",
  },
  hint: {
    marginTop: Spacing.sm,
    fontSize: Typography.caption,
    color: Colors.textSecondary,
    fontStyle: "italic",
  },
});
