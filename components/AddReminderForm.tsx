// components/AddReminderForm.tsx
// Personal reminder for the student's calendar, e.g. "Review Chapter 4".
import { useState } from "react";
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";

import { useTheme } from "../context/ThemeContext";
import { createScheduleItem } from "../utils/scheduleApi";
import { DateField, TimeField, todayString } from "./DateTimePicker";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export default function AddReminderForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { colors, typography, spacing, radius } = useTheme();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Toast.show({ type: "error", text1: "Add something to remember." });
      return;
    }
    if (!DATE_RE.test(date) || !TIME_RE.test(time)) {
      Toast.show({
        type: "error",
        text1: "Pick a date and a time",
      });
      return;
    }

    const startTime = `${date} ${time}:00`;
    if (new Date(startTime.replace(" ", "T")).getTime() <= Date.now()) {
      Toast.show({ type: "error", text1: "Choose a time in the future." });
      return;
    }

    setSaving(true);
    try {
      await createScheduleItem({
        type: "reminder",
        title: title.trim(),
        startTime,
      });
      Toast.show({ type: "success", text1: "Reminder added to your calendar" });
      onSaved();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Could not save",
        text2: error.response?.data?.message ?? "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
      }}
    >
      <Text
        style={{
          fontFamily: typography.title.fontFamily,
          fontSize: typography.title.fontSize,
          fontWeight: "700",
          color: colors.text,
          marginBottom: spacing.sm,
        }}
        accessibilityRole="header"
      >
        Add a reminder
      </Text>

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: typography.caption.fontSize,
          fontWeight: "600",
          color: colors.textSecondary,
          marginBottom: 4,
        }}
      >
        What do you want to remember? *
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.secondaryBackground,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.sm,
          padding: spacing.sm + 2,
          marginBottom: spacing.sm,
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
          color: colors.text,
          minHeight: 48,
        }}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Review Chapter 4"
        placeholderTextColor={colors.placeholder}
        maxLength={150}
        accessibilityLabel="What do you want to remember"
      />

      <DateField
        value={date}
        onChange={setDate}
        label="Reminder date"
        placeholder="Pick a date"
        minDate={todayString()}
      />
      <TimeField
        value={time}
        onChange={setTime}
        label="Reminder time"
        placeholder="Pick a time"
      />

      <Text
        style={{
          fontFamily: typography.caption.fontFamily,
          fontSize: 11,
          color: colors.textSecondary,
          marginBottom: spacing.sm,
        }}
      >
        You'll get a notification about 5 minutes before.
      </Text>

      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save reminder"
        style={{
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          paddingVertical: 14,
          minHeight: 52,
          alignItems: "center",
          justifyContent: "center",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: typography.button.fontFamily,
              fontSize: typography.button.fontSize,
              fontWeight: "700",
            }}
          >
            Save reminder
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel"
        style={{ alignItems: "center", paddingVertical: spacing.md }}
      >
        <Text
          style={{
            fontFamily: typography.body.fontFamily,
            fontSize: typography.body.fontSize,
            color: colors.textSecondary,
          }}
        >
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
}
