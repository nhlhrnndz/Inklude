// app/(app)/quick-talk.tsx
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { useTheme } from "../../context/ThemeContext";
import {
    AUTO_PAUSE_MS,
    useQuickTalkListener,
} from "../../hooks/useQuickTalkListener";
import { useQuickTalkSpeech } from "../../hooks/useQuickTalkSpeech";

type Speaker = "other" | "me";

interface Entry {
  id: string;
  speaker: Speaker;
  text: string;
  at: number;
}

const QUICK_PHRASES = [
  "Yes",
  "No",
  "Thank You",
  "May I Ask A Question?",
  "Repeat Please",
];

// Chunks of the same sentence arrive a few seconds apart; join them into one bubble
const MERGE_WINDOW_MS = 8000;

// Standard iOS navigation header height (excluding the status bar inset)
const IOS_HEADER_HEIGHT = 44;

function LevelMeter({
  level,
  activeColor,
  idleColor,
}: {
  level: number;
  activeColor: string;
  idleColor: string;
}) {
  return (
    <View
      style={styles.levelRow}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {[1, 2, 3, 4].map((step) => (
        <View
          key={step}
          style={[
            styles.levelBar,
            {
              height: 6 + step * 5,
              backgroundColor: level >= step ? activeColor : idleColor,
            },
          ]}
        />
      ))}
    </View>
  );
}

