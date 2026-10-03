// components/appointments/SlotPicker.tsx
import { Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "../../context/ThemeContext";

// Guidance Office hours shown to students. Adjust to the real schedule.
const FIRST_SLOT_MIN = 8 * 60; // 8:00 AM
const LAST_SLOT_MIN = 16 * 60 + 30; // 4:30 PM
const STEP_MIN = 30;
const WEEKDAYS_AHEAD = 10;

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function slotLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

const SLOTS: { min: number; value: string; label: string }[] = [];
for (let m = FIRST_SLOT_MIN; m <= LAST_SLOT_MIN; m += STEP_MIN) {
  SLOTS.push({
    min: m,
    value: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`,
    label: slotLabel(m),
  });
}

function buildDays(extra?: string | null) {
  const out: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < WEEKDAYS_AHEAD) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) out.push(toDateString(d));
    d.setDate(d.getDate() + 1);
  }
  // Keep a date that was chosen earlier (e.g. the student's preferred day)
  if (extra && !out.includes(extra)) out.push(extra);
  return out.sort();
}

function dayLabel(s: string) {
  if (s === toDateString(new Date())) return "Today";
  return new Date(`${s}T00:00:00`).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  date: string | null;
  time: string | null;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
};

export default function SlotPicker({
  date,
  time,
  onDateChange,
  onTimeChange,
}: Props) {
  const { colors, typography, spacing, radius } = useTheme();

  const days = buildDays(date);
  const today = toDateString(new Date());
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const labelStyle = {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: spacing.xs,
  };

  const chip = (
    key: string,
    label: string,
    selected: boolean,
    onPress: () => void,
    disabled = false,
  ) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 14,
        minHeight: 44,
        justifyContent: "center",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : colors.secondaryBackground,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Text
        style={{
          fontFamily: typography.body.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "600",
          color: selected ? "#FFFFFF" : colors.text,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <Text style={labelStyle}>Date</Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: spacing.sm,
        }}
      >
        {days.map((d) =>
          chip(d, dayLabel(d), d === date, () => onDateChange(d)),
        )}
      </View>

      <Text style={labelStyle}>Time</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {SLOTS.map((s) =>
          chip(
            s.value,
            s.label,
            s.value === time,
            () => onTimeChange(s.value),
            date === today && s.min <= nowMin,
          ),
        )}
      </View>
    </View>
  );
}
