import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { useTheme } from "../../context/ThemeContext";
import { createSession } from "../../utils/api";

export default function CreateSessionScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a session title");
      return;
    }

    setLoading(true);
    try {
      const response = await createSession(title.trim(), description.trim());
      Alert.alert(
        "Session Created!",
        `Session code: ${response.session.code}\nShare this code with your students.`,
        [
          {
            text: "View Session",
            onPress: () => router.push(`/session/${response.session.id}`),
          },
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to create session",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
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
            onPress={() => router.back()}
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
            Create New Session
          </Text>
          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.body.fontSize,
              color: colors.textSecondary,
              marginBottom: spacing.xxl,
            }}
          >
            Create a session for your students to join
          </Text>

          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize,
              fontWeight: "600",
              color: colors.text,
              marginBottom: spacing.sm,
            }}
          >
            Session Title *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: radius.md,
                borderColor: colors.border,
                padding: spacing.md - 2,
                marginBottom: spacing.lg,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
              },
            ]}
            placeholder="e.g. Math Class - Chapter 5"
            placeholderTextColor={colors.placeholder}
            value={title}
            onChangeText={setTitle}
            accessibilityLabel="Session title"
          />

          <Text
            style={{
              fontFamily: typography.body.fontFamily,
              fontSize: typography.caption.fontSize,
              fontWeight: "600",
              color: colors.text,
              marginBottom: spacing.sm,
            }}
          >
            Description (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: radius.md,
                borderColor: colors.border,
                padding: spacing.md - 2,
                marginBottom: spacing.lg,
                fontFamily: typography.body.fontFamily,
                fontSize: typography.body.fontSize,
              },
            ]}
            placeholder="What will you cover in this session?"
            placeholderTextColor={colors.placeholder}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            accessibilityLabel="Session description, optional"
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
            accessibilityLabel={loading ? "Creating session" : "Create session"}
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
                Create Session
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  input: {
    borderWidth: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  createButton: {
    alignItems: "center",
  },
});