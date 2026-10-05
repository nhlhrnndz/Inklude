// components/ClassPulse.tsx — Class Experience check-in (before / after class)
//
// Pass sessionId (one session) or classId (the whole class). The server
// decides whether a check-in is due; this component just asks, and shows it.
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Toast from "react-native-toast-message";

import { useTheme } from "../context/ThemeContext";
import {
  DueExperience,
  ExperiencePhase,
  PulseMood,
  getDueExperienceForClass,
  getDueExperienceForSession,
  submitExperience,
} from "../utils/checkinApi";

const POLL_MS = 30000;

const OPTIONS: { mood: PulseMood; emoji: string; label: string }[] = [
  { mood: 3, emoji: "😀", label: "Good" },
  { mood: 2, emoji: "😐", label: "Okay" },
  { mood: 1, emoji: "😟", label: "Difficult" },
];

const TITLES: Record<ExperiencePhase, string> = {
  before: "How are you feeling about class?",
  after: "How did class feel?",
};

const THANKS: Record<ExperiencePhase, string> = {
  before: "Thanks for sharing how you feel going in.",
  after: "Thanks for sharing how today felt.",
};

type Props = {
  sessionId?: number | string;
  classId?: number | string;
  containerStyle?: StyleProp<ViewStyle>;
};

type ViewState = "none" | "ask" | "done";

export default function ClassPulse({
  sessionId,
  classId,
  containerStyle,
}: Props) {
  const { colors, typography, spacing, radius } = useTheme();

  const [prompt, setPrompt] = useState<DueExperience | null>(null);
  const [view, setView] = useState<ViewState>("none");
  const [submitting, setSubmitting] = useState(false);

  // Remember what was skipped / answered so polling never re-asks it.
  const skippedRef = useRef<Set<string>>(new Set());
  const answeredRef = useRef<Set<string>>(new Set());

  const check = useCallback(async () => {
    try {
      const res =
        classId != null
          ? await getDueExperienceForClass(Number(classId))
          : await getDueExperienceForSession(Number(sessionId));

      const due = res.due;
      if (due) {
        const key = `${due.sessionId}:${due.phase}`;
        if (!skippedRef.current.has(key) && !answeredRef.current.has(key)) {
          setPrompt(due);
          setView("ask");
          return;
        }
      }

      // Nothing new to ask. Keep a thank-you on screen, otherwise hide.
      setView((v) => (v === "done" ? v : "none"));
    } catch {
      // Keep whatever is showing; the next poll will try again.
    }
  }, [classId, sessionId]);

  useFocusEffect(
    useCallback(() => {
      check();
      const timer = setInterval(check, POLL_MS);
      return () => clearInterval(timer);
    }, [check]),
  );

  const handlePick = async (mood: PulseMood) => {
    if (!prompt) return;
    const key = `${prompt.sessionId}:${prompt.phase}`;

    setSubmitting(true);
    try {
      await submitExperience({
        sessionId: prompt.sessionId,
        phase: prompt.phase,
        mood,
      });
      answeredRef.current.add(key);
      setView("done");
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        // Already answered (for example on another device).
        answeredRef.current.add(key);
        setView("done");
      } else if (status === 400) {
        // Window closed while the card was open.
        skippedRef.current.add(key);
        setView("none");
      } else {
        Toast.show({
          type: "error",
          text1: "Could not save your answer",
          text2: err.response?.data?.message ?? "Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (prompt) skippedRef.current.add(`${prompt.sessionId}:${prompt.phase}`);
    setView("none");
  };

  if (view === "none" || !prompt) return null;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    containerStyle,
  ];

  if (view === "done") {
    return (
      <View style={cardStyle} accessibilityLiveRegion="polite">
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.text,
            textAlign: "center",
          }}
        >
          {THANKS[prompt.phase]}
        </Text>
      </View>
    );
  }

  return (
    <View style={cardStyle}>
      <Text
        style={{
          fontFamily: typography.title.fontFamily,
          fontSize: typography.title.fontSize,
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
        }}
        accessibilityRole="header"
      >
        {TITLES[prompt.phase]}
      </Text>

      {prompt.sessionTitle ? (
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
            textAlign: "center",
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {prompt.sessionTitle}
        </Text>
      ) : null}

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 4,
        }}
      >
        Your teacher only sees class totals, and only when enough students
        answer. If class feels hard several times in a row, the Guidance Office
        may check in with you.
      </Text>

      <View style={[styles.row, { marginTop: spacing.md, gap: 10 }]}>
        {OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.mood}
            onPress={() => handlePick(o.mood)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            style={[
              styles.option,
              {
                backgroundColor: colors.secondaryBackground,
                borderColor: colors.border,
                borderRadius: radius.md,
                opacity: submitting ? 0.6 : 1,
              },
            ]}
          >
            <Text style={styles.emoji}>{o.emoji}</Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                fontWeight: "600",
                color: colors.text,
                marginTop: 4,
              }}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel="Skip"
        style={{
          alignSelf: "center",
          marginTop: spacing.md,
          minHeight: 44,
          justifyContent: "center",
          paddingHorizontal: 12,
        }}
      >
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            color: colors.textSecondary,
          }}
        >
          Skip
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, width: "100%" },
  row: { flexDirection: "row" },
  option: {
    flex: 1,
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    paddingVertical: 12,
  },
  emoji: { fontSize: 32 },
});
