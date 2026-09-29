// components/ClassPulse.tsx
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

import { useTheme } from "../context/ThemeContext";
import {
    getMyPulseStatus,
    PulseMood,
    submitClassPulse,
} from "../utils/checkinApi";

const OPTIONS: { mood: PulseMood; emoji: string; label: string }[] = [
  { mood: 3, emoji: "😀", label: "Good" },
  { mood: 2, emoji: "😐", label: "Okay" },
  { mood: 1, emoji: "😞", label: "Not great" },
];

type Props = {
  sessionId: number | string;
};

type ViewState = "loading" | "ask" | "done" | "skipped" | "hidden";

export default function ClassPulse({ sessionId }: Props) {
  const { colors, typography, spacing, radius } = useTheme();
  const [state, setState] = useState<ViewState>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getMyPulseStatus(Number(sessionId));
        if (!cancelled) setState(res.submitted ? "done" : "ask");
      } catch {
        if (!cancelled) setState("hidden");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const handlePick = async (mood: PulseMood) => {
    setSubmitting(true);
    try {
      await submitClassPulse(Number(sessionId), mood);
      setState("done");
    } catch (err: any) {
      // 409 = already answered; treat as done
      if (err.response?.status === 409) {
        setState("done");
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

  if (state === "loading") {
    return <ActivityIndicator color={colors.primary} />;
  }

  if (state === "hidden" || state === "skipped") {
    return null;
  }

  if (state === "done") {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.lg,
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.text,
            textAlign: "center",
          }}
        >
          Thanks for sharing how today felt.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
      ]}
    >
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
        How did today feel?
      </Text>

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 4,
        }}
      >
        Anonymous. Your teacher only sees the class totals.
      </Text>

      <View style={[styles.row, { marginTop: spacing.md, gap: 10 }]}>
        {OPTIONS.map((o) => (
          <TouchableOpacity
            key={o.mood}
            onPress={() => handlePick(o.mood)}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={`${o.label}`}
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
        onPress={() => setState("skipped")}
        accessibilityRole="button"
        accessibilityLabel="Skip"
        style={{ alignSelf: "center", marginTop: spacing.md, padding: 6 }}
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
