// components/ClassExperienceInsights.tsx — teacher view of Class Experience.
// Aggregates only. A breakdown stays hidden until enough students answer.
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../context/ThemeContext";
import {
  ClassInsights,
  PulseCounts,
  PulsePhaseSummary,
  getClassInsights,
} from "../utils/checkinApi";

type Props = { classId: number };

export default function ClassExperienceInsights({ classId }: Props) {
  const { colors, typography, spacing, radius } = useTheme();

  const [data, setData] = useState<ClassInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getClassInsights(classId);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Could not load insights.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const min = data?.minResponses ?? 5;

  // Each row has an icon and a text label, so colour is never the only cue.
  const rows: {
    key: keyof PulseCounts;
    emoji: string;
    label: string;
    color: string;
  }[] = [
    { key: "great", emoji: "🤩", label: "Great", color: colors.success },
    { key: "good", emoji: "🙂", label: "Good", color: colors.success },
    { key: "okay", emoji: "😐", label: "Okay", color: colors.warning },
    { key: "tired", emoji: "😴", label: "Tired", color: colors.textSecondary },
    { key: "confused", emoji: "😕", label: "Confused", color: colors.warning },
    {
      key: "overwhelmed",
      emoji: "😣",
      label: "Overwhelmed",
      color: colors.danger,
    },
  ];

  // One-line summary: positive = Great + Good, neutral = Okay + Tired,
  // difficult = Confused + Overwhelmed
  const summaryLine = (counts: PulseCounts, total: number) => {
    if (total <= 0) return "";
    const pct = (n: number) => Math.round((n / total) * 100);
    const positive = counts.great + counts.good;
    const neutral = counts.okay + counts.tired;
    const difficult = counts.confused + counts.overwhelmed;
    return `${pct(positive)}% positive · ${pct(neutral)}% neutral · ${pct(difficult)}% difficult`;
  };

  const phaseBlock = (label: string, phase: PulsePhaseSummary) => {
    const visible = !phase.hidden && !!phase.counts;
    const counts = phase.counts;
    const total =
      visible && counts
        ? counts.great +
          counts.good +
          counts.okay +
          counts.tired +
          counts.confused +
          counts.overwhelmed
        : 0;

    return (
      <View style={{ flex: 1, minWidth: 160 }}>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: typography.caption.fontSize,
            fontWeight: "700",
            color: colors.textSecondary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>

        {!visible || !counts ? (
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize,
              color: colors.textSecondary,
              fontStyle: "italic",
            }}
          >
            Not enough responses yet
          </Text>
        ) : (
          <View>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                color: colors.text,
                marginBottom: 8,
              }}
            >
              {summaryLine(counts, total)}
            </Text>

            {rows.map((r) => {
              const n = counts[r.key];
              const pct = total > 0 ? Math.round((n / total) * 100) : 0;
              return (
                <View
                  key={r.key}
                  style={{ marginBottom: 8 }}
                  accessibilityLabel={`${r.label}: ${n} of ${total}`}
                >
                  <View style={styles.rowTop}>
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.caption.fontSize,
                        color: colors.text,
                      }}
                    >
                      {r.emoji} {r.label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: typography.body.fontFamily,
                        fontSize: typography.caption.fontSize,
                        fontWeight: "700",
                        color: colors.text,
                      }}
                    >
                      {n}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.secondaryBackground,
                      overflow: "hidden",
                      marginTop: 3,
                    }}
                  >
                    <View
                      style={{
                        width: `${pct}%`,
                        height: 8,
                        backgroundColor: r.color,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const cardStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  };

  if (loading) {
    return (
      <ActivityIndicator
        color={colors.primary}
        accessibilityLabel="Loading insights"
      />
    );
  }

  if (error || !data) {
    return (
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          color: colors.textSecondary,
        }}
      >
        {error ?? "No insights yet."}
      </Text>
    );
  }

  return (
    <View>
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          color: colors.textSecondary,
          marginBottom: spacing.md,
        }}
      >
        Students answer before and after each class. Answers are never shown to
        you by name. A breakdown only appears once at least {min} students have
        answered, and you never see who said what.
      </Text>

      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          fontWeight: "700",
          color: colors.text,
          marginBottom: spacing.sm,
        }}
        accessibilityRole="header"
      >
        Whole class
      </Text>
      <View style={cardStyle}>
        <View style={styles.pair}>
          {phaseBlock("Before class", data.overview.before)}
          {phaseBlock("After class", data.overview.after)}
        </View>
        <Text
          style={{
            fontFamily: typography.caption.fontFamily,
            fontSize: 11,
            color: colors.textSecondary,
            marginTop: 4,
          }}
        >
          Combines only the sessions that have enough responses.
        </Text>
      </View>

      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          fontWeight: "700",
          color: colors.text,
          marginVertical: spacing.sm,
        }}
        accessibilityRole="header"
      >
        By session
      </Text>

      {data.sessions.length === 0 ? (
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
          }}
        >
          No sessions yet.
        </Text>
      ) : (
        data.sessions.map((s) => (
          <View key={s.id} style={cardStyle}>
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                fontWeight: "700",
                color: colors.text,
              }}
              numberOfLines={1}
            >
              {s.title}
            </Text>
            <Text
              style={{
                fontFamily: typography.caption.fontFamily,
                fontSize: 11,
                color: colors.textSecondary,
                marginBottom: spacing.sm,
              }}
            >
              {s.scheduledStart
                ? new Date(s.scheduledStart).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Not scheduled"}
            </Text>
            <View style={styles.pair}>
              {phaseBlock("Before", s.before)}
              {phaseBlock("After", s.after)}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  rowTop: { flexDirection: "row", justifyContent: "space-between" },
});
