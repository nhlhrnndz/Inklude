// components/appointments/SlotPicker.tsx
import { Text, View } from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { DateField, TimeField, todayString } from "../DateTimePicker";

// Guidance Office hours. Adjust to the real schedule.
const OPEN_MIN = 8 * 60; // 8:00 AM
const CLOSE_MIN = 16 * 60 + 30; // 4:30 PM

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateString(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const { colors, typography, spacing } = useTheme();

  let warning: string | null = null;
  if (date) {
    const dow = new Date(`${date}T00:00:00`).getDay();
    if (dow === 0 || dow === 6) warning = "Guidance is open Monday to Friday.";
  }
  if (!warning && time) {
    const [h, m] = time.split(":").map(Number);
    const min = h * 60 + m;
    if (min < OPEN_MIN || min > CLOSE_MIN) {
      warning = "Guidance is open 8:00 AM to 4:30 PM.";
    } else if (date === todayString()) {
      const now = new Date();
      if (min <= now.getHours() * 60 + now.getMinutes()) {
        warning = "Choose a time that hasn't passed yet.";
      }
    }
  }

  return (
    <View>
      <DateField
        value={date ?? ""}
        onChange={onDateChange}
        label="Preferred date"
        placeholder="Pick a date"
        minDate={todayString()}
      />
      <TimeField
        value={time ?? ""}
        onChange={onTimeChange}
        label="Preferred time"
        placeholder="Pick a time"
      />
      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: 11,
          color: warning ? colors.danger : colors.textSecondary,
          marginTop: spacing.xs,
        }}
        accessibilityLiveRegion="polite"
      >
        {warning ?? "Office hours: Monday to Friday, 8:00 AM – 4:30 PM."}
      </Text>
    </View>
  );
}
