// components/TeacherSignalToast.tsx
//
// Teacher-side, deliberately quiet: no sound, no vibration, no animation,
// no blocking popup. One small card shows the latest request; extra ones
// collapse into a "+N" count you can tap to expand. "Seen" clears them, and
// they also fade out by themselves (see useTeacherSignals).
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "../context/ThemeContext";
import type { StudentSignal } from "../hooks/useClassroomSignals";

interface Props {
  signals: StudentSignal[];
  onSeen: () => void;
}

export default function TeacherSignalToast({ signals, onSeen }: Props) {
  const { colors, typography, spacing, radius } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (signals.length === 0) return null;

  const latest = signals[signals.length - 1];
  const extra = signals.length - 1;
  const visible = expanded ? [...signals].reverse() : [latest];

  const handleSeen = () => {
    setExpanded(false);
    onSeen();
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { left: spacing.lg, right: spacing.lg }]}
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderLeftColor: colors.primary,
            borderRadius: radius.md,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          {visible.map((s) => (
            <Text
              key={s.id}
              numberOfLines={2}
              style={{
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
                color: colors.text,
                marginBottom: expanded ? 4 : 0,
              }}
            >
              <Text style={{ fontWeight: "700" }}>{s.name}: </Text>
              {s.text}
            </Text>
          ))}
        </View>

        {extra > 0 && (
          <TouchableOpacity
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={
              expanded
                ? "Show only the latest request"
                : `${extra} more request${extra > 1 ? "s" : ""}. Tap to show all`
            }
            style={[
              styles.countChip,
              {
                backgroundColor: colors.secondaryBackground,
                borderRadius: radius.round,
              },
            ]}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: typography.caption.fontFamily,
                fontSize: typography.caption.fontSize,
                fontWeight: "700",
              }}
            >
              {expanded ? "Less" : `+${extra}`}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleSeen}
          accessibilityRole="button"
          accessibilityLabel="Mark student requests as seen"
          style={styles.seenButton}
        >
          <Text
            style={{
              color: colors.primary,
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize + 1,
              fontWeight: "700",
            }}
          >
            Seen
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 16,
    zIndex: 10,
    elevation: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  countChip: {
    minHeight: 32,
    minWidth: 40,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  seenButton: {
    minHeight: 40,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