function VoiceStepper({
  label,
  value,
  onMinus,
  onPlus,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  const buttonStyle = {
    borderRadius: radius.md,
    backgroundColor: colors.secondaryBackground,
    borderColor: colors.border,
  };

  return (
    <View style={styles.stepperRow}>
      <Text
        style={{
          flex: 1,
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          color: colors.text,
        }}
      >
        {label}: {value}
      </Text>

      <TouchableOpacity
        style={[styles.stepperButton, buttonStyle]}
        onPress={onMinus}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label.toLowerCase()}`}
        accessibilityValue={{ text: value }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>
          −
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.stepperButton, buttonStyle, { marginLeft: spacing.sm }]}
        onPress={onPlus}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label.toLowerCase()}`}
        accessibilityValue={{ text: value }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function QuickTalkScreen() {
  const { colors, typography, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [replyText, setReplyText] = useState("");
  const [showVoice, setShowVoice] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleTranscript = useCallback((text: string) => {
    const now = Date.now();

    setEntries((prev) => {
      const last = prev[prev.length - 1];

      if (last && last.speaker === "other" && now - last.at < MERGE_WINDOW_MS) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: `${last.text} ${text}`, at: now },
        ];
      }

      return [
        ...prev,
        { id: `${now}-${prev.length}`, speaker: "other", text, at: now },
      ];
    });
  }, []);

  const {
    status,
    isListening,
    isTranscribing,
    level,
    error,
    stopReason,
    debug,
    start,
    stop,
    hold,
    resume,
  } = useQuickTalkListener(handleTranscript);

  const { isBusy, rate, pitch, adjustRate, adjustPitch, speak, stopSpeaking } =
    useQuickTalkSpeech({
      beforeSpeak: hold, // mute the mic, keeping the last words that were said
      afterSpeak: resume, // un-mute once the reply is finished
      onError: (message) =>
        Toast.show({ type: "error", text1: "Quick Talk", text2: message }),
    });

  const sendReply = useCallback(
    async (text: string, clearInput = false) => {
      const value = text.trim();
      if (!value || isBusy) return;

      const now = Date.now();
      setEntries((prev) => [
        ...prev,
        { id: `${now}-${prev.length}`, speaker: "me", text: value, at: now },
      ]);
      if (clearInput) setReplyText("");

      await speak(value);
    },
    [isBusy, speak],
  );

  const replay = useCallback(
    (text: string) => {
      void speak(text);
    },
    [speak],
  );

  // Drawer screens stay mounted when you navigate away — silence everything on blur.
  useFocusEffect(
    useCallback(() => {
      return () => {
        stopSpeaking();
        void stop();
      };
    }, [stop, stopSpeaking]),
  );

  useEffect(() => {
    if (error) {
      Toast.show({ type: "error", text1: "Quick Talk", text2: error });
    }
  }, [error]);

  const captionSize = Math.max(typography.h2.fontSize, 28);

  // The newest thing the OTHER person said gets the big highlighted bubble
  let lastOtherIndex = -1;
  entries.forEach((entry, index) => {
    if (entry.speaker === "other") lastOtherIndex = index;
  });

  const statusText = isBusy
    ? "Speaking your reply…"
    : status === "listening"
      ? "Listening…"
      : status === "holding"
        ? "Microphone paused"
        : "Not listening";

  const stopNotice =
    !isListening && stopReason === "silence"
      ? `Paused because no speech was heard for ${Math.round(
          AUTO_PAUSE_MS / 1000,
        )} seconds. Tap Start Listening to continue.`
      : !isListening && stopReason === "background"
        ? "Listening stopped because the app went to the background."
        : null;

  // Starting the mic while the phone is talking would caption its own voice
  const micDisabled = !isListening && isBusy;
  const canSpeakTyped = replyText.trim().length > 0 && !isBusy;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? insets.top + IOS_HEADER_HEIGHT : 0
        }
      >
        <View style={[styles.container, { padding: spacing.md }]}>
          {/* Header */}
          <View style={[styles.headerRow, { marginBottom: spacing.sm }]}>
            <View style={styles.headerText}>
              <Text
                style={{
                  fontFamily: typography.h2.fontFamily,
                  fontSize: typography.h2.fontSize,
                  lineHeight: typography.h2.lineHeight,
                  fontWeight: typography.h2.fontWeight,
                  color: colors.text,
                }}
                accessibilityRole="header"
              >
                Quick Talk
              </Text>
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Follow a nearby conversation and reply out loud.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowVoice((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel="Voice settings"
              accessibilityState={{ expanded: showVoice }}
              hitSlop={8}
            >
              <Ionicons
                name="options-outline"
                size={24}
                color={showVoice ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>

            {entries.length > 0 && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setEntries([])}
                accessibilityRole="button"
                accessibilityLabel="Clear conversation"
                hitSlop={8}
              >
                <Ionicons
                  name="trash-outline"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Voice settings */}
          {showVoice && (
            <View
              style={[
                styles.voicePanel,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  gap: spacing.sm,
                },
              ]}
            >
              <VoiceStepper
                label="Speed"
                value={`${rate.toFixed(1)}x`}
                onMinus={() => adjustRate(-0.1)}
                onPlus={() => adjustRate(0.1)}
              />
              <VoiceStepper
                label="Pitch"
                value={pitch.toFixed(1)}
                onMinus={() => adjustPitch(-0.1)}
                onPlus={() => adjustPitch(0.1)}
              />
              <Text
                style={{
                  fontFamily: typography.caption.fontFamily,
                  fontSize: typography.caption.fontSize,
                  color: colors.textSecondary,
                }}
              >
                Volume follows your phone's media volume. Turn it up so the
                other person can hear you.
              </Text>
            </View>
          )}

          {/* Status row */}
          <View
            style={[
              styles.statusRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                marginBottom: spacing.sm,
              },
            ]}
            accessible
            accessibilityLabel={`${statusText}${
              isTranscribing ? " Transcribing." : ""
            }`}
            accessibilityLiveRegion="polite"
          >
            <LevelMeter
              level={status === "listening" ? level : 0}
              activeColor={colors.success}
              idleColor={colors.divider}
            />

            <Text
              style={{
                flex: 1,
                marginLeft: spacing.sm,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
              }}
            >
              {statusText}
            </Text>

            {isTranscribing && (
              <View style={styles.transcribingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={{
                    marginLeft: spacing.xs,
                    fontFamily: typography.caption.fontFamily,
                    fontSize: typography.caption.fontSize,
                    color: colors.textSecondary,
                  }}
                >
                  Transcribing
                </Text>
              </View>
            )}
          </View>

          {/* Conversation: their live captions + your replies */}
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={{
              paddingVertical: spacing.sm,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd({ animated: true })
            }
            accessibilityLiveRegion="polite"
          >
            {entries.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text
                  style={{
                    marginTop: spacing.sm,
                    textAlign: "center",
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.body.fontSize,
                    lineHeight: typography.body.lineHeight,
                    color: colors.textSecondary,
                  }}
                >
                  {isListening
                    ? "Listening… what the other person says will appear here."
                    : "Tap Start Listening and let the other person talk. Their words appear here as large captions. Type below or tap a phrase to reply out loud."}
                </Text>
              </View>
            ) : (
              entries.map((entry, index) => {
                if (entry.speaker === "me") {
                  const size = captionSize - 6;

                  return (
                    <TouchableOpacity
                      key={entry.id}
                      style={[
                        styles.bubble,
                        styles.myBubble,
                        {
                          backgroundColor: colors.primary,
                          borderColor: colors.primary,
                          borderRadius: radius.lg,
                          padding: spacing.md,
                          marginBottom: spacing.sm,
                        },
                      ]}
                      onPress={() => replay(entry.text)}
                      disabled={isBusy}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={`You said: ${entry.text}`}
                      accessibilityHint="Speaks this message again"
                      accessibilityState={{ disabled: isBusy }}
                    >
                      <Text
                        style={{
                          fontFamily: typography.body.fontFamily,
                          fontSize: size,
                          lineHeight: Math.round(size * 1.35),
                          color: "#FFFFFF",
                        }}
                      >
                        {entry.text}
                      </Text>
                    </TouchableOpacity>
                  );
                }

                const isLatest = index === lastOtherIndex;
                const size = isLatest ? captionSize : captionSize - 6;

                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isLatest ? colors.primary : colors.border,
                        borderRadius: radius.lg,
                        padding: spacing.md,
                        marginBottom: spacing.sm,
                      },
                    ]}
                    accessible
                    accessibilityLabel={`They said: ${entry.text}`}
                  >
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: size,
                        lineHeight: Math.round(size * 1.35),
                        color: isLatest ? colors.text : colors.textSecondary,
                      }}
                    >
                      {entry.text}
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Notices */}
          {stopNotice && (
            <Text
              style={{
                marginBottom: spacing.sm,
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                textAlign: "center",
              }}
              accessibilityLiveRegion="polite"
            >
              {stopNotice}
            </Text>
          )}

          {error && (
            <Text
              style={{
                marginBottom: spacing.sm,
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.danger,
                textAlign: "center",
              }}
              accessibilityRole="alert"
            >
              {error}
            </Text>
          )}

          {/* Quick phrases */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.phraseScroll}
            contentContainerStyle={{
              gap: spacing.sm,
              paddingVertical: spacing.xs,
            }}
          >
            {QUICK_PHRASES.map((phrase) => (
              <TouchableOpacity
                key={phrase}
                style={[
                  styles.phraseChip,
                  {
                    backgroundColor: colors.secondaryBackground,
                    borderColor: colors.border,
                    borderRadius: radius.round,
                    paddingHorizontal: spacing.md,
                    opacity: isBusy ? 0.5 : 1,
                  },
                ]}
                onPress={() => sendReply(phrase)}
                disabled={isBusy}
                accessibilityRole="button"
                accessibilityLabel={`Speak phrase: ${phrase}`}
                accessibilityState={{ disabled: isBusy }}
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
          </ScrollView>

          {/* Reply input */}
          <View
            style={[
              styles.inputRow,
              { gap: spacing.sm, marginTop: spacing.xs },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.sm,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  color: colors.text,
                  backgroundColor: colors.surface,
                },
              ]}
              placeholder="Type your reply…"
              placeholderTextColor={colors.textSecondary}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              accessibilityLabel="Your reply"
            />

            {isBusy ? (
              <TouchableOpacity
                style={[
                  styles.replyButton,
                  { backgroundColor: colors.danger, borderRadius: radius.md },
                ]}
                onPress={stopSpeaking}
                accessibilityRole="button"
                accessibilityLabel="Stop speaking"
              >
                <Ionicons name="stop" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.replyButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: radius.md,
                    opacity: canSpeakTyped ? 1 : 0.5,
                  },
                ]}
                onPress={() => sendReply(replyText, true)}
                disabled={!canSpeakTyped}
                accessibilityRole="button"
                accessibilityLabel="Speak reply"
                accessibilityState={{ disabled: !canSpeakTyped }}
              >
                <Ionicons name="volume-high" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>

          {__DEV__ && (
            <Text
              style={{
                marginTop: spacing.sm,
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Mic check · meter: {debug.meteringActive ? "on" : "unavailable"} ·
              last chunk:{" "}
              {debug.lastChunk
                ? `${debug.lastChunk.peakDb ?? "?"} dB, ${debug.lastChunk.action}`
                : "–"}
            </Text>
          )}

          {/* Start / Stop listening */}
          <TouchableOpacity
            style={[
              styles.mainButton,
              {
                backgroundColor: isListening ? colors.danger : colors.primary,
                borderRadius: radius.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                marginTop: spacing.sm,
                opacity: micDisabled ? 0.5 : 1,
              },
            ]}
            onPress={isListening ? stop : start}
            disabled={micDisabled}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              isListening ? "Stop listening" : "Start listening"
            }
            accessibilityHint={
              isListening
                ? "Turns the microphone off"
                : "Turns the microphone on to show live captions"
            }
            accessibilityState={{ disabled: micDisabled }}
          >
            <Ionicons
              name={isListening ? "stop-circle-outline" : "mic-outline"}
              size={26}
              color="#FFFFFF"
              style={{ marginRight: spacing.sm }}
            />
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: typography.title.fontFamily,
                fontSize: typography.title.fontSize,
                fontWeight: "700",
              }}
            >
              {isListening ? "Stop Listening" : "Start Listening"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  voicePanel: {
    borderWidth: 1,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    minHeight: 48,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 26,
  },
  levelBar: {
    width: 6,
    borderRadius: 3,
  },
  transcribingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  bubble: {
    borderWidth: 2,
  },
  myBubble: {
    alignSelf: "flex-end",
    maxWidth: "90%",
  },
  phraseScroll: {
    flexGrow: 0,
  },
  phraseChip: {
    minHeight: 48,
    borderWidth: 1,
    justifyContent: "center",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    borderWidth: 1,
    textAlignVertical: "top",
  },
  replyButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
});
