// components/AskTeacherPanel.tsx
//
// Student-side, collapsed by default: a small "Ask teacher" button that
// opens a few preset chips and one short typed box.
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useTheme } from "../context/ThemeContext";
import {
    SIGNAL_COOLDOWN_SEC,
    SignalResult,
} from "../hooks/useClassroomSignals";

const PRESETS = ["Please repeat", "Please slow down", "I have a question"];

const ERROR_TEXT: Record<string, string> = {
  cooldown: "Please wait a moment before sending again.",
  "no-teacher": "Your teacher isn't connected yet.",
  offline: "You're offline. Try again in a moment.",
};

interface Props {
  onSend: (text: string) => Promise<SignalResult>;
  disabled?: boolean;
}

export default function AskTeacherPanel({ onSend, disabled = false }: Props) {
  const { colors, typography, spacing, radius } = useTheme();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const blocked = disabled || sending || cooldown > 0;

  const submit = async (message: string) => {
    const value = message.trim();
    if (!value || blocked) return;

    setSending(true);
    setError(null);
    setSent(false);

    const result = await onSend(value);

    setSending(false);
    if (result.ok) {
      setSent(true);
      setText("");
      setCooldown(SIGNAL_COOLDOWN_SEC);
    } else {
      setError(
        ERROR_TEXT[result.reason ?? ""] ?? "Couldn't send. Please try again.",
      );
    }
  };

  const statusLine = error
    ? error
    : sent
      ? cooldown > 0
        ? `Sent ✓ Your teacher will answer out loud. You can send again in ${cooldown}s.`
        : "Sent ✓ Your teacher will answer out loud."
      : null;

  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
      }}
    >
      {open && (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.sm,
              marginBottom: spacing.sm,
            },
          ]}
        >
          <View style={[styles.chipRow, { gap: spacing.sm }]}>
            {PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                onPress={() => submit(preset)}
                disabled={blocked}
                accessibilityRole="button"
                accessibilityLabel={`Tell the teacher: ${preset}`}
                accessibilityState={{ disabled: blocked }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.secondaryBackground,
                    borderColor: colors.border,
                    borderRadius: radius.round,
                    paddingHorizontal: spacing.md,
                    opacity: blocked ? 0.5 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: typography.body.fontFamily,
                    fontSize: typography.caption.fontSize + 1,
                  }}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View
            style={[
              styles.inputRow,
              { gap: spacing.sm, marginTop: spacing.sm },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  backgroundColor: colors.background,
                  color: colors.text,
                  fontFamily: typography.body.fontFamily,
                  fontSize: typography.body.fontSize,
                  paddingHorizontal: spacing.sm,
                },
              ]}
              value={text}
              onChangeText={setText}
              placeholder="Short note to the teacher…"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
              returnKeyType="send"
              onSubmitEditing={() => submit(text)}
              blurOnSubmit
              accessibilityLabel="Short note to the teacher"
            />

            <TouchableOpacity
              onPress={() => submit(text)}
              disabled={blocked || text.trim().length === 0}
              accessibilityRole="button"
              accessibilityLabel="Send note to the teacher"
              accessibilityState={{
                disabled: blocked || text.trim().length === 0,
              }}
              style={[
                styles.sendButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                  opacity: blocked || text.trim().length === 0 ? 0.5 : 1,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {statusLine && (
            <Text
              style={{
                marginTop: spacing.sm,
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: error ? colors.danger : colors.textSecondary,
              }}
              accessibilityLiveRegion="polite"
            >
              {statusLine}
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={() => setOpen((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel="Ask teacher"
        accessibilityHint="Opens quick requests to send to your teacher"
        accessibilityState={{ expanded: open }}
        style={[
          styles.toggle,
          {
            borderColor: colors.primary,
            borderRadius: radius.round,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Ionicons
          name={open ? "chevron-down" : "chatbubble-ellipses-outline"}
          size={18}
          color={colors.primary}
        />
        <Text
          style={{
            marginLeft: 6,
            color: colors.primary,
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            fontWeight: "700",
          }}
        >
          {open ? "Close" : "Ask teacher"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1 },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { minHeight: 40, borderWidth: 1, justifyContent: "center" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: { flex: 1, height: 42, borderWidth: 1 },
  sendButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  toggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderWidth: 1.5,
  },
});
