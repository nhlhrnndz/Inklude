// app/(app)/create-session.tsx — Schedule Class (one date and time)
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DateField,
  TimeField,
  todayString,
} from "../../components/DateTimePicker";
import { useTheme } from "../../context/ThemeContext";
import { createClass } from "../../utils/api";
import { crossAlert } from "../../utils/crossAlert";

export default function ScheduleClassScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      crossAlert("Error", "Please enter a class name");
      return;
    }
    if (!date) {
      crossAlert("Check the schedule", "Pick the class date.");
      return;
    }
    if (!startTime || !endTime) {
      crossAlert("Check the schedule", "Pick a start and end time.");
      return;
    }
    if (endTime <= startTime) {
      crossAlert("Check the schedule", "End time must be after start time.");
      return;
    }

    // The weekday is worked out from the date. The server stores one meeting.
    const [y, m, d] = date.split("-").map(Number);
    const weekday = new Date(y, m - 1, d).getDay();

    setLoading(true);
    try {
      const response = await createClass(title.trim(), description.trim(), {
        days: [weekday],
        startTime,
        endTime,
        startDate: date,
        endDate: date,
      });
      crossAlert(
        "Class Created!",
        `Class code: ${response.class.code}\nShare this code with your students so they can join.`,
        [
          {
            text: "Back to Dashboard",
            style: "cancel",
            onPress: () => router.replace("/teacher"),
          },
          {
            text: "Open Class",
            onPress: () => router.replace(`/class/${response.class.id}` as any),
          },
        ],
      );
    } catch (error: any) {
      crossAlert(
        "Error",
        error.response?.data?.message || "Failed to create class",
      );
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: spacing.sm,
  };

  const inputStyle = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: radius.md,
    borderColor: colors.border,
    padding: spacing.md - 2,
    marginBottom: spacing.lg,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={[styles.backButton, { marginBottom: spacing.lg }]}
            onPress={() => router.replace("/teacher")}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text
              style={{
                fontFamily: typography.body.fontFamily,
                color: colors.primary,
                fontSize: typography.body.fontSize,
                marginLeft: 6,
              }}
            >
              Back
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontFamily: typography.h2.fontFamily,
              fontSize: typography.h2.fontSize,
              lineHeight: typography.h2.lineHeight,
              fontWeight: typography.h2.fontWeight,
              color: colors.text,
              marginBottom: spacing.sm,
            }}
            accessibilityRole="header"
          >
            Schedule Class
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.textSecondary,
              marginBottom: spacing.xl,
            }}
          >
            One class has one date and time. For another meeting of the same
            subject, schedule another class.
          </Text>

          <Text style={labelStyle}>Class Name *</Text>
          <TextInput
            style={[styles.input, inputStyle]}
            placeholder="e.g. IT 401 - Database Management"
            placeholderTextColor={colors.placeholder}
            value={title}
            onChangeText={setTitle}
            accessibilityLabel="Class name"
          />

          <Text style={labelStyle}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea, inputStyle]}
            placeholder="What does this class cover?"
            placeholderTextColor={colors.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            accessibilityLabel="Class description, optional"
          />

          <Text style={labelStyle}>Date *</Text>
          <DateField
            value={date}
            onChange={setDate}
            label="Class date"
            placeholder="Pick a date"
            minDate={todayString()}
          />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Starts *</Text>
              <TimeField
                value={startTime}
                onChange={setStartTime}
                label="Start time"
                placeholder="Start time"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Ends *</Text>
              <TimeField
                value={endTime}
                onChange={setEndTime}
                label="End time"
                placeholder="End time"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor: loading ? colors.disabled : colors.primary,
                borderRadius: radius.md,
                padding: spacing.md,
                marginTop: spacing.xl,
              },
            ]}
            onPress={handleCreate}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={loading ? "Creating class" : "Create class"}
            accessibilityState={{ disabled: loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  fontFamily: typography.button.fontFamily,
                  fontSize: typography.button.fontSize,
                  fontWeight: typography.button.fontWeight,
                  color: "#FFFFFF",
                }}
              >
                Create Class
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  input: { borderWidth: 1 },
  textArea: { height: 100, textAlignVertical: "top" },
  createButton: { alignItems: "center" },
});
