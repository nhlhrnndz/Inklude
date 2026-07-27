import ScreenContainer from "@/components/common/ScreenContainer";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
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
  const { colors, typography, spacing, radius } = useTheme();

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
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl }}>
        <Text
          style={{
            fontFamily: typography.h2.fontFamily,
            fontSize: typography.h2.fontSize,
            lineHeight: typography.h2.lineHeight,
            fontWeight: typography.h2.fontWeight,
            color: colors.text,
            marginBottom: spacing.md,
          }}
          accessibilityRole="header"
        >
          Text to Speech
        </Text>

        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.text,
              marginBottom: spacing.sm,
            },
          ]}
          placeholder="Type a message to speak..."
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          accessibilityLabel="Message to speak"
        />

        <View style={[styles.row, { gap: spacing.sm, marginBottom: spacing.lg }]}>
          <TouchableOpacity
            style={[
              styles.speakButton,
              {
                backgroundColor: colors.primary,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.md,
                opacity: speaking ? 0.6 : 1,
              },
            ]}
            onPress={() => speak(text)}
            disabled={speaking}
            accessibilityRole="button"
            accessibilityLabel={speaking ? "Speaking" : "Speak message"}
            accessibilityState={{ disabled: speaking, busy: speaking }}
          >
            {!speaking && <Ionicons name="volume-high-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />}
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: typography.body.fontFamily,
                fontWeight: "600",
                fontSize: typography.body.fontSize,
              }}
            >
              {speaking ? "Speaking..." : "Speak"}
            </Text>
          </TouchableOpacity>

          {speaking && (
            <TouchableOpacity
              style={[
                styles.stopButton,
                {
                  backgroundColor: colors.error,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.md,
                },
              ]}
              onPress={stopSpeaking}
              accessibilityRole="button"
              accessibilityLabel="Stop speaking"
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontFamily: typography.body.fontFamily,
                  fontWeight: "600",
                }}
              >
                Stop
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: typography.title.fontSize,
            fontWeight: "600",
            color: colors.text,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
          }}
          accessibilityRole="header"
        >
          Quick Phrases
        </Text>
        <View style={[styles.phraseGrid, { gap: spacing.sm }]}>
          {QUICK_PHRASES.map((phrase) => (
            <TouchableOpacity
              key={phrase}
              style={[
                styles.phraseButton,
                {
                  backgroundColor: colors.secondaryBackground,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                  opacity: speaking ? 0.6 : 1,
                },
              ]}
              onPress={() => speak(phrase)}
              disabled={speaking}
              accessibilityRole="button"
              accessibilityLabel={`Speak phrase: ${phrase}`}
              accessibilityState={{ disabled: speaking }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                }}
              >
                {phrase}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: typography.title.fontSize,
            fontWeight: "600",
            color: colors.text,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          Speed: {rate.toFixed(1)}x
        </Text>
        <View style={[styles.controlRow, { gap: spacing.md }]}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              {
                borderRadius: radius.md,
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
              },
            ]}
            onPress={() => adjustRate(-0.1)}
            accessibilityRole="button"
            accessibilityLabel="Decrease speed"
            accessibilityValue={{ text: `${rate.toFixed(1)}x` }}
          >
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.controlButton,
              {
                borderRadius: radius.md,
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
              },
            ]}
            onPress={() => adjustRate(0.1)}
            accessibilityRole="button"
            accessibilityLabel="Increase speed"
            accessibilityValue={{ text: `${rate.toFixed(1)}x` }}
          >
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>+</Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            fontFamily: typography.title.fontFamily,
            fontSize: typography.title.fontSize,
            fontWeight: "600",
            color: colors.text,
            marginTop: spacing.md,
            marginBottom: spacing.sm,
          }}
        >
          Pitch: {pitch.toFixed(1)}
        </Text>
        <View style={[styles.controlRow, { gap: spacing.md }]}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              {
                borderRadius: radius.md,
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
              },
            ]}
            onPress={() => adjustPitch(-0.1)}
            accessibilityRole="button"
            accessibilityLabel="Decrease pitch"
            accessibilityValue={{ text: pitch.toFixed(1) }}
          >
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.controlButton,
              {
                borderRadius: radius.md,
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
              },
            ]}
            onPress={() => adjustPitch(0.1)}
            accessibilityRole="button"
            accessibilityLabel="Increase pitch"
            accessibilityValue={{ text: pitch.toFixed(1) }}
          >
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>+</Text>
          </TouchableOpacity>
        </View>

        {voices.length > 0 && (
          <>
            <Text
              style={{
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                fontWeight: "600",
                color: colors.text,
                marginTop: spacing.md,
                marginBottom: spacing.sm,
              }}
              accessibilityRole="header"
            >
              Voice
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {voices
                .filter((v) => v.language?.startsWith("en"))
                .map((v) => {
                  const isSelected = selectedVoice === v.identifier;
                  return (
                    <TouchableOpacity
                      key={v.identifier}
                      style={[
                        styles.voiceChip,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : "transparent",
                          borderRadius: radius.round,
                          paddingVertical: spacing.xs,
                          paddingHorizontal: spacing.md,
                          marginRight: spacing.sm,
                        },
                      ]}
                      onPress={() => setSelectedVoice(v.identifier)}
                      accessibilityRole="button"
                      accessibilityLabel={`Voice: ${v.name || v.identifier}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text
                        style={{
                          color: isSelected ? "#FFFFFF" : colors.text,
                          fontFamily: typography.caption.fontFamily,
                          fontSize: typography.caption.fontSize,
                        }}
                      >
                        {v.name || v.identifier}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </>
        )}

        {Platform.OS === "android" && voices.length === 0 && (
          <Text
            style={{
              marginTop: spacing.sm,
              fontFamily: typography.caption.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              fontStyle: "italic",
            }}
          >
            No extra voices found on this device — default system voice will be
            used.
          </Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 100,
    borderWidth: 1,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  speakButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  stopButton: {
    // dynamic values applied inline
  },
  phraseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  phraseButton: {
    borderWidth: 1,
  },
  controlRow: {
    flexDirection: "row",
  },
  controlButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceChip: {
    borderWidth: 1,
  },
});