//create-session.tsx — Schedule Class
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../context/ThemeContext";
import { createClass } from "../../utils/api";
import { crossAlert } from "../../utils/crossAlert";

export default function ScheduleClassScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      crossAlert("Error", "Please enter a class name");
      return;
    }

    setLoading(true);
    try {
      const response = await createClass(title.trim(), description.trim());
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
          contentContainerStyle={{ padding: spacing.lg }}
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
              marginBottom: spacing.xxl,
            }}
          >
            Create a class once, then add sessions for each meeting.
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

          <TouchableOpacity
            style={[
              styles.createButton,
              {
                backgroundColor: loading ? colors.disabled : colors.primary,
                borderRadius: radius.md,
                padding: spacing.md,
                marginTop: spacing.sm,
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
